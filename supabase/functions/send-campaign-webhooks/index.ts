import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logCampaignOperationEvent } from "../_shared/campaign-operation-events.js";
import { HttpError, requireBillingAccess } from "../_shared/auth.ts";
import {
  buildCampaignWebhookHeaders,
  buildCampaignWebhookPayload,
  buildTrackedPresentationUrl,
  resolveBaseOrigin,
} from "../_shared/campaign-webhook.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function scoreBucket(analysisData: any): "low" | "medium" | "high" | "unknown" {
  const score = analysisData?.scores?.overall;
  if (typeof score !== "number") return "unknown";
  if (score < 40) return "low";
  if (score < 70) return "medium";
  return "high";
}

function normalizeWebhookUrl(value: string | null | undefined): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return new URL(withScheme).toString();
}

function replaceVariables(text: string, pres: any, publicUrl: string, senderName: string): string {
  return (text || "")
    .replace(/\{\{nome_empresa\}\}/g, pres.business_name || "")
    .replace(/\{\{categoria\}\}/g, pres.business_category || "")
    .replace(/\{\{endereco\}\}/g, pres.business_address || "")
    .replace(/\{\{telefone\}\}/g, pres.business_phone || "")
    .replace(/\{\{website\}\}/g, pres.business_website || "")
    .replace(/\{\{rating\}\}/g, pres.business_rating?.toString() || "")
    .replace(/\{\{score\}\}/g, (pres.analysis_data as any)?.scores?.overall?.toString() || "")
    .replace(/\{\{link_proposta\}\}/g, publicUrl)
    .replace(/\{\{sua_empresa\}\}/g, senderName);
}

