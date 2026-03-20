-- Meta WhatsApp template approval fields

-- WABA ID needed to manage templates via Meta API
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_business_account_id text;

-- Per-template Meta approval state
ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS meta_template_name       text,
  ADD COLUMN IF NOT EXISTS meta_template_status     text NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS meta_template_language   text NOT NULL DEFAULT 'pt_BR',
  ADD COLUMN IF NOT EXISTS meta_variable_order      jsonb;

-- meta_template_status values:
--   not_submitted | pending | approved | rejected | disabled | paused | in_appeal | deleted

COMMENT ON COLUMN public.message_templates.meta_template_name IS
  'Name submitted to Meta for approval (snake_case, unique per WABA)';
COMMENT ON COLUMN public.message_templates.meta_template_status IS
  'Approval status returned by Meta: not_submitted | pending | approved | rejected | disabled';
COMMENT ON COLUMN public.message_templates.meta_variable_order IS
  'Ordered list of our variable keys mapped to Meta {{1}}, {{2}}, ... — e.g. ["nome_empresa","link_proposta","sua_empresa"]';
