-- Campaign webhook settings for n8n or other HTTP orchestrators

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS campaign_webhook_url text,
  ADD COLUMN IF NOT EXISTS campaign_webhook_secret text;

COMMENT ON COLUMN public.profiles.campaign_webhook_url IS
  'Outbound campaign webhook URL used to post lead payloads to n8n or another orchestrator.';

COMMENT ON COLUMN public.profiles.campaign_webhook_secret IS
  'Optional shared secret sent in the X-N8N-Webhook-Secret header for campaign webhook requests.';
