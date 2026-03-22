import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";
import { callLLMJson, resolveUserLLM } from "../_shared/llm.ts";
import { renderPresentationHtml } from "../_shared/presentation-renderer.ts";
import {
  PresentationContentV2,
  PresentationRenderContext,
  PresentationResponseMode,
  PresentationTemplateSkin,
  PresentationTone,
} from "../_shared/presentation-types.ts";

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
      eyebrow: "Uma analise honesta do seu negocio",
      headline: overall < 40
        ? `${business.name} esta perdendo clientes que ja estao procurando pelo que voce oferece.`
        : `${business.name} tem uma base boa, mas ainda deixa clientes escaparem sem perceber.`,
      subheadline: `${tonePrefix} Esta analise mostra exatamente onde estao os problemas e o que podemos fazer juntos para que mais pessoas escolham voce.`,
      miniSummary: `Encontramos pontos que precisam de atencao em ${category}. A boa noticia e que da para resolver — e e isso que vamos mostrar aqui.`,
    },
    executiveSummary: {
      title: "O que encontramos",
      bullets: [
        `${business.name} tem oportunidade real de atrair mais clientes com ajustes simples.`,
        `O principal problema e ${pains[0]} — isso faz pessoas interessadas escolherem a concorrencia.`,
        `Com ${services[0]}, da para virar esse jogo rapidamente.`,
      ],
    },
    diagnosis: {
      title: "A situacao atual",
      summary: `Do jeito que esta hoje, o negocio nao esta aproveitando todas as pessoas que ja estao procurando pelo que ${business.name} oferece.`,
      riskStatement: overall < 40
        ? "Cada semana assim sao clientes que chegaram perto e foram embora sem ligar."
        : "Com pequenos ajustes, da para capturar muito mais dos clientes que ja passam perto do negocio.",
    },
    pontosFortes: [
      `${business.name} ja tem presenca no mercado de ${category} — isso e um ponto de partida importante.`,
      `O negocio esta em funcionamento e tem clientes, o que mostra que o produto ou servico tem valor real.`,
    ],
    googleMapsInsight: {
      title: "No Google",
      insight: `Quando alguem pesquisa por ${category} na regiao, a forma como o negocio aparece influencia muito se a pessoa vai ligar ou escolher outro.`,
      impact: `Se a aparencia no Google nao passa confianca, as pessoas escolhem quem parece mais seguro — mesmo que o seu servico seja melhor.`,
    },
    websiteInsight: {
      title: "No site",
      insight: `O site e como a vitrine do negocio na internet. Ele precisa deixar claro o que voce faz e facilitar o contato.`,
      impact: `Quando isso nao acontece, as pessoas visitam, ficam confusas e vao embora sem entrar em contato.`,
    },
    opportunities: [
      {
        title: "Dificil de encontrar quando as pessoas pesquisam",
        impact: "Quem esta procurando pelo seu servico nao te acha — e vai no concorrente.",
        urgency: "Alta",
        opportunity: "Melhorar como o negocio aparece nas pesquisas do Google.",
      },
      {
        title: "Site nao convence as pessoas a entrar em contato",
        impact: "A pessoa visita o site mas nao liga nem manda mensagem.",
        urgency: "Alta",
        opportunity: "Deixar o site mais claro e com um caminho facil para o cliente chegar ate voce.",
      },
      {
        title: "Poucos comentarios e avaliacoes visiveis",
        impact: "Sem avaliacao, as pessoas preferem ir em quem tem mais comentarios positivos.",
        urgency: "Media",
        opportunity: "Aumentar a quantidade de clientes satisfeitos deixando avaliacao no Google.",
      },
    ],
    concorrente: [
      {
        vantagem: "A concorrencia aparece primeiro quando alguem pesquisa pelo servico na regiao.",
        impacto: "O cliente em potencial nem chega a ver o seu negocio — ja liga para o outro.",
      },
      {
        vantagem: "Outros do seu ramo tem mais avaliacoes e fotos no perfil do Google.",
        impacto: "Passam mais confianca para quem ainda nao os conhece.",
      },
    ],
    solutionMapping: services.slice(0, 3).map((service, index) => ({
      problem: pains[index] || pains[0],
      service,
      benefit: `Com ${service.toLowerCase()}, o negocio comeca a aparecer mais e a convencer melhor as pessoas que ja estao procurando.`,
    })),
    differentials: differentials.slice(0, 3).map((item) => ({
      title: item,
      description: `Isso faz com que o trabalho gere resultado rapido, sem enrolacao.`,
    })),
    proof: [
      {
        title: "Trabalhamos com negocios do seu segmento",
        metric: "Experiencia",
        description: `Ja ajudamos empresas de ${category} a aparecer mais e atrair mais clientes sem precisar de grandes investimentos.`,
      },
      {
        title: "Plano feito para o seu negocio, nao um pacote generico",
        metric: "Personalizacao",
        description: "Cada proposta e montada com base no que encontramos — sem solucao de prateleira.",
      },
    ],
    offer: {
      title: "Proximo passo",
      summary: `A ideia e simples: resolver os pontos que estao fazendo clientes de ${business.name} escolherem a concorrencia.`,
      expectedResult: "Mais pessoas te encontrando, mais pessoas te escolhendo, mais clientes novos entrando.",
      riskOfInaction: "Do jeito que esta, o negocio continua perdendo clientes que ja estao prontos para contratar — so que estao indo para o concorrente.",
    },
    cta: {
      title: responseMode === "form" ? "Me conta um pouco mais" : "Vamos conversar?",
      primaryLabel: responseMode === "form" ? "Enviar" : "Quero saber mais",
      secondaryLabel: responseMode === "form" ? null : "Agora nao",
      microcopy: "Se fizer sentido, o proximo passo e simples: responder agora. A gente entra em contato para explicar tudo direitinho.",
      trustLine: "Sem compromisso",
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
  pontosFortes: Array.isArray(content?.pontosFortes) && content.pontosFortes.length > 0
    ? content.pontosFortes.slice(0, 4).map((item) => String(item))
    : (fallback.pontosFortes || []),
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
  concorrente: Array.isArray(content?.concorrente) && content.concorrente.length > 0
    ? content.concorrente.slice(0, 4).map((item) => ({
        vantagem: String(item?.vantagem || "A concorrencia esta na frente em visibilidade."),
        impacto: String(item?.impacto || "Clientes em potencial escolhem quem aparece primeiro."),
      }))
    : (fallback.concorrente || []),
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
      formSlug,
      formSchemaId,
      formFields,
      whatsappButtonLabel,
    } = await req.json();

    const { user, svc } = await getAuthenticatedUserContext(req, { requireBillingAccess: true });
    const llm = await resolveUserLLM(svc, user.id, provider);

    const selectedTemplate = normalizeTemplate(template);
    const selectedTone = normalizeTone(tone);
    const selectedMode = normalizeResponseMode(responseMode);
    const companyName = String(profile?.company_name || "Nossa Empresa");
    const whatsappUrl = makeWhatsappUrl(profile?.phone, companyName, business?.name);
    const services = firstItems(dna?.services, ["Diagnostico comercial", "Reposicionamento digital", "Conversao"]);
    const differentials = firstItems(dna?.differentials, ["Execucao consultiva", "Velocidade de entrega"]);
    const pains = firstItems(dna?.priority_pains, ["perda de leads", "baixa conversao"]);

    const systemPrompt = `Voce cria apresentacoes de venda em linguagem simples para donos de pequenos negocios.
Retorne apenas JSON valido no schema abaixo. Sem HTML, sem markdown.

{
  "hero": { "eyebrow": "", "headline": "", "subheadline": "", "miniSummary": "" },
  "executiveSummary": { "title": "O que encontramos", "bullets": ["", "", ""] },
  "diagnosis": { "title": "A situacao atual", "summary": "", "riskStatement": "" },
  "pontosFortes": ["", ""],
  "googleMapsInsight": { "title": "No Google", "insight": "", "impact": "" },
  "websiteInsight": { "title": "No site", "insight": "", "impact": "" },
  "opportunities": [{ "title": "", "impact": "", "urgency": "", "opportunity": "" }],
  "concorrente": [{ "vantagem": "", "impacto": "" }],
  "solutionMapping": [{ "problem": "", "service": "", "benefit": "" }],
  "differentials": [{ "title": "", "description": "" }],
  "proof": [{ "title": "", "metric": "", "description": "" }],
  "offer": { "title": "Proximo passo", "summary": "", "expectedResult": "", "riskOfInaction": "" },
  "cta": { "title": "", "primaryLabel": "", "secondaryLabel": "", "microcopy": "", "trustLine": "" }
}

REGRAS DE LINGUAGEM (CRITICO):
- Escreva como se estivesse explicando para alguem que nunca usou internet profissionalmente.
- PROIBIDO usar qualquer termo tecnico: pixel, funil, CTR, SEO, UX, taxa de conversao, ranquear, bounce rate, landing page, lead, call to action, otimizacao, trafego pago, organico, algoritmo, engajamento, KPI, ROI, metricas, copy, inbound, outbound, remarketing, SERP, indexar, crawl.
- Substitua termos tecnicos por linguagem do dia a dia:
  * "SEO" -> "aparecer no Google quando alguem pesquisa"
  * "site com baixa conversao" -> "site que nao convence as pessoas a ligar ou visitar"
  * "trafego" -> "pessoas que visitam o site"
  * "funil" -> "caminho que o cliente faz ate comprar"
  * "pixel" -> (nao mencionar)
  * "lead" -> "cliente em potencial" ou "pessoa interessada"
- Tom direto, humano e consultivo. Nao e auditoria, e conversa de parceiro de negocio.
- PORTUGUES DO BRASIL PERFEITO: gramatica, acentuacao, concordancia. Sem typos.

REGRAS DE CONTEUDO:
- pontosFortes: 2 a 3 frases curtas sobre o que o negocio ja faz bem (nao invente — baseie no que existir na ANALISE ou diga algo generico positivo sobre o segmento).
- concorrente: 2 a 3 vantagens que concorrentes do mesmo segmento tipicamente tem. Nao cite nomes reais de empresas. Use "a concorrencia" ou "outros do seu ramo".
- opportunities: 2 a 4 problemas reais encontrados, descritos em linguagem simples.
- solutionMapping: 2 a 4 itens ligando cada problema ao servico do DNA.
- differentials: 2 a 3 diferenciais do vendedor descritos de forma humana (quem somos).
- proof: 1 a 2 cards de prova (cases, segmentos atendidos, resultados tipicos). Nao invente numeros.
- ANTI-ALUCINACAO: Nao invente dados que nao estejam na ANALISE. Se faltar dado, use linguagem generica do mercado.`;

    const userPrompt = `QUEM ESTA VENDENDO:
- Nome da empresa: ${companyName}
- O que oferece: ${services.join(", ")}
- Diferenciais: ${differentials.join(", ")}
- Para quem atende: ${String(dna?.target_audience || "Nao informado")}
- Proposta de valor: ${String(dna?.value_proposition || "Nao informado")}
- Problemas que resolve: ${pains.join(", ")}
- Objecoes comuns: ${firstItems(dna?.common_objections, []).join(", ") || "Nao informado"}
- Como responde objecoes: ${String(dna?.objection_responses || "Nao informado")}
- Pacotes/ofertas: ${String(dna?.offer_packages || "Nao informado")}
- Garantia oferecida: ${String(dna?.guarantee || "Nao informado")}
- Resultados de clientes anteriores: ${String(dna?.case_metrics || "Nao informado")}

NEGOCIO ANALISADO (o potencial cliente):
- Nome: ${String(business?.name || "Empresa analisada")}
- Tipo de negocio: ${String(business?.category || "Nao informado")}
- Endereco: ${String(business?.address || "Nao informado")}
- Site: ${String(business?.website || "Sem site")}
- Nota no Google: ${String(business?.rating || "Nao informado")}

O QUE ENCONTRAMOS NA ANALISE:
${JSON.stringify(analysis || {}, null, 2)}

COMO O CLIENTE VAI RESPONDER:
- Modo: ${selectedMode}
- Formulario: ${String(formTemplateName || "Nao informado")}
- Campos: ${String(formTemplateBody || "Nome, WhatsApp, Email, principal desafio, objetivo")}

INSTRUCOES ADICIONAIS:
${String(customInstructions || "Nenhuma")}

Escreva em linguagem simples, sem termos tecnicos. O dono do negocio precisa entender sem precisar pesquisar o significado das palavras.`;

    const fallbackContent = buildFallbackContent({
      analysis: analysis || {},
      business: business || {},
      dna: dna || null,
      tone: selectedTone,
      responseMode: selectedMode,
    });
    if (whatsappButtonLabel && selectedMode !== "form") {
      fallbackContent.cta.primaryLabel = whatsappButtonLabel;
    }

    let generatedContent: PresentationContentV2;

    try {
      const rawContent = await callLLMJson<Partial<PresentationContentV2>>(
        llm,
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
      formSlug: formSlug || null,
      formSchemaId: formSchemaId || null,
      formFields: Array.isArray(formFields) ? formFields : null,
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
