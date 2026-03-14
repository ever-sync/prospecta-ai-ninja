import { HttpError } from "./auth.ts";

type GeminiOptions = {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
};

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

const callGemini = async (
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: GeminiOptions = {},
): Promise<string> => {
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

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Gemini request failed with status ${response.status}`;
    throw new HttpError(response.status, message);
  }

  return extractText(payload);
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

  throw new HttpError(500, "Gemini retornou JSON invalido.");
};
