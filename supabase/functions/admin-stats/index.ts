import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      .gte("created_at", isoThirty);

    const { data: dailyViews } = await supabase
      .from("presentation_views")
      .select("viewed_at")
      .gte("viewed_at", isoThirty);

    const { data: dailyEmails } = await supabase
      .from("campaign_presentations")
      .select("sent_at")
      .eq("send_status", "sent")
      .gte("sent_at", isoThirty);

    // Build daily map
    const dailyMap = new Map<string, { presentations: number; views: number; emails: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
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
