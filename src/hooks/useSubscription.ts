import { useState, useEffect, useCallback, useRef } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getEdgeFunctionErrorMessage, invokeEdgeFunction } from '@/lib/invoke-edge-function';

export interface SubscriptionData {
  plan: string;
  product_id: string | null;
  subscription_end: string | null;
  billing_status: string | null;
  access_status: 'active' | 'grace' | 'blocked';
  block_reason: string | null;
  grace_until: string | null;
  should_block: boolean;
  source?: 'edge' | 'profile-fallback';
  usage: {
    presentations: number;
    campaigns: number;
    emails: number;
  };
  limits: {
    presentations: number;
    campaigns: number;
    emails: number;
  };
}

export interface PlanData {
  id: string;
  name: string;
  price_cents: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  limit_presentations: number;
  limit_campaigns: number;
  limit_emails: number;
  features: string[];
  display_order: number;
  is_active: boolean;
}

export const useSubscription = () => {
  const { user, session, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const lastSubscriptionErrorRef = useRef<string | null>(null);

  const isUnauthorizedFunctionsError = (err: unknown) =>
    err instanceof FunctionsHttpError && err.context?.status === 401;

  // Fetch plans from DB
  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (data) setPlans(data as PlanData[]);
    };
    fetchPlans();
  }, []);

  const buildProfileFallbackSubscription = useCallback(async () => {
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_price_id, stripe_product_id, subscription_status, subscription_current_period_end, billing_access_status, billing_block_reason, billing_grace_until')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) return null;

    const matchedPlan =
      plans.find((plan) => plan.stripe_price_id && plan.stripe_price_id === profile.stripe_price_id) ||
      plans.find((plan) => plan.stripe_product_id && plan.stripe_product_id === profile.stripe_product_id) ||
      plans.find((plan) => plan.id === 'free') ||
      null;

    return {
      plan: matchedPlan?.id || 'free',
      product_id: profile.stripe_product_id || null,
      subscription_end: profile.subscription_current_period_end || null,
      billing_status: profile.subscription_status || null,
      access_status: (profile.billing_access_status as SubscriptionData['access_status']) || 'active',
      block_reason: profile.billing_block_reason || null,
      grace_until: profile.billing_grace_until || null,
      should_block: profile.billing_access_status === 'blocked',
      source: 'profile-fallback' as const,
      usage: {
        presentations: 0,
        campaigns: 0,
        emails: 0,
      },
      limits: matchedPlan
        ? {
            presentations: matchedPlan.limit_presentations,
            campaigns: matchedPlan.limit_campaigns,
            emails: matchedPlan.limit_emails,
          }
        : {
            presentations: 50,
            campaigns: 2,
            emails: 50,
          },
    };
  }, [plans, user]);

  const checkSubscription = useCallback(async () => {
    if (authLoading) return;

    if (!user || !session) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await invokeEdgeFunction<SubscriptionData>('check-subscription');
      if (error) throw error;
      setSubscription({ ...data, source: 'edge' });
      lastSubscriptionErrorRef.current = null;
    } catch (err) {
      if (isUnauthorizedFunctionsError(err)) {
        const fallback = await buildProfileFallbackSubscription();
        setSubscription(fallback);
        return;
      }

      const message = await getEdgeFunctionErrorMessage(err);
      const fallback = await buildProfileFallbackSubscription();
      setSubscription(fallback);
      if (lastSubscriptionErrorRef.current !== message) {
        lastSubscriptionErrorRef.current = message;
        console.warn('Failed to check subscription:', message);
      }
    } finally {
      setLoading(false);
    }
  }, [authLoading, buildProfileFallbackSubscription, session, user]);

  useEffect(() => {
    if (authLoading) return;

    checkSubscription();

    if (!user || !session) return;

    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [authLoading, checkSubscription, session, user]);

  const canUse = useCallback((resource: 'presentations' | 'campaigns' | 'emails') => {
    if (loading) return true;
    if (!subscription || subscription.access_status === 'blocked') return false;
    const limit = subscription.limits[resource];
    if (limit === -1) return true;
    return subscription.usage[resource] < limit;
  }, [loading, subscription]);

  const getRemainingUsage = useCallback((resource: 'presentations' | 'campaigns' | 'emails') => {
    if (!subscription) return null;
    const limit = subscription.limits[resource];
    if (limit === -1) return Infinity;
    return Math.max(0, limit - subscription.usage[resource]);
  }, [subscription]);

  const startCheckout = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan?.stripe_price_id) throw new Error('Plan has no Stripe price');
    const { data, error } = await invokeEdgeFunction<{ url?: string }>('create-checkout', {
      body: { price_id: plan.stripe_price_id },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, '_blank');
  };

  const openCustomerPortal = async () => {
    const { data, error } = await invokeEdgeFunction<{ url?: string }>('customer-portal');
    if (error) throw error;
    if (data?.url) window.open(data.url, '_blank');
  };

  return {
    subscription,
    plans,
    loading,
    hasBillingIssue: subscription?.access_status === 'grace' || subscription?.access_status === 'blocked',
    isBillingBlocked: subscription?.access_status === 'blocked',
    isBillingGrace: subscription?.access_status === 'grace',
    canUse,
    getRemainingUsage,
    startCheckout,
    openCustomerPortal,
    refreshSubscription: checkSubscription,
  };
};
