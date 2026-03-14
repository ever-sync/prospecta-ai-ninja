-- Form builder: schemas and responses

CREATE TABLE IF NOT EXISTS form_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid UNIQUE REFERENCES message_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Formulário de Qualificação',
  description text NOT NULL DEFAULT '',
  thank_you_message text NOT NULL DEFAULT 'Obrigado! Em breve entraremos em contato.',
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  slug text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_schema_id uuid NOT NULL REFERENCES form_schemas(id) ON DELETE CASCADE,
  presentation_id uuid REFERENCES presentations(id) ON DELETE SET NULL,
  respondent_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);

ALTER TABLE form_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

-- Owners can manage their form schemas
CREATE POLICY "Users manage own form_schemas"
  ON form_schemas FOR ALL
  USING (user_id = auth.uid());

-- Anyone can read a form schema (needed for public form page)
CREATE POLICY "Anyone can read form_schemas"
  ON form_schemas FOR SELECT
  USING (true);

-- Owners can read responses to their forms
CREATE POLICY "Users read own form_responses"
  ON form_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM form_schemas
      WHERE form_schemas.id = form_responses.form_schema_id
        AND form_schemas.user_id = auth.uid()
    )
  );

-- Anyone (anon) can insert a response (public form submission)
CREATE POLICY "Anyone can submit form_responses"
  ON form_responses FOR INSERT
  WITH CHECK (true);
