import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PlanRow = {
  id: string;
  stripe_product_id: string | null;
  limit_presentations: number;
  limit_campaigns: number;
  limit_emails: number;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const svc = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { data: allPlans } = await svc
      .from("plans")
      .select("id, stripe_product_id, limit_presentations, limit_campaigns, limit_emails")
      .eq("is_active", true)
      .order("display_order");

    const plansMap = new Map<string, PlanRow>();
    for (const plan of ((allPlans || []) as PlanRow[])) {
      plansMap.set(plan.id, plan);
      if (plan.stripe_product_id) plansMap.set(`product:${plan.stripe_product_id}`, plan);
    }

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let plan = "free";
    let productId: string | null = null;
    let subscriptionEnd: string | null = null;

    if (customers.data.length > 0) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        const firstItem = subscription.items.data[0];
        productId = typeof firstItem?.price.product === "string" ? firstItem.price.product : null;
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

        const matchedPlan = productId ? plansMap.get(`product:${productId}`) : null;
        if (matchedPlan) plan = matchedPlan.id;
      }
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
          presentations: currentPlan.limit_presentations,
          campaigns: currentPlan.limit_campaigns,
          emails: currentPlan.limit_emails,
        }
      : { presentations: 50, campaigns: 2, emails: 50 };

    return new Response(
      JSON.stringify({
        plan,
        product_id: productId,
        subscription_end: subscriptionEnd,
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
