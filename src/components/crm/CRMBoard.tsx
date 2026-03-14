import { DragEvent, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CRMLeadSnapshot, CRMPipelineStage } from '@/types/crm';
import { cn } from '@/lib/utils';
import { formatCRMDate, getEffectiveStageId, getLeadResponseLabel, getSystemStatusLabel } from '@/lib/crm/deriveLeadState';

type CRMBoardProps = {
  leads: CRMLeadSnapshot[];
  stages: CRMPipelineStage[];
  onOpenLead: (leadId: string) => void;
  onMoveLead: (leadId: string, stageId: string) => Promise<boolean>;
  onDeleteStage: (stageId: string) => Promise<boolean>;
  onOpenCreateStage: () => void;
};

export const CRMBoard = ({ leads, stages, onOpenLead, onMoveLead, onDeleteStage, onOpenCreateStage }: CRMBoardProps) => {
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stageMap = new Map(stages.map((stage) => [stage.id, stage]));

  const leadsByStage = useMemo(() => {
    const grouped = new Map<string, CRMLeadSnapshot[]>();

    for (const stage of stages) {
      grouped.set(stage.id, []);
    }

    for (const lead of leads) {
      const stageId = getEffectiveStageId(lead, stages);
      if (!stageId) continue;
      const current = grouped.get(stageId) || [];
      current.push(lead);
      grouped.set(stageId, current);
    }

    grouped.forEach((stageLeads) => {
      stageLeads.sort((a, b) => (b.last_event_at || b.created_at || '').localeCompare(a.last_event_at || a.created_at || ''));
    });

    return grouped;
  }, [leads, stages]);

  const updateScrollButtons = () => {
    const node = scrollRef.current;
    if (!node) return;
    setCanScrollLeft(node.scrollLeft > 12);
    setCanScrollRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 12);
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, leadId: string) => {
    setDragLeadId(leadId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', leadId);
  };

  const handleDrop = async (stage: CRMPipelineStage) => {
    if (!dragLeadId || stage.is_default) {
      setDragOverStageId(null);
      setDragLeadId(null);
      return;
    }
    await onMoveLead(dragLeadId, stage.id);
    setDragOverStageId(null);
    setDragLeadId(null);
  };

  return (
    <Card className="rounded-[28px] border border-[#ececf0] bg-white p-4 shadow-[0_12px_30px_rgba(18,18,22,0.05)] lg:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#6d6d75]">Kanban comercial</p>
          <p className="text-sm text-[#6b6b73]">As 4 colunas fixas seguem o status do sistema. Colunas extras recebem classificacao manual.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="rounded-xl" disabled={!canScrollLeft} onClick={() => scrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="rounded-xl" disabled={!canScrollRight} onClick={() => scrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" className="rounded-xl gradient-primary text-primary-foreground" onClick={onOpenCreateStage}>
            Nova coluna
          </Button>
        </div>
      </div>

      <div ref={scrollRef} onScroll={updateScrollButtons} className="flex gap-4 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={cn(
              'flex min-h-[560px] w-[320px] shrink-0 flex-col rounded-[24px] border p-4',
              dragOverStageId === stage.id ? 'border-[#ef3333]/40 bg-[#fff9fa]' : 'border-[#ececf0] bg-[#fafafd]'
            )}
            onDragOver={(event) => {
              if (stage.is_default) return;
              event.preventDefault();
              setDragOverStageId(stage.id);
            }}
            onDragLeave={() => dragOverStageId === stage.id && setDragOverStageId(null)}
            onDrop={(event) => {
              event.preventDefault();
              void handleDrop(stage);
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h3 className="font-semibold text-[#1A1A1A]">{stage.name}</h3>
                  {stage.is_default ? (
                    <Badge className="rounded-full border-[#e5e7ef] bg-white text-[#59606f]">
                      <Lock className="mr-1 h-3 w-3" />
                      Fixa
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#7a7a82]">{(leadsByStage.get(stage.id) || []).length} lead(s)</p>
              </div>
              {!stage.is_default ? (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#8b8b93] hover:bg-[#fff1f3] hover:text-[#bc374e]" onClick={() => onDeleteStage(stage.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <div className="space-y-3">
              {(leadsByStage.get(stage.id) || []).map((lead) => {
                const assignedStage = lead.pipeline_stage_id ? stageMap.get(lead.pipeline_stage_id) : null;
                const canDrag = lead.system_status === 'ready' || lead.system_status === 'pending';

                return (
                  <button
                    key={lead.presentation_id}
                    type="button"
                    draggable={canDrag}
                    onDragStart={(event) => canDrag && handleDragStart(event, lead.presentation_id)}
                    onClick={() => onOpenLead(lead.presentation_id)}
                    className="w-full rounded-[22px] border border-[#e7e7eb] bg-white p-4 text-left shadow-[0_10px_22px_rgba(18,18,22,0.04)] transition hover:border-[#dedee6] hover:shadow-[0_14px_26px_rgba(18,18,22,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{lead.business_name || 'Lead sem nome'}</p>
                        <p className="mt-1 text-xs text-[#787880]">{lead.business_phone || 'Sem telefone'}</p>
                      </div>
                      <span className="text-sm font-semibold text-[#EF3333]">{lead.analysis_score || '-'}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-[#5f5f67]">
                        {getSystemStatusLabel(lead.system_status)}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-[#5f5f67]">
                        {getLeadResponseLabel(lead.lead_response)}
                      </Badge>
                      {assignedStage && assignedStage.id !== stage.id ? (
                        <Badge variant="outline" className="rounded-full border-[#f6c3ca] bg-[#fff4f6] text-[#a22639]">
                          Etapa: {assignedStage.name}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#707078]">
                      <div className="rounded-2xl bg-[#fafafd] p-2">Categoria: {lead.business_category || '-'}</div>
                      <div className="rounded-2xl bg-[#fafafd] p-2">Canal: {lead.last_channel || '-'}</div>
                      <div className="rounded-2xl bg-[#fafafd] p-2">Notas: {lead.note_count || 0}</div>
                      <div className="rounded-2xl bg-[#fafafd] p-2">Criada: {formatCRMDate(lead.created_at)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
