-- Campaign operational event history for audit and support diagnostics

CREATE TABLE IF NOT EXISTS public.campaign_operation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'unknown'
    CHECK (channel IN ('whatsapp', 'email', 'webhook', 'unknown')),
  event_type text NOT NULL
    CHECK (event_type IN ('blocked', 'cancelled', 'dispatch_failed', 'dispatch_completed', 'manual_action')),
  source text NOT NULL DEFAULT 'unknown',
  reason_code text,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_campaign_operation_events_campaign
  ON public.campaign_operation_events(campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_operation_events_user
  ON public.campaign_operation_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_operation_events_type
  ON public.campaign_operation_events(event_type);

ALTER TABLE public.campaign_operation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign operation events"
  ON public.campaign_operation_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaign operation events"
  ON public.campaign_operation_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.campaign_operation_events IS
  'Operational audit trail for campaign-level blocks, cancellations, failures, and manual actions.';

COMMENT ON COLUMN public.campaign_operation_events.reason_code IS
  'Stable machine-readable reason such as missing-meta-credentials or email-sender-not-ready.';
