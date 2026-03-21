import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { maskApiKey } from '@/lib/settings/api-keys-ui';
import type { EmailSenderReadinessLevel, EmailSenderStatus } from '@/lib/settings/email-sender-ui';
import { SettingsDomainDialog } from '@/components/settings/SettingsDomainDialog';
import { SettingsElevenLabsDialog } from '@/components/settings/SettingsElevenLabsDialog';
import { SettingsEmailChangeDialog } from '@/components/settings/SettingsEmailChangeDialog';
import { SettingsEmailDialog } from '@/components/settings/SettingsEmailDialog';
import { SettingsFirecrawlDialog } from '@/components/settings/SettingsFirecrawlDialog';
import { SettingsFirecrawlGuideDialog } from '@/components/settings/SettingsFirecrawlGuideDialog';
import { SettingsWhatsAppDialog } from '@/components/settings/SettingsWhatsAppDialog';
import { SettingsWebhookDialog } from '@/components/settings/SettingsWebhookDialog';

type IntegrationKey = 'whatsapp' | 'email' | 'webhook' | 'dominio' | 'firecrawl' | 'elevenlabs';
type MetaConnectionStatus = 'idle' | 'testing' | 'connected' | 'error';
type MetaReadinessLevel = 'ready' | 'partial' | 'blocked';
type FirecrawlValidationStatus = 'idle' | 'valid' | 'invalid';

type MetaReadinessCheck = {
  key: string;
  label: string;
  ok: boolean;
  severity: 'success' | 'warning' | 'danger';
  detail: string;
};

type MetaReadinessIssue = {
  key: string;
  title: string;
  detail: string;
  action?: string;
  severity: 'warning' | 'danger';
};

type EmailSenderCheck = {
  key: string;
  label: string;
  ok: boolean;
  severity: 'success' | 'warning' | 'danger';
  detail: string;
};

type EmailSenderIssue = {
  key: string;
  title: string;
  detail: string;
  action?: string;
  severity: 'warning' | 'danger';
};

type EmailSenderRecord = {
  record?: string | null;
  name?: string | null;
  type?: string | null;
  value?: string | null;
  status?: string | null;
  priority?: number | null;
};

