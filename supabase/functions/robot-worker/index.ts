import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { HttpError } from "../_shared/auth.ts";
import { firecrawlSearchRequest, resolveFirecrawlApiKey } from "../_shared/firecrawl.ts";
import { callLLMJson, resolveUserLLM } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-user-auth, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SearchResult = {
  title?: string;
  url?: string;
  description?: string;
  markdown?: string;
};

type RawBusiness = {
  name?: string;
  category?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  rating?: number | null;
  signalFlags?: string[];
  weaknesses?: string[];
};

type RobotTriggers = {
  noPixel?: boolean;
  lowRating?: boolean;
  noWebsite?: boolean;
  lowRatingThreshold?: number;
  limitResults?: number;
};

type ExtractedBusiness = {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  rating: number | null;
  distance: number;
  signalFlags: string[];
  onlinePresence: {
    score: number;
    classification: string;
    weaknesses: string[];
    strengths: string[];
  };
};

function applyTriggerFilters(businesses: ExtractedBusiness[], triggers: RobotTriggers): ExtractedBusiness[] {
  return businesses.filter((b) => {
    if (triggers.noPixel && b.signalFlags.some((f) => f.toLowerCase().includes("pixel"))) return true;
    if (triggers.noWebsite && !b.website) return true;
    if (triggers.lowRating) {
      const threshold = triggers.lowRatingThreshold ?? 4.5;
      if (b.rating !== null && b.rating < threshold) return true;
      if (b.rating === null) return true;
    }
    // If no trigger matched but triggers are all false, include everything
    const anyTriggerActive = triggers.noPixel || triggers.noWebsite || triggers.lowRating;
    return !anyTriggerActive;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    // 1. Fetch one pending task (FIFO)
    const { data: tasks, error: fetchError } = await svc
      .from("robot_tasks")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (fetchError) throw fetchError;

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma tarefa pendente." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const task = tasks[0];
    const userId: string = task.user_id;
    const triggers: RobotTriggers = task.triggers ?? {};
    const limit = Math.min(triggers.limitResults ?? 15, 30);

    // 2. Mark as running
    await svc.from("robot_tasks").update({
      status: "running",
      updated_at: new Date().toISOString(),
    }).eq("id", task.id);

    try {
      // 3. Resolve user's Firecrawl key and LLM
      const firecrawlKey = await resolveFirecrawlApiKey(svc, userId);
      const llm = await resolveUserLLM(svc, userId);

      // 4. Run Firecrawl search
      const query = `${task.search_term} ${task.location} site empresa negocio local`;
      const searchData = await firecrawlSearchRequest<{ data?: SearchResult[] }>(firecrawlKey, {
        query,
        limit,
        lang: "pt-BR",
        country: "BR",
        scrapeOptions: { formats: ["markdown"] },
      });

      const rawResults = searchData.data ?? [];

      if (rawResults.length === 0) {
        await svc.from("robot_tasks").update({
          status: "completed",
          results: [],
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", task.id);

        return new Response(JSON.stringify({ success: true, processed: task.id, resultsCount: 0, message: "Busca sem resultados." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 5. Use LLM to extract structured business data from search results
      const systemPrompt = `Voce e um extrator de dados de empresas. Analise os resultados de busca e extraia informacoes estruturadas de negócios locais.
Retorne SOMENTE JSON valido no formato especificado. Nao inclua texto fora do JSON.`;

      const userPrompt = `Busca realizada: "${task.search_term}" em "${task.location}"

Resultados brutos da busca:
${rawResults.slice(0, 10).map((r: SearchResult, i: number) => `
[${i + 1}] Titulo: ${r.title || "N/A"}
URL: ${r.url || "N/A"}
Descricao: ${r.description || ""}
Conteudo: ${(r.markdown || "").slice(0, 400)}
`).join("\n---\n")}

Para cada empresa encontrada, extraia:
- name: nome da empresa
- category: categoria/nicho
- address: endereco (use "${task.location}" se nao encontrar)
- phone: telefone (vazio se nao encontrar)
- email: email (vazio se nao encontrar)
- website: site (vazio se nao encontrar)
- rating: nota Google (null se nao encontrar)
- signalFlags: array de problemas detectados (ex: ["Sem pixel rastreio", "Nota baixa", "Site lento", "Sem site oficial"])
- weaknesses: array de fraquezas digitais identificadas

Retorne JSON:
{
  "businesses": [
    {
      "name": "...",
      "category": "...",
      "address": "...",
      "phone": "...",
      "email": "...",
      "website": "...",
      "rating": 4.2,
      "signalFlags": [...],
      "weaknesses": [...]
    }
  ]
}

Extraia no maximo ${Math.min(limit, rawResults.length)} empresas. Apenas empresas REAIS encontradas nos resultados.`;

      const extracted = await callLLMJson<{ businesses: RawBusiness[] }>(llm, systemPrompt, userPrompt, {
        temperature: 0.2,
        maxOutputTokens: 3000,
      });

      const rawBusinesses: ExtractedBusiness[] = (extracted?.businesses ?? []).map((b: RawBusiness, idx: number) => ({
        id: `robot_${task.id}_${idx}`,
        name: b.name ?? "Empresa sem nome",
        category: b.category ?? task.search_term,
        address: b.address ?? task.location,
        phone: b.phone ?? "",
        email: b.email ?? "",
        website: b.website ?? "",
        rating: typeof b.rating === "number" ? b.rating : null,
        distance: 0,
        signalFlags: Array.isArray(b.signalFlags) ? b.signalFlags : [],
        onlinePresence: {
          score: b.website ? 35 : 10,
          classification: b.website ? "weak" : "critical",
          weaknesses: Array.isArray(b.weaknesses) ? b.weaknesses : [],
          strengths: [],
        },
      }));

      // 6. Apply trigger filters
      const filtered = applyTriggerFilters(rawBusinesses, triggers);

      // 7. Save results
      await svc.from("robot_tasks").update({
        status: "completed",
        results: filtered,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", task.id);

      return new Response(
        JSON.stringify({ success: true, processed: task.id, resultsCount: filtered.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );

    } catch (processError) {
      await svc.from("robot_tasks").update({
        status: "failed",
        updated_at: new Date().toISOString(),
      }).eq("id", task.id);
      throw processError;
    }

  } catch (error) {
    console.error("Robot worker error:", error);
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
