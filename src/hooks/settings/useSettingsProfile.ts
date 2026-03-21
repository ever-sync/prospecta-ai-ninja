import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getEmailChangeRedirectUrl } from '@/lib/auth-redirects';
import { formatBrazilPhone, validateBrazilPhone } from '@/lib/br-utils';
import {
  buildDomainIntegrationPayload,
  buildElevenLabsIntegrationPayload,
  buildEmailIntegrationPayload,
  buildEmailSenderReadinessPayload,
  buildWebhookIntegrationPayload,
  buildWhatsAppIntegrationPayload,
  validateEmailAddress,
} from '@/lib/settings/integration-payloads';
import {
  type EmailSenderReadinessLevel,
  type EmailSenderStatus,
} from '@/lib/settings/email-sender-ui';

type ToastFn = (options: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}) => void;

type SettingsUser = {
  id: string;
  email?: string | null;
} | null;

type WhatsAppConnectionType = 'meta_official';
type MetaReadinessLevel = 'ready' | 'partial' | 'blocked';
type IntegrationKey = 'whatsapp' | 'email' | 'webhook' | 'dominio' | 'firecrawl' | 'elevenlabs';
type MetaConnectionStatus = 'idle' | 'testing' | 'connected' | 'error';
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

type MetaValidationResponse = {
  valid: boolean;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  qualityRating?: string | null;
  codeVerificationStatus?: string | null;
  error?: string;
  webhookUrl?: string;
  verifyToken?: string;
  wabaId?: string | null;
  readiness?: MetaReadinessLevel;
  summary?: string;
  checks?: MetaReadinessCheck[];
  issues?: MetaReadinessIssue[];
};

type EmailSenderValidationResponse = {
  valid: boolean;
  error?: string;
  normalizedSenderEmail?: string | null;
  normalizedReplyToEmail?: string | null;
  senderDomain?: string | null;
  resendDomainId?: string | null;
  status?: Exclude<EmailSenderStatus, 'not_configured'>;
  readiness?: EmailSenderReadinessLevel;
  summary?: string;
  checks?: EmailSenderCheck[];
  issues?: EmailSenderIssue[];
  records?: EmailSenderRecord[];
  checkedAt?: string | null;
  verifiedAt?: string | null;
};

type UseSettingsProfileParams = {
  user: SettingsUser;
  toast: ToastFn;
};

