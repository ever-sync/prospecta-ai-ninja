import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AddToCampaignDialog } from '@/components/AddToCampaignDialog';
import { RegeneratePresentationDialog } from '@/components/RegeneratePresentationDialog';
import { SendPresentationDialog } from '@/components/SendPresentationDialog';
import { CRMActionQueue } from '@/components/crm/CRMActionQueue';
import { CRMBoard } from '@/components/crm/CRMBoard';
import { CRMLeadDrawer } from '@/components/crm/CRMLeadDrawer';
import { CRMList } from '@/components/crm/CRMList';
import { CRMViewBar } from '@/components/crm/CRMViewBar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useCRMWorkspace } from '@/hooks/useCRMWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/lib/invoke-edge-function';
import {
  applyCRMFilters,
  buildActionQueue,
  buildCRMMetricCards,
  buildLeadPublicUrl,
  slugifyCRMViewName,
} from '@/lib/crm/deriveLeadState';
import { selectFirstRow } from '@/lib/supabase/select-first-row';
import { CRMFilters, CRMMode, DEFAULT_CRM_FILTERS } from '@/types/crm';
import { toast } from 'sonner';

type FullPresentationRow = {
  id: string;
  public_id: string;
  business_name: string;
  business_address: string;
  business_phone: string;
  business_website: string;
  business_category: string;
  business_rating: number | null;
  analysis_data: unknown;
  status: string;
  created_at: string;
};

const filterQueryKeys = [
  'q',
  'category',
  'channel',
  'system',
  'stage',
  'temperature',
  'score',
  'ready',
  'followup',
  'opened',
  'accepted',
  'rejected',
] as const;

const parseMode = (value: string | null): CRMMode => {
  if (value === 'kanban' || value === 'list') return value;
  return 'queue';
};

const parseFiltersFromParams = (params: URLSearchParams): CRMFilters => ({
  search: params.get('q') || '',
  category: params.get('category') || 'all',
  channel: params.get('channel') || 'all',
  systemStatus: (params.get('system') as CRMFilters['systemStatus']) || 'all',
  stageId: params.get('stage') || 'all',
  temperature: (params.get('temperature') as CRMFilters['temperature']) || 'all',
  scoreBand: (params.get('score') as CRMFilters['scoreBand']) || 'all',
  onlyReadyNotSent: params.get('ready') === '1',
  onlyFollowupDue: params.get('followup') === '1',
  onlyOpenedNoResponse: params.get('opened') === '1',
  onlyAccepted: params.get('accepted') === '1',
  onlyRejected: params.get('rejected') === '1',
});

const filtersEqual = (left: CRMFilters, right: CRMFilters) =>
  Object.entries(left).every(([key, value]) => right[key as keyof CRMFilters] === value);

const writeFiltersToParams = (params: URLSearchParams, filters: CRMFilters) => {
  const entries: Array<[typeof filterQueryKeys[number], string | null]> = [
    ['q', filters.search || null],
    ['category', filters.category !== 'all' ? filters.category : null],
    ['channel', filters.channel !== 'all' ? filters.channel : null],
    ['system', filters.systemStatus !== 'all' ? filters.systemStatus : null],
    ['stage', filters.stageId !== 'all' ? filters.stageId : null],
    ['temperature', filters.temperature !== 'all' ? filters.temperature : null],
    ['score', filters.scoreBand !== 'all' ? filters.scoreBand : null],
    ['ready', filters.onlyReadyNotSent ? '1' : null],
    ['followup', filters.onlyFollowupDue ? '1' : null],
    ['opened', filters.onlyOpenedNoResponse ? '1' : null],
    ['accepted', filters.onlyAccepted ? '1' : null],
    ['rejected', filters.onlyRejected ? '1' : null],
  ];

  entries.forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
};

