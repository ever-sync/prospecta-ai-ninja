import { HttpError } from "./auth.ts";

const MAX_FIRECRAWL_RETRIES = 2;
const FALLBACK_RETRY_MS = 5000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractRetryDelayMs = (payload: any, response: Response) => {
  const retryAfterHeader = response.headers.get("retry-after");
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  const message = String(payload?.error || payload?.message || "");
  const retryMatch = message.match(/retry in\s+([\d.]+)s/i);
  if (retryMatch) {
    const seconds = Number(retryMatch[1]);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  return FALLBACK_RETRY_MS;
};

const isRetryableFirecrawlError = (payload: any, response: Response) => {
  if (![408, 429, 500, 502, 503, 504].includes(response.status)) return false;
  const message = String(payload?.error || payload?.message || "");
  return /rate limit|quota|too many requests|temporarily unavailable|timeout/i.test(message) || response.status >= 500;
};

const normalizeFirecrawlError = (payload: any, response: Response) => {
  const rawMessage = String(payload?.error || payload?.message || "").trim();

  if (response.status === 401) {
    return "FIRECRAWL_API_KEY invalida ou sem permissao.";
  }

  if (response.status === 402) {
    return "Creditos Firecrawl insuficientes.";
  }

  if (response.status === 429) {
    return rawMessage || "Firecrawl atingiu limite temporario. Tente novamente em instantes.";
  }

  return rawMessage || `Firecrawl request failed with status ${response.status}`;
};

const callFirecrawl = async <T>(
  apiKey: string,
  path: "search" | "scrape",
  body: Record<string, unknown>,
): Promise<T> => {
  for (let attempt = 0; attempt <= MAX_FIRECRAWL_RETRIES; attempt += 1) {
    const response = await fetch(`https://api.firecrawl.dev/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (response.ok) {
      return payload as T;
    }

    if (isRetryableFirecrawlError(payload, response) && attempt < MAX_FIRECRAWL_RETRIES) {
      await sleep(extractRetryDelayMs(payload, response));
      continue;
    }

    throw new HttpError(response.status, normalizeFirecrawlError(payload, response));
  }

  throw new HttpError(500, "Firecrawl falhou apos varias tentativas.");
};

export const firecrawlSearchRequest = async <T>(
  apiKey: string,
  body: Record<string, unknown>,
) => callFirecrawl<T>(apiKey, "search", body);

export const firecrawlScrapeRequest = async <T>(
  apiKey: string,
  body: Record<string, unknown>,
) => callFirecrawl<T>(apiKey, "scrape", body);

/**
 * Returns the user's own Firecrawl API key from their profile,
 * falling back to the system env key if not configured.
 */
export const resolveFirecrawlApiKey = async (
  svc: any,
  userId: string,
): Promise<string> => {
  const { data } = await svc
    .from("profiles")
    .select("firecrawl_api_key")
    .eq("user_id", userId)
    .single();

  const userKey = data?.firecrawl_api_key as string | null | undefined;
  if (userKey && userKey.trim()) {
    return userKey.trim();
  }

  const envKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!envKey) {
    throw new HttpError(
      400,
      "Nenhuma chave Firecrawl configurada. Acesse Configuracoes > Integracoes e adicione sua chave.",
    );
  }
  return envKey;
};
