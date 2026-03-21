import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";
import { callLLMJson, resolveUserLLM } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-user-auth, x-client-info, apikey, content-type",
};

const categoryLabels: Record<string, string> = {
  restaurant: "Restaurante",
  clinic: "Clinica",
  store: "Loja",
  gym: "Academia",
  salon: "Salao de Beleza",
  dentist: "Dentista",
  lawyer: "Advogado",
  accounting: "Contabilidade",
  pharmacy: "Farmacia",
  hotel: "Hotel",
  school: "Escola",
  real_estate: "Imobiliaria",
};

function getSystemPrompt(mode: string): string {
  switch (mode) {
    case "competitors":
      return `Voce e um analista de mercado especialista em negocios brasileiros.
Sua tarefa e analisar a concorrencia de uma empresa e sugerir diferenciais competitivos.

FORMATO DE RESPOSTA (JSON):
{
  "competitors": [
    { "name": "Nome do Concorrente", "strength": "Ponto forte", "weakness": "Ponto fraco" }
  ],
  "differentials": ["Diferencial 1", "Diferencial 2", "Diferencial 3"],
  "opportunities": ["Oportunidade 1", "Oportunidade 2"],
  "summary": "Resumo da analise competitiva em 2-3 frases"
}

Gere 3-5 concorrentes plausiveis, 3 diferenciais e 2 oportunidades. Responda apenas com JSON.`;

    case "score":
      return `Voce e um especialista em qualificacao de leads B2B no mercado brasileiro.
Sua tarefa e pontuar um lead de 0 a 100 baseado no potencial de conversao.

CRITERIOS DE AVALIACAO:
- Potencial de mercado do segmento (0-25 pts)
- Localizacao e acessibilidade (0-20 pts)
- Presenca digital (0-20 pts)
- Necessidade provavel de servicos (0-20 pts)
- Avaliacao/reputacao (0-15 pts)

FORMATO DE RESPOSTA (JSON):
{
  "totalScore": 78,
  "breakdown": {
    "marketPotential": { "score": 20, "max": 25, "reason": "Segmento em crescimento" },
    "location": { "score": 15, "max": 20, "reason": "Boa localizacao" },
    "digitalPresence": { "score": 18, "max": 20, "reason": "Website ativo" },
    "serviceNeed": { "score": 15, "max": 20, "reason": "Alta demanda" },
    "reputation": { "score": 10, "max": 15, "reason": "Boa avaliacao" }
  },
  "recommendation": "Recomendacao em 1-2 frases",
  "priority": "alta"
}

priority deve ser: "alta" (>70), "media" (40-70), "baixa" (<40). Responda apenas com JSON.`;

    case "profile":
      return `Voce e um analista de negocios especialista em empresas brasileiras.
Sua tarefa e gerar um resumo executivo rapido e estrategico de uma empresa.

FORMATO DE RESPOSTA (JSON):
{
  "overview": "Descricao geral da empresa em 2-3 frases",
  "targetAudience": "Publico-alvo provavel",
  "estimatedSize": "Porte estimado (micro/pequeno/medio/grande)",
  "strengths": ["Forca 1", "Forca 2"],
  "challenges": ["Desafio 1", "Desafio 2"],
  "bestApproachTime": "Melhor horario/dia para contato",
  "decisionMaker": "Provavel decisor (cargo)",
  "insights": "Insight estrategico adicional em 1-2 frases"
}

Responda apenas com JSON.`;

    default:
      throw new Error(`Modo invalido: ${mode}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business, mode, provider } = await req.json();
    const { user, svc } = await getAuthenticatedUserContext(req);
    const llm = await resolveUserLLM(svc, user.id, provider);

    if (!["competitors", "score", "profile"].includes(mode)) {
      throw new Error("Modo invalido. Use: competitors, score, profile");
    }

    const categoryName = categoryLabels[business.category] || business.category;

    const userPrompt = `Analise esta empresa:

Nome: ${business.name}
Categoria: ${categoryName}
Endereco: ${business.address}
${business.phone ? `Telefone: ${business.phone}` : ""}
${business.website ? `Website: ${business.website}` : ""}
${business.rating ? `Avaliacao: ${business.rating}/5` : ""}
${business.distance ? `Distancia: ${business.distance} km` : ""}
${business.onlinePresence ? `Presenca online: ${business.onlinePresence.label} (${business.onlinePresence.score}/100)` : ""}`;

    const result = await callLLMJson<Record<string, unknown>>(
      llm,
      getSystemPrompt(mode),
      userPrompt,
      { temperature: 0.7, maxOutputTokens: 1000 },
    );

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-business function:", error);
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
