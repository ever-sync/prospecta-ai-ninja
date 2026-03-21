import type { ReactNode } from 'react';
import { AlertTriangle, BookOpen, Calendar, CheckCheck, Clock, Eye, Pencil, Plus, RefreshCw, Send, Trash2, XCircle } from 'lucide-react';
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

type CampaignCardData = {
  id: string;
  name: string;
  description: string;
  status: string;
  channel: string;
  total: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  accepted: number;
  views: number;
  scheduled_at: string | null;
  blocking_reason?: string | null;
  last_blocked_at?: string | null;
  latest_operation_event?: CampaignOperationEventRow | null;
};

type CampaignCardProps = {
  campaign: CampaignCardData;
  emailSenderConfig: {
    senderEmail: string;
    status: EmailSenderStatus;
    error: string;
  };
  channelConfig: {
    webhookReady: boolean;
    whatsAppOfficialReady: boolean;
  };
  statusBadge: (status: string) => ReactNode;
  channelLabel: (channel: string) => string;
  emailSenderStatusLabel: (status: EmailSenderStatus) => string;
  emailSenderStatusClass: (status: EmailSenderStatus) => string;
  channelReadinessBadgeClass: (ready: boolean) => string;
  operationEventBadgeClass: (tone: 'success' | 'attention' | 'neutral') => string;
  getOperationEventTone: (row?: CampaignOperationEventRow | null) => 'success' | 'attention' | 'neutral';
  formatOperationEventType: (eventType: string) => string;
  formatBlockingReason: (reason?: string | null) => string;
  summarizeOperationEvent: (row?: CampaignOperationEventRow | null) => string;
  onOpenSettings: () => void;
  onOpenAddPresentations: (campaignId: string) => void;
  onOpenEdit: (campaign: CampaignCardData) => void;
  onSend: (campaign: CampaignCardData) => void;
  onForceSend: (campaign: CampaignCardData) => void;
  onRunFollowup: (campaignId: string) => void;
  onOpenFailures: (campaignId: string) => void;
  onOpenHistory: (campaignId: string) => void;
  onDelete: (campaignId: string) => void;
};

