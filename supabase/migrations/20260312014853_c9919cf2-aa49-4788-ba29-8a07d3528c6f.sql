
CREATE TABLE public.presentation_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id uuid NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  viewer_ip text
);

ALTER TABLE public.presentation_views ENABLE ROW LEVEL SECURITY;

-- Anon can insert views (register a view on public presentations)
CREATE POLICY "Anon can insert views"
ON public.presentation_views
FOR INSERT
TO anon
WITH CHECK (true);

-- Authenticated users can read views for their own presentations
CREATE POLICY "Users can read own presentation views"
ON public.presentation_views
FOR SELECT
TO authenticated
USING (
  presentation_id IN (
    SELECT id FROM public.presentations WHERE user_id = auth.uid()
  )
);
