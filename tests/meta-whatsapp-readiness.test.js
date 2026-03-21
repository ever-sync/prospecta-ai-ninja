import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMetaWhatsAppReadiness } from '../supabase/functions/_shared/meta-whatsapp.js';

test('marks a fully configured official WhatsApp setup as ready', () => {
  const result = buildMetaWhatsAppReadiness({
    hasAccessToken: true,
    hasPhoneNumberId: true,
    hasWabaId: true,
    hasWebhookUrl: true,
    hasVerifyToken: true,
    hasAppSecret: true,
    apiReachable: true,
    apiError: null,
  });

  assert.equal(result.readiness, 'ready');
  assert.equal(result.issues.length, 0);
  assert.ok(result.checks.every((check) => check.ok));
});

test('downgrades to partial when official setup still needs template or webhook support', () => {
  const result = buildMetaWhatsAppReadiness({
    hasAccessToken: true,
    hasPhoneNumberId: true,
    hasWabaId: false,
    hasWebhookUrl: true,
    hasVerifyToken: true,
    hasAppSecret: false,
    apiReachable: true,
    apiError: null,
  });

  assert.equal(result.readiness, 'partial');
  assert.ok(result.issues.some((issue) => issue.key === 'waba_id'));
  assert.ok(result.issues.some((issue) => issue.key === 'app_secret'));
});

test('blocks readiness when the Meta API cannot validate the credentials', () => {
  const result = buildMetaWhatsAppReadiness({
    hasAccessToken: true,
    hasPhoneNumberId: true,
    hasWabaId: true,
    hasWebhookUrl: true,
    hasVerifyToken: true,
    hasAppSecret: true,
    apiReachable: false,
    apiError: 'Invalid OAuth access token',
  });

  assert.equal(result.readiness, 'blocked');
  assert.ok(result.issues.some((issue) => issue.key === 'meta_api'));
  assert.equal(result.checks[0].ok, false);
});
