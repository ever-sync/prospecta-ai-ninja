export const MAX_CAMPAIGN_SAVED_VIEWS = 6;

const validViewFilters = new Set(['all', 'attention', 'completed']);
const validChannelFilters = new Set(['all', 'whatsapp', 'email', 'webhook']);
const validStatusFilters = new Set(['all', 'draft', 'scheduled', 'sending', 'sent', 'cancelled']);
const validSortOptions = new Set(['priority', 'recent', 'oldest', 'leads', 'conversion']);

export const normalizeCampaignSavedViewName = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 48);

export const sanitizeCampaignSavedViewFilters = (filters = {}) => ({
  view: validViewFilters.has(filters.view) ? filters.view : 'all',
  channel: validChannelFilters.has(filters.channel) ? filters.channel : 'all',
  status: validStatusFilters.has(filters.status) ? filters.status : 'all',
  search: String(filters.search || '').trim().slice(0, 120),
  sort: validSortOptions.has(filters.sort) ? filters.sort : 'priority',
});

export const buildCampaignSavedView = ({ id, name, filters, created_at }) => ({
  id: id || `campaign-view-${Date.now()}`,
  name: normalizeCampaignSavedViewName(name),
  filters: sanitizeCampaignSavedViewFilters(filters),
  created_at: created_at || new Date().toISOString(),
});

const defaultCampaignViewSeeds = [
  {
    id: 'default-attention-priority',
    name: 'Acao imediata',
    filters: { view: 'attention', sort: 'priority' },
  },
  {
    id: 'default-webhook-recent',
    name: 'Webhook recente',
    filters: { channel: 'webhook', sort: 'recent' },
  },
  {
    id: 'default-email-scheduled',
    name: 'Email agendado',
    filters: { channel: 'email', status: 'scheduled', sort: 'recent' },
  },
  {
    id: 'default-whatsapp-scheduled',
    name: 'WhatsApp agendado',
    filters: { channel: 'whatsapp', status: 'scheduled', sort: 'recent' },
  },
  {
    id: 'default-completed-conversion',
    name: 'Concluidas por conversao',
    filters: { view: 'completed', sort: 'conversion' },
  },
];

export const getDefaultCampaignSavedViews = () =>
  defaultCampaignViewSeeds.map((item) => buildCampaignSavedView(item));

export const parseCampaignSavedViews = (raw) => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => buildCampaignSavedView(item || {}))
      .filter((item) => item.name)
      .slice(0, MAX_CAMPAIGN_SAVED_VIEWS);
  } catch {
    return [];
  }
};

export const upsertCampaignSavedView = (views, nextView, limit = MAX_CAMPAIGN_SAVED_VIEWS) => {
  const normalizedNext = buildCampaignSavedView(nextView);
  const normalizedKey = normalizedNext.name.toLowerCase();
  const items = Array.isArray(views) ? views.filter(Boolean) : [];
  const existingIndex = items.findIndex((item) => item.id === normalizedNext.id);

  const filteredViews = items.filter((item) => {
    if (!item) return false;
    if (item.id === normalizedNext.id) return false;
    return normalizeCampaignSavedViewName(item.name).toLowerCase() !== normalizedKey;
  });

  if (existingIndex !== -1) {
    const nextViews = [...filteredViews];
    nextViews.splice(Math.min(existingIndex, nextViews.length), 0, normalizedNext);
    return nextViews.slice(0, limit);
  }

  const nextViews = [normalizedNext].concat(
    filteredViews.filter((item) => {
      if (!item) return false;
      return normalizeCampaignSavedViewName(item.name).toLowerCase() !== normalizedKey;
    }),
  );

  return nextViews.slice(0, limit);
};

export const moveCampaignSavedView = (views, viewId, direction) => {
  const items = Array.isArray(views) ? [...views] : [];
  const currentIndex = items.findIndex((item) => item?.id === viewId);
  if (currentIndex === -1) return items;

  const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return items;

  const [item] = items.splice(currentIndex, 1);
  items.splice(targetIndex, 0, item);
  return items;
};

export const isCampaignSavedViewActive = (savedView, currentFilters) => {
  if (!savedView?.filters) return false;
  const left = sanitizeCampaignSavedViewFilters(savedView.filters);
  const right = sanitizeCampaignSavedViewFilters(currentFilters);

  return (
    left.view === right.view &&
    left.channel === right.channel &&
    left.status === right.status &&
    left.search === right.search &&
    left.sort === right.sort
  );
};
