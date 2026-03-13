-- Expand company DNA with commercial and ICP fields for better conversion

ALTER TABLE public.company_dna
  ADD COLUMN IF NOT EXISTS icp_segments text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS icp_company_size text DEFAULT '',
  ADD COLUMN IF NOT EXISTS icp_digital_maturity text DEFAULT '',
  ADD COLUMN IF NOT EXISTS priority_pains text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS common_objections text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS objection_responses text DEFAULT '',
  ADD COLUMN IF NOT EXISTS offer_packages text DEFAULT '',
  ADD COLUMN IF NOT EXISTS price_range text DEFAULT '',
  ADD COLUMN IF NOT EXISTS case_metrics text DEFAULT '',
  ADD COLUMN IF NOT EXISTS guarantee text DEFAULT '';
