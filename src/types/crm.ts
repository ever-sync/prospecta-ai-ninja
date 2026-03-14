import { Tables } from '@/integrations/supabase/types';

export type CRMMode = 'queue' | 'kanban' | 'list';
export type CRMSystemStatus = 'ready' | 'sent' | 'pending' | 'responded';
export type CRMTemperature = 'hot' | 'warm' | 'cold';
export type CRMTaskType = 'followup' | 'call' | 'send_message' | 'review_proposal' | 'schedule_meeting' | 'send_next_step';
export type CRMTaskStatus = 'open' | 'completed';
export type CRMPipelineStage = Tables<'pipeline_stages'>;

export type CRMLeadSnapshot = Omit<Tables<'crm_lead_snapshot'>, 'presentation_id' | 'user_id'> & {
  presentation_id: string;
  user_id: string;
};

export type CRMTask = Tables<'crm_tasks'>;
export type CRMSavedView = Tables<'crm_views'>;

export type CRMFilters = {
  search: string;
  category: string;
  channel: string;
  systemStatus: 'all' | CRMSystemStatus;
  stageId: string;
  temperature: 'all' | CRMTemperature;
  scoreBand: 'all' | 'high' | 'medium' | 'low';
  onlyReadyNotSent: boolean;
  onlyFollowupDue: boolean;
  onlyOpenedNoResponse: boolean;
  onlyAccepted: boolean;
  onlyRejected: boolean;
};

export type CRMMetricCards = {
  readyNotSent: number;
  followupDue: number;
  openedNoResponse: number;
  accepted: number;
};

export type CRMQueueReason = 'followup_due' | 'opened_no_response' | 'ready_not_sent' | 'hot';

export type CRMQueueItem = {
  lead: CRMLeadSnapshot;
  reason: CRMQueueReason;
  priority: number;
  detail: string;
};

export type CRMLeadNote = {
  id: string;
  content: string;
  created_at: string;
};

export type CRMLeadTimelineItem = {
  id: string;
  title: string;
  description: string;
  at: string;
  tone: 'neutral' | 'positive' | 'warning' | 'danger';
};

export const DEFAULT_CRM_FILTERS: CRMFilters = {
  search: '',
  category: 'all',
  channel: 'all',
  systemStatus: 'all',
  stageId: 'all',
  temperature: 'all',
  scoreBand: 'all',
  onlyReadyNotSent: false,
  onlyFollowupDue: false,
  onlyOpenedNoResponse: false,
  onlyAccepted: false,
  onlyRejected: false,
};

export const CRM_DEFAULT_VIEW_PRESETS: Array<{ name: string; filters: Partial<CRMFilters> }> = [
  { name: 'Quentes', filters: { temperature: 'hot' } },
  { name: 'Follow-up Hoje', filters: { onlyFollowupDue: true } },
  { name: 'Sem Resposta', filters: { onlyOpenedNoResponse: true } },
  { name: 'Aceitas', filters: { onlyAccepted: true } },
];
