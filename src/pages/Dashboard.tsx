import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  CircleCheck,
  Clock3,
  Eye,
  Flame,
  MessageCircleReply,
  Send,
  TrendingUp,
  Workflow,
  Bot,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { buildCRMHref } from '@/lib/crm/deriveLeadState';
import { cn } from '@/lib/utils';

interface AnalysisScores {
  overall?: number;
}

interface DashboardPresentationRow {
  id: string;
  status: string | null;
  business_name: string | null;
  analysis_data: { scores?: AnalysisScores } | null;
  created_at: string | null;
  lead_response: string | null;
}

interface CampaignPresentationRow {
  id: string;
  campaign_id: string;
  presentation_id: string;
  send_status: string | null;
  sent_at: string | null;
  delivery_status?: string | null;
  next_followup_at?: string | null;
}

interface ConversionEventRow {
  id: string;
  presentation_id: string;
  campaign_id: string | null;
  campaign_presentation_id: string | null;
  channel: string;
  event_type: string;
  created_at: string;
}

interface CampaignRow {
  id: string;
  channel: string | null;
  status: string | null;
  scheduled_at: string | null;
}

interface PresentationViewRow {
  presentation_id: string;
  viewed_at: string;
}

interface LeadQueueRow {
  id: string;
  businessName: string;
  label: string;
  detail: string;
  priority: number;
  overallScore: number | null;
}

interface AnalyticsSnapshot {
  readyCount: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  noResponseCount: number;
  openedNoResponseCount: number;
  readyNotSentCount: number;
  dueFollowupCount: number;
  scheduledCampaignCount: number;
  acceptanceRateOnOpened: number;
  acceptanceRateOnSent: number;
  rejectionRateOnOpened: number;
  openRateOnSent: number;
  deliveryRateOnSent: number;
  funnelData: Array<{ stage: string; value: number; fill: string }>;
  weeklyResponses: Array<{ week: string; accepted: number; rejected: number }>;
  channelPerformance: Array<{
    key: string;
    channel: string;
    sent: number;
    delivered: number;
    opened: number;
    accepted: number;
    rejected: number;
    deliveryRate: number;
    openRate: number;
    acceptanceRate: number;
  }>;
  hotLeads: LeadQueueRow[];
  pendingLeads: LeadQueueRow[];
}

const chartConfig = {
  funnel: { label: 'Propostas', color: '#EF3333' },
  sent: { label: 'Enviadas', color: '#1A1A1A' },
  opened: { label: 'Abertas', color: '#356DFF' },
  accepted: { label: 'Aceitas', color: '#1F8F47' },
  rejected: { label: 'Recusadas', color: '#B23246' },
} as const;

const emptyAnalytics: AnalyticsSnapshot = {
  readyCount: 0,
  sentCount: 0,
  deliveredCount: 0,
  openedCount: 0,
  acceptedCount: 0,
  rejectedCount: 0,
  noResponseCount: 0,
  openedNoResponseCount: 0,
  readyNotSentCount: 0,
  dueFollowupCount: 0,
  scheduledCampaignCount: 0,
  acceptanceRateOnOpened: 0,
  acceptanceRateOnSent: 0,
  rejectionRateOnOpened: 0,
  openRateOnSent: 0,
  deliveryRateOnSent: 0,
  funnelData: [],
  weeklyResponses: [],
  channelPerformance: [],
  hotLeads: [],
  pendingLeads: [],
};

const formatCount = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

const safeRate = (numerator: number, denominator: number) =>
  denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

const getOverallScore = (analysisData: { scores?: AnalysisScores } | null) => {
  const score = analysisData?.scores?.overall;
  return typeof score === 'number' ? score : null;
};

const toWeekKey = (value: string) => {
  const date = new Date(value);
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utcDate.setUTCDate(utcDate.getUTCDate() + diff);
  return utcDate.toISOString().slice(0, 10);
};

const formatWeekLabel = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

