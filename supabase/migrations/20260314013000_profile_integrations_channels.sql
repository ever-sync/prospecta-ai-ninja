-- Profile-level integrations: WhatsApp official/unofficial, sender email and proposal link domain

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_connection_type text NOT NULL DEFAULT 'unofficial',
  ADD COLUMN IF NOT EXISTS whatsapp_official_access_token text,
  ADD COLUMN IF NOT EXISTS whatsapp_official_phone_number_id text,
  ADD COLUMN IF NOT EXISTS whatsapp_unofficial_api_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_unofficial_api_token text,
  ADD COLUMN IF NOT EXISTS whatsapp_unofficial_instance text,
  ADD COLUMN IF NOT EXISTS campaign_sender_email text,
  ADD COLUMN IF NOT EXISTS campaign_sender_name text,
  ADD COLUMN IF NOT EXISTS proposal_link_domain text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_whatsapp_connection_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_whatsapp_connection_type_check
      CHECK (whatsapp_connection_type IN ('unofficial', 'meta_official'));
  END IF;
END
$$;
