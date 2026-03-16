import { HttpError } from "./auth.ts";

type GeminiOptions = {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
};

const MAX_GEMINI_RETRIES = 3;
const FALLBACK_RETRY_MS = 30000;

const extractText = (payload: any): string => {
  const blockReason = payload?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new HttpError(500, `Gemini bloqueou a resposta: ${blockReason}.`);
  }

  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .map((part: any) => part?.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new HttpError(500, "Gemini nao retornou conteudo.");
  }

  return text;
};

const stripCodeFences = (text: string) =>
  text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

const tryParseJson = <T>(text: string): T | null => {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

const extractJsonSubstring = (text: string) => {
  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");

  const candidates = [
    objectStart >= 0 && objectEnd > objectStart ? text.slice(objectStart, objectEnd + 1) : null,
    arrayStart >= 0 && arrayEnd > arrayStart ? text.slice(arrayStart, arrayEnd + 1) : null,
  ].filter(Boolean) as string[];

  return candidates;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractRetryDelayMs = (payload: any, response: Response) => {
  const retryAfterHeader = response.headers.get("retry-after");
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  const message = String(payload?.error?.message || payload?.message || "");
  const retryMatch = message.match(/retry in\s+([\d.]+)s/i);
  if (retryMatch) {
    const seconds = Number(retryMatch[1]);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  return FALLBACK_RETRY_MS;
};

const isRetryableGeminiError = (payload: any, response: Response) => {
  if (response.status !== 429) return false;
  const message = String(payload?.error?.message || payload?.message || "");
  return /quota exceeded|rate limit|please retry in|generate_content_free_tier_requests/i.test(message);
};

const repairJsonWithGemini = async <T>(
  apiKey: string,
  model: string,
  invalidJson: string,
): Promise<T | null> => {
  const repairedText = await callGemini(
    apiKey,
    model,
    "Voce corrige JSON invalido. Retorne apenas JSON valido, sem markdown, sem comentarios e sem texto adicional.",
    `Corrija o JSON abaixo e preserve o maximo de campos e valores.\n\n${invalidJson}`,
    {
      temperature: 0,
      maxOutputTokens: 2500,
      responseMimeType: "application/json",
    },
  );

  const cleanRepairedText = stripCodeFences(repairedText);
  const direct = tryParseJson<T>(cleanRepairedText);
  if (direct !== null) {
    return direct;
  }

  for (const candidate of extractJsonSubstring(cleanRepairedText)) {
    const parsed = tryParseJson<T>(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
};

const callGemini = async (
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: GeminiOptions = {},
): Promise<string> => {
  for (let attempt = 0; attempt <= MAX_GEMINI_RETRIES; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: options.temperature ?? 0.4,
            maxOutputTokens: options.maxOutputTokens ?? 2048,
            ...(options.responseMimeType
              ? { responseMimeType: options.responseMimeType }
              : {}),
          },
        }),
      },
    );

    const payload = await response.json().catch(() => ({}));

    if (response.ok) {
      return extractText(payload);
    }

    if (isRetryableGeminiError(payload, response) && attempt < MAX_GEMINI_RETRIES) {
      const retryDelayMs = extractRetryDelayMs(payload, response);
      await sleep(retryDelayMs);
      continue;
    }

    const message =
      payload?.error?.message ||
      payload?.message ||
      `Gemini request failed with status ${response.status}`;
    throw new HttpError(response.status, message);
  }

  throw new HttpError(500, "Gemini request failed after retries.");
};

export const callGeminiText = async (
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: GeminiOptions = {},
): Promise<string> =>
  callGemini(apiKey, model, systemPrompt, userPrompt, options);

export const callGeminiJson = async <T>(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: GeminiOptions = {},
): Promise<T> => {
  const text = await callGemini(apiKey, model, systemPrompt, userPrompt, {
    ...options,
    responseMimeType: "application/json",
  });

  const cleanText = stripCodeFences(text);
  const direct = tryParseJson<T>(cleanText);
  if (direct !== null) {
    return direct;
  }

  for (const candidate of extractJsonSubstring(cleanText)) {
    const parsed = tryParseJson<T>(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  const repaired = await repairJsonWithGemini<T>(apiKey, model, cleanText);
  if (repaired !== null) {
    return repaired;
  }

  throw new HttpError(500, "Gemini retornou JSON invalido.");
};
