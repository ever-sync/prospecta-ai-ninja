import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEmailSenderReadiness } from '../supabase/functions/_shared/email-sender.js';

test('marks a verified sender domain as ready', () => {
  const result = buildEmailSenderReadiness({
    senderEmail: 'comercial@empresa.com',
    replyToEmail: 'respostas@empresa.com',
    hasResendKey: true,
    apiReachable: true,
    apiError: null,
    domainExists: true,
    domainStatus: 'verified',
  });

  assert.equal(result.readiness, 'ready');
  assert.equal(result.status, 'ready');
  assert.equal(result.issues.length, 0);
});

test('keeps sender pending while DNS verification is not complete', () => {
  const result = buildEmailSenderReadiness({
    senderEmail: 'comercial@empresa.com',
    replyToEmail: null,
    hasResendKey: true,
    apiReachable: true,
    apiError: null,
    domainExists: true,
    domainStatus: 'not_started',
    domainWasCreated: true,
  });

  assert.equal(result.readiness, 'partial');
  assert.equal(result.status, 'pending');
  assert.ok(result.issues.some((issue) => issue.key === 'dns_verification'));
});

test('blocks sender readiness when resend cannot be reached', () => {
  const result = buildEmailSenderReadiness({
    senderEmail: 'comercial@empresa.com',
    replyToEmail: 'respostas@empresa.com',
    hasResendKey: false,
    apiReachable: false,
    apiError: 'RESEND_API_KEY ausente',
    domainExists: false,
    domainStatus: null,
  });

  assert.equal(result.readiness, 'blocked');
  assert.equal(result.status, 'blocked');
  assert.ok(result.issues.some((issue) => issue.key === 'resend_api'));
});
