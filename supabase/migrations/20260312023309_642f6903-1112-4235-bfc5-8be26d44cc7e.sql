
ALTER TABLE public.presentations
ADD COLUMN lead_response text DEFAULT 'pending'
CHECK (lead_response IN ('pending', 'accepted', 'rejected'));

-- Allow anon to update ONLY the lead_response column via public_id
CREATE POLICY "Anon can update lead_response"
  ON public.presentations
  FOR UPDATE TO anon
  USING (public_id IS NOT NULL)
  WITH CHECK (public_id IS NOT NULL);
