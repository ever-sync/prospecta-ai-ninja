import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_LIMITS = {
  free: { presentations: 50, campaigns: 2, emails: 50 },
  pro: { presentations: 500, campaigns: -1, emails: 500 },
  enterprise: { presentations: -1, campaigns: -1, emails: -1 },
};

const PRO_PRODUCT_ID = "prod_U8Odcw8tJ1x18X";
const ENTERPRISE_PRODUCT_ID = "prod_U8OewqNe8GDZ5t";

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

        if (productId === ENTERPRISE_PRODUCT_ID) plan = "enterprise";
        else if (productId === PRO_PRODUCT_ID) plan = "pro";
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

    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];

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
