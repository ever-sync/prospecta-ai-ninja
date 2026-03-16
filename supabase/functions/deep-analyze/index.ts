import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";
import { callLLMJson, resolveUserLLM } from "../_shared/llm.ts";
import { firecrawlScrapeRequest, resolveFirecrawlApiKey } from "../_shared/firecrawl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-user-auth, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ScrapedContent = {
  markdown: string;
  html: string;
  screenshot: string | null;
  metadata: Record<string, any>;
};

const normalizeWebsite = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

const firecrawlScrape = async (apiKey: string, url: string, formats: string[], waitFor?: number) => {
  return await firecrawlScrapeRequest<any>(apiKey, {
      url,
      formats,
      onlyMainContent: false,
      ...(waitFor ? { waitFor } : {}),
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business, dna, profile, provider } = await req.json();

    if (!business) {
      return new Response(JSON.stringify({ error: "Business data is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user, svc } = await getAuthenticatedUserContext(req);
    const [llm, firecrawlApiKey] = await Promise.all([
      resolveUserLLM(svc, user.id, provider),
      resolveFirecrawlApiKey(svc, user.id),
    ]);

    let scrapedContent: ScrapedContent | null = null;
    let websiteCaptureError: string | null = null;
    let googleMapsCaptureError: string | null = null;
    if (business.website) {
      try {
        const scrapeData = await firecrawlScrape(
          firecrawlApiKey,
          normalizeWebsite(business.website),
          ["markdown", "html", "screenshot"],
        );
        if (scrapeData) {
          scrapedContent = {
            markdown: scrapeData.data?.markdown || scrapeData.markdown || "",
            html: scrapeData.data?.html || scrapeData.html || "",
            screenshot: scrapeData.data?.screenshot || scrapeData.screenshot || null,
            metadata: scrapeData.data?.metadata || scrapeData.metadata || {},
          };
        }
      } catch (error) {
        console.error("Scrape error:", error);
        websiteCaptureError = error instanceof Error ? error.message : "Falha ao capturar o site";
      }
    }

    let googleMapsScreenshot: string | null = null;
    if (business.name) {
      try {
        const searchQuery = encodeURIComponent(`${business.name} ${business.address || ""}`);
        const mapsUrl = `https://www.google.com/maps/search/${searchQuery}`;
        const screenshotData = await firecrawlScrape(firecrawlApiKey, mapsUrl, ["screenshot"], 3000);
        googleMapsScreenshot = screenshotData?.data?.screenshot || screenshotData?.screenshot || null;
      } catch (error) {
        console.error("Google Maps screenshot error:", error);
        googleMapsCaptureError = error instanceof Error ? error.message : "Falha ao capturar o Google Maps";
      }
    }

    const htmlSnippet = scrapedContent?.html ? scrapedContent.html.substring(0, 8000) : "Sem site disponivel";
    const markdownContent = scrapedContent?.markdown
      ? scrapedContent.markdown.substring(0, 6000)
      : "Sem conteudo disponivel";
    const metadata = scrapedContent?.metadata || {};

    const dnaContext = dna
      ? `DNA COMERCIAL:
- Servicos: ${(dna.services || []).join(", ") || "Nao informado"}
- Diferenciais: ${(dna.differentials || []).join(", ") || "Nao informado"}
- Publico-alvo: ${dna.target_audience || "Nao informado"}
- Proposta de valor: ${dna.value_proposition || "Nao informado"}
- ICP segmentos: ${(dna.icp_segments || []).join(", ") || "Nao informado"}
- ICP porte: ${dna.icp_company_size || "Nao informado"}
- ICP maturidade digital: ${dna.icp_digital_maturity || "Nao informado"}
- Dores prioritarias: ${(dna.priority_pains || []).join(", ") || "Nao informado"}
- Objecoes comuns: ${(dna.common_objections || []).join(", ") || "Nao informado"}
- Ofertas/pacotes: ${dna.offer_packages || "Nao informado"}
- Faixa de preco: ${dna.price_range || "Nao informado"}
- Garantia: ${dna.guarantee || "Nao informado"}`
      : "";

    const systemPrompt = `Voce e um analista de marketing digital especializado em auditoria de presenca online de empresas.
Sua tarefa inclui analisar o HTML e identificar se o site possui scripts de rastreamento de anuncios (ex: Facebook Pixel, Google Ads/Tag Manager, LinkedIn Insight, TikTok Pixel).
REGRAS ANTI-ALUCINACAO E QUALIDADE (CRITICO):
1. Baseie-se ESTRITAMENTE no HTML Parcial e no Markdown fornecidos.
2. NAO INVENTE dados, metricas, vulnerabilidades ou forcas que nao estejam evidentes no texto raspado.
3. Se o site for genérico e não tiver informações suficientes, limite-se ao que existe e diga que as informações são escassas. É preferível retornar "N/A" ou listas vazias a inventar dados falsos.
4. Escreva respostas em PORTUGUES DO BRASIL IMPECAVEL. Use gramatica correta, acentuacao perfeita e revise plurais e concordancias. Nao cometa erros de digitacao.

Retorne apenas JSON com esta estrutura:
{
  "scores": { "seo": 0, "speed": 0, "layout": 0, "security": 0, "overall": 0 },
  "seo_details": {
    "has_title": true,
    "has_meta_description": true,
    "has_h1": true,
    "has_sitemap": false,
    "issues": ["..."]
  },
  "security_details": {
    "has_https": true,
    "has_ssl": true,
    "issues": ["..."]
  },
  "google_presence": {
    "rating": 4.2,
    "estimated_position": "media",
    "strengths": ["..."],
    "weaknesses": ["..."]
  },
  "marketing_signals": {
    "has_facebook_pixel": false,
    "has_google_ads": false,
    "has_linkedin_insight": false,
    "detected_tags": ["..."]
  },
  "recommendations": [
    { "title": "...", "description": "...", "priority": "alta", "category": "SEO" }
  ],
  "summary": "..."
}`;

    const userPrompt = `Analise a seguinte empresa de forma rigorosa as regras anti-alucinacao:

EMPRESA-ALVO:
- Nome: ${business.name}
- Endereco: ${business.address}
- Telefone: ${business.phone}
- Site: ${business.website || "Sem site"}
- Categoria: ${business.category}
- Rating Google: ${business.rating || "N/A"}
${business.onlinePresence ? `- Presenca online: ${business.onlinePresence.label} (${business.onlinePresence.score}/100)` : ""}
${business.onlinePresence?.weaknesses?.length ? `- Fraquezas percebidas: ${business.onlinePresence.weaknesses.join(", ")}` : ""}

CONTEUDO DO SITE BRUTO (HTML parcial da home):
${htmlSnippet}

CONTEUDO DO SITE EXTRAIDO (Markdown):
${markdownContent}

METADADOS EXTRAIDOS:
- Title: ${metadata.title || "N/A"}
- Description: ${metadata.description || "N/A"}
- Language: ${metadata.language || "N/A"}

${dnaContext}
DNA COMPLETO:
${JSON.stringify(dna || {}, null, 2)}

Retorne uma analise tecnica e comercial RESTRITA aos dados acima.`;

    const analysis = await callLLMJson<any>(
      llm,
      systemPrompt,
      userPrompt,
      { temperature: 0.3, maxOutputTokens: 2500 },
    );

    analysis.has_website = !!business.website;
    analysis.scraped = !!scrapedContent;
    analysis.google_maps_capture_status = googleMapsScreenshot ? "ready" : "fallback";
    analysis.website_capture_status = scrapedContent?.screenshot ? "ready" : "fallback";
    analysis.google_maps_capture_error = googleMapsCaptureError;
    analysis.website_capture_error = websiteCaptureError;
    analysis.google_maps_captured_at = googleMapsScreenshot ? new Date().toISOString() : null;
    analysis.website_captured_at = scrapedContent?.screenshot ? new Date().toISOString() : null;
    if (googleMapsScreenshot) {
      analysis.google_maps_screenshot = googleMapsScreenshot;
    }
    if (scrapedContent?.screenshot) {
      analysis.website_screenshot = scrapedContent.screenshot;
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Deep analyze error:", error);
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
