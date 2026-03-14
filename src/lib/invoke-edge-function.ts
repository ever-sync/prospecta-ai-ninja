import { supabase } from "@/integrations/supabase/client";

type InvokeOptions = {
  body?: unknown;
  headers?: Record<string, string>;
};

const gatewayToken = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
      Authorization: `Bearer ${gatewayToken}`,
      "x-user-auth": `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });
};
