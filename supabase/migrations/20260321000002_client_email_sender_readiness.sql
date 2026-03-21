-- Client-owned campaign email sender readiness and reply-to support

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS campaign_reply_to_email text,
  ADD COLUMN IF NOT EXISTS email_sender_status text NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS email_sender_provider text,
  ADD COLUMN IF NOT EXISTS email_sender_domain text,
  ADD COLUMN IF NOT EXISTS email_sender_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_sender_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_sender_error text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_email_sender_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_email_sender_status_check
      CHECK (email_sender_status IN ('not_configured', 'pending', 'ready', 'blocked'));
  END IF;
END
$$;

UPDATE public.profiles
SET
  email_sender_status = CASE
    WHEN campaign_sender_email IS NULL OR btrim(campaign_sender_email) = '' THEN 'not_configured'
    ELSE 'pending'
  END,
  email_sender_provider = CASE
    WHEN campaign_sender_email IS NULL OR btrim(campaign_sender_email) = '' THEN NULL
    ELSE COALESCE(email_sender_provider, 'resend')
  END,
  email_sender_domain = CASE
    WHEN campaign_sender_email IS NULL OR btrim(campaign_sender_email) = '' THEN NULL
    ELSE split_part(lower(btrim(campaign_sender_email)), '@', 2)
  END
WHERE
  email_sender_status IS NULL
  OR email_sender_status = 'not_configured'
  OR (campaign_sender_email IS NOT NULL AND btrim(campaign_sender_email) <> '');

COMMENT ON COLUMN public.profiles.campaign_reply_to_email IS
  'Optional reply-to address used for campaign email responses.';

COMMENT ON COLUMN public.profiles.email_sender_status IS
  'Operational readiness for custom campaign sender emails: not_configured, pending, ready, blocked.';

COMMENT ON COLUMN public.profiles.email_sender_provider IS
  'Delivery provider used to validate and send campaign emails, currently resend.';

COMMENT ON COLUMN public.profiles.email_sender_domain IS
  'Domain extracted from the configured custom sender email.';

COMMENT ON COLUMN public.profiles.email_sender_last_checked_at IS
  'Last time the sender readiness was validated against the delivery provider.';

COMMENT ON COLUMN public.profiles.email_sender_verified_at IS
  'Timestamp when the sender domain was confirmed ready for sending.';

COMMENT ON COLUMN public.profiles.email_sender_error IS
  'Last sender validation or provider error shown to the user.';
