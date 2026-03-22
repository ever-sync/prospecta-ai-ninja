import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";
import { firecrawlSearchRequest, resolveFirecrawlApiKey } from "../_shared/firecrawl.ts";
import { callLLMJson, resolveUserLLM } from "../_shared/llm.ts";

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

type SearchResult = {
  title?: string;
  url?: string;
  description?: string;
  markdown?: string;
};

type SearchAdvancedFilters = {
  district?: string;
  queryHint?: string;
  minRating?: "any" | "4_plus" | "4_5_plus";
  websiteMode?: "any" | "with_site" | "without_site";
  requirePhone?: boolean;
  requireEmail?: boolean;
  limitResults?: number;
  initialSort?: "score_desc" | "rating_desc" | "distance_asc";
};

const DEFAULT_ADVANCED_FILTERS: Required<SearchAdvancedFilters> = {
  district: "",
  queryHint: "",
  minRating: "any",
  websiteMode: "any",
  requirePhone: false,
  requireEmail: false,
  limitResults: 40,
  initialSort: "score_desc",
};

const genericBusinessTokens = new Set([
  "clinica",
  "clinicas",
  "hospital",
  "instituto",
  "centro",
  "grupo",
  "especialidades",
  "especialidade",
  "medicina",
  "saude",
  "ortopedia",
  "ortopedia",
  "traumatologia",
  "odontologia",
  "fisioterapia",
  "laboratorio",
  "consultorio",
  "consultorio",
  "dr",
  "dra",
]);

async function firecrawlSearch(apiKey: string, query: string, limit: number): Promise<any[]> {
  const data = await firecrawlSearchRequest<{ data?: any[] }>(apiKey, {
      query,
      limit,
      lang: "pt-BR",
      country: "BR",
      scrapeOptions: { formats: ["markdown"] },
  });
  return data.data || [];
}

