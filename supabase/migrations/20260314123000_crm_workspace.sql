ALTER TABLE public.presentations
  ADD COLUMN IF NOT EXISTS outcome_reason text,
  ADD COLUMN IF NOT EXISTS outcome_notes text;

CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  presentation_id uuid NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('followup', 'call', 'send_message', 'review_proposal', 'schedule_meeting', 'send_next_step')),
  title text NOT NULL,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_user_status_due
  ON public.crm_tasks(user_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_presentation
  ON public.crm_tasks(presentation_id);

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crm tasks"
  ON public.crm_tasks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crm tasks"
  ON public.crm_tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm tasks"
  ON public.crm_tasks
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crm tasks"
  ON public.crm_tasks
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.crm_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_views_user_created
  ON public.crm_views(user_id, created_at);

ALTER TABLE public.crm_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crm views"
  ON public.crm_views
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crm views"
  ON public.crm_views
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm views"
  ON public.crm_views
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crm views"
  ON public.crm_views
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.crm_lead_snapshot
WITH (security_invoker = true) AS
WITH note_counts AS (
  SELECT ln.presentation_id, COUNT(*)::int AS note_count
  FROM public.lead_notes ln
  GROUP BY ln.presentation_id
),
view_counts AS (
  SELECT pv.presentation_id, COUNT(*)::int AS view_count
  FROM public.presentation_views pv
  GROUP BY pv.presentation_id
),
campaign_agg AS (
  SELECT
    cp.presentation_id,
    COUNT(DISTINCT cp.campaign_id)::int AS campaign_count,
    BOOL_OR(
      cp.send_status = 'sent'
      OR cp.sent_at IS NOT NULL
      OR COALESCE(cp.delivery_status, 'pending') IN ('sent', 'delivered', 'read')
    ) AS has_sent,
    MAX(cp.sent_at) AS last_sent_at,
    BOOL_OR(cp.next_followup_at IS NOT NULL AND cp.next_followup_at <= now()) AS followup_due,
    MIN(cp.next_followup_at) FILTER (WHERE cp.next_followup_at IS NOT NULL) AS next_followup_at
  FROM public.campaign_presentations cp
  GROUP BY cp.presentation_id
),
latest_campaign AS (
  SELECT DISTINCT ON (cp.presentation_id)
    cp.presentation_id,
    c.channel AS last_channel
  FROM public.campaign_presentations cp
  JOIN public.campaigns c ON c.id = cp.campaign_id
  ORDER BY cp.presentation_id, COALESCE(cp.last_status_at, cp.sent_at, cp.created_at) DESC, cp.created_at DESC
),
event_agg AS (
  SELECT
    e.presentation_id,
    MAX(e.created_at) FILTER (WHERE e.event_type = 'sent') AS last_event_sent_at,
    MAX(e.created_at) FILTER (WHERE e.event_type = 'opened') AS last_opened_at,
    MAX(e.created_at) FILTER (WHERE e.event_type IN ('accepted', 'rejected')) AS last_response_at,
    COUNT(*) FILTER (WHERE e.event_type = 'sent')::int AS sent_event_count,
    COUNT(*) FILTER (WHERE e.event_type = 'opened')::int AS opened_event_count
  FROM public.message_conversion_events e
  GROUP BY e.presentation_id
),
latest_event AS (
  SELECT DISTINCT ON (e.presentation_id)
    e.presentation_id,
    e.channel AS last_channel,
    e.event_type AS last_event_type,
    e.created_at AS last_event_at
  FROM public.message_conversion_events e
  ORDER BY e.presentation_id, e.created_at DESC
)
SELECT
  p.id AS presentation_id,
  p.user_id,
  p.public_id,
  p.business_name,
  p.business_phone,
  p.business_email,
  p.business_website,
  p.business_address,
  p.business_category,
  p.pipeline_stage_id,
  p.status,
  p.lead_response,
  p.outcome_reason,
  p.outcome_notes,
  p.created_at,
  p.presentation_html,
  CASE
    WHEN COALESCE(p.lead_response, 'pending') <> 'pending' THEN 'responded'
    WHEN COALESCE(ca.has_sent, false) OR COALESCE(ea.sent_event_count, 0) > 0 OR p.status = 'sent' THEN 'sent'
    WHEN p.status = 'ready' THEN 'ready'
    ELSE 'pending'
  END AS system_status,
  COALESCE(le.last_channel, lc.last_channel, 'unknown') AS last_channel,
  CASE
    WHEN ca.last_sent_at IS NULL THEN ea.last_event_sent_at
    WHEN ea.last_event_sent_at IS NULL THEN ca.last_sent_at
    ELSE GREATEST(ca.last_sent_at, ea.last_event_sent_at)
  END AS last_sent_at,
  ea.last_opened_at,
  ea.last_response_at,
  COALESCE(vc.view_count, 0) AS view_count,
  COALESCE(ca.campaign_count, 0) AS campaign_count,
  COALESCE(ca.followup_due, false) AS followup_due,
  ca.next_followup_at,
  COALESCE(nc.note_count, 0) AS note_count,
  (p.status = 'ready' AND NOT COALESCE(ca.has_sent, false)) AS is_ready_not_sent,
  ((COALESCE(vc.view_count, 0) > 0 OR COALESCE(ea.opened_event_count, 0) > 0) AND COALESCE(p.lead_response, 'pending') = 'pending') AS is_opened_no_response,
  (
    (
      (COALESCE(vc.view_count, 0) > 0 OR COALESCE(ea.opened_event_count, 0) > 0)
      AND COALESCE(p.lead_response, 'pending') = 'pending'
    )
    OR (
      COALESCE((p.analysis_data #>> '{scores,overall}')::numeric, 0) >= 80
      AND COALESCE(ca.has_sent, false)
      AND COALESCE(p.lead_response, 'pending') = 'pending'
    )
  ) AS is_hot,
  CASE
    WHEN COALESCE(p.lead_response, 'pending') = 'accepted' THEN 'hot'
    WHEN (
      (COALESCE(vc.view_count, 0) > 0 OR COALESCE(ea.opened_event_count, 0) > 0)
      AND COALESCE(p.lead_response, 'pending') = 'pending'
    ) THEN 'hot'
    WHEN COALESCE(ca.has_sent, false) OR p.status = 'ready' THEN 'warm'
    ELSE 'cold'
  END AS temperature,
  COALESCE((p.analysis_data #>> '{scores,overall}')::numeric, NULL) AS analysis_score,
  le.last_event_type,
  le.last_event_at
FROM public.presentations p
LEFT JOIN note_counts nc ON nc.presentation_id = p.id
LEFT JOIN view_counts vc ON vc.presentation_id = p.id
LEFT JOIN campaign_agg ca ON ca.presentation_id = p.id
LEFT JOIN latest_campaign lc ON lc.presentation_id = p.id
LEFT JOIN event_agg ea ON ea.presentation_id = p.id
LEFT JOIN latest_event le ON le.presentation_id = p.id;
