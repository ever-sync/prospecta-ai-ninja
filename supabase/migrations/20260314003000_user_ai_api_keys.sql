-- User-provided AI API keys (max 2 per user)

CREATE TABLE IF NOT EXISTS public.user_ai_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('gemini', 'claude_code', 'groq', 'openai', 'other')),
  custom_provider text,
  api_key text NOT NULL CHECK (length(trim(api_key)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_ai_api_keys_user_provider
  ON public.user_ai_api_keys(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_user_ai_api_keys_user
  ON public.user_ai_api_keys(user_id);

CREATE OR REPLACE FUNCTION public.enforce_user_ai_api_keys_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.user_ai_api_keys WHERE user_id = NEW.user_id) >= 2 THEN
    RAISE EXCEPTION 'Maximum of 2 API keys per user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_ai_api_keys_limit ON public.user_ai_api_keys;
CREATE TRIGGER trg_user_ai_api_keys_limit
  BEFORE INSERT ON public.user_ai_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_ai_api_keys_limit();

CREATE OR REPLACE FUNCTION public.set_user_ai_api_keys_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_ai_api_keys_updated_at ON public.user_ai_api_keys;
CREATE TRIGGER trg_user_ai_api_keys_updated_at
  BEFORE UPDATE ON public.user_ai_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_ai_api_keys_updated_at();

ALTER TABLE public.user_ai_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai api keys" ON public.user_ai_api_keys;
CREATE POLICY "Users can view own ai api keys"
  ON public.user_ai_api_keys
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ai api keys" ON public.user_ai_api_keys;
CREATE POLICY "Users can insert own ai api keys"
  ON public.user_ai_api_keys
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ai api keys" ON public.user_ai_api_keys;
CREATE POLICY "Users can update own ai api keys"
  ON public.user_ai_api_keys
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ai api keys" ON public.user_ai_api_keys;
CREATE POLICY "Users can delete own ai api keys"
  ON public.user_ai_api_keys
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
