import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { resolveBillingAccess } from "./billing.js";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type BillingAccessOptions = {
  allowGrace?: boolean;
};

type AuthContextOptions = BillingAccessOptions & {
  requireBillingAccess?: boolean;
};

export const getUserBillingAccessState = async (
  svc: ReturnType<typeof createClient>,
  userId: string,
) => {
  const { data: profile, error } = await svc
    .from("profiles")
    .select(
      "subscription_status, subscription_current_period_end, billing_access_status, billing_block_reason, billing_grace_until",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "Nao foi possivel carregar o estado de billing do usuario.");
  }

  if (!profile) {
    return {
      accessStatus: "active",
      blockReason: null,
      graceUntil: null,
    };
  }

  const normalized = resolveBillingAccess({
    subscriptionStatus: profile.subscription_status,
    currentPeriodEnd: profile.subscription_current_period_end,
  });

  const accessStatus = profile.billing_access_status || normalized.accessStatus;
  const blockReason = profile.billing_block_reason || normalized.blockReason;
  const graceUntil = profile.billing_grace_until || normalized.graceUntil;

  if (
    profile.billing_access_status !== accessStatus ||
    (profile.billing_block_reason || null) !== blockReason ||
    (profile.billing_grace_until || null) !== graceUntil
  ) {
    await svc
      .from("profiles")
      .update({
        billing_access_status: accessStatus,
        billing_block_reason: blockReason,
        billing_grace_until: graceUntil,
        billing_last_event_type: "auth:normalize-billing",
      } as never)
      .eq("user_id", userId);
  }

  return {
    accessStatus,
    blockReason,
    graceUntil,
  };
};

export const requireBillingAccess = async (
  svc: ReturnType<typeof createClient>,
  userId: string,
  options: BillingAccessOptions = {},
) => {
  const billing = await getUserBillingAccessState(svc, userId);
  const allowGrace = options.allowGrace ?? true;

  if (billing.accessStatus === "blocked" || (!allowGrace && billing.accessStatus === "grace")) {
    throw new HttpError(
      402,
      billing.blockReason ||
        "Acesso bloqueado por billing. Regularize a assinatura em Configuracoes > Faturamento.",
    );
  }

  return billing;
};

export const getAuthenticatedUserContext = async (req: Request, options: AuthContextOptions = {}) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("x-user-auth") ?? req.headers.get("Authorization");

  if (!authHeader) {
    throw new HttpError(401, "Unauthorized");
  }

  const token = authHeader.replace("Bearer ", "").trim();

  const userClient = createClient(supabaseUrl, anonKey);
  const svc = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser(token);

  if (error || !user) {
    throw new HttpError(401, "Unauthorized");
  }

  const billing = options.requireBillingAccess
    ? await requireBillingAccess(svc, user.id, {
      allowGrace: options.allowGrace,
    })
    : null;

  return { user, userId: user.id, svc, billing };
};