function normalizeWebsite(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBusinessNameTokens(name: string) {
  const tokens = normalizeText(name)
    .split(" ")
    .filter((token) => token.length >= 4);
  const brandTokens = tokens.filter((token) => !genericBusinessTokens.has(token));
  return { tokens, brandTokens };
}

function getResultText(result: SearchResult): string {
  return [result.title, result.description, result.markdown, result.url].filter(Boolean).join("\n");
}

function isDirectoryOrSocialUrl(url: string): boolean {
  const normalized = normalizeText(url);
  return (
    normalized.includes("google com") ||
    normalized.includes("googleusercontent com") ||
    normalized.includes("facebook com") ||
    normalized.includes("instagram com") ||
    normalized.includes("linkedin com") ||
    normalized.includes("youtube com") ||
    normalized.includes("wa me") ||
    normalized.includes("whatsapp com")
  );
}

function getWebsiteHost(url: string): string {
  try {
    const parsed = new URL(normalizeWebsite(url));
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
  }
}

function normalizeAdvancedFilters(rawFilters: unknown): Required<SearchAdvancedFilters> {
  if (!rawFilters || typeof rawFilters !== "object") {
    return DEFAULT_ADVANCED_FILTERS;
  }

  const filters = rawFilters as SearchAdvancedFilters;
  const minRating =
    filters.minRating === "4_plus" || filters.minRating === "4_5_plus" ? filters.minRating : "any";
  const websiteMode =
    filters.websiteMode === "with_site" || filters.websiteMode === "without_site" ? filters.websiteMode : "any";
  const initialSort =
    filters.initialSort === "rating_desc" || filters.initialSort === "distance_asc"
      ? filters.initialSort
      : "score_desc";
  const rawLimit = typeof filters.limitResults === "number" ? filters.limitResults : DEFAULT_ADVANCED_FILTERS.limitResults;
  const limitResults = Math.min(80, Math.max(5, Math.round(rawLimit / 5) * 5));

  return {
    district: typeof filters.district === "string" ? filters.district.trim() : "",
    queryHint: typeof filters.queryHint === "string" ? filters.queryHint.trim() : "",
    minRating,
    websiteMode,
    requirePhone: Boolean(filters.requirePhone),
    requireEmail: Boolean(filters.requireEmail),
    limitResults,
    initialSort,
  };
}

function hasAdvancedSearchFilters(filters: Required<SearchAdvancedFilters>) {
  return (
    Boolean(filters.district) ||
    Boolean(filters.queryHint) ||
    filters.minRating !== "any" ||
    filters.websiteMode !== "any" ||
    filters.requirePhone ||
    filters.requireEmail ||
    filters.limitResults !== DEFAULT_ADVANCED_FILTERS.limitResults ||
    filters.initialSort !== DEFAULT_ADVANCED_FILTERS.initialSort
  );
}

function buildGeoContext(location: string, district: string) {
  return [district.trim(), location.trim()].filter(Boolean).join(", ");
}

function buildSearchQueryHint(filters: Required<SearchAdvancedFilters>) {
  const parts = [
    filters.queryHint,
    filters.websiteMode === "with_site" ? "site oficial" : "",
    filters.requirePhone || filters.requireEmail ? "contato" : "",
    filters.minRating === "4_plus" ? "4 estrelas" : "",
    filters.minRating === "4_5_plus" ? "4.5 estrelas" : "",
  ];

  return parts.filter(Boolean).join(" ").trim();
}

function matchesAdvancedFilters(business: any, filters: Required<SearchAdvancedFilters>) {
  if (filters.websiteMode === "with_site" && !business.website) return false;
  if (filters.websiteMode === "without_site" && business.website) return false;
  if (filters.requirePhone && !business.phone) return false;
  if (filters.requireEmail && !business.email) return false;

  const rating = business.rating ?? null;
  if (filters.minRating === "4_plus" && (rating === null || rating < 4)) return false;
  if (filters.minRating === "4_5_plus" && (rating === null || rating < 4.5)) return false;

  return true;
}

function getBusinessSearchScore(business: any) {
  const hasWebsite = business.website ? 18 : 0;
  const hasPhone = business.phone ? 12 : 0;
  const hasEmail = business.email ? 10 : 0;
  const rating = business.rating ?? 0;
  const ratingScore = rating >= 4.5 ? 18 : rating >= 4 ? 14 : rating >= 3.5 ? 8 : 0;
  const proximityScore =
    business.distance <= 3 ? 14 : business.distance <= 8 ? 10 : business.distance <= 15 ? 6 : 2;
  const presenceScore = business.onlinePresence ? Math.max(0, 24 - Math.round(business.onlinePresence.score / 4)) : 12;
  return hasWebsite + hasPhone + hasEmail + ratingScore + proximityScore + presenceScore;
}

function sortBusinessesForSearch(items: any[], sortMode: Required<SearchAdvancedFilters>["initialSort"]) {
  return [...items].sort((a, b) => {
    if (sortMode === "rating_desc") {
      return (b.rating ?? 0) - (a.rating ?? 0) || getBusinessSearchScore(b) - getBusinessSearchScore(a);
    }

    if (sortMode === "distance_asc") {
      return (a.distance ?? Infinity) - (b.distance ?? Infinity) || getBusinessSearchScore(b) - getBusinessSearchScore(a);
    }

    return getBusinessSearchScore(b) - getBusinessSearchScore(a) || (a.distance ?? Infinity) - (b.distance ?? Infinity);
  });
}

function extractRating(text: string): number | null {
  const normalized = text.replace(/\s+/g, " ");
  const contextualMatch = normalized.match(/([0-5][\.,]\d)\s*(?:★|estrelas?|avaliac(?:ao|oes))/i);
  const broadMatch = normalized.match(/\b([0-5][\.,]\d)\b/);
  const ratingText = contextualMatch?.[1] || broadMatch?.[1];
  if (!ratingText) return null;
  const parsed = Number(ratingText.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 5 ? parsed : null;
}

function extractAddress(text: string, location: string): string {
  const explicitMatch = text.match(/endere[cç]o[:\s]+([^\n|]+)/i);
  if (explicitMatch?.[1]) {
    return explicitMatch[1].trim();
  }

  const lineMatch = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) =>
      /^(rua|avenida|av\.|rodovia|estrada|alameda|travessa|praca|praça)/i.test(line),
    );

  return lineMatch || location;
}

function resultMatchesBusinessName(businessName: string, result: SearchResult): boolean {
  const haystack = normalizeText(getResultText(result));
  const { tokens, brandTokens } = getBusinessNameTokens(businessName);
  const overlappingBrand = brandTokens.filter((token) => haystack.includes(token));
  const overlappingTokens = tokens.filter((token) => haystack.includes(token));

  return overlappingBrand.length >= 1 || overlappingTokens.length >= 2;
}

