-- Campaign operational blocking reason for scheduler and UI diagnostics

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS blocking_reason text,
  ADD COLUMN IF NOT EXISTS last_blocked_at timestamptz;

COMMENT ON COLUMN public.campaigns.blocking_reason IS
  'Operational reason that blocked or cancelled campaign dispatch, such as missing webhook target, missing Meta credentials, or email sender not ready.';

COMMENT ON COLUMN public.campaigns.last_blocked_at IS
  'Last timestamp when campaign dispatch was blocked due to missing configuration.';
