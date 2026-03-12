
-- Testimonials table
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  testimonial text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own testimonials" ON public.testimonials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own testimonials" ON public.testimonials
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own testimonials" ON public.testimonials
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own testimonials" ON public.testimonials
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for testimonial images
INSERT INTO storage.buckets (id, name, public) VALUES ('testimonials', 'testimonials', true);

CREATE POLICY "Authenticated users can upload testimonial images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'testimonials' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view testimonial images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'testimonials');

CREATE POLICY "Users can delete own testimonial images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'testimonials' AND (storage.foldername(name))[1] = auth.uid()::text);
