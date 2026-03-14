import { CRM_DEFAULT_VIEW_PRESETS, CRMFilters, CRMLeadSnapshot, CRMMetricCards, CRMQueueItem, CRMSystemStatus, CRMTask, CRMSavedView } from '@/types/crm';

type StageLike = {
  id: string;
  is_default: boolean;
  default_status: string | null;
  position: number;
  name: string;
};

const FIXED_STAGE_ORDER: Record<CRMSystemStatus, number> = {
  ready: 0,
  sent: 1,
  pending: 2,
  responded: 3,
};

export const DEFAULT_FIXED_STAGES = [
  { name: 'Propostas Criadas', color: '#6366f1', position: 0, is_default: true, default_status: 'ready' },
  { name: 'Enviadas', color: '#f59e0b', position: 1, is_default: true, default_status: 'sent' },
  { name: 'Pendente', color: '#8b5cf6', position: 2, is_default: true, default_status: 'pending' },
  { name: 'Aceitas', color: '#EF3333', position: 3, is_default: true, default_status: 'responded' },
] as const;

export const resolvePublicBaseOrigin = (domain?: string | null) => {
  const fallback = 'https://envpro.com.br';
  const value = (domain || '').trim().replace(/\/+$/, '');
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

export const buildLeadPublicUrl = (publicBaseOrigin: string, publicId?: string | null) =>
  publicId ? `${publicBaseOrigin}/presentation/${publicId}` : '';

export const buildCRMHref = (options: { leadId?: string; mode?: string; view?: string } = {}) => {
  const params = new URLSearchParams();
  if (options.mode) params.set('mode', options.mode);
  if (options.view) params.set('view', options.view);
  if (options.leadId) params.set('lead', options.leadId);
  const query = params.toString();
  return query ? `/crm?${query}` : '/crm';
};

export const slugifyCRMViewName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const sortStages = <T extends StageLike>(stages: T[]) =>
  [...stages].sort((a, b) => {
    const aOrder = a.is_default ? FIXED_STAGE_ORDER[(a.default_status as CRMSystemStatus) || 'pending'] ?? 99 : 100 + a.position;
    const bOrder = b.is_default ? FIXED_STAGE_ORDER[(b.default_status as CRMSystemStatus) || 'pending'] ?? 99 : 100 + b.position;
    if (aOrder !== bOrder) return aOrder - bOrder;
    if (a.position !== b.position) return a.position - b.position;
    return a.name.localeCompare(b.name);
  });

export const dedupeStages = <T extends StageLike>(stages: T[]) => {
  const seenDefaultStatuses = new Set<string>();
  const uniqueStages: T[] = [];

  for (const stage of sortStages(stages)) {
    if (stage.is_default && stage.default_status) {
      if (seenDefaultStatuses.has(stage.default_status)) continue;
      seenDefaultStatuses.add(stage.default_status);
    }

    uniqueStages.push(stage);
  }

  return uniqueStages;
};

export const getEffectiveStageId = (lead: CRMLeadSnapshot, stages: StageLike[]) => {
  const stagesById = new Map(stages.map((stage) => [stage.id, stage]));
  const defaultStageMap = stages.reduce<Record<CRMSystemStatus, StageLike | null>>(
    (acc, stage) => {
      if (stage.is_default && stage.default_status && stage.default_status in FIXED_STAGE_ORDER) {
        acc[stage.default_status as CRMSystemStatus] = stage;
      }
      return acc;
    },
    { ready: null, sent: null, pending: null, responded: null }
  );

  const assignedStage = lead.pipeline_stage_id ? stagesById.get(lead.pipeline_stage_id) || null : null;
  const systemStatus = (lead.system_status || 'pending') as CRMSystemStatus;
  const autoStage = defaultStageMap[systemStatus];

  if (!autoStage) return assignedStage?.id || null;
  if (!assignedStage) return autoStage.id;
  if (assignedStage.is_default) return autoStage.id;

  if (systemStatus === 'sent' || systemStatus === 'responded') return autoStage.id;
  return assignedStage.id;
};

export const applyCRMFilters = (leads: CRMLeadSnapshot[], filters: CRMFilters, stages: StageLike[]) =>
  leads.filter((lead) => {
    const score = lead.analysis_score || 0;
    const haystack = `${lead.business_name || ''} ${lead.business_category || ''} ${lead.business_phone || ''}`.toLowerCase();

    if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
    if (filters.category !== 'all' && lead.business_category !== filters.category) return false;
    if (filters.channel !== 'all' && (lead.last_channel || 'unknown') !== filters.channel) return false;
    if (filters.systemStatus !== 'all' && lead.system_status !== filters.systemStatus) return false;
    if (filters.stageId !== 'all' && getEffectiveStageId(lead, stages) !== filters.stageId) return false;
    if (filters.temperature !== 'all' && lead.temperature !== filters.temperature) return false;
    if (filters.scoreBand === 'high' && score < 80) return false;
    if (filters.scoreBand === 'medium' && (score < 60 || score >= 80)) return false;
    if (filters.scoreBand === 'low' && score >= 60) return false;
    if (filters.onlyReadyNotSent && !lead.is_ready_not_sent) return false;
    if (filters.onlyFollowupDue && !lead.followup_due) return false;
    if (filters.onlyOpenedNoResponse && !lead.is_opened_no_response) return false;
    if (filters.onlyAccepted && lead.lead_response !== 'accepted') return false;
    if (filters.onlyRejected && lead.lead_response !== 'rejected') return false;
    return true;
  });

export const buildCRMMetricCards = (leads: CRMLeadSnapshot[], tasks: CRMTask[]): CRMMetricCards => {
  const now = Date.now();
  const overdueTaskIds = new Set(
    tasks
      .filter((task) => task.status === 'open' && task.due_at && new Date(task.due_at).getTime() <= now)
      .map((task) => task.presentation_id)
  );

  return {
    readyNotSent: leads.filter((lead) => lead.is_ready_not_sent).length,
    followupDue: leads.filter((lead) => lead.followup_due || overdueTaskIds.has(lead.presentation_id)).length,
    openedNoResponse: leads.filter((lead) => lead.is_opened_no_response).length,
    accepted: leads.filter((lead) => lead.lead_response === 'accepted').length,
  };
};

export const buildActionQueue = (leads: CRMLeadSnapshot[], tasks: CRMTask[]): CRMQueueItem[] => {
  const now = Date.now();
  const overdueTaskMap = new Map<string, CRMTask[]>();

  for (const task of tasks) {
    if (task.status !== 'open' || !task.due_at) continue;
    if (new Date(task.due_at).getTime() > now) continue;
    const current = overdueTaskMap.get(task.presentation_id) || [];
    current.push(task);
    overdueTaskMap.set(task.presentation_id, current);
  }

  return leads
    .map((lead) => {
      const overdueTasks = overdueTaskMap.get(lead.presentation_id) || [];
      if (lead.followup_due || overdueTasks.length > 0) {
        return {
          lead,
          reason: 'followup_due' as const,
          priority: 1,
          detail: overdueTasks[0]?.title || 'Existe follow-up vencido para este lead.',
        };
      }
      if (lead.is_opened_no_response) {
        return {
          lead,
          reason: 'opened_no_response' as const,
          priority: 2,
          detail: `${lead.view_count || 0} visualizacao(oes) sem resposta do lead.`,
        };
      }
      if (lead.is_ready_not_sent) {
        return {
          lead,
          reason: 'ready_not_sent' as const,
          priority: 3,
          detail: 'A proposta esta pronta, mas ainda nao entrou em cadencia.',
        };
      }
      if (lead.is_hot) {
        return {
          lead,
          reason: 'hot' as const,
          priority: 4,
          detail: 'Lead com sinal comercial forte para abordagem imediata.',
        };
      }
      return null;
    })
    .filter((item): item is CRMQueueItem => Boolean(item))
    .sort((a, b) => {
      const aDate = a.lead.last_event_at || a.lead.last_opened_at || a.lead.created_at || '';
      const bDate = b.lead.last_event_at || b.lead.last_opened_at || b.lead.created_at || '';
      return a.priority - b.priority || bDate.localeCompare(aDate);
    });
};

export const getQueueReasonLabel = (reason: CRMQueueItem['reason']) => {
  switch (reason) {
    case 'followup_due':
      return 'Follow-up vencido';
    case 'opened_no_response':
      return 'Aberta sem resposta';
    case 'ready_not_sent':
      return 'Pronta sem envio';
    case 'hot':
      return 'Lead quente';
    default:
      return 'Fila';
  }
};

export const getLeadResponseLabel = (response?: string | null) => {
  switch (response) {
    case 'accepted':
      return 'Aceita';
    case 'rejected':
      return 'Recusada';
    default:
      return 'Aguardando';
  }
};

export const getSystemStatusLabel = (status?: string | null) => {
  switch (status) {
    case 'ready':
      return 'Criada';
    case 'sent':
      return 'Enviada';
    case 'responded':
      return 'Respondida';
    default:
      return 'Pendente';
  }
};

export const getTemperatureLabel = (temperature?: string | null) => {
  switch (temperature) {
    case 'hot':
      return 'Quente';
    case 'warm':
      return 'Morna';
    default:
      return 'Fria';
  }
};

export const getTaskTypeLabel = (type?: string | null) => {
  switch (type) {
    case 'call':
      return 'Ligacao';
    case 'send_message':
      return 'Enviar mensagem';
    case 'review_proposal':
      return 'Revisar proposta';
    case 'schedule_meeting':
      return 'Agendar reuniao';
    case 'send_next_step':
      return 'Enviar proxima etapa';
    default:
      return 'Follow-up';
  }
};

export const formatCRMDate = (value?: string | null, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR', options || { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatCRMDateTime = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ensureDefaultCRMViews = (views: CRMSavedView[], userId: string) => {
  const existingNames = new Set(views.map((view) => view.name.toLowerCase()));
  return CRM_DEFAULT_VIEW_PRESETS.filter((preset) => !existingNames.has(preset.name.toLowerCase())).map((preset) => ({
    user_id: userId,
    name: preset.name,
    filters: preset.filters,
    is_default: false,
  }));
};

export const dedupeViewsByName = <T extends Pick<CRMSavedView, 'name'>>(views: T[]) => {
  const seenNames = new Set<string>();
  const uniqueViews: T[] = [];

  for (const view of views) {
    const normalizedName = view.name.trim().toLowerCase();
    if (seenNames.has(normalizedName)) continue;
    seenNames.add(normalizedName);
    uniqueViews.push(view);
  }

  return uniqueViews;
};
