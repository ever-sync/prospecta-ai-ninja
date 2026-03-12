ALTER TABLE public.company_dna
ADD COLUMN IF NOT EXISTS presentation_template text DEFAULT 'modern-dark',
ADD COLUMN IF NOT EXISTS presentation_tone text DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS presentation_instructions text DEFAULT '';