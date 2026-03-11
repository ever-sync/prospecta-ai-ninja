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
    const { niches, location, radius } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const nicheLabels: Record<string, string> = {
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

    const nicheNames = niches.map((n: string) => nicheLabels[n] || n).join(', ');

    const systemPrompt = `Você é um assistente especializado em gerar dados de empresas brasileiras realistas para prospecção comercial.

REGRAS IMPORTANTES:
- Gere empresas REALISTAS que poderiam existir na região especificada
- Use nomes de empresas típicos brasileiros para cada categoria
- Endereços devem ser plausíveis para a região (use ruas, avenidas e bairros comuns)
- Telefones no formato brasileiro: (XX) XXXXX-XXXX
- Sites devem ser domínios .com.br plausíveis
- Distância deve variar de 0.1 até o raio máximo especificado
- Avaliações entre 3.0 e 5.0
- Gere entre 8 e 15 empresas variadas

FORMATO DE RESPOSTA (JSON ARRAY):
[
  {
    "id": "uuid-único",
    "name": "Nome da Empresa",
    "address": "Endereço completo",
    "phone": "(XX) XXXXX-XXXX",
    "website": "www.exemplo.com.br",
    "category": "categoria-em-ingles",
    "rating": 4.5,
    "distance": 2.3
  }
]

Responda APENAS com o JSON array, sem texto adicional.`;

    const userPrompt = `Gere uma lista de empresas para prospecção com os seguintes critérios:

Categorias: ${nicheNames}
Localização base: ${location}
Raio máximo: ${radius} km

Gere empresas realistas dessas categorias que poderiam existir nessa região do Brasil.`;

    console.log("Searching businesses with AI for:", { niches, location, radius });

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
        temperature: 0.8,
        max_tokens: 2000,
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
      
      return new Response(JSON.stringify({ error: "Erro ao buscar empresas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    console.log("AI response content:", content);

    // Parse the JSON from the AI response
    let businesses = [];
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      businesses = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ businesses }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in search-businesses function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
