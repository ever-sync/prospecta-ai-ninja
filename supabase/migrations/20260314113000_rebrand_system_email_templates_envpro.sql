UPDATE system_email_templates
SET
  name = 'Boas-vindas',
  subject = 'Bem-vindo a envPRO!',
  body_html = '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #ef3333; font-size: 28px; margin: 0;">envPRO</h1>
  </div>
  <h2 style="font-size: 22px;">Bem-vindo, {{email}}!</h2>
  <p style="font-size: 16px; line-height: 1.6; color: #555;">
    Sua conta foi criada com sucesso. Agora voce tem acesso ao scanner consultivo da envPRO para encontrar oportunidades, executar analises e gerar propostas.
  </p>
  <p style="font-size: 16px; line-height: 1.6; color: #555;">
    Comece avaliando negocios, lendo sinais comerciais e acionando campanhas com contexto.
  </p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="{{link_dashboard}}" style="background-color: #ef3333; color: white; padding: 14px 28px; border-radius: 24px; text-decoration: none; font-weight: bold; font-size: 16px;">
      Acessar o painel
    </a>
  </div>
  <p style="font-size: 13px; color: #999; text-align: center; margin-top: 32px;">
    envPRO | suporte@envpro.com.br
  </p>
</body>
</html>',
  updated_at = now()
WHERE type = 'onboarding';

UPDATE system_email_templates
SET
  name = 'Campanha enviada',
  subject = 'Sua campanha "{{nome_campanha}}" foi enviada!',
  body_html = '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #ef3333; font-size: 28px; margin: 0;">envPRO</h1>
  </div>
  <h2 style="font-size: 22px;">Campanha enviada com sucesso!</h2>
  <p style="font-size: 16px; line-height: 1.6; color: #555;">
    Sua campanha <strong>{{nome_campanha}}</strong> foi disparada para <strong>{{total_enviados}} contatos</strong>.
  </p>
  <p style="font-size: 16px; line-height: 1.6; color: #555;">
    Acompanhe os resultados e priorize os proximos movimentos direto no seu painel.
  </p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="{{link_dashboard}}" style="background-color: #ef3333; color: white; padding: 14px 28px; border-radius: 24px; text-decoration: none; font-weight: bold; font-size: 16px;">
      Ver resultados
    </a>
  </div>
  <p style="font-size: 13px; color: #999; text-align: center; margin-top: 32px;">
    envPRO | contato@envpro.com.br
  </p>
</body>
</html>',
  updated_at = now()
WHERE type = 'campaign_started';

UPDATE system_email_templates
SET
  name = 'Proposta aceita',
  subject = '{{empresa_prospectada}} aceitou sua proposta!',
  body_html = '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #ef3333; font-size: 28px; margin: 0;">envPRO</h1>
  </div>
  <h2 style="font-size: 22px;">Nova conversao!</h2>
  <p style="font-size: 16px; line-height: 1.6; color: #555;">
    <strong>{{empresa_prospectada}}</strong> aceitou a sua proposta. Agora e a hora de entrar em contato e avancar para o fechamento.
  </p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="{{link_dashboard}}" style="background-color: #ef3333; color: white; padding: 14px 28px; border-radius: 24px; text-decoration: none; font-weight: bold; font-size: 16px;">
      Ver proposta
    </a>
  </div>
  <p style="font-size: 13px; color: #999; text-align: center; margin-top: 32px;">
    envPRO | suporte@envpro.com.br
  </p>
</body>
</html>',
  updated_at = now()
WHERE type = 'proposal_accepted';
