
CREATE TABLE public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#22c55e',
  position integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  default_status text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stages" ON public.pipeline_stages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stages" ON public.pipeline_stages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stages" ON public.pipeline_stages FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own stages" ON public.pipeline_stages FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.presentations ADD COLUMN pipeline_stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;
