import { Flame, Globe, Mail, MessageCircle, Mic, Webhook } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { emailSenderBadgeClass, emailSenderBadgeLabel, type EmailSenderStatus } from '@/lib/settings/email-sender-ui';

type IntegrationKey = 'whatsapp' | 'email' | 'webhook' | 'dominio' | 'firecrawl' | 'elevenlabs';

type SettingsIntegrationsGridProps = {
  officialAccessToken: string;
  officialPhoneNumberId: string;
  campaignSenderEmail: string;
  emailSenderStatus: EmailSenderStatus;
  campaignWebhookUrl: string;
  proposalLinkDomain: string;
  firecrawlApiKey: string;
  voiceId: string;
  onOpenIntegration: (integration: IntegrationKey) => void;
};

export const SettingsIntegrationsGrid = ({
  officialAccessToken,
  officialPhoneNumberId,
  campaignSenderEmail,
  emailSenderStatus,
  campaignWebhookUrl,
  proposalLinkDomain,
  firecrawlApiKey,
  voiceId,
  onOpenIntegration,
}: SettingsIntegrationsGridProps) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <button
      type="button"
      onClick={() => onOpenIntegration('whatsapp')}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-[#ececf0] bg-white p-5 text-left transition-all hover:border-[#d9e4ff] hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/10">
        <MessageCircle className="h-6 w-6 text-[#25D366]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1A1A1A]">WhatsApp</p>
        <p className="mt-0.5 text-xs text-[#6d6d75]">Atenda seus clientes no WhatsApp via Meta Cloud API</p>
      </div>
      {officialAccessToken && officialPhoneNumberId && (
        <Badge className="rounded-full border-[#cde8d9] bg-[#f0faf4] text-[10px] text-[#2d7a4a]">Configurado</Badge>
      )}
      {((officialAccessToken && !officialPhoneNumberId) || (!officialAccessToken && officialPhoneNumberId)) && (
        <Badge className="rounded-full border-[#f2d4d8] bg-[#fff3f5] text-[10px] text-[#8c2535]">Incompleto</Badge>
      )}
    </button>

    <button
      type="button"
      onClick={() => onOpenIntegration('email')}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-[#ececf0] bg-white p-5 text-left transition-all hover:border-[#d9e4ff] hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EA4335]/10">
        <Mail className="h-6 w-6 text-[#EA4335]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1A1A1A]">E-Mail</p>
        <p className="mt-0.5 text-xs text-[#6d6d75]">Configure o remetente das propostas e campanhas</p>
      </div>
      {campaignSenderEmail && (
        <Badge className={emailSenderBadgeClass(emailSenderStatus)}>{emailSenderBadgeLabel(emailSenderStatus)}</Badge>
      )}
    </button>

    <button
      type="button"
      onClick={() => onOpenIntegration('webhook')}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-[#ececf0] bg-white p-5 text-left transition-all hover:border-[#d9e4ff] hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF6D00]/10">
        <Webhook className="h-6 w-6 text-[#FF6D00]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1A1A1A]">Webhook / n8n</p>
        <p className="mt-0.5 text-xs text-[#6d6d75]">Envie leads das campanhas via webhook para n8n ou outro orquestrador</p>
      </div>
      {campaignWebhookUrl && (
        <Badge className="rounded-full border-[#cde8d9] bg-[#f0faf4] text-[10px] text-[#2d7a4a]">Configurado</Badge>
      )}
    </button>

    <button
      type="button"
      onClick={() => onOpenIntegration('dominio')}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-[#ececf0] bg-white p-5 text-left transition-all hover:border-[#d9e4ff] hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#356DFF]/10">
        <Globe className="h-6 w-6 text-[#356DFF]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1A1A1A]">Dominio</p>
        <p className="mt-0.5 text-xs text-[#6d6d75]">Configure o dominio do link das propostas</p>
      </div>
      {proposalLinkDomain && (
        <Badge className="rounded-full border-[#cde8d9] bg-[#f0faf4] text-[10px] text-[#2d7a4a]">Configurado</Badge>
      )}
    </button>

    <button
      type="button"
      onClick={() => onOpenIntegration('firecrawl')}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-[#ececf0] bg-white p-5 text-left transition-all hover:border-[#d9e4ff] hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EF3333]/10">
        <Flame className="h-6 w-6 text-[#EF3333]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1A1A1A]">Firecrawl</p>
        <p className="mt-0.5 text-xs text-[#6d6d75]">Raspagem automatica de sites de prospects</p>
      </div>
      {firecrawlApiKey ? (
        <Badge className="rounded-full border-[#cde8d9] bg-[#f0faf4] text-[10px] text-[#2d7a4a]">Chave propria</Badge>
      ) : (
        <Badge className="rounded-full border-[#e6e6eb] bg-[#fafafd] text-[10px] text-[#7b7b83]">Chave padrao</Badge>
      )}
    </button>

    <button
      type="button"
      onClick={() => onOpenIntegration('elevenlabs')}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-[#ececf0] bg-white p-5 text-left transition-all hover:border-[#d9e4ff] hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B5CF6]/10">
        <Mic className="h-6 w-6 text-[#8B5CF6]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1A1A1A]">ElevenLabs</p>
        <p className="mt-0.5 text-xs text-[#6d6d75]">Envie audios com sua voz clonada nas propostas</p>
      </div>
      {voiceId && (
        <Badge className="rounded-full border-[#cde8d9] bg-[#f0faf4] text-[10px] text-[#2d7a4a]">Configurado</Badge>
      )}
    </button>
  </div>
);
