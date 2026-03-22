import { HttpError, getAuthenticatedUserContext } from "../_shared/auth.ts";
import {
  buildEmailSenderReadiness,
  extractEmailDomain,
  normalizeEmailAddress,
} from "../_shared/email-sender.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-user-auth, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ResendDomainRecord = {
  record?: string;
  name?: string;
  type?: string;
  value?: string;
  status?: string;
  priority?: number | null;
};

type ResendDomain = {
  id: string;
  name: string;
  status?: string;
  records?: ResendDomainRecord[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (value: string | null) => !!value && EMAIL_RE.test(value);

const toResponseRecords = (records: ResendDomainRecord[] = []) =>
  records.map((record) => ({
    record: record.record || null,
    name: record.name || null,
    type: record.type || null,
    value: record.value || null,
    status: record.status || null,
    priority: typeof record.priority === "number" ? record.priority : null,
  }));

const resendRequest = async (apiKey: string, path: string, init: RequestInit = {}) => {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const bodyText = await response.text().catch(() => "");
  let data: any = null;
  if (bodyText) {
    try {
      data = JSON.parse(bodyText);
    } catch {
      data = { raw: bodyText };
    }
  }

  return { response, data };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, svc } = await getAuthenticatedUserContext(req, { requireBillingAccess: true });
    const { senderEmail, senderName, replyToEmail } = await req.json();

    const normalizedSenderEmail = normalizeEmailAddress(senderEmail);
    const normalizedReplyToEmail = normalizeEmailAddress(replyToEmail);
    const normalizedSenderName = typeof senderName === "string" ? senderName.trim() : "";

    if (!isValidEmail(normalizedSenderEmail)) {
      throw new HttpError(400, "Informe um email remetente valido.");
    }

    if (normalizedReplyToEmail && !isValidEmail(normalizedReplyToEmail)) {
      throw new HttpError(400, "Informe um reply-to valido ou deixe o campo em branco.");
    }

    const senderDomain = extractEmailDomain(normalizedSenderEmail);
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const checkedAt = new Date().toISOString();

    if (!resendApiKey) {
      const readiness = buildEmailSenderReadiness({
        senderEmail: normalizedSenderEmail,
        replyToEmail: normalizedReplyToEmail,
        hasResendKey: false,
        apiReachable: false,
        apiError: "RESEND_API_KEY nao esta configurada no ambiente.",
        domainExists: false,
        domainStatus: null,
      });

      await svc.from("profiles").update({
        campaign_sender_email: normalizedSenderEmail,
        campaign_sender_name: normalizedSenderName || null,
        campaign_reply_to_email: normalizedReplyToEmail,
        email_sender_status: readiness.status,
        email_sender_provider: "resend",
        email_sender_domain: senderDomain,
        email_sender_last_checked_at: checkedAt,
        email_sender_verified_at: null,
        email_sender_error: readiness.issues[0]?.detail || readiness.summary,
      }).eq("user_id", user.id);

      return new Response(
        JSON.stringify({
          valid: false,
          ...readiness,
          normalizedSenderEmail,
          normalizedReplyToEmail,
          senderDomain,
          records: [],
          checkedAt,
          verifiedAt: null,
          error: "RESEND_API_KEY nao esta configurada no ambiente.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const listResult = await resendRequest(resendApiKey, "/domains");
    if (!listResult.response.ok) {
      const errorMessage =
        listResult.data?.message ||
        listResult.data?.error ||
        `Erro ${listResult.response.status} ao listar dominios no Resend.`;
      const readiness = buildEmailSenderReadiness({
        senderEmail: normalizedSenderEmail,
        replyToEmail: normalizedReplyToEmail,
        hasResendKey: true,
        apiReachable: false,
        apiError: errorMessage,
        domainExists: false,
        domainStatus: null,
      });

      await svc.from("profiles").update({
        campaign_sender_email: normalizedSenderEmail,
        campaign_sender_name: normalizedSenderName || null,
        campaign_reply_to_email: normalizedReplyToEmail,
        email_sender_status: readiness.status,
        email_sender_provider: "resend",
        email_sender_domain: senderDomain,
        email_sender_last_checked_at: checkedAt,
        email_sender_verified_at: null,
        email_sender_error: readiness.issues[0]?.detail || readiness.summary,
      }).eq("user_id", user.id);

      return new Response(
        JSON.stringify({
          valid: false,
          ...readiness,
          normalizedSenderEmail,
          normalizedReplyToEmail,
          senderDomain,
          records: [],
          checkedAt,
          verifiedAt: null,
          error: errorMessage,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let domain = ((listResult.data?.data || []) as ResendDomain[]).find((item) =>
      item.name?.toLowerCase() === senderDomain?.toLowerCase()
    ) || null;
    let domainWasCreated = false;

    if (!domain) {
      const createResult = await resendRequest(resendApiKey, "/domains", {
        method: "POST",
        body: JSON.stringify({ name: senderDomain }),
      });

      if (!createResult.response.ok) {
        const errorMessage =
          createResult.data?.message ||
          createResult.data?.error ||
          `Erro ${createResult.response.status} ao criar dominio no Resend.`;
        const readiness = buildEmailSenderReadiness({
          senderEmail: normalizedSenderEmail,
          replyToEmail: normalizedReplyToEmail,
          hasResendKey: true,
          apiReachable: false,
          apiError: errorMessage,
          domainExists: false,
          domainStatus: null,
        });

        await svc.from("profiles").update({
          campaign_sender_email: normalizedSenderEmail,
          campaign_sender_name: normalizedSenderName || null,
          campaign_reply_to_email: normalizedReplyToEmail,
          email_sender_status: readiness.status,
          email_sender_provider: "resend",
          email_sender_domain: senderDomain,
          email_sender_last_checked_at: checkedAt,
          email_sender_verified_at: null,
          email_sender_error: readiness.issues[0]?.detail || readiness.summary,
        }).eq("user_id", user.id);

        return new Response(
          JSON.stringify({
            valid: false,
            ...readiness,
            normalizedSenderEmail,
            normalizedReplyToEmail,
            senderDomain,
            records: [],
            checkedAt,
            verifiedAt: null,
            error: errorMessage,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      domain = createResult.data as ResendDomain;
      domainWasCreated = true;
    } else if (domain.id && String(domain.status || "").toLowerCase() !== "verified") {
      await resendRequest(resendApiKey, `/domains/${domain.id}/verify`, {
        method: "POST",
      });
    }

    if (domain?.id) {
      const getResult = await resendRequest(resendApiKey, `/domains/${domain.id}`);
      if (getResult.response.ok && getResult.data) {
        domain = getResult.data as ResendDomain;
      }
    }

    const readiness = buildEmailSenderReadiness({
      senderEmail: normalizedSenderEmail,
      replyToEmail: normalizedReplyToEmail,
      hasResendKey: true,
      apiReachable: true,
      apiError: null,
      domainExists: !!domain,
      domainStatus: domain?.status || null,
      domainWasCreated,
    });

    const verifiedAt = readiness.status === "ready" ? checkedAt : null;

    await svc.from("profiles").update({
      campaign_sender_email: normalizedSenderEmail,
      campaign_sender_name: normalizedSenderName || null,
      campaign_reply_to_email: normalizedReplyToEmail,
      email_sender_status: readiness.status,
      email_sender_provider: "resend",
      email_sender_domain: senderDomain,
      email_sender_last_checked_at: checkedAt,
      email_sender_verified_at: verifiedAt,
      email_sender_error: readiness.status === "ready" ? null : readiness.issues[0]?.detail || readiness.summary,
    }).eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        valid: readiness.status !== "blocked",
        ...readiness,
        normalizedSenderEmail,
        normalizedReplyToEmail,
        senderDomain,
        resendDomainId: domain?.id || null,
        records: toResponseRecords(domain?.records),
        checkedAt,
        verifiedAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return new Response(
      JSON.stringify({
        valid: false,
        error: error instanceof Error ? error.message : "Erro desconhecido.",
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
