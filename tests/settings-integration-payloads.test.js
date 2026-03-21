import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDomainIntegrationPayload,
  buildEmailIntegrationPayload,
  buildElevenLabsIntegrationPayload,
  buildWebhookIntegrationPayload,
  buildWhatsAppIntegrationPayload,
  validateEmailAddress,
} from '../src/lib/settings/integration-payloads.js';

test('buildWhatsAppIntegrationPayload only returns whatsapp fields', () => {
  const payload = buildWhatsAppIntegrationPayload({
    accessToken: ' token ',
    phoneNumberId: ' 123 ',
    wabaId: ' 456 ',
  });

  assert.deepEqual(payload, {
    whatsapp_connection_type: 'meta_official',
    whatsapp_official_access_token: 'token',
    whatsapp_official_phone_number_id: '123',
    whatsapp_business_account_id: '456',
    whatsapp_unofficial_api_url: null,
    whatsapp_unofficial_api_token: null,
    whatsapp_unofficial_instance: null,
  });
  assert.equal('campaign_sender_email' in payload, false);
  assert.equal('campaign_webhook_url' in payload, false);
});

test('buildEmailIntegrationPayload only returns email fields', () => {
  const payload = buildEmailIntegrationPayload({
    senderEmail: ' comercial@empresa.com ',
    senderName: ' Equipe Comercial ',
  });

  assert.deepEqual(payload, {
    campaign_sender_email: 'comercial@empresa.com',
    campaign_sender_name: 'Equipe Comercial',
  });
  assert.equal('proposal_link_domain' in payload, false);
  assert.equal('elevenlabs_voice_id' in payload, false);
});

test('buildWebhookIntegrationPayload normalizes the webhook url', () => {
  const payload = buildWebhookIntegrationPayload({
    url: 'n8n.empresa.com/webhook/campanha',
    secret: ' segredo ',
  });

  assert.deepEqual(payload, {
    campaign_webhook_url: 'https://n8n.empresa.com/webhook/campanha',
    campaign_webhook_secret: 'segredo',
  });
  assert.equal('campaign_sender_email' in payload, false);
});

test('buildDomainIntegrationPayload accepts only the base origin/domain', () => {
  assert.deepEqual(buildDomainIntegrationPayload({ domain: ' app.empresa.com/ ' }), {
    proposal_link_domain: 'app.empresa.com',
  });

  assert.throws(
    () => buildDomainIntegrationPayload({ domain: 'https://app.empresa.com/base/path' }),
    /domain-path-not-allowed/
  );
});

test('buildElevenLabsIntegrationPayload only returns voice id', () => {
  assert.deepEqual(buildElevenLabsIntegrationPayload({ voiceId: ' abc123 ' }), {
    elevenlabs_voice_id: 'abc123',
  });
});

test('validateEmailAddress rejects malformed sender emails', () => {
  assert.equal(validateEmailAddress('comercial@empresa.com'), true);
  assert.equal(validateEmailAddress('comercial@empresa'), false);
  assert.equal(validateEmailAddress(''), false);
});
