
-- Storage bucket for client logos gallery
INSERT INTO storage.buckets (id, name, public) VALUES ('client-logos', 'client-logos', true);

CREATE POLICY "Authenticated users can upload client logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view client logos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'client-logos');

CREATE POLICY "Users can delete own client logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Client logos table
CREATE TABLE public.client_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL DEFAULT '',
  logo_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client logos" ON public.client_logos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own client logos" ON public.client_logos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own client logos" ON public.client_logos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
