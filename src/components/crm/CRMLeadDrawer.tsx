import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, CircleOff, Clock3, Flame, MessageSquareText, NotebookPen, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { CRMLeadNote, CRMLeadSnapshot, CRMLeadTimelineItem, CRMPipelineStage, CRMTask } from '@/types/crm';
import {
  formatCRMDateTime,
  getLeadResponseLabel,
  getSystemStatusLabel,
  getTaskTypeLabel,
  getTemperatureLabel,
} from '@/lib/crm/deriveLeadState';
import { CRMLeadTimeline } from '@/components/crm/CRMLeadTimeline';
import { CRMQuickActions } from '@/components/crm/CRMQuickActions';
import { CRMTaskComposer } from '@/components/crm/CRMTaskComposer';
import { LeadProfileSheet } from '@/components/crm/LeadProfileSheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type CampaignSummary = {
  id: string;
  campaign_id: string;
  send_status: string | null;
  sent_at: string | null;
  campaigns?: {
    name?: string | null;
    channel?: string | null;
  } | null;
};

type ConversionRow = {
  id: string;
  created_at: string;
  event_type: string;
  channel: string | null;
};

type CRMLeadDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: CRMLeadSnapshot | null;
  stages: CRMPipelineStage[];
  tasks: CRMTask[];
  publicUrl: string;
  onCreateTask: (payload: {
    presentation_id: string;
    type: CRMTask['type'];
    title: string;
    due_at?: string | null;
  }) => Promise<boolean>;
  onToggleTask: (taskId: string, nextStatus: CRMTask['status']) => Promise<boolean>;
  onAddNote: (presentationId: string, content: string) => Promise<boolean>;
  onUpdateOutcome: (payload: {
    presentationId: string;
    leadResponse: string | null;
    outcomeReason?: string | null;
    outcomeNotes?: string | null;
  }) => Promise<boolean>;
  onCopyLink: () => Promise<void> | void;
  onOpenSend: (phone?: string, phones?: string[]) => void;
  onOpenCampaign: () => void;
  onRegenerate: () => void;
};

const rejectionReasons = [
  { value: 'sem_budget', label: 'Sem budget' },
  { value: 'sem_tempo', label: 'Sem tempo' },
  { value: 'sem_fit', label: 'Sem fit' },
  { value: 'concorrente', label: 'Concorrente' },
  { value: 'ja_resolvido', label: 'Ja resolvido' },
  { value: 'sem_resposta', label: 'Sem resposta' },
  { value: 'outro', label: 'Outro' },
];

const isSameDay = (value: string, compare: Date) => {
  const target = new Date(value);
  return target.getFullYear() === compare.getFullYear() && target.getMonth() === compare.getMonth() && target.getDate() === compare.getDate();
};

const buildEventTimelineItem = (event: ConversionRow): CRMLeadTimelineItem => {
  switch (event.event_type) {
    case 'sent':
      return {
        id: event.id,
        title: 'Proposta enviada',
        description: `O envio foi registrado${event.channel ? ` via ${event.channel}` : ''}.`,
        at: event.created_at,
        tone: 'neutral',
      };
    case 'opened':
      return {
        id: event.id,
        title: 'Proposta aberta',
        description: 'O lead abriu a proposta e entrou em radar de retorno.',
        at: event.created_at,
        tone: 'warning',
      };
    case 'accepted':
    case 'clicked_accept':
      return {
        id: event.id,
        title: 'Proposta aceita',
        description: 'O lead demonstrou interesse e abriu espaco para proximo passo.',
        at: event.created_at,
        tone: 'positive',
      };
    case 'rejected':
    case 'clicked_reject':
      return {
        id: event.id,
        title: 'Proposta recusada',
        description: 'A proposta foi recusada e exige analise do motivo.',
        at: event.created_at,
        tone: 'danger',
      };
    default:
      return {
        id: event.id,
        title: 'Evento comercial',
        description: `Novo evento registrado: ${event.event_type}.`,
        at: event.created_at,
        tone: 'neutral',
      };
  }
};

