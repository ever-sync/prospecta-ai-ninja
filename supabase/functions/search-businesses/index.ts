import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const nicheLabels: Record<string, string> = {
  restaurant: 'Restaurantes',
  clinic: 'Clínicas',
  store: 'Lojas',
  gym: 'Academias',
  salon: 'Salões de Beleza',
  dentist: 'Dentistas',
  lawyer: 'Advogados',
  accounting: 'Contabilidade',
  pharmacy: 'Farmácias',
  hotel: 'Hotéis',
  school: 'Escolas',
  real_estate: 'Imobiliárias',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { niches, location, radius } = await req.json();
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Step 1: Search real businesses using Firecrawl for each niche
    const allSearchResults: { niche: string; nicheKey: string; results: any[] }[] = [];

    const limitPerNiche = Math.min(10, Math.ceil(15 / niches.length));

    const searchPromises = niches.map(async (nicheKey: string) => {
      const nicheLabel = nicheLabels[nicheKey] || nicheKey;
      const query = `${nicheLabel} em ${location}`;

      console.log(`Searching Firecrawl: "${query}" (limit: ${limitPerNiche})`);

      try {
        const response = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: limitPerNiche,
            lang: "pt-BR",
            country: "BR",
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(`Firecrawl error for "${nicheLabel}":`, data);
          if (response.status === 402) {
            throw { status: 402, message: "Créditos Firecrawl insuficientes." };
          }
          return { niche: nicheLabel, nicheKey, results: [] };
        }

        const results = data.data || [];
        console.log(`Firecrawl returned ${results.length} results for "${nicheLabel}"`);
        return { niche: nicheLabel, nicheKey, results };
      } catch (err: any) {
        if (err.status === 402) throw err;
        console.error(`Firecrawl fetch error for "${nicheLabel}":`, err);
        return { niche: nicheLabel, nicheKey, results: [] };
      }
    });

    try {
      const results = await Promise.all(searchPromises);
      allSearchResults.push(...results);
    } catch (err: any) {
      if (err.status === 402) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    // Check if we got any results
    const totalResults = allSearchResults.reduce((sum, r) => sum + r.results.length, 0);

    if (totalResults === 0) {
      // Fallback: try Google Maps search
      console.log("No Firecrawl results, trying Google Maps fallback...");
      const nicheNames = niches.map((n: string) => nicheLabels[n] || n).join(', ');
      const fallbackQuery = `site:google.com/maps "${nicheNames}" "${location}"`;

      try {
        const response = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: fallbackQuery,
            limit: 15,
            lang: "pt-BR",
            country: "BR",
          }),
        });

        const data = await response.json();
        if (response.ok && data.data?.length > 0) {
          allSearchResults.push({ niche: nicheNames, nicheKey: niches[0], results: data.data });
        }
      } catch (err) {
        console.error("Google Maps fallback error:", err);
      }
    }

    // Step 2: Build context for AI structuring
    const searchContext = allSearchResults
      .filter(r => r.results.length > 0)
      .map(({ niche, nicheKey, results }) => {
        const entries = results.map((r: any, i: number) => {
          const parts = [`### Resultado ${i + 1}`];
          if (r.title) parts.push(`Título: ${r.title}`);
          if (r.url) parts.push(`URL: ${r.url}`);
          if (r.description) parts.push(`Descrição: ${r.description}`);
          if (r.markdown) parts.push(`Conteúdo:\n${r.markdown.substring(0, 1500)}`);
          return parts.join('\n');
        }).join('\n\n');

        return `## Categoria: ${niche} (key: ${nicheKey})\n\n${entries}`;
      }).join('\n\n---\n\n');

    if (!searchContext.trim()) {
      return new Response(JSON.stringify({ businesses: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Use AI to extract structured business data
    const systemPrompt = `Você é um assistente que extrai dados de empresas a partir de resultados de busca na web.

REGRAS:
- Extraia APENAS empresas reais encontradas nos resultados. NÃO invente dados.
- Se um dado não estiver disponível nos resultados, deixe como string vazia ou null.
- Telefones: extraia exatamente como encontrado. Se não houver, deixe vazio.
- Websites: use a URL real da empresa (não URLs de diretórios/listas). Se não houver site próprio, deixe vazio.
- Endereços: extraia o endereço real. Se não houver, use a localização geral.
- Rating: extraia se disponível, senão null.
- Não repita empresas duplicadas.
- A "distance" deve ser um número estimado entre 0.5 e ${radius} baseado no endereço.
- O "category" deve ser a key em inglês fornecida (ex: "restaurant", "clinic").
- Cada empresa deve ter um "id" único (use formato uuid-like).

FORMATO DE RESPOSTA (JSON ARRAY):
[
  {
    "id": "unique-id-1",
    "name": "Nome Real da Empresa",
    "address": "Endereço real ou vazio",
    "phone": "Telefone real ou vazio",
    "website": "site-real.com.br ou vazio",
    "category": "category-key",
    "rating": 4.5,
    "distance": 2.3
  }
]

Responda APENAS com o JSON array.`;

    const userPrompt = `Extraia empresas reais dos seguintes resultados de busca para a região de "${location}" (raio de ${radius}km):

${searchContext}

Extraia todas as empresas reais que conseguir identificar nos resultados acima.`;

    console.log("Sending to AI for structuring...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos à sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error("Erro ao processar resultados com IA");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    let businesses = [];
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      businesses = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, "Content:", content);
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean up: remove invalid websites
    businesses = businesses.map((b: any) => ({
      ...b,
      website: b.website && b.website.trim() && !b.website.includes('google.com') && !b.website.includes('facebook.com/') ? b.website.replace(/^https?:\/\//, '') : '',
      phone: b.phone || '',
      address: b.address || location,
    }));

    console.log(`Returning ${businesses.length} real businesses`);

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
