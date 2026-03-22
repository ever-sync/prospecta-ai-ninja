ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_access_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS billing_block_reason text,
  ADD COLUMN IF NOT EXISTS billing_grace_until timestamptz,
  ADD COLUMN IF NOT EXISTS billing_last_event_type text;

COMMENT ON COLUMN public.profiles.billing_access_status IS
  'Derived platform access state based on Stripe subscription lifecycle: active, grace, or blocked.';

COMMENT ON COLUMN public.profiles.billing_block_reason IS
  'Human-readable operational reason for a billing grace state or hard billing block.';

COMMENT ON COLUMN public.profiles.billing_grace_until IS
  'Timestamp until which a past_due subscription can still access the platform before hard blocking.';

COMMENT ON COLUMN public.profiles.billing_last_event_type IS
  'Last Stripe event type applied to this billing state.';

UPDATE public.profiles
SET
  billing_access_status = CASE
    WHEN subscription_status IN ('past_due') THEN 'grace'
    WHEN subscription_status IN ('unpaid', 'canceled', 'incomplete', 'incomplete_expired') THEN 'blocked'
    ELSE 'active'
  END,
  billing_block_reason = CASE
    WHEN subscription_status = 'past_due' THEN 'Pagamento pendente. Regularize a assinatura para evitar bloqueio.'
    WHEN subscription_status = 'unpaid' THEN 'Assinatura marcada como inadimplente pela Stripe.'
    WHEN subscription_status = 'canceled' THEN 'Assinatura cancelada. Reative o plano para voltar a usar a plataforma.'
    WHEN subscription_status = 'incomplete' THEN 'A assinatura ainda nao foi concluida. Finalize o pagamento para liberar o acesso.'
    WHEN subscription_status = 'incomplete_expired' THEN 'A tentativa de assinatura expirou. Gere um novo checkout para continuar.'
    ELSE NULL
  END,
  billing_grace_until = CASE
    WHEN subscription_status = 'past_due'
      THEN COALESCE(subscription_current_period_end, now() + interval '3 days')
    ELSE NULL
  END
WHERE
  billing_access_status IS DISTINCT FROM CASE
    WHEN subscription_status IN ('past_due') THEN 'grace'
    WHEN subscription_status IN ('unpaid', 'canceled', 'incomplete', 'incomplete_expired') THEN 'blocked'
    ELSE 'active'
  END
  OR billing_block_reason IS DISTINCT FROM CASE
    WHEN subscription_status = 'past_due' THEN 'Pagamento pendente. Regularize a assinatura para evitar bloqueio.'
    WHEN subscription_status = 'unpaid' THEN 'Assinatura marcada como inadimplente pela Stripe.'
    WHEN subscription_status = 'canceled' THEN 'Assinatura cancelada. Reative o plano para voltar a usar a plataforma.'
    WHEN subscription_status = 'incomplete' THEN 'A assinatura ainda nao foi concluida. Finalize o pagamento para liberar o acesso.'
    WHEN subscription_status = 'incomplete_expired' THEN 'A tentativa de assinatura expirou. Gere um novo checkout para continuar.'
    ELSE NULL
  END
  OR billing_grace_until IS DISTINCT FROM CASE
    WHEN subscription_status = 'past_due'
      THEN COALESCE(subscription_current_period_end, now() + interval '3 days')
    ELSE NULL
  END;
