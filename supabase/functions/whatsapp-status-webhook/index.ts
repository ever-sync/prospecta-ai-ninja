import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function scoreBucket(analysisData: any): "low" | "medium" | "high" | "unknown" {
  const score = analysisData?.scores?.overall;
  if (typeof score !== "number") return "unknown";
  if (score < 40) return "low";
  if (score < 70) return "medium";
  return "high";
}

function toIso(ts?: string): string {
  if (!ts) return new Date().toISOString();
  const numeric = Number(ts);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return new Date(numeric * 1000).toISOString();
  }
  return new Date().toISOString();
}

function mapDeliveryStatus(status: string): "sent" | "delivered" | "read" | "failed" | null {
  if (status === "sent") return "sent";
  if (status === "delivered") return "delivered";
  if (status === "read") return "read";
  if (
    status === "failed" ||
    status === "undelivered" ||
    status === "deleted"
  ) return "failed";
  return null;
}

async function computeHmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function isValidMetaSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!secret) return false;
  if (!signatureHeader) return false;
  const [prefix, hash] = signatureHeader.split("=");
  if (prefix !== "sha256" || !hash) return false;
  const expected = await computeHmacSha256Hex(secret, rawBody);
  return hash === expected;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const verifyToken = Deno.env.get("META_WHATSAPP_VERIFY_TOKEN") || "";
    const appSecret = Deno.env.get("META_WHATSAPP_APP_SECRET") || "";

    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token && token === verifyToken) {
        return new Response(challenge || "", { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } },
    );

    if (!appSecret) {
      return new Response(
        JSON.stringify({ error: "META_WHATSAPP_APP_SECRET not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-hub-signature-256");
    const signatureOk = await isValidMetaSignature(appSecret, rawBody, signatureHeader);
    if (!signatureOk) {
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};
    const statuses: any[] = [];
    const incomingMessages: any[] = [];

    for (const entry of payload?.entry || []) {
      for (const change of entry?.changes || []) {
        for (const status of change?.value?.statuses || []) {
          statuses.push(status);
        }
        for (const msg of change?.value?.messages || []) {
          incomingMessages.push(msg);
        }
      }
    }

    // Process incoming WhatsApp replies from leads
    for (const msg of incomingMessages) {
      const fromPhone = msg?.from as string | undefined;
      if (!fromPhone) continue;

      // Normalize: ensure starts with 55 and is 12-13 digits
      const digits = fromPhone.replace(/\D/g, "");
      const normalized = digits.startsWith("55") ? digits : `55${digits}`;

      // Find presentation by business_phone matching this number
      const { data: presRows } = await supabase
        .from("presentations")
        .select("id, user_id, status, pipeline_stage_id, business_category, analysis_data")
        .or(`business_phone.eq.${normalized},business_phone.eq.+${normalized},business_phone.eq.${digits}`)
        .neq("status", "responded")
        .order("created_at", { ascending: false })
        .limit(1);

      const pres = presRows?.[0];
      if (!pres) continue;

      await supabase
        .from("presentations")
        .update({ status: "responded" })
        .eq("id", pres.id);

      await supabase.from("message_conversion_events").insert({
        event_type: "whatsapp_reply",
        presentation_id: pres.id,
        user_id: pres.user_id,
        channel: "whatsapp",
        pipeline_stage_id: pres.pipeline_stage_id,
        niche: pres.business_category,
        score_bucket: scoreBucket(pres.analysis_data),
        source: "whatsapp_status_webhook",
        metadata: {
          from_phone: fromPhone,
          message_type: msg?.type,
          text: msg?.text?.body?.substring(0, 200),
        },
      });
    }

    if (statuses.length === 0 && incomingMessages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No statuses or messages in payload" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let processed = 0;

    for (const statusPayload of statuses) {
      const providerMessageId = statusPayload?.id;
      const mapped = mapDeliveryStatus(statusPayload?.status || "");
      if (!providerMessageId || !mapped) continue;

      const eventAt = toIso(statusPayload?.timestamp);

      const { data: cpRow } = await supabase
        .from("campaign_presentations")
        .select("id, campaign_id, presentation_id, variant_id, send_status")
        .eq("provider_message_id", providerMessageId)
        .maybeSingle();

      if (!cpRow) continue;

      const updatePayload: Record<string, unknown> = {
        delivery_status: mapped,
        last_status_at: eventAt,
      };
      if (mapped === "failed") {
        updatePayload.send_status = "failed";
      }

      await supabase
        .from("campaign_presentations")
        .update(updatePayload)
        .eq("id", cpRow.id);

      const { data: attemptRows } = await supabase
        .from("campaign_message_attempts")
        .select("id, status")
        .eq("provider_message_id", providerMessageId)
        .eq("provider", "meta_cloud")
        .order("created_at", { ascending: false })
        .limit(1);

      if (attemptRows && attemptRows.length > 0) {
        const attemptUpdate: Record<string, unknown> = { status: mapped };
        if (mapped === "delivered") attemptUpdate.delivered_at = eventAt;
        if (mapped === "read") attemptUpdate.read_at = eventAt;
        if (mapped === "failed") {
          attemptUpdate.error_reason = statusPayload?.errors?.[0]?.title || "provider_failed";
        }

        await supabase
          .from("campaign_message_attempts")
          .update(attemptUpdate)
          .eq("id", attemptRows[0].id);
      }

      const { data: presentation } = await supabase
        .from("presentations")
        .select("id, user_id, business_category, analysis_data, pipeline_stage_id")
        .eq("id", cpRow.presentation_id)
        .maybeSingle();

      if (presentation) {
        const conversionEvent = mapped === "read" ? "opened" : mapped;
        if (conversionEvent === "sent" || conversionEvent === "delivered" || conversionEvent === "opened") {
          await supabase.from("message_conversion_events").insert({
            event_type: conversionEvent,
            presentation_id: presentation.id,
            user_id: presentation.user_id,
            campaign_id: cpRow.campaign_id,
            campaign_presentation_id: cpRow.id,
            variant_id: cpRow.variant_id,
            channel: "whatsapp",
            pipeline_stage_id: presentation.pipeline_stage_id,
            niche: presentation.business_category,
            score_bucket: scoreBucket(presentation.analysis_data),
            source: "whatsapp_status_webhook",
            metadata: {
              provider_message_id: providerMessageId,
              provider_status: statusPayload?.status,
              raw_status: statusPayload,
            },
          });
        }
      }

      processed++;
    }

    return new Response(
      JSON.stringify({ success: true, processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("whatsapp-status-webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Webhook failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
