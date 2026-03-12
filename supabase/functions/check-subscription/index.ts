import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Unauthorized");

    const user = userData.user;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Fetch plans from database
    const { data: allPlans } = await supabaseClient
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    const plansMap: Record<string, any> = {};
    for (const p of (allPlans || [])) {
      plansMap[p.id] = p;
      if (p.stripe_product_id) {
        plansMap[`product:${p.stripe_product_id}`] = p;
      }
    }

    // Check Stripe subscription
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let plan = "free";
    let productId = null;
    let subscriptionEnd = null;

    if (customers.data.length > 0) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        productId = sub.items.data[0].price.product;
        subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();

        // Match product_id to plan
        const matchedPlan = plansMap[`product:${productId}`];
        if (matchedPlan) {
          plan = matchedPlan.id;
        }
      }
    }

    // Count usage this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: presentationCount } = await supabaseClient
      .from("presentations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    const { count: campaignCount } = await supabaseClient
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data: userCampaigns } = await supabaseClient
      .from("campaigns")
      .select("id")
      .eq("user_id", user.id);

    let emailCount = 0;
    if (userCampaigns && userCampaigns.length > 0) {
      const campaignIds = userCampaigns.map((c: any) => c.id);
      const { count } = await supabaseClient
        .from("campaign_presentations")
        .select("id", { count: "exact", head: true })
        .in("campaign_id", campaignIds)
        .eq("send_status", "sent")
        .gte("sent_at", startOfMonth.toISOString());
      emailCount = count || 0;
    }

    // Get limits from the matched plan in DB
    const currentPlan = plansMap[plan];
    const limits = currentPlan
      ? {
          presentations: currentPlan.limit_presentations,
          campaigns: currentPlan.limit_campaigns,
          emails: currentPlan.limit_emails,
        }
      : { presentations: 50, campaigns: 2, emails: 50 };

    return new Response(JSON.stringify({
      plan,
      product_id: productId,
      subscription_end: subscriptionEnd,
      usage: {
        presentations: presentationCount || 0,
        campaigns: campaignCount || 0,
        emails: emailCount,
      },
      limits,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
