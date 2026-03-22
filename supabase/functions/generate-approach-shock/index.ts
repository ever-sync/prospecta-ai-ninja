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

    const { user, svc } = await getAuthenticatedUserContext(req, { requireBillingAccess: true });
    const llm = await resolveUserLLM(svc, user.id, provider);

    const systemPrompt = `Você é um SDR e Copywriter de elite, especializado em prospecção via WhatsApp para agências de Marketing Digital e Desenvolvimento.
Sua missão é criar 3 abordagens de venda consultiva que NÃO pareçam spam.

ESTRUTURA DA MENSAGEM:
1. **O Gancho (Elogio Sincero):** Comece notando algo POSITIVO (ex: ótimas avaliações, tempo de casa, unidade bonita). 
2. **A Lacuna (O Dedo na Ferida):** Introduza um problema técnico real que você encontrou (ex: site lento, sem pixel, SEO quebrado, falta de site). Seja específico e use dados.
3. **A Solução/Curiosidade:** Não tente vender o serviço. Tente vender uma conversa de 5 min ou mostre que você tem a solução.
4. **Tom Coloquial:** Use "Oi", "Tudo bem?", evite formalidade exagerada. Use emojis com moderação.

REGRAS:
- PORTUGUES DO BRASIL IMPECÁVEL (CRÍTICO) - ZERO ERROS DE GRAMÁTICA OU PLURAIS.
- Mensagens curtas (3-5 frases).
- Use APENAS as falhas e virtudes presentes nos dados. Não invente.

Formato de retorno JSON:
{
  "messages": [
    {
      "type": "Abordagem_Equilibrada",
      "text": "..."
    },
    {
      "type": "Foco_em_Autoridade",
      "text": "..."
    },
    {
      "type": "Direto_ao_Ponto",
      "text": "..."
    }
  ]
}`;

    // Extracting data for prompt
    const hasWebsite = Boolean(business.website);
    const rating = business.rating;
    
    const strengths = [];
    if (rating >= 4.5) strengths.push(`Excelente reputação no Google (${rating} estrelas).`);
    if (analysis.google_presence?.strengths?.length > 0) strengths.push(...analysis.google_presence.strengths.slice(0, 1));
    if (business.distance <= 1) strengths.push(`Localização estratégica e privilegiada.`);

    const weaknesses = [];
    if (!hasWebsite) weaknesses.push("Não possui site próprio (depende só de terceiros).");
    if (analysis.scores?.speed < 50) weaknesses.push(`Site com carregamento muito lento (${analysis.scores?.speed}/100).`);
    if (!analysis.marketing_signals?.has_facebook_pixel) weaknesses.push("Falta do Pixel do Facebook (perda de rastreio de clientes).");
    if (analysis.seo_details?.issues?.length > 0) weaknesses.push(`Problemas críticos de visibilidade no Google: ${analysis.seo_details.issues[0]}.`);

    const userPrompt = `DADOS DO LEAD:
Empresa: ${business.name}
Nicho: ${business.category || 'Não informado'}
Site: ${business.website || 'Não possui'}
Avaliação Google: ${rating || 'Sem avaliações'}

PONTOS FORTES (Para o Elogio):
- ${strengths.length > 0 ? strengths.join("\n- ") : "Foco em profissionalismo e atendimento."}

FALHAS TÉCNICAS (O Dedo na Ferida):
- ${weaknesses.length > 0 ? weaknesses.join("\n- ") : "Baixa maturidade digital no geral."}

Crie 3 abordagens personalizadas para WhatsApp seguindo a estrutura: Elogio -> Dedo na Ferida -> Convite para conversa.`;

    const generated = await callLLMJson<any>(llm, systemPrompt, userPrompt, {
      temperature: 0.8,
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
