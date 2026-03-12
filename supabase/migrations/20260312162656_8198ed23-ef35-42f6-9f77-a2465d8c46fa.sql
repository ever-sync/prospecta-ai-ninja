
CREATE TABLE public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service text NOT NULL, -- 'firecrawl', 'resend', 'ai'
  operation text NOT NULL, -- 'scrape', 'search', 'send_email', 'analyze', 'generate', etc.
  tokens_used integer DEFAULT 0,
  cost_estimate_cents numeric(10,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_usage_service ON public.api_usage_logs(service);
CREATE INDEX idx_api_usage_created ON public.api_usage_logs(created_at);
CREATE INDEX idx_api_usage_user ON public.api_usage_logs(user_id);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all usage logs"
  ON public.api_usage_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert usage logs"
  ON public.api_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
