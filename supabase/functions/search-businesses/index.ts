import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";
import { callGeminiJson } from "../_shared/gemini.ts";
import { requireUserProviderKey } from "../_shared/user-provider-keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-user-auth, x-client-info, apikey, content-type",
};

const nicheLabels: Record<string, string> = {
  restaurant: "Restaurantes",
  clinic: "Clinicas",
  store: "Lojas",
  gym: "Academias",
  salon: "Saloes de Beleza",
  dentist: "Dentistas",
  lawyer: "Advogados",
  accounting: "Contabilidade",
  pharmacy: "Farmacias",
  hotel: "Hoteis",
  school: "Escolas",
  real_estate: "Imobiliarias",
};

type ScrapePayload = {
  markdown: string;
  html: string;
  metadata: Record<string, any>;
  links: string[];
};

async function firecrawlSearch(apiKey: string, query: string, limit: number): Promise<any[]> {
  const response = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
      throw new HttpError(402, "Creditos Firecrawl insuficientes.");
    }
    console.error("Firecrawl search error:", data);
    return [];
  }
  return data.data || [];
}

function normalizeWebsite(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

async function firecrawlScrape(apiKey: string, url: string): Promise<ScrapePayload | null> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: normalizeWebsite(url),
        formats: ["markdown", "html", "links"],
        onlyMainContent: false,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      markdown: data.data?.markdown || data.markdown || "",
      html: data.data?.html || data.html || "",
      metadata: data.data?.metadata || data.metadata || {},
      links: data.data?.links || data.links || [],
    };
  } catch {
    return null;
  }
}

function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  const excluded = ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "css", "js"];
  return [
    ...new Set(
      matches.filter((email) => {
        const ext = email.split(".").pop()?.toLowerCase();
        return !excluded.includes(ext || "") && !email.includes("example.com") && !email.includes("sentry");
      }),
    ),
  ];
}

function extractPhones(text: string): string[] {
  const phoneRegex = /\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}/g;
  const matches = text.match(phoneRegex) || [];
  return [...new Set(matches.map((phone) => phone.trim()))];
}

