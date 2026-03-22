import test from 'node:test';
import assert from 'node:assert/strict';
import { isPaidPlanStatus, resolveBillingAccess } from '../supabase/functions/_shared/billing.js';

test('treats past_due as paid plan but grace access', () => {
  assert.equal(isPaidPlanStatus('past_due'), true);

  const result = resolveBillingAccess({
    subscriptionStatus: 'past_due',
    currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  });

  assert.equal(result.accessStatus, 'grace');
  assert.equal(result.shouldBlock, false);
  assert.ok(result.graceUntil);
});

test('blocks unpaid subscriptions', () => {
  const result = resolveBillingAccess({
    subscriptionStatus: 'unpaid',
  });

  assert.equal(result.accessStatus, 'blocked');
  assert.equal(result.shouldBlock, true);
  assert.match(result.blockReason, /inadimplente/i);
});

test('keeps active subscriptions with access released', () => {
  const result = resolveBillingAccess({
    subscriptionStatus: 'active',
  });

  assert.equal(result.accessStatus, 'active');
  assert.equal(result.blockReason, null);
  assert.equal(result.graceUntil, null);
});
