import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logCampaignOperationEvent } from "../_shared/campaign-operation-events.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_THRESHOLD = 15;
const DEFAULT_WA_MESSAGE_TEMPLATE =
  "Ola! Preparamos uma analise personalizada para sua empresa: {{link_proposta}}";

type TemplateRow = {
  id: string;
  body: string | null;
  subject: string | null;
  send_as_audio: boolean;
  include_proposal_link: boolean | null;
  experiment_group: string | null;
  variant_key: string;
  target_persona: string | null;
  campaign_objective: string | null;
  cta_trigger: string | null;
  channel: string;
  is_active: boolean;
  // Meta approval fields
  meta_template_name: string | null;
  meta_template_status: string | null;
  meta_template_language: string | null;
  meta_variable_order: string[] | null;
};

type CampaignRow = {
  id: string;
  user_id: string;
  channel: string;
  template_id: string | null;
  name: string;
};

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  const withDdi = digits.startsWith("55") ? digits : `55${digits}`;

  // Brazilian numbers: 55 + DDD (10–99, 2 digits) + number (8 or 9 digits) = 12–13 digits total
  if (withDdi.length < 12 || withDdi.length > 13) return null;

  const ddd = parseInt(withDdi.substring(2, 4), 10);
  // Valid Brazilian DDDs range from 11 to 99
  if (ddd < 11 || ddd > 99) return null;

  return withDdi;
}

function hashToIndex(value: string, max: number): number {
  if (max <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % max;
}

function scoreBucket(
  analysisData: { scores?: { overall?: unknown } } | null | undefined,
): "low" | "medium" | "high" | "unknown" {
  const score = analysisData?.scores?.overall;
  if (typeof score !== "number") return "unknown";
  if (score < 40) return "low";
  if (score < 70) return "medium";
  return "high";
}

function normalizeText(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function variantPriorityScore(
  variant: TemplateRow,
  lead: {
    business_category?: string | null;
    analysis_data?: { scores?: { overall?: unknown } } | null;
  },
): number {
  const persona = normalizeText(variant.target_persona);
  const objective = normalizeText(variant.campaign_objective);
  const trigger = normalizeText(variant.cta_trigger);
  const leadCategory = normalizeText(lead.business_category);
  const bucket = scoreBucket(lead.analysis_data);
  const bucketLabel = bucket === "low"
    ? "baixo"
    : bucket === "medium"
    ? "medio"
    : bucket === "high"
    ? "alto"
    : "desconhecido";

  let points = 0;

  if (persona) {
    if (leadCategory && persona.includes(leadCategory)) points += 4;
    if (persona.includes(`score:${bucket}`) || persona.includes(bucket)) points += 4;
    if (persona.includes(`score ${bucketLabel}`) || persona.includes(bucketLabel)) points += 2;
  }

  if (objective.includes("recuperar") && bucket === "low") points += 1;
  if (objective.includes("escala") && bucket === "high") points += 1;
  if (trigger.includes("urgencia") && bucket !== "high") points += 1;
  if (trigger.includes("prova social") && bucket === "medium") points += 1;

  return points;
}

function pickVariantForLead(
  lead: {
    id: string;
    business_category?: string | null;
    analysis_data?: { scores?: { overall?: unknown } } | null;
  },
  variants: TemplateRow[],
  fallback: TemplateRow | null,
): TemplateRow | null {
  if (variants.length === 0) return fallback;
  if (variants.length === 1) return variants[0];

  const scored = variants.map((variant) => ({
    variant,
    score: variantPriorityScore(variant, lead),
  }));

  const topScore = Math.max(...scored.map((row) => row.score));
  const topVariants = scored
    .filter((row) => row.score === topScore)
    .map((row) => row.variant);

  return topVariants[hashToIndex(lead.id, topVariants.length)] || fallback || variants[0];
}

function buildTrackedPresentationUrl(
  baseOrigin: string,
  publicId: string,
  tracking: {
    campaignId: string;
    campaignPresentationId?: string | null;
    templateId?: string | null;
    variantId?: string | null;
    channel: "whatsapp" | "email";
    source: string;
  },
): string {
  const params = new URLSearchParams();
  params.set("cid", tracking.campaignId);
  if (tracking.campaignPresentationId) params.set("cpid", tracking.campaignPresentationId);
  if (tracking.templateId) params.set("tid", tracking.templateId);
  if (tracking.variantId) params.set("vid", tracking.variantId);
  params.set("ch", tracking.channel);
  params.set("src", tracking.source);
  return `${baseOrigin}/presentation/${publicId}?${params.toString()}`;
}

function resolveBaseOrigin(domain: string | null | undefined, _requestOrigin: string | null): string {
  const fallback = "https://envpro.com.br";
  const value = (domain || "").trim().replace(/\/+$/, "");
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function replaceVariables(
  text: string,
  pres: any,
  publicUrl: string,
  senderName: string,
): string {
  const score =
    typeof pres?.analysis_data?.scores?.overall === "number"
      ? pres.analysis_data.scores.overall
      : "";

  return (text || "")
    .replace(/\{\{nome_empresa\}\}/g, pres.business_name || "")
    .replace(/\{\{categoria\}\}/g, pres.business_category || "")
    .replace(/\{\{endereco\}\}/g, pres.business_address || "")
    .replace(/\{\{telefone\}\}/g, pres.business_phone || "")
    .replace(/\{\{website\}\}/g, pres.business_website || "")
    .replace(/\{\{rating\}\}/g, pres.business_rating?.toString() || "")
    .replace(/\{\{score\}\}/g, score.toString())
    .replace(/\{\{link_proposta\}\}/g, publicUrl)
    .replace(/\{\{sua_empresa\}\}/g, senderName);
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function addMinutesIso(minutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 500 ms between API sends — keeps Meta Cloud well within burst limits
const META_SEND_DELAY_MS = 500;

function composeFollowupMessage(
  businessName: string | null,
  publicUrl: string,
  step: number,
): string {
  if (step <= 0) {
    return `Oi, ${businessName || "tudo bem"}? Passando para confirmar se voce conseguiu ver a analise que montamos para sua empresa: ${publicUrl}`;
  }
  return `Ultimo lembrete: essa analise pode ajudar bastante no seu crescimento digital. Quando puder, da uma olhada aqui: ${publicUrl}`;
}

async function sendMetaMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  message: string,
): Promise<{ ok: boolean; status: number; providerMessageId?: string; error?: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: true,
          body: message,
        },
      }),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: JSON.stringify(data),
    };
  }

  return {
    ok: true,
    status: response.status,
    providerMessageId: data?.messages?.[0]?.id,
  };
}

