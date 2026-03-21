import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-user-auth, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

  try {
    const { user, svc: serviceClient } = await getAuthenticatedUserContext(req);
    if (!user.email) throw new HttpError(401, "Unauthorized");

    const { price_id } = await req.json();
    if (!price_id) throw new Error("price_id is required");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!stripeKey.startsWith("sk_") && !stripeKey.startsWith("rk_")) {
      throw new Error("STRIPE_SECRET_KEY invalida. Use uma chave secreta sk_ ou rk_.");
    }

    const { data: plan } = await serviceClient
      .from("plans")
      .select("id")
      .eq("stripe_price_id", price_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!plan) throw new Error("Invalid Stripe price for checkout");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id || undefined;

    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    await serviceClient
      .from("profiles")
      .update({ stripe_customer_id: customerId } as never)
      .eq("user_id", user.id);

    const origin = req.headers.get("origin") || Deno.env.get("PUBLIC_APP_URL") || "https://envpro.com.br";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: "subscription",
      metadata: {
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
      success_url: `${origin}/settings?tab=faturamento&checkout=success`,
      cancel_url: `${origin}/settings?tab=faturamento`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
