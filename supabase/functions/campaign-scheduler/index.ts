/**
 * campaign-scheduler
 *
 * Runs every 5 minutes via pg_cron + pg_net.
 * Finds campaigns with status = 'scheduled' and scheduled_at <= now(),
 * marks them as 'sending', then triggers whatsapp-send-batch for each.
 *
 * Called with service-role key — no user auth required.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    // Only callable with service role key (from pg_cron) or no auth (Supabase scheduler)
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader && authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const svc = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const now = new Date().toISOString();

    // Find all campaigns that are due
    const { data: dueCampaigns, error: fetchError } = await svc
      .from("campaigns")
      .select("id, user_id, name, channel, scheduled_at")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (fetchError) throw fetchError;

    if (!dueCampaigns || dueCampaigns.length === 0) {
      return new Response(
        JSON.stringify({ triggered: 0, message: "No scheduled campaigns due" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: any[] = [];

    for (const campaign of dueCampaigns) {
      // Mark as 'sending' atomically — prevents double-trigger if cron overlaps
      const { data: claimed } = await svc
        .from("campaigns")
        .update({ status: "sending", updated_at: now })
        .eq("id", campaign.id)
        .eq("status", "scheduled") // only claim if still scheduled
        .select("id")
        .limit(1);

      if (!claimed || claimed.length === 0) {
        // Another instance already claimed this campaign
        results.push({ campaign_id: campaign.id, name: campaign.name, skipped: true });
        continue;
      }

      // Only WhatsApp campaigns are handled here (email campaigns use a different flow)
      if (campaign.channel !== "whatsapp") {
        results.push({ campaign_id: campaign.id, name: campaign.name, skipped: true, reason: "non-whatsapp" });
        continue;
      }

      // Invoke send-batch using service role + user_id in body
      try {
        const sendRes = await fetch(
          `${supabaseUrl}/functions/v1/whatsapp-send-batch`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              campaign_id: campaign.id,
              user_id: campaign.user_id,
              force_api: true,
            }),
          },
        );

        const sendData = await sendRes.json().catch(() => ({}));
        results.push({
          campaign_id: campaign.id,
          name: campaign.name,
          triggered: true,
          result: sendData,
        });
      } catch (sendErr: any) {
        // Revert to scheduled if send-batch invocation failed so cron can retry
        await svc
          .from("campaigns")
          .update({ status: "scheduled", updated_at: new Date().toISOString() })
          .eq("id", campaign.id);

        results.push({
          campaign_id: campaign.id,
          name: campaign.name,
          triggered: false,
          error: sendErr?.message || "invoke_failed",
        });
      }
    }

    return new Response(
      JSON.stringify({ triggered: results.filter((r) => r.triggered).length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("campaign-scheduler error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
