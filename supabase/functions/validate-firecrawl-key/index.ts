import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";

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
    await getAuthenticatedUserContext(req, { requireBillingAccess: true });

    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      throw new HttpError(400, "Chave Firecrawl nao informada.");
    }

    // Test the key with a minimal search request
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "test", limit: 1 }),
    });

    if (response.status === 401) {
      return new Response(
        JSON.stringify({ valid: false, error: "Chave invalida ou sem permissao." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ valid: false, error: "Creditos Firecrawl insuficientes. Verifique seu plano." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!response.ok && response.status !== 429) {
      return new Response(
        JSON.stringify({ valid: false, error: `Erro ao validar chave (status ${response.status}).` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 429 = rate limit, key is valid but quota hit
    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(
      JSON.stringify({ valid: false, error: error instanceof Error ? error.message : "Erro desconhecido." }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
