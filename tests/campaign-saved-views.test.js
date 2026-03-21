import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCampaignSavedView,
  getDefaultCampaignSavedViews,
  isCampaignSavedViewActive,
  moveCampaignSavedView,
  normalizeCampaignSavedViewName,
  parseCampaignSavedViews,
  sanitizeCampaignSavedViewFilters,
  upsertCampaignSavedView,
} from '../src/lib/campaigns/saved-views.js';

test('sanitizeCampaignSavedViewFilters normalizes unsupported values', () => {
  assert.deepEqual(
    sanitizeCampaignSavedViewFilters({
      view: 'invalid',
      channel: 'unknown',
      status: 'broken',
      search: '  campanha teste  ',
      sort: 'nope',
    }),
    {
      view: 'all',
      channel: 'all',
      status: 'all',
      search: 'campanha teste',
      sort: 'priority',
    },
  );
});

test('upsertCampaignSavedView replaces duplicated names and keeps newest first', () => {
  const first = buildCampaignSavedView({
    id: 'view-1',
    name: 'Webhook urgente',
    filters: { channel: 'webhook', sort: 'recent' },
  });

  const nextViews = upsertCampaignSavedView([first], {
    id: 'view-2',
    name: '  Webhook urgente  ',
    filters: { channel: 'email', sort: 'conversion' },
  });

  assert.equal(nextViews.length, 1);
  assert.equal(nextViews[0].id, 'view-2');
  assert.equal(nextViews[0].filters.channel, 'email');
  assert.equal(nextViews[0].filters.sort, 'conversion');
});

test('upsertCampaignSavedView keeps order when updating an existing id', () => {
  const views = [
    buildCampaignSavedView({ id: 'view-1', name: 'Primeira', filters: { channel: 'email' } }),
    buildCampaignSavedView({ id: 'view-2', name: 'Segunda', filters: { channel: 'webhook' } }),
    buildCampaignSavedView({ id: 'view-3', name: 'Terceira', filters: { channel: 'whatsapp' } }),
  ];

  const updated = upsertCampaignSavedView(views, {
    id: 'view-2',
    name: 'Segunda renomeada',
    filters: { channel: 'webhook', sort: 'conversion' },
  });

  assert.deepEqual(updated.map((item) => item.id), ['view-1', 'view-2', 'view-3']);
  assert.equal(updated[1].name, 'Segunda renomeada');
  assert.equal(updated[1].filters.sort, 'conversion');
});

test('isCampaignSavedViewActive compares the full filter snapshot', () => {
  const savedView = buildCampaignSavedView({
    id: 'view-1',
    name: 'Email pronto',
    filters: {
      view: 'attention',
      channel: 'email',
      status: 'scheduled',
      search: 'dns',
      sort: 'priority',
    },
  });

  assert.equal(
    isCampaignSavedViewActive(savedView, {
      view: 'attention',
      channel: 'email',
      status: 'scheduled',
      search: 'dns',
      sort: 'priority',
    }),
    true,
  );

  assert.equal(
    isCampaignSavedViewActive(savedView, {
      view: 'attention',
      channel: 'email',
      status: 'scheduled',
      search: 'dns',
      sort: 'recent',
    }),
    false,
  );
});

test('parseCampaignSavedViews ignores invalid payloads and keeps normalized items', () => {
  const parsed = parseCampaignSavedViews(
    JSON.stringify([
      { id: 'view-1', name: '  Falhas email  ', filters: { channel: 'email', status: 'sent', sort: 'leads' } },
      { id: 'view-2', name: '   ', filters: { channel: 'webhook' } },
    ]),
  );

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, normalizeCampaignSavedViewName('Falhas email'));
  assert.equal(parsed[0].filters.channel, 'email');
  assert.equal(parsed[0].filters.sort, 'leads');
});

test('getDefaultCampaignSavedViews exposes the operational presets with valid filters', () => {
  const defaults = getDefaultCampaignSavedViews();

  assert.equal(defaults.length, 5);
  assert.equal(defaults[0].id, 'default-attention-priority');
  assert.equal(defaults[0].filters.view, 'attention');
  assert.equal(defaults[0].filters.sort, 'priority');
  assert.equal(defaults[4].filters.view, 'completed');
  assert.equal(defaults[4].filters.sort, 'conversion');
});

test('moveCampaignSavedView reorders user views without losing items', () => {
  const views = [
    buildCampaignSavedView({ id: 'view-1', name: 'Primeira', filters: { channel: 'email' } }),
    buildCampaignSavedView({ id: 'view-2', name: 'Segunda', filters: { channel: 'webhook' } }),
    buildCampaignSavedView({ id: 'view-3', name: 'Terceira', filters: { channel: 'whatsapp' } }),
  ];

  const movedLeft = moveCampaignSavedView(views, 'view-2', 'left');
  assert.deepEqual(movedLeft.map((item) => item.id), ['view-2', 'view-1', 'view-3']);

  const movedRight = moveCampaignSavedView(views, 'view-2', 'right');
  assert.deepEqual(movedRight.map((item) => item.id), ['view-1', 'view-3', 'view-2']);

  const boundary = moveCampaignSavedView(views, 'view-1', 'left');
  assert.deepEqual(boundary.map((item) => item.id), ['view-1', 'view-2', 'view-3']);
});
