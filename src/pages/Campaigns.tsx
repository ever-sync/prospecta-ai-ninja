import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, Megaphone, Plus } from 'lucide-react';
import CampaignPreviewDialog from '@/components/CampaignPreviewDialog';
import { CampaignAddPresentationsDialog } from '@/components/campaigns/CampaignAddPresentationsDialog';
import { CampaignCard } from '@/components/campaigns/CampaignCard';
import { CampaignFiltersToolbar } from '@/components/campaigns/CampaignFiltersToolbar';
import { CampaignFailuresDialog } from '@/components/campaigns/CampaignFailuresDialog';
import { CampaignFormDialog } from '@/components/campaigns/CampaignFormDialog';
import { CampaignOperationHistoryDialog } from '@/components/campaigns/CampaignOperationHistoryDialog';
import { CampaignSavedViewDialog } from '@/components/campaigns/CampaignSavedViewDialog';
import { CampaignSummaryCards } from '@/components/campaigns/CampaignSummaryCards';
import { CampaignUrgentPanel } from '@/components/campaigns/CampaignUrgentPanel';
import { CampaignViewsCard } from '@/components/campaigns/CampaignViewsCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { buildCRMHref } from '@/lib/crm/deriveLeadState';
import { buildCampaignWebhookPayload } from '../../supabase/functions/_shared/campaign-webhook.js';
import { getCampaignDispatchTarget, isDispatchableCampaignChannel } from '../../supabase/functions/_shared/campaign-routing.js';
import { pickVariantForLead, scoreBucket } from '../../supabase/functions/_shared/campaign-variants.js';
import { getEdgeFunctionErrorMessage, invokeEdgeFunction } from '@/lib/invoke-edge-function';
import { buildCampaignSavedView, getDefaultCampaignSavedViews, isCampaignSavedViewActive, moveCampaignSavedView, normalizeCampaignSavedViewName, parseCampaignSavedViews, upsertCampaignSavedView } from '@/lib/campaigns/saved-views';
import { useNavigate } from 'react-router-dom';

interface Campaign {
  blocking_reason?: string | null;
  id: string;
  last_blocked_at?: string | null;
  latest_operation_event?: CampaignOperationEventRow | null;
  name: string;
  description: string;
  status: string;
  channel: string;
  template_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  total: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  accepted: number;
  rejected: number;
  views: number;
}

type EmailProfileStatus = {
  campaign_sender_email: string | null;
  email_sender_status: string | null;
  email_sender_error: string | null;
};

type EmailSenderConfig = {
  senderEmail: string;
  status: 'not_configured' | 'pending' | 'ready' | 'blocked';
  error: string;
};

type CampaignChannelConfig = {
  webhookReady: boolean;
  whatsAppOfficialReady: boolean;
};

type CampaignViewFilter = 'all' | 'attention' | 'completed';
type CampaignChannelFilter = 'all' | 'whatsapp' | 'email' | 'webhook';
type CampaignStatusFilter = 'all' | 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
type CampaignSortOption = 'priority' | 'recent' | 'oldest' | 'leads' | 'conversion';
type CampaignFilterSnapshot = {
  view: CampaignViewFilter;
  channel: CampaignChannelFilter;
  status: CampaignStatusFilter;
  search: string;
  sort: CampaignSortOption;
};

interface PresentationOption {
  id: string;
  public_id: string;
  business_name: string;
  business_phone: string;
  lead_response: string;
}

interface CampaignOperationEventRow {
  campaign_id?: string;
  id: string;
  created_at: string;
  event_type: string;
  source: string;
  reason_code?: string | null;
  message?: string | null;
  metadata?: any;
}

interface CampaignSavedView {
  id: string;
  name: string;
  created_at: string;
  filters: CampaignFilterSnapshot;
}

interface TemplateRow {
  id: string;
  name: string;
  channel: string;
  body?: string;
  subject?: string;
  image_url?: string;
  include_proposal_link?: boolean;
  send_as_audio?: boolean;
  experiment_group?: string | null;
  variant_key?: string;
  target_persona?: string | null;
  campaign_objective?: string | null;
  cta_trigger?: string | null;
  is_active?: boolean;
}

interface PreviewLead {
  id: string;
  campaignPresentationId: string;
  business_name: string;
  business_phone: string;
  business_category?: string | null;
  pipeline_stage_id?: string | null;
  analysis_data?: any;
  public_id: string;
  publicUrl: string;
  message: string;
  subject?: string;
  templateId?: string | null;
  variantId?: string | null;
  webhookPayloadPreview?: string;
}

const HYBRID_API_THRESHOLD = 15;
const CAMPAIGN_FILTERS_STORAGE_KEY = 'campaigns:list-filters';
const CAMPAIGN_SAVED_VIEWS_STORAGE_KEY = 'campaigns:saved-views';

const readStoredCampaignFilters = (): {
  view: CampaignViewFilter;
  channel: CampaignChannelFilter;
  status: CampaignStatusFilter;
  search: string;
  sort: CampaignSortOption;
} => {
  if (typeof window === 'undefined') {
    return { view: 'all', channel: 'all', status: 'all', search: '', sort: 'priority' };
  }

  try {
    const raw = window.localStorage.getItem(CAMPAIGN_FILTERS_STORAGE_KEY);
    if (!raw) return { view: 'all', channel: 'all', status: 'all', search: '', sort: 'priority' };
    const parsed = JSON.parse(raw);
    return {
      view: parsed?.view || 'all',
      channel: parsed?.channel || 'all',
      status: parsed?.status || 'all',
      search: parsed?.search || '',
      sort: parsed?.sort || 'priority',
    };
  } catch {
    return { view: 'all', channel: 'all', status: 'all', search: '', sort: 'priority' };
  }
};

const readStoredCampaignSavedViews = (): CampaignSavedView[] => {
  if (typeof window === 'undefined') return [];
  return parseCampaignSavedViews(window.localStorage.getItem(CAMPAIGN_SAVED_VIEWS_STORAGE_KEY)) as CampaignSavedView[];
};

