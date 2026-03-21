-- Feedbacks table
CREATE TABLE public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
ON public.feedbacks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all feedbacks
CREATE POLICY "Admins can view all feedbacks"
ON public.feedbacks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
