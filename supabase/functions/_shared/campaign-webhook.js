export function resolveBaseOrigin(domain, requestOrigin) {
  const fallback = requestOrigin || 'https://envpro.com.br';
  const value = (domain || '').trim().replace(/\/+$/, '');
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function buildTrackedPresentationUrl(baseOrigin, publicId, tracking) {
  const params = new URLSearchParams();
  params.set('cid', tracking.campaignId);
  if (tracking.campaignPresentationId) params.set('cpid', tracking.campaignPresentationId);
  if (tracking.templateId) params.set('tid', tracking.templateId);
  if (tracking.variantId) params.set('vid', tracking.variantId);
  params.set('ch', tracking.channel);
  params.set('src', tracking.source);
  return `${baseOrigin}/presentation/${publicId}?${params.toString()}`;
}

export function buildCampaignWebhookHeaders({
  eventId,
  attemptId,
  campaignId,
  campaignPresentationId,
  secret,
}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-EnvPro-Event': 'campaign.webhook',
    'X-EnvPro-Event-Id': eventId,
    'X-EnvPro-Attempt-Id': attemptId,
    'X-EnvPro-Campaign-Id': campaignId,
    'X-EnvPro-Campaign-Presentation-Id': campaignPresentationId,
    'Idempotency-Key': attemptId,
  };

  if (secret && secret.trim()) {
    headers['X-N8N-Webhook-Secret'] = secret.trim();
  }

  return headers;
}

export function buildCampaignWebhookPayload({
  eventId,
  attemptId,
  dispatchedAt,
  source = 'campaign_webhook',
  campaign,
  campaignPresentation,
  presentation,
  profile,
  publicUrl,
  messagePreview,
  subjectPreview = null,
}) {
  return {
    event: 'campaign.webhook',
    event_id: eventId,
    attempt_id: attemptId,
    dispatched_at: dispatchedAt,
    source,
    campaign: {
      id: campaign?.id || null,
      name: campaign?.name || null,
      channel: campaign?.channel || null,
      status: campaign?.status || null,
      description: campaign?.description || null,
      scheduled_at: campaign?.scheduled_at || null,
      sent_at: campaign?.sent_at || null,
      template_id: campaign?.template_id || null,
    },
    campaign_presentation: {
      id: campaignPresentation?.id || null,
      send_status: campaignPresentation?.send_status || null,
      sent_at: campaignPresentation?.sent_at || null,
      delivery_status: campaignPresentation?.delivery_status || null,
      followup_step: campaignPresentation?.followup_step || 0,
      next_followup_at: campaignPresentation?.next_followup_at || null,
      provider_message_id: campaignPresentation?.provider_message_id || null,
      variant_id: campaignPresentation?.variant_id || null,
    },
    presentation: {
      id: presentation?.id || null,
      public_id: presentation?.public_id || null,
      business_name: presentation?.business_name || null,
      business_phone: presentation?.business_phone || null,
      business_email: presentation?.business_email || null,
      business_website: presentation?.business_website || null,
      business_address: presentation?.business_address || null,
      business_category: presentation?.business_category || null,
      business_rating: presentation?.business_rating ?? null,
      pipeline_stage_id: presentation?.pipeline_stage_id || null,
      lead_response: presentation?.lead_response || null,
      analysis_data: presentation?.analysis_data || null,
    },
    profile: {
      company_name: profile?.company_name || null,
      proposal_link_domain: profile?.proposal_link_domain || null,
    },
    tracking: {
      campaign_id: campaign?.id || null,
      campaign_presentation_id: campaignPresentation?.id || null,
      template_id: campaign?.template_id || null,
      variant_id: campaignPresentation?.variant_id || null,
      channel: 'webhook',
      source,
    },
    target: {
      public_url: publicUrl,
    },
    message_preview: messagePreview,
    subject_preview: subjectPreview || null,
  };
}