/**
 * Send a pre-approved Meta template message (required for cold outreach / first contact).
 * variableValues must be in the same order as meta_variable_order stored in DB.
 */
async function sendMetaTemplateMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  templateName: string,
  language: string,
  variableValues: string[],
): Promise<{ ok: boolean; status: number; providerMessageId?: string; error?: string }> {
  const components: any[] = [];
  if (variableValues.length > 0) {
    components.push({
      type: "body",
      parameters: variableValues.map((text) => ({ type: "text", text: text || "" })),
    });
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: language || "pt_BR" },
          ...(components.length > 0 ? { components } : {}),
        },
      }),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: response.status, error: JSON.stringify(data) };
  }

  return {
    ok: true,
    status: response.status,
    providerMessageId: data?.messages?.[0]?.id,
  };
}

/** Resolve variable values from a lead/presentation row in the order stored in meta_variable_order */
function resolveMetaVariableValues(
  variableOrder: string[],
  pres: any,
  publicUrl: string,
  senderName: string,
): string[] {
  const MAP: Record<string, string> = {
    nome_empresa: pres.business_name || "",
    link_proposta: publicUrl,
    sua_empresa: senderName,
    categoria: pres.business_category || "",
    score: typeof pres?.analysis_data?.scores?.overall === "number"
      ? String(pres.analysis_data.scores.overall)
      : "",
    rating: pres.business_rating != null ? String(pres.business_rating) : "",
    endereco: pres.business_address || "",
    telefone: pres.business_phone || "",
    website: pres.business_website || "",
  };
  return variableOrder.map((key) => MAP[key] ?? "");
}

async function sendUnofficialMessage(
  apiUrl: string,
  apiToken: string | null,
  instance: string | null,
  to: string,
  message: string,
): Promise<{ ok: boolean; status: number; providerMessageId?: string; error?: string }> {
  const normalizedBase = apiUrl.trim().replace(/\/+$/, "");
  const endpoint = instance?.trim()
    ? `${normalizedBase}/message/sendText/${encodeURIComponent(instance.trim())}`
    : `${normalizedBase}/message/sendText`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiToken?.trim()) {
    headers.Authorization = `Bearer ${apiToken.trim()}`;
    headers.apikey = apiToken.trim();
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      number: to,
      text: message,
      textMessage: { text: message },
      options: { delay: 1200, presence: "composing" },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: JSON.stringify(data),
    };
  }

  return {
    ok: true,
    status: response.status,
    providerMessageId: data?.key?.id || data?.messageId || data?.id || undefined,
  };
}

async function getNextAttemptNo(svc: any, campaignPresentationId: string): Promise<number> {
  const { count } = await svc
    .from("campaign_message_attempts")
    .select("id", { head: true, count: "exact" })
    .eq("campaign_presentation_id", campaignPresentationId);
  return (count || 0) + 1;
}

