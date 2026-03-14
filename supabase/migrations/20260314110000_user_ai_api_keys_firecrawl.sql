ALTER TABLE public.user_ai_api_keys
  DROP CONSTRAINT IF EXISTS user_ai_api_keys_provider_check;

ALTER TABLE public.user_ai_api_keys
  ADD CONSTRAINT user_ai_api_keys_provider_check
  CHECK (provider IN ('gemini', 'firecrawl', 'claude_code', 'groq', 'openai', 'other'));
