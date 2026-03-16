import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";
import { callLLMJson, resolveUserLLM } from "../_shared/llm.ts";

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
    const { business, analysis, provider } = await req.json();

    if (!business || !analysis) {
      return new Response(JSON.stringify({ error: "Business and initial analysis data are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user, svc } = await getAuthenticatedUserContext(req);
    const llm = await resolveUserLLM(svc, user.id, provider);

    const systemPrompt = `Você é um SDR altamente experiente e um copywriter focado em conversão agressiva e venda de serviços B2B digitais (Tráfego, SEO, Web Design).
Sua missão é olhar a análise técnica de um lead e criar 3 abordagens curtíssimas para Cold WhatsApp. 
A abordagem deve colocar o *dedo na ferida*. Não ofereça serviço direto, exponha a falha e crie curiosidade para reunião.
Use tom coloquial de WhatsApp (não mande 'Prezado(a)', mande 'Oi, tudo bem?').
Ataque falhas como: Notas ruins no mapa, falta de Pixel de Rastreio, site genérico ou lento.

REGRAS:
- PORTUGUES DO BRASIL IMPECAVEL (CRÍTICO) - ZERO ERROS DE GRAMÁTICA OU PLURAIS.
- Maximo de 3-4 frases por mensagem.
- Não invente defeitos que não estão descritos nos dados (SEJA VERÍDICO NAS FALHAS).

Formato de retorno OBRIGATÓRIAMENTE JSON:
{
  "messages": [
    {
      "type": "choque_direto",
      "text": "..."
    },
    {
      "type": "curiosidade_suave",
      "text": "..."
    },
    {
      "type": "humor_alerta",
      "text": "..."
    }
  ]
}`;

    // Extracting main pain points from analysis.
    const pains = [];
    if (analysis.scores?.speed < 60) pains.push(`Site absurdamente lento (nota ${analysis.scores?.speed}/100)`);
    if (!analysis.marketing_signals?.has_facebook_pixel && !analysis.marketing_signals?.has_google_ads) pains.push(`Estão rodando anúncio ou vendendo sem ter NENHUM script de remarketing (Pixel) instalado`);
    if (analysis.seo_details?.issues?.length > 0) pains.push(`Graves problemas de SEO: ${analysis.seo_details.issues.slice(0, 2).join(", ")}`);
    if (analysis.google_presence?.rating < 4.5) pains.push(`Nota no Google baixa ou mediana (${analysis.google_presence?.rating || 'não avaliada'})`);

    const userPrompt = `LEAD: ${business.name}
Nicho: ${business.category || 'Não informado'}

RESUMO DE VULNERABILIDADES:
${pains.length > 0 ? pains.join("\n- ") : "Parecem estar indo bem na superfície, foque em crescimento e escala."}

Crie 3 abordagens de WhatsApp (choque rápido, curiosidade e alerta bem humorado) expondo essas falhas para ${business.name}.
Seja letalmente conciso, instigue a dor da perda financeira ou de pacientes/clientes.`;

    const generated = await callLLMJson<any>(llm, systemPrompt, userPrompt, {
      temperature: 0.7,
      maxOutputTokens: 1000,
    });

    return new Response(JSON.stringify({ success: true, generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generate shock approach error:", error);
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Generation failed" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