async function loadTemplatesForCampaign(svc: any, campaign: CampaignRow): Promise<{
  selected: TemplateRow | null;
  variants: TemplateRow[];
}> {
  if (!campaign.template_id) return { selected: null, variants: [] };

  const { data: selectedTemplate } = await svc
    .from("message_templates")
    .select(
      "id, body, subject, send_as_audio, include_proposal_link, experiment_group, variant_key, target_persona, campaign_objective, cta_trigger, channel, is_active, meta_template_name, meta_template_status, meta_template_language, meta_variable_order",
    )
    .eq("id", campaign.template_id)
    .single();

  const selected = (selectedTemplate as TemplateRow | null) || null;
  if (!selected || !selected.experiment_group) {
    return { selected, variants: selected ? [selected] : [] };
  }

  const { data: allVariants } = await svc
    .from("message_templates")
    .select(
      "id, body, subject, send_as_audio, include_proposal_link, experiment_group, variant_key, target_persona, campaign_objective, cta_trigger, channel, is_active, meta_template_name, meta_template_status, meta_template_language, meta_variable_order",
    )
    .eq("experiment_group", selected.experiment_group)
    .eq("channel", selected.channel || "whatsapp")
    .eq("is_active", true)
    .order("variant_key");

  const variants = ((allVariants as TemplateRow[]) || []).filter(Boolean);
  return { selected, variants: variants.length > 0 ? variants : [selected] };
}

