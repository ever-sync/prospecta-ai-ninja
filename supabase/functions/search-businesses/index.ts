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
  const excluded = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'css', 'js'];
  return [...new Set(matches.filter(e => {
    const ext = e.split('.').pop()?.toLowerCase();
    return !excluded.includes(ext || '') && !e.includes('example.com') && !e.includes('sentry');
  }))];
}

function extractPhones(text: string): string[] {
  // Brazilian phone formats: (XX) XXXXX-XXXX, (XX) XXXX-XXXX, XX XXXXX-XXXX, etc.
  const phoneRegex = /\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}/g;
  const matches = text.match(phoneRegex) || [];
  return [...new Set(matches.map(p => p.trim()))];
}

function deduplicateResults(results: any[]): any[] {
  const seen = new Set<string>();
  return results.filter(r => {
    const key = (r.url || r.title || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

    // Step 1: Multi-strategy search for each niche
    const allSearchResults: { niche: string; nicheKey: string; results: any[] }[] = [];
    const limitPerNiche = Math.min(10, Math.ceil(15 / niches.length));

    const searchPromises = niches.map(async (nicheKey: string) => {
      const nicheLabel = nicheLabels[nicheKey] || nicheKey;

      // Strategy 1: Google Maps search
      const mapsQuery = `site:google.com/maps "${nicheLabel}" "${location}"`;
      console.log(`[Strategy 1] Google Maps: "${mapsQuery}"`);

      // Strategy 2: Local search with contact signals
      const localQuery = `${nicheLabel} em ${location} avaliações telefone endereço`;
      console.log(`[Strategy 2] Local: "${localQuery}"`);

      // Run both strategies in parallel
      const [mapsResults, localResults] = await Promise.all([
        firecrawlSearch(FIRECRAWL_API_KEY, mapsQuery, limitPerNiche),
        firecrawlSearch(FIRECRAWL_API_KEY, localQuery, Math.ceil(limitPerNiche / 2)),
      ]);

      // Merge and deduplicate
      let combined = deduplicateResults([...mapsResults, ...localResults]);

      // Strategy 3: Fallback if still few results
      if (combined.length < 3) {
        const fallbackQuery = `"${nicheLabel}" perto de "${location}" site contato`;
        console.log(`[Strategy 3] Fallback: "${fallbackQuery}"`);
        const fallbackResults = await firecrawlSearch(FIRECRAWL_API_KEY, fallbackQuery, limitPerNiche);
        combined = deduplicateResults([...combined, ...fallbackResults]);
      }

      console.log(`Total ${combined.length} results for "${nicheLabel}"`);
      return { niche: nicheLabel, nicheKey, results: combined };
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

    // Build context for AI (increased to 3000 chars for richer data)
    const searchContext = allSearchResults
      .filter(r => r.results.length > 0)
      .map(({ niche, nicheKey, results }) => {
        const entries = results.map((r: any, i: number) => {
          const parts = [`### Resultado ${i + 1}`];
          if (r.title) parts.push(`Título: ${r.title}`);
          if (r.url) parts.push(`URL: ${r.url}`);
          if (r.description) parts.push(`Descrição: ${r.description}`);
          if (r.markdown) parts.push(`Conteúdo:\n${r.markdown.substring(0, 3000)}`);
          return parts.join('\n');
        }).join('\n\n');
        return `## Categoria: ${niche} (key: ${nicheKey})\n\n${entries}`;
      }).join('\n\n---\n\n');

    if (!searchContext.trim()) {
      return new Response(JSON.stringify({ businesses: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: AI extracts structured data with improved prompt
    const systemPrompt = `Você é um assistente especialista em extrair dados de empresas REAIS a partir de resultados de busca na web (Google Maps, diretórios e sites).

REGRAS CRÍTICAS:
- Extraia APENAS empresas reais com nome identificável. NÃO invente dados.
- PRIORIZE dados do Google Maps quando disponíveis (ratings, endereços, telefones são mais confiáveis).
- Telefones: extraia no formato brasileiro completo com DDD: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX. Se não houver telefone, deixe string vazia "".
- Websites: use a URL real da empresa (NÃO URLs do Google, Facebook, Instagram, diretórios como Apontador, TripAdvisor). Se não houver site próprio, deixe string vazia "".
- Endereços: extraia o endereço real completo incluindo bairro, cidade e estado. Se não houver, use "${location}" como fallback.
- Rating: extraia a nota (ex: 4.5) se disponível. Se não houver, use null.
- Email: extraia se visível nos resultados de busca. Se não houver, deixe string vazia "".
- NÃO repita empresas duplicadas (mesmo nome = mesma empresa).
- A "distance" deve ser um número entre 0.5 e ${radius} (estimado baseado no endereço).
- O "category" deve ser a key em inglês fornecida nos resultados.
- Cada empresa deve ter um "id" único (formato: niche-N, ex: restaurant-1, clinic-2).

FORMATO JSON ARRAY:
[
  {
    "id": "category-1",
    "name": "Nome Real da Empresa",
    "address": "Rua Exemplo, 123 - Bairro, Cidade - UF",
    "phone": "(11) 99999-9999",
    "email": "contato@empresa.com.br",
    "website": "www.empresa.com.br",
    "category": "category-key",
    "rating": 4.5,
    "distance": 2.3
  }
]

Responda APENAS com o JSON array, sem explicações.`;

    const userPrompt = `Extraia TODAS as empresas reais dos seguintes resultados de busca para "${location}" (raio ${radius}km).
Priorize dados do Google Maps quando disponíveis.

${searchContext}`;

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
      website: b.website && b.website.trim() && !b.website.includes('google.com') && !b.website.includes('facebook.com/') && !b.website.includes('instagram.com/')
        ? b.website.replace(/^https?:\/\//, '')
        : '',
      phone: b.phone || '',
      email: b.email || '',
      address: b.address || location,
    }));

    // Step 3: Scrape websites for missing emails AND phones (max 5 parallel)
    const businessesNeedingScrape = businesses.filter(b => b.website && (!b.email || !b.phone));
    const toScrape = businessesNeedingScrape.slice(0, 5);

    if (toScrape.length > 0) {
      console.log(`Scraping ${toScrape.length} websites for emails/phones...`);
      const scrapePromises = toScrape.map(async (b: any) => {
        const markdown = await firecrawlScrape(FIRECRAWL_API_KEY, b.website);
        if (markdown) {
          // Extract email if missing
          if (!b.email) {
            const emails = extractEmails(markdown);
            if (emails.length > 0) {
              b.email = emails[0];
              console.log(`Found email for ${b.name}: ${b.email}`);
            }
          }
          // Extract phone if missing
          if (!b.phone) {
            const phones = extractPhones(markdown);
            if (phones.length > 0) {
              b.phone = phones[0];
              console.log(`Found phone for ${b.name}: ${b.phone}`);
            }
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
