import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";
import { callGeminiJson } from "../_shared/gemini.ts";
import { renderPresentationHtml } from "../_shared/presentation-renderer.ts";
import {
  PresentationContentV2,
  PresentationRenderContext,
  PresentationResponseMode,
  PresentationTemplateSkin,
  PresentationTone,
} from "../_shared/presentation-types.ts";
import { requireUserProviderKey } from "../_shared/user-provider-keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-user-auth, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalizeTemplate = (template?: string | null): PresentationTemplateSkin => {
  if (
    template === "modern-dark" ||
    template === "clean-light" ||
    template === "corporate" ||
    template === "bold-gradient" ||
    template === "custom"
  ) {
    return template;
  }
  return "modern-dark";
};

const normalizeTone = (tone?: string | null): PresentationTone => {
  if (
    tone === "professional" ||
    tone === "consultive" ||
    tone === "urgent" ||
    tone === "friendly" ||
    tone === "technical"
  ) {
    return tone;
  }
  return "consultive";
};

const normalizeResponseMode = (mode?: string | null): PresentationResponseMode =>
  mode === "form" ? "form" : "buttons";

const firstItems = (value: unknown, fallback: string[]) => {
  if (Array.isArray(value)) {
    const parsed = value.map((item) => String(item || "").trim()).filter(Boolean);
    if (parsed.length > 0) return parsed;
  }
  return fallback;
};

const makeWhatsappUrl = (phone?: string | null, companyName?: string, businessName?: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const target = digits.startsWith("55") ? digits : `55${digits}`;
  const text = encodeURIComponent(
    `Ola! Vi a proposta da ${companyName || "sua empresa"} sobre ${businessName || "meu negocio"} e quero falar sobre os proximos passos.`,
  );
  return `https://wa.me/${target}?text=${text}`;
};

