const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const trimOrNull = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
};

export const normalizeEmailAddress = (value) => {
  const normalized = trimOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
};

export const extractEmailDomain = (value) => {
  const normalized = normalizeEmailAddress(value);
  if (!normalized || !EMAIL_RE.test(normalized)) return null;
  return normalized.split('@')[1] || null;
};

const normalizeOptionalUrl = (value) => {
  const raw = (value || '').trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return new URL(withScheme).toString();
};

export const normalizeWebhookUrl = (value) => normalizeOptionalUrl(value);

export const normalizeProposalLinkDomain = (value) => {
  const raw = (value || '').trim().replace(/\/+$/, '');
  if (!raw) return null;

  const hasScheme = /^https?:\/\//i.test(raw);
  const parsed = new URL(hasScheme ? raw : `https://${raw}`);

  if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash) {
    throw new Error('domain-path-not-allowed');
  }

  return hasScheme ? parsed.origin : parsed.host;
};

export const validateEmailAddress = (value) => EMAIL_RE.test((value || '').trim());

export const buildWhatsAppIntegrationPayload = ({
  accessToken,
  phoneNumberId,
  wabaId,
  connectionType = 'meta_official',
}) => ({
  whatsapp_connection_type: connectionType,
  whatsapp_official_access_token: trimOrNull(accessToken),
  whatsapp_official_phone_number_id: trimOrNull(phoneNumberId),
  whatsapp_business_account_id: trimOrNull(wabaId),
  whatsapp_unofficial_api_url: null,
  whatsapp_unofficial_api_token: null,
  whatsapp_unofficial_instance: null,
});

export const buildEmailIntegrationPayload = ({ senderEmail, senderName }) => ({
  campaign_sender_email: normalizeEmailAddress(senderEmail),
  campaign_sender_name: trimOrNull(senderName),
});

export const buildEmailSenderReadinessPayload = ({
  senderEmail,
  replyToEmail,
  senderStatus = null,
  senderProvider = null,
  senderLastCheckedAt = null,
  senderVerifiedAt = null,
  senderError = null,
} = {}) => ({
  campaign_sender_email: normalizeEmailAddress(senderEmail),
  campaign_reply_to_email: normalizeEmailAddress(replyToEmail),
  email_sender_status: senderStatus,
  email_sender_provider: senderProvider,
  email_sender_domain: extractEmailDomain(senderEmail),
  email_sender_last_checked_at: senderLastCheckedAt,
  email_sender_verified_at: senderVerifiedAt,
  email_sender_error: trimOrNull(senderError),
});

export const buildWebhookIntegrationPayload = ({ url, secret }) => ({
  campaign_webhook_url: normalizeWebhookUrl(url),
  campaign_webhook_secret: trimOrNull(secret),
});

export const buildDomainIntegrationPayload = ({ domain }) => ({
  proposal_link_domain: normalizeProposalLinkDomain(domain),
});

export const buildElevenLabsIntegrationPayload = ({ voiceId }) => ({
  elevenlabs_voice_id: trimOrNull(voiceId),
});
