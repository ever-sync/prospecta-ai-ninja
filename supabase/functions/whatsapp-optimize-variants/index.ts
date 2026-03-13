import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type VariantRow = {
  id: string;
  name: string;
  channel: string;
  experiment_group: string | null;
  variant_key: string;
  is_active: boolean;
};

type VariantStats = VariantRow & {
  sent: number;
  accepted: number;
  acceptance_rate: number;
};

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  return Math.min(max, Math.max(min, rounded));
}

function plusDaysIso(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const svc = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const {
      lookback_days = 14,
      min_sent_per_variant = 20,
      mode = "manual",
      dry_run = false,
      force = false,
    } = await req.json().catch(() => ({}));

    const lookbackDays = clampInt(lookback_days, 14, 7, 90);
    const minSample = clampInt(min_sent_per_variant, 20, 5, 500);
    const runMode = mode === "auto" ? "auto" : "manual";

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    if (runMode === "auto" && !force) {
      const { data: lastRun } = await svc
        .from("whatsapp_optimization_runs")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastRun?.created_at) {
        const lastAt = new Date(lastRun.created_at).getTime();
        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        if (now - lastAt < sevenDaysMs) {
          return new Response(
            JSON.stringify({
              success: true,
              skipped: true,
              reason: "cadence_not_due",
              last_run_at: lastRun.created_at,
              next_run_at: plusDaysIso(new Date(lastRun.created_at), 7),
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const { data: templateRows } = await svc
      .from("message_templates")
      .select("id, name, channel, experiment_group, variant_key, is_active")
      .eq("user_id", user.id)
      .eq("channel", "whatsapp")
      .not("experiment_group", "is", null);

    const variants = (templateRows || []) as VariantRow[];
    if (variants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "no_ab_variants" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const variantIds = variants.map((v) => v.id);
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: eventsByVariant } = await svc
      .from("message_conversion_events")
      .select("event_type, template_id, variant_id")
      .eq("user_id", user.id)
      .eq("channel", "whatsapp")
      .in("event_type", ["sent", "accepted"])
      .gte("created_at", since)
      .in("variant_id", variantIds);

    const { data: eventsByTemplate } = await svc
      .from("message_conversion_events")
      .select("event_type, template_id, variant_id")
      .eq("user_id", user.id)
      .eq("channel", "whatsapp")
      .in("event_type", ["sent", "accepted"])
      .gte("created_at", since)
      .in("template_id", variantIds)
      .is("variant_id", null);

    const eventRows = [...(eventsByVariant || []), ...(eventsByTemplate || [])];
    const statsMap = new Map<string, { sent: number; accepted: number }>();
    for (const id of variantIds) {
      statsMap.set(id, { sent: 0, accepted: 0 });
    }

    for (const event of eventRows) {
      const variantId = event.variant_id || event.template_id;
      if (!variantId) continue;
      const row = statsMap.get(variantId);
      if (!row) continue;
      if (event.event_type === "sent") row.sent++;
      if (event.event_type === "accepted") row.accepted++;
    }

    const groupMap = new Map<string, VariantRow[]>();
    for (const variant of variants) {
      if (!variant.experiment_group) continue;
      const list = groupMap.get(variant.experiment_group) || [];
      list.push(variant);
      groupMap.set(variant.experiment_group, list);
    }

    const decisions: Array<{
      experiment_group: string;
      winner_variant_id: string;
      winner_variant_key: string;
      winner_acceptance_rate: number;
      sample_sent: number;
      paused_variant_ids: string[];
      candidates: VariantStats[];
    }> = [];

    for (const [group, groupVariants] of groupMap.entries()) {
      if (groupVariants.length < 2) continue;

      const candidates: VariantStats[] = groupVariants.map((variant) => {
        const stats = statsMap.get(variant.id) || { sent: 0, accepted: 0 };
        const acceptanceRate = stats.sent > 0
          ? Number((stats.accepted / stats.sent).toFixed(4))
          : 0;
        return {
          ...variant,
          sent: stats.sent,
          accepted: stats.accepted,
          acceptance_rate: acceptanceRate,
        };
      }).filter((v) => v.sent >= minSample);

      if (candidates.length < 2) continue;

      candidates.sort((a, b) => {
        if (b.acceptance_rate !== a.acceptance_rate) {
          return b.acceptance_rate - a.acceptance_rate;
        }
        if (b.accepted !== a.accepted) return b.accepted - a.accepted;
        if (b.sent !== a.sent) return b.sent - a.sent;
        return a.variant_key.localeCompare(b.variant_key);
      });

      const winner = candidates[0];
      const pausedVariantIds = groupVariants
        .filter((v) => v.id !== winner.id && v.is_active)
        .map((v) => v.id);

      decisions.push({
        experiment_group: group,
        winner_variant_id: winner.id,
        winner_variant_key: winner.variant_key,
        winner_acceptance_rate: winner.acceptance_rate,
        sample_sent: winner.sent,
        paused_variant_ids: pausedVariantIds,
        candidates,
      });

      if (!dry_run) {
        await svc
          .from("message_templates")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("channel", "whatsapp")
          .eq("experiment_group", group)
          .neq("id", winner.id)
          .eq("is_active", true);

        await svc
          .from("message_templates")
          .update({ is_active: true })
          .eq("id", winner.id);
      }
    }

    if (!dry_run) {
      await svc.from("whatsapp_optimization_runs").insert({
        user_id: user.id,
        mode: runMode,
        lookback_days: lookbackDays,
        min_sample: minSample,
        groups_evaluated: groupMap.size,
        groups_promoted: decisions.length,
        metadata: {
          since,
          decisions,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        mode: runMode,
        lookback_days: lookbackDays,
        min_sent_per_variant: minSample,
        groups_evaluated: groupMap.size,
        groups_promoted: decisions.length,
        decisions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("whatsapp-optimize-variants error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to optimize variants" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