const buildFallbackContent = (params: {
  analysis: Record<string, any>;
  business: Record<string, any>;
  dna: Record<string, any> | null;
  tone: PresentationTone;
  responseMode: PresentationResponseMode;
}): PresentationContentV2 => {
  const { analysis, business, dna, tone, responseMode } = params;
  const services = firstItems(dna?.services, ["Diagnostico de presenca digital", "UX focada em conversao", "Captacao comercial"]);
  const pains = firstItems(dna?.priority_pains, ["perda de leads", "baixa conversao", "presenca digital fraca"]);
  const differentials = firstItems(dna?.differentials, ["Execucao consultiva", "Clareza no plano de acao", "Ritmo comercial forte"]);
  const overall = Number(analysis?.scores?.overall || 0);
  const category = String(business.category || "empresa local");
  const tonePrefix =
    tone === "urgent"
      ? "Cada semana assim custa oportunidade real."
      : tone === "technical"
      ? "Os sinais tecnicos confirmam um gargalo de aquisicao."
      : "Existe uma oportunidade clara de melhora comercial.";

  return {
    hero: {
      eyebrow: "Leitura comercial estruturada",
      headline: overall < 40
        ? `Hoje sua operacao digital nao sustenta a venda que ${business.name} pode fechar.`
        : `Sua presenca digital tem base, mas ainda deixa dinheiro na mesa em ${category}.`,
      subheadline: `${tonePrefix} Esta proposta conecta o que foi analisado com um plano objetivo para atrair, convencer e converter melhor.`,
      miniSummary: `Encontramos sinais de ${pains[0]} e um espaco claro para posicionar ${services[0]} como alavanca de crescimento.`,
    },
    executiveSummary: {
      title: "Resumo executivo",
      bullets: [
        `A leitura da empresa ${business.name} mostra gargalos de descoberta, confianca e conversao.`,
        `Os principais sinais indicam ${pains.slice(0, 2).join(" e ")} impactando a captacao.`,
        `A oportunidade esta em transformar essas brechas num fluxo comercial previsivel.`,
        `A proposta abaixo mostra onde agir primeiro e como acelerar retorno.`,
      ],
    },
    diagnosis: {
      title: "Diagnostico central",
      summary: `A operacao atual nao comunica valor com a forca necessaria para transformar interesse em contato comercial consistente.`,
      riskStatement: overall < 40
        ? "Continuar igual significa seguir perdendo demanda que ja esta procurando uma solucao."
        : "Sem ajuste fino, a empresa continua atraindo menos confianca e convertendo abaixo do potencial.",
    },
    googleMapsInsight: {
      title: "Google Maps",
      insight: `No contexto local, visibilidade e prova social influenciam diretamente a decisao de contato.`,
      impact: `Quando o Maps nao transmite autoridade suficiente, o lead escolhe quem parece mais seguro e mais facil de acionar.`,
    },
    websiteInsight: {
      title: "Site atual",
      insight: `O site precisa reduzir friccao, clarificar proposta e sustentar melhor a decisao de compra.`,
      impact: `Sem isso, cada clique novo vira visita pouco qualificada, curiosidade solta ou abandono antes do contato.`,
    },
    opportunities: [
      {
        title: "Mensagem comercial pouco agressiva",
        impact: "O visitante nao percebe valor rapido o bastante para agir.",
        urgency: "Alta",
        opportunity: "Reposicionar a proposta com foco em dor, prova e proximo passo claro.",
      },
      {
        title: "Presenca digital abaixo do potencial",
        impact: "Parte da demanda local escolhe concorrentes mais convincentes.",
        urgency: "Alta",
        opportunity: "Ganhar mais descoberta e mais confianca nas primeiras impressoes.",
      },
      {
        title: "Conversao sem esteira clara",
        impact: "Interesse se perde entre visita, duvida e inercia.",
        urgency: "Media",
        opportunity: "Criar uma experiencia que leva do interesse ao contato com menos atrito.",
      },
    ],
    solutionMapping: services.slice(0, 3).map((service, index) => ({
      problem: pains[index] || pains[0],
      service,
      benefit: `Aplicar ${service.toLowerCase()} para reduzir atrito, aumentar confianca e converter mais oportunidades qualificadas.`,
    })),
    differentials: differentials.slice(0, 3).map((item) => ({
      title: item,
      description: `Esse diferencial encurta o caminho entre diagnostico, execucao e resultado percebido pelo lead.`,
    })),
    proof: [
      {
        title: "Plano orientado a oportunidade perdida",
        metric: "Leitura comercial",
        description: "Nao entregamos auditoria fria. Entregamos um argumento de venda conectado ao contexto do lead.",
      },
      {
        title: "Execucao conectada ao DNA da sua empresa",
        metric: "Fit comercial",
        description: "A proposta conversa com servicos, diferenciais e posicionamento reais da sua operacao.",
      },
    ],
    offer: {
      title: "Proximo passo",
      summary: `A proposta para ${business.name} e simples: corrigir os pontos que travam descoberta, confianca e conversao antes que mais demanda escape.`,
      expectedResult: "Mais clareza comercial, mais autoridade digital e mais contatos qualificados entrando na operacao.",
      riskOfInaction: "A empresa segue investindo energia em presenca digital que nao converte no ritmo que poderia.",
    },
    cta: {
      title: responseMode === "form" ? "Formulario de interesse" : "Tomada de decisao",
      primaryLabel: responseMode === "form" ? "Enviar formulario" : "Quero receber contato",
      secondaryLabel: responseMode === "form" ? null : "Agora nao",
      microcopy: "Se fizer sentido, o proximo passo e simples: responder agora para transformar essa leitura em plano de acao.",
      trustLine: "Sem compromisso inicial",
    },
  };
};

