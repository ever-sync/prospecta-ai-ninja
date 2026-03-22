UPDATE public.plans
SET
  limit_presentations = 3,
  limit_campaigns = 0,
  limit_emails = 0,
  features = ARRAY[
    '3 apresentacoes por mes',
    'Campanhas bloqueadas no plano gratuito',
    'Templates bloqueados no plano gratuito',
    'Upgrade para liberar automacao comercial'
  ],
  updated_at = now()
WHERE id = 'free';