type SettingsDialogsProps = {
  activeIntegration: IntegrationKey | null;
  closeIntegration: (integration?: IntegrationKey | null) => void;
  whatsApp: {
    draft: { accessToken: string; phoneNumberId: string; wabaId: string };
    setDraft: Dispatch<SetStateAction<{ accessToken: string; phoneNumberId: string; wabaId: string }>>;
    saving: boolean;
    metaStatus: MetaConnectionStatus;
    setMetaStatus: Dispatch<SetStateAction<MetaConnectionStatus>>;
    metaStatusInfo: {
      displayPhoneNumber?: string;
      verifiedName?: string;
      qualityRating?: string;
      codeVerificationStatus?: string;
      error?: string;
      webhookUrl?: string;
      verifyToken?: string;
      wabaId?: string | null;
      readiness?: MetaReadinessLevel;
      summary?: string;
      checks?: MetaReadinessCheck[];
      issues?: MetaReadinessIssue[];
    };
    setMetaStatusInfo: Dispatch<
      SetStateAction<{
        displayPhoneNumber?: string;
        verifiedName?: string;
        qualityRating?: string;
        codeVerificationStatus?: string;
        error?: string;
        webhookUrl?: string;
        verifyToken?: string;
        wabaId?: string | null;
        readiness?: MetaReadinessLevel;
        summary?: string;
        checks?: MetaReadinessCheck[];
        issues?: MetaReadinessIssue[];
      }>
    >;
    showGuide: boolean;
    setShowGuide: Dispatch<SetStateAction<boolean>>;
    onTestConnection: () => void;
    onCopyToClipboard: (value: string, label: string) => void;
    onSave: () => void;
  };
  email: {
    draft: { senderEmail: string; senderName: string; replyToEmail: string };
    setDraft: Dispatch<SetStateAction<{ senderEmail: string; senderName: string; replyToEmail: string }>>;
    campaignSenderEmail: string;
    saving: boolean;
    validating: boolean;
    emailSenderStatus: EmailSenderStatus;
    emailSenderError: string;
    emailSenderInfo: {
      readiness?: EmailSenderReadinessLevel;
      status?: Exclude<EmailSenderStatus, 'not_configured'>;
      summary?: string;
      error?: string;
      checks?: EmailSenderCheck[];
      issues?: EmailSenderIssue[];
      records?: EmailSenderRecord[];
    };
    setEmailSenderInfo: Dispatch<
      SetStateAction<{
        readiness?: EmailSenderReadinessLevel;
        status?: Exclude<EmailSenderStatus, 'not_configured'>;
        summary?: string;
        error?: string;
        checks?: EmailSenderCheck[];
        issues?: EmailSenderIssue[];
        records?: EmailSenderRecord[];
      }>
    >;
    emailSenderDomain: string;
    emailSenderLastCheckedAt: string | null;
    emailSenderVerifiedAt: string | null;
    onValidate: () => void;
    onSave: () => void;
  };
  webhook: {
    draft: { url: string; secret: string };
    setDraft: Dispatch<SetStateAction<{ url: string; secret: string }>>;
    saving: boolean;
    onSave: () => void;
  };
  domain: {
    draft: string;
    setDraft: Dispatch<SetStateAction<string>>;
    saving: boolean;
    onSave: () => void;
  };
  firecrawl: {
    apiKey: string;
    input: string;
    setInput: Dispatch<SetStateAction<string>>;
    showKey: boolean;
    setShowKey: Dispatch<SetStateAction<boolean>>;
    validating: boolean;
    validationStatus: FirecrawlValidationStatus;
    setValidationStatus: Dispatch<SetStateAction<FirecrawlValidationStatus>>;
    saving: boolean;
    showGuide: boolean;
    setShowGuide: Dispatch<SetStateAction<boolean>>;
    guideSteps: { step: number; title: string; description: ReactNode }[];
    onValidate: () => void;
    onSave: () => void;
    onRemove: () => void;
  };
  elevenlabs: {
    configured: boolean;
    draft: string;
    setDraft: Dispatch<SetStateAction<string>>;
    saving: boolean;
    onSave: () => void;
  };
  emailChange: {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    email: string;
    pendingEmail: string;
    setPendingEmail: Dispatch<SetStateAction<string>>;
    sending: boolean;
    onSubmit: () => void;
  };
};

