import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { resolveBillingAccess } from "../_shared/billing.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-user-auth, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const svc = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const findUserIdForCustomer = async (customerId: string, email?: string | null, explicitUserId?: string | null) => {
  if (explicitUserId) return explicitUserId;

  const { data: byCustomer } = await svc
    .from("profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (byCustomer?.user_id) return byCustomer.user_id;

  if (email) {
    const { data: byEmail } = await svc
      .from("profiles")
      .select("user_id")
      .ilike("email", email)
      .maybeSingle();

    if (byEmail?.user_id) return byEmail.user_id;
  }

  return null;
};

const buildBillingFields = ({
  subscriptionStatus,
  currentPeriodEnd,
  nextPaymentAttempt = null,
  lastEventType,
}: {
  subscriptionStatus: string | null | undefined;
  currentPeriodEnd: string | null;
  nextPaymentAttempt?: string | null;
  lastEventType: string;
}) => {
  const billingAccess = resolveBillingAccess({
    subscriptionStatus,
    currentPeriodEnd,
    nextPaymentAttempt,
  });

  return {
    billing_access_status: billingAccess.accessStatus,
    billing_block_reason: billingAccess.blockReason,
    billing_grace_until: billingAccess.graceUntil,
    billing_last_event_type: lastEventType,
  };
};

const updateProfileFromSubscription = async (subscription: Stripe.Subscription, lastEventType: string) => {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price.id || null;
  const productId =
    typeof firstItem?.price.product === "string" ? firstItem.price.product : firstItem?.price.product?.id || null;
  const customerEmail =
    typeof subscription.customer === "string" ? null : subscription.customer.email;

  const userId = await findUserIdForCustomer(
    customerId,
    customerEmail,
    subscription.metadata?.user_id || null,
  );

  if (!userId) {
    console.warn("Stripe webhook: user not found for subscription", subscription.id);
    return;
  }

  await svc
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      stripe_product_id: productId,
      subscription_status: subscription.status,
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      ...buildBillingFields({
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        lastEventType,
      }),
    } as never)
    .eq("user_id", userId);
};

const clearProfileSubscription = async (subscription: Stripe.Subscription, lastEventType: string) => {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const customerEmail =
    typeof subscription.customer === "string" ? null : subscription.customer.email;

  const userId = await findUserIdForCustomer(
    customerId,
    customerEmail,
    subscription.metadata?.user_id || null,
  );

  if (!userId) {
    console.warn("Stripe webhook: user not found for canceled subscription", subscription.id);
    return;
  }

  await svc
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      stripe_price_id: null,
      stripe_product_id: null,
      ...buildBillingFields({
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        lastEventType,
      }),
    } as never)
    .eq("user_id", userId);
};

const updateProfileFromInvoice = async (invoice: Stripe.Invoice, lastEventType: string) => {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id || null;
  if (!customerId) return;

  const userId = await findUserIdForCustomer(customerId, invoice.customer_email || null, null);
  if (!userId) {
    console.warn("Stripe webhook: user not found for invoice", invoice.id);
    return;
  }

  const currentPeriodEnd = invoice.period_end
    ? new Date(invoice.period_end * 1000).toISOString()
    : null;
  const nextPaymentAttempt = invoice.next_payment_attempt
    ? new Date(invoice.next_payment_attempt * 1000).toISOString()
    : null;

  const nextStatus =
    lastEventType === "invoice.payment_failed"
      ? "past_due"
      : lastEventType === "invoice.paid"
        ? "active"
        : null;

  await svc
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      ...(nextStatus ? { subscription_status: nextStatus } : {}),
      ...(currentPeriodEnd ? { subscription_current_period_end: currentPeriodEnd } : {}),
      ...buildBillingFields({
        subscriptionStatus: nextStatus,
        currentPeriodEnd,
        nextPaymentAttempt,
        lastEventType,
      }),
    } as never)
    .eq("user_id", userId);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const signature = req.headers.get("stripe-signature");

    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    if (!signature) throw new Error("Missing stripe-signature header");

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.customer) {
          const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
          const explicitUserId = session.metadata?.user_id || session.client_reference_id || null;
          const userId = await findUserIdForCustomer(customerId, session.customer_details?.email || null, explicitUserId);

          if (userId) {
            await svc
              .from("profiles")
              .update({
                stripe_customer_id: customerId,
              } as never)
              .eq("user_id", userId);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await updateProfileFromSubscription(event.data.object as Stripe.Subscription, event.type);
        break;
      }
      case "customer.subscription.deleted": {
        await clearProfileSubscription(event.data.object as Stripe.Subscription, event.type);
        break;
      }
      case "invoice.payment_failed":
      case "invoice.paid": {
        await updateProfileFromInvoice(event.data.object as Stripe.Invoice, event.type);
        break;
      }
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("stripe-webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Webhook failed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
