import {
  PresentationClientLogo,
  PresentationContentV2,
  PresentationRenderContext,
  PresentationRenderResult,
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

const scoreToColor = (score: number, tokens: TemplateTokens) => {
  if (score < 40) return tokens.danger;
  if (score < 70) return tokens.warning;
  return tokens.success;
};

const scoreToLabel = (score: number) => {
  if (score < 40) return "Critico";
  if (score < 70) return "Atencao";
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
    { key: "SEO", value: Number(scores.seo || 0), description: "Capacidade de ser encontrado e ranquear." },
    { key: "Velocidade", value: Number(scores.speed || 0), description: "Tempo de resposta e fluidez da experiencia." },
    { key: "UX", value: Number(scores.layout || 0), description: "Clareza, navegacao e confianca para converter." },
    { key: "Seguranca", value: Number(scores.security || 0), description: "Sinais de confianca e integridade tecnica." },
    { key: "Score geral", value: Number(scores.overall || 0), description: "Leitura consolidada do risco comercial atual." },
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
  <div style="border:1px solid ${tokens.border}; border-radius:28px; background:${tokens.surfaceMuted}; padding:24px; box-shadow:${tokens.shadow}; min-height:280px;">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <div>
        <p style="margin:0; font-size:12px; text-transform:uppercase; letter-spacing:0.16em; color:${tokens.muted};">Fallback visual</p>
        <h3 style="margin:8px 0 0; font-size:26px; line-height:1.2; color:${tokens.text};">${escapeHtml(title)}</h3>
      </div>
      <div style="width:58px; height:58px; border-radius:18px; background:${tokens.accentSoft}; display:flex; align-items:center; justify-content:center; color:${tokens.accent}; font-size:28px;">▣</div>
    </div>
    <div style="display:grid; gap:10px; margin-top:22px;">
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
    <div style="display:flex; flex-wrap:wrap; gap:14px; margin-top:24px;">
      ${valid
        .slice(0, 8)
        .map((logo) => {
          const src = ensureImageSrc(logo.logo_url);
          return `
            <div style="display:flex; align-items:center; justify-content:center; min-width:120px; min-height:68px; padding:16px 18px; border:1px solid ${tokens.border}; border-radius:18px; background:${tokens.surfaceMuted};">
              <img src="${src}" alt="${escapeHtml(logo.company_name || "Cliente")}" style="max-height:34px; max-width:120px; object-fit:contain;" />
            </div>`;
        })
        .join("")}
    </div>
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
      <section style="padding:42px 0 0;">
        <div style="border-radius:32px; padding:34px; border:1px solid ${tokens.border}; background:${tokens.heroBackground}; box-shadow:${tokens.shadow};">
          <p style="margin:0; color:${tokens.accent}; text-transform:uppercase; letter-spacing:0.16em; font-size:12px;">${escapeHtml(content.cta.title)}</p>
          <h2 style="margin:14px 0 0; font-size:34px; line-height:1.15; color:${tokens.text};">Receba uma leitura comercial sob medida</h2>
          <p style="margin:14px 0 0; color:${tokens.muted}; line-height:1.8;">${escapeHtml(content.cta.microcopy)}</p>
          <form id="presentation-cta-form" style="display:grid; gap:14px; margin-top:28px;">
            <div style="display:grid; gap:14px; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));">${inputs}</div>
            <button type="submit" style="margin-top:10px; border:none; border-radius:18px; padding:16px 20px; background:${tokens.accent}; color:#fff; font-weight:700; font-size:16px; cursor:pointer;">
              ${escapeHtml(content.cta.primaryLabel)}
            </button>
            <div style="display:flex; flex-wrap:wrap; gap:12px; color:${tokens.muted}; font-size:13px;">
              <span>Leva menos de 1 minuto</span>
              <span>Sem compromisso</span>
              ${content.cta.trustLine ? `<span>${escapeHtml(content.cta.trustLine)}</span>` : ""}
            </div>
          </form>
        </div>
      </section>
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
    <section style="padding:42px 0 0;">
      <div style="border-radius:32px; padding:34px; border:1px solid ${tokens.border}; background:${tokens.heroBackground}; box-shadow:${tokens.shadow};">
        <p style="margin:0; color:${tokens.accent}; text-transform:uppercase; letter-spacing:0.16em; font-size:12px;">${escapeHtml(content.cta.title)}</p>
        <h2 style="margin:14px 0 0; font-size:34px; line-height:1.15; color:${tokens.text};">${escapeHtml(content.offer.summary)}</h2>
        <p style="margin:14px 0 0; color:${tokens.muted}; line-height:1.8;">${escapeHtml(content.cta.microcopy)}</p>
        <div style="display:flex; flex-wrap:wrap; gap:14px; margin-top:28px;">
          <button id="presentation-accept" style="flex:1 1 260px; border:none; border-radius:18px; padding:16px 20px; background:${tokens.accent}; color:#fff; font-weight:700; font-size:16px; cursor:pointer;">
            ${escapeHtml(content.cta.primaryLabel)}
          </button>
          <button id="presentation-reject" style="flex:1 1 220px; border:1px solid ${tokens.border}; border-radius:18px; padding:16px 20px; background:${tokens.surface}; color:${tokens.text}; font-weight:700; font-size:16px; cursor:pointer;">
            ${escapeHtml(content.cta.secondaryLabel || "Agora nao")}
          </button>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:16px; color:${tokens.muted}; font-size:13px;">
          <span>Resposta em menos de 10 segundos</span>
          <span>Sem compromisso</span>
          ${content.cta.trustLine ? `<span>${escapeHtml(content.cta.trustLine)}</span>` : ""}
        </div>
        <div id="presentation-cta-feedback" style="margin-top:16px; color:${tokens.text};"></div>
      </div>
    </section>
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

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(context.business.name)} | Diagnostico consultivo</title>
  </head>
  <body style="margin:0; background:${tokens.background}; color:${tokens.text}; font-family:${tokens.fontBody};">
    <div style="max-width:1120px; margin:0 auto; padding:32px 24px 72px;">
      <header style="display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:28px; padding:20px 22px; border-radius:26px; background:${tokens.surface}; border:1px solid ${tokens.border}; box-shadow:${tokens.shadow};">
        <div style="display:flex; align-items:center; gap:16px;">
          ${
            logoUrl
              ? `<img src="${logoUrl}" alt="${escapeHtml(context.companyName)}" style="width:58px; height:58px; object-fit:contain; border-radius:18px; background:#fff; padding:8px;" />`
              : `<div style="width:58px; height:58px; border-radius:18px; background:${tokens.accentSoft}; display:flex; align-items:center; justify-content:center; color:${tokens.accent}; font-weight:800; font-size:24px;">${escapeHtml(
                  context.companyName.slice(0, 1) || "E",
                )}</div>`
          }
          <div>
            <p style="margin:0; color:${tokens.accent}; font-size:12px; text-transform:uppercase; letter-spacing:0.18em;">Diagnostico consultivo</p>
            <h1 style="margin:8px 0 0; font-family:${tokens.fontHeading}; font-size:28px; line-height:1.1; color:${tokens.text};">${escapeHtml(
              context.companyName,
            )}</h1>
          </div>
        </div>
        <div style="text-align:right;">
          <p style="margin:0; font-size:12px; text-transform:uppercase; letter-spacing:0.16em; color:${tokens.muted};">Lead analisado</p>
          <p style="margin:8px 0 0; font-size:20px; font-weight:700; color:${tokens.text};">${escapeHtml(context.business.name)}</p>
          <p style="margin:8px 0 0; color:${tokens.muted};">${escapeHtml(context.business.category || "Empresa analisada")}</p>
        </div>
      </header>

      <section style="padding:42px; border-radius:34px; background:${tokens.heroBackground}; border:1px solid ${tokens.border}; box-shadow:${tokens.shadow};">
        <p style="margin:0; color:${tokens.accent}; text-transform:uppercase; letter-spacing:0.18em; font-size:12px;">${escapeHtml(content.hero.eyebrow)}</p>
        <h2 style="margin:16px 0 0; font-family:${tokens.fontHeading}; font-size:clamp(34px, 4vw, 58px); line-height:1.02; max-width:860px; color:${tokens.text};">${escapeHtml(
          content.hero.headline,
        )}</h2>
        <p style="margin:18px 0 0; max-width:880px; font-size:20px; line-height:1.6; color:${tokens.muted};">${escapeHtml(content.hero.subheadline)}</p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-top:28px;">
          <div style="padding:20px 22px; border-radius:22px; background:${tokens.surface}; border:1px solid ${tokens.border};">
            <p style="margin:0; font-size:12px; text-transform:uppercase; letter-spacing:0.14em; color:${tokens.muted};">Leitura rapida</p>
            <p style="margin:10px 0 0; font-size:16px; line-height:1.7; color:${tokens.text};">${escapeHtml(content.hero.miniSummary)}</p>
          </div>
          <div style="padding:20px 22px; border-radius:22px; background:${tokens.surface}; border:1px solid ${tokens.border};">
            <p style="margin:0; font-size:12px; text-transform:uppercase; letter-spacing:0.14em; color:${tokens.muted};">Risco comercial</p>
            <p style="margin:10px 0 0; font-size:16px; line-height:1.7; color:${tokens.text};">${escapeHtml(content.diagnosis.riskStatement)}</p>
          </div>
        </div>
      </section>

      <section style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:24px; margin-top:28px;">
        <article style="padding:30px; border-radius:28px; background:${tokens.surface}; border:1px solid ${tokens.border}; box-shadow:${tokens.shadow};">
          <p style="margin:0; color:${tokens.accent}; text-transform:uppercase; letter-spacing:0.16em; font-size:12px;">${escapeHtml(content.executiveSummary.title)}</p>
          <ul style="display:grid; gap:16px; list-style:none; margin:22px 0 0; padding:0;">
            ${renderBulletList(content.executiveSummary.bullets, tokens)}
          </ul>
        </article>
        <article style="padding:30px; border-radius:28px; background:${tokens.surface}; border:1px solid ${tokens.border}; box-shadow:${tokens.shadow};">
          <p style="margin:0; color:${tokens.accent}; text-transform:uppercase; letter-spacing:0.16em; font-size:12px;">${escapeHtml(content.diagnosis.title)}</p>
          <p style="margin:18px 0 0; color:${tokens.text}; font-size:22px; line-height:1.35;">${escapeHtml(content.diagnosis.summary)}</p>
          <p style="margin:16px 0 0; color:${tokens.muted}; line-height:1.8;">${escapeHtml(content.diagnosis.riskStatement)}</p>
        </article>
      </section>

      <section style="margin-top:28px; padding:32px; border-radius:28px; background:${tokens.surface}; border:1px solid ${tokens.border}; box-shadow:${tokens.shadow};">
        <div style="display:flex; align-items:end; justify-content:space-between; gap:16px; flex-wrap:wrap;">
          <div>
            <p style="margin:0; color:${tokens.accent}; text-transform:uppercase; letter-spacing:0.16em; font-size:12px;">Scorecard visual</p>
            <h3 style="margin:10px 0 0; font-size:32px; font-family:${tokens.fontHeading}; color:${tokens.text};">Onde a oportunidade esta vazando</h3>
          </div>
          <p style="margin:0; color:${tokens.muted}; max-width:360px; line-height:1.7;">Os cards abaixo traduzem o impacto comercial da presenca digital atual em linguagem facil de decidir.</p>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:16px; margin-top:24px;">
          ${scores
            .map(
              (entry) => `
                <div style="padding:22px; border-radius:24px; background:${tokens.surfaceMuted}; border:1px solid ${tokens.border};">
                  <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
                    <p style="margin:0; font-size:13px; text-transform:uppercase; letter-spacing:0.12em; color:${tokens.muted};">${entry.key}</p>
                    <strong style="font-size:20px; color:${tokens.text};">${entry.value}</strong>
                  </div>
                  <div style="height:10px; border-radius:999px; background:${tokens.background}; margin-top:16px; overflow:hidden;">
                    <div style="width:${Math.max(4, Math.min(100, entry.value))}%; height:100%; background:${scoreToColor(entry.value, tokens)}; border-radius:999px;"></div>
                  </div>
                  <p style="margin:12px 0 0; color:${tokens.muted}; font-size:14px; line-height:1.6;">${escapeHtml(entry.description)}</p>
                  <span style="display:inline-flex; margin-top:14px; padding:6px 10px; border-radius:999px; background:${tokens.accentSoft}; color:${scoreToColor(
                    entry.value,
                    tokens,
                  )}; font-size:12px; font-weight:700;">${scoreToLabel(entry.value)}</span>
                </div>`,
            )
            .join("")}
        </div>
      </section>

      <section style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:24px; margin-top:28px;">
        <article style="padding:28px; border-radius:28px; background:${tokens.surface}; border:1px solid ${tokens.border}; box-shadow:${tokens.shadow};">
          <p style="margin:0; color:${tokens.accent}; text-transform:uppercase; letter-spacing:0.16em; font-size:12px;">${escapeHtml(content.googleMapsInsight.title)}</p>
          <h3 style="margin:12px 0 0; font-size:28px; color:${tokens.text}; font-family:${tokens.fontHeading};">Sua presenca no Google Maps</h3>
          <div style="margin-top:20px;">
            ${
              googleScreenshot
                ? `<img src="${googleScreenshot}" alt="Google Maps ${escapeHtml(context.business.name)}" style="width:100%; border-radius:24px; display:block; border:1px solid ${tokens.border}; background:#fff; box-shadow:${tokens.shadow};" />`
                : renderFallbackCard(
                    context.business.name,
                    [
                      context.business.category ? `Categoria: ${context.business.category}` : "",
                      context.business.rating ? `Rating: ${context.business.rating} estrelas` : "Sem rating consolidado",
                      context.business.address ? `Endereco: ${context.business.address}` : "",
                    ],
                    "Mesmo sem a captura visual, a proposta continua expondo a oportunidade local com clareza comercial.",
                    tokens,
                  )
            }
          </div>
          <p style="margin:20px 0 0; color:${tokens.text}; line-height:1.8;">${escapeHtml(content.googleMapsInsight.insight)}</p>
          <p style="margin:14px 0 0; color:${tokens.muted}; line-height:1.8;">${escapeHtml(content.googleMapsInsight.impact)}</p>
        </article>

        <article style="padding:28px; border-radius:28px; background:${tokens.surface}; border:1px solid ${tokens.border}; box-shadow:${tokens.shadow};">
          <p style="margin:0; color:${tokens.accent}; text-transform:uppercase; letter-spacing:0.16em; font-size:12px;">${escapeHtml(content.websiteInsight.title)}</p>
          <h3 style="margin:12px 0 0; font-size:28px; color:${tokens.text}; font-family:${tokens.fontHeading};">Seu site atual</h3>
          <div style="margin-top:20px;">
            ${
              websiteScreenshot
                ? `<img src="${websiteScreenshot}" alt="Site ${escapeHtml(context.business.website || context.business.name)}" style="width:100%; border-radius:24px; display:block; border:1px solid ${tokens.border}; background:#fff; box-shadow:${tokens.shadow};" />`
                : renderFallbackCard(
                    context.business.website || "Sem site cadastrado",
                    [
                      context.business.website ? `URL: ${context.business.website}` : "Sem site cadastrado",
                      context.business.category ? `Setor: ${context.business.category}` : "",
                    ],
                    context.business.website
                      ? "A captura nao veio, mas a leitura da experiencia digital continua e vira argumento de venda."
                      : "Ausencia de site reduz confianca, descoberta organica e capacidade de converter interesse em oportunidade.",
                    tokens,
                  )
            }
          </div>
          <p style="margin:20px 0 0; color:${tokens.text}; line-height:1.8;">${escapeHtml(content.websiteInsight.insight)}</p>
          <p style="margin:14px 0 0; color:${tokens.muted}; line-height:1.8;">${escapeHtml(content.websiteInsight.impact)}</p>
        </article>
      </section>

      <section style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:28px;">
        <article style="padding:30px; border-radius:28px; background:${tokens.surface}; border:1px solid ${tokens.border}; box-shadow:${tokens.shadow};">
          <p style="margin:0; color:${tokens.accent}; text-transform:uppercase; letter-spacing:0.16em; font-size:12px;">Oportunidades e problemas</p>
          <div style="display:grid; gap:16px; margin-top:22px;">
            ${content.opportunities
              .map(
                (item, index) => `
                  <div style="padding:18px; border-radius:20px; border:1px solid ${tokens.border}; background:${tokens.surfaceMuted};">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                      <strong style="font-size:18px; color:${tokens.text};">${index + 1}. ${escapeHtml(item.title)}</strong>
                      <span style="display:inline-flex; padding:6px 10px; border-radius:999px; background:${tokens.accentSoft}; color:${tokens.accent}; font-size:12px; font-weight:700;">${escapeHtml(item.urgency)}</span>
                    </div>
                    <p style="margin:12px 0 0; color:${tokens.muted}; line-height:1.7;"><strong style="color:${tokens.text};">Impacto:</strong> ${escapeHtml(item.impact)}</p>
                    <p style="margin:10px 0 0; color:${tokens.muted}; line-height:1.7;"><strong style="color:${tokens.text};">Oportunidade:</strong> ${escapeHtml(item.opportunity)}</p>
                  </div>`,
              )
              .join("")}
          </div>
        </article>

        <article style="padding:30px; border-radius:28px; background:${tokens.surface}; border:1px solid ${tokens.border}; box-shadow:${tokens.shadow};">
          <p style="margin:0; color:${tokens.accent}; text-transform:uppercase; letter-spacing:0.16em; font-size:12px;">Como resolvemos</p>
          <div style="display:grid; gap:16px; margin-top:22px;">
            ${content.solutionMapping
              .map(
                (item) => `
                  <div style="padding:18px; border-radius:20px; border:1px solid ${tokens.border}; background:${tokens.surfaceMuted};">
                    <p style="margin:0; color:${tokens.muted}; line-height:1.7;"><strong style="color:${tokens.text};">Problema detectado:</strong> ${escapeHtml(item.problem)}</p>
                    <p style="margin:10px 0 0; color:${tokens.muted}; line-height:1.7;"><strong style="color:${tokens.text};">Servico aplicado:</strong> ${escapeHtml(item.service)}</p>
                    <p style="margin:10px 0 0; color:${tokens.muted}; line-height:1.7;"><strong style="color:${tokens.text};">Beneficio esperado:</strong> ${escapeHtml(item.benefit)}</p>
                  </div>`,
              )
              .join("")}
          </div>
        </article>
      </section>

      <section style="display:grid; grid-template-columns:0.95fr 1.05fr; gap:24px; margin-top:28px;">
        <article style="padding:30px; border-radius:28px; background:${tokens.surface}; border:1px solid ${tokens.border}; box-shadow:${tokens.shadow};">
          <p style="margin:0; color:${tokens.accent}; text-transform:uppercase; letter-spacing:0.16em; font-size:12px;">Diferenciais</p>
          <div style="display:grid; gap:14px; margin-top:22px;">
            ${content.differentials
              .map(
                (item) => `
                  <div style="padding:18px; border-radius:20px; background:${tokens.surfaceMuted}; border:1px solid ${tokens.border};">
                    <h4 style="margin:0; font-size:19px; color:${tokens.text};">${escapeHtml(item.title)}</h4>
                    <p style="margin:10px 0 0; color:${tokens.muted}; line-height:1.75;">${escapeHtml(item.description)}</p>
                  </div>`,
              )
              .join("")}
          </div>
        </article>

        <article style="padding:30px; border-radius:28px; background:${tokens.surface}; border:1px solid ${tokens.border}; box-shadow:${tokens.shadow};">
          <p style="margin:0; color:${tokens.accent}; text-transform:uppercase; letter-spacing:0.16em; font-size:12px;">Prova social</p>
          <h3 style="margin:12px 0 0; font-size:30px; font-family:${tokens.fontHeading}; color:${tokens.text};">Motivos para confiar na execucao</h3>
          ${proofCards ? `<div style="display:grid; gap:16px; margin-top:22px; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));">${proofCards}</div>` : ""}
          ${logosBlock}
        </article>
      </section>

      <section style="margin-top:28px; padding:32px; border-radius:28px; background:${tokens.surface}; border:1px solid ${tokens.border}; box-shadow:${tokens.shadow};">
        <p style="margin:0; color:${tokens.accent}; text-transform:uppercase; letter-spacing:0.16em; font-size:12px;">${escapeHtml(content.offer.title)}</p>
        <h3 style="margin:12px 0 0; font-size:34px; color:${tokens.text}; font-family:${tokens.fontHeading};">${escapeHtml(content.offer.summary)}</h3>
        <div style="display:grid; gap:16px; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); margin-top:22px;">
          <div style="padding:20px; border-radius:20px; background:${tokens.surfaceMuted}; border:1px solid ${tokens.border};">
            <p style="margin:0; font-size:12px; text-transform:uppercase; letter-spacing:0.14em; color:${tokens.muted};">Resultado esperado</p>
            <p style="margin:12px 0 0; color:${tokens.text}; line-height:1.75;">${escapeHtml(content.offer.expectedResult)}</p>
          </div>
          <div style="padding:20px; border-radius:20px; background:${tokens.surfaceMuted}; border:1px solid ${tokens.border};">
            <p style="margin:0; font-size:12px; text-transform:uppercase; letter-spacing:0.14em; color:${tokens.muted};">Se nada mudar</p>
            <p style="margin:12px 0 0; color:${tokens.text}; line-height:1.75;">${escapeHtml(content.offer.riskOfInaction)}</p>
          </div>
        </div>
      </section>

      ${renderCta(content, context, tokens)}
    </div>
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
