export type ApiProvider = 'gemini' | 'claude_code' | 'groq' | 'openai' | 'other';

export type UserAiApiKey = {
  id: string;
  provider: ApiProvider;
  custom_provider: string | null;
  api_key: string;
  created_at: string;
  updated_at: string;
};

export const API_PROVIDER_OPTIONS: Array<{ value: ApiProvider; label: string }> = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'claude_code', label: 'Claude (Anthropic)' },
  { value: 'groq', label: 'Groq' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'other', label: 'Outro' },
];

export const providerLabel = (provider: ApiProvider, customProvider: string | null) => {
  if (provider === 'other' && customProvider) return customProvider;
  return API_PROVIDER_OPTIONS.find((item) => item.value === provider)?.label ?? provider;
};

export const maskApiKey = (value: string) => {
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};