async function getNextAttemptNo(svc: any, campaignPresentationId: string): Promise<number> {
  const { count } = await svc
    .from("campaign_message_attempts")
    .select("id", { head: true, count: "exact" })
    .eq("campaign_presentation_id", campaignPresentationId);
  return (count || 0) + 1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let logUserId: string | null = null;
  let logCampaignId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) throw new HttpError(401, "Unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const envWebhookUrl = Deno.env.get("N8N_CAMPAIGN_WEBHOOK_URL") || "";
    const envWebhookSecret = Deno.env.get("N8N_CAMPAIGN_WEBHOOK_SECRET") || "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const svc = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const bodyData = await req.json();

    const isServiceRoleCall =
      !!serviceKey &&
      authHeader === `Bearer ${serviceKey}` &&
      typeof bodyData.user_id === "string";

    let userId: string;
    if (isServiceRoleCall) {
      userId = bodyData.user_id;
    } else {
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) throw new HttpError(401, "Unauthorized");
      userId = user.id;
    }

    const { campaign_id } = bodyData;
    if (!campaign_id) throw new HttpError(400, "campaign_id is required");
    logCampaignId = campaign_id;

    logUserId = userId;
    await requireBillingAccess(svc, userId);

    const { data: campaignData, error: campaignError } = await svc
      .from("campaigns")
      .select("id, user_id, channel, template_id, name, description, scheduled_at, sent_at, status")
      .eq("id", campaign_id)
      .single();
    if (campaignError || !campaignData) throw new Error("Campaign not found");

    const campaign = campaignData as any;
    if (campaign.user_id !== userId) throw new Error("Forbidden");
    if (campaign.channel !== "webhook") {
      throw new Error("Campaign channel must be webhook");
    }

    const { data: profileData } = await svc
      .from("profiles")
      .select("company_name, proposal_link_domain, campaign_webhook_url, campaign_webhook_secret")
      .eq("user_id", userId)
      .maybeSingle();
    const profile = (profileData as any) || {};
    const senderName = profile.company_name || "Nossa Empresa";
    const webhookUrl = normalizeWebhookUrl(profile.campaign_webhook_url || envWebhookUrl);
    if (!webhookUrl) {
      await logCampaignOperationEvent(svc, {
        userId,
        campaignId: campaign_id,
        channel: "webhook",
        eventType: "blocked",
        source: "send-campaign-webhooks",
        reasonCode: "missing-webhook-target",
        message: "Configure a URL do webhook do n8n em Configuracoes > Integracoes antes de enviar campanhas.",
      });
      return new Response(
        JSON.stringify({
          success: false,
          code: "missing_webhook_target",
          error: "Configure a URL do webhook do n8n em Configuracoes > Integracoes antes de enviar campanhas.",
          campaign_id,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let template: { body: string | null; subject: string | null } | null = null;
    if (campaign.template_id) {
      const { data: tpl } = await svc
        .from("message_templates")
        .select("body, subject")
        .eq("id", campaign.template_id)
        .single();
      template = (tpl as any) || null;
    }

    const { data: cpRows } = await svc
      .from("campaign_presentations")
      .select("id, presentation_id, send_status, sent_at, delivery_status, followup_step, next_followup_at, provider_message_id, variant_id")
      .eq("campaign_id", campaign_id)
      .eq("send_status", "pending");

    if (!cpRows || cpRows.length === 0) {
      await svc
        .from("campaigns")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", campaign.id);

      return new Response(JSON.stringify({ success: true, sent: 0, message: "No pending presentations" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const presIds = cpRows.map((row: any) => row.presentation_id);
    const { data: presentations } = await svc
      .from("presentations")
      .select("id, public_id, user_id, business_name, business_phone, business_email, business_website, business_address, business_category, business_rating, analysis_data, pipeline_stage_id, lead_response")
      .in("id", presIds);

    const baseOrigin = resolveBaseOrigin(profile.proposal_link_domain, req.headers.get("origin"));
    const presMap = new Map((presentations || []).map((p: any) => [p.id, p]));

    let sentCount = 0;
    let failedCount = 0;

    for (const cp of cpRows as any[]) {
      const pres = presMap.get(cp.presentation_id);
      if (!pres) continue;

      const eventId = `${campaign.id}:${cp.id}`;
      const attemptId = crypto.randomUUID();
      const attemptNo = await getNextAttemptNo(svc, cp.id);
      const publicUrl = buildTrackedPresentationUrl(baseOrigin, pres.public_id, {
        campaignId: campaign.id,
        campaignPresentationId: cp.id,
        templateId: campaign.template_id,
        variantId: cp.variant_id || null,
        channel: "webhook",
        source: "campaign_webhook",
      });

      const messagePreview = template?.body
        ? replaceVariables(template.body, pres, publicUrl, senderName)
        : `Olá! Tudo bem?\n\nSou da ${senderName} e preparei uma análise personalizada para ${pres.business_name}.\n\nAcesse aqui: ${publicUrl}`;
      const subjectPreview = template?.subject ? replaceVariables(template.subject, pres, publicUrl, senderName) : null;

      const payload = buildCampaignWebhookPayload({
        eventId,
        attemptId,
        dispatchedAt: new Date().toISOString(),
        source: "campaign_webhook",
        campaign,
        campaignPresentation: cp,
        presentation: pres,
        profile,
        publicUrl,
        messagePreview,
        subjectPreview,
      });

      const headers = buildCampaignWebhookHeaders({
        eventId,
        attemptId,
        campaignId: campaign.id,
        campaignPresentationId: cp.id,
        secret: profile.campaign_webhook_secret || envWebhookSecret,
      });

      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const responseText = await response.text().catch(() => "");
        let responseData: any = {};
        if (responseText) {
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = { raw: responseText };
          }
        }

        const now = new Date().toISOString();
        if (response.ok) {
          const providerMessageId =
            responseData?.executionId ||
            responseData?.execution_id ||
            responseData?.id ||
            responseData?.runId ||
            responseData?.run_id ||
            `webhook:${eventId}:${attemptId}`;

          await svc
            .from("campaign_presentations")
            .update({
              send_status: "sent",
              sent_at: now,
              delivery_status: "sent",
              last_status_at: now,
              provider_message_id: providerMessageId,
              variant_id: cp.variant_id || null,
            })
            .eq("id", cp.id);

          await svc.from("campaign_message_attempts").insert({
            user_id: userId,
            campaign_presentation_id: cp.id,
            campaign_id: campaign.id,
            presentation_id: pres.id,
            template_id: campaign.template_id || null,
            variant_id: cp.variant_id || null,
            channel: "webhook",
            send_mode: "api",
            provider: "other",
            attempt_no: attemptNo,
            status: "sent",
            provider_message_id: providerMessageId,
            sent_at: now,
            metadata: {
              event_id: eventId,
              attempt_id: attemptId,
              webhook_url: webhookUrl,
              response_status: response.status,
              response_body: responseData,
            },
          });

          await svc.from("message_conversion_events").insert({
            event_type: "sent",
            presentation_id: pres.id,
            user_id: pres.user_id,
            campaign_id: campaign.id,
            campaign_presentation_id: cp.id,
            template_id: campaign.template_id || null,
            variant_id: cp.variant_id || null,
            channel: "webhook",
            pipeline_stage_id: pres.pipeline_stage_id || null,
            niche: pres.business_category || null,
            score_bucket: scoreBucket(pres.analysis_data),
            source: "send_campaign_webhooks",
            metadata: {
              event_id: eventId,
              attempt_id: attemptId,
              response_status: response.status,
            },
          });

          sentCount++;
        } else {
          const providerMessageId = `webhook:${eventId}:${attemptId}`;
          await svc
            .from("campaign_presentations")
            .update({
              send_status: "failed",
              delivery_status: "failed",
              last_status_at: now,
              provider_message_id: providerMessageId,
              variant_id: cp.variant_id || null,
            })
            .eq("id", cp.id);

          await svc.from("campaign_message_attempts").insert({
            user_id: userId,
            campaign_presentation_id: cp.id,
            campaign_id: campaign.id,
            presentation_id: pres.id,
            template_id: campaign.template_id || null,
            variant_id: cp.variant_id || null,
            channel: "webhook",
            send_mode: "api",
            provider: "other",
            attempt_no: attemptNo,
            status: "failed",
            provider_message_id: providerMessageId,
            error_reason: responseText || `Webhook failed with status ${response.status}`,
            metadata: {
              event_id: eventId,
              attempt_id: attemptId,
              webhook_url: webhookUrl,
              response_status: response.status,
              response_body: responseData,
            },
          });

          failedCount++;
        }
      } catch (error) {
        const now = new Date().toISOString();
        const providerMessageId = `webhook:${eventId}:${attemptId}`;
        await svc
          .from("campaign_presentations")
          .update({
            send_status: "failed",
            delivery_status: "failed",
            last_status_at: now,
            provider_message_id: providerMessageId,
            variant_id: cp.variant_id || null,
          })
          .eq("id", cp.id);

        await svc.from("campaign_message_attempts").insert({
          user_id: userId,
          campaign_presentation_id: cp.id,
          campaign_id: campaign.id,
          presentation_id: pres.id,
          template_id: campaign.template_id || null,
          variant_id: cp.variant_id || null,
          channel: "webhook",
          send_mode: "api",
          provider: "other",
          attempt_no: attemptNo,
          status: "failed",
          provider_message_id: providerMessageId,
          error_reason: error instanceof Error ? error.message : "webhook_send_failed",
          metadata: {
            event_id: eventId,
            attempt_id: attemptId,
            webhook_url: webhookUrl,
          },
        });

        failedCount++;
      }
    }

    if (sentCount > 0 || failedCount > 0 || cpRows.length > 0) {
      if (failedCount > 0) {
        await logCampaignOperationEvent(svc, {
          userId,
          campaignId: campaign.id,
          channel: "webhook",
          eventType: "dispatch_failed",
          source: "send-campaign-webhooks",
          reasonCode: "dispatch-error",
          message: `${failedCount} lead(s) falharam durante o envio do webhook da campanha.`,
          metadata: {
            sent: sentCount,
            failed: failedCount,
            total_pending: cpRows.length,
            webhook_url: webhookUrl,
          },
        });
      }

      await logCampaignOperationEvent(svc, {
        userId,
        campaignId: campaign.id,
        channel: "webhook",
        eventType: "dispatch_completed",
        source: "send-campaign-webhooks",
        message: `Campanha por webhook processada. ${sentCount} enviado(s), ${failedCount} falha(s).`,
        metadata: {
          sent: sentCount,
          failed: failedCount,
          total_pending: cpRows.length,
          webhook_url: webhookUrl,
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
        sent: sentCount,
        failed: failedCount,
        total: cpRows.length,
        webhook_url: webhookUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("send-campaign-webhooks error:", error);
    if (logUserId && logCampaignId) {
      try {
        const svc = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", {
          auth: { persistSession: false },
        });
        await logCampaignOperationEvent(svc, {
          userId: logUserId,
          campaignId: logCampaignId,
          channel: "webhook",
          eventType: "dispatch_failed",
          source: "send-campaign-webhooks",
          reasonCode: "dispatch-error",
          message: error instanceof Error ? error.message : "Failed",
        });
      } catch (logError) {
        console.error("Failed to persist campaign webhook operation event:", logError);
      }
    }
    const status = error instanceof HttpError ? error.status : 500;
    const code = error instanceof HttpError && error.status === 402
      ? "billing_blocked"
      : undefined;
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed",
        ...(code ? { code } : {}),
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
