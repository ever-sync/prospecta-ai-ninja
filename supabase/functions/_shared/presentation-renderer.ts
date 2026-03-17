import {
  PresentationClientLogo,
  PresentationContentV2,
  PresentationRenderContext,
  PresentationRenderResult,
  PresentationSocialProof,
  PresentationTemplateSkin,
} from "./presentation-types.ts";

type TemplateTokens = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  border: string;
  success: string;
  danger: string;
  warning: string;
  shadow: string;
  heroBackground: string;
  fontHeading: string;
  fontBody: string;
};

const DEFAULT_FORM_FIELDS = [
  "Nome completo",
  "WhatsApp",
  "Email",
  "Principal desafio",
  "Objetivo nos proximos 90 dias",
];

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const ensureImageSrc = (value: unknown) => {
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
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "EP";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
};

const scoreToColor = (score: number, tokens: TemplateTokens) => {
  if (score < 40) return tokens.danger;
  if (score < 70) return tokens.warning;
  return tokens.success;
};

const scoreToLabel = (score: number) => {
  if (score < 40) return "Precisa melhorar";
  if (score < 70) return "Pode melhorar";
  return "Bom";
};

const getTokens = (
  template: PresentationTemplateSkin,
  customColors?: { bg?: string | null; text?: string | null; accent?: string | null },
): TemplateTokens => {
  if (template === "custom") {
    return {
      background: customColors?.bg || "#0c0c1d",
      surface: "rgba(255,255,255,0.08)",
      surfaceMuted: "rgba(255,255,255,0.04)",
      text: customColors?.text || "#ffffff",
      muted: "rgba(255,255,255,0.74)",
      accent: customColors?.accent || "#EF3333",
      accentSoft: "rgba(239,51,51,0.18)",
      border: "rgba(255,255,255,0.16)",
      success: "#16a34a",
      danger: "#EF3333",
      warning: "#f59e0b",
      shadow: "0 22px 52px rgba(8, 8, 18, 0.28)",
      heroBackground: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(239,51,51,0.18))",
      fontHeading: "'Sora', 'Segoe UI', sans-serif",
      fontBody: "'Manrope', 'Segoe UI', sans-serif",
    };
  }

  const presets: Record<Exclude<PresentationTemplateSkin, "custom">, TemplateTokens> = {
    "modern-dark": {
      background: "#0c111f",
      surface: "#10182b",
      surfaceMuted: "#0f1422",
      text: "#f8fafc",
      muted: "#cbd5e1",
      accent: "#EF3333",
      accentSoft: "rgba(239,51,51,0.16)",
      border: "rgba(148,163,184,0.18)",
      success: "#22c55e",
      danger: "#EF3333",
      warning: "#f59e0b",
      shadow: "0 24px 52px rgba(2, 6, 23, 0.42)",
      heroBackground: "linear-gradient(135deg, #111827 0%, #1d2742 55%, #30131a 100%)",
      fontHeading: "'Sora', 'Segoe UI', sans-serif",
      fontBody: "'Manrope', 'Segoe UI', sans-serif",
    },
    "clean-light": {
      background: "#f8fafc",
      surface: "#ffffff",
      surfaceMuted: "#f1f5f9",
      text: "#0f172a",
      muted: "#475569",
      accent: "#EF3333",
      accentSoft: "rgba(239,51,51,0.1)",
      border: "rgba(15,23,42,0.08)",
      success: "#16a34a",
      danger: "#dc2626",
      warning: "#d97706",
      shadow: "0 18px 46px rgba(15, 23, 42, 0.08)",
      heroBackground: "linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, #fff1f2 100%)",
      fontHeading: "'Fraunces', Georgia, serif",
      fontBody: "'Manrope', 'Segoe UI', sans-serif",
    },
    corporate: {
      background: "#f4f7fb",
      surface: "#ffffff",
      surfaceMuted: "#eef3f9",
      text: "#102033",
      muted: "#566476",
      accent: "#EF3333",
      accentSoft: "rgba(239,51,51,0.08)",
      border: "rgba(16,32,51,0.08)",
      success: "#15803d",
      danger: "#dc2626",
      warning: "#ca8a04",
      shadow: "0 18px 38px rgba(16, 32, 51, 0.08)",
      heroBackground: "linear-gradient(135deg, #ffffff 0%, #e9f0fb 65%, #fff2f4 100%)",
      fontHeading: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
      fontBody: "'Inter', 'Segoe UI', sans-serif",
    },
    "bold-gradient": {
      background: "#0f1020",
      surface: "rgba(18,22,39,0.92)",
      surfaceMuted: "rgba(255,255,255,0.06)",
      text: "#f8fafc",
      muted: "#dbe1f0",
      accent: "#EF3333",
      accentSoft: "rgba(239,51,51,0.18)",
      border: "rgba(255,255,255,0.14)",
      success: "#22c55e",
      danger: "#fb7185",
      warning: "#fbbf24",
      shadow: "0 30px 70px rgba(15, 16, 32, 0.45)",
      heroBackground: "linear-gradient(135deg, #13142a 0%, #27346f 40%, #571725 100%)",
      fontHeading: "'Space Grotesk', 'Segoe UI', sans-serif",
      fontBody: "'Manrope', 'Segoe UI', sans-serif",
    },
  };

  return presets[template];
};

