CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  channel text NOT NULL DEFAULT 'whatsapp',
  subject text DEFAULT '',
  body text NOT NULL DEFAULT '',
  image_url text DEFAULT '',
  include_proposal_link boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON public.message_templates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON public.message_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.message_templates
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.message_templates
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add template_id to campaigns
ALTER TABLE public.campaigns ADD COLUMN template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL;