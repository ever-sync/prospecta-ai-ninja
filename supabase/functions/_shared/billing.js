const PAID_PLAN_STATUSES = new Set(["active", "trialing", "past_due"]);
const BLOCKED_STATUSES = new Set(["unpaid", "canceled", "incomplete", "incomplete_expired"]);
const GRACE_PERIOD_MS = 1000 * 60 * 60 * 24 * 3;

export function isPaidPlanStatus(status) {
  return PAID_PLAN_STATUSES.has((status || "").toLowerCase());
}

function normalizeStatus(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function resolveFutureIso(values = []) {
  const now = Date.now();
  const candidates = values
    .map((value) => {
      const timestamp = value ? new Date(value).getTime() : NaN;
      return Number.isFinite(timestamp) && timestamp > now ? timestamp : null;
    })
    .filter((value) => typeof value === "number");

  if (candidates.length === 0) return null;
  return new Date(Math.max(...candidates)).toISOString();
}

function buildGraceUntil({ currentPeriodEnd, nextPaymentAttempt, now }) {
  const baseline = new Date((now || Date.now()) + GRACE_PERIOD_MS).toISOString();
  return resolveFutureIso([currentPeriodEnd, nextPaymentAttempt, baseline]);
}

export function resolveBillingAccess({
  subscriptionStatus,
  currentPeriodEnd = null,
  nextPaymentAttempt = null,
  now = Date.now(),
} = {}) {
  const status = normalizeStatus(subscriptionStatus);

  if (!status || status === "active" || status === "trialing") {
    return {
      accessStatus: "active",
      blockReason: null,
      graceUntil: null,
      shouldBlock: false,
    };
  }

  if (status === "past_due") {
    return {
      accessStatus: "grace",
      blockReason: "Pagamento pendente. Regularize a assinatura para evitar bloqueio.",
      graceUntil: buildGraceUntil({ currentPeriodEnd, nextPaymentAttempt, now }),
      shouldBlock: false,
    };
  }

  if (BLOCKED_STATUSES.has(status)) {
    const messages = {
      unpaid: "Assinatura marcada como inadimplente pela Stripe.",
      canceled: "Assinatura cancelada. Reative o plano para voltar a usar a plataforma.",
      incomplete: "A assinatura ainda nao foi concluida. Finalize o pagamento para liberar o acesso.",
      incomplete_expired: "A tentativa de assinatura expirou. Gere um novo checkout para continuar.",
    };

    return {
      accessStatus: "blocked",
      blockReason: messages[status] || "Assinatura sem acesso ativo.",
      graceUntil: null,
      shouldBlock: true,
    };
  }

  return {
    accessStatus: "active",
    blockReason: null,
    graceUntil: null,
    shouldBlock: false,
  };
}
