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

async function firecrawlSearch(apiKey: string, query: string, limit: number): Promise<any[]> {
  const response = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit,
      lang: "pt-BR",
      country: "BR",
      scrapeOptions: { formats: ["markdown"] },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    if (response.status === 402) {
      throw { status: 402, message: "Créditos Firecrawl insuficientes." };
    }
    console.error(`Firecrawl search error:`, data);
    return [];
  }
  return data.data || [];
}

async function firecrawlScrape(apiKey: string, url: string): Promise<string> {
  try {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
        onlyMainContent: false,
      }),
    });
    if (!response.ok) return "";
    const data = await response.json();
    return data.data?.markdown || data.markdown || "";
  } catch {
    return "";
  }
}

function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  // Filter out image/file extensions and common non-email patterns
  const excluded = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'css', 'js'];
  return [...new Set(matches.filter(e => {
    const ext = e.split('.').pop()?.toLowerCase();
    return !excluded.includes(ext || '') && !e.includes('example.com') && !e.includes('sentry');
  }))];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { niches, location, radius } = await req.json();
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Step 1: Search via Google Maps first for each niche
    const allSearchResults: { niche: string; nicheKey: string; results: any[] }[] = [];
    const limitPerNiche = Math.min(10, Math.ceil(15 / niches.length));

    const searchPromises = niches.map(async (nicheKey: string) => {
      const nicheLabel = nicheLabels[nicheKey] || nicheKey;

      // Primary: Google Maps search
      const mapsQuery = `site:google.com/maps "${nicheLabel}" "${location}"`;
      console.log(`Google Maps search: "${mapsQuery}"`);

      let results = await firecrawlSearch(FIRECRAWL_API_KEY, mapsQuery, limitPerNiche);

      // Fallback: generic search if Google Maps returned few results
      if (results.length < 3) {
        const genericQuery = `${nicheLabel} em ${location} telefone endereço`;
        console.log(`Fallback search: "${genericQuery}"`);
        const fallbackResults = await firecrawlSearch(FIRECRAWL_API_KEY, genericQuery, limitPerNiche);
        results = [...results, ...fallbackResults];
      }

      console.log(`Total ${results.length} results for "${nicheLabel}"`);
      return { niche: nicheLabel, nicheKey, results };
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

    // Build context for AI
    const searchContext = allSearchResults
      .filter(r => r.results.length > 0)
      .map(({ niche, nicheKey, results }) => {
        const entries = results.map((r: any, i: number) => {
          const parts = [`### Resultado ${i + 1}`];
          if (r.title) parts.push(`Título: ${r.title}`);
          if (r.url) parts.push(`URL: ${r.url}`);
          if (r.description) parts.push(`Descrição: ${r.description}`);
          if (r.markdown) parts.push(`Conteúdo:\n${r.markdown.substring(0, 2000)}`);
          return parts.join('\n');
        }).join('\n\n');
        return `## Categoria: ${niche} (key: ${nicheKey})\n\n${entries}`;
      }).join('\n\n---\n\n');

    if (!searchContext.trim()) {
      return new Response(JSON.stringify({ businesses: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: AI extracts structured data
    const systemPrompt = `Você é um assistente que extrai dados de empresas REAIS a partir de resultados de busca na web (principalmente Google Maps).

REGRAS:
- Extraia APENAS empresas reais com nome identificável. NÃO invente dados.
- Telefones: extraia exatamente como encontrado. Se não houver, deixe vazio.
- Websites: use a URL real da empresa (não URLs do Google, Facebook, diretórios). Se não houver, deixe vazio.
- Endereços: extraia o endereço real completo. Se não houver, use a localização geral.
- Rating: extraia a nota (ex: 4.5) se disponível no Google Maps. Senão null.
- Email: extraia se visível nos resultados. Senão deixe vazio.
- Não repita empresas duplicadas.
- A "distance" deve ser entre 0.5 e ${radius} (estimado).
- O "category" deve ser a key em inglês fornecida.
- Cada empresa deve ter um "id" único (formato uuid-like).

FORMATO JSON ARRAY:
[
  {
    "id": "unique-id-1",
    "name": "Nome Real da Empresa",
    "address": "Endereço completo",
    "phone": "Telefone real ou vazio",
    "email": "email@real.com ou vazio",
    "website": "site-real.com.br ou vazio",
    "category": "category-key",
    "rating": 4.5,
    "distance": 2.3
  }
]

Responda APENAS com o JSON array.`;

    const userPrompt = `Extraia empresas reais dos seguintes resultados de busca (Google Maps e web) para "${location}" (raio ${radius}km):

${searchContext}

Extraia TODAS as empresas reais identificáveis.`;

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
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Erro ao processar resultados com IA");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    let businesses: any[] = [];
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      businesses = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean up websites
    businesses = businesses.map((b: any) => ({
      ...b,
      website: b.website && b.website.trim() && !b.website.includes('google.com') && !b.website.includes('facebook.com/')
        ? b.website.replace(/^https?:\/\//, '')
        : '',
      phone: b.phone || '',
      email: b.email || '',
      address: b.address || location,
    }));

    // Step 3: Extract emails from websites via Firecrawl scrape (max 5 parallel)
    const businessesWithWebsite = businesses.filter(b => b.website && !b.email);
    const toScrape = businessesWithWebsite.slice(0, 5);

    if (toScrape.length > 0) {
      console.log(`Scraping ${toScrape.length} websites for emails...`);
      const scrapePromises = toScrape.map(async (b: any) => {
        const markdown = await firecrawlScrape(FIRECRAWL_API_KEY, b.website);
        if (markdown) {
          const emails = extractEmails(markdown);
          if (emails.length > 0) {
            b.email = emails[0];
            console.log(`Found email for ${b.name}: ${b.email}`);
          }
        }
      });
      await Promise.all(scrapePromises);
    }

    console.log(`Returning ${businesses.length} businesses`);

    return new Response(JSON.stringify({ businesses }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in search-businesses:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
