import { Card } from '@/components/ui/card';
import { SettingsIntegrationsGrid } from '@/components/settings/SettingsIntegrationsGrid';
import type { EmailSenderStatus } from '@/lib/settings/email-sender-ui';

const cardClass = 'rounded-[22px] border border-[#ececf0] bg-white p-6 shadow-[0_10px_24px_rgba(18,18,22,0.05)]';

type IntegrationKey = 'whatsapp' | 'email' | 'webhook' | 'dominio' | 'firecrawl' | 'elevenlabs';

type SettingsIntegrationsSectionProps = {
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

export const SettingsIntegrationsSection = ({
  officialAccessToken,
  officialPhoneNumberId,
  campaignSenderEmail,
  emailSenderStatus,
  campaignWebhookUrl,
  proposalLinkDomain,
  firecrawlApiKey,
  voiceId,
  onOpenIntegration,
}: SettingsIntegrationsSectionProps) => (
  <Card className={cardClass}>
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 font-semibold text-[#1A1A1A]">Integracoes</h3>
        <p className="text-sm text-[#6d6d75]">Clique em um card para configurar a integracao.</p>
      </div>

      <SettingsIntegrationsGrid
        officialAccessToken={officialAccessToken}
        officialPhoneNumberId={officialPhoneNumberId}
        campaignSenderEmail={campaignSenderEmail}
        emailSenderStatus={emailSenderStatus}
        campaignWebhookUrl={campaignWebhookUrl}
        proposalLinkDomain={proposalLinkDomain}
        firecrawlApiKey={firecrawlApiKey}
        voiceId={voiceId}
        onOpenIntegration={onOpenIntegration}
      />
    </div>
  </Card>
);
