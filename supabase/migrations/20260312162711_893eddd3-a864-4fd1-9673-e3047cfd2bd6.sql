
DROP POLICY "Service role can insert usage logs" ON public.api_usage_logs;

CREATE POLICY "Authenticated can insert own usage logs"
  ON public.api_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