const resolvePublicBaseOrigin = (domain?: string | null) => {
  const fallback = 'https://envpro.com.br';
  const value = (domain || '').trim().replace(/\/+$/, '');
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const plusDaysIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const formatFailureReason = (reason?: string | null) => {
  switch (reason) {
    case 'missing_business_email':
      return 'Lead sem email comercial cadastrado';
    case 'email_sender_not_ready':
      return 'Remetente do cliente ainda nao validado no Resend';
    case 'missing_meta_credentials':
      return 'Credenciais da Meta ausentes';
    case 'missing_webhook_target':
      return 'Webhook da campanha nao configurado';
    case 'billing_blocked':
      return 'Conta bloqueada por inadimplencia';
    case 'invalid_phone':
      return 'Telefone invalido para WhatsApp';
    default:
      return reason || 'Erro desconhecido';
  }
};

const formatBlockingReason = (reason?: string | null) => {
  switch (reason) {
    case 'email-sender-not-ready':
      return 'Campanha cancelada porque o remetente do cliente ainda nao estava validado.';
    case 'missing-meta-credentials':
      return 'Campanha cancelada porque a Meta oficial nao estava configurada para o WhatsApp.';
    case 'missing-webhook-target':
      return 'Campanha cancelada porque o webhook da campanha nao estava configurado.';
    case 'unsupported-channel':
      return 'Campanha cancelada porque o canal nao e suportado pelo dispatcher.';
    case 'billing-blocked':
      return 'Campanha cancelada porque a conta do usuario esta bloqueada por inadimplencia.';
    default:
      return reason || 'Campanha cancelada sem motivo operacional registrado.';
  }
};

const formatOperationEventType = (eventType: string) => {
  switch (eventType) {
    case 'blocked':
      return 'Bloqueio';
    case 'cancelled':
      return 'Cancelamento';
    case 'dispatch_failed':
      return 'Falha operacional';
    case 'dispatch_completed':
      return 'Envio concluido';
    case 'manual_action':
      return 'Acao manual';
    default:
      return eventType;
  }
};

const formatOperationReason = (reason?: string | null) => {
  switch (reason) {
    case 'email-sender-not-ready':
      return 'Remetente do cliente ainda nao validado';
    case 'missing-meta-credentials':
      return 'Meta oficial incompleta';
    case 'missing-webhook-target':
      return 'Webhook nao configurado';
    case 'unsupported-channel':
      return 'Canal nao suportado';
    case 'billing-blocked':
      return 'Conta bloqueada por inadimplencia';
    case 'plan-limit-emails':
      return 'Limite do plano para email atingido';
    case 'dispatch-error':
      return 'Falha ao acionar o dispatcher';
    case 'manual-resend':
      return 'Campanha resetada para reenvio';
    default:
      return reason || 'Sem codigo operacional';
  }
};

const summarizeOperationEvent = (row?: CampaignOperationEventRow | null) => {
  if (!row) return '';
  return row.message || formatOperationReason(row.reason_code);
};

const getOperationEventTone = (row?: CampaignOperationEventRow | null) => {
  if (!row) return 'neutral' as const;
  if (row.event_type === 'dispatch_completed') return 'success' as const;
  if (row.event_type === 'manual_action') return 'neutral' as const;
  return 'attention' as const;
};

const operationEventBadgeClass = (tone: 'success' | 'attention' | 'neutral') => {
  if (tone === 'success') return 'rounded-full border-[#cde8d9] bg-[#f0faf4] text-[#2d7a4a]';
  if (tone === 'attention') return 'rounded-full border-[#f5d8c8] bg-[#fff8f4] text-[#c2620a]';
  return 'rounded-full border-[#e6e6eb] bg-[#fafafd] text-[#7b7b83]';
};

const campaignViewFilterLabel = (value: CampaignViewFilter) => {
  if (value === 'attention') return 'Acao necessaria';
  if (value === 'completed') return 'Concluidas';
  return 'Todas';
};

const campaignChannelFilterLabel = (value: CampaignChannelFilter) => {
  if (value === 'whatsapp') return 'WhatsApp';
  if (value === 'email') return 'Email';
  if (value === 'webhook') return 'Webhook / n8n';
  return 'Todos os canais';
};

const campaignStatusFilterLabel = (value: CampaignStatusFilter) => {
  if (value === 'draft') return 'Rascunho';
  if (value === 'scheduled') return 'Agendada';
  if (value === 'sending') return 'Enviando';
  if (value === 'sent') return 'Enviada';
  if (value === 'cancelled') return 'Cancelada';
  return 'Todos os status';
};

const campaignSortOptionLabel = (value: CampaignSortOption) => {
  if (value === 'recent') return 'Mais recentes';
  if (value === 'oldest') return 'Mais antigas';
  if (value === 'leads') return 'Mais leads';
  if (value === 'conversion') return 'Maior conversao';
  return 'Prioridade operacional';
};

const buildSuggestedCampaignViewName = (filters: {
  view: CampaignViewFilter;
  channel: CampaignChannelFilter;
  status: CampaignStatusFilter;
  search: string;
  sort: CampaignSortOption;
}) => {
  const parts: string[] = [];

  if (filters.view !== 'all') parts.push(campaignViewFilterLabel(filters.view));
  if (filters.channel !== 'all') parts.push(campaignChannelFilterLabel(filters.channel));
  if (filters.status !== 'all') parts.push(campaignStatusFilterLabel(filters.status));
  if (filters.sort !== 'priority') parts.push(campaignSortOptionLabel(filters.sort));
  if (filters.search.trim()) parts.push(filters.search.trim());

  return normalizeCampaignSavedViewName(parts.join(' / ') || 'Minha visao');
};

const campaignMatchesFilterSnapshot = (
  campaign: Campaign,
  filters: CampaignFilterSnapshot,
  emailConfig: EmailSenderConfig,
  channelConfig: CampaignChannelConfig,
) => {
  if (filters.view === 'attention' && !campaignNeedsAttention(campaign, emailConfig, channelConfig)) {
    return false;
  }

  if (filters.view === 'completed' && getOperationEventTone(campaign.latest_operation_event) !== 'success') {
    return false;
  }

  if (filters.channel !== 'all' && campaign.channel !== filters.channel) {
    return false;
  }

  if (filters.status !== 'all' && campaign.status !== filters.status) {
    return false;
  }

  const normalizedSearch = filters.search.trim().toLowerCase();
  if (normalizedSearch) {
    return (
      campaign.name.toLowerCase().includes(normalizedSearch) ||
      campaign.description.toLowerCase().includes(normalizedSearch)
    );
  }

  return true;
};

const getCampaignRecency = (campaign: Campaign) => {
  const timestamp =
    campaign.latest_operation_event?.created_at ||
    campaign.last_blocked_at ||
    campaign.sent_at ||
    campaign.scheduled_at ||
    campaign.created_at;
  return timestamp ? new Date(timestamp).getTime() : 0;
};

const getCampaignConversionRate = (campaign: Campaign) => {
  if (!campaign.total) return 0;
  return campaign.accepted / campaign.total;
};

const campaignNeedsAttention = (
  campaign: Campaign,
  emailConfig: EmailSenderConfig,
  channelConfig: CampaignChannelConfig,
) => {
  if (campaign.blocking_reason) return true;
  if (campaign.latest_operation_event && getOperationEventTone(campaign.latest_operation_event) === 'attention') return true;
  if (campaign.failed_count > 0) return true;
  if (campaign.channel === 'email' && emailConfig.senderEmail && emailConfig.status !== 'ready') return true;
  if (campaign.channel === 'webhook' && !channelConfig.webhookReady) return true;
  if (campaign.channel === 'whatsapp' && campaign.status === 'scheduled' && !channelConfig.whatsAppOfficialReady) return true;
  return false;
};

const campaignNeedsConfiguration = (
  campaign: Campaign,
  emailConfig: EmailSenderConfig,
  channelConfig: CampaignChannelConfig,
) => {
  if (campaign.channel === 'email' && emailConfig.senderEmail && emailConfig.status !== 'ready') return true;
  if (campaign.channel === 'webhook' && !channelConfig.webhookReady) return true;
  if (campaign.channel === 'whatsapp' && campaign.status === 'scheduled' && !channelConfig.whatsAppOfficialReady) return true;
  return false;
};

const campaignIsBlocked = (campaign: Campaign) =>
  !!campaign.blocking_reason ||
  campaign.latest_operation_event?.event_type === 'blocked' ||
  campaign.latest_operation_event?.event_type === 'cancelled';

const campaignHasFailure = (campaign: Campaign) =>
  campaign.latest_operation_event?.event_type === 'dispatch_failed' ||
  (!!campaign.failed_count && !campaignIsBlocked(campaign));

const getCampaignPriority = (
  campaign: Campaign,
  emailConfig: EmailSenderConfig,
  channelConfig: CampaignChannelConfig,
) => {
  if (campaign.blocking_reason) return 100;
  if (campaign.channel === 'email' && emailConfig.senderEmail && emailConfig.status !== 'ready') return 95;
  if (campaign.channel === 'webhook' && !channelConfig.webhookReady) return 95;
  if (campaign.channel === 'whatsapp' && campaign.status === 'scheduled' && !channelConfig.whatsAppOfficialReady) return 95;
  if (campaign.latest_operation_event?.event_type === 'blocked' || campaign.latest_operation_event?.event_type === 'cancelled') return 90;
  if (campaign.latest_operation_event?.event_type === 'dispatch_failed') return 85;
  if (campaign.failed_count > 0) return 80;
  if (campaign.status === 'sending') return 70;
  if (campaign.status === 'scheduled') return 50;
  if (campaign.latest_operation_event?.event_type === 'dispatch_completed') return 20;
  return 10;
};

const describeChannelReadiness = ({
  channel,
  scheduledAt,
  emailConfig,
  channelConfig,
}: {
  channel: string;
  scheduledAt?: string;
  emailConfig: EmailSenderConfig;
  channelConfig: CampaignChannelConfig;
}) => {
  const isScheduled = !!scheduledAt;

  if (channel === 'email') {
    if (!emailConfig.senderEmail) {
      return {
        ready: true,
        tone: 'neutral' as const,
        title: 'Email pronto para campanha',
        detail: 'Sem remetente customizado configurado. O envio pode usar o remetente padrao.',
      };
    }
    if (emailConfig.status === 'ready') {
      return {
        ready: true,
        tone: 'ready' as const,
        title: 'Remetente validado',
        detail: 'O dominio do cliente esta pronto para envio de campanhas por email.',
      };
    }
    return {
      ready: false,
      tone: 'blocked' as const,
      title: isScheduled ? 'Agendamento bloqueado' : 'Remetente exige validacao',
      detail: emailConfig.error || 'Valide o dominio do remetente em Configuracoes > Integracoes > E-Mail.',
    };
  }

  if (channel === 'webhook') {
    return channelConfig.webhookReady
      ? {
          ready: true,
          tone: 'ready' as const,
          title: 'Webhook configurado',
          detail: 'A URL do webhook esta pronta para receber os leads da campanha.',
        }
      : {
          ready: false,
          tone: 'blocked' as const,
          title: isScheduled ? 'Agendamento bloqueado' : 'Webhook ausente',
          detail: 'Configure a URL do webhook em Configuracoes > Integracoes antes de usar esse canal.',
        };
  }

  if (channel === 'whatsapp' && isScheduled) {
    return channelConfig.whatsAppOfficialReady
      ? {
          ready: true,
          tone: 'ready' as const,
          title: 'Meta oficial pronta',
          detail: 'O numero oficial da Meta esta configurado para disparos agendados.',
        }
      : {
          ready: false,
          tone: 'blocked' as const,
          title: 'Agendamento bloqueado',
          detail: 'Campanhas agendadas de WhatsApp exigem Access Token e Phone Number ID configurados.',
        };
  }

  return {
    ready: true,
    tone: 'neutral' as const,
    title: 'Canal disponivel',
    detail: 'Nenhum bloqueio operacional detectado para esse canal.',
  };
};

const emailSenderStatusLabel = (status: EmailSenderConfig['status']) => {
  if (status === 'ready') return 'Remetente pronto';
  if (status === 'pending') return 'DNS pendente';
  if (status === 'blocked') return 'Remetente bloqueado';
  return 'Remetente padrao';
};

const emailSenderStatusClass = (status: EmailSenderConfig['status']) => {
  if (status === 'ready') return 'rounded-full border-[#cde8d9] bg-[#f0faf4] text-[#2d7a4a]';
  if (status === 'pending') return 'rounded-full border-[#f5c842]/40 bg-[#fffbeb] text-[#8b5e00]';
  if (status === 'blocked') return 'rounded-full border-[#f2d4d8] bg-[#fff3f5] text-[#8c2535]';
  return 'rounded-full border-[#e6e6eb] bg-[#fafafd] text-[#7b7b83]';
};

const channelReadinessBadgeClass = (ready: boolean) =>
  ready
    ? 'rounded-full border-[#cde8d9] bg-[#f0faf4] text-[#2d7a4a]'
    : 'rounded-full border-[#f2d4d8] bg-[#fff3f5] text-[#8c2535]';

const Campaigns = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { canUse } = useSubscription();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddPresentations, setShowAddPresentations] = useState<string | null>(null);
  const [availablePresentations, setAvailablePresentations] = useState<PresentationOption[]>([]);
  const [selectedPresentationIds, setSelectedPresentationIds] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [failuresCampaignId, setFailuresCampaignId] = useState<string | null>(null);
  const [failureRows, setFailureRows] = useState<{ business_name: string; business_phone: string; error_reason: string }[]>([]);
  const [historyCampaignId, setHistoryCampaignId] = useState<string | null>(null);
  const [operationRows, setOperationRows] = useState<CampaignOperationEventRow[]>([]);

  // Preview state
  const [previewLeads, setPreviewLeads] = useState<PreviewLead[]>([]);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendAsAudio, setSendAsAudio] = useState(false);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [campaignViewFilter, setCampaignViewFilter] = useState<CampaignViewFilter>(() => readStoredCampaignFilters().view);
  const [channelFilter, setChannelFilter] = useState<CampaignChannelFilter>(() => readStoredCampaignFilters().channel);
  const [statusFilter, setStatusFilter] = useState<CampaignStatusFilter>(() => readStoredCampaignFilters().status);
  const [searchTerm, setSearchTerm] = useState(() => readStoredCampaignFilters().search);
  const [sortOption, setSortOption] = useState<CampaignSortOption>(() => readStoredCampaignFilters().sort);
  const [savedViews, setSavedViews] = useState<CampaignSavedView[]>(() => readStoredCampaignSavedViews());
  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
  const [editingSavedViewId, setEditingSavedViewId] = useState<string | null>(null);
  const [savedViewName, setSavedViewName] = useState('');
  const [emailSenderConfig, setEmailSenderConfig] = useState<EmailSenderConfig>({
    senderEmail: '',
    status: 'not_configured',
    error: '',
  });
  const [channelConfig, setChannelConfig] = useState<CampaignChannelConfig>({
    webhookReady: false,
    whatsAppOfficialReady: false,
  });

  // Create / Edit form
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formChannel, setFormChannel] = useState('whatsapp');
  const [formSchedule, setFormSchedule] = useState('');
  const [formTemplateId, setFormTemplateId] = useState('');
  const [creating, setCreating] = useState(false);

  const resetCampaignForm = () => {
    setEditingCampaign(null);
    setFormName('');
    setFormDesc('');
    setFormChannel('whatsapp');
    setFormSchedule('');
    setFormTemplateId('');
  };

  useEffect(() => {
    if (user) {
      fetchCampaigns();
      fetchTemplates();
      fetchEmailSenderConfig();
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      CAMPAIGN_FILTERS_STORAGE_KEY,
      JSON.stringify({
        view: campaignViewFilter,
        channel: channelFilter,
        status: statusFilter,
        search: searchTerm,
        sort: sortOption,
      }),
    );
  }, [campaignViewFilter, channelFilter, statusFilter, searchTerm, sortOption]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CAMPAIGN_SAVED_VIEWS_STORAGE_KEY, JSON.stringify(savedViews));
  }, [savedViews]);

  const fetchEmailSenderConfig = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('campaign_sender_email, email_sender_status, email_sender_error, campaign_webhook_url, whatsapp_official_access_token, whatsapp_official_phone_number_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const profile = data as EmailProfileStatus | null;
    setEmailSenderConfig({
      senderEmail: profile?.campaign_sender_email || '',
      status: (profile?.email_sender_status as EmailSenderConfig['status'] | null) ||
        (profile?.campaign_sender_email ? 'pending' : 'not_configured'),
      error: profile?.email_sender_error || '',
    });
    setChannelConfig({
      webhookReady: !!(data as any)?.campaign_webhook_url,
      whatsAppOfficialReady: !!(data as any)?.whatsapp_official_access_token && !!(data as any)?.whatsapp_official_phone_number_id,
    });
  };

  const fetchTemplates = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('message_templates')
      .select('id, name, channel, experiment_group, variant_key, target_persona, campaign_objective, cta_trigger, is_active')
      .eq('user_id', user.id)
      .order('name');
    setTemplates((data as TemplateRow[]) || []);
  };

  const ensureScheduledChannelReady = (channel: string, scheduledAt?: string) => {
    const isScheduled = !!scheduledAt;
    if (!isScheduled) return true;

    if (channel === 'webhook' && !channelConfig.webhookReady) {
      toast({
        title: 'Webhook obrigatorio para agendamento',
        description: 'Configure o webhook da campanha em Configuracoes > Integracoes antes de agendar esse canal.',
        variant: 'destructive',
      });
      return false;
    }

    if (channel === 'whatsapp' && !channelConfig.whatsAppOfficialReady) {
      toast({
        title: 'Meta obrigatoria para agendamento',
        description: 'Campanhas agendadas de WhatsApp exigem Access Token e Phone Number ID configurados.',
        variant: 'destructive',
      });
      return false;
    }

    if (channel === 'email' && emailSenderConfig.senderEmail && emailSenderConfig.status !== 'ready') {
      toast({
        title: 'Remetente de email ainda nao validado',
        description:
          emailSenderConfig.error ||
          'Valide o dominio do remetente em Configuracoes > Integracoes > E-Mail antes de agendar campanhas.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const logCampaignOperationEvent = async ({
    campaignId,
    channel,
    eventType,
    source,
    reasonCode,
    message,
    metadata,
  }: {
    campaignId: string;
    channel: string;
    eventType: string;
    source: string;
    reasonCode?: string | null;
    message?: string | null;
    metadata?: Record<string, any>;
  }) => {
    if (!user) return;

    const { error } = await supabase.from('campaign_operation_events').insert({
      user_id: user.id,
      campaign_id: campaignId,
      channel: isDispatchableCampaignChannel(channel) ? channel : 'unknown',
      event_type: eventType,
      source,
      reason_code: reasonCode || null,
      message: message || null,
      metadata: metadata || {},
    } as any);

    if (error) {
      console.warn('Falha ao registrar evento operacional da campanha:', error);
    }
  };

  const fetchCampaigns = async () => {
    if (!user) return;

    const { data: campaignRows } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!campaignRows) { setLoading(false); return; }

    const campaignIds = campaignRows.map((row) => row.id);
    const latestOperationByCampaign = new Map<string, CampaignOperationEventRow>();
    if (campaignIds.length > 0) {
      const { data: operationRows } = await supabase
        .from('campaign_operation_events')
        .select('id, campaign_id, created_at, event_type, source, reason_code, message, metadata')
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false });

      for (const row of ((operationRows as CampaignOperationEventRow[]) || [])) {
        if (row.campaign_id && !latestOperationByCampaign.has(row.campaign_id)) {
          latestOperationByCampaign.set(row.campaign_id, row);
        }
      }
    }

    // Get metrics for each campaign
    const enriched: Campaign[] = [];
    for (const c of campaignRows) {
      const { data: cpRows } = await supabase
        .from('campaign_presentations')
        .select('presentation_id, send_status, delivery_status')
        .eq('campaign_id', c.id);

      const presentationIds = (cpRows || []).map((r: any) => r.presentation_id);
      let accepted = 0;
      let rejected = 0;

      if (presentationIds.length > 0) {
        const { data: pRows } = await supabase
          .from('presentations')
          .select('lead_response')
          .in('id', presentationIds);
        accepted = (pRows || []).filter(p => p.lead_response === 'accepted').length;
        rejected = (pRows || []).filter(p => p.lead_response === 'rejected').length;
      }

      const { count: viewsCount } = await supabase
        .from('message_conversion_events')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', c.id)
        .eq('event_type', 'opened');

      const rows = (cpRows || []) as any[];
      enriched.push({
        blocking_reason: (c as any).blocking_reason || null,
        id: c.id,
        last_blocked_at: (c as any).last_blocked_at || null,
        latest_operation_event: latestOperationByCampaign.get(c.id) || null,
        name: c.name,
        description: c.description || '',
        status: c.status,
        channel: c.channel,
        template_id: c.template_id || null,
        scheduled_at: c.scheduled_at,
        sent_at: c.sent_at,
        created_at: c.created_at,
        total: rows.length,
        sent_count: rows.filter(r => r.send_status === 'sent').length,
        delivered_count: rows.filter(r => r.delivery_status === 'delivered' || r.delivery_status === 'read').length,
        read_count: rows.filter(r => r.delivery_status === 'read').length,
        failed_count: rows.filter(r => r.send_status === 'failed').length,
        accepted,
        rejected,
        views: viewsCount || 0,
      });
    }

    setCampaigns(enriched);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !formName.trim()) return;

    if (!isDispatchableCampaignChannel(formChannel)) {
      toast({
        title: 'Canal indisponivel',
        description: 'Escolha um canal de envio válido.',
        variant: 'destructive',
      });
      return;
    }

    if (!canUse('campaigns')) {
      toast({
        title: 'Limite atingido',
        description: 'Você atingiu o limite de campanhas do seu plano. Faça upgrade em Configurações → Faturamento.',
        variant: 'destructive',
      });
      return;
    }

    if (!ensureScheduledChannelReady(formChannel, formSchedule)) {
      return;
    }

    setCreating(true);

    const { error } = await supabase.from('campaigns').insert({
      blocking_reason: null,
      user_id: user.id,
      last_blocked_at: null,
      name: formName.trim(),
      description: formDesc.trim(),
      channel: formChannel,
      template_id: formTemplateId || null,
      scheduled_at: formSchedule || null,
      status: formSchedule ? 'scheduled' : 'draft',
    } as any);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Campanha criada!' });
      setShowCreate(false);
      resetCampaignForm();
      fetchCampaigns();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Campanha excluída' });
    }
  };

  const openEdit = (c: Campaign) => {
    setEditingCampaign(c);
    setFormName(c.name);
    setFormDesc(c.description || '');
    setFormChannel(c.channel);
    setFormSchedule(c.scheduled_at ? c.scheduled_at.slice(0, 16) : '');
    setFormTemplateId(c.template_id || '');
    setShowCreate(true);
  };

  const handleUpdate = async () => {
    if (!editingCampaign || !formName.trim()) return;

    if (!isDispatchableCampaignChannel(formChannel)) {
      toast({
        title: 'Canal indisponivel',
        description: 'Escolha um canal de envio válido.',
        variant: 'destructive',
      });
      return;
    }

    if (!ensureScheduledChannelReady(formChannel, formSchedule)) {
      return;
    }

    setCreating(true);
    const { error } = await supabase.from('campaigns').update({
      blocking_reason: null,
      last_blocked_at: null,
      name: formName.trim(),
      description: formDesc.trim(),
      channel: formChannel,
      template_id: formTemplateId || null,
      scheduled_at: formSchedule || null,
    } as any).eq('id', editingCampaign.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Campanha atualizada!' });
      setShowCreate(false);
      resetCampaignForm();
      fetchCampaigns();
    }
    setCreating(false);
  };

  const handleForceSend = async (c: Campaign) => {
    // Reset send_status of all campaign_presentations so they can be resent
    await supabase.from('campaign_presentations').update({ send_status: null } as any).eq('campaign_id', c.id);
    await supabase.from('campaigns').update({ status: 'draft', blocking_reason: null, last_blocked_at: null } as any).eq('id', c.id);
    await logCampaignOperationEvent({
      campaignId: c.id,
      channel: c.channel,
      eventType: 'manual_action',
      source: 'campaign_card',
      reasonCode: 'manual-resend',
      message: 'Campanha resetada manualmente para reenvio.',
    });
    await fetchCampaigns();
    handleSendCampaign({ ...c, status: 'draft', sent_count: 0 });
  };

  const openAddPresentations = async (campaignId: string) => {
    if (!user) return;

    // Get already-added presentation IDs
    const { data: existing } = await supabase
      .from('campaign_presentations')
      .select('presentation_id')
      .eq('campaign_id', campaignId);
    const existingIds = new Set((existing || []).map(e => e.presentation_id));

    // Get all ready presentations
    const { data: presentations } = await supabase
      .from('presentations')
      .select('id, public_id, business_name, business_phone, lead_response')
      .eq('user_id', user.id)
      .eq('status', 'ready');

    setAvailablePresentations(
      ((presentations as any) || []).filter((p: PresentationOption) => !existingIds.has(p.id))
    );
    setSelectedPresentationIds(new Set());
    setShowAddPresentations(campaignId);
  };

  const handleAddPresentations = async () => {
    if (!showAddPresentations || selectedPresentationIds.size === 0) return;

    const rows = Array.from(selectedPresentationIds).map(pid => ({
      campaign_id: showAddPresentations,
      presentation_id: pid,
    }));

    const { error } = await supabase.from('campaign_presentations').insert(rows);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `${rows.length} apresentação(ões) adicionada(s)` });
      setShowAddPresentations(null);
      fetchCampaigns();
    }
  };

  const handleSendCampaign = async (campaign: Campaign) => {
    if (!user) return;

    if (!canUse('emails')) {
      toast({
        title: 'Limite atingido',
        description: 'Você atingiu o limite de envios do seu plano. Faça upgrade em Configurações → Faturamento.',
        variant: 'destructive',
      });
      return;
    }

    if (campaign.channel === 'email') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('campaign_sender_email, email_sender_status, email_sender_error')
        .eq('user_id', user.id)
        .maybeSingle();

      const emailProfile = profile as EmailProfileStatus | null;
      if (emailProfile?.campaign_sender_email && emailProfile.email_sender_status !== 'ready') {
        const blockMessage =
          emailProfile.email_sender_error ||
          'Valide o dominio do remetente em Configuracoes > Integracoes > E-Mail antes de enviar campanhas.';

        toast({
          title: 'Remetente ainda nao validado',
          description: blockMessage,
          variant: 'destructive',
        });
        await logCampaignOperationEvent({
          campaignId: campaign.id,
          channel: campaign.channel,
          eventType: 'blocked',
          source: 'manual_preflight',
          reasonCode: 'email-sender-not-ready',
          message: blockMessage,
          metadata: {
            sender_email: emailProfile.campaign_sender_email,
            sender_status: emailProfile.email_sender_status,
          },
        });
        navigate('/settings?tab=integracoes');
        return;
      }
    }

    if (campaign.channel === 'webhook' && !channelConfig.webhookReady) {
      const blockMessage = 'Configure o webhook da campanha em Configuracoes > Integracoes antes de enviar esse canal.';
      toast({
        title: 'Webhook nao configurado',
        description: blockMessage,
        variant: 'destructive',
      });
      await logCampaignOperationEvent({
        campaignId: campaign.id,
        channel: campaign.channel,
        eventType: 'blocked',
        source: 'manual_preflight',
        reasonCode: 'missing-webhook-target',
        message: blockMessage,
      });
      navigate('/settings?tab=integracoes');
      return;
    }

    const { data: cpRows } = await supabase
      .from('campaign_presentations')
      .select('id, presentation_id, send_status, sent_at, delivery_status, followup_step, next_followup_at, provider_message_id, variant_id')
      .eq('campaign_id', campaign.id)
      .eq('send_status', 'pending');

    if (!cpRows || cpRows.length === 0) {
      toast({ title: 'Nada para enviar', description: 'Todas já foram enviadas ou nenhuma adicionada.', variant: 'destructive' });
      return;
    }

    const presIds = cpRows.map(r => r.presentation_id);
    const { data: presentations } = await supabase
      .from('presentations')
      .select('id, public_id, business_name, business_phone, business_website, business_address, business_category, business_rating, analysis_data, pipeline_stage_id')
      .in('id', presIds);

    if (!presentations) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, elevenlabs_voice_id, proposal_link_domain')
      .eq('user_id', user.id)
      .single();

    let template: TemplateRow | null = null;
    if ((campaign as any).template_id) {
      const { data: tpl } = await supabase
        .from('message_templates')
        .select('id, name, channel, body, subject, image_url, include_proposal_link, send_as_audio, experiment_group, variant_key, target_persona, campaign_objective, cta_trigger, is_active')
        .eq('id', (campaign as any).template_id)
        .single();
      template = tpl as TemplateRow;
    }

    let variants: TemplateRow[] = [];
    if (template?.experiment_group) {
      const { data: variantRows } = await supabase
        .from('message_templates')
        .select('id, name, channel, body, subject, image_url, include_proposal_link, send_as_audio, experiment_group, variant_key, target_persona, campaign_objective, cta_trigger, is_active')
        .eq('user_id', user.id)
        .eq('channel', campaign.channel)
        .eq('experiment_group', template.experiment_group)
        .eq('is_active', true)
        .order('variant_key');
      variants = (variantRows as TemplateRow[]) || [];
    }
    if (variants.length === 0 && template) variants = [template];

    setSendAsAudio((template?.send_as_audio || false) && campaign.channel === 'whatsapp');
    setVoiceId(profile?.elevenlabs_voice_id || null);

    const replaceVars = (text: string, pres: any, publicUrl: string) => {
      return text
        .replace(/\{\{nome_empresa\}\}/g, pres.business_name || '')
        .replace(/\{\{categoria\}\}/g, pres.business_category || '')
        .replace(/\{\{endereco\}\}/g, pres.business_address || '')
        .replace(/\{\{telefone\}\}/g, pres.business_phone || '')
        .replace(/\{\{website\}\}/g, pres.business_website || '')
        .replace(/\{\{rating\}\}/g, pres.business_rating?.toString() || '')
        .replace(/\{\{score\}\}/g, (pres.analysis_data as any)?.scores?.overall?.toString() || '')
        .replace(/\{\{link_proposta\}\}/g, publicUrl)
        .replace(/\{\{sua_empresa\}\}/g, profile?.company_name || 'Nossa Empresa');
    };

    // Use published URL if available, fallback to current origin
    const publishedOrigin = resolvePublicBaseOrigin((profile as any)?.proposal_link_domain);
    
    const cpIdByPresentation = new Map(cpRows.map((row) => [row.presentation_id, row.id]));

    const previews = presentations.map((pres: any) => {
      const cpId = cpIdByPresentation.get(pres.id) || '';
      const cpRow = (cpRows || []).find((row) => row.presentation_id === pres.id);
      const chosenVariant = pickVariantForLead(
        {
          id: pres.id,
          business_category: pres.business_category || null,
          analysis_data: pres.analysis_data,
        },
        variants,
        template
      );
      const tracking = new URLSearchParams({
        cid: campaign.id,
        cpid: cpId,
        ch: campaign.channel,
        src: campaign.channel === 'whatsapp'
          ? 'campaign_whatsapp'
          : campaign.channel === 'email'
            ? 'campaign_email'
            : 'campaign_webhook',
      });
      if ((campaign as any).template_id) tracking.set('tid', (campaign as any).template_id);
      if (chosenVariant?.id) tracking.set('vid', chosenVariant.id);
      const publicUrl = `${publishedOrigin}/presentation/${pres.public_id}?${tracking.toString()}`;
      let message: string;
      let subject: string | undefined;
      if (chosenVariant?.body || template?.body) {
        const body = chosenVariant?.body || template?.body || '';
        message = replaceVars(body, pres, publicUrl);
        const subjectTemplate = chosenVariant?.subject || template?.subject;
        subject = subjectTemplate ? replaceVars(subjectTemplate, pres, publicUrl) : undefined;
      } else {
        message = `Olá! Tudo bem?\n\nSou da ${profile?.company_name || 'nossa empresa'} e preparei uma análise personalizada para ${pres.business_name}.\n\nAcesse aqui: ${publicUrl}`;
      }

      let webhookPayloadPreview: string | undefined;
      if (campaign.channel === 'webhook') {
        const webhookPayload = buildCampaignWebhookPayload({
          eventId: `${campaign.id}:${cpId || pres.id}`,
          attemptId: `preview:${campaign.id}:${pres.id}`,
          dispatchedAt: new Date().toISOString(),
          source: 'campaign_preview',
          campaign: {
            id: campaign.id,
            name: campaign.name,
            channel: campaign.channel,
            status: campaign.status,
            description: campaign.description,
            scheduled_at: campaign.scheduled_at,
            sent_at: campaign.sent_at,
            template_id: (campaign as any).template_id || null,
          },
          campaignPresentation: {
            id: cpId,
            send_status: cpRow?.send_status || 'pending',
            sent_at: cpRow?.sent_at || null,
            delivery_status: cpRow?.delivery_status || 'pending',
            followup_step: cpRow?.followup_step || 0,
            next_followup_at: cpRow?.next_followup_at || null,
            provider_message_id: cpRow?.provider_message_id || null,
            variant_id: chosenVariant?.id || null,
          },
          presentation: pres,
          profile: {
            company_name: profile?.company_name || null,
            proposal_link_domain: profile?.proposal_link_domain || null,
          },
          publicUrl,
          messagePreview: message,
          subjectPreview: subject || null,
        });
        webhookPayloadPreview = JSON.stringify(webhookPayload, null, 2);
        message = webhookPayloadPreview;
      }

      return {
        id: pres.id,
        campaignPresentationId: cpId,
        business_name: pres.business_name || 'Sem nome',
        business_phone: pres.business_phone || '',
        business_category: pres.business_category || null,
        pipeline_stage_id: pres.pipeline_stage_id || null,
        analysis_data: pres.analysis_data,
        public_id: pres.public_id,
        publicUrl,
        message,
        subject,
        templateId: (campaign as any).template_id || null,
        variantId: chosenVariant?.id || null,
        webhookPayloadPreview,
      };
    });

    setPreviewLeads(previews);
    setPreviewCampaign(campaign);
    setShowPreview(true);
  };

  const confirmSendCampaign = async () => {
    if (!previewCampaign || !user) return;
    setSending(true);

    const campaign = previewCampaign;
    const dispatchTarget = getCampaignDispatchTarget(campaign.channel);
    let whatsappHandledByApi = false;

    if (!dispatchTarget) {
      await logCampaignOperationEvent({
        campaignId: campaign.id,
        channel: campaign.channel,
        eventType: 'blocked',
        source: 'manual_dispatch',
        reasonCode: 'unsupported-channel',
        message: 'A campanha nao pode ser enviada porque o canal nao e suportado.',
      });
      toast({
        title: 'Canal indisponivel',
        description: 'Escolha um canal de envio válido.',
        variant: 'destructive',
      });
      setSending(false);
      return;
    }

    if (dispatchTarget === 'email') {
      const { data, error } = await invokeEdgeFunction<{ sent?: number }>('send-campaign-emails', {
        body: { campaign_id: campaign.id },
      });
      if (error) {
        const emailErrorMessage = await getEdgeFunctionErrorMessage(error);
        toast({ title: 'Erro ao enviar emails', description: emailErrorMessage, variant: 'destructive' });
        setSending(false);
        return;
      }
      toast({ title: 'Emails enviados!', description: `${data?.sent || 0} email(s) enviado(s)` });
    } else if (dispatchTarget === 'whatsapp') {
      const { data: optimizeData, error: optimizeError } = await invokeEdgeFunction<{ groups_promoted?: number }>('whatsapp-optimize-variants', {
        body: { mode: 'auto' },
      });
      if (optimizeError) {
        console.warn('Falha ao executar otimização semanal de variantes:', optimizeError);
      } else if (optimizeData?.groups_promoted > 0) {
        toast({
          title: 'Otimização A/B aplicada',
          description: `${optimizeData.groups_promoted} grupo(s) de variante atualizados antes do envio.`,
        });
      }

      let handledByApi = false;
      if (previewLeads.length > HYBRID_API_THRESHOLD) {
        const { data: apiData, error: apiError } = await invokeEdgeFunction<any>('whatsapp-send-batch', {
          body: { campaign_id: campaign.id, threshold: HYBRID_API_THRESHOLD },
        });

        const apiErrorMessage = apiError ? await getEdgeFunctionErrorMessage(apiError) : '';
        const isMissingMetaCredentials =
          apiErrorMessage.includes('Access Token') && apiErrorMessage.includes('Phone Number ID');

        if (!apiError && apiData?.mode === 'api') {
          handledByApi = true;
          whatsappHandledByApi = true;
          const sent = apiData?.sent || 0;
          const failed = apiData?.failed || 0;
          if (failed === 0) {
            toast({ title: 'Envio concluído', description: `${sent} mensagem(ns) enviada(s) com sucesso.` });
          } else {
            toast({
              title: `Envio concluído com falhas`,
              description: `${sent} enviadas · ${failed} falharam. Veja os detalhes no card da campanha.`,
              variant: failed > sent ? 'destructive' : 'default',
            });
          }
        } else if (isMissingMetaCredentials) {
          toast({
            title: 'Integracao Meta incompleta',
            description: apiErrorMessage || 'Configure o Access Token e o Phone Number ID antes de enviar campanhas.',
            variant: 'destructive',
          });
          setSending(false);
          return;
        } else if (apiError) {
          console.error('whatsapp-send-batch error, fallback manual:', apiError);
        }
      }

      if (!handledByApi) {
      const { data: cpRows } = await supabase
        .from('campaign_presentations')
        .select('id, presentation_id')
        .eq('campaign_id', campaign.id)
        .eq('send_status', 'pending');

      for (const lead of previewLeads) {
        const phone = lead.business_phone.replace(/\D/g, '');
        if (!phone) continue;

        let finalMessage = lead.message;

        // Generate audio if send_as_audio is enabled
        if (sendAsAudio && voiceId) {
          try {
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ text: lead.message, voice_id: voiceId }),
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.audioContent) {
                // Decode base64 and upload to storage
                const binaryStr = atob(data.audioContent);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                  bytes[i] = binaryStr.charCodeAt(i);
                }
                const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
                const audioPath = `${user.id}/${campaign.id}/${lead.id}.mp3`;

                const { error: uploadError } = await supabase.storage
                  .from('audio-messages')
                  .upload(audioPath, audioBlob, { upsert: true, contentType: 'audio/mpeg' });

                if (!uploadError) {
                  const { data: { publicUrl } } = supabase.storage
                    .from('audio-messages')
                    .getPublicUrl(audioPath);
                  finalMessage += `\n\n🎙️ Ouça a mensagem em áudio: ${publicUrl}`;
                }
              }
            }
          } catch (audioErr) {
            console.error('Audio generation error for lead:', lead.id, audioErr);
          }
        }

        // Add country code 55 only if not already present
        const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
        const whatsappUrl = `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(finalMessage)}`;
        try {
          await navigator.clipboard.writeText(finalMessage);
        } catch (clipboardError) {
          console.warn('Falha ao copiar mensagem para clipboard:', clipboardError);
        }
        window.open(whatsappUrl, '_blank');

        const cpRow = (cpRows || []).find(r => r.presentation_id === lead.id);
        if (cpRow) {
          const sentAt = new Date().toISOString();
          await supabase
            .from('campaign_presentations')
            .update({
              send_status: 'sent',
              sent_at: sentAt,
              delivery_status: 'sent',
              last_status_at: sentAt,
              variant_id: lead.variantId || null,
              followup_step: 0,
              next_followup_at: plusDaysIso(1),
            } as any)
            .eq('id', cpRow.id);

          await supabase.from('campaign_message_attempts').insert({
            user_id: user.id,
            campaign_presentation_id: cpRow.id,
            campaign_id: campaign.id,
            presentation_id: lead.id,
            template_id: lead.templateId || null,
            variant_id: lead.variantId || null,
            channel: 'whatsapp',
            send_mode: 'manual',
            provider: 'manual',
            status: 'sent',
            sent_at: sentAt,
            next_followup_at: plusDaysIso(1),
            metadata: {
              manual_window_open: true,
              public_url: lead.publicUrl,
            },
          } as any);

          await supabase.from('message_conversion_events').insert({
            event_type: 'sent',
            presentation_id: lead.id,
            user_id: user.id,
            campaign_id: campaign.id,
            campaign_presentation_id: cpRow.id,
            template_id: lead.templateId || null,
            variant_id: lead.variantId || null,
            channel: 'whatsapp',
            pipeline_stage_id: lead.pipeline_stage_id || null,
            niche: lead.business_category || null,
            score_bucket: scoreBucket(lead.analysis_data),
            source: 'manual_whatsapp',
            metadata: {
              public_url: lead.publicUrl,
            },
          } as any);
        }
      }
    }
    } else if (dispatchTarget === 'webhook') {
      const { data, error } = await invokeEdgeFunction<{ sent?: number }>('send-campaign-webhooks', {
        body: { campaign_id: campaign.id },
      });

      if (error) {
        const errorMessage = await getEdgeFunctionErrorMessage(error);
        toast({
          title: 'Erro ao enviar webhook',
          description: errorMessage || 'Configure a URL do webhook do n8n em Integrações.',
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      toast({ title: 'Webhook enviado!', description: `${data?.sent || 0} lead(s) enviado(s) para o n8n.` });
    }

    await supabase
      .from('campaigns')
      .update({ status: 'sent', sent_at: new Date().toISOString(), blocking_reason: null, last_blocked_at: null })
      .eq('id', campaign.id);

    if (dispatchTarget === 'whatsapp' && !whatsappHandledByApi) {
      await logCampaignOperationEvent({
        campaignId: campaign.id,
        channel: campaign.channel,
        eventType: 'dispatch_completed',
        source: 'manual_dispatch',
        message: `${previewLeads.length} lead(s) processado(s) no envio manual.`,
        metadata: {
          total_preview_leads: previewLeads.length,
          dispatch_target: dispatchTarget,
          send_as_audio: sendAsAudio,
        },
      });
    }

    toast({
      title: 'Campanha enviada!',
      description: campaign.channel === 'webhook'
        ? `${previewLeads.length} lead(s) processado(s)`
        : `${previewLeads.length} mensagen(s) enviada(s)`,
    });
    setShowPreview(false);
    setPreviewCampaign(null);
    setSending(false);
    fetchCampaigns();
  };

  const handleRunFollowup = async (campaignId: string) => {
    const { data, error } = await invokeEdgeFunction<any>('whatsapp-send-batch', {
      body: { campaign_id: campaignId, send_followups: true },
    });
    if (error) {
      const message = await getEdgeFunctionErrorMessage(error);
      toast({ title: 'Erro no follow-up', description: message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Follow-up executado', description: `${data?.sent || 0} mensagem(ns) enviada(s).` });
    fetchCampaigns();
  };

  const openFailures = async (campaignId: string) => {
    // Load failed campaign_presentations joined with presentation name/phone and last attempt error
    const { data: cpFailed } = await supabase
      .from('campaign_presentations')
      .select('presentation_id')
      .eq('campaign_id', campaignId)
      .eq('send_status', 'failed');

    if (!cpFailed || cpFailed.length === 0) { setFailureRows([]); setFailuresCampaignId(campaignId); return; }

    const presIds = cpFailed.map((r: any) => r.presentation_id);
    const { data: presRows } = await supabase
      .from('presentations')
      .select('id, business_name, business_phone')
      .in('id', presIds);

    const { data: attemptRows } = await supabase
      .from('campaign_message_attempts')
      .select('presentation_id, error_reason, created_at')
      .eq('campaign_id', campaignId)
      .eq('status', 'failed')
      .in('presentation_id', presIds)
      .order('created_at', { ascending: false });

    const lastErrorByPres = new Map<string, string>();
    for (const a of (attemptRows || []) as any[]) {
      if (!lastErrorByPres.has(a.presentation_id)) {
        lastErrorByPres.set(a.presentation_id, a.error_reason || 'Erro desconhecido');
      }
    }

    const rows = ((presRows || []) as any[]).map(p => ({
      business_name: p.business_name || 'Sem nome',
      business_phone: p.business_phone || '—',
      error_reason: lastErrorByPres.get(p.id) || 'Erro desconhecido',
    }));

    setFailureRows(rows);
    setFailuresCampaignId(campaignId);
  };

  const openOperationHistory = async (campaignId: string) => {
    const { data } = await supabase
      .from('campaign_operation_events')
      .select('id, created_at, event_type, source, reason_code, message, metadata')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(20);

    setOperationRows((data as CampaignOperationEventRow[]) || []);
    setHistoryCampaignId(campaignId);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge className="rounded-full border border-[#e7e7ec] bg-[#f7f7fa] text-[#5f5f68]">Rascunho</Badge>;
      case 'scheduled': return <Badge className="rounded-full border border-[#d9e4ff] bg-[#f4f7ff] text-[#365fc2]">Agendada</Badge>;
      case 'sending': return <Badge className="rounded-full border border-[#efe3cc] bg-[#fff9ef] text-[#9a7a2b]">Enviando</Badge>;
      case 'sent': return <Badge className="rounded-full border border-[#f2d4d8] bg-[#fff3f5] text-[#9b2a3d]">Enviada</Badge>;
      case 'cancelled': return <Badge className="rounded-full border border-[#f5c8ce] bg-[#fff0f2] text-[#c23a4f]">Cancelada</Badge>;
      default: return <Badge className="rounded-full border border-[#e7e7ec] bg-[#f7f7fa] text-[#5f5f68]">{status}</Badge>;
    }
  };

  const channelLabel = (ch: string) => {
    switch (ch) {
      case 'whatsapp': return '📱 WhatsApp';
      case 'email': return '📧 Email';
      case 'webhook': return '🔗 Webhook / n8n';
      default: return ch;
    }
  };

  const formReadiness = describeChannelReadiness({
    channel: formChannel,
    scheduledAt: formSchedule,
    emailConfig: emailSenderConfig,
    channelConfig,
  });

  const overview = useMemo(() => {
    const totalCampaigns = campaigns.length;
    const active = campaigns.filter(c => c.status === 'draft' || c.status === 'scheduled' || c.status === 'sending').length;
    const sent = campaigns.filter(c => c.status === 'sent').length;
    const totalLeads = campaigns.reduce((acc, c) => acc + (c.total || 0), 0);
    const totalAccepted = campaigns.reduce((acc, c) => acc + (c.accepted || 0), 0);
    const conversion = totalLeads > 0 ? Math.round((totalAccepted / totalLeads) * 100) : 0;
    return { totalCampaigns, active, sent, totalLeads, conversion };
  }, [campaigns]);

  const currentFilterSnapshot = useMemo<CampaignFilterSnapshot>(
    () => ({
      view: campaignViewFilter,
      channel: channelFilter,
      status: statusFilter,
      search: searchTerm.trim(),
      sort: sortOption,
    }),
    [campaignViewFilter, channelFilter, statusFilter, searchTerm, sortOption],
  );

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) =>
      campaignMatchesFilterSnapshot(campaign, currentFilterSnapshot, emailSenderConfig, channelConfig),
    );
  }, [campaigns, currentFilterSnapshot, emailSenderConfig, channelConfig]);

  const defaultSavedViews = useMemo(() => getDefaultCampaignSavedViews() as CampaignSavedView[], []);

  const defaultSavedViewCounts = useMemo(
    () =>
      Object.fromEntries(
        defaultSavedViews.map((savedView) => [
          savedView.id,
          campaigns.filter((campaign) =>
            campaignMatchesFilterSnapshot(campaign, savedView.filters, emailSenderConfig, channelConfig),
          ).length,
        ]),
      ) as Record<string, number>,
    [defaultSavedViews, campaigns, emailSenderConfig, channelConfig],
  );

  const userSavedViewCounts = useMemo(
    () =>
      Object.fromEntries(
        savedViews.map((savedView) => [
          savedView.id,
          campaigns.filter((campaign) =>
            campaignMatchesFilterSnapshot(campaign, savedView.filters, emailSenderConfig, channelConfig),
          ).length,
        ]),
      ) as Record<string, number>,
    [savedViews, campaigns, emailSenderConfig, channelConfig],
  );

  const sortedFilteredCampaigns = useMemo(() => {
    return [...filteredCampaigns].sort((left, right) => {
      if (sortOption === 'recent') {
        return getCampaignRecency(right) - getCampaignRecency(left);
      }

      if (sortOption === 'oldest') {
        return getCampaignRecency(left) - getCampaignRecency(right);
      }

      if (sortOption === 'leads') {
        const leadDiff = (right.total || 0) - (left.total || 0);
        if (leadDiff !== 0) return leadDiff;
        return getCampaignRecency(right) - getCampaignRecency(left);
      }

      if (sortOption === 'conversion') {
        const conversionDiff = getCampaignConversionRate(right) - getCampaignConversionRate(left);
        if (conversionDiff !== 0) return conversionDiff;
        return getCampaignRecency(right) - getCampaignRecency(left);
      }

      const priorityDiff =
        getCampaignPriority(right, emailSenderConfig, channelConfig) -
        getCampaignPriority(left, emailSenderConfig, channelConfig);
      if (priorityDiff !== 0) return priorityDiff;
      return getCampaignRecency(right) - getCampaignRecency(left);
    });
  }, [filteredCampaigns, emailSenderConfig, channelConfig, sortOption]);

  const urgentCampaigns = useMemo(() => {
    return [...campaigns]
      .filter((campaign) => campaignNeedsAttention(campaign, emailSenderConfig, channelConfig))
      .sort((left, right) => {
        const priorityDiff =
          getCampaignPriority(right, emailSenderConfig, channelConfig) -
          getCampaignPriority(left, emailSenderConfig, channelConfig);
        if (priorityDiff !== 0) return priorityDiff;
        return getCampaignRecency(right) - getCampaignRecency(left);
      })
      .slice(0, 3);
  }, [campaigns, emailSenderConfig, channelConfig]);

  const filterCounts = useMemo(() => {
    const attention = campaigns.filter((campaign) => campaignNeedsAttention(campaign, emailSenderConfig, channelConfig)).length;
    const completed = campaigns.filter((campaign) => getOperationEventTone(campaign.latest_operation_event) === 'success').length;
    return {
      all: campaigns.length,
      attention,
      completed,
    };
  }, [campaigns, emailSenderConfig, channelConfig]);

  const hasCustomFilters =
    campaignViewFilter !== 'all' ||
    channelFilter !== 'all' ||
    statusFilter !== 'all' ||
    searchTerm.trim().length > 0 ||
    sortOption !== 'priority';

  const activeSavedViewId = useMemo(
    () => savedViews.find((savedView) => isCampaignSavedViewActive(savedView, currentFilterSnapshot))?.id || null,
    [savedViews, currentFilterSnapshot],
  );

  const activeDefaultViewId = useMemo(
    () => defaultSavedViews.find((savedView) => isCampaignSavedViewActive(savedView, currentFilterSnapshot))?.id || null,
    [defaultSavedViews, currentFilterSnapshot],
  );

  const openSaveCurrentViewDialog = () => {
    setEditingSavedViewId(null);
    setSavedViewName(buildSuggestedCampaignViewName(currentFilterSnapshot));
    setShowSaveViewDialog(true);
  };

  const openRenameSavedViewDialog = (savedView: CampaignSavedView) => {
    setEditingSavedViewId(savedView.id);
    setSavedViewName(savedView.name);
    setShowSaveViewDialog(true);
  };

  const applySavedView = (savedView: CampaignSavedView) => {
    setCampaignViewFilter(savedView.filters.view);
    setChannelFilter(savedView.filters.channel);
    setStatusFilter(savedView.filters.status);
    setSearchTerm(savedView.filters.search);
    setSortOption(savedView.filters.sort);
  };

  const handleSaveCurrentView = () => {
    const normalizedName = normalizeCampaignSavedViewName(savedViewName);
    if (!normalizedName) {
      toast({
        title: 'Nome obrigatorio',
        description: 'Defina um nome curto para reutilizar esta visao depois.',
        variant: 'destructive',
      });
      return;
    }

    const editingSavedView = editingSavedViewId
      ? savedViews.find((savedView) => savedView.id === editingSavedViewId) || null
      : null;

    setSavedViews((current) =>
      upsertCampaignSavedView(
        current,
        buildCampaignSavedView({
          id: editingSavedViewId || undefined,
          name: normalizedName,
          filters: editingSavedView?.filters || currentFilterSnapshot,
        }) as CampaignSavedView,
      ) as CampaignSavedView[],
    );
    setShowSaveViewDialog(false);
    setEditingSavedViewId(null);
    setSavedViewName('');
    toast({
      title: editingSavedViewId ? 'Visao renomeada' : 'Visao salva',
      description: editingSavedViewId
        ? `${normalizedName} foi atualizada sem alterar a ordem da sua barra.`
        : `${normalizedName} ficou disponivel na barra de filtros.`,
    });
  };

  const removeSavedView = (savedViewId: string) => {
    setSavedViews((current) => current.filter((savedView) => savedView.id !== savedViewId));
  };

  const reorderSavedView = (savedViewId: string, direction: 'left' | 'right') => {
    setSavedViews((current) => moveCampaignSavedView(current, savedViewId, direction) as CampaignSavedView[]);
  };

  const operationalSummary = useMemo(() => {
    const blocked = campaigns.filter((campaign) => campaignIsBlocked(campaign)).length;
    const recentFailures = campaigns.filter((campaign) => campaignHasFailure(campaign)).length;
    const awaitingConfiguration = campaigns.filter((campaign) => campaignNeedsConfiguration(campaign, emailSenderConfig, channelConfig)).length;

    return {
      needsAttention: filterCounts.attention,
      blocked,
      recentFailures,
      awaitingConfiguration,
    };
  }, [campaigns, emailSenderConfig, channelConfig, filterCounts.attention]);

  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
      <div className="rounded-[28px] border border-[#ececf0] bg-white px-5 py-6 shadow-[0_14px_36px_rgba(20,20,24,0.06)] lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#75757d]">Orquestração Comercial</p>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight text-[#1A1A1A] lg:text-4xl">
              <Megaphone className="h-7 w-7 text-[#EF3333]" />
              Campanhas
            </h1>
            <p className="mt-2 text-sm text-[#66666d] lg:text-base">Crie, dispare e acompanhe campanhas de WhatsApp e Email com visual premium.</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="h-10 rounded-xl gap-2 gradient-primary text-primary-foreground glow-primary">
            <Plus className="h-4 w-4" />
            Nova Campanha
          </Button>
        </div>
      </div>

      <CampaignSummaryCards
        overview={overview}
        operationalSummary={operationalSummary}
        onShowAttention={() => setCampaignViewFilter('attention')}
        onOpenSettings={() => navigate('/settings?tab=integracoes')}
      />

      <CampaignViewsCard
        hasCustomFilters={hasCustomFilters}
        defaultSavedViews={defaultSavedViews}
        activeDefaultViewId={activeDefaultViewId}
        defaultSavedViewCounts={defaultSavedViewCounts}
        savedViews={savedViews}
        activeSavedViewId={activeSavedViewId}
        userSavedViewCounts={userSavedViewCounts}
        onOpenSaveCurrentViewDialog={openSaveCurrentViewDialog}
        onClearSavedViews={() => setSavedViews([])}
        onApplySavedView={applySavedView}
        onRemoveSavedView={removeSavedView}
        onReorderSavedView={reorderSavedView}
        onRenameSavedView={openRenameSavedViewDialog}
      />

      <CampaignFiltersToolbar
        campaignViewFilter={campaignViewFilter}
        channelFilter={channelFilter}
        statusFilter={statusFilter}
        sortOption={sortOption}
        searchTerm={searchTerm}
        hasCustomFilters={hasCustomFilters}
        filterCounts={filterCounts}
        viewLabel={campaignViewFilterLabel(campaignViewFilter)}
        channelLabel={campaignChannelFilterLabel(channelFilter)}
        statusLabel={campaignStatusFilterLabel(statusFilter)}
        sortLabel={campaignSortOptionLabel(sortOption)}
        onSetCampaignViewFilter={setCampaignViewFilter}
        onSetChannelFilter={setChannelFilter}
        onSetStatusFilter={setStatusFilter}
        onSetSortOption={setSortOption}
        onSetSearchTerm={setSearchTerm}
        onResetFilters={() => {
          setCampaignViewFilter('all');
          setChannelFilter('all');
          setStatusFilter('all');
          setSearchTerm('');
          setSortOption('priority');
        }}
      />

      <CampaignUrgentPanel
        campaigns={urgentCampaigns}
        attentionCount={filterCounts.attention}
        emailSenderConfig={emailSenderConfig}
        channelConfig={channelConfig}
        channelLabel={channelLabel}
        operationEventBadgeClass={operationEventBadgeClass}
        getOperationEventTone={getOperationEventTone}
        formatOperationEventType={formatOperationEventType}
        summarizeOperationEvent={summarizeOperationEvent}
        formatBlockingReason={formatBlockingReason}
        onOpenSettings={() => navigate('/settings?tab=integracoes')}
        onOpenHistory={openOperationHistory}
        onEdit={(campaign) => openEdit(campaign as Campaign)}
      />

      <CampaignSavedViewDialog
        open={showSaveViewDialog}
        editing={!!editingSavedViewId}
        savedViewName={savedViewName}
        onSavedViewNameChange={setSavedViewName}
        onOpenChange={(open) => {
          setShowSaveViewDialog(open);
          if (!open) {
            setSavedViewName('');
            setEditingSavedViewId(null);
          }
        }}
        onSave={handleSaveCurrentView}
      />

      <CampaignFormDialog
        open={showCreate}
        editing={!!editingCampaign}
        formName={formName}
        formDesc={formDesc}
        formChannel={formChannel}
        formSchedule={formSchedule}
        formTemplateId={formTemplateId}
        templates={templates}
        formReadiness={formReadiness}
        creating={creating}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) {
            resetCampaignForm();
          }
        }}
        onFormNameChange={setFormName}
        onFormDescChange={setFormDesc}
        onFormChannelChange={(value) => {
          setFormChannel(value);
          setFormTemplateId('');
        }}
        onFormTemplateIdChange={setFormTemplateId}
        onFormScheduleChange={setFormSchedule}
        onConfigureChannel={() => navigate('/settings?tab=integracoes')}
        onSubmit={editingCampaign ? handleUpdate : handleCreate}
      />

      <CampaignAddPresentationsDialog
        open={!!showAddPresentations}
        availablePresentations={availablePresentations}
        selectedPresentationIds={selectedPresentationIds}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddPresentations(null);
          }
        }}
        onTogglePresentation={(presentationId, checked) => {
          const next = new Set(selectedPresentationIds);
          if (checked) {
            next.add(presentationId);
          } else {
            next.delete(presentationId);
          }
          setSelectedPresentationIds(next);
        }}
        onOpenCrm={(presentationId) => navigate(buildCRMHref({ mode: 'queue', leadId: presentationId }))}
        onAdd={handleAddPresentations}
      />

      <CampaignFailuresDialog
        open={!!failuresCampaignId}
        rows={failureRows}
        onOpenChange={(open) => {
          if (!open) {
            setFailuresCampaignId(null);
          }
        }}
        formatFailureReason={formatFailureReason}
      />

      <CampaignOperationHistoryDialog
        open={!!historyCampaignId}
        rows={operationRows}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryCampaignId(null);
          }
        }}
        formatOperationEventType={formatOperationEventType}
        formatOperationReason={formatOperationReason}
      />

      {/* Preview Dialog */}
      <CampaignPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        leads={previewLeads}
        channel={previewCampaign?.channel || 'whatsapp'}
        campaignName={previewCampaign?.name || ''}
        onConfirmSend={confirmSendCampaign}
        sending={sending}
        sendAsAudio={sendAsAudio}
      />

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card className="rounded-[24px] border border-[#ececf0] bg-white p-12 text-center shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <div className="w-16 h-16 rounded-full bg-[#fff1f3] mx-auto flex items-center justify-center mb-4">
            <Megaphone className="w-8 h-8 text-[#EF3333]" />
          </div>
          <h3 className="text-lg font-medium text-[#1A1A1A]">Nenhuma campanha ainda</h3>
          <p className="text-sm text-muted-foreground mt-1">Crie uma campanha para enviar apresentações em massa.</p>
        </Card>
      ) : filteredCampaigns.length === 0 ? (
        <Card className="rounded-[24px] border border-[#ececf0] bg-white p-12 text-center shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <div className="w-16 h-16 rounded-full bg-[#f7f7fa] mx-auto flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-[#7b7b83]" />
          </div>
          <h3 className="text-lg font-medium text-[#1A1A1A]">Nenhuma campanha nesse filtro</h3>
          <p className="text-sm text-muted-foreground mt-1">Ajuste o filtro para visualizar outras campanhas.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedFilteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              emailSenderConfig={emailSenderConfig}
              channelConfig={channelConfig}
              statusBadge={statusBadge}
              channelLabel={channelLabel}
              emailSenderStatusLabel={emailSenderStatusLabel}
              emailSenderStatusClass={emailSenderStatusClass}
              channelReadinessBadgeClass={channelReadinessBadgeClass}
              operationEventBadgeClass={operationEventBadgeClass}
              getOperationEventTone={getOperationEventTone}
              formatOperationEventType={formatOperationEventType}
              formatBlockingReason={formatBlockingReason}
              summarizeOperationEvent={summarizeOperationEvent}
              onOpenSettings={() => navigate('/settings?tab=integracoes')}
              onOpenAddPresentations={openAddPresentations}
              onOpenEdit={(campaign) => openEdit(campaign as Campaign)}
              onSend={(campaign) => handleSendCampaign(campaign as Campaign)}
              onForceSend={(campaign) => handleForceSend(campaign as Campaign)}
              onRunFollowup={handleRunFollowup}
              onOpenFailures={openFailures}
              onOpenHistory={openOperationHistory}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Campaigns;

