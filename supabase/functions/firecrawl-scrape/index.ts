import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";
import { firecrawlScrapeRequest, resolveFirecrawlApiKey } from "../_shared/firecrawl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-user-auth, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, options } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user, svc } = await getAuthenticatedUserContext(req, { requireBillingAccess: true });
    const apiKey = await resolveFirecrawlApiKey(svc, user.id);

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const data = await firecrawlScrapeRequest<any>(apiKey, {
        url: formattedUrl,
        formats: options?.formats || ["markdown", "html"],
        onlyMainContent: options?.onlyMainContent ?? false,
        waitFor: options?.waitFor,
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error scraping:", error);
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Failed to scrape" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
