-- System email templates for platform transactional emails
CREATE TABLE IF NOT EXISTS system_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text UNIQUE NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE system_email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can read and update; service_role bypasses RLS
DO $$ BEGIN
  CREATE POLICY "Admins can manage system_email_templates"
    ON system_email_templates
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed initial templates
INSERT INTO system_email_templates (type, name, subject, body_html) VALUES
(
  'onboarding',
  'Boas-vindas',
  'Bem-vindo à Prospecta IA! 🚀',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #ef3333; font-size: 28px; margin: 0;">Prospecta IA</h1>
  </div>
  <h2 style="font-size: 22px;">Bem-vindo, {{email}}! 👋</h2>
  <p style="font-size: 16px; line-height: 1.6; color: #555;">
    Sua conta foi criada com sucesso. Agora você tem acesso a uma plataforma completa para prospectar clientes com inteligência artificial.
  </p>
  <p style="font-size: 16px; line-height: 1.6; color: #555;">
    Comece analisando negócios, criando propostas personalizadas e lançando campanhas de prospecção.
  </p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="{{link_dashboard}}" style="background-color: #ef3333; color: white; padding: 14px 28px; border-radius: 24px; text-decoration: none; font-weight: bold; font-size: 16px;">
      Acessar o painel
    </a>
  </div>
  <p style="font-size: 13px; color: #999; text-align: center; margin-top: 32px;">
    Prospecta IA · Boas prospecções!
  </p>
</body>
</html>'
),
(
  'campaign_started',
  'Campanha Enviada',
  'Sua campanha "{{nome_campanha}}" foi enviada! 📤',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #ef3333; font-size: 28px; margin: 0;">Prospecta IA</h1>
  </div>
  <h2 style="font-size: 22px;">Campanha enviada com sucesso! 🎉</h2>
  <p style="font-size: 16px; line-height: 1.6; color: #555;">
    Sua campanha <strong>{{nome_campanha}}</strong> foi disparada para <strong>{{total_enviados}} contatos</strong>.
  </p>
  <p style="font-size: 16px; line-height: 1.6; color: #555;">
    Acompanhe os resultados em tempo real no seu painel.
  </p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="{{link_dashboard}}" style="background-color: #ef3333; color: white; padding: 14px 28px; border-radius: 24px; text-decoration: none; font-weight: bold; font-size: 16px;">
      Ver resultados
    </a>
  </div>
  <p style="font-size: 13px; color: #999; text-align: center; margin-top: 32px;">
    Prospecta IA · Boas prospecções!
  </p>
</body>
</html>'
),
(
  'proposal_accepted',
  'Proposta Aceita',
  '🎉 {{empresa_prospectada}} aceitou sua proposta!',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #ef3333; font-size: 28px; margin: 0;">Prospecta IA</h1>
  </div>
  <h2 style="font-size: 22px;">Nova conversão! 🏆</h2>
  <p style="font-size: 16px; line-height: 1.6; color: #555;">
    <strong>{{empresa_prospectada}}</strong> aceitou a sua proposta. É hora de entrar em contato e fechar o negócio!
  </p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="{{link_dashboard}}" style="background-color: #ef3333; color: white; padding: 14px 28px; border-radius: 24px; text-decoration: none; font-weight: bold; font-size: 16px;">
      Ver proposta
    </a>
  </div>
  <p style="font-size: 13px; color: #999; text-align: center; margin-top: 32px;">
    Prospecta IA · Boas prospecções!
  </p>
</body>
</html>'
)
ON CONFLICT (type) DO NOTHING;