const scoreEntries = (analysis: Record<string, any>) => {
  const scores = analysis?.scores || {};
  return [
    { key: "Aparece no Google", value: Number(scores.seo || 0), description: "Quantas pessoas conseguem encontrar esse negocio quando pesquisam no Google." },
    { key: "Velocidade do site", value: Number(scores.speed || 0), description: "Se o site abre rapido ou faz o cliente desistir antes de ver o que o negocio oferece." },
    { key: "Facilidade de uso", value: Number(scores.layout || 0), description: "Se o site e facil de entender e convence quem visita a entrar em contato." },
    { key: "Passa confianca", value: Number(scores.security || 0), description: "Se o site da seguranca para quem acessa — fundamental para o cliente nao ir embora." },
    { key: "Nota geral", value: Number(scores.overall || 0), description: "Como o negocio esta se saindo no ambiente digital como um todo." },
  ];
};

const renderBulletList = (items: string[], tokens: TemplateTokens) =>
  items
    .map(
      (item) => `
        <li style="display:flex; gap:12px; align-items:flex-start; color:${tokens.text};">
          <span style="display:inline-flex; margin-top:6px; width:8px; height:8px; border-radius:999px; background:${tokens.accent}; flex:none;"></span>
          <span style="color:${tokens.muted}; line-height:1.7;">${escapeHtml(item)}</span>
        </li>`,
    )
    .join("");

const renderFallbackCard = (
  title: string,
  meta: string[],
  body: string,
  tokens: TemplateTokens,
) => `
  <div class="v2-fallback-card" style="border:1px solid ${tokens.border}; border-radius:28px; background:${tokens.surfaceMuted}; padding:24px; box-shadow:${tokens.shadow}; min-height:280px;">
    <div class="v2-fallback-head" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <div>
        <p style="margin:0; font-size:12px; text-transform:uppercase; letter-spacing:0.16em; color:${tokens.muted};">Fallback visual</p>
        <h3 style="margin:8px 0 0; font-size:26px; line-height:1.2; color:${tokens.text};">${escapeHtml(title)}</h3>
      </div>
      <div style="width:58px; height:58px; border-radius:18px; background:${tokens.accentSoft}; display:flex; align-items:center; justify-content:center; color:${tokens.accent}; font-size:28px;">▣</div>
    </div>
    <div class="v2-fallback-meta" style="display:grid; gap:10px; margin-top:22px;">
      ${meta
        .filter(Boolean)
        .map(
          (item) => `
            <div style="padding:12px 14px; border-radius:16px; background:${tokens.surface}; border:1px solid ${tokens.border}; color:${tokens.muted}; font-size:14px;">
              ${escapeHtml(item)}
            </div>`,
        )
        .join("")}
    </div>
    <p style="margin:18px 0 0; color:${tokens.muted}; line-height:1.7;">${escapeHtml(body)}</p>
  </div>
`;

const renderProofLogos = (logos: PresentationClientLogo[], tokens: TemplateTokens) => {
  const valid = logos.filter((item) => ensureImageSrc(item.logo_url));
  if (valid.length === 0) return "";

  return `
    <div class="v2-logos-grid" style="display:flex; flex-wrap:wrap; gap:14px; margin-top:24px;">
      ${valid
        .slice(0, 8)
        .map((logo) => {
          const src = ensureImageSrc(logo.logo_url);
          return `
            <div class="v2-logo-card" style="display:flex; align-items:center; justify-content:center; min-width:120px; min-height:68px; padding:16px 18px; border:1px solid ${tokens.border}; border-radius:18px; background:${tokens.surfaceMuted};">
              <img src="${src}" alt="${escapeHtml(logo.company_name || "Cliente")}" style="max-height:34px; max-width:120px; object-fit:contain;" />
            </div>`;
        })
        .join("")}
    </div>
  `;
};

