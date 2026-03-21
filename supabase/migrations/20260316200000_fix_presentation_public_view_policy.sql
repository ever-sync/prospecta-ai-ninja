-- Allow authenticated users to view any presentation by public_id (shared links)
-- Previously only anon could view via public_id, breaking links for logged-in users
DROP POLICY IF EXISTS "Authenticated can view by public_id" ON public.presentations;

CREATE POLICY "Authenticated can view by public_id"
  ON public.presentations FOR SELECT TO authenticated
  USING (public_id IS NOT NULL);
