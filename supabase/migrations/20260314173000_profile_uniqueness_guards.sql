UPDATE public.profiles
SET
  email = NULLIF(lower(trim(email)), ''),
  document_number = NULLIF(regexp_replace(COALESCE(document_number, ''), '\D', '', 'g'), '');

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_document_number_unique;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_document_number_unique UNIQUE (document_number);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;
