import { ArrowRight, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CRMQueueItem } from '@/types/crm';
import { formatCRMDateTime, getLeadResponseLabel, getQueueReasonLabel, getSystemStatusLabel, getTemperatureLabel } from '@/lib/crm/deriveLeadState';

type CRMActionQueueProps = {
  items: CRMQueueItem[];
  onOpenLead: (leadId: string) => void;
};

export const CRMActionQueue = ({ items, onOpenLead }: CRMActionQueueProps) => {
  if (items.length === 0) {
    return (
      <Card className="rounded-[26px] border border-[#ececf0] bg-white p-12 text-center shadow-[0_12px_30px_rgba(18,18,22,0.05)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fafafd] text-[#7b7b83]">
          <Clock3 className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-[#1A1A1A]">Fila vazia por enquanto</h2>
        <p className="mt-2 text-sm text-[#696971]">
          Nenhum lead caiu nas prioridades atuais. Ajuste filtros ou aguarde novos sinais comerciais.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((item) => (
        <Card key={`${item.reason}-${item.lead.presentation_id}`} className="rounded-[24px] border border-[#ececf0] bg-white p-5 shadow-[0_12px_30px_rgba(18,18,22,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge className="rounded-full border-[#f5d2d7] bg-[#fff3f5] text-[#a22639]">
                {getQueueReasonLabel(item.reason)}
              </Badge>
              <h3 className="mt-3 text-xl font-semibold text-[#1A1A1A]">
                {item.lead.business_name || 'Lead sem nome'}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#67676f]">{item.detail}</p>
            </div>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenLead(item.lead.presentation_id)}>
              Abrir
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-[18px] bg-[#fafafd] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Sistema</p>
              <p className="mt-1 text-sm font-medium text-[#1A1A1A]">{getSystemStatusLabel(item.lead.system_status)}</p>
            </div>
            <div className="rounded-[18px] bg-[#fafafd] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Resposta</p>
              <p className="mt-1 text-sm font-medium text-[#1A1A1A]">{getLeadResponseLabel(item.lead.lead_response)}</p>
            </div>
            <div className="rounded-[18px] bg-[#fafafd] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Temperatura</p>
              <p className="mt-1 text-sm font-medium text-[#1A1A1A]">{getTemperatureLabel(item.lead.temperature)}</p>
            </div>
            <div className="rounded-[18px] bg-[#fafafd] p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a8a92]">Ultimo sinal</p>
              <p className="mt-1 text-sm font-medium text-[#1A1A1A]">{formatCRMDateTime(item.lead.last_event_at || item.lead.created_at)}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