const normalizeGeneratedContent = (
  content: Partial<PresentationContentV2> | null | undefined,
  fallback: PresentationContentV2,
): PresentationContentV2 => ({
  hero: { ...fallback.hero, ...(content?.hero || {}) },
  executiveSummary: {
    ...fallback.executiveSummary,
    ...(content?.executiveSummary || {}),
    bullets: Array.isArray(content?.executiveSummary?.bullets) && content?.executiveSummary?.bullets.length > 0
      ? content.executiveSummary.bullets.slice(0, 4).map((item) => String(item))
      : fallback.executiveSummary.bullets,
  },
  diagnosis: { ...fallback.diagnosis, ...(content?.diagnosis || {}) },
  googleMapsInsight: { ...fallback.googleMapsInsight, ...(content?.googleMapsInsight || {}) },
  websiteInsight: { ...fallback.websiteInsight, ...(content?.websiteInsight || {}) },
  opportunities: Array.isArray(content?.opportunities) && content.opportunities.length > 0
    ? content.opportunities.slice(0, 5).map((item) => ({
        title: String(item?.title || fallback.opportunities[0].title),
        impact: String(item?.impact || fallback.opportunities[0].impact),
        urgency: String(item?.urgency || fallback.opportunities[0].urgency),
        opportunity: String(item?.opportunity || fallback.opportunities[0].opportunity),
      }))
    : fallback.opportunities,
  solutionMapping: Array.isArray(content?.solutionMapping) && content.solutionMapping.length > 0
    ? content.solutionMapping.slice(0, 4).map((item) => ({
        problem: String(item?.problem || fallback.solutionMapping[0].problem),
        service: String(item?.service || fallback.solutionMapping[0].service),
        benefit: String(item?.benefit || fallback.solutionMapping[0].benefit),
      }))
    : fallback.solutionMapping,
  differentials: Array.isArray(content?.differentials) && content.differentials.length > 0
    ? content.differentials.slice(0, 4).map((item) => ({
        title: String(item?.title || fallback.differentials[0].title),
        description: String(item?.description || fallback.differentials[0].description),
      }))
    : fallback.differentials,
  proof: Array.isArray(content?.proof) && content.proof.length > 0
    ? content.proof.slice(0, 3).map((item) => ({
        title: String(item?.title || fallback.proof[0].title),
        metric: item?.metric ? String(item.metric) : fallback.proof[0].metric,
        description: String(item?.description || fallback.proof[0].description),
      }))
    : fallback.proof,
  offer: { ...fallback.offer, ...(content?.offer || {}) },
  cta: { ...fallback.cta, ...(content?.cta || {}) },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      analysis,
      business,
      dna,
      profile,
      testimonials,
      clientLogos,
      template,
      tone,
      customInstructions,
      publicId,
      provider,
      responseMode,
      formTemplateName,
      formTemplateBody,
    } = await req.json();

    if (provider && provider !== "gemini") {
      return new Response(
        JSON.stringify({ error: "A geracao de apresentacoes ainda suporta apenas Gemini nesta etapa." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { user, svc } = await getAuthenticatedUserContext(req);
    const geminiApiKey = await requireUserProviderKey(
      svc,
      user.id,
      "gemini",
      "Configure sua chave Gemini em Configuracoes > APIs.",
    );

    const selectedTemplate = normalizeTemplate(template);
    const selectedTone = normalizeTone(tone);
    const selectedMode = normalizeResponseMode(responseMode);
    const companyName = String(profile?.company_name || "Nossa Empresa");
    const whatsappUrl = makeWhatsappUrl(profile?.phone, companyName, business?.name);
    const services = firstItems(dna?.services, ["Diagnostico comercial", "Reposicionamento digital", "Conversao"]);
    const differentials = firstItems(dna?.differentials, ["Execucao consultiva", "Velocidade de entrega"]);
    const pains = firstItems(dna?.priority_pains, ["perda de leads", "baixa conversao"]);

    const systemPrompt = `Voce cria conteudo comercial estruturado para propostas de venda.
Retorne apenas JSON valido no schema:
{
  "hero": { "eyebrow": "", "headline": "", "subheadline": "", "miniSummary": "" },
  "executiveSummary": { "title": "", "bullets": ["", "", "", ""] },
  "diagnosis": { "title": "", "summary": "", "riskStatement": "" },
  "googleMapsInsight": { "title": "", "insight": "", "impact": "" },
  "websiteInsight": { "title": "", "insight": "", "impact": "" },
  "opportunities": [{ "title": "", "impact": "", "urgency": "", "opportunity": "" }],
  "solutionMapping": [{ "problem": "", "service": "", "benefit": "" }],
  "differentials": [{ "title": "", "description": "" }],
  "proof": [{ "title": "", "metric": "", "description": "" }],
  "offer": { "title": "", "summary": "", "expectedResult": "", "riskOfInaction": "" },
  "cta": { "title": "", "primaryLabel": "", "secondaryLabel": "", "microcopy": "", "trustLine": "" }
}

Regras:
- Estrutura fixa, sem HTML.
- Copy em portugues do Brasil.
- Tom consultivo com agressividade comercial moderada.
- Seja claro, objetivo e vendavel.
- Priorize impacto comercial, nao auditoria tecnica fria.
- Use DNA, servicos e analise para personalizar.
- Nao invente depoimentos nem numeros especificos se nao existirem.
- Use no maximo 4 bullets no resumo executivo.
- Gere de 3 a 5 oportunidades.
- Gere de 2 a 4 solutionMapping.
- Gere de 2 a 4 differentials.
- Gere de 1 a 3 proof cards.`;

    const userPrompt = `EMPRESA VENDEDORA:
- Nome: ${companyName}
- Servicos: ${services.join(", ")}
- Diferenciais: ${differentials.join(", ")}
- Proposta de valor: ${String(dna?.value_proposition || "Nao informado")}
- Target audience: ${String(dna?.target_audience || "Nao informado")}
- Dores prioritarias: ${pains.join(", ")}
- Objecoes comuns: ${firstItems(dna?.common_objections, []).join(", ") || "Nao informado"}
- Respostas a objecoes: ${String(dna?.objection_responses || "Nao informado")}
- Pacotes/ofertas: ${String(dna?.offer_packages || "Nao informado")}
- Garantia: ${String(dna?.guarantee || "Nao informado")}
- Cases metricos: ${String(dna?.case_metrics || "Nao informado")}

LEAD ANALISADO:
- Nome: ${String(business?.name || "Lead")}
- Categoria: ${String(business?.category || "Nao informada")}
- Endereco: ${String(business?.address || "Nao informado")}
- Site: ${String(business?.website || "Sem site")}
- Rating: ${String(business?.rating || "N/A")}

ANALISE:
${JSON.stringify(analysis || {}, null, 2)}

MODO DE FECHAMENTO:
- responseMode: ${selectedMode}
- formulario: ${String(formTemplateName || "Nao informado")}
- campos base: ${String(formTemplateBody || "Nome, WhatsApp, Email, principal desafio, objetivo")}

INSTRUCOES EXTRAS DO USUARIO:
${String(customInstructions || "Nenhuma")}

Entregue uma narrativa forte, facil de ler e orientada a conversao.`;

    const fallbackContent = buildFallbackContent({
      analysis: analysis || {},
      business: business || {},
      dna: dna || null,
      tone: selectedTone,
      responseMode: selectedMode,
    });

    let generatedContent: PresentationContentV2;

    try {
      const rawContent = await callGeminiJson<Partial<PresentationContentV2>>(
        geminiApiKey,
        "gemini-2.5-flash",
        systemPrompt,
        userPrompt,
        { temperature: 0.45, maxOutputTokens: 4096 },
      );
      generatedContent = normalizeGeneratedContent(rawContent, fallbackContent);
    } catch (error) {
      console.error("Structured generation fallback:", error);
      generatedContent = fallbackContent;
    }

    const context: PresentationRenderContext = {
      template: selectedTemplate,
      tone: selectedTone,
      responseMode: selectedMode,
      business: business || {},
      analysis: analysis || {},
      dna: dna || null,
      profile: profile || null,
      publicId: String(publicId || ""),
      companyName,
      logoUrl: profile?.company_logo_url || null,
      whatsappUrl,
      formTemplateName: formTemplateName || null,
      formTemplateBody: formTemplateBody || null,
      testimonials: Array.isArray(testimonials) ? testimonials : [],
      clientLogos: Array.isArray(clientLogos) ? clientLogos : [],
      assets: {
        googleMaps: {
          src: analysis?.google_maps_screenshot || null,
          status: analysis?.google_maps_capture_status === "ready" ? "ready" : "fallback",
          error: analysis?.google_maps_capture_error || null,
          capturedAt: analysis?.google_maps_captured_at || null,
        },
        website: {
          src: analysis?.website_screenshot || null,
          status: analysis?.website_capture_status === "ready" ? "ready" : "fallback",
          error: analysis?.website_capture_error || null,
          capturedAt: analysis?.website_captured_at || null,
        },
      },
    };

    const rendered = renderPresentationHtml(generatedContent, context);

    return new Response(
      JSON.stringify({
        success: true,
        html: rendered.html,
        version: "v2",
        content: generatedContent,
        assetsUsed: rendered.assetsUsed,
        fallbacksUsed: rendered.fallbacksUsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Generate presentation error:", error);
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Generation failed" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
