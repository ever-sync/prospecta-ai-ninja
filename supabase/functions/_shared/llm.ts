import { HttpError } from "./auth.ts";

export type SupportedLLMProvider = "gemini" | "openai" | "groq" | "claude_code";

export type LLMContext = {
  provider: SupportedLLMProvider;
  apiKey: string;
};

export type LLMOptions = {
  temperature?: number;
  maxOutputTokens?: number;
};

const SUPPORTED_PROVIDERS: SupportedLLMProvider[] = ["gemini", "openai", "groq", "claude_code"];

const DEFAULT_MODELS: Record<SupportedLLMProvider, string> = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
  claude_code: "claude-3-5-haiku-20241022",
};

const MAX_RETRIES = 2;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const stripCodeFences = (text: string) =>
  text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

const tryParseJson = <T>(text: string): T | null => {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

const extractJsonSubstring = (text: string): string[] => {
  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");
  return [
    objectStart >= 0 && objectEnd > objectStart ? text.slice(objectStart, objectEnd + 1) : null,
    arrayStart >= 0 && arrayEnd > arrayStart ? text.slice(arrayStart, arrayEnd + 1) : null,
  ].filter(Boolean) as string[];
};

// --- Gemini ---
const callGeminiRaw = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions & { jsonMode?: boolean },
): Promise<string> => {
  const model = DEFAULT_MODELS.gemini;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.4,
            maxOutputTokens: options.maxOutputTokens ?? 4096,
            ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
          },
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      const blockReason = payload?.promptFeedback?.blockReason;
      if (blockReason) throw new HttpError(500, `Gemini bloqueou a resposta: ${blockReason}.`);
      const parts = payload?.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p: any) => p?.text || "").join("").trim();
      if (!text) throw new HttpError(500, "Gemini nao retornou conteudo.");
      return text;
    }
    if (response.status === 429 && attempt < MAX_RETRIES) {
      await sleep(30000);
      continue;
    }
    throw new HttpError(
      response.status,
      payload?.error?.message || `Gemini erro ${response.status}`,
    );
  }
  throw new HttpError(500, "Gemini falhou apos tentativas.");
};

// --- OpenAI-compatible (OpenAI + Groq) ---
const callOpenAICompatible = async (
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions & { jsonMode?: boolean },
): Promise<string> => {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxOutputTokens ?? 4096,
    };
    if (options.jsonMode) {
      body.response_format = { type: "json_object" };
    }
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      const text = payload?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new HttpError(500, "LLM nao retornou conteudo.");
      return text;
    }
    if (response.status === 429 && attempt < MAX_RETRIES) {
      await sleep(10000);
      continue;
    }
    throw new HttpError(
      response.status,
      payload?.error?.message || `LLM erro ${response.status}`,
    );
  }
  throw new HttpError(500, "LLM falhou apos tentativas.");
};

// --- Anthropic (Claude) ---
const callAnthropicRaw = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions & { jsonMode?: boolean },
): Promise<string> => {
  const model = DEFAULT_MODELS.claude_code;
  const finalUserPrompt = options.jsonMode
    ? `${userPrompt}\n\nResponda APENAS com JSON valido, sem markdown, sem comentarios extras.`
    : userPrompt;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxOutputTokens ?? 4096,
        temperature: options.temperature ?? 0.4,
        system: systemPrompt,
        messages: [{ role: "user", content: finalUserPrompt }],
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      const text = payload?.content?.[0]?.text?.trim();
      if (!text) throw new HttpError(500, "Claude nao retornou conteudo.");
      return text;
    }
    if (response.status === 429 && attempt < MAX_RETRIES) {
      await sleep(10000);
      continue;
    }
    throw new HttpError(
      response.status,
      payload?.error?.message || `Claude erro ${response.status}`,
    );
  }
  throw new HttpError(500, "Claude falhou apos tentativas.");
};

const callRaw = (
  ctx: LLMContext,
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions & { jsonMode?: boolean } = {},
): Promise<string> => {
  switch (ctx.provider) {
    case "gemini":
      return callGeminiRaw(ctx.apiKey, systemPrompt, userPrompt, options);
    case "openai":
      return callOpenAICompatible(
        "https://api.openai.com/v1",
        ctx.apiKey,
        DEFAULT_MODELS.openai,
        systemPrompt,
        userPrompt,
        options,
      );
    case "groq":
      return callOpenAICompatible(
        "https://api.groq.com/openai/v1",
        ctx.apiKey,
        DEFAULT_MODELS.groq,
        systemPrompt,
        userPrompt,
        options,
      );
    case "claude_code":
      return callAnthropicRaw(ctx.apiKey, systemPrompt, userPrompt, options);
  }
};

export const callLLMText = (
  ctx: LLMContext,
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions = {},
): Promise<string> => callRaw(ctx, systemPrompt, userPrompt, options);

export const callLLMJson = async <T>(
  ctx: LLMContext,
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions = {},
): Promise<T> => {
  const text = await callRaw(ctx, systemPrompt, userPrompt, { ...options, jsonMode: true });
  const clean = stripCodeFences(text);

  const direct = tryParseJson<T>(clean);
  if (direct !== null) return direct;

  for (const candidate of extractJsonSubstring(clean)) {
    const parsed = tryParseJson<T>(candidate);
    if (parsed !== null) return parsed;
  }

  // Ask the same LLM to repair the invalid JSON
  const repaired = await callRaw(
    ctx,
    "Voce corrige JSON invalido. Retorne apenas JSON valido, sem markdown, sem comentarios.",
    `Corrija o JSON abaixo e preserve todos os campos e valores:\n\n${clean}`,
    { temperature: 0, maxOutputTokens: 3000, jsonMode: true },
  );
  const cleanRepaired = stripCodeFences(repaired);

  const reparsed = tryParseJson<T>(cleanRepaired);
  if (reparsed !== null) return reparsed;

  for (const candidate of extractJsonSubstring(cleanRepaired)) {
    const parsed = tryParseJson<T>(candidate);
    if (parsed !== null) return parsed;
  }

  throw new HttpError(500, "LLM retornou JSON invalido apos tentativa de reparo.");
};

/**
 * Resolves the LLM provider and API key for a user.
 * Uses requestedProvider if specified and available; otherwise falls back
 * to the first configured provider in priority order (gemini first).
 */
export const resolveUserLLM = async (
  svc: any,
  userId: string,
  requestedProvider?: string,
): Promise<LLMContext> => {
  const { data, error } = await svc
    .from("user_ai_api_keys")
    .select("provider, api_key")
    .eq("user_id", userId);

  if (error) {
    throw new HttpError(500, "Nao foi possivel carregar as chaves de API do usuario.");
  }

  const keys = (data || []) as { provider: string; api_key: string }[];

  if (requestedProvider && SUPPORTED_PROVIDERS.includes(requestedProvider as SupportedLLMProvider)) {
    const match = keys.find((k) => k.provider === requestedProvider);
    if (match) {
      return { provider: requestedProvider as SupportedLLMProvider, apiKey: match.api_key };
    }
    throw new HttpError(
      400,
      `Chave do provedor "${requestedProvider}" nao configurada. Acesse Configuracoes > APIs.`,
    );
  }

  // No specific provider requested — pick first available in priority order
  for (const p of SUPPORTED_PROVIDERS) {
    const match = keys.find((k) => k.provider === p);
    if (match) return { provider: p, apiKey: match.api_key };
  }

  throw new HttpError(
    400,
    "Nenhuma chave de IA configurada. Acesse Configuracoes > APIs e adicione pelo menos uma chave.",
  );
};
