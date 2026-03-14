const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const normalizeImageSrc = (value?: string | null) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `data:image/png;base64,${trimmed}`;
};

export const replacePlaceholderImage = (html: string, placeholder: string, image?: string | null) => {
  const normalized = normalizeImageSrc(image);
  if (!normalized) return html;

  let next = html.replaceAll(`data:image/png;base64,${placeholder}`, normalized);
  next = next.replace(new RegExp(`src=(["'])${escapeRegExp(placeholder)}\\1`, "g"), `src="${normalized}"`);
  next = next.replaceAll(placeholder, normalized);
  return next;
};

export const injectLogoFallback = (html: string, companyName: string, logoSrc?: string | null) => {
  const normalizedLogo = normalizeImageSrc(logoSrc);
  if (!normalizedLogo) return html;
  if (html.includes(normalizedLogo)) return html;

  const fallbackHeader = `
    <div style="display:flex;align-items:center;gap:12px;padding:20px 24px 0;position:relative;z-index:2;">
      <img src="${normalizedLogo}" alt="${escapeHtml(companyName)}" style="max-height:48px;max-width:180px;object-fit:contain;display:block;" />
      <div style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#111827;letter-spacing:0.04em;text-transform:uppercase;">
        ${escapeHtml(companyName)}
      </div>
    </div>
  `;

  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${fallbackHeader}`);
  }

  return `${fallbackHeader}${html}`;
};

export const sanitizePresentationHtml = (
  html: string,
  options: {
    companyName?: string;
    logoSrc?: string | null;
    googleMapsScreenshot?: string | null;
    websiteScreenshot?: string | null;
  },
) => {
  let next = html;
  const normalizedLogo = normalizeImageSrc(options.logoSrc);

  if (normalizedLogo) {
    next = next.replace(new RegExp(`src=(["'])${escapeRegExp("LOGO_URL_PLACEHOLDER")}\\1`, "g"), `src="${normalizedLogo}"`);
    next = next.replaceAll("LOGO_URL_PLACEHOLDER", normalizedLogo);
  }

  next = replacePlaceholderImage(next, "GOOGLE_MAPS_SCREENSHOT_PLACEHOLDER", options.googleMapsScreenshot);
  next = replacePlaceholderImage(next, "WEBSITE_SCREENSHOT_PLACEHOLDER", options.websiteScreenshot);

  if (options.companyName) {
    next = injectLogoFallback(next, options.companyName, normalizedLogo);
  }

  return next;
};