export const SettingsDialogs = ({
  activeIntegration,
  closeIntegration,
  whatsApp,
  email,
  webhook,
  domain,
  firecrawl,
  elevenlabs,
  emailChange,
}: SettingsDialogsProps) => (
  <>
    <SettingsWhatsAppDialog
      open={activeIntegration === 'whatsapp'}
      saving={whatsApp.saving}
      accessToken={whatsApp.draft.accessToken}
      phoneNumberId={whatsApp.draft.phoneNumberId}
      wabaId={whatsApp.draft.wabaId}
      metaStatus={whatsApp.metaStatus}
      metaStatusInfo={whatsApp.metaStatusInfo}
      showMetaGuide={whatsApp.showGuide}
      onAccessTokenChange={(value) => {
        whatsApp.setDraft((prev) => ({ ...prev, accessToken: value }));
        whatsApp.setMetaStatus('idle');
        whatsApp.setMetaStatusInfo({});
      }}
      onPhoneNumberIdChange={(value) => {
        whatsApp.setDraft((prev) => ({ ...prev, phoneNumberId: value }));
        whatsApp.setMetaStatus('idle');
        whatsApp.setMetaStatusInfo({});
      }}
      onWabaIdChange={(value) => {
        whatsApp.setDraft((prev) => ({ ...prev, wabaId: value }));
        whatsApp.setMetaStatus('idle');
        whatsApp.setMetaStatusInfo({});
      }}
      onOpenChange={(open) => {
        if (!open) {
          closeIntegration('whatsapp');
        }
      }}
      onTestConnection={whatsApp.onTestConnection}
      onToggleGuide={() => whatsApp.setShowGuide((value) => !value)}
      onCopyToClipboard={whatsApp.onCopyToClipboard}
      onSave={whatsApp.onSave}
    />
    <SettingsEmailDialog
      open={activeIntegration === 'email'}
      saving={email.saving}
      validating={email.validating}
      senderEmail={email.draft.senderEmail}
      senderName={email.draft.senderName}
      replyToEmail={email.draft.replyToEmail}
      campaignSenderEmail={email.campaignSenderEmail}
      emailSenderStatus={email.emailSenderStatus}
      emailSenderError={email.emailSenderError}
      emailSenderInfo={email.emailSenderInfo}
      emailSenderDomain={email.emailSenderDomain}
      emailSenderLastCheckedAt={email.emailSenderLastCheckedAt}
      emailSenderVerifiedAt={email.emailSenderVerifiedAt}
      onSenderEmailChange={(value) => {
        email.setDraft((prev) => ({ ...prev, senderEmail: value }));
        email.setEmailSenderInfo({});
      }}
      onSenderNameChange={(value) => {
        email.setDraft((prev) => ({ ...prev, senderName: value }));
      }}
      onReplyToEmailChange={(value) => {
        email.setDraft((prev) => ({ ...prev, replyToEmail: value }));
        email.setEmailSenderInfo({});
      }}
      onOpenChange={(open) => {
        if (!open) {
          closeIntegration('email');
        }
      }}
      onValidate={email.onValidate}
      onSave={email.onSave}
    />
    <SettingsWebhookDialog
      open={activeIntegration === 'webhook'}
      saving={webhook.saving}
      url={webhook.draft.url}
      secret={webhook.draft.secret}
      onUrlChange={(value) => webhook.setDraft((prev) => ({ ...prev, url: value }))}
      onSecretChange={(value) => webhook.setDraft((prev) => ({ ...prev, secret: value }))}
      onOpenChange={(open) => {
        if (!open) {
          closeIntegration('webhook');
        }
      }}
      onSave={webhook.onSave}
    />
    <SettingsDomainDialog
      open={activeIntegration === 'dominio'}
      saving={domain.saving}
      value={domain.draft}
      onValueChange={domain.setDraft}
      onOpenChange={(open) => {
        if (!open) {
          closeIntegration('dominio');
        }
      }}
      onSave={domain.onSave}
    />
    <SettingsFirecrawlDialog
      open={activeIntegration === 'firecrawl'}
      firecrawlApiKey={firecrawl.apiKey}
      firecrawlApiKeyInput={firecrawl.input}
      showFirecrawlKey={firecrawl.showKey}
      validatingFirecrawl={firecrawl.validating}
      validationStatus={firecrawl.validationStatus}
      savingFirecrawlKey={firecrawl.saving}
      onOpenChange={(open) => {
        if (!open) {
          closeIntegration('firecrawl');
        }
      }}
      onOpenGuide={() => firecrawl.setShowGuide(true)}
      onRemove={firecrawl.onRemove}
      onToggleShowKey={() => firecrawl.setShowKey((value) => !value)}
      onInputChange={(value) => {
        firecrawl.setInput(value);
        firecrawl.setValidationStatus('idle');
      }}
      onValidate={firecrawl.onValidate}
      onSave={firecrawl.onSave}
      maskApiKey={maskApiKey}
    />
    <SettingsElevenLabsDialog
      open={activeIntegration === 'elevenlabs'}
      saving={elevenlabs.saving}
      configured={elevenlabs.configured}
      voiceId={elevenlabs.draft}
      onVoiceIdChange={elevenlabs.setDraft}
      onOpenChange={(open) => {
        if (!open) {
          closeIntegration('elevenlabs');
        }
      }}
      onSave={elevenlabs.onSave}
    />
    <SettingsEmailChangeDialog
      open={emailChange.open}
      email={emailChange.email}
      pendingEmail={emailChange.pendingEmail}
      sending={emailChange.sending}
      onOpenChange={emailChange.setOpen}
      onPendingEmailChange={emailChange.setPendingEmail}
      onSubmit={emailChange.onSubmit}
    />
    <SettingsFirecrawlGuideDialog
      open={firecrawl.showGuide}
      steps={firecrawl.guideSteps}
      onOpenChange={firecrawl.setShowGuide}
    />
  </>
);
