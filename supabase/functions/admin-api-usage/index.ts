import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-user-auth, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Estimated costs per operation (in USD cents)
const COST_MAP: Record<string, number> = {
  'firecrawl:scrape': 10,        // ~$0.10 per scrape
  'firecrawl:search': 10,
  'ai:search': 0.5,              // ~$0.005 per search call (flash)
  'ai:analyze': 1,               // ~$0.01 per analysis
  'ai:deep-analyze': 3,          // ~$0.03 per deep analysis (uses Firecrawl + AI)
  'ai:generate-approach': 1,     
  'ai:generate-presentation': 5, // ~$0.05 per presentation (longer prompt)
  'resend:email': 0.1,           // ~$0.001 per email
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
    const authHeader = req.headers.get("x-user-auth") ?? req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("[AdminApiUsage] User verification failed:", userError);
      return new Response(JSON.stringify({ 
        error: "Unauthorized", 
        details: userError?.message,
        hint: "Token might be invalid or expired"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"]);

    if (!roleData || roleData.length === 0) {
      console.error("[AdminApiUsage] Forbidden: User does not have required role", { userId: user.id });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    let days = 30;
    try {
      const body = await req.json();
      if (body?.days && [7, 30, 90].includes(body.days)) days = body.days;
    } catch { /* default */ }

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    const isoPeriod = periodStart.toISOString();

    // Check if we have real logs
    const { count: logCount } = await supabase
      .from("api_usage_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", isoPeriod);

    let serviceBreakdown: Record<string, { calls: number; costCents: number }>;
    let dailyUsage: Array<{ date: string; firecrawl: number; ai: number; resend: number }>;
    let topConsumers: Array<{ email: string; company: string; calls: number; costCents: number }>;

    if ((logCount || 0) > 0) {
      // Use real logs
      const { data: logs } = await supabase
        .from("api_usage_logs")
        .select("service, operation, cost_estimate_cents, user_id, created_at")
        .gte("created_at", isoPeriod);

      // Service breakdown
      serviceBreakdown = {};
      const dailyMap = new Map<string, { firecrawl: number; ai: number; resend: number }>();
      const userUsage = new Map<string, { calls: number; costCents: number }>();

      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        dailyMap.set(d.toISOString().split("T")[0], { firecrawl: 0, ai: 0, resend: 0 });
      }

      for (const log of logs || []) {
        const svc = log.service;
        if (!serviceBreakdown[svc]) serviceBreakdown[svc] = { calls: 0, costCents: 0 };
        serviceBreakdown[svc].calls++;
        serviceBreakdown[svc].costCents += Number(log.cost_estimate_cents || 0);

        const dateKey = log.created_at?.split("T")[0];
        if (dateKey && dailyMap.has(dateKey)) {
          const entry = dailyMap.get(dateKey)!;
          if (svc === 'firecrawl') entry.firecrawl++;
          else if (svc === 'ai') entry.ai++;
          else if (svc === 'resend') entry.resend++;
        }

        const uid = log.user_id;
        const existing = userUsage.get(uid);
        if (existing) {
          existing.calls++;
          existing.costCents += Number(log.cost_estimate_cents || 0);
        } else {
          userUsage.set(uid, { calls: 1, costCents: Number(log.cost_estimate_cents || 0) });
        }
      }

      dailyUsage = Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data }));

      // Get user info for top consumers
      const topUserIds = Array.from(userUsage.entries())
        .sort((a, b) => b[1].costCents - a[1].costCents)
        .slice(0, 10);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, company_name")
        .in("user_id", topUserIds.map(u => u[0]));

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      topConsumers = topUserIds.map(([uid, data]) => ({
        email: profileMap.get(uid)?.email || 'N/A',
        company: profileMap.get(uid)?.company_name || 'N/A',
        ...data,
      }));
    } else {
      // Estimate from existing data
      const { count: presentations } = await supabase
        .from("presentations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", isoPeriod);

      const { count: emailsSent } = await supabase
        .from("campaign_presentations")
        .select("id", { count: "exact", head: true })
        .eq("send_status", "sent")
        .gte("sent_at", isoPeriod);

      const pres = presentations || 0;
      const emails = emailsSent || 0;

      // Each presentation = 1 search + 1 scrape + 1 analyze + 1 deep-analyze + 1 approach + 1 generate
      const firecrawlCalls = pres * 2; // scrape + deep-analyze scrape
      const aiCalls = pres * 4; // search + analyze + approach + generate
      const resendCalls = emails;

      serviceBreakdown = {
        firecrawl: { calls: firecrawlCalls, costCents: firecrawlCalls * COST_MAP['firecrawl:scrape'] },
        ai: { calls: aiCalls, costCents: pres * (COST_MAP['ai:search'] + COST_MAP['ai:analyze'] + COST_MAP['ai:generate-approach'] + COST_MAP['ai:generate-presentation']) },
        resend: { calls: resendCalls, costCents: resendCalls * COST_MAP['resend:email'] },
      };

      // Estimated daily usage from presentations
      const { data: dailyPres } = await supabase
        .from("presentations")
        .select("created_at")
        .gte("created_at", isoPeriod);

      const { data: dailyEmails } = await supabase
        .from("campaign_presentations")
        .select("sent_at")
        .eq("send_status", "sent")
        .gte("sent_at", isoPeriod);

      const dailyMap = new Map<string, { firecrawl: number; ai: number; resend: number }>();
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        dailyMap.set(d.toISOString().split("T")[0], { firecrawl: 0, ai: 0, resend: 0 });
      }

      for (const p of dailyPres || []) {
        const key = p.created_at?.split("T")[0];
        if (key && dailyMap.has(key)) {
          dailyMap.get(key)!.firecrawl += 2;
          dailyMap.get(key)!.ai += 4;
        }
      }
      for (const e of dailyEmails || []) {
        const key = e.sent_at?.split("T")[0];
        if (key && dailyMap.has(key)) dailyMap.get(key)!.resend++;
      }

      dailyUsage = Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data }));
      topConsumers = [];
    }

    const totalCostCents = Object.values(serviceBreakdown).reduce((sum, s) => sum + s.costCents, 0);
    const totalCalls = Object.values(serviceBreakdown).reduce((sum, s) => sum + s.calls, 0);

    return new Response(JSON.stringify({
      isEstimated: (logCount || 0) === 0,
      period: days,
      summary: { totalCalls, totalCostCents, totalCostUSD: (totalCostCents / 100).toFixed(2) },
      serviceBreakdown,
      dailyUsage,
      topConsumers,
      costMap: COST_MAP,
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
