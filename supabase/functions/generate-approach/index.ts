import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    const categoryName = categoryLabels[business.category] || business.category;

    const systemPrompt = `Você é um especialista em vendas B2B e prospecção comercial no Brasil. 
Sua tarefa é gerar uma sugestão de abordagem comercial personalizada e eficaz para uma empresa específica.

Regras:
- Seja direto e objetivo
- Use linguagem profissional mas acessível
- Foque em valor e benefícios
- Sugira um gancho inicial relevante para o segmento
- Mantenha a sugestão em até 3 parágrafos curtos
- Inclua uma sugestão de primeira mensagem/script`;

    const userPrompt = `Gere uma sugestão de abordagem comercial para esta empresa:

Nome: ${business.name}
Categoria: ${categoryName}
Endereço: ${business.address}
${business.rating ? `Avaliação: ${business.rating}/5` : ''}

Considere o segmento de atuação e crie uma abordagem personalizada que destaque como podemos ajudar este tipo de negócio.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
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
      
      return new Response(JSON.stringify({ error: "Erro ao gerar sugestão" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content || "Não foi possível gerar uma sugestão.";

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-approach function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
