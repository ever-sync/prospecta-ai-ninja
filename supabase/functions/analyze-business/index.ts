import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const categoryLabels: Record<string, string> = {
  restaurant: 'Restaurante',
  clinic: 'Clínica',
  store: 'Loja',
  gym: 'Academia',
  salon: 'Salão de Beleza',
  dentist: 'Dentista',
  lawyer: 'Advogado',
  accounting: 'Contabilidade',
  pharmacy: 'Farmácia',
  hotel: 'Hotel',
  school: 'Escola',
  real_estate: 'Imobiliária',
};

function getSystemPrompt(mode: string): string {
  switch (mode) {
    case 'competitors':
      return `Você é um analista de mercado especialista em negócios brasileiros.
Sua tarefa é analisar a concorrência de uma empresa e sugerir diferenciais competitivos.

FORMATO DE RESPOSTA (JSON):
{
  "competitors": [
    { "name": "Nome do Concorrente", "strength": "Ponto forte", "weakness": "Ponto fraco" }
  ],
  "differentials": ["Diferencial 1", "Diferencial 2", "Diferencial 3"],
  "opportunities": ["Oportunidade 1", "Oportunidade 2"],
  "summary": "Resumo da análise competitiva em 2-3 frases"
}

Gere 3-5 concorrentes plausíveis, 3 diferenciais e 2 oportunidades. Responda APENAS com JSON.`;

    case 'score':
      return `Você é um especialista em qualificação de leads B2B no mercado brasileiro.
Sua tarefa é pontuar um lead de 0 a 100 baseado no potencial de conversão.

CRITÉRIOS DE AVALIAÇÃO:
- Potencial de mercado do segmento (0-25 pts)
- Localização e acessibilidade (0-20 pts)
- Presença digital (0-20 pts)
- Necessidade provável de serviços (0-20 pts)
- Avaliação/reputação (0-15 pts)

FORMATO DE RESPOSTA (JSON):
{
  "totalScore": 78,
  "breakdown": {
    "marketPotential": { "score": 20, "max": 25, "reason": "Segmento em crescimento" },
    "location": { "score": 15, "max": 20, "reason": "Boa localização" },
    "digitalPresence": { "score": 18, "max": 20, "reason": "Website ativo" },
    "serviceNeed": { "score": 15, "max": 20, "reason": "Alta demanda" },
    "reputation": { "score": 10, "max": 15, "reason": "Boa avaliação" }
  },
  "recommendation": "Recomendação em 1-2 frases",
  "priority": "alta"
}

priority deve ser: "alta" (>70), "média" (40-70), "baixa" (<40). Responda APENAS com JSON.`;

    case 'profile':
      return `Você é um analista de negócios especialista em empresas brasileiras.
Sua tarefa é gerar um resumo executivo rápido e estratégico de uma empresa.

FORMATO DE RESPOSTA (JSON):
{
  "overview": "Descrição geral da empresa em 2-3 frases",
  "targetAudience": "Público-alvo provável",
  "estimatedSize": "Porte estimado (micro/pequeno/médio/grande)",
  "strengths": ["Força 1", "Força 2"],
  "challenges": ["Desafio 1", "Desafio 2"],
  "bestApproachTime": "Melhor horário/dia para contato",
  "decisionMaker": "Provável decisor (cargo)",
  "insights": "Insight estratégico adicional em 1-2 frases"
}

Responda APENAS com JSON.`;

    default:
      throw new Error(`Modo inválido: ${mode}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!['competitors', 'score', 'profile'].includes(mode)) {
      throw new Error("Modo inválido. Use: competitors, score, profile");
    }

    const categoryName = categoryLabels[business.category] || business.category;

    const userPrompt = `Analise esta empresa:

Nome: ${business.name}
Categoria: ${categoryName}
Endereço: ${business.address}
${business.phone ? `Telefone: ${business.phone}` : ''}
${business.website ? `Website: ${business.website}` : ''}
${business.rating ? `Avaliação: ${business.rating}/5` : ''}
${business.distance ? `Distância: ${business.distance} km` : ''}`;

    console.log(`Analyzing business [${mode}]:`, business.name);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: getSystemPrompt(mode) },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos à sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao analisar empresa" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    let result;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-business function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
