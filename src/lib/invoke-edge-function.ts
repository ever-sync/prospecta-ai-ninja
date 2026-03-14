import { supabase } from "@/integrations/supabase/client";

type InvokeOptions = {
  body?: unknown;
  headers?: Record<string, string>;
};

const gatewayToken = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

  return supabase.functions.invoke<T>(functionName, {
    ...options,
    headers: {
      ...(gatewayToken ? { apikey: gatewayToken } : {}),
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });
};