function getFollowupMessage(
  businessName: string | null,
  publicUrl: string,
  step: number,
): string {
  if (step <= 0) {
    return `Oi, ${businessName || "tudo bem"}? Passando para confirmar se você conseguiu ver a análise que montamos para sua empresa: ${publicUrl}`;
  }
  return `Último lembrete: essa análise pode ajudar bastante no seu crescimento digital. Quando puder, dá uma olhada aqui: ${publicUrl}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let logUserId: string | null = null;
  let logCampaignId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const envMetaToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
    const envPhoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const svc = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Parse body first — needed to extract user_id for service-role calls
    const bodyData = await req.json();
    const {
      campaign_id,
      threshold = DEFAULT_THRESHOLD,
      force_api = false,
      send_followups = false,
    } = bodyData;

    if (!campaign_id) throw new Error("campaign_id is required");
    logCampaignId = campaign_id;

    // Support internal calls from campaign-scheduler using service role key
    const isServiceRoleCall =
      serviceKey &&
      authHeader === `Bearer ${serviceKey}` &&
      typeof bodyData.user_id === "string";

    let userId: string;
    if (isServiceRoleCall) {
      userId = bodyData.user_id;
    } else {
      const {
        data: { user },
        error: userError,
      } = await userClient.auth.getUser();
      if (userError || !user) throw new Error("Unauthorized");
      userId = user.id;
    }
    logUserId = userId;

  const { data: campaignData, error: campaignError } = await svc
      .from("campaigns")
      .select("id, user_id, channel, template_id, name")
      .eq("id", campaign_id)
      .single();
    if (campaignError || !campaignData) throw new Error("Campaign not found");

    const campaign = campaignData as CampaignRow;
    if (campaign.user_id !== userId) throw new Error("Forbidden");
    if (campaign.channel !== "whatsapp") {
      throw new Error("Campaign channel must be whatsapp");
    }

    const { data: profileData } = await svc
      .from("profiles")
      .select(
        "company_name, proposal_link_domain, whatsapp_official_access_token, whatsapp_official_phone_number_id",
      )
      .eq("user_id", userId)
      .maybeSingle();
    const profile = (profileData as any) || {};
    const senderName = profile.company_name || "Nossa Empresa";
    const publishedOrigin = resolveBaseOrigin(profile.proposal_link_domain, req.headers.get("origin"));
    const waConnectionType = "meta_official" as const;

    const metaToken = (profile.whatsapp_official_access_token || envMetaToken || "").trim();
    const phoneNumberId = (profile.whatsapp_official_phone_number_id || envPhoneNumberId || "").trim();
    const providerName = "meta_cloud";

    /**
     * Send a WhatsApp message, preferring approved Meta template messages for official API.
     * When templateInfo is provided and the template is approved, sends as type:"template".
     * Falls back to free-form text (works only within 24h session window).
     */
    const sendWhatsAppMessage = async (
      to: string,
      message: string,
      pres?: any,
      publicUrl?: string,
      templateInfo?: {
        metaTemplateName: string | null;
        metaTemplateStatus: string | null;
        metaTemplateLanguage: string | null;
        metaVariableOrder: string[] | null;
      },
      ): Promise<{ ok: boolean; status: number; providerMessageId?: string; error?: string; usedTemplate?: boolean }> => {
      if (!metaToken || !phoneNumberId) {
        return { ok: false, status: 400, error: "missing_meta_credentials" };
      }

      // Use approved template message if available (required for cold outreach)
      if (
        templateInfo?.metaTemplateName &&
        templateInfo.metaTemplateStatus === "approved" &&
        Array.isArray(templateInfo.metaVariableOrder) &&
        pres &&
        publicUrl
      ) {
        const variableValues = resolveMetaVariableValues(
          templateInfo.metaVariableOrder,
          pres,
          publicUrl,
          senderName,
        );
        const result = await sendMetaTemplateMessage(
          metaToken,
          phoneNumberId,
          to,
          templateInfo.metaTemplateName,
          templateInfo.metaTemplateLanguage || "pt_BR",
          variableValues,
        );
        return { ...result, usedTemplate: true };
      }

      // Fallback: free-form text (only works within 24h session window)
      return sendMetaMessage(metaToken, phoneNumberId, to, message);
    };
    const { selected: selectedTemplate, variants } = await loadTemplatesForCampaign(svc, campaign);

    const processDueRetries = async (): Promise<{ sent: number; failed: number }> => {
      const nowIso = new Date().toISOString();
      const { data: retryRows } = await svc
        .from("campaign_message_attempts")
        .select("id, campaign_presentation_id, presentation_id, attempt_no, template_id, variant_id")
        .eq("campaign_id", campaign.id)
        .eq("channel", "whatsapp")
        .eq("status", "retrying")
        .lte("next_retry_at", nowIso)
        .order("next_retry_at", { ascending: true })
        .limit(100);

      if (!retryRows || retryRows.length === 0) {
        return { sent: 0, failed: 0 };
      }

      const cpIds = retryRows.map((row: any) => row.campaign_presentation_id);
      const presIds = retryRows.map((row: any) => row.presentation_id);
      const { data: cpRows } = await svc
        .from("campaign_presentations")
        .select("id, presentation_id, variant_id")
        .in("id", cpIds);

      const { data: presRows } = await svc
        .from("presentations")
        .select(
          "id, public_id, user_id, business_name, business_phone, business_category, business_address, business_website, business_rating, analysis_data, pipeline_stage_id, lead_response",
        )
        .in("id", presIds);

      const cpMap = new Map((cpRows || []).map((cp: any) => [cp.id, cp]));
      const presMap = new Map((presRows || []).map((pres: any) => [pres.id, pres]));
      const variantMap = new Map(variants.map((v) => [v.id, v]));
      const activeVariants = variants.filter((v) => v.is_active !== false);
      const defaultVariants = activeVariants.length > 0 ? activeVariants : variants;

      let sent = 0;
      let failed = 0;

      for (const retryRow of retryRows as any[]) {
        const claimTime = new Date().toISOString();
        const { data: claimedRows } = await svc
          .from("campaign_message_attempts")
          .update({
            status: "failed",
            error_reason: "retry_claimed",
            next_retry_at: null,
            updated_at: claimTime,
          })
          .eq("id", retryRow.id)
          .eq("status", "retrying")
          .select("id")
          .limit(1);

        if (!claimedRows || claimedRows.length === 0) continue;

        const cp = cpMap.get(retryRow.campaign_presentation_id);
        const pres = presMap.get(retryRow.presentation_id);
        if (!cp || !pres) {
          failed++;
          continue;
        }

        if (pres.lead_response && pres.lead_response !== "pending") {
          failed++;
          continue;
        }

        const chosenVariant =
          (cp.variant_id ? variantMap.get(cp.variant_id) : null) ||
          (retryRow.variant_id ? variantMap.get(retryRow.variant_id) : null) ||
          pickVariantForLead(pres, defaultVariants, selectedTemplate);

        const fullPhone = normalizePhone(pres.business_phone);
        const attemptNo = await getNextAttemptNo(svc, cp.id);
        const variantId = chosenVariant?.id || null;

        if (!fullPhone) {
          await svc
            .from("campaign_presentations")
            .update({
              send_status: "failed",
              delivery_status: "failed",
              last_status_at: claimTime,
              variant_id: variantId,
            })
            .eq("id", cp.id);

          await svc.from("campaign_message_attempts").insert({
            user_id: userId,
            campaign_presentation_id: cp.id,
            campaign_id: campaign.id,
            presentation_id: pres.id,
            template_id: campaign.template_id,
            variant_id: variantId,
            channel: "whatsapp",
            send_mode: "api",
            provider: providerName,
            attempt_no: attemptNo,
            status: "failed",
            error_reason: "invalid_phone_retry",
            metadata: { retry_of: retryRow.id },
          });
          failed++;
          continue;
        }

        const publicUrl = buildTrackedPresentationUrl(publishedOrigin, pres.public_id, {
          campaignId: campaign.id,
          campaignPresentationId: cp.id,
          templateId: campaign.template_id,
          variantId,
          channel: "whatsapp",
          source: "retry",
        });

        const baseMessageTemplate =
          chosenVariant?.body ||
          selectedTemplate?.body ||
          "OlÃ¡! Preparamos uma anÃ¡lise personalizada para sua empresa: {{link_proposta}}";
        const message = replaceVariables(
          chosenVariant?.body || selectedTemplate?.body || DEFAULT_WA_MESSAGE_TEMPLATE,
          pres,
          publicUrl,
          senderName,
        );

        const sendResult = await sendWhatsAppMessage(fullPhone, message);
        const now = new Date().toISOString();
        const isTransient = isTransientStatus(sendResult.status);
        const canRetryAgain = attemptNo < 4;

        if (sendResult.ok) {
          await svc
            .from("campaign_presentations")
            .update({
              send_status: "sent",
              sent_at: now,
              provider_message_id: sendResult.providerMessageId || null,
              delivery_status: "sent",
              last_status_at: now,
              variant_id: variantId,
              followup_step: 0,
              next_followup_at: addDaysIso(1),
            })
            .eq("id", cp.id);

          await svc.from("campaign_message_attempts").insert({
            user_id: userId,
            campaign_presentation_id: cp.id,
            campaign_id: campaign.id,
            presentation_id: pres.id,
            template_id: campaign.template_id,
            variant_id: variantId,
            channel: "whatsapp",
            send_mode: "api",
            provider: providerName,
            attempt_no: attemptNo,
            status: "sent",
            provider_message_id: sendResult.providerMessageId || null,
            sent_at: now,
            followup_step: 0,
            next_followup_at: addDaysIso(1),
            metadata: { retry_of: retryRow.id },
          });

          await svc.from("message_conversion_events").insert({
            event_type: "sent",
            presentation_id: pres.id,
            user_id: pres.user_id,
            campaign_id: campaign.id,
            campaign_presentation_id: cp.id,
            template_id: campaign.template_id,
            variant_id: variantId,
            channel: "whatsapp",
            pipeline_stage_id: pres.pipeline_stage_id || null,
            niche: pres.business_category || null,
            score_bucket: scoreBucket(pres.analysis_data),
            source: "whatsapp_retry",
            metadata: { attempt_no: attemptNo, retry_of: retryRow.id },
          });
          if (waConnectionType === "meta_official") await sleep(META_SEND_DELAY_MS);
          sent++;
          continue;
        }

        await svc
          .from("campaign_presentations")
          .update({
            send_status: "failed",
            delivery_status: "failed",
            last_status_at: now,
            variant_id: variantId,
          })
          .eq("id", cp.id);

        await svc.from("campaign_message_attempts").insert({
          user_id: userId,
          campaign_presentation_id: cp.id,
          campaign_id: campaign.id,
          presentation_id: pres.id,
          template_id: campaign.template_id,
          variant_id: variantId,
          channel: "whatsapp",
          send_mode: "api",
          provider: providerName,
          attempt_no: attemptNo,
          status: isTransient && canRetryAgain ? "retrying" : "failed",
          error_reason: sendResult.error || "retry_failed",
          next_retry_at: isTransient && canRetryAgain ? addMinutesIso(15) : null,
          metadata: {
            status: sendResult.status,
            transient: isTransient,
            retry_of: retryRow.id,
          },
        });
        failed++;
      }

      return { sent, failed };
    };

    if (!metaToken || !phoneNumberId) {
      await logCampaignOperationEvent(svc, {
        userId,
        campaignId: campaign_id,
        channel: "whatsapp",
        eventType: "blocked",
        source: "whatsapp-send-batch",
        reasonCode: "missing-meta-credentials",
        message: "Configure o Access Token e o Phone Number ID da Meta em Configuracoes > Integracoes antes de enviar campanhas.",
      });
      return new Response(
        JSON.stringify({
          success: false,
          mode: "blocked",
          code: "missing_meta_credentials",
          error: "Configure o Access Token e o Phone Number ID da Meta em Configuracoes > Integracoes antes de enviar campanhas.",
          campaign_id,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (send_followups) {
      const nowIso = new Date().toISOString();
      const { data: cpRows } = await svc
        .from("campaign_presentations")
        .select("id, presentation_id, followup_step, next_followup_at, variant_id")
        .eq("campaign_id", campaign_id)
        .eq("send_status", "sent")
        .lt("followup_step", 2)
        .lte("next_followup_at", nowIso);

      if (!cpRows || cpRows.length === 0) {
        return new Response(
          JSON.stringify({ success: true, mode: "followup", sent: 0, failed: 0, message: "No followups due" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const presIds = cpRows.map((row: any) => row.presentation_id);
      const { data: presentations } = await svc
        .from("presentations")
        .select(
          "id, public_id, user_id, business_name, business_phone, business_category, analysis_data, pipeline_stage_id, lead_response",
        )
        .in("id", presIds);

      const presMap = new Map((presentations || []).map((p: any) => [p.id, p]));
      const variantMap = new Map(variants.map((v) => [v.id, v]));

      let sentCount = 0;
      let failedCount = 0;

      for (const cp of cpRows as any[]) {
        const pres = presMap.get(cp.presentation_id);
        if (!pres) continue;
        if (pres.lead_response && pres.lead_response !== "pending") continue;

        const fullPhone = normalizePhone(pres.business_phone);
        if (!fullPhone) {
          failedCount++;
          continue;
        }

        const chosenVariant =
          (cp.variant_id ? variantMap.get(cp.variant_id) : null) ||
          pickVariantForLead(pres, variants, selectedTemplate);

        const trackedUrl = buildTrackedPresentationUrl(publishedOrigin, pres.public_id, {
          campaignId: campaign.id,
          campaignPresentationId: cp.id,
          templateId: campaign.template_id,
          variantId: chosenVariant?.id || null,
          channel: "whatsapp",
          source: "followup",
        });

        const message = getFollowupMessage(pres.business_name, trackedUrl, cp.followup_step || 0);
        const attemptNo = await getNextAttemptNo(svc, cp.id);
        const sentAt = new Date().toISOString();
        const nextStep = (cp.followup_step || 0) + 1;
        const nextFollowupAt = nextStep < 2 ? addDaysIso(2) : null;

        // For Meta official: reuse the campaign template (already approved) instead of
        // free-form text, which fails outside the 24h customer service window.
        const followupTemplateInfo = {
          metaTemplateName: chosenVariant?.meta_template_name || selectedTemplate?.meta_template_name || null,
          metaTemplateStatus: chosenVariant?.meta_template_status || selectedTemplate?.meta_template_status || null,
          metaTemplateLanguage: chosenVariant?.meta_template_language || selectedTemplate?.meta_template_language || null,
          metaVariableOrder: (chosenVariant?.meta_variable_order || selectedTemplate?.meta_variable_order) as string[] | null,
        };

        const sendResult = await sendWhatsAppMessage(fullPhone, message, pres, trackedUrl, followupTemplateInfo);
        if (sendResult.ok) {
          await svc
            .from("campaign_presentations")
            .update({
              provider_message_id: sendResult.providerMessageId || null,
              delivery_status: "sent",
              last_status_at: sentAt,
              followup_step: nextStep,
              next_followup_at: nextFollowupAt,
            })
            .eq("id", cp.id);

          await svc.from("campaign_message_attempts").insert({
            user_id: userId,
            campaign_presentation_id: cp.id,
            campaign_id: campaign.id,
            presentation_id: pres.id,
            template_id: campaign.template_id,
            variant_id: chosenVariant?.id || null,
            channel: "whatsapp",
            send_mode: "followup",
            provider: providerName,
            attempt_no: attemptNo,
            status: "sent",
            provider_message_id: sendResult.providerMessageId || null,
            sent_at: sentAt,
            followup_step: nextStep,
            next_followup_at: nextFollowupAt,
            metadata: { mode: "followup" },
          });

          await svc.from("message_conversion_events").insert({
            event_type: "sent",
            presentation_id: pres.id,
            user_id: pres.user_id,
            campaign_id: campaign.id,
            campaign_presentation_id: cp.id,
            template_id: campaign.template_id,
            variant_id: chosenVariant?.id || null,
            channel: "whatsapp",
            pipeline_stage_id: pres.pipeline_stage_id || null,
            niche: pres.business_category || null,
            score_bucket: scoreBucket(pres.analysis_data),
            source: "followup",
            metadata: { attempt_no: attemptNo, followup_step: nextStep },
          });

          if (waConnectionType === "meta_official") await sleep(META_SEND_DELAY_MS);
          sentCount++;
        } else {
          await svc.from("campaign_message_attempts").insert({
            user_id: userId,
            campaign_presentation_id: cp.id,
            campaign_id: campaign.id,
            presentation_id: pres.id,
            template_id: campaign.template_id,
            variant_id: chosenVariant?.id || null,
            channel: "whatsapp",
            send_mode: "followup",
            provider: providerName,
            attempt_no: attemptNo,
            status: "failed",
            error_reason: sendResult.error || "followup_send_failed",
            metadata: { status: sendResult.status, mode: "followup" },
          });
          failedCount++;
        }
      }

      if (failedCount > 0) {
        await logCampaignOperationEvent(svc, {
          userId,
          campaignId: campaign.id,
          channel: "whatsapp",
          eventType: "dispatch_failed",
          source: "whatsapp-send-batch-followup",
          reasonCode: "dispatch-error",
          message: `${failedCount} follow-up(s) de WhatsApp falharam.`,
          metadata: {
            sent: sentCount,
            failed: failedCount,
            total_due: cpRows.length,
          },
        });
      }

      if (sentCount > 0 || failedCount > 0) {
        await logCampaignOperationEvent(svc, {
          userId,
          campaignId: campaign.id,
          channel: "whatsapp",
          eventType: "dispatch_completed",
          source: "whatsapp-send-batch-followup",
          message: `Follow-up de WhatsApp processado. ${sentCount} enviado(s), ${failedCount} falha(s).`,
          metadata: {
            sent: sentCount,
            failed: failedCount,
            total_due: cpRows.length,
          },
        });
      }

      return new Response(
        JSON.stringify({ success: true, mode: "followup", sent: sentCount, failed: failedCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const retryResult = await processDueRetries();

    const { data: cpRows } = await svc
      .from("campaign_presentations")
      .select("id, presentation_id")
      .eq("campaign_id", campaign.id)
      .eq("send_status", "pending");

    if ((!cpRows || cpRows.length === 0) && retryResult.sent === 0 && retryResult.failed === 0) {
      await svc
        .from("campaigns")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", campaign.id);

      return new Response(
        JSON.stringify({ success: true, mode: "api", sent: 0, failed: 0, message: "No pending leads" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if ((!cpRows || cpRows.length === 0) && (retryResult.sent > 0 || retryResult.failed > 0)) {
      if (retryResult.failed > 0) {
        await logCampaignOperationEvent(svc, {
          userId,
          campaignId: campaign.id,
          channel: "whatsapp",
          eventType: "dispatch_failed",
          source: "whatsapp-send-batch-retry",
          reasonCode: "dispatch-error",
          message: `${retryResult.failed} retry(s) de WhatsApp falharam.`,
          metadata: {
            retried_sent: retryResult.sent,
            retried_failed: retryResult.failed,
          },
        });
      }

      await logCampaignOperationEvent(svc, {
        userId,
        campaignId: campaign.id,
        channel: "whatsapp",
        eventType: "dispatch_completed",
        source: "whatsapp-send-batch-retry",
        message: `Retries de WhatsApp processados. ${retryResult.sent} enviado(s), ${retryResult.failed} falha(s).`,
        metadata: {
          retried_sent: retryResult.sent,
          retried_failed: retryResult.failed,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          mode: "api",
          sent: retryResult.sent,
          failed: retryResult.failed,
          retried_sent: retryResult.sent,
          retried_failed: retryResult.failed,
          message: "Processed due retries",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if ((cpRows?.length || 0) <= threshold && !force_api) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: "manual",
          pending: cpRows?.length || 0,
          threshold,
          retried_sent: retryResult.sent,
          retried_failed: retryResult.failed,
          message: "Below threshold: manual flow should be used",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const presIds = (cpRows || []).map((row: any) => row.presentation_id);
    const { data: presentations } = await svc
      .from("presentations")
      .select(
        "id, public_id, user_id, business_name, business_phone, business_category, business_address, business_website, business_rating, analysis_data, pipeline_stage_id",
      )
      .in("id", presIds);

    const cpMap = new Map(((cpRows || []) as any[]).map((cp: any) => [cp.presentation_id, cp]));
    const presList = presentations || [];
    const activeVariants = variants.filter((v) => v.is_active !== false);
    const defaultVariants = activeVariants.length > 0 ? activeVariants : variants;

    let sentCount = retryResult.sent;
    let failedCount = retryResult.failed;

    for (const pres of presList as any[]) {
      const cp = cpMap.get(pres.id);
      if (!cp) continue;

      const fullPhone = normalizePhone(pres.business_phone);
      const chosenVariant = pickVariantForLead(pres, defaultVariants, selectedTemplate);
      const variantId = chosenVariant?.id || null;

      const publicUrl = buildTrackedPresentationUrl(publishedOrigin, pres.public_id, {
        campaignId: campaign.id,
        campaignPresentationId: cp.id,
        templateId: campaign.template_id,
        variantId,
        channel: "whatsapp",
        source: "campaign",
      });

      const message = replaceVariables(
        chosenVariant?.body || selectedTemplate?.body || DEFAULT_WA_MESSAGE_TEMPLATE,
        pres,
        publicUrl,
        senderName,
      );
      const templateInfo = {
        metaTemplateName: chosenVariant?.meta_template_name || selectedTemplate?.meta_template_name || null,
        metaTemplateStatus: chosenVariant?.meta_template_status || selectedTemplate?.meta_template_status || null,
        metaTemplateLanguage: chosenVariant?.meta_template_language || selectedTemplate?.meta_template_language || null,
        metaVariableOrder: (chosenVariant?.meta_variable_order || selectedTemplate?.meta_variable_order) as string[] | null,
      };
      const attemptNo = await getNextAttemptNo(svc, cp.id);

      if (!fullPhone) {
        await svc
          .from("campaign_presentations")
          .update({
            send_status: "failed",
            delivery_status: "failed",
            last_status_at: new Date().toISOString(),
            variant_id: variantId,
          })
          .eq("id", cp.id);

        await svc.from("campaign_message_attempts").insert({
          user_id: userId,
          campaign_presentation_id: cp.id,
          campaign_id: campaign.id,
          presentation_id: pres.id,
          template_id: campaign.template_id,
          variant_id: variantId,
          channel: "whatsapp",
          send_mode: "api",
          provider: providerName,
          attempt_no: attemptNo,
          status: "failed",
          error_reason: "invalid_phone",
        });
        failedCount++;
        continue;
      }

      let finalResult: { ok: boolean; status: number; providerMessageId?: string; error?: string } = {
        ok: false,
        status: 0,
        error: "unknown_error",
      };

      for (let retry = 0; retry < 2; retry++) {
        const result = await sendWhatsAppMessage(fullPhone, message, pres, publicUrl, templateInfo);
        finalResult = result;
        if (result.ok) break;
        if (!isTransientStatus(result.status) || retry === 1) break;
        // Brief pause before retry
        if (waConnectionType === "meta_official") await sleep(META_SEND_DELAY_MS);
      }

      const nowIso = new Date().toISOString();
      if (finalResult.ok) {
        await svc
          .from("campaign_presentations")
          .update({
            send_status: "sent",
            sent_at: nowIso,
            provider_message_id: finalResult.providerMessageId || null,
            delivery_status: "sent",
            last_status_at: nowIso,
            variant_id: variantId,
            followup_step: 0,
            next_followup_at: addDaysIso(1),
          })
          .eq("id", cp.id);

        await svc.from("campaign_message_attempts").insert({
          user_id: userId,
          campaign_presentation_id: cp.id,
          campaign_id: campaign.id,
          presentation_id: pres.id,
          template_id: campaign.template_id,
          variant_id: variantId,
          channel: "whatsapp",
          send_mode: "api",
          provider: providerName,
          attempt_no: attemptNo,
          status: "sent",
          provider_message_id: finalResult.providerMessageId || null,
          sent_at: nowIso,
          followup_step: 0,
          next_followup_at: addDaysIso(1),
          metadata: { threshold, force_api },
        });

        await svc.from("message_conversion_events").insert({
          event_type: "sent",
          presentation_id: pres.id,
          user_id: pres.user_id,
          campaign_id: campaign.id,
          campaign_presentation_id: cp.id,
          template_id: campaign.template_id,
          variant_id: variantId,
          channel: "whatsapp",
          pipeline_stage_id: pres.pipeline_stage_id || null,
          niche: pres.business_category || null,
          score_bucket: scoreBucket(pres.analysis_data),
          source: "whatsapp_send_batch",
          metadata: { attempt_no: attemptNo },
        });

        if (waConnectionType === "meta_official") await sleep(META_SEND_DELAY_MS);
        sentCount++;
      } else {
        const transient = isTransientStatus(finalResult.status);
        await svc
          .from("campaign_presentations")
          .update({
            send_status: "failed",
            delivery_status: "failed",
            last_status_at: nowIso,
            variant_id: variantId,
          })
          .eq("id", cp.id);

        await svc.from("campaign_message_attempts").insert({
          user_id: userId,
          campaign_presentation_id: cp.id,
          campaign_id: campaign.id,
          presentation_id: pres.id,
          template_id: campaign.template_id,
          variant_id: variantId,
          channel: "whatsapp",
          send_mode: "api",
          provider: providerName,
          attempt_no: attemptNo,
          status: transient ? "retrying" : "failed",
          error_reason: finalResult.error || "whatsapp_send_failed",
          next_retry_at: transient ? addMinutesIso(15) : null,
          metadata: { status: finalResult.status, transient },
        });
        failedCount++;
      }
    }

    if (sentCount > 0 || failedCount > 0 || presList.length > 0 || retryResult.sent > 0 || retryResult.failed > 0) {
      if (failedCount > 0) {
        await logCampaignOperationEvent(svc, {
          userId,
          campaignId: campaign.id,
          channel: "whatsapp",
          eventType: "dispatch_failed",
          source: "whatsapp-send-batch",
          reasonCode: "dispatch-error",
          message: `${failedCount} lead(s) falharam durante o envio da campanha por WhatsApp.`,
          metadata: {
            sent: sentCount,
            failed: failedCount,
            retried_sent: retryResult.sent,
            retried_failed: retryResult.failed,
            total_pending: presList.length,
          },
        });
      }

      await logCampaignOperationEvent(svc, {
        userId,
        campaignId: campaign.id,
        channel: "whatsapp",
        eventType: "dispatch_completed",
        source: "whatsapp-send-batch",
        message: `Campanha por WhatsApp processada. ${sentCount} enviado(s), ${failedCount} falha(s).`,
        metadata: {
          sent: sentCount,
          failed: failedCount,
          retried_sent: retryResult.sent,
          retried_failed: retryResult.failed,
          total_pending: presList.length,
          threshold,
          force_api,
        },
      });

      await svc
        .from("campaigns")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", campaign.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: "api",
        threshold,
        sent: sentCount,
        failed: failedCount,
        retried_sent: retryResult.sent,
        retried_failed: retryResult.failed,
        total: presList.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("whatsapp-send-batch error:", error);
    if (logUserId && logCampaignId) {
      try {
        const svc = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", {
          auth: { persistSession: false },
        });
        await logCampaignOperationEvent(svc, {
          userId: logUserId,
          campaignId: logCampaignId,
          channel: "whatsapp",
          eventType: "dispatch_failed",
          source: "whatsapp-send-batch",
          reasonCode: "dispatch-error",
          message: error instanceof Error ? error.message : "Failed to send batch",
        });
      } catch (logError) {
        console.error("Failed to persist campaign WhatsApp operation event:", logError);
      }
    }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to send batch" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
