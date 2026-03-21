import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type EmailSenderStatus = 'not_configured' | 'pending' | 'ready' | 'blocked';

type CampaignOperationEventRow = {
  id: string;
  created_at: string;
  event_type: string;
  source: string;
  reason_code?: string | null;
  message?: string | null;
};

type CampaignUrgentPanelCampaign = {
  id: string;
  name: string;
  channel: string;
  status: string;
  blocking_reason?: string | null;
  latest_operation_event?: CampaignOperationEventRow | null;
};

type CampaignUrgentPanelProps = {
  campaigns: CampaignUrgentPanelCampaign[];
  attentionCount: number;
  emailSenderConfig: {
    senderEmail: string;
    status: EmailSenderStatus;
  };
  channelConfig: {
    webhookReady: boolean;
    whatsAppOfficialReady: boolean;
  };
  channelLabel: (channel: string) => string;
  operationEventBadgeClass: (tone: 'success' | 'attention' | 'neutral') => string;
  getOperationEventTone: (row?: CampaignOperationEventRow | null) => 'success' | 'attention' | 'neutral';
  formatOperationEventType: (eventType: string) => string;
  summarizeOperationEvent: (row?: CampaignOperationEventRow | null) => string;
  formatBlockingReason: (reason?: string | null) => string;
  onOpenSettings: () => void;
  onOpenHistory: (campaignId: string) => void;
  onEdit: (campaign: CampaignUrgentPanelCampaign) => void;
};

export const CampaignUrgentPanel = ({
  campaigns,
  attentionCount,
  emailSenderConfig,
  channelConfig,
  channelLabel,
  operationEventBadgeClass,
  getOperationEventTone,
  formatOperationEventType,
  summarizeOperationEvent,
  formatBlockingReason,
  onOpenSettings,
  onOpenHistory,
  onEdit,
}: CampaignUrgentPanelProps) => {
  if (campaigns.length === 0) {
    return null;
  }

  return (
    <Card className="rounded-[24px] border border-[#f5d8c8] bg-[linear-gradient(135deg,#fffaf5_0%,#fff8f4_100%)] p-5 shadow-[0_10px_24px_rgba(194,98,10,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#9b6c46]">Painel operacional</p>
          <h2 className="mt-1 text-lg font-semibold text-[#1A1A1A]">Campanhas que exigem acao agora</h2>
          <p className="mt-1 text-sm text-[#6d6d75]">Prioridade calculada pelo ultimo evento, bloqueios ativos e falhas recentes.</p>
        </div>
        <Badge className="rounded-full border-[#f5d8c8] bg-white text-[#c2620a]">
          {attentionCount} com atencao
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {campaigns.map((campaign) => {
          const requiresSettings =
            (campaign.channel === 'email' && emailSenderConfig.senderEmail && emailSenderConfig.status !== 'ready') ||
            (campaign.channel === 'webhook' && !channelConfig.webhookReady) ||
            (campaign.channel === 'whatsapp' && campaign.status === 'scheduled' && !channelConfig.whatsAppOfficialReady);

          return (
            <div key={campaign.id} className="rounded-[18px] border border-[#f0d7c8] bg-white/90 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1A1A1A]">{campaign.name}</p>
                  <p className="mt-1 text-xs text-[#7b7b83]">{channelLabel(campaign.channel)}</p>
                </div>
                {campaign.latest_operation_event && (
                  <Badge className={`text-[11px] ${operationEventBadgeClass(getOperationEventTone(campaign.latest_operation_event))}`}>
                    {formatOperationEventType(campaign.latest_operation_event.event_type)}
                  </Badge>
                )}
              </div>

              <p className="mt-3 text-xs leading-6 text-[#5f5f67]">
                {campaign.blocking_reason
                  ? formatBlockingReason(campaign.blocking_reason)
                  : summarizeOperationEvent(campaign.latest_operation_event)}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {requiresSettings ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl border-[#f5d8c8] bg-[#fff8f4] text-[#c2620a] hover:bg-[#fff0e6]"
                    onClick={onOpenSettings}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Configurar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl border-[#e6e6eb] bg-white text-[#5f5f67] hover:bg-[#f8f8fa]"
                    onClick={() => onOpenHistory(campaign.id)}
                  >
                    Ver historico
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-xl border-[#e6e6eb] bg-white text-[#5f5f67] hover:bg-[#f8f8fa]"
                  onClick={() => onEdit(campaign)}
                >
                  Editar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