const CRM = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    loading,
    leads,
    leadsById,
    stages,
    tasks,
    views,
    publicBaseOrigin,
    addStage,
    deleteStage,
    moveLeadToStage,
    createTask,
    toggleTask,
    saveView,
    addNote,
    updateLeadOutcome,
  } = useCRMWorkspace();
  const [filters, setFilters] = useState<CRMFilters>(() => parseFiltersFromParams(searchParams));
  const [createStageOpen, setCreateStageOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#3b82f6');
  const [creatingStage, setCreatingStage] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const [regenPresentation, setRegenPresentation] = useState<FullPresentationRow | null>(null);

  const mode = parseMode(searchParams.get('mode'));
  const leadId = searchParams.get('lead') || '';
  const activeViewSlug = searchParams.get('view') || '';

  useEffect(() => {
    const parsed = parseFiltersFromParams(searchParams);
    if (filterQueryKeys.some((key) => searchParams.has(key))) {
      setFilters((current) => (filtersEqual(current, parsed) ? current : parsed));
      return;
    }

    if (!activeViewSlug || views.length === 0) {
      setFilters((current) => (filtersEqual(current, DEFAULT_CRM_FILTERS) ? current : DEFAULT_CRM_FILTERS));
      return;
    }

    const resolvedView = views.find((view) => slugifyCRMViewName(view.name) === activeViewSlug);
    if (!resolvedView) return;
    const nextFilters = { ...DEFAULT_CRM_FILTERS, ...((resolvedView.filters as Partial<CRMFilters>) || {}) };
    setFilters((current) => (filtersEqual(current, nextFilters) ? current : nextFilters));
  }, [activeViewSlug, searchParams, views]);

  const categories = useMemo(
    () =>
      Array.from(new Set(leads.map((lead) => lead.business_category).filter(Boolean) as string[])).sort(),
    [leads]
  );

  const channels = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.last_channel).filter(Boolean) as string[])).sort(),
    [leads]
  );

  const filteredLeads = useMemo(() => applyCRMFilters(leads, filters, stages), [filters, leads, stages]);
  const metrics = useMemo(() => buildCRMMetricCards(leads, tasks), [leads, tasks]);
  const queueItems = useMemo(() => buildActionQueue(filteredLeads, tasks), [filteredLeads, tasks]);
  const selectedLead = leadId ? leadsById.get(leadId) || null : null;
  const selectedPublicUrl = buildLeadPublicUrl(publicBaseOrigin, selectedLead?.public_id);

  const syncFilters = (nextFilters: CRMFilters, options?: { keepView?: boolean }) => {
    setFilters(nextFilters);
    const nextParams = new URLSearchParams(searchParams);
    if (!options?.keepView) nextParams.delete('view');
    writeFiltersToParams(nextParams, nextFilters);
    if (!nextParams.get('mode')) nextParams.set('mode', mode);
    setSearchParams(nextParams, { replace: true });
  };

  const handleFiltersChange = (patch: Partial<CRMFilters>) => {
    const nextFilters = { ...filters, ...patch };
    syncFilters(nextFilters);
  };

  const handleModeChange = (nextMode: CRMMode) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('mode', nextMode);
    setSearchParams(nextParams, { replace: true });
  };

  const handleOpenLead = (nextLeadId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('lead', nextLeadId);
    if (!nextParams.get('mode')) nextParams.set('mode', mode);
    setSearchParams(nextParams, { replace: true });
  };

  const handleCloseLead = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('lead');
    setSearchParams(nextParams, { replace: true });
  };

  const handleSelectView = (slug: string) => {
    const resolvedView = views.find((view) => slugifyCRMViewName(view.name) === slug);
    if (!resolvedView) return;
    const nextFilters = { ...DEFAULT_CRM_FILTERS, ...((resolvedView.filters as Partial<CRMFilters>) || {}) };
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('view', slug);
    writeFiltersToParams(nextParams, nextFilters);
    if (!nextParams.get('mode')) nextParams.set('mode', mode);
    setFilters(nextFilters);
    setSearchParams(nextParams, { replace: true });
  };

  const handleSaveView = async (name: string) => {
    return saveView(name, filters);
  };

  const handleCreateStage = async () => {
    if (!newStageName.trim()) return;
    setCreatingStage(true);
    const ok = await addStage({ name: newStageName.trim(), color: newStageColor });
    setCreatingStage(false);
    if (!ok) return;
    setNewStageName('');
    setNewStageColor('#3b82f6');
    setCreateStageOpen(false);
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!window.confirm('Remover esta coluna manual? Os leads voltam para o fluxo automatico do CRM.')) {
      return false;
    }
    return deleteStage(stageId);
  };

  const handleCopyLink = async () => {
    if (!selectedPublicUrl) return;
    await navigator.clipboard.writeText(selectedPublicUrl);
    toast.success('Link copiado');
  };

  const handleOpenRegenerate = async () => {
    if (!selectedLead) return;
    const { data, error } = await supabase
      .from('presentations')
      .select('id, public_id, business_name, business_address, business_phone, business_website, business_category, business_rating, analysis_data, status, created_at')
      .eq('id', selectedLead.presentation_id)
      .maybeSingle();

    if (error || !data) {
      toast.error('Nao foi possivel carregar a proposta para regeneracao');
      return;
    }

    setRegenPresentation(data as FullPresentationRow);
    setRegenDialogOpen(true);
  };

  const handleRegenerate = async (
    template: string,
    tone: string,
    customInstructions: string,
    customColors?: { textColor: string; buttonColor: string; bgColor: string }
  ) => {
    const presentation = regenPresentation;
    if (!presentation || !user) return;

    await supabase.from('presentations').update({ status: 'analyzing' } as never).eq('id', presentation.id);

    try {
      const [dnaRes, profileRes, testimonialsRes, clientLogosRes] = await Promise.all([
        selectFirstRow(supabase.from('company_dna').select('*').eq('user_id', user.id)),
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('testimonials').select('name, company, testimonial, image_url').eq('user_id', user.id),
        supabase.from('client_logos').select('company_name, logo_url').eq('user_id', user.id),
      ]);

      const { data: generated, error: generatedError } = await invokeEdgeFunction<{ html: string }>('generate-presentation', {
        body: {
          analysis: presentation.analysis_data,
          business: {
            name: presentation.business_name,
            address: presentation.business_address,
            phone: presentation.business_phone,
            website: presentation.business_website,
            category: presentation.business_category,
            rating: presentation.business_rating,
          },
          dna: {
            ...dnaRes.data,
            ...(customColors
              ? {
                  custom_text_color: customColors.textColor,
                  custom_button_color: customColors.buttonColor,
                  custom_bg_color: customColors.bgColor,
                }
              : {}),
          },
          profile: profileRes.data,
          testimonials: testimonialsRes.data,
          clientLogos: clientLogosRes.data,
          template,
          tone,
          customInstructions,
          publicId: presentation.public_id,
        },
      });

      if (generatedError) throw generatedError;

      await supabase.from('presentations').update({ presentation_html: generated.html, status: 'ready' } as never).eq('id', presentation.id);
      toast.success('Proposta regenerada');
      setRegenDialogOpen(false);
    } catch (error) {
      console.error(error);
      await supabase.from('presentations').update({ status: 'error' } as never).eq('id', presentation.id);
      toast.error('Falha ao regenerar proposta');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#EF3333]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
      <CRMViewBar
        mode={mode}
        onModeChange={handleModeChange}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        metrics={metrics}
        categories={categories}
        channels={channels}
        stages={stages}
        views={views}
        activeViewSlug={activeViewSlug}
        onSelectView={handleSelectView}
        onSaveView={handleSaveView}
        onOpenCreateStage={() => setCreateStageOpen(true)}
      />

      {mode === 'queue' ? (
        <CRMActionQueue items={queueItems} onOpenLead={handleOpenLead} />
      ) : mode === 'kanban' ? (
        <CRMBoard
          leads={filteredLeads}
          stages={stages}
          onOpenLead={handleOpenLead}
          onMoveLead={moveLeadToStage}
          onDeleteStage={handleDeleteStage}
          onOpenCreateStage={() => setCreateStageOpen(true)}
        />
      ) : (
        <CRMList leads={filteredLeads} stages={stages} onOpenLead={handleOpenLead} />
      )}

      <CRMLeadDrawer
        open={Boolean(selectedLead)}
        onOpenChange={(open) => !open && handleCloseLead()}
        lead={selectedLead}
        stages={stages}
        tasks={tasks}
        publicUrl={selectedPublicUrl}
        onCreateTask={createTask}
        onToggleTask={toggleTask}
        onAddNote={addNote}
        onUpdateOutcome={updateLeadOutcome}
        onCopyLink={handleCopyLink}
        onOpenSend={() => setSendDialogOpen(true)}
        onOpenCampaign={() => setCampaignDialogOpen(true)}
        onRegenerate={handleOpenRegenerate}
      />

      <SendPresentationDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        publicUrl={selectedPublicUrl}
        businessName={selectedLead?.business_name || ''}
        businessPhone={selectedLead?.business_phone || ''}
      />

      <AddToCampaignDialog
        open={campaignDialogOpen}
        onOpenChange={setCampaignDialogOpen}
        presentationIds={selectedLead ? [selectedLead.presentation_id] : []}
        onSuccess={() => setCampaignDialogOpen(false)}
      />

      <RegeneratePresentationDialog
        open={regenDialogOpen}
        onOpenChange={setRegenDialogOpen}
        onRegenerate={handleRegenerate}
        businessName={regenPresentation?.business_name || ''}
      />

      <Dialog open={createStageOpen} onOpenChange={setCreateStageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova coluna manual</DialogTitle>
            <DialogDescription>
              Crie uma etapa comercial personalizada sem alterar as colunas fixas do sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="crm-stage-name">Nome</Label>
              <Input
                id="crm-stage-name"
                value={newStageName}
                onChange={(event) => setNewStageName(event.target.value)}
                placeholder="Ex: Negociacao"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm-stage-color">Cor</Label>
              <Input
                id="crm-stage-color"
                type="color"
                value={newStageColor}
                onChange={(event) => setNewStageColor(event.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateStageOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreateStage} disabled={creatingStage || !newStageName.trim()}>
              {creatingStage ? 'Criando...' : 'Criar coluna'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRM;
