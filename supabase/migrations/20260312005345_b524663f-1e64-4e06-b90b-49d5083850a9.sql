
-- Presentations table
CREATE TABLE public.presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  public_id uuid UNIQUE DEFAULT gen_random_uuid(),
  business_name text,
  business_address text,
  business_phone text,
  business_website text,
  business_category text,
  business_rating numeric,
  analysis_data jsonb DEFAULT '{}'::jsonb,
  presentation_html text DEFAULT '',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

-- Authenticated user policies
CREATE POLICY "Users can view own presentations"
  ON public.presentations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presentations"
  ON public.presentations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presentations"
  ON public.presentations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presentations"
  ON public.presentations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Public access by public_id (for shared links)
CREATE POLICY "Public can view by public_id"
  ON public.presentations FOR SELECT TO anon
  USING (public_id IS NOT NULL);