function enrichBusinessFromResults(
  business: any,
  results: SearchResult[],
  location: string,
) {
  const matches = results.filter((result) => resultMatchesBusinessName(business.name || "", result));

  if (matches.length === 0) {
    return business;
  }

  let website = business.website || "";
  let phone = business.phone || "";
  let email = business.email || "";
  let rating = business.rating ?? null;
  let address = business.address || location;
  const allPhonesSet = new Set<string>(phone ? [phone] : []);
  const allEmailsSet = new Set<string>(email ? [email] : []);

  for (const result of matches) {
    const resultText = getResultText(result);

    if (!website && result.url && !isDirectoryOrSocialUrl(result.url)) {
      website = getWebsiteHost(result.url);
    }

    const phones = extractPhones(resultText);
    phones.forEach(p => allPhonesSet.add(p));
    if (!phone && phones.length > 0) phone = phones[0];

    const emails = extractEmails(resultText);
    emails.forEach(e => allEmailsSet.add(e));
    if (!email && emails.length > 0) email = emails[0];

    if (!rating) {
      rating = extractRating(resultText);
    }

    if (!address || address === location) {
      address = extractAddress(resultText, location);
    }
  }

  return {
    ...business,
    website,
    phone,
    email,
    rating,
    address,
    allPhones: [...allPhonesSet],
    allEmails: [...allEmailsSet],
  };
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
  _scrape: null,
  fallbackEmail: string,
  fallbackPhone: string,
  allPhones: string[] = [],
  allEmails: string[] = [],
) {
  const phonesFound = [...new Set([...allPhones, ...(fallbackPhone ? [fallbackPhone] : [])])];
  const emailsFound = [...new Set([...allEmails, ...(fallbackEmail ? [fallbackEmail] : [])])];

  if (!website) {
    return {
      score: 8,
      classification: "critical",
      label: "Presenca critica",
      summary: "Nao possui site proprio. A empresa depende quase toda de reputacao local e canais de terceiros.",
      strengths: fallbackPhone || fallbackEmail ? ["Existe um canal de contato direto."] : [],
      weaknesses: ["Nao possui site proprio", "Baixa autoridade fora do Google"],
      emailsFound,
      phonesFound,
      socialLinks: {},
      hasContactForm: false,
      hasHttps: false,
    };
  }

  let score = 28;
  const strengths: string[] = ["Site proprio detectado."];
  const weaknesses: string[] = [];

  if (fallbackEmail) { score += 10; strengths.push("Email de contato encontrado"); }
  else weaknesses.push("Email dificil de encontrar");

  if (fallbackPhone) { score += 10; strengths.push("Telefone visivel"); }
  else weaknesses.push("Telefone pouco visivel");

  if (website.startsWith("https://")) { score += 8; strengths.push("Site com HTTPS"); }
  else weaknesses.push("HTTPS ausente ou incerto");

  score = Math.max(0, Math.min(score, 100));
  const classification = score <= 25 ? "critical" : score <= 45 ? "weak" : score <= 70 ? "average" : "strong";
  const label = classification === "critical" ? "Presenca critica"
    : classification === "weak" ? "Presenca fraca"
    : classification === "average" ? "Presenca mediana"
    : "Presenca consistente";

  return {
    score,
    classification,
    label,
    summary: "Site encontrado. Presenca pode ser auditada para identificar oportunidades de melhoria.",
    strengths,
    weaknesses,
    emailsFound,
    phonesFound,
    socialLinks: {},
    hasContactForm: false,
    hasHttps: website.startsWith("https://"),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { niches, location, radius, advanced, provider } = await req.json();
    const { user, svc } = await getAuthenticatedUserContext(req, { requireBillingAccess: true });
    const [firecrawlApiKey, llm] = await Promise.all([
      resolveFirecrawlApiKey(svc, user.id),
      resolveUserLLM(svc, user.id, provider),
    ]);

    const allSearchResults: { niche: string; nicheKey: string; results: any[] }[] = [];
    const advancedFilters = normalizeAdvancedFilters(advanced);
    const geoContext = buildGeoContext(location, advancedFilters.district);
    const queryHint = buildSearchQueryHint(advancedFilters);
    const hasAdvancedFilters = hasAdvancedSearchFilters(advancedFilters);
    const targetLeadVolume = Math.max(advancedFilters.limitResults, hasAdvancedFilters ? 50 : 40);
    const limitPerNiche = Math.min(15, Math.ceil(targetLeadVolume / niches.length));

    const searchPromises = niches.map(async (nicheKey: string) => {
      const nicheLabel = nicheLabels[nicheKey] || nicheKey;

      // Query 1: diretórios brasileiros + dados de contato
      const directoryQuery = `${nicheLabel} ${geoContext} ${queryHint} site:apontador.com OR site:guiamais.com.br OR site:telelistas.net telefone endereço`.trim();
      // Query 2: busca local com avaliações
      const localQuery = `${nicheLabel} em ${geoContext} ${queryHint} avaliações contato endereço`.trim();
      // Query 3: busca ampla com redes sociais e CNPJ
      const broadQuery = `"${nicheLabel}" "${geoContext}" ${queryHint} instagram facebook site whatsapp CNPJ`.trim();

      const [directoryResults, localResults, broadResults] = await Promise.all([
        firecrawlSearch(firecrawlApiKey, directoryQuery, limitPerNiche),
        firecrawlSearch(firecrawlApiKey, localQuery, limitPerNiche),
        firecrawlSearch(firecrawlApiKey, broadQuery, Math.ceil(limitPerNiche / 2)),
      ]);

      const combined = deduplicateResults([...directoryResults, ...localResults, ...broadResults]);
      return { niche: nicheLabel, nicheKey, results: combined as SearchResult[] };
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
            if (result.markdown) parts.push(`Conteudo:\n${result.markdown.substring(0, 900)}`);
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

OBJETIVO: Extrair o MAXIMO de empresas unicas possivel. Extraia todas que encontrar, ate ${advancedFilters.limitResults}.

REGRAS CRITICAS:
- Extraia apenas empresas reais com nome identificavel. Nao invente dados.
- Priorize dados do Google Maps quando disponiveis.
- Telefones: use formato brasileiro com DDD. Se nao houver, devolva string vazia.
- Websites: use apenas o site proprio da empresa. Nao use URLs do Google, Instagram, Facebook ou diretorios.
- Enderecos: se faltar, use "${geoContext}" como fallback.
- Rating: extraia a nota se disponivel. Se nao houver, use null.
- Email: extraia se estiver visivel. Se nao houver, use string vazia.
- Nao repita empresas duplicadas.
- distance deve ser um numero entre 0.5 e ${radius}.
- category deve ser a key em ingles fornecida nos resultados.
- Cada empresa deve ter id unico no formato niche-N.
${advancedFilters.minRating === "4_plus" ? "- Priorize empresas com rating minimo de 4.0." : ""}
${advancedFilters.minRating === "4_5_plus" ? "- Priorize empresas com rating minimo de 4.5." : ""}
${advancedFilters.websiteMode === "with_site" ? "- Priorize empresas com site proprio identificado." : ""}
${advancedFilters.websiteMode === "without_site" ? "- Priorize empresas sem site proprio identificado." : ""}
${advancedFilters.requirePhone ? "- Priorize empresas com telefone identificado." : ""}
${advancedFilters.requireEmail ? "- Priorize empresas com email identificado." : ""}

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

    const userPrompt = `Extraia todas as empresas reais dos seguintes resultados de busca para "${geoContext}" (raio ${radius}km).
Priorize dados do Google Maps quando disponiveis.
${advancedFilters.queryHint ? `Use "${advancedFilters.queryHint}" como criterio adicional de relevancia.\n` : ""}${advancedFilters.district ? `Priorize especificamente a regiao "${advancedFilters.district}".\n` : ""}${advancedFilters.websiteMode === "with_site" ? "Prefira empresas com site proprio.\n" : ""}${advancedFilters.websiteMode === "without_site" ? "Prefira empresas sem site proprio identificado.\n" : ""}${advancedFilters.requirePhone ? "Prefira empresas com telefone.\n" : ""}${advancedFilters.requireEmail ? "Prefira empresas com email.\n" : ""}

${searchContext}`;

    let businesses = await callLLMJson<any[]>(
      llm,
      systemPrompt,
      userPrompt,
      { temperature: 0.2, maxOutputTokens: 8000 },
    );

    const allRawResults = allSearchResults.flatMap((item) => item.results);

    businesses = businesses.map((business: any) => {
      const normalizedBusiness = {
        ...business,
        website:
          business.website &&
          business.website.trim() &&
          !isDirectoryOrSocialUrl(business.website)
            ? getWebsiteHost(business.website)
            : "",
        phone: business.phone || "",
        email: business.email || "",
        address: business.address || geoContext,
      };

      const enriched = enrichBusinessFromResults(normalizedBusiness, allRawResults, geoContext);

      return {
        ...enriched,
        onlinePresence: buildOnlinePresenceSnapshot(
          enriched.website || "",
          null,
          enriched.email || "",
          enriched.phone || "",
          enriched.allPhones || [],
          enriched.allEmails || [],
        ),
      };
    });

    const filteredBusinesses = sortBusinessesForSearch(
      businesses.filter((business) => matchesAdvancedFilters(business, advancedFilters)),
      advancedFilters.initialSort,
    ).slice(0, advancedFilters.limitResults);

    return new Response(JSON.stringify({ businesses: filteredBusinesses }), {
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
