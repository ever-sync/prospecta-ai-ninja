import {
  PresentationClientLogo,
  PresentationContentV2,
  PresentationRenderContext,
  PresentationRenderResult,
  PresentationSocialProof,
} from "./presentation-types.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const ensureImageSrc = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 200) {
    return `data:image/png;base64,${trimmed}`;
  }
  return null;
};

const getInitials = (value: unknown) => {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "EP";
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
};

const hexToRgb = (hex: string): string => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return "239, 51, 51";
  return `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`;
};

// ─── Accent per skin ─────────────────────────────────────────────────────────

const getAccent = (
  template: PresentationTemplateSkin,
  customAccent?: string | null,
): string => {
  if (template === "custom" && customAccent) return customAccent;
  return "#EF3333"; // all skins use red as accent
};

// ─── Score helpers ───────────────────────────────────────────────────────────

const scoreEntries = (analysis: Record<string, unknown>) => {
  const scores = (analysis?.scores as Record<string, unknown>) || {};
  return [
    {
      label: "Aparece no Google",
      value: Math.min(100, Math.max(0, Number(scores.seo || 0))),
      desc: "Quantas pessoas conseguem encontrar esse negócio quando pesquisam no Google.",
    },
    {
      label: "Velocidade do Site",
      value: Math.min(100, Math.max(0, Number(scores.speed || 0))),
      desc: "Se o site abre rápido ou faz o cliente desistir antes de ver o que o negócio oferece.",
    },
    {
      label: "Facilidade de Uso",
      value: Math.min(100, Math.max(0, Number(scores.layout || 0))),
      desc: "Se o site é fácil de entender e convence quem visita a entrar em contato.",
    },
    {
      label: "Passa Confiança",
      value: Math.min(100, Math.max(0, Number(scores.security || 0))),
      desc: "Se o site dá segurança para quem acessa — fundamental para o cliente não ir embora.",
    },
    {
      label: "Nota Geral",
      value: Math.min(100, Math.max(0, Number(scores.overall || 0))),
      desc: "Como o negócio está se saindo no ambiente digital como um todo.",
    },
  ];
};

const scoreStatus = (v: number) =>
  v >= 70
    ? { label: "Bom", cls: "green", color: "#22c55e" }
    : v >= 40
    ? { label: "Pode Melhorar", cls: "yellow", color: "#f59e0b" }
    : { label: "Precisa Melhorar", cls: "red", color: "#EF3333" };

// ─── Solution icons (cycle through a set) ────────────────────────────────────

const SOLUTION_ICONS = [
  `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
  `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
];

const ABOUT_ICONS = [
  `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 15z"/></svg>`,
];

// ─── Main render function ─────────────────────────────────────────────────────