function extractSocialLinks(text: string): Record<string, string> {
  const patterns = {
    instagram: /(https?:\/\/(?:www\.)?instagram\.com\/[^\s"')]+)/i,
    facebook: /(https?:\/\/(?:www\.)?facebook\.com\/[^\s"')]+)/i,
    linkedin: /(https?:\/\/(?:[\w]+\.)?linkedin\.com\/[^\s"')]+)/i,
    whatsapp: /(https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[^\s"')]+)/i,
    youtube: /(https?:\/\/(?:www\.)?youtube\.com\/[^\s"')]+)/i,
  };

  return Object.fromEntries(
    Object.entries(patterns)
      .map(([key, regex]) => [key, text.match(regex)?.[1] || ""])
      .filter(([, value]) => Boolean(value)),
  );
}

function detectContactForm(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("<form") ||
    normalized.includes("fale conosco") ||
    normalized.includes("solicite um orcamento")
  );
}

function deduplicateResults(results: any[]): any[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = (result.url || result.title || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildOnlinePresenceSnapshot(
  website: string,
  scrape: ScrapePayload | null,
  fallbackEmail: string,
  fallbackPhone: string,
) {
  if (!website) {
    return {
      score: 8,
      classification: "critical",
      label: "Presenca critica",
      summary: "Nao possui site proprio. A empresa depende quase toda de reputacao local e canais de terceiros.",
      strengths: fallbackPhone || fallbackEmail ? ["Existe um canal de contato direto."] : [],
      weaknesses: [
        "Nao possui site proprio",
        "Baixa autoridade fora do Google",
        "Narrativa comercial pouco controlada",
      ],
      emailsFound: fallbackEmail ? [fallbackEmail] : [],
      phonesFound: fallbackPhone ? [fallbackPhone] : [],
      socialLinks: {},
      hasContactForm: false,
      hasTitle: false,
      hasMetaDescription: false,
      hasHttps: false,
      contentDepth: "low",
    };
  }

  if (!scrape) {
    return {
      score: fallbackEmail && fallbackPhone ? 48 : 38,
      classification: fallbackEmail || fallbackPhone ? "average" : "weak",
      label: fallbackEmail || fallbackPhone ? "Presenca mediana" : "Presenca fraca",
      summary: "Site encontrado, mas a leitura do conteudo ainda esta incompleta.",
      strengths: ["Site proprio detectado."],
      weaknesses: ["Auditoria detalhada do site pendente"],
      emailsFound: fallbackEmail ? [fallbackEmail] : [],
      phonesFound: fallbackPhone ? [fallbackPhone] : [],
      socialLinks: {},
      hasContactForm: false,
      hasTitle: false,
      hasMetaDescription: false,
      hasHttps: website.startsWith("https://"),
      contentDepth: "low",
    };
  }

  const textBlob = `${scrape.markdown}\n${scrape.html}\n${scrape.links.join("\n")}`;
  const emailsFound = extractEmails(textBlob);
  const phonesFound = extractPhones(textBlob);
  const socialLinks = extractSocialLinks(textBlob);
  const hasTitle = Boolean(scrape.metadata?.title);
  const hasMetaDescription = Boolean(scrape.metadata?.description);
  const hasHttps = normalizeWebsite(website).startsWith("https://");
  const hasContactForm = detectContactForm(textBlob);
  const contentLength = scrape.markdown.length;
  const contentDepth = contentLength > 2500 ? "high" : contentLength > 900 ? "medium" : "low";

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  let score = 18;

  if (hasTitle) {
    score += 12;
    strengths.push("Titulo principal detectado");
  } else {
    weaknesses.push("Sem titulo SEO claro");
  }

  if (hasMetaDescription) {
    score += 10;
    strengths.push("Meta description presente");
  } else {
    weaknesses.push("Sem meta description visivel");
  }

  if (hasHttps) {
    score += 8;
    strengths.push("Site com HTTPS");
  } else {
    weaknesses.push("HTTPS ausente ou incerto");
  }

  if (emailsFound.length > 0 || fallbackEmail) {
    score += 10;
    strengths.push("Email de contato encontrado");
  } else {
    weaknesses.push("Email dificil de encontrar");
  }

  if (phonesFound.length > 0 || fallbackPhone) {
    score += 10;
    strengths.push("Telefone visivel");
  } else {
    weaknesses.push("Telefone pouco visivel");
  }

  if (hasContactForm) {
    score += 8;
    strengths.push("Fluxo de contato ou orcamento encontrado");
  } else {
    weaknesses.push("Sem fluxo claro de conversao");
  }

  if (Object.keys(socialLinks).length >= 2) {
    score += 10;
    strengths.push("Presenca social conectada");
  } else if (Object.keys(socialLinks).length === 1) {
    score += 5;
    strengths.push("Tem ao menos uma rede social conectada");
  } else {
    weaknesses.push("Pouca prova de onipresenca digital");
  }

  if (contentDepth === "high") {
    score += 16;
    strengths.push("Site com conteudo robusto");
  } else if (contentDepth === "medium") {
    score += 10;
    strengths.push("Site com conteudo suficiente para leitura consultiva");
  } else {
    weaknesses.push("Site raso ou pouco explicativo");
  }

  score = Math.max(0, Math.min(score, 100));

  const classification =
    score <= 25 ? "critical" : score <= 45 ? "weak" : score <= 70 ? "average" : "strong";
  const label =
    classification === "critical"
      ? "Presenca critica"
      : classification === "weak"
        ? "Presenca fraca"
        : classification === "average"
          ? "Presenca mediana"
          : "Presenca consistente";

  return {
    score,
    classification,
    label,
    summary:
      classification === "critical"
        ? "A empresa tem uma presenca online muito fragil e facil de atacar com auditoria consultiva."
        : classification === "weak"
          ? "A base existe, mas a experiencia digital ainda transmite pouca autoridade."
          : classification === "average"
            ? "Existe estrutura digital minima, com espaco claro para melhorar conversao e clareza."
            : "A empresa parece mais bem estruturada online e exige abordagem mais estrategica.",
    strengths,
    weaknesses,
    emailsFound: [...new Set([fallbackEmail, ...emailsFound].filter(Boolean))],
    phonesFound: [...new Set([fallbackPhone, ...phonesFound].filter(Boolean))],
    socialLinks,
    hasContactForm,
    hasTitle,
    hasMetaDescription,
    hasHttps,
    contentDepth,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { niches, location, radius } = await req.json();
    const { user, svc } = await getAuthenticatedUserContext(req);
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    const geminiApiKey = await requireUserProviderKey(
      svc,
      user.id,
      "gemini",
      "Configure sua chave Gemini em Configuracoes > APIs.",
    );

    if (!firecrawlApiKey) {
      throw new HttpError(500, "FIRECRAWL_API_KEY nao configurada no projeto.");
    }

    const allSearchResults: { niche: string; nicheKey: string; results: any[] }[] = [];
    const limitPerNiche = Math.min(10, Math.ceil(15 / niches.length));

    const searchPromises = niches.map(async (nicheKey: string) => {
      const nicheLabel = nicheLabels[nicheKey] || nicheKey;
      const mapsQuery = `site:google.com/maps "${nicheLabel}" "${location}"`;
      const localQuery = `${nicheLabel} em ${location} avaliacoes telefone endereco`;

      const [mapsResults, localResults] = await Promise.all([
        firecrawlSearch(firecrawlApiKey, mapsQuery, limitPerNiche),
        firecrawlSearch(firecrawlApiKey, localQuery, Math.ceil(limitPerNiche / 2)),
      ]);

      let combined = deduplicateResults([...mapsResults, ...localResults]);

      if (combined.length < 3) {
        const fallbackQuery = `"${nicheLabel}" perto de "${location}" site contato`;
        const fallbackResults = await firecrawlSearch(firecrawlApiKey, fallbackQuery, limitPerNiche);
        combined = deduplicateResults([...combined, ...fallbackResults]);
      }

      return { niche: nicheLabel, nicheKey, results: combined };
    });

    const results = await Promise.all(searchPromises);
    allSearchResults.push(...results);

    const searchContext = allSearchResults
      .filter((item) => item.results.length > 0)
      .map(({ niche, nicheKey, results }) => {
        const entries = results
          .map((result: any, index: number) => {
            const parts = [`### Resultado ${index + 1}`];
            if (result.title) parts.push(`Titulo: ${result.title}`);
            if (result.url) parts.push(`URL: ${result.url}`);
            if (result.description) parts.push(`Descricao: ${result.description}`);
            if (result.markdown) parts.push(`Conteudo:\n${result.markdown.substring(0, 3000)}`);
            return parts.join("\n");
          })
          .join("\n\n");
        return `## Categoria: ${niche} (key: ${nicheKey})\n\n${entries}`;
      })
      .join("\n\n---\n\n");

    if (!searchContext.trim()) {
      return new Response(JSON.stringify({ businesses: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Voce e um assistente especialista em extrair dados de empresas reais a partir de resultados de busca na web.

REGRAS CRITICAS:
- Extraia apenas empresas reais com nome identificavel. Nao invente dados.
- Priorize dados do Google Maps quando disponiveis.
- Telefones: use formato brasileiro com DDD. Se nao houver, devolva string vazia.
- Websites: use apenas o site proprio da empresa. Nao use URLs do Google, Instagram, Facebook ou diretorios.
- Enderecos: se faltar, use "${location}" como fallback.
- Rating: extraia a nota se disponivel. Se nao houver, use null.
- Email: extraia se estiver visivel. Se nao houver, use string vazia.
- Nao repita empresas duplicadas.
- distance deve ser um numero entre 0.5 e ${radius}.
- category deve ser a key em ingles fornecida nos resultados.
- Cada empresa deve ter id unico no formato niche-N.

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

Responda apenas com JSON array.`;

    const userPrompt = `Extraia todas as empresas reais dos seguintes resultados de busca para "${location}" (raio ${radius}km).
Priorize dados do Google Maps quando disponiveis.

${searchContext}`;

    let businesses = await callGeminiJson<any[]>(
      geminiApiKey,
      "gemini-2.5-flash",
      systemPrompt,
      userPrompt,
      { temperature: 0.2, maxOutputTokens: 4000 },
    );

    businesses = businesses.map((business: any) => ({
      ...business,
      website:
        business.website &&
        business.website.trim() &&
        !business.website.includes("google.com") &&
        !business.website.includes("facebook.com/") &&
        !business.website.includes("instagram.com/")
          ? business.website.replace(/^https?:\/\//, "")
          : "",
      phone: business.phone || "",
      email: business.email || "",
      address: business.address || location,
      onlinePresence: buildOnlinePresenceSnapshot(
        business.website &&
          business.website.trim() &&
          !business.website.includes("google.com") &&
          !business.website.includes("facebook.com/") &&
          !business.website.includes("instagram.com/")
          ? business.website.replace(/^https?:\/\//, "")
          : "",
        null,
        business.email || "",
        business.phone || "",
      ),
    }));

    const businessesWithWebsite = businesses.filter((business) => business.website);
    const batchSize = 5;

    for (let index = 0; index < businessesWithWebsite.length; index += batchSize) {
      const batch = businessesWithWebsite.slice(index, index + batchSize);

      await Promise.all(
        batch.map(async (business: any) => {
          const scrape = await firecrawlScrape(firecrawlApiKey, business.website);
          const textBlob = scrape ? `${scrape.markdown}\n${scrape.html}` : "";

          if (scrape && !business.email) {
            const emails = extractEmails(textBlob);
            if (emails.length > 0) {
              business.email = emails[0];
            }
          }

          if (scrape && !business.phone) {
            const phones = extractPhones(textBlob);
            if (phones.length > 0) {
              business.phone = phones[0];
            }
          }

          business.onlinePresence = buildOnlinePresenceSnapshot(
            business.website,
            scrape,
            business.email || "",
            business.phone || "",
          );
        }),
      );
    }

    return new Response(JSON.stringify({ businesses }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in search-businesses:", error);
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