export const useSettingsProfile = ({ user, toast }: UseSettingsProfileParams) => {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [saving, setSaving] = useState(false);
  const [emailChangeDialogOpen, setEmailChangeDialogOpen] = useState(false);
  const [pendingAccessEmail, setPendingAccessEmail] = useState('');
  const [sendingAccessEmailChange, setSendingAccessEmailChange] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingIntegrations, setSavingIntegrations] = useState(false);

  const whatsAppConnectionType: WhatsAppConnectionType = 'meta_official';
  const [officialAccessToken, setOfficialAccessToken] = useState('');
  const [officialPhoneNumberId, setOfficialPhoneNumberId] = useState('');
  const [officialWabaId, setOfficialWabaId] = useState('');
  const [whatsAppDraft, setWhatsAppDraft] = useState({ accessToken: '', phoneNumberId: '', wabaId: '' });

  const [campaignSenderEmail, setCampaignSenderEmail] = useState('');
  const [campaignSenderName, setCampaignSenderName] = useState('');
  const [campaignReplyToEmail, setCampaignReplyToEmail] = useState('');
  const [emailSenderStatus, setEmailSenderStatus] = useState<EmailSenderStatus>('not_configured');
  const [emailSenderProvider, setEmailSenderProvider] = useState('');
  const [emailSenderDomain, setEmailSenderDomain] = useState('');
  const [emailSenderLastCheckedAt, setEmailSenderLastCheckedAt] = useState<string | null>(null);
  const [emailSenderVerifiedAt, setEmailSenderVerifiedAt] = useState<string | null>(null);
  const [emailSenderError, setEmailSenderError] = useState('');
  const [emailDraft, setEmailDraft] = useState({ senderEmail: '', senderName: '', replyToEmail: '' });
  const [validatingEmailSender, setValidatingEmailSender] = useState(false);
  const [emailSenderInfo, setEmailSenderInfo] = useState<{
    readiness?: EmailSenderReadinessLevel;
    status?: Exclude<EmailSenderStatus, 'not_configured'>;
    summary?: string;
    error?: string;
    checks?: EmailSenderCheck[];
    issues?: EmailSenderIssue[];
    records?: EmailSenderRecord[];
  }>({});

  const [proposalLinkDomain, setProposalLinkDomain] = useState('');
  const [domainDraft, setDomainDraft] = useState('');
  const [campaignWebhookUrl, setCampaignWebhookUrl] = useState('');
  const [campaignWebhookSecret, setCampaignWebhookSecret] = useState('');
  const [webhookDraft, setWebhookDraft] = useState({ url: '', secret: '' });

  const [firecrawlApiKey, setFirecrawlApiKey] = useState('');
  const [firecrawlApiKeyInput, setFirecrawlApiKeyInput] = useState('');
  const [showFirecrawlKey, setShowFirecrawlKey] = useState(false);
  const [validatingFirecrawl, setValidatingFirecrawl] = useState(false);
  const [firecrawlValidationStatus, setFirecrawlValidationStatus] = useState<FirecrawlValidationStatus>('idle');
  const [savingFirecrawlKey, setSavingFirecrawlKey] = useState(false);
  const [showFirecrawlGuide, setShowFirecrawlGuide] = useState(false);

  const [voiceIdDraft, setVoiceIdDraft] = useState('');
  const [activeIntegration, setActiveIntegration] = useState<IntegrationKey | null>(null);
  const [metaStatus, setMetaStatus] = useState<MetaConnectionStatus>('idle');
  const [metaStatusInfo, setMetaStatusInfo] = useState<{
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
  }>({});
  const [showMetaGuide, setShowMetaGuide] = useState(false);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;

        setFullName(data.full_name || '');
        setCompanyName(data.company_name || '');
        setEmail(data.email || user.email || '');
        setPhone(formatBrazilPhone(data.phone || ''));
        setDocumentNumber(data.document_number || '');
        setLogoUrl(data.company_logo_url || '');
        setVoiceId(data.elevenlabs_voice_id || '');
        setOfficialAccessToken(data.whatsapp_official_access_token || '');
        setOfficialPhoneNumberId(data.whatsapp_official_phone_number_id || '');
        setOfficialWabaId(data.whatsapp_business_account_id || '');
        setCampaignSenderEmail(data.campaign_sender_email || '');
        setCampaignSenderName(data.campaign_sender_name || '');
        setCampaignReplyToEmail(data.campaign_reply_to_email || '');
        setEmailSenderStatus(
          (data.email_sender_status as EmailSenderStatus | null) ||
            (data.campaign_sender_email ? 'pending' : 'not_configured')
        );
        setEmailSenderProvider(data.email_sender_provider || '');
        setEmailSenderDomain(data.email_sender_domain || '');
        setEmailSenderLastCheckedAt(data.email_sender_last_checked_at || null);
        setEmailSenderVerifiedAt(data.email_sender_verified_at || null);
        setEmailSenderError(data.email_sender_error || '');
        setProposalLinkDomain(data.proposal_link_domain || '');
        setCampaignWebhookUrl(data.campaign_webhook_url || '');
        setCampaignWebhookSecret(data.campaign_webhook_secret || '');
        setFirecrawlApiKey(data.firecrawl_api_key || '');
        setFirecrawlApiKeyInput('');
      });
  }, [user]);

  useEffect(() => {
    setWhatsAppDraft({
      accessToken: officialAccessToken,
      phoneNumberId: officialPhoneNumberId,
      wabaId: officialWabaId,
    });
  }, [officialAccessToken, officialPhoneNumberId, officialWabaId]);

  useEffect(() => {
    setEmailDraft({
      senderEmail: campaignSenderEmail,
      senderName: campaignSenderName,
      replyToEmail: campaignReplyToEmail,
    });
  }, [campaignReplyToEmail, campaignSenderEmail, campaignSenderName]);

  useEffect(() => {
    setWebhookDraft({
      url: campaignWebhookUrl,
      secret: campaignWebhookSecret,
    });
  }, [campaignWebhookSecret, campaignWebhookUrl]);

  useEffect(() => {
    setDomainDraft(proposalLinkDomain);
  }, [proposalLinkDomain]);

  useEffect(() => {
    setVoiceIdDraft(voiceId);
  }, [voiceId]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const handleLogoUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !user) return;

      setUploading(true);
      const ext = file.name.split('.').pop();
      const path = `${user.id}/logo.${ext}`;
      const { error } = await supabase.storage.from('company-logos').upload(path, file, { upsert: true });

      if (error) {
        toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from('company-logos').getPublicUrl(path);
        setLogoUrl(publicUrl);
      }

      setUploading(false);
    },
    [toast, user]
  );

  const handleSave = useCallback(async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast({
        title: 'Campo obrigatorio',
        description: 'Informe o nome completo do responsavel.',
        variant: 'destructive',
      });
      return;
    }
    if (!companyName.trim()) {
      toast({
        title: 'Campo obrigatorio',
        description: 'Informe o nome da empresa.',
        variant: 'destructive',
      });
      return;
    }
    if (!validateBrazilPhone(phone)) {
      toast({
        title: 'Telefone invalido',
        description: 'Informe um telefone valido com DDD.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        company_name: companyName.trim(),
        company_logo_url: logoUrl,
        full_name: fullName.trim(),
        phone: formatBrazilPhone(phone),
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Salvo!', description: 'Configuracoes atualizadas com sucesso.' });
    }

    setSaving(false);
  }, [companyName, fullName, logoUrl, phone, toast, user]);

  const handleRequestEmailChange = useCallback(async () => {
    if (!pendingAccessEmail.trim()) {
      toast({
        title: 'Campo obrigatorio',
        description: 'Informe o novo email de acesso.',
        variant: 'destructive',
      });
      return;
    }

    if (pendingAccessEmail.trim().toLowerCase() === (email || '').trim().toLowerCase()) {
      toast({
        title: 'Sem alteracao',
        description: 'Informe um email diferente do atual.',
        variant: 'destructive',
      });
      return;
    }

    setSendingAccessEmailChange(true);
    const { error } = await supabase.auth.updateUser(
      { email: pendingAccessEmail.trim().toLowerCase() },
      { emailRedirectTo: getEmailChangeRedirectUrl() }
    );

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Verificacao enviada',
        description: 'Confira o novo email para concluir a alteracao do acesso.',
      });
      setEmailChangeDialogOpen(false);
      setPendingAccessEmail('');
    }

    setSendingAccessEmailChange(false);
  }, [email, pendingAccessEmail, toast]);

  const handleValidateFirecrawlKey = useCallback(async () => {
    const keyToValidate = firecrawlApiKeyInput.trim();
    if (!keyToValidate) {
      toast({ title: 'Campo vazio', description: 'Informe a chave Firecrawl antes de validar.', variant: 'destructive' });
      return;
    }

    setValidatingFirecrawl(true);
    setFirecrawlValidationStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('validate-firecrawl-key', {
        body: { apiKey: keyToValidate },
      });

      const isNetworkError =
        error &&
        (error.message?.toLowerCase().includes('failed to fetch') ||
          error.message?.toLowerCase().includes('networkerror') ||
          error.message?.toLowerCase().includes('cors') ||
          !data);

      if (isNetworkError) {
        const looksValid = keyToValidate.startsWith('fc-') && keyToValidate.length > 20;
        if (looksValid) {
          setFirecrawlValidationStatus('valid');
          toast({
            title: 'Formato aceito',
            description: 'Chave aceita pelo formato. A validacao online nao esta disponivel no momento.',
          });
        } else {
          setFirecrawlValidationStatus('invalid');
          toast({
            title: 'Formato invalido',
            description: 'A chave deve comecar com "fc-" e ter pelo menos 20 caracteres.',
            variant: 'destructive',
          });
        }
      } else if (error || !data?.valid) {
        setFirecrawlValidationStatus('invalid');
        toast({
          title: 'Chave invalida',
          description: data?.error || 'Nao foi possivel validar a chave.',
          variant: 'destructive',
        });
      } else {
        setFirecrawlValidationStatus('valid');
        toast({ title: 'Chave valida!', description: 'Sua chave Firecrawl foi validada com sucesso.' });
      }
    } catch {
      const looksValid = keyToValidate.startsWith('fc-') && keyToValidate.length > 20;
      if (looksValid) {
        setFirecrawlValidationStatus('valid');
        toast({
          title: 'Formato aceito',
          description: 'Chave aceita pelo formato. A validacao online nao esta disponivel no momento.',
        });
      } else {
        setFirecrawlValidationStatus('invalid');
        toast({
          title: 'Formato invalido',
          description: 'A chave deve comecar com "fc-" e ter pelo menos 20 caracteres.',
          variant: 'destructive',
        });
      }
    }

    setValidatingFirecrawl(false);
  }, [firecrawlApiKeyInput, toast]);

  const handleSaveFirecrawlKey = useCallback(async () => {
    if (!user) return;

    const keyToSave = firecrawlApiKeyInput.trim();
    if (!keyToSave) return;
    if (firecrawlValidationStatus !== 'valid') {
      toast({
        title: 'Valide antes de salvar',
        description: 'Use o botao Validar para confirmar a chave Firecrawl antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    setSavingFirecrawlKey(true);
    const { error } = await supabase.from('profiles').update({ firecrawl_api_key: keyToSave }).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      setFirecrawlApiKey(keyToSave);
      setFirecrawlApiKeyInput('');
      setFirecrawlValidationStatus('idle');
      toast({ title: 'Chave Firecrawl salva!', description: 'Sua chave foi salva com sucesso.' });
      window.dispatchEvent(new CustomEvent('onboarding:refetch'));
    }

    setSavingFirecrawlKey(false);
  }, [firecrawlApiKeyInput, firecrawlValidationStatus, toast, user]);

  const persistIntegration = useCallback(
    async (payload: Record<string, unknown>, successTitle: string, successDescription: string) => {
      if (!user) return false;

      setSavingIntegrations(true);
      const { error } = await supabase.from('profiles').update(payload).eq('user_id', user.id);

      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        setSavingIntegrations(false);
        return false;
      }

      toast({ title: successTitle, description: successDescription });
      window.dispatchEvent(new CustomEvent('onboarding:refetch'));
      setSavingIntegrations(false);
      return true;
    },
    [toast, user]
  );

  const resetIntegrationDraft = useCallback(
    (integration: IntegrationKey | null) => {
      if (!integration) return;

      switch (integration) {
        case 'whatsapp':
          setWhatsAppDraft({
            accessToken: officialAccessToken,
            phoneNumberId: officialPhoneNumberId,
            wabaId: officialWabaId,
          });
          setMetaStatus('idle');
          setMetaStatusInfo({});
          break;
        case 'email':
          setEmailDraft({
            senderEmail: campaignSenderEmail,
            senderName: campaignSenderName,
            replyToEmail: campaignReplyToEmail,
          });
          break;
        case 'webhook':
          setWebhookDraft({
            url: campaignWebhookUrl,
            secret: campaignWebhookSecret,
          });
          break;
        case 'dominio':
          setDomainDraft(proposalLinkDomain);
          break;
        case 'elevenlabs':
          setVoiceIdDraft(voiceId);
          break;
        case 'firecrawl':
          setFirecrawlApiKeyInput('');
          setFirecrawlValidationStatus('idle');
          break;
        default:
          break;
      }
    },
    [
      campaignReplyToEmail,
      campaignSenderEmail,
      campaignSenderName,
      campaignWebhookSecret,
      campaignWebhookUrl,
      officialAccessToken,
      officialPhoneNumberId,
      officialWabaId,
      proposalLinkDomain,
      voiceId,
    ]
  );

  const openIntegration = useCallback(
    (integration: IntegrationKey) => {
      resetIntegrationDraft(integration);
      setActiveIntegration(integration);
    },
    [resetIntegrationDraft]
  );

  const closeIntegration = useCallback(
    (integration: IntegrationKey | null = activeIntegration) => {
      resetIntegrationDraft(integration);
      setActiveIntegration(null);
    },
    [activeIntegration, resetIntegrationDraft]
  );

  const handleSaveWhatsAppIntegration = useCallback(async () => {
    const accessToken = whatsAppDraft.accessToken.trim();
    const phoneNumberId = whatsAppDraft.phoneNumberId.trim();
    const wabaId = whatsAppDraft.wabaId.trim();

    if ((accessToken || phoneNumberId || wabaId) && (!accessToken || !phoneNumberId)) {
      toast({
        title: 'Configuracao incompleta',
        description: 'Informe o Access Token e o Phone Number ID juntos para salvar o WhatsApp.',
        variant: 'destructive',
      });
      return;
    }

    const payload = buildWhatsAppIntegrationPayload({
      accessToken: whatsAppDraft.accessToken,
      phoneNumberId: whatsAppDraft.phoneNumberId,
      wabaId: whatsAppDraft.wabaId,
      connectionType: whatsAppConnectionType,
    }) as Record<string, string | null>;

    const ok = await persistIntegration(
      payload,
      'WhatsApp salvo',
      'Configuracao oficial do WhatsApp atualizada com sucesso.'
    );

    if (!ok) return;

    setOfficialAccessToken(payload.whatsapp_official_access_token || '');
    setOfficialPhoneNumberId(payload.whatsapp_official_phone_number_id || '');
    setOfficialWabaId(payload.whatsapp_business_account_id || '');
  }, [persistIntegration, toast, whatsAppDraft]);

  const handleSaveEmailIntegration = useCallback(async () => {
    const senderEmail = emailDraft.senderEmail.trim();
    const replyToEmail = emailDraft.replyToEmail.trim();

    if (senderEmail && !validateEmailAddress(senderEmail)) {
      toast({
        title: 'Email invalido',
        description: 'Informe um email remetente valido.',
        variant: 'destructive',
      });
      return;
    }

    if (replyToEmail && !validateEmailAddress(replyToEmail)) {
      toast({
        title: 'Reply-To invalido',
        description: 'Informe um email valido para receber as respostas ou deixe o campo em branco.',
        variant: 'destructive',
      });
      return;
    }

    const emailPayload = buildEmailIntegrationPayload({
      senderEmail: emailDraft.senderEmail,
      senderName: emailDraft.senderName,
    }) as Record<string, string | null>;

    const senderChanged = (emailPayload.campaign_sender_email || '') !== campaignSenderEmail;

    const readinessPayload = !emailPayload.campaign_sender_email
      ? buildEmailSenderReadinessPayload({
          senderEmail: null,
          replyToEmail: emailDraft.replyToEmail,
          senderStatus: 'not_configured',
          senderProvider: null,
          senderLastCheckedAt: null,
          senderVerifiedAt: null,
          senderError: null,
        })
      : senderChanged
        ? buildEmailSenderReadinessPayload({
            senderEmail: emailPayload.campaign_sender_email,
            replyToEmail: emailDraft.replyToEmail,
            senderStatus: 'pending',
            senderProvider: 'resend',
            senderLastCheckedAt: null,
            senderVerifiedAt: null,
            senderError: 'Valide o remetente para confirmar o dominio no Resend antes de disparar campanhas.',
          })
        : buildEmailSenderReadinessPayload({
            senderEmail: emailPayload.campaign_sender_email,
            replyToEmail: emailDraft.replyToEmail,
            senderStatus: emailSenderStatus === 'not_configured' ? 'pending' : emailSenderStatus,
            senderProvider: emailSenderProvider || 'resend',
            senderLastCheckedAt: emailSenderLastCheckedAt,
            senderVerifiedAt: emailSenderVerifiedAt,
            senderError: emailSenderError || null,
          });

    const payload = {
      ...emailPayload,
      ...readinessPayload,
    } as Record<string, string | null>;

    const ok = await persistIntegration(
      payload,
      'E-Mail salvo',
      senderChanged && payload.campaign_sender_email
        ? 'Remetente salvo. Valide o dominio antes de enviar campanhas em nome do cliente.'
        : 'Remetente das propostas e campanhas atualizado com sucesso.'
    );

    if (!ok) return;

    setCampaignSenderEmail(payload.campaign_sender_email || '');
    setCampaignSenderName(payload.campaign_sender_name || '');
    setCampaignReplyToEmail(payload.campaign_reply_to_email || '');
    setEmailSenderStatus((payload.email_sender_status as EmailSenderStatus | null) || 'not_configured');
    setEmailSenderProvider(payload.email_sender_provider || '');
    setEmailSenderDomain(payload.email_sender_domain || '');
    setEmailSenderLastCheckedAt(payload.email_sender_last_checked_at || null);
    setEmailSenderVerifiedAt(payload.email_sender_verified_at || null);
    setEmailSenderError(payload.email_sender_error || '');
    if (senderChanged || !payload.campaign_sender_email) {
      setEmailSenderInfo({});
    }
  }, [
    campaignSenderEmail,
    emailDraft,
    emailSenderError,
    emailSenderLastCheckedAt,
    emailSenderProvider,
    emailSenderStatus,
    emailSenderVerifiedAt,
    persistIntegration,
    toast,
  ]);

  const handleValidateEmailSender = useCallback(async () => {
    const senderEmail = emailDraft.senderEmail.trim();
    const replyToEmail = emailDraft.replyToEmail.trim();

    if (!senderEmail) {
      toast({
        title: 'Campo obrigatorio',
        description: 'Informe o email remetente antes de validar o dominio.',
        variant: 'destructive',
      });
      return;
    }

    if (!validateEmailAddress(senderEmail)) {
      toast({
        title: 'Email invalido',
        description: 'Informe um email remetente valido.',
        variant: 'destructive',
      });
      return;
    }

    if (replyToEmail && !validateEmailAddress(replyToEmail)) {
      toast({
        title: 'Reply-To invalido',
        description: 'Informe um email valido para receber as respostas ou deixe o campo em branco.',
        variant: 'destructive',
      });
      return;
    }

    setValidatingEmailSender(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-campaign-email-sender', {
        body: {
          senderEmail,
          senderName: emailDraft.senderName.trim() || null,
          replyToEmail: replyToEmail || null,
        },
      });

      if (error) throw error;

      const validation = data as EmailSenderValidationResponse | undefined;
      if (!validation) {
        throw new Error('Nao foi possivel validar o remetente.');
      }

      setCampaignSenderEmail(validation.normalizedSenderEmail || senderEmail);
      setCampaignSenderName(emailDraft.senderName.trim());
      setCampaignReplyToEmail(validation.normalizedReplyToEmail || '');
      setEmailSenderStatus(validation.status || 'blocked');
      setEmailSenderProvider(validation.normalizedSenderEmail ? 'resend' : '');
      setEmailSenderDomain(validation.senderDomain || '');
      setEmailSenderLastCheckedAt(validation.checkedAt || new Date().toISOString());
      setEmailSenderVerifiedAt(validation.verifiedAt || null);
      setEmailSenderError(
        validation.status === 'ready'
          ? ''
          : validation.error || validation.issues?.[0]?.detail || validation.summary || ''
      );
      setEmailSenderInfo({
        readiness: validation.readiness,
        status: validation.status,
        summary: validation.summary,
        error: validation.error,
        checks: validation.checks,
        issues: validation.issues,
        records: validation.records,
      });
      setEmailDraft((prev) => ({
        ...prev,
        senderEmail: validation.normalizedSenderEmail || prev.senderEmail,
        replyToEmail: validation.normalizedReplyToEmail || '',
      }));

      toast({
        title:
          validation.status === 'ready'
            ? 'Remetente validado'
            : validation.status === 'pending'
              ? 'Dominio cadastrado'
              : 'Remetente bloqueado',
        description:
          validation.summary ||
          (validation.status === 'ready'
            ? 'Dominio pronto para envio via Resend.'
            : 'Revise os itens de configuracao antes de disparar campanhas.'),
        variant: validation.status === 'blocked' ? 'destructive' : 'default',
      });
    } catch (error) {
      toast({
        title: 'Erro na validacao',
        description: error instanceof Error ? error.message : 'Nao foi possivel validar o remetente.',
        variant: 'destructive',
      });
    }

    setValidatingEmailSender(false);
  }, [emailDraft, toast]);

  const handleSaveWebhookIntegration = useCallback(async () => {
    let payload: Record<string, string | null>;

    try {
      payload = buildWebhookIntegrationPayload({
        url: webhookDraft.url,
        secret: webhookDraft.secret,
      }) as Record<string, string | null>;
    } catch {
      toast({
        title: 'Webhook invalido',
        description: 'Informe uma URL valida para o webhook do n8n.',
        variant: 'destructive',
      });
      return;
    }

    const ok = await persistIntegration(
      payload,
      'Webhook salvo',
      'Webhook de campanhas atualizado com sucesso.'
    );

    if (!ok) return;

    setCampaignWebhookUrl(payload.campaign_webhook_url || '');
    setCampaignWebhookSecret(payload.campaign_webhook_secret || '');
  }, [persistIntegration, toast, webhookDraft]);

  const handleSaveDomainIntegration = useCallback(async () => {
    let payload: Record<string, string | null>;

    try {
      payload = buildDomainIntegrationPayload({
        domain: domainDraft,
      }) as Record<string, string | null>;
    } catch {
      toast({
        title: 'Dominio invalido',
        description: 'Informe apenas o dominio ou origem base, sem caminhos adicionais.',
        variant: 'destructive',
      });
      return;
    }

    const ok = await persistIntegration(
      payload,
      'Dominio salvo',
      'Dominio das propostas atualizado com sucesso.'
    );

    if (!ok) return;

    setProposalLinkDomain(payload.proposal_link_domain || '');
  }, [domainDraft, persistIntegration, toast]);

  const handleSaveElevenLabsIntegration = useCallback(async () => {
    const payload = buildElevenLabsIntegrationPayload({
      voiceId: voiceIdDraft,
    }) as Record<string, string | null>;

    const ok = await persistIntegration(
      payload,
      'ElevenLabs salvo',
      'Voice ID atualizado com sucesso.'
    );

    if (!ok) return;

    setVoiceId(payload.elevenlabs_voice_id || '');
  }, [persistIntegration, voiceIdDraft]);

  const handleTestMetaConnection = useCallback(async () => {
    const token = whatsAppDraft.accessToken.trim();
    const phoneId = whatsAppDraft.phoneNumberId.trim();
    if (!token || !phoneId) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha o Access Token e o Phone Number ID antes de testar.',
        variant: 'destructive',
      });
      return;
    }

    setMetaStatus('testing');
    setMetaStatusInfo({});
    try {
      const { data, error } = await supabase.functions.invoke('validate-meta-whatsapp', {
        body: { accessToken: token, phoneNumberId: phoneId, wabaId: whatsAppDraft.wabaId.trim() || undefined },
      });
      if (error) throw error;

      const validation = data as MetaValidationResponse | undefined;
      if (validation?.valid) {
        setMetaStatus('connected');
        setMetaStatusInfo({
          displayPhoneNumber: validation.displayPhoneNumber || undefined,
          verifiedName: validation.verifiedName || undefined,
          qualityRating: validation.qualityRating || undefined,
          codeVerificationStatus: validation.codeVerificationStatus || undefined,
          webhookUrl: validation.webhookUrl || undefined,
          verifyToken: validation.verifyToken || undefined,
          wabaId: validation.wabaId || undefined,
          readiness: validation.readiness,
          summary: validation.summary,
          checks: validation.checks || [],
          issues: validation.issues || [],
        });
        toast({
          title: 'Conexao validada!',
          description: `Numero ${validation.displayPhoneNumber || phoneId} conectado com sucesso.`,
        });
      } else {
        setMetaStatus('error');
        setMetaStatusInfo({
          error: validation?.error || 'Credenciais invalidas.',
          webhookUrl: validation?.webhookUrl,
          verifyToken: validation?.verifyToken,
          wabaId: validation?.wabaId,
          readiness: validation?.readiness || 'blocked',
          summary: validation?.summary,
          checks: validation?.checks || [],
          issues: validation?.issues || [],
        });
        toast({
          title: 'Falha na conexao',
          description: validation?.error || 'Verifique o token e o Phone Number ID.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setMetaStatus('error');
      setMetaStatusInfo({ error: error?.message || 'Erro ao testar conexao.' });
      toast({
        title: 'Erro',
        description: error?.message || 'Nao foi possivel conectar a API da Meta.',
        variant: 'destructive',
      });
    }
  }, [toast, whatsAppDraft]);

  const copyToClipboard = useCallback(
    (text: string, label: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          toast({ title: 'Copiado!', description: `${label} copiado para a area de transferencia.` });
        })
        .catch(() => {
          toast({ title: 'Erro', description: 'Nao foi possivel copiar.', variant: 'destructive' });
        });
    },
    [toast]
  );

  const handleRemoveFirecrawlKey = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ firecrawl_api_key: null }).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setFirecrawlApiKey('');
      setFirecrawlApiKeyInput('');
      setFirecrawlValidationStatus('idle');
      toast({ title: 'Chave removida', description: 'Chave Firecrawl removida. Sera usada a chave do sistema.' });
    }
  }, [toast, user]);

  return {
    fullName,
    setFullName,
    companyName,
    setCompanyName,
    email,
    phone,
    setPhone,
    documentNumber,
    logoUrl,
    saving,
    emailChangeDialogOpen,
    setEmailChangeDialogOpen,
    pendingAccessEmail,
    setPendingAccessEmail,
    sendingAccessEmailChange,
    uploading,
    handleLogoUpload,
    handleSave,
    handleRequestEmailChange,
    voiceId,
    officialAccessToken,
    officialPhoneNumberId,
    campaignSenderEmail,
    emailSenderStatus,
    campaignWebhookUrl,
    proposalLinkDomain,
    firecrawlApiKey,
    savingIntegrations,
    whatsAppDraft,
    setWhatsAppDraft,
    metaStatus,
    setMetaStatus,
    metaStatusInfo,
    setMetaStatusInfo,
    showMetaGuide,
    setShowMetaGuide,
    handleTestMetaConnection,
    handleSaveWhatsAppIntegration,
    emailDraft,
    setEmailDraft,
    validatingEmailSender,
    emailSenderError,
    emailSenderInfo,
    setEmailSenderInfo,
    emailSenderDomain,
    emailSenderLastCheckedAt,
    emailSenderVerifiedAt,
    handleValidateEmailSender,
    handleSaveEmailIntegration,
    webhookDraft,
    setWebhookDraft,
    handleSaveWebhookIntegration,
    domainDraft,
    setDomainDraft,
    handleSaveDomainIntegration,
    firecrawlApiKeyInput,
    setFirecrawlApiKeyInput,
    showFirecrawlKey,
    setShowFirecrawlKey,
    validatingFirecrawl,
    firecrawlValidationStatus,
    setFirecrawlValidationStatus,
    savingFirecrawlKey,
    showFirecrawlGuide,
    setShowFirecrawlGuide,
    handleValidateFirecrawlKey,
    handleSaveFirecrawlKey,
    handleRemoveFirecrawlKey,
    voiceIdDraft,
    setVoiceIdDraft,
    handleSaveElevenLabsIntegration,
    activeIntegration,
    openIntegration,
    closeIntegration,
    copyToClipboard,
  };
};