export function renderPresentationHtml(
  contentOrContext: PresentationContentV2 | PresentationRenderContext,
  maybeContext?: PresentationRenderContext,
): PresentationRenderResult {
  // Support both call signatures:
  //   renderPresentationHtml(content, context)  ← used by generate-presentation
  //   renderPresentationHtml(context)            ← future-proof
  let content: PresentationContentV2 | null;
  let context: PresentationRenderContext;
  if (maybeContext !== undefined) {
    content = contentOrContext as PresentationContentV2;
    context = maybeContext;
  } else {
    context = contentOrContext as PresentationRenderContext;
    content = (context.analysis?.presentation_content ||
      context.analysis?.content) as PresentationContentV2 | null;
  }

  const accent = getAccent(context.template, context.dna?.custom_button_color);
  const accentRgb = hexToRgb(accent);

  const business = context.business;
  const businessName = escapeHtml(business.name || "Empresa");
  const companyName = escapeHtml(context.companyName || "Nossa Empresa");
  const logoSrc = ensureImageSrc(context.logoUrl);

  const googleMapsImg = ensureImageSrc(context.assets?.googleMaps?.src);
  const websiteImg = ensureImageSrc(context.assets?.website?.src);

  const usedGoogleMaps = Boolean(googleMapsImg);
  const usedWebsite = Boolean(websiteImg);
  const usedLogo = Boolean(logoSrc);

  const scores = scoreEntries(context.analysis || {});
  const testimonials = (context.testimonials || []).filter(
    (t) => String(t?.testimonial || "").trim(),
  );
  const clientLogos = (context.clientLogos || []).filter((l) =>
    ensureImageSrc(l.logo_url),
  );

  const whatsappUrl = context.whatsappUrl || "#";
  const ctaPrimary = escapeHtml(
    content?.cta?.primaryLabel || "Quero resolver isso",
  );
  const ctaSecondary = escapeHtml(
    content?.cta?.secondaryLabel || "Agora Não",
  );

  // ── Build section HTML ──────────────────────────────────────────────────────

  const heroSection = buildHero(content, businessName, accent);
  const diagSection = buildDiagnosis(content);
  const scoresSection = buildScores(scores, googleMapsImg, websiteImg, businessName, business.category);
  const problemsSection = buildProblems(content);
  const solutionsSection = buildSolutions(content);
  const quemSomosSection = buildQuemSomos(content, context, testimonials, clientLogos, accent);
  const nextStepSection = buildNextStep(content, businessName);
  const ctaSection = buildCta(content, whatsappUrl, ctaPrimary, ctaSecondary, context.responseMode, context, accent);

  const css = buildCss(accent, accentRgb);
  const js = buildJs(accentRgb);

  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="${companyName}" class="nav__logo" />`
    : `<div class="nav__logo" style="background:${accent};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:16px;">${escapeHtml(companyName.slice(0, 2).toUpperCase())}</div>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Análise para ${businessName} | ${companyName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>${css}</style>
</head>
<body>

  <!-- NAVIGATION -->
  <nav class="nav" id="nav">
    <div class="nav__inner">
      <div class="nav__brand">
        ${logoHtml}
        <span class="nav__name">${companyName}</span>
      </div>
      <div class="nav__links" id="navLinks">
        <a href="#hero" class="nav__link active" data-section="hero">Início</a>
        <a href="#diagnostico" class="nav__link" data-section="diagnostico">Diagnóstico</a>
        <a href="#scores" class="nav__link" data-section="scores">Ambiente Digital</a>
        <a href="#problemas" class="nav__link" data-section="problemas">Problemas</a>
        <a href="#solucoes" class="nav__link" data-section="solucoes">Soluções</a>
        <a href="#quem-somos" class="nav__link" data-section="quem-somos">Quem Somos</a>
        <a href="#cta" class="nav__link nav__link--cta">Quero Resolver Isso</a>
      </div>
      <button class="nav__toggle" id="navToggle" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>

  ${heroSection}
  ${diagSection}
  ${scoresSection}
  ${problemsSection}
  ${solutionsSection}
  ${quemSomosSection}
  ${nextStepSection}
  ${ctaSection}

  <!-- FOOTER -->
  <footer class="footer">
    <div class="container footer__inner">
      <div class="footer__brand">
        ${logoSrc ? `<img src="${logoSrc}" alt="${companyName}" />` : ""}
        <span>${companyName}</span>
      </div>
      <p class="footer__copy">Análise personalizada para ${businessName}</p>
    </div>
  </footer>

  <script>${js}</script>
</body>
</html>`;

  return {
    html,
    assetsUsed: {
      googleMapsScreenshot: usedGoogleMaps,
      websiteScreenshot: usedWebsite,
      logo: usedLogo,
    },
    fallbacksUsed: [
      ...(usedGoogleMaps ? [] : ["google-maps-screenshot"]),
      ...(usedWebsite ? [] : ["website-screenshot"]),
    ],
  };
}

// ─── Section builders ─────────────────────────────────────────────────────────

function buildHero(
  content: PresentationContentV2 | null,
  businessName: string,
  accent: string,
): string {
  const eyebrow = escapeHtml(content?.hero?.eyebrow || "Análise do Negócio");
  const headline = escapeHtml(
    content?.hero?.headline || `${businessName} tem oportunidade real de crescer.`,
  );
  const subheadline = escapeHtml(
    content?.hero?.subheadline ||
      "Esta análise mostra exatamente onde estão os problemas e o que podemos fazer juntos.",
  );
  const miniSummary = escapeHtml(
    content?.hero?.miniSummary ||
      "Com ajustes simples, dá para capturar muito mais dos clientes que já passam perto do negócio.",
  );

  return `
  <section class="hero" id="hero">
    <div class="hero__bg">
      <div class="hero__orb hero__orb--1"></div>
      <div class="hero__orb hero__orb--2"></div>
      <div class="hero__orb hero__orb--3"></div>
    </div>
    <div class="container hero__content">
      <div class="hero__badge reveal">
        <span class="badge badge--red">${eyebrow}</span>
        <span class="badge badge--outline">Lead: ${businessName}</span>
      </div>
      <h1 class="hero__title reveal reveal--delay-1">
        ${headline.replace(businessName, `<span class="text-gradient">${businessName}</span>`)}
      </h1>
      <p class="hero__subtitle reveal reveal--delay-2">${subheadline}</p>
      <div class="hero__cards reveal reveal--delay-3">
        <div class="mini-card">
          <div class="mini-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
          <h3>Leitura Rápida</h3>
          <p>${escapeHtml(content?.executiveSummary?.title || "Encontramos pontos que precisam de atenção. A boa notícia é que dá para resolver — e é isso que vamos mostrar aqui.")}</p>
        </div>
        <div class="mini-card">
          <div class="mini-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <h3>Risco Comercial</h3>
          <p>${miniSummary}</p>
        </div>
      </div>
      <a href="#diagnostico" class="hero__scroll reveal reveal--delay-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        <span>Veja a análise completa</span>
      </a>
    </div>
  </section>`;
}

function buildDiagnosis(content: PresentationContentV2 | null): string {
  const diagTitle = escapeHtml(
    content?.diagnosis?.title || "A situação atual da empresa",
  );
  const diagSummary = escapeHtml(
    content?.diagnosis?.summary || "O negócio tem oportunidade real de atrair mais clientes com ajustes simples.",
  );
  const diagRisk = escapeHtml(
    content?.diagnosis?.riskStatement ||
      "Do jeito que está hoje, o negócio não está aproveitando todas as pessoas que já estão procurando pelo que ele oferece.",
  );

  const bullets = (content?.executiveSummary?.bullets || []).slice(0, 4);
  const bulletHtml = bullets.length > 0
    ? bullets.map((b) => `
        <li>
          <span class="diag-dot"></span>
          <span>${escapeHtml(b)}</span>
        </li>`).join("")
    : `<li><span class="diag-dot"></span><span>${diagSummary}</span></li>`;

  const pontosFortes = content?.pontosFortes || [];
  const positiveHtml = pontosFortes.length > 0
    ? `
    <div class="positive-card reveal">
      <div class="positive-card__header">
        <span class="positive-card__tag">Pontos Positivos</span>
        <h3>O que já está funcionando bem</h3>
      </div>
      <div class="positive-card__items">
        ${pontosFortes.map((p) => `
          <div class="positive-item">
            <span class="check-icon">&#10003;</span>
            <span>${escapeHtml(p)}</span>
          </div>`).join("")}
      </div>
    </div>`
    : "";

  return `
  <section class="section" id="diagnostico">
    <div class="container">
      <div class="section__header reveal">
        <span class="section__tag">Diagnóstico</span>
        <h2 class="section__title">${diagTitle}</h2>
      </div>
      <div class="diag-grid">
        <div class="diag-card diag-card--main reveal">
          <span class="diag-card__label">A Situação da Empresa</span>
          <ul class="diag-list">${bulletHtml}</ul>
        </div>
        <div class="diag-card diag-card--side reveal reveal--delay-1">
          <span class="diag-card__label">O Que Está Acontecendo</span>
          <p class="diag-card__highlight">${diagRisk}</p>
          <p class="diag-card__text">Com pequenos ajustes, dá para capturar muito mais dos clientes que já passam perto do negócio.</p>
        </div>
      </div>
      ${positiveHtml}
    </div>
  </section>`;
}

function buildScores(
  scores: ReturnType<typeof scoreEntries>,
  googleMapsImg: string | null,
  websiteImg: string | null,
  businessName: string,
  category?: string | null,
): string {
  const scoreCardsHtml = scores.map((s, i) => {
    const status = scoreStatus(s.value);
    const delay = i < 3 ? (i === 0 ? "" : ` reveal--delay-${i}`) : "";
    return `
      <div class="score-card reveal${delay}" data-score="${s.value}" data-status="${status.cls}">
        <div class="score-card__top">
          <span class="score-card__label">${escapeHtml(s.label)}</span>
          <span class="score-card__value" data-count="${s.value}">0</span>
        </div>
        <div class="score-bar">
          <div class="score-bar__fill" data-width="${Math.max(4, s.value)}" style="--bar-color: ${status.color};"></div>
        </div>
        <p class="score-card__desc">${escapeHtml(s.desc)}</p>
        <span class="score-badge score-badge--${status.cls}">${status.label}</span>
      </div>`;
  }).join("");

  const cat = escapeHtml(category || "seu segmento");

  const googleMapsCard = `
    <div class="visual-card">
      <span class="visual-card__tag">No Google</span>
      <h3>Como o negócio aparece no Google</h3>
      <div class="visual-card__img">
        ${googleMapsImg
          ? `<img src="${googleMapsImg}" alt="Google Maps ${businessName}" loading="lazy" />`
          : `<div style="height:200px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;">Imagem não disponível</div>`}
      </div>
      <p>Quando alguém pesquisa por ${cat} na região, a forma como o negócio aparece influencia muito se a pessoa vai ligar ou escolher outro.</p>
      <p class="text-muted">Se a aparência no Google não passa confiança, as pessoas escolhem quem parece mais seguro — mesmo que o seu serviço seja melhor.</p>
    </div>`;

  const websiteCard = `
    <div class="visual-card">
      <span class="visual-card__tag">No Site</span>
      <h3>O site do negócio hoje</h3>
      <div class="visual-card__img">
        ${websiteImg
          ? `<img src="${websiteImg}" alt="Site ${businessName}" loading="lazy" />`
          : `<div style="height:200px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;">Imagem não disponível</div>`}
      </div>
      <p>O site é como a vitrine do negócio na internet. Ele precisa deixar claro o que você faz e facilitar o contato.</p>
      <p class="text-muted">Quando isso não acontece, as pessoas visitam, ficam confusas e vão embora sem entrar em contato.</p>
    </div>`;

  return `
  <section class="section section--dark" id="scores">
    <div class="container">
      <div class="section__header reveal">
        <span class="section__tag">Ambiente Digital</span>
        <h2 class="section__title">O que encontramos no ambiente digital</h2>
        <p class="section__desc">Cada item abaixo mostra como o negócio está se saindo — e o que isso significa na prática para os clientes.</p>
      </div>
      <div class="scores-grid">${scoreCardsHtml}</div>
      <div class="visual-grid reveal">
        ${googleMapsCard}
        ${websiteCard}
      </div>
    </div>
  </section>`;
}

function buildProblems(content: PresentationContentV2 | null): string {
  const concorrentes = content?.concorrente || [];
  const warningHtml = concorrentes.length > 0
    ? `
    <div class="section__header reveal">
      <span class="section__tag section__tag--yellow">Atenção</span>
      <h2 class="section__title">Onde a concorrência está na sua frente</h2>
      <p class="section__desc">Enquanto você lê isso, outros negócios do mesmo ramo estão aproveitando essas vantagens.</p>
    </div>
    <div class="warning-grid reveal">
      ${concorrentes.slice(0, 4).map((c) => `
        <div class="warning-card">
          <span class="warning-icon">&#9888;</span>
          <div>
            <strong>${escapeHtml(c.vantagem)}</strong>
            <p>${escapeHtml(c.impacto)}</p>
          </div>
        </div>`).join("")}
    </div>`
    : "";

  const opportunities = content?.opportunities || [];
  const urgencyToBadge = (urgency: string) => {
    const u = (urgency || "").toLowerCase();
    if (u.includes("alta") || u.includes("alto")) return { cls: "high", label: "Alta" };
    if (u.includes("média") || u.includes("media") || u.includes("médio")) return { cls: "medium", label: "Média" };
    return { cls: "medium", label: "Média" };
  };

  const problemCardsHtml = opportunities.slice(0, 6).map((opp, i) => {
    const badge = urgencyToBadge(opp.urgency || "");
    const num = String(i + 1).padStart(2, "0");
    return `
      <div class="problem-card reveal${i > 0 ? ` reveal--delay-${Math.min(i, 3)}` : ""}">
        <div class="problem-card__header">
          <span class="problem-card__number">${num}</span>
          <span class="problem-badge problem-badge--${badge.cls}">${badge.label}</span>
        </div>
        <h3>${escapeHtml(opp.title)}</h3>
        <div class="problem-card__detail">
          <p><strong>O que isso causa:</strong> ${escapeHtml(opp.impact)}</p>
          <p><strong>Como resolver:</strong> ${escapeHtml(opp.opportunity)}</p>
        </div>
      </div>`;
  }).join("");

  const problemsHeader = warningHtml
    ? `<div class="section__header reveal" style="margin-top: 80px;"><span class="section__tag">Barreiras</span><h2 class="section__title">O que está travando o crescimento</h2></div>`
    : `<div class="section__header reveal"><span class="section__tag">Barreiras</span><h2 class="section__title">O que está travando o crescimento</h2></div>`;

  return `
  <section class="section" id="problemas">
    <div class="container">
      ${warningHtml}
      ${problemsHeader}
      <div class="problems-grid">${problemCardsHtml}</div>
    </div>
  </section>`;
}

function buildSolutions(content: PresentationContentV2 | null): string {
  const solutions = content?.solutionMapping || [];

  const cardsHtml = solutions.slice(0, 6).map((s, i) => {
    const icon = SOLUTION_ICONS[i % SOLUTION_ICONS.length];
    return `
      <div class="solution-card reveal${i > 0 ? ` reveal--delay-${Math.min(i, 3)}` : ""}">
        <div class="solution-card__icon">${icon}</div>
        <span class="solution-card__problem">Problema: ${escapeHtml(s.problem)}</span>
        <h3>${escapeHtml(s.service)}</h3>
        <p>${escapeHtml(s.benefit)}</p>
      </div>`;
  }).join("");

  return `
  <section class="section section--dark" id="solucoes">
    <div class="container">
      <div class="section__header reveal">
        <span class="section__tag">Soluções</span>
        <h2 class="section__title">O que podemos melhorar juntos</h2>
      </div>
      <div class="solutions-grid">${cardsHtml}</div>
    </div>
  </section>`;
}

function buildQuemSomos(
  content: PresentationContentV2 | null,
  context: PresentationRenderContext,
  testimonials: PresentationSocialProof[],
  clientLogos: PresentationClientLogo[],
  accent: string,
): string {
  const differentials = content?.differentials || [];

  const featuresHtml = differentials.slice(0, 4).map((d, i) => {
    const icon = ABOUT_ICONS[i % ABOUT_ICONS.length];
    return `
      <div class="about-feature">
        <div class="about-feature__icon">${icon}</div>
        <div>
          <h4>${escapeHtml(d.title)}</h4>
          <p>${escapeHtml(d.description)}</p>
        </div>
      </div>`;
  }).join("");

  // First testimonial as featured card
  const featuredTestimonial = testimonials[0];
  const testimonialHtml = featuredTestimonial
    ? (() => {
        const imgSrc = ensureImageSrc(featuredTestimonial.image_url);
        const author = escapeHtml(featuredTestimonial.name || featuredTestimonial.company || "Cliente");
        const company = featuredTestimonial.company ? escapeHtml(featuredTestimonial.company) : "";
        const text = escapeHtml(String(featuredTestimonial.testimonial || "").trim());
        const avatarHtml = imgSrc
          ? `<img src="${imgSrc}" alt="${author}" />`
          : `<div style="width:52px;height:52px;border-radius:50%;background:var(--accent-glow);display:flex;align-items:center;justify-content:center;color:var(--accent);font-weight:800;font-size:18px;">${escapeHtml(getInitials(featuredTestimonial.name || featuredTestimonial.company || "C"))}</div>`;
        return `
          <div class="testimonial-card">
            <div class="testimonial-card__quote">"</div>
            <p class="testimonial-card__text">"${text}"</p>
            <div class="testimonial-card__author">
              ${avatarHtml}
              <div>
                <strong>${author}</strong>
                ${company ? `<span>${company}</span>` : ""}
              </div>
            </div>
          </div>`;
      })()
    : "";

  // Proof cards
  const proofItems = content?.proof || [];
  const extraCardsHtml = proofItems.slice(0, 2).map((p) => `
    <div class="about-extra__card">
      <span class="about-extra__tag">${escapeHtml(p.title)}</span>
      ${p.metric ? `<h4>${escapeHtml(p.metric)}</h4>` : ""}
      <p>${escapeHtml(p.description)}</p>
    </div>`).join("") ||
    `<div class="about-extra__card">
      <span class="about-extra__tag">Experiência</span>
      <h4>Trabalhamos com negócios do seu segmento</h4>
      <p>Já ajudamos empresas a aparecer mais e atrair mais clientes sem precisar de grandes investimentos.</p>
    </div>
    <div class="about-extra__card">
      <span class="about-extra__tag">Personalização</span>
      <h4>Plano feito para o seu negócio, não um pacote genérico</h4>
      <p>Cada proposta é montada com base no que encontramos — sem solução de prateleira.</p>
    </div>`;

  const logosHtml = clientLogos.length > 0
    ? `
      <div class="client-logos">
        ${clientLogos.slice(0, 6).map((l) => {
          const src = ensureImageSrc(l.logo_url);
          return src ? `<img src="${src}" alt="${escapeHtml(l.company_name || "Cliente")}" />` : "";
        }).join("")}
      </div>`
    : "";

  // Additional testimonials (2nd onwards)
  const extraTestimonialsHtml = testimonials.slice(1, 4).map((t) => {
    const imgSrc = ensureImageSrc(t.image_url);
    const author = escapeHtml(t.name || t.company || "Cliente");
    const company = t.company ? escapeHtml(t.company) : "";
    const text = escapeHtml(String(t.testimonial || "").trim());
    const avatarHtml = imgSrc
      ? `<img src="${imgSrc}" alt="${author}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--border);" />`
      : `<div style="width:44px;height:44px;border-radius:50%;background:var(--accent-glow);display:flex;align-items:center;justify-content:center;color:var(--accent);font-weight:800;font-size:15px;flex-shrink:0;">${escapeHtml(getInitials(t.name || t.company || "C"))}</div>`;
    return `
      <div style="display:flex;gap:14px;padding:20px;border-radius:16px;background:var(--bg-card);border:1px solid var(--border);">
        ${avatarHtml}
        <div>
          <p style="color:var(--text-primary);font-size:14px;line-height:1.7;margin-bottom:8px;">"${text}"</p>
          <strong style="font-size:13px;color:var(--text-secondary);">${author}${company ? " · " + company : ""}</strong>
        </div>
      </div>`;
  }).join("");

  const companyNameLabel = escapeHtml(context.companyName || "Nossa Empresa");

  return `
  <section class="section" id="quem-somos">
    <div class="container">
      <div class="section__header reveal">
        <span class="section__tag">Quem Somos</span>
        <h2 class="section__title">Por que a ${companyNameLabel}?</h2>
      </div>
      <div class="about-grid">
        <div class="about-features reveal">${featuresHtml}</div>
        <div class="about-social reveal reveal--delay-1">
          ${testimonialHtml}
          <div class="about-extra">${extraCardsHtml}</div>
          ${logosHtml}
          ${extraTestimonialsHtml ? `<div style="display:grid;gap:12px;margin-top:16px;">${extraTestimonialsHtml}</div>` : ""}
        </div>
      </div>
    </div>
  </section>`;
}

function buildNextStep(
  content: PresentationContentV2 | null,
  businessName: string,
): string {
  const offerTitle = escapeHtml(
    content?.offer?.summary ||
      `A ideia é simples: resolver os pontos que estão fazendo clientes de ${businessName} escolherem a concorrência.`,
  );
  const expectedResult = escapeHtml(
    content?.offer?.expectedResult ||
      "Mais pessoas te encontrando, mais pessoas te escolhendo, mais clientes novos entrando.",
  );
  const riskOfInaction = escapeHtml(
    content?.offer?.riskOfInaction ||
      "Do jeito que está, o negócio continua perdendo clientes que já estão prontos para contratar — só que estão indo para o concorrente.",
  );

  return `
  <section class="section section--dark" id="proximo-passo">
    <div class="container">
      <div class="next-step reveal">
        <span class="section__tag">Próximo Passo</span>
        <h2 class="next-step__title">${offerTitle}</h2>
        <div class="next-step__cards">
          <div class="next-step__card next-step__card--green">
            <span class="next-step__card-label">Resultado Esperado</span>
            <p>${expectedResult}</p>
          </div>
          <div class="next-step__card next-step__card--red">
            <span class="next-step__card-label">Se Nada Mudar</span>
            <p>${riskOfInaction}</p>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function buildCta(
  content: PresentationContentV2 | null,
  whatsappUrl: string,
  ctaPrimary: string,
  ctaSecondary: string,
  responseMode: string,
  context: PresentationRenderContext,
  accent: string,
): string {
  const title = escapeHtml(
    content?.cta?.title ||
      "Quer saber como resolver esses pontos de forma simples e rápida?",
  );
  const microcopy = escapeHtml(
    content?.cta?.microcopy ||
      "Se fizer sentido, o próximo passo é simples: responder agora. A gente entra em contato para explicar tudo direitinho.",
  );
  const trust = escapeHtml(content?.cta?.trustLine || "");

  const whatsappSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 0 0 .611.611l4.458-1.495A11.96 11.96 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.37 0-4.567-.82-6.3-2.19l-.44-.37-3.26 1.093 1.093-3.26-.37-.44A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>`;

  let buttonsHtml = "";
  if (responseMode === "form") {
    const fields = [
      "Nome completo",
      "WhatsApp",
      "Email",
      "Principal desafio",
    ];
    const publicId = escapeHtml(context.publicId || "");
    buttonsHtml = `
      <form class="cta-form" id="ctaForm" style="max-width:480px;margin:0 auto 24px;display:grid;gap:14px;">
        ${fields.map((f) => `<input class="cta-input" type="text" placeholder="${escapeHtml(f)}" name="${escapeHtml(f.toLowerCase().replace(/\s+/g, "_"))}" required style="width:100%;padding:16px 20px;border-radius:16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);color:#f8fafc;font-size:16px;outline:none;" />`).join("")}
        <input type="hidden" name="public_id" value="${publicId}" />
        <button type="submit" class="btn btn--primary btn--lg" style="width:100%;justify-content:center;">
          ${whatsappSvg} ${ctaPrimary}
        </button>
      </form>`;
  } else {
    buttonsHtml = `
      <div class="cta-buttons">
        <a href="${escapeHtml(whatsappUrl)}" class="btn btn--primary btn--lg" id="btnAccept" target="_blank" rel="noopener noreferrer">
          ${whatsappSvg} ${ctaPrimary}
        </a>
        <button class="btn btn--outline btn--lg" id="btnReject">${ctaSecondary}</button>
      </div>`;
  }

  return `
  <section class="cta-section" id="cta">
    <div class="cta-section__bg">
      <div class="cta-orb cta-orb--1"></div>
      <div class="cta-orb cta-orb--2"></div>
    </div>
    <div class="container">
      <div class="cta-content reveal">
        <span class="section__tag">Vamos Conversar?</span>
        <h2 class="cta-content__title">${title}</h2>
        <p class="cta-content__desc">${microcopy}</p>
        ${buttonsHtml}
        <div class="cta-meta">
          <span>Resposta em menos de 10 segundos</span>
          <span>Sem compromisso</span>
          ${trust ? `<span>${trust}</span>` : ""}
        </div>
      </div>
    </div>
  </section>`;
}

// ─── CSS builder ──────────────────────────────────────────────────────────────

function buildCss(accent: string, accentRgb: string): string {
  return `/* Reset */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
:root{
--bg-primary:#080c18;
--bg-secondary:#0c111f;
--bg-card:#10182b;
--bg-card-inner:#0f1422;
--text-primary:#f8fafc;
--text-secondary:#cbd5e1;
--text-muted:#94a3b8;
--accent:${accent};
--accent-glow:rgba(${accentRgb},0.25);
--green:#22c55e;
--yellow:#f59e0b;
--border:rgba(148,163,184,0.12);
--border-hover:rgba(148,163,184,0.25);
--shadow:0 24px 52px rgba(2,6,23,0.42);
--radius-sm:12px;--radius-md:20px;--radius-lg:28px;--radius-xl:34px;
--font-body:'Inter',-apple-system,'Segoe UI',sans-serif;
--font-heading:'Sora','Inter',sans-serif;
--transition:0.4s cubic-bezier(0.16,1,0.3,1);
}
html{scroll-behavior:smooth;scroll-padding-top:80px;}
body{font-family:var(--font-body);background:var(--bg-primary);color:var(--text-primary);line-height:1.7;overflow-x:hidden;-webkit-font-smoothing:antialiased;}
.container{max-width:1140px;margin:0 auto;padding:0 24px;}
img{max-width:100%;height:auto;display:block;}
a{text-decoration:none;color:inherit;}
.reveal{opacity:0;transform:translateY(40px);transition:opacity 0.8s cubic-bezier(0.16,1,0.3,1),transform 0.8s cubic-bezier(0.16,1,0.3,1);}
.reveal.is-visible{opacity:1;transform:translateY(0);}
.reveal--delay-1{transition-delay:0.15s;}
.reveal--delay-2{transition-delay:0.3s;}
.reveal--delay-3{transition-delay:0.45s;}
/* NAV */
.nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:16px 0;transition:background 0.3s,backdrop-filter 0.3s,box-shadow 0.3s;}
.nav.is-scrolled{background:rgba(8,12,24,0.85);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);box-shadow:0 1px 0 var(--border);}
.nav__inner{max-width:1140px;margin:0 auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between;}
.nav__brand{display:flex;align-items:center;gap:12px;}
.nav__logo{width:40px;height:40px;border-radius:12px;background:#fff;padding:6px;object-fit:contain;}
.nav__name{font-family:var(--font-heading);font-weight:700;font-size:20px;color:var(--text-primary);}
.nav__links{display:flex;align-items:center;gap:8px;}
.nav__link{padding:8px 16px;font-size:14px;font-weight:500;color:var(--text-secondary);border-radius:999px;transition:color var(--transition),background var(--transition);}
.nav__link:hover,.nav__link.active{color:var(--text-primary);background:rgba(255,255,255,0.06);}
.nav__link--cta{background:var(--accent)!important;color:#fff!important;font-weight:600;padding:10px 22px;}
.nav__link--cta:hover{background:color-mix(in srgb,var(--accent) 80%,#000)!important;transform:scale(1.02);}
.nav__toggle{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:8px;}
.nav__toggle span{display:block;width:24px;height:2px;background:var(--text-primary);border-radius:2px;transition:var(--transition);}
/* HERO */
.hero{position:relative;min-height:100vh;display:flex;align-items:center;padding:120px 0 80px;overflow:hidden;}
.hero__bg{position:absolute;inset:0;overflow:hidden;}
.hero__orb{position:absolute;border-radius:50%;filter:blur(120px);opacity:0.4;animation:float 20s ease-in-out infinite;}
.hero__orb--1{width:600px;height:600px;background:var(--accent);top:-200px;right:-200px;animation-delay:0s;}
.hero__orb--2{width:400px;height:400px;background:#3b82f6;bottom:-100px;left:-100px;animation-delay:-7s;}
.hero__orb--3{width:300px;height:300px;background:#8b5cf6;top:50%;left:50%;animation-delay:-14s;}
@keyframes float{0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(30px,-30px) scale(1.05);}66%{transform:translate(-20px,20px) scale(0.95);}}
.hero__content{position:relative;z-index:1;}
.hero__badge{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:32px;}
.badge{display:inline-flex;align-items:center;padding:8px 18px;border-radius:999px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;}
.badge--red{background:var(--accent-glow);color:var(--accent);border:1px solid rgba(${accentRgb},0.3);}
.badge--outline{background:rgba(255,255,255,0.04);color:var(--text-secondary);border:1px solid var(--border);}
.hero__title{font-family:var(--font-heading);font-size:clamp(36px,5vw,64px);font-weight:800;line-height:1.05;max-width:900px;margin-bottom:24px;}
.text-gradient{background:linear-gradient(135deg,var(--accent) 0%,#f97316 50%,#fbbf24 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hero__subtitle{font-size:clamp(17px,2vw,21px);color:var(--text-secondary);max-width:780px;line-height:1.7;margin-bottom:40px;}
.hero__cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-bottom:48px;}
.mini-card{padding:28px;border-radius:var(--radius-lg);background:rgba(16,24,43,0.7);backdrop-filter:blur(12px);border:1px solid var(--border);transition:border-color var(--transition),transform var(--transition);}
.mini-card:hover{border-color:var(--border-hover);transform:translateY(-4px);}
.mini-card__icon{width:48px;height:48px;border-radius:14px;background:var(--accent-glow);display:flex;align-items:center;justify-content:center;color:var(--accent);margin-bottom:16px;}
.mini-card h3{font-family:var(--font-heading);font-size:16px;font-weight:700;margin-bottom:8px;color:var(--text-primary);}
.mini-card p{font-size:14px;color:var(--text-secondary);line-height:1.7;}
.hero__scroll{display:inline-flex;align-items:center;gap:10px;color:var(--text-muted);font-size:14px;font-weight:500;transition:color var(--transition);animation:bounce 2s ease-in-out infinite;}
.hero__scroll:hover{color:var(--text-primary);}
@keyframes bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(8px);}}
/* SECTIONS */
.section{padding:100px 0;position:relative;}
.section--dark{background:var(--bg-secondary);}
.section__header{text-align:center;margin-bottom:56px;}
.section__tag{display:inline-flex;padding:8px 18px;border-radius:999px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--accent);background:var(--accent-glow);border:1px solid rgba(${accentRgb},0.2);margin-bottom:20px;}
.section__tag--yellow{color:var(--yellow);background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.25);}
.section__title{font-family:var(--font-heading);font-size:clamp(28px,3.5vw,44px);font-weight:800;line-height:1.1;margin-bottom:16px;}
.section__desc{font-size:18px;color:var(--text-secondary);max-width:640px;margin:0 auto;line-height:1.7;}
/* DIAGNOSIS */
.diag-grid{display:grid;grid-template-columns:1.2fr 0.8fr;gap:24px;margin-bottom:40px;}
.diag-card{padding:36px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);box-shadow:var(--shadow);transition:border-color var(--transition),transform var(--transition);}
.diag-card:hover{border-color:var(--border-hover);transform:translateY(-2px);}
.diag-card__label{display:inline-block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;color:var(--accent);margin-bottom:20px;}
.diag-list{list-style:none;display:grid;gap:18px;}
.diag-list li{display:flex;gap:14px;align-items:flex-start;color:var(--text-secondary);line-height:1.7;}
.diag-dot{display:inline-flex;margin-top:8px;width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;}
.diag-card__highlight{font-size:20px;line-height:1.4;color:var(--text-primary);margin-bottom:16px;}
.diag-card__text{color:var(--text-secondary);line-height:1.8;}
.positive-card{padding:36px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);box-shadow:var(--shadow);}
.positive-card__header{margin-bottom:24px;}
.positive-card__tag{display:inline-block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;color:var(--green);margin-bottom:10px;}
.positive-card__header h3{font-family:var(--font-heading);font-size:24px;font-weight:700;}
.positive-card__items{display:grid;gap:16px;}
.positive-item{display:flex;gap:14px;align-items:flex-start;color:var(--text-secondary);line-height:1.7;}
.check-icon{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--green);color:#fff;font-size:14px;font-weight:700;flex-shrink:0;margin-top:2px;}
/* SCORES */
.scores-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:56px;}
.score-card{padding:28px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);box-shadow:var(--shadow);transition:border-color var(--transition),transform var(--transition);}
.score-card:hover{border-color:var(--border-hover);transform:translateY(-4px);}
.score-card__top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
.score-card__label{font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-secondary);font-weight:600;}
.score-card__value{font-family:var(--font-heading);font-size:28px;font-weight:800;color:var(--text-primary);}
.score-bar{height:8px;border-radius:999px;background:var(--bg-primary);overflow:hidden;margin-bottom:16px;}
.score-bar__fill{height:100%;border-radius:999px;background:var(--bar-color,var(--accent));width:0;transition:width 1.5s cubic-bezier(0.16,1,0.3,1);}
.score-card__desc{font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px;}
.score-badge{display:inline-flex;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;}
.score-badge--green{background:rgba(34,197,94,0.15);color:var(--green);}
.score-badge--red{background:rgba(${accentRgb},0.15);color:var(--accent);}
.score-badge--yellow{background:rgba(245,158,11,0.15);color:var(--yellow);}
.visual-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.visual-card{padding:32px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);box-shadow:var(--shadow);}
.visual-card__tag{display:inline-block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;color:var(--accent);margin-bottom:12px;}
.visual-card h3{font-family:var(--font-heading);font-size:24px;font-weight:700;margin-bottom:20px;}
.visual-card__img{border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--border);margin-bottom:20px;background:#fff;}
.visual-card__img img{width:100%;transition:transform 0.6s ease;}
.visual-card:hover .visual-card__img img{transform:scale(1.03);}
.visual-card p{color:var(--text-primary);line-height:1.8;margin-bottom:10px;}
.text-muted{color:var(--text-secondary)!important;}
/* WARNINGS */
.warning-grid{display:grid;gap:16px;margin-bottom:40px;}
.warning-card{display:flex;gap:18px;align-items:flex-start;padding:24px;border-radius:var(--radius-md);background:var(--bg-card);border:1px solid rgba(245,158,11,0.2);transition:border-color var(--transition),transform var(--transition);}
.warning-card:hover{border-color:rgba(245,158,11,0.4);transform:translateX(4px);}
.warning-icon{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:rgba(245,158,11,0.15);color:var(--yellow);font-size:18px;flex-shrink:0;}
.warning-card strong{display:block;color:var(--text-primary);font-size:16px;margin-bottom:6px;line-height:1.5;}
.warning-card p{color:var(--text-secondary);font-size:14px;line-height:1.7;}
/* PROBLEMS */
.problems-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px;}
.problem-card{padding:32px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);box-shadow:var(--shadow);transition:border-color var(--transition),transform var(--transition);}
.problem-card:hover{border-color:var(--accent);transform:translateY(-4px);}
.problem-card__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.problem-card__number{font-family:var(--font-heading);font-size:36px;font-weight:800;color:rgba(${accentRgb},0.3);}
.problem-badge{padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;}
.problem-badge--high{background:rgba(${accentRgb},0.15);color:var(--accent);}
.problem-badge--medium{background:rgba(245,158,11,0.15);color:var(--yellow);}
.problem-card h3{font-family:var(--font-heading);font-size:20px;font-weight:700;margin-bottom:16px;line-height:1.3;}
.problem-card__detail p{color:var(--text-secondary);line-height:1.7;margin-bottom:8px;font-size:15px;}
.problem-card__detail strong{color:var(--text-primary);}
/* SOLUTIONS */
.solutions-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px;}
.solution-card{padding:36px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);box-shadow:var(--shadow);transition:border-color var(--transition),transform var(--transition);position:relative;overflow:hidden;}
.solution-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),#f97316);opacity:0;transition:opacity var(--transition);}
.solution-card:hover{border-color:var(--border-hover);transform:translateY(-4px);}
.solution-card:hover::before{opacity:1;}
.solution-card__icon{width:56px;height:56px;border-radius:16px;background:var(--accent-glow);display:flex;align-items:center;justify-content:center;color:var(--accent);margin-bottom:20px;}
.solution-card__problem{display:block;font-size:13px;color:var(--text-muted);margin-bottom:12px;line-height:1.6;}
.solution-card h3{font-family:var(--font-heading);font-size:22px;font-weight:700;margin-bottom:12px;line-height:1.3;}
.solution-card p{color:var(--text-secondary);line-height:1.7;font-size:15px;}
/* ABOUT */
.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;}
.about-features{display:grid;gap:20px;}
.about-feature{display:flex;gap:18px;padding:28px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);transition:border-color var(--transition),transform var(--transition);}
.about-feature:hover{border-color:var(--border-hover);transform:translateX(4px);}
.about-feature__icon{width:52px;height:52px;border-radius:14px;background:var(--accent-glow);display:flex;align-items:center;justify-content:center;color:var(--accent);flex-shrink:0;}
.about-feature h4{font-family:var(--font-heading);font-size:17px;font-weight:700;margin-bottom:6px;}
.about-feature p{color:var(--text-secondary);font-size:14px;line-height:1.7;}
.testimonial-card{position:relative;padding:36px;border-radius:var(--radius-xl);background:var(--bg-card);border:1px solid var(--border);box-shadow:var(--shadow);margin-bottom:20px;overflow:hidden;}
.testimonial-card::before{content:'';position:absolute;bottom:-40px;left:-40px;width:160px;height:160px;border-radius:50%;background:var(--accent-glow);filter:blur(60px);opacity:0.4;}
.testimonial-card__quote{position:absolute;top:16px;right:28px;font-size:72px;color:var(--accent);opacity:0.15;font-family:var(--font-heading);line-height:1;}
.testimonial-card__text{position:relative;font-family:var(--font-heading);font-size:clamp(18px,2vw,24px);line-height:1.5;color:var(--text-primary);margin-bottom:28px;}
.testimonial-card__author{position:relative;display:flex;align-items:center;gap:14px;}
.testimonial-card__author img{width:52px;height:52px;border-radius:50%;object-fit:cover;border:3px solid var(--bg-card);box-shadow:var(--shadow);}
.testimonial-card__author strong{display:block;font-size:16px;color:var(--text-primary);}
.testimonial-card__author span{display:block;font-size:14px;color:var(--text-secondary);margin-top:2px;}
.about-extra{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;}
.about-extra__card{padding:24px;border-radius:var(--radius-md);background:var(--bg-card);border:1px solid var(--border);}
.about-extra__tag{display:inline-block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--accent);margin-bottom:10px;}
.about-extra__card h4{font-family:var(--font-heading);font-size:16px;font-weight:700;margin-bottom:8px;line-height:1.3;}
.about-extra__card p{color:var(--text-secondary);font-size:14px;line-height:1.7;}
.client-logos{display:flex;flex-wrap:wrap;gap:14px;}
.client-logos img{max-height:36px;max-width:120px;object-fit:contain;padding:14px 20px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-card-inner);transition:border-color var(--transition);}
.client-logos img:hover{border-color:var(--border-hover);}
/* NEXT STEP */
.next-step{text-align:center;}
.next-step__title{font-family:var(--font-heading);font-size:clamp(26px,3vw,38px);font-weight:800;line-height:1.15;max-width:800px;margin:20px auto 36px;}
.next-step__cards{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:800px;margin:0 auto;}
.next-step__card{padding:28px;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);text-align:left;}
.next-step__card--green{border-color:rgba(34,197,94,0.3);}
.next-step__card--red{border-color:rgba(${accentRgb},0.3);}
.next-step__card-label{display:inline-block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--text-secondary);margin-bottom:14px;}
.next-step__card p{color:var(--text-primary);line-height:1.75;}
/* CTA */
.cta-section{position:relative;padding:120px 0;overflow:hidden;}
.cta-section__bg{position:absolute;inset:0;background:linear-gradient(135deg,#111827 0%,#1d2742 55%,#30131a 100%);}
.cta-orb{position:absolute;border-radius:50%;filter:blur(100px);opacity:0.3;}
.cta-orb--1{width:500px;height:500px;background:var(--accent);top:-200px;right:-100px;}
.cta-orb--2{width:400px;height:400px;background:#3b82f6;bottom:-200px;left:-100px;}
.cta-content{position:relative;z-index:1;text-align:center;max-width:720px;margin:0 auto;}
.cta-content__title{font-family:var(--font-heading);font-size:clamp(26px,3.5vw,40px);font-weight:800;line-height:1.15;margin:20px 0 16px;}
.cta-content__desc{font-size:18px;color:var(--text-secondary);line-height:1.8;margin-bottom:36px;}
.cta-buttons{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-bottom:24px;}
.btn{display:inline-flex;align-items:center;gap:10px;padding:14px 28px;border-radius:var(--radius-md);font-size:16px;font-weight:700;cursor:pointer;transition:all var(--transition);border:none;font-family:var(--font-body);}
.btn--primary{background:var(--accent);color:#fff;box-shadow:0 8px 32px rgba(${accentRgb},0.35);}
.btn--primary:hover{filter:brightness(0.88);transform:translateY(-2px);box-shadow:0 12px 40px rgba(${accentRgb},0.45);}
.btn--outline{background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);}
.btn--outline:hover{border-color:var(--border-hover);background:rgba(16,24,43,0.8);}
.btn--lg{padding:18px 36px;font-size:17px;border-radius:var(--radius-md);}
.cta-meta{display:flex;flex-wrap:wrap;gap:24px;justify-content:center;color:var(--text-muted);font-size:14px;}
.cta-meta span{display:flex;align-items:center;gap:6px;}
.cta-meta span::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--green);}
.cta-input:focus{border-color:var(--accent)!important;outline:none;}
/* FOOTER */
.footer{padding:32px 0;border-top:1px solid var(--border);background:var(--bg-primary);}
.footer__inner{display:flex;align-items:center;justify-content:space-between;}
.footer__brand{display:flex;align-items:center;gap:10px;}
.footer__brand img{width:32px;height:32px;border-radius:10px;background:#fff;padding:4px;}
.footer__brand span{font-family:var(--font-heading);font-weight:700;font-size:16px;}
.footer__copy{font-size:14px;color:var(--text-muted);}
/* SCROLLBAR */
::-webkit-scrollbar{width:8px;}
::-webkit-scrollbar-track{background:var(--bg-primary);}
::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:4px;}
::-webkit-scrollbar-thumb:hover{background:rgba(148,163,184,0.35);}
/* PARTICLES & PROGRESS */
#particles{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0.4;}
.progress-bar{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,var(--accent),#f97316);z-index:1001;transition:width 0.1s linear;}
/* RESPONSIVE */
@media(max-width:960px){
.nav__links{position:fixed;top:0;right:-100%;width:280px;height:100vh;background:var(--bg-card);flex-direction:column;padding:80px 24px 32px;gap:4px;transition:right var(--transition);box-shadow:-10px 0 40px rgba(0,0,0,0.5);z-index:999;}
.nav__links.is-open{right:0;}
.nav__toggle{display:flex;z-index:1001;}
.nav__link{width:100%;padding:14px 18px;border-radius:var(--radius-sm);}
.diag-grid,.visual-grid,.about-grid,.next-step__cards{grid-template-columns:1fr;}
.about-extra{grid-template-columns:1fr;}
.hero{padding:100px 0 60px;}
.section{padding:72px 0;}
}
@media(max-width:640px){
.hero__title{font-size:32px;}
.hero__cards{grid-template-columns:1fr;}
.scores-grid{grid-template-columns:1fr 1fr;}
.problems-grid,.solutions-grid{grid-template-columns:1fr;}
.cta-buttons{flex-direction:column;}
.btn--lg{width:100%;justify-content:center;}
.footer__inner{flex-direction:column;gap:12px;text-align:center;}
}`;
}

// ─── JS builder ───────────────────────────────────────────────────────────────

function buildJs(accentRgb: string): string {
  return `
(function(){var bar=document.createElement('div');bar.className='progress-bar';document.body.prepend(bar);window.addEventListener('scroll',function(){var s=window.scrollY,d=document.documentElement.scrollHeight-window.innerHeight;bar.style.width=(d>0?s/d*100:0)+'%';});})();
(function(){var canvas=document.createElement('canvas');canvas.id='particles';document.body.prepend(canvas);var ctx=canvas.getContext('2d'),w,h,pts;function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight;}function init(){var n=Math.min(60,Math.floor(w*h/20000));pts=[];for(var i=0;i<n;i++)pts.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*1.5+.5,o:Math.random()*.5+.1});}function draw(){ctx.clearRect(0,0,w,h);pts.forEach(function(p){p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(${accentRgb},'+p.o+')';ctx.fill();});for(var i=0;i<pts.length;i++){for(var j=i+1;j<pts.length;j++){var dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<150){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle='rgba(${accentRgb},'+(0.06*(1-d/150))+')';ctx.lineWidth=.5;ctx.stroke();}}}requestAnimationFrame(draw);}resize();init();draw();window.addEventListener('resize',function(){resize();init();});})();
(function(){var nav=document.getElementById('nav'),toggle=document.getElementById('navToggle'),links=document.getElementById('navLinks'),navLinks=document.querySelectorAll('.nav__link');window.addEventListener('scroll',function(){nav.classList.toggle('is-scrolled',window.scrollY>50);});toggle.addEventListener('click',function(){links.classList.toggle('is-open');var s=toggle.querySelectorAll('span');if(links.classList.contains('is-open')){s[0].style.transform='rotate(45deg) translate(5px,5px)';s[1].style.opacity='0';s[2].style.transform='rotate(-45deg) translate(5px,-5px)';}else{s[0].style.transform='';s[1].style.opacity='';s[2].style.transform='';}});navLinks.forEach(function(link){link.addEventListener('click',function(){links.classList.remove('is-open');var s=toggle.querySelectorAll('span');s[0].style.transform='';s[1].style.opacity='';s[2].style.transform='';});});var sections=document.querySelectorAll('section[id]');var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){var id=e.target.id;navLinks.forEach(function(l){l.classList.toggle('active',l.dataset.section===id);});}});},{threshold:0.3});sections.forEach(function(s){obs.observe(s);});})();
(function(){var reveals=document.querySelectorAll('.reveal');var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-visible');obs.unobserve(e.target);}});},{threshold:0.1,rootMargin:'0px 0px -60px 0px'});reveals.forEach(function(el){obs.observe(el);});})();
(function(){var counters=document.querySelectorAll('.score-card__value'),bars=document.querySelectorAll('.score-bar__fill');var obs=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){var el=e.target;if(el.classList.contains('score-card__value')){var target=parseInt(el.dataset.count,10),cur=0,inc=target/60;var t=setInterval(function(){cur+=inc;if(cur>=target){cur=target;clearInterval(t);}el.textContent=Math.round(cur);},25);}if(el.classList.contains('score-bar__fill')){setTimeout(function(){el.style.width=el.dataset.width+'%';},200);}obs.unobserve(el);}});},{threshold:0.5});counters.forEach(function(el){obs.observe(el);});bars.forEach(function(el){obs.observe(el);});})();
(function(){var cards=document.querySelectorAll('.score-card,.solution-card,.problem-card');cards.forEach(function(card){card.addEventListener('mousemove',function(e){var r=card.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,cx=r.width/2,cy=r.height/2;card.style.transform='perspective(1000px) rotateX('+((y-cy)/cy*-3)+'deg) rotateY('+((x-cx)/cx*3)+'deg) translateY(-4px)';});card.addEventListener('mouseleave',function(){card.style.transform='';});});})();
document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var t=document.querySelector(this.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth',block:'start'});});});
(function(){var g=document.querySelector('.text-gradient');if(g)setInterval(function(){g.style.filter='brightness(1.2)';setTimeout(function(){g.style.filter='brightness(1)';},1000);},3000);})();
(function(){var orbs=document.querySelectorAll('.hero__orb');window.addEventListener('mousemove',function(e){var x=(e.clientX/window.innerWidth-.5)*2,y=(e.clientY/window.innerHeight-.5)*2;orbs.forEach(function(orb,i){var sp=(i+1)*15;orb.style.transform='translate('+(x*sp)+'px,'+(y*sp)+'px)';});});})();
`;
}
