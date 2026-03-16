import { supabase } from "@/integrations/supabase/client";

type InvokeOptions = {
  body?: unknown;
  headers?: Record<string, string>;
};

const gatewayToken = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const MAX_QUOTA_RETRIES = 3;
const FALLBACK_RETRY_MS = 30000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractRetryDelayMs = async (response: Response) => {
  const retryAfterHeader = response.headers.get("retry-after");
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  const bodyText = await response.clone().text().catch(() => "");
  const retryMatch = bodyText.match(/retry in\s+([\d.]+)s/i);
  if (retryMatch) {
    const seconds = Number(retryMatch[1]);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  return FALLBACK_RETRY_MS;
};

const isRetryableQuotaError = async (response: Response) => {
  if (response.status !== 429) return false;
  const bodyText = await response.clone().text().catch(() => "");
  return /quota exceeded|rate limit|please retry in|generate_content_free_tier_requests/i.test(bodyText);
};

export const getEdgeFunctionErrorMessage = async (error: unknown) => {
  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: Response }).context
      : undefined;

  if (context instanceof Response) {
    try {
      const payload = await context.clone().json();
      if (typeof payload?.error === "string" && payload.error.trim()) {
        return payload.error;
      }
      if (typeof payload?.message === "string" && payload.message.trim()) {
        return payload.message;
      }
    } catch {
      const text = await context.clone().text().catch(() => "");
      if (text.trim()) return text;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Erro ao executar a operacao.";
};

export const invokeEdgeFunction = async <T = unknown>(
  functionName: string,
  options: InvokeOptions = {},
) => {
  let {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.access_token) {
    const refreshResult = await supabase.auth.refreshSession();
    session = refreshResult.data.session;
    if (refreshResult.error) {
      throw refreshResult.error;
    }
  }

  if (!session?.access_token) {
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  let attempt = 0;

  while (attempt <= MAX_QUOTA_RETRIES) {
    const result = await supabase.functions.invoke<T>(functionName, {
      ...options,
      headers: {
        ...(gatewayToken ? { apikey: gatewayToken } : {}),
        Authorization: `Bearer ${session.access_token}`,
        ...options.headers,
      },
    });

    const context =
      result.error && typeof result.error === "object" && "context" in result.error
        ? (result.error as { context?: Response }).context
        : undefined;

    if (!(context instanceof Response) || !(await isRetryableQuotaError(context)) || attempt === MAX_QUOTA_RETRIES) {
      return result;
    }

    const retryDelayMs = await extractRetryDelayMs(context);
    await sleep(retryDelayMs);
    attempt += 1;
  }

  return supabase.functions.invoke<T>(functionName, {
    ...options,
    headers: {
      ...(gatewayToken ? { apikey: gatewayToken } : {}),
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });
};
