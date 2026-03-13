-- WhatsApp hybrid conversion tracking and delivery telemetry

-- Extend campaign_presentations with delivery/variant metadata
ALTER TABLE public.campaign_presentations
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  ADD COLUMN IF NOT EXISTS last_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS followup_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_followup_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_campaign_presentations_provider_message_id
  ON public.campaign_presentations(provider_message_id);

CREATE INDEX IF NOT EXISTS idx_campaign_presentations_delivery_status
  ON public.campaign_presentations(delivery_status);

CREATE INDEX IF NOT EXISTS idx_campaign_presentations_next_followup
  ON public.campaign_presentations(next_followup_at);

-- Extend templates to support explicit A/B metadata and segmentation
ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS variant_key text NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS experiment_group text,
  ADD COLUMN IF NOT EXISTS target_persona text,
  ADD COLUMN IF NOT EXISTS campaign_objective text,
  ADD COLUMN IF NOT EXISTS cta_trigger text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_message_templates_experiment_group
  ON public.message_templates(experiment_group);

CREATE INDEX IF NOT EXISTS idx_message_templates_channel_active
  ON public.message_templates(channel, is_active);

-- Attempts table: one row per send/retry/follow-up execution
CREATE TABLE IF NOT EXISTS public.campaign_message_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_presentation_id uuid NOT NULL REFERENCES public.campaign_presentations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  presentation_id uuid NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'webhook')),
  send_mode text NOT NULL DEFAULT 'manual' CHECK (send_mode IN ('manual', 'api', 'followup')),
  provider text NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual', 'meta_cloud', 'resend', 'other')),
  attempt_no integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'retrying')),
  provider_message_id text,
  error_reason text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  followup_step integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  next_followup_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_message_attempts_campaign
  ON public.campaign_message_attempts(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_message_attempts_presentation
  ON public.campaign_message_attempts(presentation_id);

CREATE INDEX IF NOT EXISTS idx_campaign_message_attempts_status
  ON public.campaign_message_attempts(status);

CREATE INDEX IF NOT EXISTS idx_campaign_message_attempts_next_retry
  ON public.campaign_message_attempts(next_retry_at);

CREATE INDEX IF NOT EXISTS idx_campaign_message_attempts_next_followup
  ON public.campaign_message_attempts(next_followup_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_message_attempts_provider_message_id
  ON public.campaign_message_attempts(provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

ALTER TABLE public.campaign_message_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign attempts"
  ON public.campaign_message_attempts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaign attempts"
  ON public.campaign_message_attempts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaign attempts"
  ON public.campaign_message_attempts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Conversion events table: end-to-end funnel telemetry
CREATE TABLE IF NOT EXISTS public.message_conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (
    event_type IN ('sent', 'delivered', 'opened', 'clicked_accept', 'clicked_reject', 'accepted', 'rejected')
  ),
  presentation_id uuid NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  user_id uuid,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  campaign_presentation_id uuid REFERENCES public.campaign_presentations(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'webhook', 'unknown')),
  pipeline_stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  niche text,
  score_bucket text NOT NULL DEFAULT 'unknown' CHECK (score_bucket IN ('low', 'medium', 'high', 'unknown')),
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_message_conversion_events_created_at
  ON public.message_conversion_events(created_at);

CREATE INDEX IF NOT EXISTS idx_message_conversion_events_event_type
  ON public.message_conversion_events(event_type);

CREATE INDEX IF NOT EXISTS idx_message_conversion_events_campaign
  ON public.message_conversion_events(campaign_id);

CREATE INDEX IF NOT EXISTS idx_message_conversion_events_template
  ON public.message_conversion_events(template_id);

CREATE INDEX IF NOT EXISTS idx_message_conversion_events_presentation
  ON public.message_conversion_events(presentation_id);

ALTER TABLE public.message_conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversion events"
  ON public.message_conversion_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversion events"
  ON public.message_conversion_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anon can insert opened and click events"
  ON public.message_conversion_events
  FOR INSERT TO anon
  WITH CHECK (event_type IN ('opened', 'clicked_accept', 'clicked_reject'));