const resolveChannelLabel = (value: string) => {
  switch (value) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'email':
      return 'Email';
    case 'webhook':
      return 'Webhook';
    default:
      return 'Canal direto';
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [presentations, setPresentations] = useState<DashboardPresentationRow[]>([]);
  const [campaignPresentations, setCampaignPresentations] = useState<CampaignPresentationRow[]>([]);
  const [conversionEvents, setConversionEvents] = useState<ConversionEventRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [presentationViews, setPresentationViews] = useState<PresentationViewRow[]>([]);
  const [robotResults, setRobotResults] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        const [presentationsRes, campaignsRes, profileRes] = await Promise.all([
          supabase
            .from('presentations')
            .select('id, status, business_name, analysis_data, created_at, lead_response')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('campaigns')
            .select('id, channel, status, scheduled_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase.from('profiles').select('company_name').eq('user_id', user.id).maybeSingle(),
        ]);

        const presentationRows = ((presentationsRes.data as DashboardPresentationRow[] | null) || []);
        const campaignRows = ((campaignsRes.data as CampaignRow[] | null) || []);

        setPresentations(presentationRows);
        setCampaigns(campaignRows);
        setCompanyName((profileRes.data as { company_name?: string | null } | null)?.company_name || null);

        if (presentationRows.length === 0) {
          setCampaignPresentations([]);
          setConversionEvents([]);
          setPresentationViews([]);
          return;
        }

        const presentationIds = presentationRows.map((item) => item.id);

        const [campaignPresentationsRes, conversionEventsRes, presentationViewsRes] = await Promise.all([
          supabase
            .from('campaign_presentations')
            .select('id, campaign_id, presentation_id, send_status, sent_at, delivery_status, next_followup_at')
            .in('presentation_id', presentationIds),
          supabase
            .from('message_conversion_events')
            .select('id, presentation_id, campaign_id, campaign_presentation_id, channel, event_type, created_at')
            .in('presentation_id', presentationIds)
            .in('event_type', ['sent', 'delivered', 'opened', 'clicked_accept', 'clicked_reject', 'accepted', 'rejected'])
            .order('created_at', { ascending: false }),
          supabase.from('presentation_views').select('presentation_id, viewed_at').in('presentation_id', presentationIds),
        ]);

        setCampaignPresentations(((campaignPresentationsRes.data as CampaignPresentationRow[] | null) || []));
        setConversionEvents(((conversionEventsRes.data as ConversionEventRow[] | null) || []));
        setPresentationViews(((presentationViewsRes.data as PresentationViewRow[] | null) || []));
        const { data: robotTasks } = await (supabase as any)
          .from('robot_tasks')
          .select('*')
          .eq('status', 'completed')
          .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('completed_at', { ascending: false });

        setRobotResults(robotTasks || []);
      } catch (error) {
        console.error('Dashboard load error:', error);
        setPresentations([]);
        setCampaignPresentations([]);
        setConversionEvents([]);
        setCampaigns([]);
        setPresentationViews([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [user]);

  const analytics = useMemo<AnalyticsSnapshot>(() => {
    if (!user) return emptyAnalytics;

    const campaignsById = new Map(campaigns.map((item) => [item.id, item]));
    const presentationViewsCount = new Map<string, number>();
    const latestSignalByPresentation = new Map<string, string>();
    const channelBuckets = new Map<
      string,
      {
        sent: Set<string>;
        delivered: Set<string>;
        opened: Set<string>;
        accepted: Set<string>;
        rejected: Set<string>;
      }
    >();
    const campaignRowsByPresentation = new Map<string, CampaignPresentationRow[]>();

    const sentIds = new Set<string>();
    const deliveredIds = new Set<string>();
    const openedIds = new Set<string>();
    const acceptedIds = new Set<string>();
    const rejectedIds = new Set<string>();
    const clickedAcceptIds = new Set<string>();

    const ensureChannelBucket = (key: string) => {
      if (!channelBuckets.has(key)) {
        channelBuckets.set(key, {
          sent: new Set<string>(),
          delivered: new Set<string>(),
          opened: new Set<string>(),
          accepted: new Set<string>(),
          rejected: new Set<string>(),
        });
      }

      return channelBuckets.get(key)!;
    };

    const registerLatestSignal = (presentationId: string, createdAt: string | null | undefined) => {
      if (!createdAt) return;
      const current = latestSignalByPresentation.get(presentationId);
      if (!current || new Date(createdAt).getTime() > new Date(current).getTime()) {
        latestSignalByPresentation.set(presentationId, createdAt);
      }
    };

    for (const row of campaignPresentations) {
      if (!campaignRowsByPresentation.has(row.presentation_id)) {
        campaignRowsByPresentation.set(row.presentation_id, []);
      }
      campaignRowsByPresentation.get(row.presentation_id)?.push(row);

      const channel = campaignsById.get(row.campaign_id)?.channel || 'unknown';
      const bucket = ensureChannelBucket(channel);
      const sentLike =
        row.send_status === 'sent' ||
        Boolean(row.sent_at) ||
        ['sent', 'delivered', 'read'].includes(row.delivery_status || '');

      if (sentLike) {
        sentIds.add(row.presentation_id);
        bucket.sent.add(row.presentation_id);
      }

      if (['delivered', 'read'].includes(row.delivery_status || '')) {
        deliveredIds.add(row.presentation_id);
        bucket.delivered.add(row.presentation_id);
      }

      registerLatestSignal(row.presentation_id, row.sent_at);
    }

    for (const row of conversionEvents) {
      const fallbackChannel = row.campaign_id ? campaignsById.get(row.campaign_id)?.channel : null;
      const channel = row.channel && row.channel !== 'unknown' ? row.channel : fallbackChannel || 'unknown';
      const bucket = ensureChannelBucket(channel);

      if (row.event_type === 'sent') {
        sentIds.add(row.presentation_id);
        bucket.sent.add(row.presentation_id);
      }

      if (row.event_type === 'delivered') {
        deliveredIds.add(row.presentation_id);
        bucket.delivered.add(row.presentation_id);
      }

      if (row.event_type === 'opened') {
        openedIds.add(row.presentation_id);
        bucket.opened.add(row.presentation_id);
      }

      if (row.event_type === 'clicked_accept') {
        clickedAcceptIds.add(row.presentation_id);
      }

      if (row.event_type === 'accepted') {
        acceptedIds.add(row.presentation_id);
        bucket.accepted.add(row.presentation_id);
      }

      if (row.event_type === 'rejected') {
        rejectedIds.add(row.presentation_id);
        bucket.rejected.add(row.presentation_id);
      }

      registerLatestSignal(row.presentation_id, row.created_at);
    }

    for (const row of presentationViews) {
      openedIds.add(row.presentation_id);
      presentationViewsCount.set(row.presentation_id, (presentationViewsCount.get(row.presentation_id) || 0) + 1);
      registerLatestSignal(row.presentation_id, row.viewed_at);
    }

    for (const row of presentations) {
      if (row.lead_response === 'accepted') {
        acceptedIds.add(row.id);
      }

      if (row.lead_response === 'rejected') {
        rejectedIds.add(row.id);
      }
    }

    const readyCount = presentations.filter((item) => item.status === 'ready').length;
    const sentCount = sentIds.size;
    const deliveredCount = deliveredIds.size;
    const openedCount = openedIds.size;
    const acceptedCount = acceptedIds.size;
    const rejectedCount = rejectedIds.size;
    const noResponseIds = Array.from(sentIds).filter((id) => !acceptedIds.has(id) && !rejectedIds.has(id));
    const openedNoResponseIds = Array.from(openedIds).filter((id) => !acceptedIds.has(id) && !rejectedIds.has(id));
    const readyNotSentCount = presentations.filter((item) => item.status === 'ready' && !sentIds.has(item.id)).length;

    const dueFollowupIds = new Set<string>();
    const now = Date.now();
    for (const rows of campaignRowsByPresentation.values()) {
      const hasDueFollowup = rows.some((row) => {
        if (!row.next_followup_at) return false;
        return new Date(row.next_followup_at).getTime() <= now;
      });

      if (hasDueFollowup && rows[0]) {
        dueFollowupIds.add(rows[0].presentation_id);
      }
    }

    const weeklyMap = new Map<string, { accepted: number; rejected: number }>();
    for (const row of conversionEvents) {
      if (row.event_type !== 'accepted' && row.event_type !== 'rejected') continue;
      const weekKey = toWeekKey(row.created_at);
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, { accepted: 0, rejected: 0 });
      }

      const bucket = weeklyMap.get(weekKey)!;
      if (row.event_type === 'accepted') bucket.accepted += 1;
      if (row.event_type === 'rejected') bucket.rejected += 1;
    }

    const weeklyResponses = Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, values]) => ({
        week: formatWeekLabel(week),
        accepted: values.accepted,
        rejected: values.rejected,
      }));

    const channelPerformance = Array.from(channelBuckets.entries())
      .map(([key, values]) => ({
        key,
        channel: resolveChannelLabel(key),
        sent: values.sent.size,
        delivered: values.delivered.size,
        opened: values.opened.size,
        accepted: values.accepted.size,
        rejected: values.rejected.size,
        deliveryRate: safeRate(values.delivered.size, values.sent.size),
        openRate: safeRate(values.opened.size, values.sent.size),
        acceptanceRate: safeRate(values.accepted.size, values.opened.size),
      }))
      .filter((item) => item.sent > 0 || item.opened > 0 || item.accepted > 0 || item.rejected > 0)
      .sort((a, b) => b.sent - a.sent || b.opened - a.opened)
      .slice(0, 4);

    const hotLeads = presentations
      .map((item) => {
        if (acceptedIds.has(item.id) || rejectedIds.has(item.id)) return null;

        const overallScore = getOverallScore(item.analysis_data);
        const viewCount = presentationViewsCount.get(item.id) || 0;
        const isOpened = openedIds.has(item.id);
        const isSent = sentIds.has(item.id);

        let priority = 0;
        const reasons: string[] = [];

        if (isOpened) {
          priority += 4;
          reasons.push('abriu a proposta');
        }

        if (viewCount > 1) {
          priority += 2;
          reasons.push(`${viewCount} visualizacoes`);
        }

        if (clickedAcceptIds.has(item.id)) {
          priority += 3;
          reasons.push('clicou em aceitar');
        }

        if ((overallScore || 0) >= 80) {
          priority += 2;
          reasons.push(`score ${overallScore}`);
        }

        if (isSent) {
          priority += 1;
        }

        if (priority < 4) return null;

        return {
          id: item.id,
          businessName: item.business_name || 'Sem nome',
          label: clickedAcceptIds.has(item.id) ? 'Intencao alta' : 'Quente para follow-up',
          detail: reasons.slice(0, 2).join(' • ') || 'Ja existe sinal comercial relevante.',
          priority,
          overallScore,
        };
      })
      .filter((item): item is LeadQueueRow => Boolean(item))
      .sort((a, b) => {
        const latestA = latestSignalByPresentation.get(a.id) || '';
        const latestB = latestSignalByPresentation.get(b.id) || '';
        return b.priority - a.priority || latestB.localeCompare(latestA);
      })
      .slice(0, 5);

    const pendingLeads = presentations
      .map((item) => {
        if (acceptedIds.has(item.id) || rejectedIds.has(item.id)) return null;

        const viewCount = presentationViewsCount.get(item.id) || 0;
        const isReadyNotSent = item.status === 'ready' && !sentIds.has(item.id);
        const isOpenedNoResponse = openedIds.has(item.id);
        const hasDueFollowup = dueFollowupIds.has(item.id);
        const isSentNoOpen = sentIds.has(item.id) && !openedIds.has(item.id);

        if (!isReadyNotSent && !isOpenedNoResponse && !hasDueFollowup && !isSentNoOpen) return null;

        if (hasDueFollowup) {
          return {
            id: item.id,
            businessName: item.business_name || 'Sem nome',
            label: 'Follow-up pendente',
            detail: 'A janela de follow-up ja venceu para essa proposta.',
            priority: 4,
            overallScore: getOverallScore(item.analysis_data),
          };
        }

        if (isOpenedNoResponse) {
          return {
            id: item.id,
            businessName: item.business_name || 'Sem nome',
            label: 'Aberta sem resposta',
            detail:
              viewCount > 1
                ? `${viewCount} visualizacoes sem desfecho.`
                : 'O lead abriu a proposta e ainda nao respondeu.',
            priority: 3,
            overallScore: getOverallScore(item.analysis_data),
          };
        }

        if (isReadyNotSent) {
          return {
            id: item.id,
            businessName: item.business_name || 'Sem nome',
            label: 'Pronta e nao enviada',
            detail: 'Existe proposta pronta parada fora da cadencia.',
            priority: 2,
            overallScore: getOverallScore(item.analysis_data),
          };
        }

        return {
          id: item.id,
          businessName: item.business_name || 'Sem nome',
          label: 'Enviada sem abertura',
          detail: 'Vale revisar timing, canal ou copy do disparo.',
          priority: 1,
          overallScore: getOverallScore(item.analysis_data),
        };
      })
      .filter((item): item is LeadQueueRow => Boolean(item))
      .sort((a, b) => {
        const latestA = latestSignalByPresentation.get(a.id) || '';
        const latestB = latestSignalByPresentation.get(b.id) || '';
        return b.priority - a.priority || latestB.localeCompare(latestA);
      })
      .slice(0, 5);

    return {
      readyCount,
      sentCount,
      deliveredCount,
      openedCount,
      acceptedCount,
      rejectedCount,
      noResponseCount: noResponseIds.length,
      openedNoResponseCount: openedNoResponseIds.length,
      readyNotSentCount,
      dueFollowupCount: dueFollowupIds.size,
      scheduledCampaignCount: campaigns.filter((item) => item.status === 'scheduled').length,
      acceptanceRateOnOpened: safeRate(acceptedCount, openedCount),
      acceptanceRateOnSent: safeRate(acceptedCount, sentCount),
      rejectionRateOnOpened: safeRate(rejectedCount, openedCount),
      openRateOnSent: safeRate(openedCount, sentCount),
      deliveryRateOnSent: safeRate(deliveredCount, sentCount),
      funnelData: [
        { stage: 'Prontas', value: readyCount, fill: '#111115' },
        { stage: 'Enviadas', value: sentCount, fill: '#1A1A1A' },
        { stage: 'Abertas', value: openedCount, fill: '#356DFF' },
        { stage: 'Aceitas', value: acceptedCount, fill: '#1F8F47' },
        { stage: 'Recusadas', value: rejectedCount, fill: '#B23246' },
      ],
      weeklyResponses,
      channelPerformance,
      hotLeads,
      pendingLeads,
    };
  }, [campaignPresentations, campaigns, conversionEvents, presentationViews, presentations, user]);

  const quickLinks = [
    { label: 'Abrir CRM', icon: Workflow, path: buildCRMHref({ mode: 'queue' }) },
    { label: 'Abrir campanhas', icon: Send, path: '/campaigns' },
    { label: 'Voltar ao scanner', icon: TrendingUp, path: '/search' },
  ];

  const statCards = [
    {
      title: 'Enviadas',
      value: analytics.sentCount,
      description: `${analytics.deliveryRateOnSent}% chegaram em entrega ou leitura.`,
      icon: Send,
      accent: 'dark',
    },
    {
      title: 'Abertas',
      value: analytics.openedCount,
      description: `${analytics.openRateOnSent}% das enviadas abriram a proposta.`,
      icon: Eye,
      accent: 'light',
    },
    {
      title: 'Aceitas',
      value: analytics.acceptedCount,
      description: `${analytics.acceptanceRateOnOpened}% sobre abertas | ${analytics.acceptanceRateOnSent}% sobre enviadas.`,
      icon: CircleCheck,
      accent: 'light',
    },
    {
      title: 'Recusadas',
      value: analytics.rejectedCount,
      description: `${analytics.rejectionRateOnOpened}% sobre abertas.`,
      icon: Activity,
      accent: 'light',
    },
    {
      title: 'Sem resposta',
      value: analytics.noResponseCount,
      description: `${analytics.openedNoResponseCount} abriram e ainda nao deram retorno.`,
      icon: MessageCircleReply,
      accent: 'light',
    },
  ] as const;

  if (loading) {
    return (
      <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
        <Skeleton className="h-[180px] rounded-[28px]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[148px] rounded-[24px]" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Skeleton className="h-[380px] rounded-[28px]" />
          <Skeleton className="h-[380px] rounded-[28px]" />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Skeleton className="h-[420px] rounded-[28px]" />
          <Skeleton className="h-[420px] rounded-[28px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="overflow-hidden rounded-[32px] border border-[#1c1c22] bg-[#111115] text-white shadow-[0_24px_60px_rgba(12,12,18,0.22)]"
      >
        <div className="relative overflow-hidden px-6 py-7 lg:px-8 lg:py-8">
          <div className="absolute inset-y-0 right-0 w-[360px] bg-[radial-gradient(circle_at_top_right,_rgba(239,51,51,0.22),_transparent_60%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ffb6bf]">
                Mission Control
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight lg:text-5xl">
                Dashboard comercial
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/68 lg:text-base">
                {companyName
                  ? `${companyName}, aqui o foco sai da producao e entra na conversao: envio, abertura, resposta e follow-up.`
                  : 'Aqui o foco sai da producao e entra na conversao: envio, abertura, resposta e follow-up.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge className="rounded-full border border-white/10 bg-white/8 text-white">
                  {formatCount(analytics.readyCount)} prontas
                </Badge>
                <Badge className="rounded-full border border-white/10 bg-white/8 text-white">
                  {formatCount(analytics.sentCount)} enviadas
                </Badge>
                <Badge className="rounded-full border border-white/10 bg-white/8 text-white">
                  {formatCount(analytics.acceptedCount)} aceitas
                </Badge>
                <Badge className="rounded-full border border-white/10 bg-white/8 text-white">
                  {formatCount(analytics.dueFollowupCount)} follow-up pendente
                </Badge>
              </div>
            </div>

            <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Atalhos do workspace</p>
              <div className="mt-4 grid gap-3">
                {quickLinks.map((item) => (
                  <Button
                    key={item.path}
                    variant="outline"
                    className="justify-start rounded-xl border-white/10 bg-white text-[#111115] hover:bg-white/92"
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="mr-2 h-4 w-4 text-[#EF3333]" />
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {robotResults.length > 0 && (
        <motion.section 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[28px] border border-amber-100 bg-[#FFFBEB] p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-200">
            <Bot className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
              Vítimas da Madrugada Identificadas
              <Badge className="bg-amber-200 text-amber-900 border-none hover:bg-amber-200">Novo!</Badge>
            </h2>
            <p className="text-amber-800/80 mt-1">
              O Robô Noturno encontrou <strong>{robotResults.reduce((acc, task) => acc + (task.results?.length || 0), 0)} leads</strong> com feridas expostas enquanto você dormia.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/robots')}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-6 h-11 border-none shadow-md shadow-amber-200"
          >
            Ver Vítimas <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.section>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.24 }}
          >
            <Card
              className={cn(
                'h-full rounded-[24px] border shadow-[0_10px_24px_rgba(18,18,22,0.05)]',
                card.accent === 'dark'
                  ? 'border-[#1E1E24] bg-[#17171D] text-white'
                  : 'border-[#ececf0] bg-white text-[#1A1A1A]'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle
                    className={cn(
                      'text-sm font-medium',
                      card.accent === 'dark' ? 'text-white/75' : 'text-[#6a6a72]'
                    )}
                  >
                    {card.title}
                  </CardTitle>
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-2xl',
                      card.accent === 'dark'
                        ? 'bg-[#EF3333] text-white'
                        : 'bg-[#fff0f1] text-[#EF3333]'
                    )}
                  >
                    <card.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">{formatCount(card.value)}</p>
                <p className={cn('mt-1 text-sm', card.accent === 'dark' ? 'text-white/65' : 'text-[#787880]')}>
                  {card.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.3 }}>
          <Card className="rounded-[28px] border border-[#ececf0] bg-white shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Funil comercial</CardTitle>
                  <p className="mt-1 text-sm text-[#66666d]">
                    Da proposta pronta ao desfecho comercial registrado pela plataforma.
                  </p>
                </div>
                <Badge className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-[#5f5f67]">
                  {analytics.acceptanceRateOnSent}% aceite sobre enviadas
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {analytics.funnelData.every((item) => item.value === 0) ? (
                <p className="py-16 text-center text-sm text-[#7d7d84]">
                  Ainda nao existe historico suficiente para montar o funil comercial.
                </p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={analytics.funnelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ededf1" vertical={false} />
                    <XAxis dataKey="stage" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[14, 14, 0, 0]}>
                      {analytics.funnelData.map((entry) => (
                        <Cell key={entry.stage} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.3 }}>
          <Card className="rounded-[28px] border border-[#ececf0] bg-white shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Respostas por semana</CardTitle>
                  <p className="mt-1 text-sm text-[#66666d]">
                    Tracao comercial real: respostas aceitas e recusadas ao longo do tempo.
                  </p>
                </div>
                <Badge className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-[#5f5f67]">
                  {formatCount(analytics.acceptedCount + analytics.rejectedCount)} respostas
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {analytics.weeklyResponses.length === 0 ? (
                <p className="py-16 text-center text-sm text-[#7d7d84]">
                  Ainda nao existem respostas suficientes para mostrar a curva semanal.
                </p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart data={analytics.weeklyResponses}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ededf1" />
                    <XAxis dataKey="week" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="accepted"
                      stroke="var(--color-accepted)"
                      strokeWidth={2.5}
                      dot={{ fill: 'var(--color-accepted)', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rejected"
                      stroke="var(--color-rejected)"
                      strokeWidth={2.5}
                      dot={{ fill: 'var(--color-rejected)', r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.3 }}>
          <Card className="rounded-[28px] border border-[#ececf0] bg-white shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Desempenho por canal</CardTitle>
                  <p className="mt-1 text-sm text-[#66666d]">
                    Compare envio, abertura e aceite entre WhatsApp, Email e outros canais ativos.
                  </p>
                </div>
                <Badge className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-[#5f5f67]">
                  {analytics.deliveryRateOnSent}% entrega geral
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {analytics.channelPerformance.length === 0 ? (
                <p className="py-16 text-center text-sm text-[#7d7d84]">
                  Ainda nao existem envios suficientes para comparar os canais.
                </p>
              ) : (
                <>
                  <ChartContainer config={chartConfig} className="h-[260px] w-full">
                    <BarChart data={analytics.channelPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ededf1" vertical={false} />
                      <XAxis dataKey="channel" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="sent" fill="var(--color-sent)" radius={[10, 10, 0, 0]} />
                      <Bar dataKey="opened" fill="var(--color-opened)" radius={[10, 10, 0, 0]} />
                      <Bar dataKey="accepted" fill="var(--color-accepted)" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ChartContainer>

                  <div className="grid gap-3 md:grid-cols-2">
                    {analytics.channelPerformance.map((item) => (
                      <div key={item.key} className="rounded-[22px] border border-[#ececf0] bg-[#fafafd] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-[#1A1A1A]">{item.channel}</p>
                          <Badge className="rounded-full border-[#e4e5ea] bg-white text-[#5f5f67]">
                            {formatCount(item.sent)} envios
                          </Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Entrega</p>
                            <p className="mt-1 text-lg font-semibold text-[#1A1A1A]">{item.deliveryRate}%</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Abertura</p>
                            <p className="mt-1 text-lg font-semibold text-[#1A1A1A]">{item.openRate}%</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Aceite</p>
                            <p className="mt-1 text-lg font-semibold text-[#1A1A1A]">{item.acceptanceRate}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.3 }}>
          <Card className="rounded-[28px] border border-[#ececf0] bg-white shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-[#1A1A1A]">
                    Propostas quentes e pendencias
                  </CardTitle>
                  <p className="mt-1 text-sm text-[#66666d]">
                    O que merece acao agora: leads com sinal forte e itens travados na operacao.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="rounded-xl text-[#5f5f67] hover:bg-[#f6f6f8]"
                  onClick={() => navigate(buildCRMHref({ mode: 'queue' }))}
                >
                  Abrir fila
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 xl:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#fff3e8] text-[#d97706]">
                      <Flame className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-[#1A1A1A]">Propostas quentes</p>
                      <p className="text-xs text-[#7a7a82]">Abertura, revisitacao e intencao.</p>
                    </div>
                  </div>
                  <Badge className="rounded-full border-[#f5dfbe] bg-[#fff8ed] text-[#9a6412]">
                    {analytics.hotLeads.length}
                  </Badge>
                </div>

                {analytics.hotLeads.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[#e2e3e8] bg-[#fafafd] px-4 py-8 text-center text-sm text-[#7d7d84]">
                    Nenhuma proposta quente ainda.
                  </div>
                ) : (
                  analytics.hotLeads.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(buildCRMHref({ mode: 'queue', leadId: item.id }))}
                      className="w-full rounded-[22px] border border-[#ececf0] px-4 py-4 text-left transition-colors hover:bg-[#fafafd]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#1A1A1A]">{item.businessName}</p>
                          <p className="mt-1 text-sm text-[#66666d]">{item.detail}</p>
                        </div>
                        <Badge className="rounded-full border-[#f5dfbe] bg-[#fff8ed] text-[#9a6412]">
                          {item.label}
                        </Badge>
                      </div>
                      {item.overallScore !== null ? (
                        <p className="mt-3 text-xs uppercase tracking-[0.12em] text-[#9a9aa1]">
                          Score {item.overallScore}
                        </p>
                      ) : null}
                    </button>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#356dff]">
                      <Clock3 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-[#1A1A1A]">Pendencias operacionais</p>
                      <p className="text-xs text-[#7a7a82]">Fila travada, follow-up e cadencia.</p>
                    </div>
                  </div>
                  <Badge className="rounded-full border-[#dbe4ff] bg-[#f4f7ff] text-[#365fc2]">
                    {analytics.pendingLeads.length}
                  </Badge>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-[20px] border border-[#ececf0] bg-[#fafafd] p-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Prontas</p>
                    <p className="mt-1 text-xl font-semibold text-[#1A1A1A]">
                      {formatCount(analytics.readyNotSentCount)}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[#ececf0] bg-[#fafafd] p-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Follow-up</p>
                    <p className="mt-1 text-xl font-semibold text-[#1A1A1A]">
                      {formatCount(analytics.dueFollowupCount)}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[#ececf0] bg-[#fafafd] p-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Agendadas</p>
                    <p className="mt-1 text-xl font-semibold text-[#1A1A1A]">
                      {formatCount(analytics.scheduledCampaignCount)}
                    </p>
                  </div>
                </div>

                {analytics.pendingLeads.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[#e2e3e8] bg-[#fafafd] px-4 py-8 text-center text-sm text-[#7d7d84]">
                    Nenhuma pendencia critica no momento.
                  </div>
                ) : (
                  analytics.pendingLeads.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(buildCRMHref({ mode: 'queue', leadId: item.id }))}
                      className="w-full rounded-[22px] border border-[#ececf0] px-4 py-4 text-left transition-colors hover:bg-[#fafafd]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#1A1A1A]">{item.businessName}</p>
                          <p className="mt-1 text-sm text-[#66666d]">{item.detail}</p>
                        </div>
                        <Badge className="rounded-full border-[#dbe4ff] bg-[#f4f7ff] text-[#365fc2]">
                          {item.label}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
