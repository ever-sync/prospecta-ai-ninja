import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCampaignWebhookPayload,
  buildTrackedPresentationUrl,
} from '../supabase/functions/_shared/campaign-webhook.js';

test('builds a tracked presentation url for webhook payloads', () => {
  const url = buildTrackedPresentationUrl('https://app.example.com', 'public-123', {
    campaignId: 'camp-1',
    campaignPresentationId: 'cp-1',
    templateId: 'tpl-1',
    variantId: 'var-1',
    channel: 'webhook',
    source: 'campaign_webhook',
  });

  assert.equal(
    url,
    'https://app.example.com/presentation/public-123?cid=camp-1&cpid=cp-1&tid=tpl-1&vid=var-1&ch=webhook&src=campaign_webhook',
  );
});

test('builds the webhook payload shape used by n8n', () => {
  const payload = buildCampaignWebhookPayload({
    eventId: 'camp-1:cp-1',
    attemptId: 'attempt-1',
    dispatchedAt: '2026-03-21T10:00:00.000Z',
    source: 'campaign_webhook',
    campaign: {
      id: 'camp-1',
      name: 'Campanha n8n',
      channel: 'webhook',
      status: 'draft',
      description: 'Teste',
      scheduled_at: null,
      sent_at: null,
      template_id: 'tpl-1',
    },
    campaignPresentation: {
      id: 'cp-1',
      send_status: 'pending',
      sent_at: null,
      delivery_status: 'pending',
      followup_step: 0,
      next_followup_at: null,
      provider_message_id: null,
      variant_id: 'var-1',
    },
    presentation: {
      id: 'pres-1',
      public_id: 'public-123',
      business_name: 'Acme',
      business_phone: '11999999999',
      business_email: 'lead@acme.com',
      business_website: 'https://acme.com',
      business_address: 'Rua 1',
      business_category: 'Serviços',
      business_rating: 4.8,
      pipeline_stage_id: 'stage-1',
      lead_response: 'pending',
      analysis_data: { scores: { overall: 87 } },
    },
    profile: {
      company_name: 'Prospecta',
      proposal_link_domain: 'app.example.com',
    },
    publicUrl: 'https://app.example.com/presentation/public-123?cid=camp-1',
    messagePreview: 'Mensagem de preview',
    subjectPreview: 'Assunto de preview',
  });

  assert.equal(payload.event, 'campaign.webhook');
  assert.equal(payload.event_id, 'camp-1:cp-1');
  assert.equal(payload.attempt_id, 'attempt-1');
  assert.equal(payload.tracking.channel, 'webhook');
  assert.equal(payload.target.public_url, 'https://app.example.com/presentation/public-123?cid=camp-1');
  assert.equal(payload.message_preview, 'Mensagem de preview');
  assert.equal(payload.subject_preview, 'Assunto de preview');
});
