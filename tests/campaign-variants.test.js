import test from 'node:test';
import assert from 'node:assert/strict';
import { pickVariantForLead, scoreBucket } from '../supabase/functions/_shared/campaign-variants.js';

test('scoreBucket groups lead scores consistently', () => {
  assert.equal(scoreBucket({ scores: { overall: 20 } }), 'low');
  assert.equal(scoreBucket({ scores: { overall: 55 } }), 'medium');
  assert.equal(scoreBucket({ scores: { overall: 88 } }), 'high');
  assert.equal(scoreBucket({}), 'unknown');
});

test('pickVariantForLead prefers the most relevant variant for the lead profile', () => {
  const lead = {
    id: 'lead-1',
    business_category: 'restaurante',
    analysis_data: { scores: { overall: 32 } },
  };

  const variants = [
    { id: 'variant-a', target_persona: 'score:high', campaign_objective: 'escala', cta_trigger: 'prova social' },
    { id: 'variant-b', target_persona: 'restaurante score:low', campaign_objective: 'recuperar', cta_trigger: 'urgencia' },
  ];

  const selected = pickVariantForLead(lead, variants, variants[0]);
  assert.equal(selected?.id, 'variant-b');
});
