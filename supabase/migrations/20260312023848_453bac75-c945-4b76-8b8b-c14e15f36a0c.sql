
-- Campaigns table
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'webhook')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns" ON public.campaigns
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaigns" ON public.campaigns
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON public.campaigns
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON public.campaigns
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Junction table: campaign <-> presentations
CREATE TABLE public.campaign_presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  presentation_id uuid NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  send_status text DEFAULT 'pending' CHECK (send_status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, presentation_id)
);

ALTER TABLE public.campaign_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign presentations" ON public.campaign_presentations
  FOR SELECT TO authenticated
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own campaign presentations" ON public.campaign_presentations
  FOR INSERT TO authenticated
  WITH CHECK (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own campaign presentations" ON public.campaign_presentations
  FOR UPDATE TO authenticated
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own campaign presentations" ON public.campaign_presentations
  FOR DELETE TO authenticated
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));
