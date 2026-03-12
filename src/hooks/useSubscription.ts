import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SubscriptionData {
  plan: 'free' | 'pro' | 'enterprise';
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

const PLAN_TIERS = {
  pro: {
    price_id: 'price_1TA7qdLxnwoSfHjZjHCtVj9K',
    product_id: 'prod_U8Odcw8tJ1x18X',
  },
  enterprise: {
    price_id: 'price_1TA7r1LxnwoSfHjZmlYCFwAB',
    product_id: 'prod_U8OewqNe8GDZ5t',
  },
};

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const startCheckout = async (plan: 'pro' | 'enterprise') => {
    const tier = PLAN_TIERS[plan];
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { price_id: tier.price_id },
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
    loading,
    canUse,
    getRemainingUsage,
    startCheckout,
    openCustomerPortal,
    refreshSubscription: checkSubscription,
  };
};
