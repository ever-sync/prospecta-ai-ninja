import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { isPaidPlanStatus, resolveBillingAccess } from "../_shared/billing.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-user-auth, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PlanRow = {
  id: string;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  limit_presentations: number;
  limit_campaigns: number;
  limit_emails: number;
};

const hasUsableStripeSecret = (value: string | null | undefined) =>
  !!value && (value.startsWith("sk_") || value.startsWith("rk_"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("x-user-auth") ?? req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const userClient = createClient(supabaseUrl, anonKey);
    const svc = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser(token);

    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: allPlans } = await svc
      .from("plans")
      .select("id, stripe_price_id, stripe_product_id, limit_presentations, limit_campaigns, limit_emails")
      .eq("is_active", true)
      .order("display_order");

    const plansMap = new Map<string, PlanRow>();
    for (const plan of ((allPlans || []) as PlanRow[])) {
      plansMap.set(plan.id, plan);
      if (plan.stripe_price_id) plansMap.set(`price:${plan.stripe_price_id}`, plan);
      if (plan.stripe_product_id) plansMap.set(`product:${plan.stripe_product_id}`, plan);
    }

    let plan = "free";
    let productId: string | null = null;
    let subscriptionEnd: string | null = null;
    let priceId: string | null = null;

    const { data: profile } = await svc
      .from("profiles")
      .select("stripe_customer_id, stripe_price_id, stripe_product_id, subscription_status, subscription_current_period_end, billing_access_status, billing_block_reason, billing_grace_until")
      .eq("user_id", user.id)
      .maybeSingle();

    let subscriptionStatus = profile?.subscription_status || null;
    let accessStatus = profile?.billing_access_status || "active";
    let blockReason = profile?.billing_block_reason || null;
    let graceUntil = profile?.billing_grace_until || null;

    if (subscriptionStatus && isPaidPlanStatus(subscriptionStatus)) {
      productId = profile.stripe_product_id || null;
      priceId = profile.stripe_price_id || null;
      subscriptionEnd = profile.subscription_current_period_end || null;

      const matchedPlan =
        (priceId ? plansMap.get(`price:${priceId}`) : null) ||
        (productId ? plansMap.get(`product:${productId}`) : null) ||
        null;

      if (matchedPlan) {
        plan = matchedPlan.id;
      }
    }

    if (plan === "free" && hasUsableStripeSecret(stripeKey)) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        let customerId = profile?.stripe_customer_id || null;

        if (!customerId) {
          const customers = await stripe.customers.list({ email: user.email, limit: 1 });
          customerId = customers.data[0]?.id || null;
        }

        if (customerId) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            limit: 1,
          });

          if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0];
            const firstItem = subscription.items.data[0];
            productId = typeof firstItem?.price.product === "string" ? firstItem.price.product : null;
            priceId = firstItem?.price.id || null;
            subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
            subscriptionStatus = subscription.status;

            const billingAccess = resolveBillingAccess({
              subscriptionStatus,
              currentPeriodEnd: subscriptionEnd,
            });
            accessStatus = billingAccess.accessStatus;
            blockReason = billingAccess.blockReason;
            graceUntil = billingAccess.graceUntil;

            const matchedPlan =
              (priceId ? plansMap.get(`price:${priceId}`) : null) ||
              (productId ? plansMap.get(`product:${productId}`) : null) ||
              null;
            if (matchedPlan && isPaidPlanStatus(subscription.status)) plan = matchedPlan.id;

            await svc
              .from("profiles")
              .update({
                stripe_customer_id: customerId,
                stripe_subscription_id: subscription.id,
                stripe_price_id: priceId,
                stripe_product_id: productId,
                subscription_status: subscription.status,
                subscription_current_period_end: subscriptionEnd,
                billing_access_status: accessStatus,
                billing_block_reason: blockReason,
                billing_grace_until: graceUntil,
                billing_last_event_type: "check-subscription:stripe-refresh",
              } as never)
              .eq("user_id", user.id);
          }
        }
      } catch (stripeError) {
        console.error("Stripe lookup failed in check-subscription:", stripeError);
      }
    } else if (plan === "free" && stripeKey) {
      console.error("Invalid STRIPE_SECRET_KEY configured for check-subscription");
    }

    if (subscriptionStatus) {
      const resolvedBilling = resolveBillingAccess({
        subscriptionStatus,
        currentPeriodEnd: subscriptionEnd,
        now: Date.now(),
      });

      accessStatus = resolvedBilling.accessStatus;
      blockReason = resolvedBilling.blockReason;
      graceUntil = resolvedBilling.graceUntil;

      const needsBillingRefresh =
        profile?.billing_access_status !== accessStatus ||
        (profile?.billing_block_reason || null) !== blockReason ||
        (profile?.billing_grace_until || null) !== graceUntil;

      if (needsBillingRefresh) {
        await svc
          .from("profiles")
          .update({
            billing_access_status: accessStatus,
            billing_block_reason: blockReason,
            billing_grace_until: graceUntil,
            billing_last_event_type: "check-subscription:normalize",
          } as never)
          .eq("user_id", user.id);
      }
    } else {
      accessStatus = profile?.billing_access_status || "active";
      blockReason = profile?.billing_block_reason || null;
      graceUntil = profile?.billing_grace_until || null;
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: presentationCount } = await svc
      .from("presentations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    const { count: campaignCount } = await svc
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data: userCampaigns } = await svc
      .from("campaigns")
      .select("id")
      .eq("user_id", user.id);

    let emailCount = 0;
    if (userCampaigns && userCampaigns.length > 0) {
      const campaignIds = userCampaigns.map((campaign) => campaign.id);
      const { count } = await svc
        .from("campaign_presentations")
        .select("id", { count: "exact", head: true })
        .in("campaign_id", campaignIds)
        .eq("send_status", "sent")
        .gte("sent_at", startOfMonth.toISOString());
      emailCount = count || 0;
    }

    const currentPlan = plansMap.get(plan);
    const limits = currentPlan
      ? {
          presentations: currentPlan.id === "free" ? 3 : currentPlan.limit_presentations,
          campaigns: currentPlan.id === "free" ? 0 : currentPlan.limit_campaigns,
          emails: currentPlan.id === "free" ? 0 : currentPlan.limit_emails,
        }
      : { presentations: 3, campaigns: 0, emails: 0 };

    return new Response(
      JSON.stringify({
        plan,
        product_id: productId,
        subscription_end: subscriptionEnd,
        billing_status: subscriptionStatus,
        access_status: accessStatus,
        block_reason: blockReason,
        grace_until: graceUntil,
        should_block: accessStatus === "blocked",
        usage: {
          presentations: presentationCount || 0,
          campaigns: campaignCount || 0,
          emails: emailCount,
        },
        limits,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