const renderTestimonialsCarousel = (
  testimonials: PresentationSocialProof[],
  tokens: TemplateTokens,
) => {
  const valid = testimonials
    .filter((item) => String(item?.testimonial || "").trim())
    .slice(0, 6);

  if (valid.length === 0) return "";

  const avatarCluster = valid
    .slice(0, 3)
    .map((item, index) => {
      const image = ensureImageSrc(item.image_url);
      const label = escapeHtml(item.name || item.company || "Cliente");
      const commonStyle =
        `width:52px;height:52px;border-radius:999px;border:3px solid ${tokens.surface};box-shadow:${tokens.shadow};background:${tokens.surfaceMuted};display:flex;align-items:center;justify-content:center;font-weight:800;color:${tokens.text};overflow:hidden;margin-left:${index === 0 ? 0 : -14}px;`;

      if (image) {
        return `<img src="${image}" alt="${label}" style="${commonStyle} object-fit:cover;" />`;
      }

      return `<div aria-label="${label}" style="${commonStyle}">${escapeHtml(getInitials(item.name || item.company || "Cliente"))}</div>`;
    })
    .join("");

  const slides = valid
    .map((item, index) => {
      const image = ensureImageSrc(item.image_url);
      const author = escapeHtml(item.name || item.company || "Cliente");
      const company = item.company ? escapeHtml(item.company) : "";
      const testimonial = escapeHtml(String(item.testimonial || "").trim());
      const avatar = image
        ? `<img src="${image}" alt="${author}" style="width:64px;height:64px;border-radius:999px;object-fit:cover;border:3px solid ${tokens.surface};box-shadow:${tokens.shadow};" />`
        : `<div style="width:64px;height:64px;border-radius:999px;border:3px solid ${tokens.surface};background:${tokens.accentSoft};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:${tokens.accent};">${escapeHtml(getInitials(item.name || item.company || "Cliente"))}</div>`;

      return `
        <article
          class="v2-testimonial-slide${index === 0 ? " is-active" : ""}"
          data-testimonial-slide
          style="display:${index === 0 ? "block" : "none"};"
        >
          <div style="position:absolute; top:22px; right:28px; color:${tokens.accent}; font-size:58px; line-height:1; opacity:0.18;">"</div>
          <p style="margin:0; padding-right:34px; text-align:center; font-size:clamp(24px, 3vw, 32px); line-height:1.55; color:${tokens.text}; font-family:${tokens.fontHeading};">
            "${testimonial}"
          </p>
          <div class="v2-testimonial-author" style="display:flex; align-items:center; justify-content:center; gap:16px; margin-top:28px; flex-wrap:wrap;">
            ${avatar}
            <div style="text-align:left;">
              <strong style="display:block; font-size:17px; color:${tokens.text};">${author}</strong>
              ${company ? `<span style="display:block; margin-top:4px; font-size:14px; color:${tokens.muted};">${company}</span>` : ""}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  const dots = valid
    .map(
      (_, index) => `
        <button
          type="button"
          class="v2-testimonial-dot${index === 0 ? " is-active" : ""}"
          data-testimonial-dot="${index}"
          aria-label="Ir para depoimento ${index + 1}"
          style="width:10px;height:10px;border-radius:999px;border:none;padding:0;cursor:pointer;background:${index === 0 ? tokens.accent : tokens.border};"
        ></button>`,
    )
    .join("");

  const helperText = valid.length > 1
    ? `${valid.length}+ depoimentos reais cadastrados`
    : "Depoimento real cadastrado";

  return `
    <div
      class="v2-testimonial-carousel"
      data-testimonial-carousel
      style="position:relative; margin-top:22px; padding:34px 28px 26px; border-radius:34px; border:1px solid ${tokens.border}; background:${tokens.surface}; box-shadow:${tokens.shadow}; overflow:hidden;"
    >
      <div style="position:absolute; inset:auto auto 0 -40px; width:180px; height:180px; border-radius:999px; background:${tokens.accentSoft}; filter:blur(16px); opacity:0.6;"></div>
      <div style="position:relative; z-index:1;">
        ${slides}
        <div class="v2-testimonial-footer" style="display:flex; align-items:center; justify-content:center; gap:18px; margin-top:28px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center;">${avatarCluster}</div>
          <strong style="font-size:16px; color:${tokens.accent};">${escapeHtml(helperText)}</strong>
        </div>
        ${
          valid.length > 1
            ? `<div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-top:18px;">${dots}</div>`
            : ""
        }
      </div>
    </div>
    <script>
      (function () {
        const carousels = document.querySelectorAll("[data-testimonial-carousel]");
        carousels.forEach(function (carousel) {
          const slides = Array.from(carousel.querySelectorAll("[data-testimonial-slide]"));
          const dots = Array.from(carousel.querySelectorAll("[data-testimonial-dot]"));
          if (slides.length <= 1) return;
          let activeIndex = 0;
          let timerId;

          const showSlide = function (index) {
            activeIndex = index;
            slides.forEach(function (slide, slideIndex) {
              const isActive = slideIndex === index;
              slide.style.display = isActive ? "block" : "none";
              slide.classList.toggle("is-active", isActive);
            });
            dots.forEach(function (dot, dotIndex) {
              const isActive = dotIndex === index;
              dot.classList.toggle("is-active", isActive);
              dot.style.background = isActive ? "${tokens.accent}" : "${tokens.border}";
            });
          };

          const schedule = function () {
            clearInterval(timerId);
            timerId = setInterval(function () {
              showSlide((activeIndex + 1) % slides.length);
            }, 4800);
          };

          dots.forEach(function (dot, index) {
            dot.addEventListener("click", function () {
              showSlide(index);
              schedule();
            });
          });

          showSlide(0);
          schedule();
        });
      })();
    </script>
  `;
};

const parseFormFields = (body?: string | null) => {
  const parsed = String(body || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed.slice(0, 5) : DEFAULT_FORM_FIELDS;
};

const renderCta = (content: PresentationContentV2, context: PresentationRenderContext, tokens: TemplateTokens) => {
  const respondUrl = `${Deno.env.get("SUPABASE_URL") || ""}/functions/v1/respond-presentation`;
  const acceptanceBody = JSON.stringify({ public_id: context.publicId, response: "accepted" });
  const rejectionBody = JSON.stringify({ public_id: context.publicId, response: "rejected" });
  const whatsappBaseUrl = context.whatsappUrl ? context.whatsappUrl.replace(/([?&])text=[^&]*/i, "").replace(/[?&]$/, "") : null;

  if (context.responseMode === "form") {
    const fields = parseFormFields(context.formTemplateBody);
    const inputs = fields
      .map((field, index) => {
        const safeField = field.replace(/[^\w\s-]/g, "").trim() || `Campo ${index + 1}`;
        const lower = safeField.toLowerCase();
        const isTextarea = /desafio|objetivo|mensagem|observa/.test(lower);
        const isEmail = /email/.test(lower);
        const isPhone = /whatsapp|telefone|fone/.test(lower);
        const required = index < 4 ? "required" : "";
        const name = `field_${index}`;
        if (isTextarea) {
          return `
            <label style="display:grid; gap:8px;">
              <span style="font-size:13px; color:${tokens.muted};">${escapeHtml(safeField)}</span>
              <textarea name="${name}" ${required} rows="4" style="width:100%; border-radius:16px; border:1px solid ${tokens.border}; padding:14px 16px; background:${tokens.surface}; color:${tokens.text}; font:inherit;"></textarea>
            </label>`;
        }
        return `
          <label style="display:grid; gap:8px;">
            <span style="font-size:13px; color:${tokens.muted};">${escapeHtml(safeField)}</span>
            <input name="${name}" ${required} type="${isEmail ? "email" : isPhone ? "tel" : "text"}" style="width:100%; border-radius:16px; border:1px solid ${tokens.border}; padding:14px 16px; background:${tokens.surface}; color:${tokens.text}; font:inherit;" />
          </label>`;
      })
      .join("");

    return `
      <div>
        <p style="color:${tokens.accent}; font-size:12px; text-transform:uppercase; letter-spacing:0.16em;">${escapeHtml(content.cta.title)}</p>
        <h2 style="margin:14px 0 0; font-family:${tokens.fontHeading}; font-size:clamp(26px,3vw,36px); line-height:1.15; color:${tokens.text};">Receba uma analise detalhada do seu negocio</h2>
        <p style="margin:14px 0 0; color:${tokens.muted}; line-height:1.8;">${escapeHtml(content.cta.microcopy)}</p>
        <form id="presentation-cta-form" style="display:grid; gap:14px; margin-top:28px; max-width:600px;">
          <div style="display:grid; gap:14px; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));">${inputs}</div>
          <button type="submit" style="margin-top:8px; border:none; border-radius:14px; padding:16px 20px; background:${tokens.accent}; color:#fff; font-weight:700; font-size:16px; cursor:pointer;">
            ${escapeHtml(content.cta.primaryLabel)}
          </button>
          <div style="display:flex; flex-wrap:wrap; gap:12px; color:${tokens.muted}; font-size:13px;">
            <span>Leva menos de 1 minuto</span>
            <span>Sem compromisso</span>
            ${content.cta.trustLine ? `<span>${escapeHtml(content.cta.trustLine)}</span>` : ""}
          </div>
        </form>
      </div>
      <script>
        (function () {
          const form = document.getElementById("presentation-cta-form");
          if (!form) return;
          form.addEventListener("submit", async function (event) {
            event.preventDefault();
            const button = form.querySelector("button[type='submit']");
            if (button) button.disabled = true;
            const data = new FormData(form);
            const lines = [];
            for (const [key, value] of data.entries()) {
              lines.push(key.replaceAll("_", " ") + ": " + value);
            }
            try {
              await fetch("${respondUrl}", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: '${acceptanceBody}',
              });
            } catch (_) {}
            const message = encodeURIComponent("Ola! Preenchi o formulario da proposta.%0A%0A" + lines.join("%0A"));
            ${whatsappBaseUrl ? `window.location.href = "${whatsappBaseUrl}${whatsappBaseUrl.includes("?") ? "&" : "?"}text=" + message;` : ""}
            form.insertAdjacentHTML("beforeend", '<p style="color:${tokens.text}; margin:0;">Recebemos seu interesse. Vamos falar.</p>');
          });
        })();
      </script>
    `;
  }

  return `
    <div>
      <p style="color:${tokens.accent}; font-size:12px; text-transform:uppercase; letter-spacing:0.16em;">${escapeHtml(content.cta.title)}</p>
      <h2 style="margin:16px 0 0; font-family:${tokens.fontHeading}; font-size:clamp(26px,3vw,36px); line-height:1.15; color:${tokens.text};">${escapeHtml(content.cta.microcopy)}</h2>
      <div style="display:flex; flex-wrap:wrap; gap:14px; margin-top:32px;">
        <button id="presentation-accept" style="flex:1 1 260px; border:none; border-radius:14px; padding:18px 24px; background:${tokens.accent}; color:#fff; font-weight:700; font-size:17px; cursor:pointer;">
          ${escapeHtml(content.cta.primaryLabel)}
        </button>
        <button id="presentation-reject" style="flex:1 1 200px; border:1px solid ${tokens.border}; border-radius:14px; padding:18px 24px; background:rgba(255,255,255,0.07); color:${tokens.text}; font-weight:600; font-size:16px; cursor:pointer;">
          ${escapeHtml(content.cta.secondaryLabel || "Agora nao")}
        </button>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:18px; color:${tokens.muted}; font-size:13px;">
        <span>Resposta em menos de 10 segundos</span>
        <span>Sem compromisso</span>
        ${content.cta.trustLine ? `<span>${escapeHtml(content.cta.trustLine)}</span>` : ""}
      </div>
      <div id="presentation-cta-feedback" style="margin-top:16px; color:${tokens.text};"></div>
    </div>
    <script>
      (function () {
        const accept = document.getElementById("presentation-accept");
        const reject = document.getElementById("presentation-reject");
        const feedback = document.getElementById("presentation-cta-feedback");
        const disable = () => {
          if (accept) accept.disabled = true;
          if (reject) reject.disabled = true;
        };
        if (accept) {
          accept.addEventListener("click", async function () {
            disable();
            try {
              await fetch("${respondUrl}", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: '${acceptanceBody}',
              });
            } catch (_) {}
            if (feedback) feedback.textContent = "Recebemos seu interesse. Vamos falar.";
            ${context.whatsappUrl ? `window.location.href = "${context.whatsappUrl}";` : ""}
          });
        }
        if (reject) {
          reject.addEventListener("click", async function () {
            disable();
            try {
              await fetch("${respondUrl}", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: '${rejectionBody}',
              });
            } catch (_) {}
            if (feedback) feedback.textContent = "Obrigado pelo retorno. Se mudar de ideia, fale com a gente.";
          });
        }
      })();
    </script>
  `;
};

export const renderPresentationHtml = (
  content: PresentationContentV2,
  context: PresentationRenderContext,
): PresentationRenderResult => {
  const tokens = getTokens(context.template, {
    bg: context.dna?.custom_bg_color as string | null | undefined,
    text: context.dna?.custom_text_color as string | null | undefined,
    accent: context.dna?.custom_button_color as string | null | undefined,
  });

  const googleScreenshot = ensureImageSrc(context.assets.googleMaps.src);
  const websiteScreenshot = ensureImageSrc(context.assets.website.src);
  const logoUrl = ensureImageSrc(context.logoUrl);
  const scores = scoreEntries(context.analysis);
  const fallbacksUsed: string[] = [];

  if (!googleScreenshot) fallbacksUsed.push("google_maps_screenshot");
  if (!websiteScreenshot) fallbacksUsed.push("website_screenshot");
  if (!logoUrl) fallbacksUsed.push("company_logo");

  const proofCards = content.proof.length > 0
    ? content.proof
        .map(
          (item) => `
            <article style="padding:22px; border-radius:22px; border:1px solid ${tokens.border}; background:${tokens.surfaceMuted};">
              <p style="margin:0; color:${tokens.accent}; font-size:13px; text-transform:uppercase; letter-spacing:0.14em;">${escapeHtml(
                item.metric || "Resultado",
              )}</p>
              <h4 style="margin:12px 0 0; font-size:22px; color:${tokens.text};">${escapeHtml(item.title)}</h4>
              <p style="margin:12px 0 0; color:${tokens.muted}; line-height:1.7;">${escapeHtml(item.description)}</p>
            </article>`,
        )
        .join("")
    : "";

  const logosBlock = renderProofLogos(context.clientLogos, tokens);
  const testimonialsBlock = renderTestimonialsCarousel(context.testimonials, tokens);

  const sec = (bg: string, inner: string, extra = "") =>
    `<section style="width:100%; background:${bg}; ${extra}"><div style="max-width:1100px; margin:0 auto; padding:80px max(6vw,28px);">${inner}</div></section>`;

  const eyebrow = (label: string, color = tokens.accent) =>
    `<p style="margin:0; color:${color}; font-size:12px; text-transform:uppercase; letter-spacing:0.18em; font-weight:700;">${label}</p>`;

  const sectionTitle = (text: string, size = "clamp(26px,3vw,36px)") =>
    `<h2 style="margin:14px 0 0; font-family:${tokens.fontHeading}; font-size:${size}; line-height:1.15; color:${tokens.text};">${escapeHtml(text)}</h2>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Analise para ${escapeHtml(context.business.name)} | ${escapeHtml(context.companyName)}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: ${tokens.fontBody}; background: ${tokens.background}; color: ${tokens.text}; }
      img { max-width: 100%; height: auto; display: block; }
      .lp-two { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; }
      .lp-three { display: grid; grid-template-columns: repeat(3,1fr); gap: 32px; }
      .lp-scores { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 18px; }
      .lp-visuals { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
      .lp-item { padding: 24px; border-radius: 16px; border: 1px solid ${tokens.border}; background: ${tokens.surfaceMuted}; }
      @media (max-width: 860px) {
        .lp-two, .lp-three, .lp-visuals { grid-template-columns: 1fr !important; }
        .lp-nav-cta { display: none !important; }
      }
      @media (max-width: 600px) {
        .lp-scores { grid-template-columns: 1fr 1fr !important; }
        .lp-sticky { left: 16px !important; right: 16px !important; width: auto !important; transform: none !important; }
      }
    </style>
  </head>
  <body>

    <!-- HEADER FIXO -->
    <header style="position:sticky; top:0; z-index:100; width:100%; background:${tokens.surface}; border-bottom:1px solid ${tokens.border}; backdrop-filter:blur(12px);">
      <div style="max-width:1100px; margin:0 auto; padding:14px max(6vw,28px); display:flex; align-items:center; justify-content:space-between; gap:16px;">
        <div style="display:flex; align-items:center; gap:14px;">
          ${logoUrl
            ? `<img src="${logoUrl}" alt="${escapeHtml(context.companyName)}" style="width:40px; height:40px; object-fit:contain; border-radius:10px; background:#fff; padding:4px;" />`
            : `<div style="width:40px; height:40px; border-radius:10px; background:${tokens.accentSoft}; display:flex; align-items:center; justify-content:center; color:${tokens.accent}; font-weight:800; font-size:18px;">${escapeHtml(context.companyName.slice(0,1) || "E")}</div>`
          }
          <div>
            <p style="font-size:15px; font-weight:700; color:${tokens.text};">${escapeHtml(context.companyName)}</p>
            <p style="font-size:12px; color:${tokens.muted}; margin-top:2px;">Preparado para ${escapeHtml(context.business.name)}</p>
          </div>
        </div>
        <a class="lp-nav-cta" href="#lp-cta" style="display:inline-flex; align-items:center; padding:10px 22px; border-radius:999px; background:${tokens.accent}; color:#fff; text-decoration:none; font-weight:700; font-size:14px;">Quero resolver isso</a>
      </div>
    </header>

    <!-- HERO -->
    ${sec(tokens.heroBackground, `
      ${eyebrow(`Fizemos uma analise especifica para ${escapeHtml(context.business.name)}`)}
      <h1 style="margin:20px 0 0; font-family:${tokens.fontHeading}; font-size:clamp(36px,5vw,64px); line-height:1.05; max-width:860px; color:${tokens.text};">${escapeHtml(content.hero.headline)}</h1>
      <p style="margin:22px 0 0; max-width:700px; font-size:clamp(17px,2vw,21px); line-height:1.65; color:${tokens.muted};">${escapeHtml(content.hero.subheadline)}</p>
      <div style="display:flex; flex-wrap:wrap; gap:16px; margin-top:36px;">
        <div style="padding:20px 24px; border-radius:16px; background:rgba(255,255,255,0.07); border:1px solid ${tokens.border}; max-width:340px;">
          <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.16em; color:${tokens.muted};">Leitura rapida</p>
          <p style="margin-top:10px; font-size:15px; line-height:1.7; color:${tokens.text};">${escapeHtml(content.hero.miniSummary)}</p>
        </div>
        <div style="padding:20px 24px; border-radius:16px; background:rgba(255,255,255,0.07); border:1px solid ${tokens.border}; max-width:340px;">
          <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.16em; color:${tokens.muted};">O que esta em jogo</p>
          <p style="margin-top:10px; font-size:15px; line-height:1.7; color:${tokens.text};">${escapeHtml(content.diagnosis.riskStatement)}</p>
        </div>
      </div>
    `, "padding-top:100px; padding-bottom:100px;")}

    <!-- SITUAÇÃO -->
    ${sec(tokens.surface, `
      <div class="lp-two">
        <div>
          ${eyebrow("A situacao da empresa")}
          ${sectionTitle(content.executiveSummary.title || "O que encontramos")}
          <ul style="list-style:none; display:grid; gap:18px; margin-top:28px;">
            ${renderBulletList(content.executiveSummary.bullets, tokens)}
          </ul>
        </div>
        <div>
          ${eyebrow("O que esta acontecendo")}
          <p style="margin-top:16px; font-size:clamp(20px,2.2vw,26px); line-height:1.4; color:${tokens.text};">${escapeHtml(content.diagnosis.summary)}</p>
          <p style="margin-top:18px; color:${tokens.muted}; line-height:1.8;">${escapeHtml(content.diagnosis.riskStatement)}</p>
        </div>
      </div>
    `)}

    ${Array.isArray(content.pontosFortes) && content.pontosFortes.length > 0 ? sec(`rgba(34,197,94,0.07)`, `
      ${eyebrow("Pontos positivos", tokens.success)}
      ${sectionTitle("O que ja esta funcionando bem")}
      <div class="lp-two" style="margin-top:32px;">
        ${content.pontosFortes.map(item => `
          <div style="display:flex; gap:14px; align-items:flex-start;">
            <span style="flex:none; width:26px; height:26px; border-radius:999px; background:${tokens.success}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:14px; font-weight:800; margin-top:2px;">✓</span>
            <p style="color:${tokens.muted}; line-height:1.75; font-size:16px;">${escapeHtml(item)}</p>
          </div>`).join("")}
      </div>
    `) : ""}

    <!-- SCORECARD -->
    ${sec(tokens.background, `
      ${eyebrow("Como o negocio aparece hoje")}
      ${sectionTitle("O que encontramos no ambiente digital")}
      <p style="margin-top:14px; color:${tokens.muted}; line-height:1.7; max-width:600px;">Cada item mostra como o negocio esta se saindo — e o que isso significa na pratica para os clientes.</p>
      <div class="lp-scores" style="margin-top:36px;">
        ${scores.map(entry => `
          <div class="lp-item">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
              <p style="font-size:14px; font-weight:600; color:${tokens.text};">${entry.key}</p>
              <span style="padding:4px 10px; border-radius:999px; background:${tokens.accentSoft}; color:${scoreToColor(entry.value, tokens)}; font-size:11px; font-weight:700; white-space:nowrap;">${scoreToLabel(entry.value)}</span>
            </div>
            <div style="height:6px; border-radius:999px; background:${tokens.border}; margin-top:14px; overflow:hidden;">
              <div style="width:${Math.max(4, Math.min(100, entry.value))}%; height:100%; background:${scoreToColor(entry.value, tokens)}; border-radius:999px;"></div>
            </div>
            <p style="margin-top:12px; color:${tokens.muted}; font-size:13px; line-height:1.6;">${escapeHtml(entry.description)}</p>
          </div>`).join("")}
      </div>
    `)}

    <!-- GOOGLE + SITE -->
    ${sec(tokens.surface, `
      <div class="lp-visuals">
        <div>
          ${eyebrow(content.googleMapsInsight.title || "No Google")}
          <h3 style="margin:12px 0 0; font-family:${tokens.fontHeading}; font-size:clamp(22px,2.5vw,28px); color:${tokens.text};">Como o negocio aparece no Google</h3>
          <div style="margin-top:20px; border-radius:18px; overflow:hidden; border:1px solid ${tokens.border};">
            ${googleScreenshot
              ? `<img src="${googleScreenshot}" alt="Google Maps ${escapeHtml(context.business.name)}" style="width:100%;" />`
              : renderFallbackCard(context.business.name, [
                  context.business.category ? `Tipo: ${context.business.category}` : "",
                  context.business.rating ? `Nota: ${context.business.rating} estrelas` : "Sem avaliacao",
                  context.business.address ? context.business.address : "",
                ], "A analise continua mesmo sem a imagem.", tokens)
            }
          </div>
          <p style="margin-top:18px; color:${tokens.text}; line-height:1.75;">${escapeHtml(content.googleMapsInsight.insight)}</p>
          <p style="margin-top:12px; color:${tokens.muted}; line-height:1.75;">${escapeHtml(content.googleMapsInsight.impact)}</p>
        </div>
        <div>
          ${eyebrow(content.websiteInsight.title || "No site")}
          <h3 style="margin:12px 0 0; font-family:${tokens.fontHeading}; font-size:clamp(22px,2.5vw,28px); color:${tokens.text};">O site do negocio hoje</h3>
          <div style="margin-top:20px; border-radius:18px; overflow:hidden; border:1px solid ${tokens.border};">
            ${websiteScreenshot
              ? `<img src="${websiteScreenshot}" alt="Site ${escapeHtml(context.business.website || context.business.name)}" style="width:100%;" />`
              : renderFallbackCard(context.business.website || "Sem site", [
                  context.business.website ? context.business.website : "Sem site cadastrado",
                  context.business.category ? context.business.category : "",
                ], context.business.website ? "A analise continua mesmo sem a imagem." : "Sem site, o negocio perde clientes que pesquisam antes de ligar.", tokens)
            }
          </div>
          <p style="margin-top:18px; color:${tokens.text}; line-height:1.75;">${escapeHtml(content.websiteInsight.insight)}</p>
          <p style="margin-top:12px; color:${tokens.muted}; line-height:1.75;">${escapeHtml(content.websiteInsight.impact)}</p>
        </div>
      </div>
    `)}

    ${Array.isArray(content.concorrente) && content.concorrente.length > 0 ? sec(`rgba(245,158,11,0.07)`, `
      ${eyebrow("Atencao", tokens.warning)}
      ${sectionTitle("Onde a concorrencia esta na sua frente")}
      <p style="margin-top:14px; color:${tokens.muted}; line-height:1.7;">Enquanto voce le isso, outros do mesmo ramo estao aproveitando essas vantagens.</p>
      <div class="lp-two" style="margin-top:32px;">
        ${content.concorrente.map(item => `
          <div style="display:flex; gap:16px; align-items:flex-start; padding:22px; border-radius:16px; border:1px solid rgba(245,158,11,0.25); background:rgba(245,158,11,0.05);">
            <span style="flex:none; width:32px; height:32px; border-radius:999px; background:rgba(245,158,11,0.18); display:flex; align-items:center; justify-content:center; color:${tokens.warning}; font-size:16px; margin-top:2px;">⚠</span>
            <div>
              <p style="font-weight:600; line-height:1.5; color:${tokens.text};">${escapeHtml(item.vantagem)}</p>
              <p style="margin-top:8px; color:${tokens.muted}; line-height:1.7; font-size:14px;">${escapeHtml(item.impacto)}</p>
            </div>
          </div>`).join("")}
      </div>
    `) : ""}

    <!-- PROBLEMAS + SOLUÇÃO -->
    ${sec(tokens.background, `
      <div class="lp-two">
        <div>
          ${eyebrow("O que esta travando o crescimento")}
          ${sectionTitle("Problemas encontrados")}
          <div style="display:grid; gap:16px; margin-top:28px;">
            ${content.opportunities.map((item, i) => `
              <div class="lp-item">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                  <strong style="font-size:16px; color:${tokens.text};">${i + 1}. ${escapeHtml(item.title)}</strong>
                  <span style="padding:5px 10px; border-radius:999px; background:${tokens.accentSoft}; color:${tokens.accent}; font-size:11px; font-weight:700;">${escapeHtml(item.urgency)}</span>
                </div>
                <p style="margin-top:10px; color:${tokens.muted}; line-height:1.7; font-size:14px;"><strong style="color:${tokens.text};">O que isso causa:</strong> ${escapeHtml(item.impact)}</p>
                <p style="margin-top:8px; color:${tokens.muted}; line-height:1.7; font-size:14px;"><strong style="color:${tokens.text};">Como resolver:</strong> ${escapeHtml(item.opportunity)}</p>
              </div>`).join("")}
          </div>
        </div>
        <div>
          ${eyebrow("O que podemos melhorar juntos")}
          ${sectionTitle("Baseado no que o seu DNA mostra")}
          <div style="display:grid; gap:16px; margin-top:28px;">
            ${content.solutionMapping.map(item => `
              <div class="lp-item">
                <p style="color:${tokens.muted}; line-height:1.7; font-size:14px;"><strong style="color:${tokens.text};">Problema:</strong> ${escapeHtml(item.problem)}</p>
                <p style="margin-top:8px; color:${tokens.muted}; line-height:1.7; font-size:14px;"><strong style="color:${tokens.text};">O que fazemos:</strong> ${escapeHtml(item.service)}</p>
                <p style="margin-top:8px; color:${tokens.muted}; line-height:1.7; font-size:14px;"><strong style="color:${tokens.text};">O que muda para voce:</strong> ${escapeHtml(item.benefit)}</p>
              </div>`).join("")}
          </div>
        </div>
      </div>
    `)}

    <!-- QUEM SOMOS + QUEM JÁ ATENDEMOS -->
    ${sec(tokens.surface, `
      <div class="lp-two">
        <div>
          ${eyebrow("Quem somos")}
          ${sectionTitle("Por que trabalhar com a gente")}
          <div style="display:grid; gap:16px; margin-top:28px;">
            ${content.differentials.map(item => `
              <div style="display:flex; gap:14px; align-items:flex-start;">
                <span style="flex:none; width:10px; height:10px; border-radius:999px; background:${tokens.accent}; margin-top:8px;"></span>
                <div>
                  <h4 style="font-size:17px; color:${tokens.text};">${escapeHtml(item.title)}</h4>
                  <p style="margin-top:6px; color:${tokens.muted}; line-height:1.7; font-size:14px;">${escapeHtml(item.description)}</p>
                </div>
              </div>`).join("")}
          </div>
        </div>
        <div>
          ${eyebrow("Quem ja atendemos")}
          ${sectionTitle("Negocios que passaram por isso com a gente")}
          <div style="margin-top:28px;">
            ${testimonialsBlock}
            ${proofCards ? `<div style="display:grid; gap:16px; margin-top:22px;">${proofCards}</div>` : ""}
            ${logosBlock}
          </div>
        </div>
      </div>
    `)}

    <!-- COMO FUNCIONA -->
    ${sec(tokens.accentSoft, `
      ${eyebrow("Sem complicacao")}
      ${sectionTitle("Como funciona na pratica")}
      <p style="margin-top:14px; color:${tokens.muted}; line-height:1.7;">Nao tem nenhum compromisso em dar o proximo passo. E simples assim:</p>
      <div class="lp-three" style="margin-top:40px;">
        ${[
          ["1", "Voce responde", "Clica no botao abaixo e manda uma mensagem rapida. Leva menos de 1 minuto."],
          ["2", "A gente liga em ate 24h", "Uma conversa rapida para entender o momento do negocio e tirar duvidas."],
          ["3", "Montamos o plano juntos", "Se fizer sentido para os dois lados, a gente parte para a acao."],
        ].map(([num, title, desc]) => `
          <div>
            <div style="width:52px; height:52px; border-radius:16px; background:${tokens.accent}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:24px; font-weight:800; font-family:${tokens.fontHeading};">${num}</div>
            <h4 style="margin-top:18px; font-size:18px; color:${tokens.text};">${title}</h4>
            <p style="margin-top:8px; color:${tokens.muted}; line-height:1.7; font-size:14px;">${desc}</p>
          </div>`).join("")}
      </div>
    `)}

    <!-- OFFER + CTA -->
    ${sec(tokens.heroBackground, `
      ${eyebrow(content.offer.title || "Proximo passo")}
      <h2 style="margin:16px 0 0; font-family:${tokens.fontHeading}; font-size:clamp(28px,3.5vw,44px); line-height:1.15; max-width:760px; color:${tokens.text};">${escapeHtml(content.offer.summary)}</h2>
      <div style="display:flex; flex-wrap:wrap; gap:16px; margin-top:28px;">
        <div style="padding:20px 24px; border-radius:14px; background:rgba(255,255,255,0.07); border:1px solid ${tokens.border}; max-width:320px;">
          <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.16em; color:${tokens.muted};">O que muda</p>
          <p style="margin-top:10px; color:${tokens.text}; line-height:1.75;">${escapeHtml(content.offer.expectedResult)}</p>
        </div>
        <div style="padding:20px 24px; border-radius:14px; background:rgba(255,255,255,0.07); border:1px solid ${tokens.border}; max-width:320px;">
          <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.16em; color:${tokens.muted};">Se nada mudar</p>
          <p style="margin-top:10px; color:${tokens.text}; line-height:1.75;">${escapeHtml(content.offer.riskOfInaction)}</p>
        </div>
      </div>
      <div id="lp-cta" style="margin-top:48px;">
        ${renderCta(content, context, tokens)}
      </div>
    `, "padding-bottom:100px;")}

    <a href="#lp-cta" class="lp-sticky" style="position:fixed; left:50%; transform:translateX(-50%); bottom:20px; z-index:999; display:inline-flex; align-items:center; justify-content:center; min-width:240px; padding:16px 28px; border-radius:999px; background:${tokens.accent}; color:#fff; text-decoration:none; font-weight:800; font-size:15px; box-shadow:0 16px 40px rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.15);">
      Quero resolver isso
    </a>
  </body>
</html>`;

  return {
    html,
    assetsUsed: {
      googleMapsScreenshot: Boolean(googleScreenshot),
      websiteScreenshot: Boolean(websiteScreenshot),
      logo: Boolean(logoUrl),
    },
    fallbacksUsed,
  };
};
