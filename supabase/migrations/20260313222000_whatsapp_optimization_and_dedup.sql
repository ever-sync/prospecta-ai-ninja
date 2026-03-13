-- WhatsApp optimization loop support and conversion dedup safeguards

-- Ensure click/response events are unique per presentation and campaign presentation
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_conversion_events_unique_response
  ON public.message_conversion_events (
    event_type,
    presentation_id,
    COALESCE(campaign_presentation_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE event_type IN ('clicked_accept', 'clicked_reject', 'accepted', 'rejected');

-- Store weekly optimization runs for cadence control and audit
CREATE TABLE IF NOT EXISTS public.whatsapp_optimization_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  mode text NOT NULL DEFAULT 'auto' CHECK (mode IN ('auto', 'manual')),
  lookback_days integer NOT NULL DEFAULT 14,
  min_sample integer NOT NULL DEFAULT 20,
  groups_evaluated integer NOT NULL DEFAULT 0,
  groups_promoted integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_optimization_runs_user_created
  ON public.whatsapp_optimization_runs(user_id, created_at DESC);

ALTER TABLE public.whatsapp_optimization_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own optimization runs"
  ON public.whatsapp_optimization_runs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own optimization runs"
  ON public.whatsapp_optimization_runs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
