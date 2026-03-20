-- Remove the artificial 2-key limit — users can now add as many AI provider keys as they want

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_ai_api_keys'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_user_ai_api_keys_limit ON public.user_ai_api_keys';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.enforce_user_ai_api_keys_limit();