export const CampaignCard = ({
  campaign,
  emailSenderConfig,
  channelConfig,
  statusBadge,
  channelLabel,
  emailSenderStatusLabel,
  emailSenderStatusClass,
  channelReadinessBadgeClass,
  operationEventBadgeClass,
  getOperationEventTone,
  formatOperationEventType,
  formatBlockingReason,
  summarizeOperationEvent,
  onOpenSettings,
  onOpenAddPresentations,
  onOpenEdit,
  onSend,
  onForceSend,
  onRunFollowup,
  onOpenFailures,
  onOpenHistory,
  onDelete,
}: CampaignCardProps) => {
  const emailBlocked = campaign.channel === 'email' && emailSenderConfig.senderEmail && emailSenderConfig.status !== 'ready';
  const webhookBlocked = campaign.channel === 'webhook' && !channelConfig.webhookReady;
  const whatsAppBlocked =
    campaign.channel === 'whatsapp' && campaign.status === 'scheduled' && !channelConfig.whatsAppOfficialReady;

  return (
    <Card className="rounded-[22px] border border-[#ececf0] bg-white p-6 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-[#1A1A1A]">{campaign.name}</h3>
            {statusBadge(campaign.status)}
            <Badge variant="outline" className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-xs text-[#5f5f67]">
              {channelLabel(campaign.channel)}
            </Badge>
            {campaign.channel === 'email' && emailSenderConfig.senderEmail && (
              <Badge className={`text-xs ${emailSenderStatusClass(emailSenderConfig.status)}`}>
                {emailSenderStatusLabel(emailSenderConfig.status)}
              </Badge>
            )}
            {campaign.channel === 'webhook' && (
              <Badge className={`text-xs ${channelReadinessBadgeClass(channelConfig.webhookReady)}`}>
                {channelConfig.webhookReady ? 'Webhook pronto' : 'Webhook ausente'}
              </Badge>
            )}
            {campaign.channel === 'whatsapp' && campaign.status === 'scheduled' && (
              <Badge className={`text-xs ${channelReadinessBadgeClass(channelConfig.whatsAppOfficialReady)}`}>
                {channelConfig.whatsAppOfficialReady ? 'Meta pronta' : 'Meta obrigatoria'}
              </Badge>
            )}
            {campaign.latest_operation_event && (
              <Badge className={`text-xs ${operationEventBadgeClass(getOperationEventTone(campaign.latest_operation_event))}`}>
                {formatOperationEventType(campaign.latest_operation_event.event_type)}
              </Badge>
            )}
          </div>

          {campaign.description && <p className="mb-3 text-sm text-[#6e6e76]">{campaign.description}</p>}

          {emailBlocked && (
            <div className="mb-3 rounded-xl border border-[#f5d8c8] bg-[#fff8f4] px-3 py-2">
              <p className="text-xs font-medium text-[#c2620a]">
                {emailSenderConfig.error || 'Valide o dominio do remetente em Configuracoes > Integracoes > E-Mail.'}
              </p>
            </div>
          )}

          {webhookBlocked && (
            <div className="mb-3 rounded-xl border border-[#f5d8c8] bg-[#fff8f4] px-3 py-2">
              <p className="text-xs font-medium text-[#c2620a]">
                Configure a URL do webhook em Configuracoes {'>'} Integracoes para enviar campanhas nesse canal.
              </p>
            </div>
          )}

          {whatsAppBlocked && (
            <div className="mb-3 rounded-xl border border-[#f5d8c8] bg-[#fff8f4] px-3 py-2">
              <p className="text-xs font-medium text-[#c2620a]">
                Campanhas agendadas de WhatsApp exigem Access Token e Phone Number ID configurados na Meta.
              </p>
            </div>
          )}

          {campaign.status === 'cancelled' && campaign.blocking_reason && (
            <div className="mb-3 rounded-xl border border-[#f5d8c8] bg-[#fff8f4] px-3 py-2">
              <p className="text-xs font-medium text-[#c2620a]">{formatBlockingReason(campaign.blocking_reason)}</p>
              {campaign.last_blocked_at && (
                <p className="mt-1 text-[11px] text-[#9b6c46]">
                  Registrado em {new Date(campaign.last_blocked_at).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          )}

          <div className={`grid gap-2 ${campaign.channel === 'whatsapp' ? 'grid-cols-4 sm:grid-cols-7' : 'grid-cols-3 sm:grid-cols-6'}`}>
            <div className="rounded-xl bg-[#f7f7fa] p-2 text-center">
              <p className="text-xl font-bold text-[#1A1A1A]">{campaign.total}</p>
              <p className="text-xs text-[#7b7b83]">Leads</p>
            </div>
            <div className="rounded-xl bg-[#f7f7fa] p-2 text-center">
              <p className="text-xl font-bold text-[#1A1A1A]">{campaign.sent_count}</p>
              <p className="text-xs text-[#7b7b83]">Enviadas</p>
            </div>
            {campaign.channel === 'whatsapp' && (
              <>
                <div className="rounded-xl bg-[#f0faf4] p-2 text-center">
                  <p className="text-xl font-bold text-[#1a7a4a]">{campaign.delivered_count}</p>
                  <p className="flex items-center justify-center gap-0.5 text-xs text-[#7b7b83]">
                    <CheckCheck className="h-3 w-3" />
                    Entregues
                  </p>
                </div>
                <div className="rounded-xl bg-[#eef5ff] p-2 text-center">
                  <p className="text-xl font-bold text-[#2563b0]">{campaign.read_count}</p>
                  <p className="flex items-center justify-center gap-0.5 text-xs text-[#7b7b83]">
                    <BookOpen className="h-3 w-3" />
                    Lidas
                  </p>
                </div>
                {campaign.failed_count > 0 && (
                  <div className="rounded-xl bg-[#fff5f0] p-2 text-center">
                    <p className="text-xl font-bold text-[#c2620a]">{campaign.failed_count}</p>
                    <p className="flex items-center justify-center gap-0.5 text-xs text-[#7b7b83]">
                      <XCircle className="h-3 w-3" />
                      Falhas
                    </p>
                  </div>
                )}
              </>
            )}
            {campaign.channel === 'email' && (
              <div className="rounded-xl bg-[#f0f4ff] p-2 text-center">
                <p className="text-xl font-bold text-[#3b5fc2]">{campaign.views}</p>
                <p className="flex items-center justify-center gap-0.5 text-xs text-[#7b7b83]">
                  <Eye className="h-3 w-3" />
                  Abertas
                </p>
              </div>
            )}
            <div className="rounded-xl bg-[#fff3f5] p-2 text-center">
              <p className="text-xl font-bold text-[#EF3333]">{campaign.accepted}</p>
              <p className="text-xs text-[#7b7b83]">Aceitas</p>
            </div>
            <div className="rounded-xl bg-[#f7f7fa] p-2 text-center">
              <p className="text-xl font-bold text-[#1A1A1A]">
                {campaign.total > 0 ? Math.round((campaign.accepted / campaign.total) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Conversao</p>
            </div>
          </div>

          {campaign.scheduled_at && (
            <p className="mt-3 flex items-center gap-1 text-xs text-[#7b7b83]">
              <Calendar className="h-3 w-3" />
              Agendada: {new Date(campaign.scheduled_at).toLocaleString('pt-BR')}
            </p>
          )}

          {campaign.latest_operation_event && (
            <div className="mt-3 rounded-xl border border-[#e7e7ec] bg-[#fafafd] px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#7b7b83]">Ultimo evento operacional</p>
              <p className="mt-1 text-xs font-medium text-[#1A1A1A]">
                {formatOperationEventType(campaign.latest_operation_event.event_type)} ·{' '}
                {summarizeOperationEvent(campaign.latest_operation_event)}
              </p>
              <p className="mt-1 text-[11px] text-[#6d6d75]">
                {new Date(campaign.latest_operation_event.created_at).toLocaleString('pt-BR')} ·{' '}
                {campaign.latest_operation_event.source}
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-row flex-wrap gap-1 sm:flex-col">
          {emailBlocked && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-[#f5d8c8] bg-[#fff8f4] text-[#c2620a] hover:bg-[#fff0e6]"
              onClick={onOpenSettings}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Configurar email
            </Button>
          )}
          {webhookBlocked && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-[#f5d8c8] bg-[#fff8f4] text-[#c2620a] hover:bg-[#fff0e6]"
              onClick={onOpenSettings}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Configurar webhook
            </Button>
          )}
          {whatsAppBlocked && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-[#f5d8c8] bg-[#fff8f4] text-[#c2620a] hover:bg-[#fff0e6]"
              onClick={onOpenSettings}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Configurar WhatsApp
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl border-[#e6e6eb] hover:bg-[#f8f8fa]"
            onClick={() => onOpenAddPresentations(campaign.id)}
          >
            <Plus className="h-3.5 w-3.5" />
            Leads
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl border-[#e6e6eb] hover:bg-[#f8f8fa]"
            onClick={() => onOpenEdit(campaign)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
          {campaign.status !== 'sent' && campaign.total > 0 && !emailBlocked && !webhookBlocked && (
            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-xl gradient-primary text-primary-foreground glow-primary"
              onClick={() => onSend(campaign)}
            >
              <Send className="h-3.5 w-3.5" />
              Enviar
            </Button>
          )}
          {campaign.status === 'sent' && campaign.total > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-[#e6e6eb] hover:bg-[#fff8f0] hover:text-[#c2620a]"
              onClick={() => onForceSend(campaign)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reenviar
            </Button>
          )}
          {campaign.channel === 'whatsapp' && campaign.status === 'sent' && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-[#e6e6eb] hover:bg-[#f8f8fa]"
              onClick={() => onRunFollowup(campaign.id)}
            >
              <Clock className="h-3.5 w-3.5" />
              Follow-up
            </Button>
          )}
          {campaign.failed_count > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-[#f5d8c8] bg-[#fff8f4] text-[#c2620a] hover:bg-[#fff0e6]"
              onClick={() => onOpenFailures(campaign.id)}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {campaign.failed_count} falha(s)
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl border-[#e6e6eb] hover:bg-[#f8f8fa]"
            onClick={() => onOpenHistory(campaign.id)}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Historico
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 rounded-xl text-[#8a8a92] hover:bg-[#fff1f3] hover:text-[#bc374e]"
            onClick={() => onDelete(campaign.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </Button>
        </div>
      </div>
    </Card>
  );
};
