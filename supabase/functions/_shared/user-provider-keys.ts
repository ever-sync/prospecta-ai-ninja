import { HttpError } from "./auth.ts";

type ProviderRow = {
  provider: string;
  api_key: string;
  custom_provider: string | null;
};

export const getUserProviderKeys = async (
  svc: any,
  userId: string,
  providers: string[],
): Promise<Record<string, string>> => {
  const { data, error } = await svc
    .from("user_ai_api_keys")
    .select("provider, api_key, custom_provider")
    .eq("user_id", userId)
    .in("provider", providers);

  if (error) {
    throw new HttpError(500, "Nao foi possivel carregar as chaves do usuario.");
  }

  const rows = (data || []) as ProviderRow[];
  return Object.fromEntries(rows.map((row) => [row.provider, row.api_key]));
};

export const requireUserProviderKey = async (
  svc: any,
  userId: string,
  provider: string,
  missingMessage?: string,
): Promise<string> => {
  const keys = await getUserProviderKeys(svc, userId, [provider]);
  const apiKey = keys[provider];

  if (!apiKey) {
    throw new HttpError(
      400,
      missingMessage || `Configure sua chave ${provider} em Configuracoes > APIs.`,
    );
  }

  return apiKey;
};
