import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SubscriptionData {
  plan: string;
  product_id: string | null;
  subscription_end: string | null;
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
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);

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

  const checkSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setSubscription(data);
    } catch (err) {
      console.error('Failed to check subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const canUse = useCallback((resource: 'presentations' | 'campaigns' | 'emails') => {
    if (!subscription) return true;
    const limit = subscription.limits[resource];
    if (limit === -1) return true;
    return subscription.usage[resource] < limit;
  }, [subscription]);

  const getRemainingUsage = useCallback((resource: 'presentations' | 'campaigns' | 'emails') => {
    if (!subscription) return null;
    const limit = subscription.limits[resource];
    if (limit === -1) return Infinity;
    return Math.max(0, limit - subscription.usage[resource]);
  }, [subscription]);

  const startCheckout = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan?.stripe_price_id) throw new Error('Plan has no Stripe price');
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { price_id: plan.stripe_price_id },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, '_blank');
  };

  const openCustomerPortal = async () => {
    const { data, error } = await supabase.functions.invoke('customer-portal');
    if (error) throw error;
    if (data?.url) window.open(data.url, '_blank');
  };

  return {
    subscription,
    plans,
    loading,
    canUse,
    getRemainingUsage,
    startCheckout,
    openCustomerPortal,
    refreshSubscription: checkSubscription,
  };
};
