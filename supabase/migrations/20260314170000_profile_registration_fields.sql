ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS document_number text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_document_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_document_type_check
  CHECK (document_type IS NULL OR document_type IN ('cpf', 'cnpj'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_document text;
BEGIN
  raw_document := regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'document_number', ''), '\D', '', 'g');

  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    company_name,
    phone,
    document_type,
    document_number
  )
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), ''),
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'company_name', '')), ''),
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), ''),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'document_type', '') IN ('cpf', 'cnpj')
        THEN NEW.raw_user_meta_data ->> 'document_type'
      WHEN length(raw_document) = 11 THEN 'cpf'
      WHEN length(raw_document) = 14 THEN 'cnpj'
      ELSE NULL
    END,
    NULLIF(raw_document, '')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    company_name = COALESCE(profiles.company_name, EXCLUDED.company_name),
    phone = COALESCE(profiles.phone, EXCLUDED.phone),
    document_type = COALESCE(profiles.document_type, EXCLUDED.document_type),
    document_number = COALESCE(profiles.document_number, EXCLUDED.document_number);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_email_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;

CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_profile_email_from_auth();

CREATE OR REPLACE FUNCTION public.protect_locked_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.document_number IS NOT NULL AND NEW.document_number IS DISTINCT FROM OLD.document_number THEN
    RAISE EXCEPTION 'document_number_locked';
  END IF;

  IF OLD.document_type IS NOT NULL AND NEW.document_type IS DISTINCT FROM OLD.document_type THEN
    RAISE EXCEPTION 'document_type_locked';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email AND current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    RAISE EXCEPTION 'profile_email_managed_by_auth';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_locked_profile_fields_trigger ON public.profiles;

CREATE TRIGGER protect_locked_profile_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_locked_profile_fields();
