import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CRMFilters, CRMLeadSnapshot, CRMSavedView, CRMTask } from '@/types/crm';
import { DEFAULT_FIXED_STAGES, dedupeStages, dedupeViewsByName, ensureDefaultCRMViews, resolvePublicBaseOrigin, sortStages } from '@/lib/crm/deriveLeadState';
import { toast } from 'sonner';

type PipelineStage = {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  default_status: string | null;
};

type NewTaskPayload = {
  presentation_id: string;
  type: CRMTask['type'];
  title: string;
  due_at?: string | null;
  metadata?: Record<string, unknown>;
};

export const useCRMWorkspace = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<CRMLeadSnapshot[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [views, setViews] = useState<CRMSavedView[]>([]);
  const [publicBaseOrigin, setPublicBaseOrigin] = useState('https://envpro.com.br');

  const fetchWorkspace = async (showSpinner = true) => {
    if (!user) return;
    if (showSpinner) setLoading(true);

    const { data: stageRows, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('user_id', user.id)
      .order('position');

    if (stageError) {
      toast.error('Erro ao carregar etapas do CRM');
      if (showSpinner) setLoading(false);
      return;
    }

    const existingStages = dedupeStages((((stageRows || []) as PipelineStage[]) || []));
    const missingFixedStages = DEFAULT_FIXED_STAGES.filter(
      (fixedStage) => !existingStages.some((stage) => stage.is_default && stage.default_status === fixedStage.default_status)
    );

    let finalStages = existingStages;
    if (existingStages.length === 0 || missingFixedStages.length > 0) {
      const toInsert = (existingStages.length === 0 ? DEFAULT_FIXED_STAGES : missingFixedStages).map((stage) => ({
        ...stage,
        user_id: user.id,
      }));
      const { data: insertedStages, error: insertError } = await supabase.from('pipeline_stages').insert(toInsert as never).select('*');
      if (insertError) {
        toast.error('Erro ao garantir as colunas fixas do CRM');
      } else {
        finalStages = [...existingStages, ...(((insertedStages || []) as PipelineStage[]))];
      }
    }

    const [{ data: leadsData, error: leadsError }, { data: tasksData, error: tasksError }, { data: viewsData, error: viewsError }, { data: profileData }] =
      await Promise.all([
        supabase.from('crm_lead_snapshot').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('crm_tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('crm_views').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('profiles').select('proposal_link_domain').eq('user_id', user.id).maybeSingle(),
      ]);

    if (leadsError) toast.error('Erro ao carregar fila comercial do CRM');
    if (tasksError) toast.error('Erro ao carregar tarefas do CRM');
    if (viewsError) toast.error('Erro ao carregar views salvas do CRM');

    const resolvedViews = dedupeViewsByName((((viewsData || []) as CRMSavedView[]) || []));
    const missingDefaultViews = ensureDefaultCRMViews(resolvedViews, user.id);

    if (missingDefaultViews.length > 0) {
      const { data: insertedViews } = await supabase.from('crm_views').insert(missingDefaultViews as never).select('*');
      setViews(dedupeViewsByName([...(resolvedViews || []), ...(((insertedViews || []) as CRMSavedView[]))]));
    } else {
      setViews(resolvedViews);
    }

    setStages(dedupeStages(sortStages(finalStages)));
    setLeads(((leadsData || []) as CRMLeadSnapshot[]) || []);
    setTasks(((tasksData || []) as CRMTask[]) || []);
    setPublicBaseOrigin(resolvePublicBaseOrigin((profileData as { proposal_link_domain?: string | null } | null)?.proposal_link_domain));
    if (showSpinner) setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void fetchWorkspace();

    const channel = supabase
      .channel(`crm-workspace-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentations', filter: `user_id=eq.${user.id}` }, () => {
        void fetchWorkspace(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline_stages', filter: `user_id=eq.${user.id}` }, () => {
        void fetchWorkspace(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks', filter: `user_id=eq.${user.id}` }, () => {
        void fetchWorkspace(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_views', filter: `user_id=eq.${user.id}` }, () => {
        void fetchWorkspace(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_notes', filter: `user_id=eq.${user.id}` }, () => {
        void fetchWorkspace(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_conversion_events', filter: `user_id=eq.${user.id}` }, () => {
        void fetchWorkspace(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_presentations' }, () => {
        void fetchWorkspace(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentation_views' }, () => {
        void fetchWorkspace(false);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const leadsById = useMemo(() => new Map(leads.map((lead) => [lead.presentation_id, lead])), [leads]);

  const addStage = async (payload: { name: string; color: string }) => {
    if (!user) return false;
    const maxPos = stages.length > 0 ? Math.max(...stages.map((stage) => stage.position)) : -1;
    const { error } = await supabase.from('pipeline_stages').insert({
      user_id: user.id,
      name: payload.name,
      color: payload.color,
      position: maxPos + 1,
      is_default: false,
    } as never);

    if (error) {
      toast.error('Erro ao criar etapa');
      return false;
    }

    toast.success('Etapa criada');
    await fetchWorkspace(false);
    return true;
  };

  const deleteStage = async (stageId: string) => {
    const { error: resetError } = await supabase.from('presentations').update({ pipeline_stage_id: null } as never).eq('pipeline_stage_id', stageId);
    if (resetError) {
      toast.error('Erro ao limpar leads da etapa');
      return false;
    }

    const { error } = await supabase.from('pipeline_stages').delete().eq('id', stageId);
    if (error) {
      toast.error('Erro ao remover etapa');
      return false;
    }

    toast.success('Etapa removida');
    await fetchWorkspace(false);
    return true;
  };

  const updateStageColor = async (stageId: string, color: string) => {
    const { error } = await supabase.from('pipeline_stages').update({ color }).eq('id', stageId);
    if (error) {
      toast.error('Erro ao atualizar cor da etapa');
      return false;
    }
    await fetchWorkspace(false);
    return true;
  };

  const moveLeadToStage = async (presentationId: string, stageId: string) => {
    const { error } = await supabase.from('presentations').update({ pipeline_stage_id: stageId } as never).eq('id', presentationId);
    if (error) {
      toast.error('Erro ao mover lead');
      return false;
    }
    toast.success('Lead movido');
    await fetchWorkspace(false);
    return true;
  };

  const createTask = async (payload: NewTaskPayload) => {
    if (!user) return false;
    const { error } = await supabase.from('crm_tasks').insert({
      user_id: user.id,
      presentation_id: payload.presentation_id,
      type: payload.type,
      title: payload.title,
      due_at: payload.due_at || null,
      metadata: payload.metadata || {},
    } as never);

    if (error) {
      toast.error('Erro ao criar tarefa');
      return false;
    }
    toast.success('Tarefa criada');
    await fetchWorkspace(false);
    return true;
  };

  const toggleTask = async (taskId: string, nextStatus: CRMTask['status']) => {
    const updateData = nextStatus === 'completed' ? { status: nextStatus, completed_at: new Date().toISOString() } : { status: nextStatus, completed_at: null };
    const { error } = await supabase.from('crm_tasks').update(updateData as never).eq('id', taskId);
    if (error) {
      toast.error('Erro ao atualizar tarefa');
      return false;
    }
    await fetchWorkspace(false);
    return true;
  };

  const saveView = async (name: string, filters: Partial<CRMFilters>) => {
    if (!user) return false;
    const { error } = await supabase.from('crm_views').insert({
      user_id: user.id,
      name,
      filters,
      is_default: false,
    } as never);
    if (error) {
      toast.error('Erro ao salvar view');
      return false;
    }
    toast.success('View salva');
    await fetchWorkspace(false);
    return true;
  };

  const addNote = async (presentationId: string, content: string) => {
    if (!user) return false;
    const { error } = await supabase.from('lead_notes').insert({
      presentation_id: presentationId,
      user_id: user.id,
      content,
    } as never);
    if (error) {
      toast.error('Erro ao salvar nota');
      return false;
    }
    await fetchWorkspace(false);
    return true;
  };

  const updateLeadOutcome = async (payload: { presentationId: string; leadResponse: string | null; outcomeReason?: string | null; outcomeNotes?: string | null }) => {
    const { error } = await supabase
      .from('presentations')
      .update({
        lead_response: payload.leadResponse,
        outcome_reason: payload.outcomeReason || null,
        outcome_notes: payload.outcomeNotes || null,
      } as never)
      .eq('id', payload.presentationId);

    if (error) {
      toast.error('Erro ao atualizar fechamento');
      return false;
    }

    await fetchWorkspace(false);
    return true;
  };

  return {
    loading,
    leads,
    leadsById,
    stages,
    tasks,
    views,
    publicBaseOrigin,
    refresh: () => fetchWorkspace(false),
    addStage,
    deleteStage,
    updateStageColor,
    moveLeadToStage,
    createTask,
    toggleTask,
    saveView,
    addNote,
    updateLeadOutcome,
  };
};
