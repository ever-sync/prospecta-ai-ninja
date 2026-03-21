import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";
import { callLLMText, resolveUserLLM } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-user-auth, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business, provider } = await req.json();
    const { user, svc } = await getAuthenticatedUserContext(req);
    const llm = await resolveUserLLM(svc, user.id, provider);

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

    const categoryName = categoryLabels[business.category] || business.category;

    const systemPrompt = `Você é um SDR experiente em prospecção via WhatsApp.
Sua tarefa é gerar uma abordagem comercial personalizada e humana.

ESTRUTURA:
1. Comece com um ponto positivo (ex: 'vi que vocês têm ótimas avaliações' ou 'vi que vocês são referência em [Nicho]').
2. Introduza uma observação sobre a presença digital (ex: falta de site, ou site que pode melhorar).
3. Faça um convite rápido e informal para uma conversa.

REGRAS:
- Linguagem COLOQUIAL (Oi, Tudo bem?).
- Máximo 3 parágrafos curtíssimos.
- Português do Brasil IMPECÁVEL.
- NÃO pareça um robô de vendas.`;

    const userPrompt = `Gere uma sugestao de abordagem comercial para esta empresa:

Nome: ${business.name}
Categoria: ${categoryName}
Endereco: ${business.address}
${business.rating ? `Avaliacao: ${business.rating}/5` : ""}
${business.onlinePresence ? `Presenca online: ${business.onlinePresence.label} (${business.onlinePresence.score}/100)` : ""}
${business.onlinePresence?.weaknesses?.length ? `Fraquezas percebidas: ${business.onlinePresence.weaknesses.join(", ")}` : ""}

Considere o segmento e crie uma abordagem personalizada destacando como podemos ajudar este negocio.`;

    const suggestion = await callLLMText(
      llm,
      systemPrompt,
      userPrompt,
      { temperature: 0.7, maxOutputTokens: 600 },
    );

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-approach function:", error);
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
