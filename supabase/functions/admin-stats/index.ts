import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toWeekKey = (isoDate: string) => {
  const d = new Date(isoDate);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
};

type AlertSeverity = "warning" | "critical";

type OperationalAlert = {
  type: "delivery_drop" | "failure_spike" | "acceptance_drop";
  severity: AlertSeverity;
  title: string;
  description: string;
  metricValue: number;
  baselineValue: number;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    let days = 30;
    try {
      const body = await req.json();
      if (body?.days && [7, 30, 90].includes(body.days)) days = body.days;
    } catch { /* no body or invalid json, use default */ }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Get totals
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const { count: totalPresentations } = await supabase
      .from("presentations")
      .select("id", { count: "exact", head: true });

    const { count: totalCampaigns } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true });

    const { count: totalViews } = await supabase
      .from("presentation_views")
      .select("id", { count: "exact", head: true });

    // Emails sent
    const { count: totalEmails } = await supabase
      .from("campaign_presentations")
      .select("id", { count: "exact", head: true })
      .eq("send_status", "sent");

    // This month stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthPresentations } = await supabase
      .from("presentations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString());

    const { count: monthViews } = await supabase
      .from("presentation_views")
      .select("id", { count: "exact", head: true })
      .gte("viewed_at", startOfMonth.toISOString());

    const { count: monthEmails } = await supabase
      .from("campaign_presentations")
      .select("id", { count: "exact", head: true })
      .eq("send_status", "sent")
      .gte("sent_at", startOfMonth.toISOString());

    // Daily stats for selected period
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    periodStart.setHours(0, 0, 0, 0);
    const isoPeriod = periodStart.toISOString();

    const { data: dailyPresentations } = await supabase
      .from("presentations")
      .select("created_at")
      .gte("created_at", isoPeriod);

    const { data: dailyViews } = await supabase
      .from("presentation_views")
      .select("viewed_at")
      .gte("viewed_at", isoPeriod);

    const { data: dailyEmails } = await supabase
      .from("campaign_presentations")
      .select("sent_at")
      .eq("send_status", "sent")
      .gte("sent_at", isoPeriod);

    // Build daily map
    const dailyMap = new Map<string, { presentations: number; views: number; emails: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().split("T")[0];
      dailyMap.set(key, { presentations: 0, views: 0, emails: 0 });
    }

    for (const p of dailyPresentations || []) {
      const key = p.created_at?.split("T")[0];
      if (key && dailyMap.has(key)) dailyMap.get(key)!.presentations++;
    }
    for (const v of dailyViews || []) {
      const key = v.viewed_at?.split("T")[0];
      if (key && dailyMap.has(key)) dailyMap.get(key)!.views++;
    }
    for (const e of dailyEmails || []) {
      const key = e.sent_at?.split("T")[0];
      if (key && dailyMap.has(key)) dailyMap.get(key)!.emails++;
    }

    const dailyStats = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    // Conversion funnel events for weekly baseline and template ranking
    const { data: conversionEvents } = await supabase
      .from("message_conversion_events")
      .select("created_at, event_type, template_id, variant_id, channel")
      .gte("created_at", isoPeriod);

    const weeklyMap = new Map<string, { sent: number; opened: number; accepted: number; rejected: number }>();
    const perfMap = new Map<string, {
      template_id: string | null;
      variant_id: string | null;
      channel: string;
      sent: number;
      opened: number;
      accepted: number;
      rejected: number;
    }>();

    for (const event of conversionEvents || []) {
      const weekKey = toWeekKey(event.created_at);
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, { sent: 0, opened: 0, accepted: 0, rejected: 0 });
      }
      const week = weeklyMap.get(weekKey)!;
      if (event.event_type === "sent") week.sent++;
      if (event.event_type === "opened") week.opened++;
      if (event.event_type === "accepted") week.accepted++;
      if (event.event_type === "rejected") week.rejected++;

      const perfKey = `${event.template_id || "none"}::${event.variant_id || "none"}::${event.channel || "unknown"}`;
      if (!perfMap.has(perfKey)) {
        perfMap.set(perfKey, {
          template_id: event.template_id || null,
          variant_id: event.variant_id || null,
          channel: event.channel || "unknown",
          sent: 0,
          opened: 0,
          accepted: 0,
          rejected: 0,
        });
      }
      const perf = perfMap.get(perfKey)!;
      if (event.event_type === "sent") perf.sent++;
      if (event.event_type === "opened") perf.opened++;
      if (event.event_type === "accepted") perf.accepted++;
      if (event.event_type === "rejected") perf.rejected++;
    }

    const weeklyCohorts = Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week_start, row]) => {
        const openRate = row.sent > 0 ? Math.round((row.opened / row.sent) * 100) : 0;
        const acceptanceRate = row.sent > 0 ? Math.round((row.accepted / row.sent) * 100) : 0;
        return { week_start, ...row, openRate, acceptanceRate };
      });

    const templateIds = Array.from(new Set(
      Array.from(perfMap.values()).map((row) => row.template_id).filter(Boolean),
    )) as string[];

    let templateMeta = new Map<string, { name: string; variant_key: string | null; experiment_group: string | null }>();
    if (templateIds.length > 0) {
      const { data: templateRows } = await supabase
        .from("message_templates")
        .select("id, name, variant_key, experiment_group")
        .in("id", templateIds);
      templateMeta = new Map((templateRows || []).map((row: any) => [
        row.id,
        { name: row.name, variant_key: row.variant_key || null, experiment_group: row.experiment_group || null },
      ]));
    }

    const templatePerformance = Array.from(perfMap.values())
      .map((row) => {
        const meta = row.template_id ? templateMeta.get(row.template_id) : null;
        const openRate = row.sent > 0 ? Math.round((row.opened / row.sent) * 100) : 0;
        const acceptanceRate = row.sent > 0 ? Math.round((row.accepted / row.sent) * 100) : 0;
        return {
          ...row,
          name: meta?.name || "Sem template",
          variant_key: meta?.variant_key || null,
          experiment_group: meta?.experiment_group || null,
          openRate,
          acceptanceRate,
        };
      })
      .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
      .slice(0, 20);

    const alertsStart = new Date();
    alertsStart.setDate(alertsStart.getDate() - 8);
    const isoAlerts = alertsStart.toISOString();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const nowTs = Date.now();
    const recentStartTs = nowTs - oneDayMs;

    const { data: alertEvents } = await supabase
      .from("message_conversion_events")
      .select("created_at, event_type")
      .eq("channel", "whatsapp")
      .in("event_type", ["sent", "delivered", "opened", "accepted"])
      .gte("created_at", isoAlerts);

    const { data: alertAttempts } = await supabase
      .from("campaign_message_attempts")
      .select("created_at, status")
      .eq("channel", "whatsapp")
      .in("status", ["failed"])
      .gte("created_at", isoAlerts);

    let sentRecent = 0;
    let deliveredRecent = 0;
    let acceptedRecent = 0;
    let sentBase = 0;
    let deliveredBase = 0;
    let acceptedBase = 0;

    for (const event of alertEvents || []) {
      const ts = new Date(event.created_at).getTime();
      const isRecent = ts >= recentStartTs;
      const isBaseline = ts >= new Date(isoAlerts).getTime() && ts < recentStartTs;
      if (!isRecent && !isBaseline) continue;

      if (event.event_type === "sent") {
        if (isRecent) sentRecent++;
        if (isBaseline) sentBase++;
      }
      if (event.event_type === "delivered" || event.event_type === "opened") {
        if (isRecent) deliveredRecent++;
        if (isBaseline) deliveredBase++;
      }
      if (event.event_type === "accepted") {
        if (isRecent) acceptedRecent++;
        if (isBaseline) acceptedBase++;
      }
    }

    let failedRecent = 0;
    let failedBase = 0;
    for (const attempt of alertAttempts || []) {
      const ts = new Date(attempt.created_at).getTime();
      if (ts >= recentStartTs) failedRecent++;
      else if (ts >= new Date(isoAlerts).getTime()) failedBase++;
    }

    const deliveryRateRecent = sentRecent > 0 ? deliveredRecent / sentRecent : 0;
    const deliveryRateBase = sentBase > 0 ? deliveredBase / sentBase : 0;
    const failRateRecent = sentRecent > 0 ? failedRecent / sentRecent : 0;
    const failRateBase = sentBase > 0 ? failedBase / sentBase : 0;
    const acceptRateRecent = sentRecent > 0 ? acceptedRecent / sentRecent : 0;
    const acceptRateBase = sentBase > 0 ? acceptedBase / sentBase : 0;

    const operationalAlerts: OperationalAlert[] = [];

    if (sentRecent >= 20 && deliveryRateBase > 0 && deliveryRateRecent < deliveryRateBase * 0.7) {
      operationalAlerts.push({
        type: "delivery_drop",
        severity: "warning",
        title: "Queda de entrega no WhatsApp",
        description: "A taxa de entrega/leitura das últimas 24h caiu mais de 30% versus baseline.",
        metricValue: Math.round(deliveryRateRecent * 100),
        baselineValue: Math.round(deliveryRateBase * 100),
      });
    }

    if (
      sentRecent >= 20 &&
      failRateRecent > 0.08 &&
      (failRateBase === 0 ? failRateRecent > 0.08 : failRateRecent > failRateBase * 1.5)
    ) {
      operationalAlerts.push({
        type: "failure_spike",
        severity: "critical",
        title: "Pico de falhas/bloqueio",
        description: "Falhas de envio cresceram de forma abrupta nas últimas 24h.",
        metricValue: Math.round(failRateRecent * 100),
        baselineValue: Math.round(failRateBase * 100),
      });
    }

    if (sentRecent >= 20 && acceptRateBase > 0 && acceptRateRecent < acceptRateBase * 0.6) {
      operationalAlerts.push({
        type: "acceptance_drop",
        severity: "warning",
        title: "Queda brusca de aceite",
        description: "A taxa de aceite das últimas 24h caiu mais de 40% versus baseline.",
        metricValue: Math.round(acceptRateRecent * 100),
        baselineValue: Math.round(acceptRateBase * 100),
      });
    }

    // Top users by presentations
    const { data: topUsers } = await supabase
      .from("presentations")
      .select("user_id, profiles!inner(email, company_name)")
      .order("created_at", { ascending: false });

    // Aggregate top users
    const userMap = new Map<string, { email: string; company: string; count: number }>();
    if (topUsers) {
      for (const p of topUsers) {
        const profile = p.profiles as any;
        const existing = userMap.get(p.user_id);
        if (existing) {
          existing.count++;
        } else {
          userMap.set(p.user_id, {
            email: profile?.email || "N/A",
            company: profile?.company_name || "N/A",
            count: 1,
          });
        }
      }
    }

    const topUsersList = Array.from(userMap.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent presentations (last 20)
    const { data: recentPresentations } = await supabase
      .from("presentations")
      .select("id, business_name, status, lead_response, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(20);

    return new Response(JSON.stringify({
      totals: {
        users: totalUsers || 0,
        presentations: totalPresentations || 0,
        campaigns: totalCampaigns || 0,
        views: totalViews || 0,
        emails: totalEmails || 0,
      },
      thisMonth: {
        presentations: monthPresentations || 0,
        views: monthViews || 0,
        emails: monthEmails || 0,
      },
      dailyStats,
      weeklyCohorts,
      templatePerformance,
      operationalAlerts,
      topUsers: topUsersList,
      recentPresentations: recentPresentations || [],
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
