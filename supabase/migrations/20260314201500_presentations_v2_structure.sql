ALTER TABLE public.presentations
ADD COLUMN IF NOT EXISTS presentation_version text NOT NULL DEFAULT 'v1',
ADD COLUMN IF NOT EXISTS presentation_content jsonb;
