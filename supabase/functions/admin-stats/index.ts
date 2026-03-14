import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-user-auth, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toWeekKey = (isoDate: string) => {
  const date = new Date(isoDate);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().split("T")[0];
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

type TemplateMetaRow = {
  id: string;
  name: string;
  variant_key: string | null;
  experiment_group: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("x-user-auth") ?? req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const svc = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await svc.auth.getUser(token);

    if (userError || !user) {
      console.error("[AdminStats] User verification failed:", userError);
      return new Response(JSON.stringify({ 
        error: "Unauthorized", 
        details: userError?.message,
        hint: "Token might be invalid or expired" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: roleData } = await svc
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"]);

    if (!roleData || roleData.length === 0) {
      console.error("[AdminStats] Forbidden: User does not have required role", { userId: user.id });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    let days = 30;
    try {
      const body = await req.json();
      if (body?.days && [7, 30, 90].includes(body.days)) days = body.days;
    } catch {
      // Default period stays 30 days.
    }

    const { count: totalUsers } = await svc.from("profiles").select("id", { count: "exact", head: true });
    const { count: totalPresentations } = await svc.from("presentations").select("id", { count: "exact", head: true });
    const { count: totalCampaigns } = await svc.from("campaigns").select("id", { count: "exact", head: true });
    const { count: totalViews } = await svc.from("presentation_views").select("id", { count: "exact", head: true });
    const { count: totalEmails } = await svc
      .from("campaign_presentations")
      .select("id", { count: "exact", head: true })
      .eq("send_status", "sent");

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthPresentations } = await svc
      .from("presentations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString());

    const { count: monthViews } = await svc
      .from("presentation_views")
      .select("id", { count: "exact", head: true })
      .gte("viewed_at", startOfMonth.toISOString());

    const { count: monthEmails } = await svc
      .from("campaign_presentations")
      .select("id", { count: "exact", head: true })
      .eq("send_status", "sent")
      .gte("sent_at", startOfMonth.toISOString());

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    periodStart.setHours(0, 0, 0, 0);
    const isoPeriod = periodStart.toISOString();

    const { data: dailyPresentations } = await svc
      .from("presentations")
      .select("created_at")
      .gte("created_at", isoPeriod);

    const { data: dailyViews } = await svc
      .from("presentation_views")
      .select("viewed_at")
      .gte("viewed_at", isoPeriod);

    const { data: dailyEmails } = await svc
      .from("campaign_presentations")
      .select("sent_at")
      .eq("send_status", "sent")
      .gte("sent_at", isoPeriod);

    const dailyMap = new Map<string, { presentations: number; views: number; emails: number }>();
    for (let i = 0; i < days; i += 1) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const key = date.toISOString().split("T")[0];
      dailyMap.set(key, { presentations: 0, views: 0, emails: 0 });
    }

    for (const row of dailyPresentations || []) {
      const key = row.created_at?.split("T")[0];
      if (key && dailyMap.has(key)) dailyMap.get(key)!.presentations += 1;
    }
    for (const row of dailyViews || []) {
      const key = row.viewed_at?.split("T")[0];
      if (key && dailyMap.has(key)) dailyMap.get(key)!.views += 1;
    }
    for (const row of dailyEmails || []) {
      const key = row.sent_at?.split("T")[0];
      if (key && dailyMap.has(key)) dailyMap.get(key)!.emails += 1;
    }

    const dailyStats = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    const { data: conversionEvents } = await svc
      .from("message_conversion_events")
      .select("created_at, event_type, template_id, variant_id, channel")
      .gte("created_at", isoPeriod);

    const weeklyMap = new Map<string, { sent: number; opened: number; accepted: number; rejected: number }>();
    const perfMap = new Map<
      string,
      {
        template_id: string | null;
        variant_id: string | null;
        channel: string;
        sent: number;
        opened: number;
        accepted: number;
        rejected: number;
      }
    >();

    for (const event of conversionEvents || []) {
      const weekKey = toWeekKey(event.created_at);
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, { sent: 0, opened: 0, accepted: 0, rejected: 0 });
      }

      const week = weeklyMap.get(weekKey)!;
      if (event.event_type === "sent") week.sent += 1;
      if (event.event_type === "opened") week.opened += 1;
      if (event.event_type === "accepted") week.accepted += 1;
      if (event.event_type === "rejected") week.rejected += 1;

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
      if (event.event_type === "sent") perf.sent += 1;
      if (event.event_type === "opened") perf.opened += 1;
      if (event.event_type === "accepted") perf.accepted += 1;
      if (event.event_type === "rejected") perf.rejected += 1;
    }

    const weeklyCohorts = Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week_start, row]) => {
        const openRate = row.sent > 0 ? Math.round((row.opened / row.sent) * 100) : 0;
        const acceptanceRate = row.sent > 0 ? Math.round((row.accepted / row.sent) * 100) : 0;
        return { week_start, ...row, openRate, acceptanceRate };
      });

    const templateIds = Array.from(
      new Set(Array.from(perfMap.values()).map((row) => row.template_id).filter(Boolean)),
    ) as string[];

    let templateMeta = new Map<string, { name: string; variant_key: string | null; experiment_group: string | null }>();
    if (templateIds.length > 0) {
      const { data: templateRows } = await svc
        .from("message_templates")
        .select("id, name, variant_key, experiment_group")
        .in("id", templateIds);

      templateMeta = new Map(
        ((templateRows || []) as TemplateMetaRow[]).map((row) => [
          row.id,
          {
            name: row.name,
            variant_key: row.variant_key || null,
            experiment_group: row.experiment_group || null,
          },
        ]),
      );
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

    const { data: alertEvents } = await svc
      .from("message_conversion_events")
      .select("created_at, event_type")
      .eq("channel", "whatsapp")
      .in("event_type", ["sent", "delivered", "opened", "accepted"])
      .gte("created_at", isoAlerts);

    const baseline = {
      sent: 0,
      delivered: 0,
      opened: 0,
      accepted: 0,
      days: 0,
    };

    const recent = {
      sent: 0,
      delivered: 0,
      opened: 0,
      accepted: 0,
    };

    for (const event of alertEvents || []) {
      const createdAtTs = new Date(event.created_at).getTime();
      if (createdAtTs >= recentStartTs) {
        if (event.event_type === "sent") recent.sent += 1;
        if (event.event_type === "delivered") recent.delivered += 1;
        if (event.event_type === "opened") recent.opened += 1;
        if (event.event_type === "accepted") recent.accepted += 1;
      } else {
        baseline.days = 7;
        if (event.event_type === "sent") baseline.sent += 1;
        if (event.event_type === "delivered") baseline.delivered += 1;
        if (event.event_type === "opened") baseline.opened += 1;
        if (event.event_type === "accepted") baseline.accepted += 1;
      }
    }

    const safeRate = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);
    const baselineDelivery = baseline.days > 0 ? safeRate(baseline.delivered, baseline.sent) : 0;
    const baselineOpen = baseline.days > 0 ? safeRate(baseline.opened, baseline.sent) : 0;
    const baselineAcceptance = baseline.days > 0 ? safeRate(baseline.accepted, baseline.sent) : 0;
    const recentDelivery = safeRate(recent.delivered, recent.sent);
    const recentOpen = safeRate(recent.opened, recent.sent);
    const recentAcceptance = safeRate(recent.accepted, recent.sent);

    const operationalAlerts: OperationalAlert[] = [];
    if (baselineDelivery >= 20 && recent.sent >= 20 && recentDelivery < baselineDelivery - 15) {
      operationalAlerts.push({
        type: "delivery_drop",
        severity: recentDelivery < baselineDelivery - 25 ? "critical" : "warning",
        title: "Queda de entrega no WhatsApp",
        description: "A taxa de entrega do ultimo dia ficou bem abaixo da baseline recente.",
        metricValue: recentDelivery,
        baselineValue: baselineDelivery,
      });
    }
    if (baselineOpen >= 20 && recent.sent >= 20 && recentOpen < baselineOpen - 15) {
      operationalAlerts.push({
        type: "failure_spike",
        severity: recentOpen < baselineOpen - 25 ? "critical" : "warning",
        title: "Queda de abertura",
        description: "As mensagens estao chegando, mas a abertura caiu no ultimo dia.",
        metricValue: recentOpen,
        baselineValue: baselineOpen,
      });
    }
    if (baselineAcceptance >= 8 && recent.sent >= 20 && recentAcceptance < baselineAcceptance - 10) {
      operationalAlerts.push({
        type: "acceptance_drop",
        severity: recentAcceptance < baselineAcceptance - 20 ? "critical" : "warning",
        title: "Queda de aceite",
        description: "A taxa de aceite do ultimo dia recuou em relacao a baseline recente.",
        metricValue: recentAcceptance,
        baselineValue: baselineAcceptance,
      });
    }

    const { data: topUsersRows } = await svc
      .from("presentations")
      .select("user_id, profiles(email, company_name)")
      .order("created_at", { ascending: false })
      .limit(1000);

    const userMap = new Map<string, { count: number; email: string; company: string }>();
    for (const row of topUsersRows || []) {
      const userId = row.user_id;
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const existing = userMap.get(userId) || {
        count: 0,
        email: profile?.email || "",
        company: profile?.company_name || "",
      };
      existing.count += 1;
      userMap.set(userId, existing);
    }

    const topUsers = Array.from(userMap.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const { data: recentPresentations } = await svc
      .from("presentations")
      .select("id, business_name, status, lead_response, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(20);

    return new Response(
      JSON.stringify({
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
        topUsers,
        recentPresentations: recentPresentations || [],
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