export const CRMLeadDrawer = ({
  open,
  onOpenChange,
  lead,
  stages,
  tasks,
  publicUrl,
  onCreateTask,
  onToggleTask,
  onAddNote,
  onUpdateOutcome,
  onCopyLink,
  onOpenSend,
  onOpenCampaign,
  onRegenerate,
}: CRMLeadDrawerProps) => {
  const isMobile = useIsMobile();
  const [notes, setNotes] = useState<CRMLeadNote[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [events, setEvents] = useState<ConversionRow[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [outcomeReason, setOutcomeReason] = useState('outro');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [extraPhones, setExtraPhones] = useState<string[]>([]);
  const [extraEmails, setExtraEmails] = useState<string[]>([]);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  useEffect(() => {
    setOutcomeReason(lead?.outcome_reason || 'outro');
    setOutcomeNotes(lead?.outcome_notes || '');
  }, [lead]);

  useEffect(() => {
    if (!open || !lead) return;
    let active = true;

    const loadContext = async () => {
      setLoadingContext(true);
      const [notesRes, campaignsRes, eventsRes, analysisRes] = await Promise.all([
        supabase.from('lead_notes').select('id, content, created_at').eq('presentation_id', lead.presentation_id).order('created_at', { ascending: false }),
        supabase
          .from('campaign_presentations')
          .select('id, campaign_id, send_status, sent_at, campaigns(name, channel)')
          .eq('presentation_id', lead.presentation_id)
          .order('sent_at', { ascending: false })
          .limit(6),
        supabase
          .from('message_conversion_events')
          .select('id, created_at, event_type, channel')
          .eq('presentation_id', lead.presentation_id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('presentations')
          .select('analysis_data')
          .eq('id', lead.presentation_id)
          .single(),
      ]);

      if (!active) return;
      setNotes(((notesRes.data || []) as CRMLeadNote[]) || []);
      setCampaigns(((campaignsRes.data || []) as CampaignSummary[]) || []);
      setEvents(((eventsRes.data || []) as ConversionRow[]) || []);
      const ad = (analysisRes.data?.analysis_data || {}) as Record<string, unknown>;
      setExtraPhones((ad.extra_phones as string[]) || []);
      setExtraEmails((ad.extra_emails as string[]) || []);
      setLoadingContext(false);
    };

    void loadContext();

    return () => {
      active = false;
    };
  }, [open, lead]);

  const leadTasks = useMemo(
    () => tasks.filter((task) => task.presentation_id === lead?.presentation_id),
    [lead, tasks]
  );

  const openTasks = leadTasks.filter((task) => task.status === 'open');
  const completedTasks = leadTasks.filter((task) => task.status === 'completed');

  const { overdueTasks, todayTasks, futureTasks } = useMemo(() => {
    const now = new Date();
    const overdue: CRMTask[] = [];
    const today: CRMTask[] = [];
    const future: CRMTask[] = [];

    for (const task of openTasks) {
      if (!task.due_at) {
        future.push(task);
        continue;
      }

      const dueDate = new Date(task.due_at);
      if (dueDate.getTime() < now.getTime() && !isSameDay(task.due_at, now)) {
        overdue.push(task);
      } else if (isSameDay(task.due_at, now)) {
        today.push(task);
      } else {
        future.push(task);
      }
    }

    return { overdueTasks: overdue, todayTasks: today, futureTasks: future };
  }, [openTasks]);

  const timelineItems = useMemo(() => {
    if (!lead) return [];

    const items: CRMLeadTimelineItem[] = [];

    if (lead.created_at) {
      items.push({
        id: 'created',
        title: 'Lead criado',
        description: 'A proposta entrou no CRM e ficou disponivel para operacao.',
        at: lead.created_at,
        tone: 'neutral',
      });
    }

    events.forEach((event) => items.push(buildEventTimelineItem(event)));

    completedTasks.forEach((task) => {
      if (!task.completed_at) return;
      items.push({
        id: `task-${task.id}`,
        title: `Tarefa concluida: ${getTaskTypeLabel(task.type)}`,
        description: task.title,
        at: task.completed_at,
        tone: 'positive',
      });
    });

    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [completedTasks, events, lead]);

  if (!lead) return null;

  const stageMap = new Map(stages.map((stage) => [stage.id, stage]));
  const manualStage = stageMap.get(lead.pipeline_stage_id || '');

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    const ok = await onAddNote(lead.presentation_id, newNote.trim());
    setSavingNote(false);
    if (!ok) return;
    setNotes((current) => [
      {
        id: `local-${Date.now()}`,
        content: newNote.trim(),
        created_at: new Date().toISOString(),
      },
      ...current,
    ]);
    setNewNote('');
  };

  const handleReject = async () => {
    if (!outcomeReason) {
      toast.error('Selecione um motivo para recusar o lead');
      return;
    }
    await onUpdateOutcome({
      presentationId: lead.presentation_id,
      leadResponse: 'rejected',
      outcomeReason,
      outcomeNotes,
    });
  };

  const handleAccept = async () => {
    await onUpdateOutcome({
      presentationId: lead.presentation_id,
      leadResponse: 'accepted',
      outcomeReason: null,
      outcomeNotes: null,
    });
  };

  const handleClearOutcome = async () => {
    await onUpdateOutcome({
      presentationId: lead.presentation_id,
      leadResponse: null,
      outcomeReason: null,
      outcomeNotes: null,
    });
  };

  const content = (
    <div className="space-y-6">
      <section className="rounded-[22px] border border-[#ececf0] bg-[#fafafd] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-[#ececf0] bg-white text-[#5f5f67]">{getSystemStatusLabel(lead.system_status)}</Badge>
              <Badge className="rounded-full border-[#ececf0] bg-white text-[#5f5f67]">{getLeadResponseLabel(lead.lead_response)}</Badge>
              <Badge className="rounded-full border-[#f6c3ca] bg-[#fff4f6] text-[#a22639]">{getTemperatureLabel(lead.temperature)}</Badge>
              {manualStage ? <Badge className="rounded-full border-[#d8e4ff] bg-[#eef4ff] text-[#355fc1]">Etapa: {manualStage.name}</Badge> : null}
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#1A1A1A]">{lead.business_name || 'Lead sem nome'}</h2>
            <p className="mt-2 text-sm text-[#696971]">
              {lead.business_category || 'Sem categoria'} • {lead.business_phone || 'Sem telefone'} • Score {lead.analysis_score || '-'}
            </p>
          </div>
          <div className="rounded-[18px] bg-white px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Ultimo sinal</p>
            <p className="mt-1 text-sm font-medium text-[#1A1A1A]">{formatCRMDateTime(lead.last_event_at || lead.last_opened_at || lead.created_at)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] bg-white p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Canal</p>
            <p className="mt-1 text-sm font-medium text-[#1A1A1A]">{lead.last_channel || '-'}</p>
          </div>
          <div className="rounded-[18px] bg-white p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Visualizacoes</p>
            <p className="mt-1 text-sm font-medium text-[#1A1A1A]">{lead.view_count || 0}</p>
          </div>
          <div className="rounded-[18px] bg-white p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Campanhas</p>
            <p className="mt-1 text-sm font-medium text-[#1A1A1A]">{lead.campaign_count || 0}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-[#EF3333]" />
          <h3 className="font-semibold text-[#1A1A1A]">Acoes rapidas</h3>
        </div>
        <CRMQuickActions
          publicUrl={publicUrl}
          onCopyLink={onCopyLink}
          onOpenSend={() => onOpenSend(undefined, extraPhones)}
          onOpenCampaign={onOpenCampaign}
          onRegenerate={onRegenerate}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start rounded-xl"
          onClick={() => setProfileSheetOpen(true)}
        >
          <UserRound className="mr-2 h-4 w-4" />
          Ver perfil do lead
        </Button>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-[#1A1A1A]" />
          <h3 className="font-semibold text-[#1A1A1A]">Tarefas e follow-up</h3>
        </div>
        <CRMTaskComposer presentationId={lead.presentation_id} onCreateTask={onCreateTask} />

        {lead.lead_response === 'accepted' ? (
          <div className="grid gap-2 md:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl justify-start"
              onClick={() =>
                void onCreateTask({
                  presentation_id: lead.presentation_id,
                  type: 'schedule_meeting',
                  title: 'Agendar reuniao de fechamento',
                  due_at: new Date().toISOString(),
                })
              }
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Agendar reuniao
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl justify-start"
              onClick={() =>
                void onCreateTask({
                  presentation_id: lead.presentation_id,
                  type: 'send_next_step',
                  title: 'Enviar proxima etapa comercial',
                  due_at: new Date().toISOString(),
                })
              }
            >
              <MessageSquareText className="mr-2 h-4 w-4" />
              Enviar proxima etapa
            </Button>
          </div>
        ) : null}

        {[
          { title: 'Atrasadas', items: overdueTasks, tone: 'danger' as const },
          { title: 'Hoje', items: todayTasks, tone: 'warning' as const },
          { title: 'Em aberto', items: futureTasks, tone: 'neutral' as const },
        ].map((group) =>
          group.items.length > 0 ? (
            <div key={group.title} className="space-y-2">
              <p className="text-sm font-medium text-[#1A1A1A]">{group.title}</p>
              {group.items.map((task) => (
                <div key={task.id} className="rounded-[18px] border border-[#ececf0] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#1A1A1A]">{task.title}</p>
                      <p className="mt-1 text-sm text-[#6a6a72]">{getTaskTypeLabel(task.type)}</p>
                      <p className="mt-1 text-xs text-[#8a8a92]">{formatCRMDateTime(task.due_at)}</p>
                    </div>
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => void onToggleTask(task.id, 'completed')}>
                      Concluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null
        )}

        {completedTasks.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#1A1A1A]">Concluidas</p>
            {completedTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="rounded-[18px] border border-[#ececf0] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#1A1A1A]">{task.title}</p>
                    <p className="mt-1 text-xs text-[#8a8a92]">Concluida em {formatCRMDateTime(task.completed_at)}</p>
                  </div>
                  <Button type="button" variant="ghost" className="rounded-xl" onClick={() => void onToggleTask(task.id, 'open')}>
                    Reabrir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-[#1A1A1A]" />
          <h3 className="font-semibold text-[#1A1A1A]">Notas</h3>
        </div>
        <div className="space-y-2 rounded-[20px] border border-[#ececf0] bg-[#fafafd] p-4">
          <Textarea
            value={newNote}
            onChange={(event) => setNewNote(event.target.value)}
            placeholder="Adicione observacoes, contexto ou proximo passo."
            className="min-h-[96px] rounded-xl border-[#e6e6eb] bg-white"
          />
          <Button type="button" className="rounded-xl gradient-primary text-primary-foreground" disabled={savingNote || !newNote.trim()} onClick={handleAddNote}>
            {savingNote ? 'Salvando...' : 'Adicionar nota'}
          </Button>
        </div>

        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="rounded-[18px] border border-[#ececf0] bg-white p-4">
              <p className="text-sm leading-relaxed text-[#1A1A1A]">{note.content}</p>
              <p className="mt-2 text-xs text-[#8a8a92]">{formatCRMDateTime(note.created_at)}</p>
            </div>
          ))}
          {!loadingContext && notes.length === 0 ? <p className="text-sm text-[#6f6f77]">Sem notas ainda.</p> : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-[#1A1A1A]" />
          <h3 className="font-semibold text-[#1A1A1A]">Ultimas campanhas</h3>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-sm text-[#6f6f77]">Esse lead ainda nao entrou em campanhas.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-[18px] border border-[#ececf0] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#1A1A1A]">{campaign.campaigns?.name || 'Campanha'}</p>
                    <p className="mt-1 text-sm text-[#6f6f77]">{campaign.campaigns?.channel || 'Canal nao informado'}</p>
                  </div>
                  <Badge className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-[#5f5f67]">{campaign.send_status || 'pendente'}</Badge>
                </div>
                <p className="mt-2 text-xs text-[#8a8a92]">{formatCRMDateTime(campaign.sent_at)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-[#1A1A1A]" />
          <h3 className="font-semibold text-[#1A1A1A]">Timeline</h3>
        </div>
        <CRMLeadTimeline items={timelineItems} />
      </section>

      <section className="space-y-3 rounded-[22px] border border-[#ececf0] bg-[#fafafd] p-4">
        <div className="flex items-center gap-2">
          <CircleOff className="h-4 w-4 text-[#1A1A1A]" />
          <h3 className="font-semibold text-[#1A1A1A]">Fechamento comercial</h3>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <Button type="button" variant="outline" className="rounded-xl justify-start" onClick={handleAccept}>
            <CheckCircle2 className="mr-2 h-4 w-4 text-[#1f8f47]" />
            Marcar aceita
          </Button>
          <Button type="button" variant="outline" className="rounded-xl justify-start" onClick={handleReject}>
            <CircleOff className="mr-2 h-4 w-4 text-[#bc374e]" />
            Marcar recusada
          </Button>
          <Button type="button" variant="ghost" className="rounded-xl justify-start" onClick={handleClearOutcome}>
            Limpar fechamento
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Motivo da perda</Label>
            <Select value={outcomeReason} onValueChange={setOutcomeReason}>
              <SelectTrigger className="rounded-xl border-[#e6e6eb] bg-white">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {rejectionReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observacoes</Label>
            <Input
              value={outcomeNotes}
              onChange={(event) => setOutcomeNotes(event.target.value)}
              placeholder="Detalhes do fechamento"
              className="rounded-xl border-[#e6e6eb] bg-white"
            />
          </div>
        </div>

        {(lead.outcome_reason || lead.outcome_notes) && (
          <div className="rounded-[18px] border border-[#ececf0] bg-white p-4 text-sm text-[#5f5f67]">
            <p className="font-medium text-[#1A1A1A]">Fechamento atual</p>
            <p className="mt-1">Motivo: {lead.outcome_reason || '-'}</p>
            <p className="mt-1">Observacoes: {lead.outcome_notes || '-'}</p>
          </div>
        )}
      </section>
    </div>
  );

  const profileSheet = (
    <LeadProfileSheet
      open={profileSheetOpen}
      onOpenChange={setProfileSheetOpen}
      businessName={lead.business_name || ''}
      businessCategory={lead.business_category}
      businessAddress={lead.business_address}
      businessWebsite={lead.business_website}
      primaryPhone={lead.business_phone}
      primaryEmail={lead.business_email}
      extraPhones={extraPhones}
      extraEmails={extraEmails}
      onSelectPhone={(phone) => { onOpenSend(phone, extraPhones); }}
    />
  );

  if (isMobile) {
    return (
      <>
        {profileSheet}
        <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh] overflow-y-auto rounded-t-[28px] bg-white px-4 pb-8">
          <DrawerHeader className="px-0 pt-6 text-left">
            <DrawerTitle>{lead.business_name || 'Lead sem nome'}</DrawerTitle>
            <DrawerDescription>{lead.business_phone || 'Sem telefone'} • {lead.business_category || 'Sem categoria'}</DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
      </>
    );
  }

  return (
    <>
      {profileSheet}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto border-l border-[#ececf0] bg-white px-6 pb-8 sm:max-w-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>{lead.business_name || 'Lead sem nome'}</SheetTitle>
            <SheetDescription>{lead.business_phone || 'Sem telefone'} • {lead.business_category || 'Sem categoria'}</SheetDescription>
          </SheetHeader>
          <div className={cn('mt-6', loadingContext && 'opacity-80')}>{content}</div>
        </SheetContent>
      </Sheet>
    </>
  );
};
