import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CRMLeadSnapshot, CRMPipelineStage } from '@/types/crm';
import { formatCRMDateTime, getEffectiveStageId, getLeadResponseLabel, getSystemStatusLabel, getTemperatureLabel } from '@/lib/crm/deriveLeadState';

type CRMListProps = {
  leads: CRMLeadSnapshot[];
  stages: CRMPipelineStage[];
  onOpenLead: (leadId: string) => void;
};

export const CRMList = ({ leads, stages, onOpenLead }: CRMListProps) => {
  const stageMap = new Map(stages.map((stage) => [stage.id, stage]));

  return (
    <Card className="overflow-x-auto rounded-[26px] border border-[#ececf0] bg-white shadow-[0_12px_30px_rgba(18,18,22,0.05)]">
      <Table className="min-w-[1060px]">
        <TableHeader>
          <TableRow className="border-b border-[#ececf0] bg-[#f9f9fb] hover:bg-[#f9f9fb]">
            <TableHead>Empresa</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Status sistema</TableHead>
            <TableHead>Etapa manual</TableHead>
            <TableHead>Temperatura</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Ultimo sinal</TableHead>
            <TableHead>Resposta</TableHead>
            <TableHead className="text-right">Acao</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const effectiveStage = stageMap.get(getEffectiveStageId(lead, stages) || '');
            const manualStage = stageMap.get(lead.pipeline_stage_id || '');

            return (
              <TableRow key={lead.presentation_id} className="border-b border-[#f0f0f3] hover:bg-[#fafafd]">
                <TableCell>
                  <div>
                    <p className="font-medium text-[#1A1A1A]">{lead.business_name || 'Lead sem nome'}</p>
                    <p className="text-xs text-[#7b7b83]">{lead.business_phone || 'Sem telefone'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-[#5f5f67]">
                    {lead.business_category || 'Sem categoria'}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold text-[#1A1A1A]">{lead.analysis_score || '-'}</TableCell>
                <TableCell>{getSystemStatusLabel(lead.system_status)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm text-[#1A1A1A]">{manualStage?.name || effectiveStage?.name || '-'}</p>
                    {manualStage && effectiveStage && manualStage.id !== effectiveStage.id ? (
                      <p className="text-xs text-[#7a7a82]">Visivel em {effectiveStage.name}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{getTemperatureLabel(lead.temperature)}</TableCell>
                <TableCell>{lead.last_channel || '-'}</TableCell>
                <TableCell>{formatCRMDateTime(lead.last_event_at || lead.last_opened_at || lead.created_at)}</TableCell>
                <TableCell>{getLeadResponseLabel(lead.lead_response)}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenLead(lead.presentation_id)}>
                    Abrir lead
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
};
