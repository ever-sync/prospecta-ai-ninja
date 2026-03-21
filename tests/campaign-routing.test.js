import test from 'node:test';
import assert from 'node:assert/strict';
import { getCampaignDispatchTarget } from '../supabase/functions/_shared/campaign-routing.js';

test('routes whatsapp campaigns to the whatsapp dispatcher', () => {
  assert.equal(getCampaignDispatchTarget('whatsapp'), 'whatsapp');
});

test('routes email campaigns to the email dispatcher', () => {
  assert.equal(getCampaignDispatchTarget('email'), 'email');
});

test('routes webhook campaigns to the webhook dispatcher', () => {
  assert.equal(getCampaignDispatchTarget('webhook'), 'webhook');
});
