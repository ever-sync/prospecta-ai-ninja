
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  stripe_price_id text,
  stripe_product_id text,
  limit_presentations integer NOT NULL DEFAULT 50,
  limit_campaigns integer NOT NULL DEFAULT 2,
  limit_emails integer NOT NULL DEFAULT 50,
  features text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Admins can manage plans" ON public.plans FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

INSERT INTO public.plans (id, name, price_cents, stripe_price_id, stripe_product_id, limit_presentations, limit_campaigns, limit_emails, features, display_order)
VALUES 
  ('free', 'Gratuito', 0, NULL, NULL, 50, 2, 50, ARRAY['50 apresentações/mês', '2 campanhas', '50 emails/mês', 'Suporte por email'], 0),
  ('pro', 'Pro', 9700, 'price_1TA7qdLxnwoSfHjZjHCtVj9K', 'prod_U8Odcw8tJ1x18X', 500, -1, 500, ARRAY['500 apresentações/mês', 'Campanhas ilimitadas', '500 emails/mês', 'Suporte prioritário', 'Templates premium'], 1),
  ('enterprise', 'Enterprise', 29700, 'price_1TA7r1LxnwoSfHjZmlYCFwAB', 'prod_U8OewqNe8GDZ5t', -1, -1, -1, ARRAY['Apresentações ilimitadas', 'Campanhas ilimitadas', 'Emails ilimitados', 'API dedicada', 'Suporte 24/7', 'White-label'], 2);
