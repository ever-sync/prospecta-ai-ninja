import { AlertTriangle, BarChart3, CheckCircle2, Clock, RefreshCw, Send, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

type CampaignOverview = {
  totalCampaigns: number;
  active: number;
  sent: number;
  totalLeads: number;
  conversion: number;
};

type CampaignOperationalSummary = {
  needsAttention: number;
  blocked: number;
  recentFailures: number;
  awaitingConfiguration: number;
};

type CampaignSummaryCardsProps = {
  overview: CampaignOverview;
  operationalSummary: CampaignOperationalSummary;
  onShowAttention: () => void;
  onOpenSettings: () => void;
};

export const CampaignSummaryCards = ({
  overview,
  operationalSummary,
  onShowAttention,
  onOpenSettings,
}: CampaignSummaryCardsProps) => (
  <>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
        <p className="text-sm text-[#6f6f76]">Campanhas</p>
        <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{overview.totalCampaigns}</p>
      </Card>
      <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#7c7c83]" />
          <p className="text-sm text-[#6f6f76]">Ativas</p>
        </div>
        <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{overview.active}</p>
      </Card>
      <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-[#EF3333]" />
          <p className="text-sm text-[#6f6f76]">Enviadas</p>
        </div>
        <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{overview.sent}</p>
      </Card>
      <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#EF3333]" />
          <p className="text-sm text-[#6f6f76]">Leads totais</p>
        </div>
        <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{overview.totalLeads}</p>
      </Card>
      <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#EF3333]" />
          <p className="text-sm text-[#6f6f76]">Conversao</p>
        </div>
        <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{overview.conversion}%</p>
      </Card>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card
        className="cursor-pointer rounded-[22px] border border-[#f5d8c8] bg-[#fff8f4] p-5 shadow-[0_10px_24px_rgba(194,98,10,0.08)] transition-colors hover:bg-[#fff1e8]"
        onClick={onShowAttention}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#c2620a]" />
          <p className="text-sm text-[#9b6c46]">Acao necessaria</p>
        </div>
        <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{operationalSummary.needsAttention}</p>
        <p className="mt-1 text-xs text-[#9b6c46]">Campanhas que pedem intervencao imediata.</p>
      </Card>
      <Card
        className="cursor-pointer rounded-[22px] border border-[#f2d4d8] bg-[#fff3f5] p-5 shadow-[0_10px_24px_rgba(188,55,78,0.08)] transition-colors hover:bg-[#ffe9ee]"
        onClick={onShowAttention}
      >
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-[#bc374e]" />
          <p className="text-sm text-[#9b2a3d]">Bloqueadas</p>
        </div>
        <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{operationalSummary.blocked}</p>
        <p className="mt-1 text-xs text-[#9b2a3d]">Canal indisponivel, config ausente ou cancelamento operacional.</p>
      </Card>
      <Card
        className="cursor-pointer rounded-[22px] border border-[#efe3cc] bg-[#fff9ef] p-5 shadow-[0_10px_24px_rgba(154,122,43,0.08)] transition-colors hover:bg-[#fff4df]"
        onClick={onShowAttention}
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-[#9a7a2b]" />
          <p className="text-sm text-[#8a6b25]">Falha recente</p>
        </div>
        <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{operationalSummary.recentFailures}</p>
        <p className="mt-1 text-xs text-[#8a6b25]">Dispatch falhou ou houve erro recente no envio.</p>
      </Card>
      <Card
        className="cursor-pointer rounded-[22px] border border-[#d9e4ff] bg-[#f4f7ff] p-5 shadow-[0_10px_24px_rgba(54,95,194,0.08)] transition-colors hover:bg-[#edf2ff]"
        onClick={onOpenSettings}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#365fc2]" />
          <p className="text-sm text-[#365fc2]">Aguardando configuracao</p>
        </div>
        <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{operationalSummary.awaitingConfiguration}</p>
        <p className="mt-1 text-xs text-[#365fc2]">Integre Meta, email do cliente ou webhook para liberar envios.</p>
      </Card>
    </div>
  </>
);
