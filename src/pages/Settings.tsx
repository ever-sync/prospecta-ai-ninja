import { useMemo, useState, useEffect } from 'react';
import {
  Save,
  Upload,
  Building2,
  Settings2,
  Crown,
  Check,
  Loader2,
  ExternalLink,
  Mic,
  Sparkles,
  CreditCard,
  SlidersHorizontal,
  BarChart3,
  MessageCircle,
  Mail,
  KeyRound,
  Trash2,
  Bot,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Flame,
  Copy,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  Phone,
  AlertTriangle,
  Globe,
  Link2,
  Webhook,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { getEmailChangeRedirectUrl } from '@/lib/auth-redirects';
import { formatBrazilPhone, formatCpfCnpj, validateBrazilPhone } from '@/lib/br-utils';
import {
  buildDomainIntegrationPayload,
  buildElevenLabsIntegrationPayload,
  buildEmailIntegrationPayload,
  buildWebhookIntegrationPayload,
  buildWhatsAppIntegrationPayload,
  normalizeWebhookUrl,
  validateEmailAddress,
} from '@/lib/settings/integration-payloads';

const fieldClass = 'h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]';
const cardClass = 'rounded-[22px] border border-[#ececf0] bg-white p-6 shadow-[0_10px_24px_rgba(18,18,22,0.05)]';

const SETTINGS_TABS = ['empresa', 'faturamento', 'integracoes', 'apis'] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];
type ApiProvider = 'gemini' | 'claude_code' | 'groq' | 'openai' | 'other';
type WhatsAppConnectionType = 'meta_official';
type MetaReadinessLevel = 'ready' | 'partial' | 'blocked';
type IntegrationKey = 'whatsapp' | 'email' | 'webhook' | 'dominio' | 'firecrawl' | 'elevenlabs';

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

type UserAiApiKey = {
  id: string;
  provider: ApiProvider;
  custom_provider: string | null;
  api_key: string;
  created_at: string;
  updated_at: string;
};

const API_PROVIDER_OPTIONS: Array<{ value: ApiProvider; label: string }> = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'claude_code', label: 'Claude (Anthropic)' },
  { value: 'groq', label: 'Groq' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'other', label: 'Outro' },
];

const resolveInitialTab = (): SettingsTab => {
  if (typeof window === 'undefined') return 'empresa';
  const tab = new URLSearchParams(window.location.search).get('tab');
  return SETTINGS_TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : 'empresa';
};

const providerLabel = (provider: ApiProvider, customProvider: string | null) => {
  if (provider === 'other' && customProvider) return customProvider;
  return API_PROVIDER_OPTIONS.find((item) => item.value === provider)?.label ?? provider;
};

const maskApiKey = (value: string) => {
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscription, plans, loading: subLoading, startCheckout, openCustomerPortal, refreshSubscription } = useSubscription();

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => resolveInitialTab());
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
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const whatsAppConnectionType: WhatsAppConnectionType = 'meta_official';
  const [officialAccessToken, setOfficialAccessToken] = useState('');
  const [officialPhoneNumberId, setOfficialPhoneNumberId] = useState('');
  const [officialWabaId, setOfficialWabaId] = useState('');
  const [whatsAppDraft, setWhatsAppDraft] = useState({ accessToken: '', phoneNumberId: '', wabaId: '' });
  const [campaignSenderEmail, setCampaignSenderEmail] = useState('');
  const [campaignSenderName, setCampaignSenderName] = useState('');
  const [emailDraft, setEmailDraft] = useState({ senderEmail: '', senderName: '' });
  const [proposalLinkDomain, setProposalLinkDomain] = useState('');
  const [domainDraft, setDomainDraft] = useState('');
  const [campaignWebhookUrl, setCampaignWebhookUrl] = useState('');
  const [campaignWebhookSecret, setCampaignWebhookSecret] = useState('');
  const [webhookDraft, setWebhookDraft] = useState({ url: '', secret: '' });
  const [firecrawlApiKey, setFirecrawlApiKey] = useState('');
  const [firecrawlApiKeyInput, setFirecrawlApiKeyInput] = useState('');
  const [showFirecrawlKey, setShowFirecrawlKey] = useState(false);
  const [validatingFirecrawl, setValidatingFirecrawl] = useState(false);
  const [firecrawlValidationStatus, setFirecrawlValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [savingFirecrawlKey, setSavingFirecrawlKey] = useState(false);
  const [showFirecrawlGuide, setShowFirecrawlGuide] = useState(false);
  const [voiceIdDraft, setVoiceIdDraft] = useState('');
  const [activeIntegration, setActiveIntegration] = useState<IntegrationKey | null>(null);

  type MetaConnectionStatus = 'idle' | 'testing' | 'connected' | 'error';
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

  const [apiKeys, setApiKeys] = useState<UserAiApiKey[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [deletingApiKeyId, setDeletingApiKeyId] = useState<string | null>(null);
  const [apiProvider, setApiProvider] = useState<ApiProvider>('gemini');
  const [customProviderName, setCustomProviderName] = useState('');
  const [providerApiKey, setProviderApiKey] = useState('');

  const providerAlreadyConnected = useMemo(() => apiKeys.some((item) => item.provider === apiProvider), [apiKeys, apiProvider]);
  const canSaveApiKey =
    providerApiKey.trim().length > 0 &&
    (apiProvider !== 'other' || customProviderName.trim().length > 0) &&
    !savingApiKey;

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
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
          setProposalLinkDomain(data.proposal_link_domain || '');
          setCampaignWebhookUrl(data.campaign_webhook_url || '');
          setCampaignWebhookSecret(data.campaign_webhook_secret || '');
          setFirecrawlApiKey(data.firecrawl_api_key || '');
          setFirecrawlApiKeyInput('');
        }
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
    });
  }, [campaignSenderEmail, campaignSenderName]);

  useEffect(() => {
    setWebhookDraft({
      url: campaignWebhookUrl,
      secret: campaignWebhookSecret,
    });
  }, [campaignWebhookUrl, campaignWebhookSecret]);

  useEffect(() => {
    setDomainDraft(proposalLinkDomain);
  }, [proposalLinkDomain]);

  useEffect(() => {
    setVoiceIdDraft(voiceId);
  }, [voiceId]);

  const loadApiKeys = async () => {
    if (!user) return;
    setLoadingApiKeys(true);
    const { data, error } = await supabase
      .from('user_ai_api_keys')
      .select('id, provider, custom_provider, api_key, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at');

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar as chaves de API.', variant: 'destructive' });
    } else {
      setApiKeys((data || []) as UserAiApiKey[]);
    }
    setLoadingApiKeys(false);
  };

  useEffect(() => {
    if (!user) return;
    void loadApiKeys();
  }, [user]);

  useEffect(() => {
    if (apiProvider !== 'other' && customProviderName) {
      setCustomProviderName('');
    }
  }, [apiProvider, customProviderName]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      toast({ title: 'Assinatura ativada!', description: 'Seu plano foi atualizado com sucesso.' });
      refreshSubscription();
      setActiveTab('faturamento');
      params.set('tab', 'faturamento');
      params.delete('checkout');
      window.history.replaceState({}, '', `/settings?${params.toString()}`);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    params.delete('checkout');
    window.history.replaceState({}, '', `/settings?${params.toString()}`);
  }, [activeTab]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o nome completo do responsável.', variant: 'destructive' });
      return;
    }
    if (!companyName.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o nome da empresa.', variant: 'destructive' });
      return;
    }
    if (!validateBrazilPhone(phone)) {
      toast({ title: 'Telefone inválido', description: 'Informe um telefone válido com DDD.', variant: 'destructive' });
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
      toast({ title: 'Salvo!', description: 'Configurações atualizadas com sucesso.' });
    }
    setSaving(false);
  };

  const handleRequestEmailChange = async () => {
    if (!pendingAccessEmail.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o novo email de acesso.', variant: 'destructive' });
      return;
    }

    if (pendingAccessEmail.trim().toLowerCase() === (email || '').trim().toLowerCase()) {
      toast({ title: 'Sem alteração', description: 'Informe um email diferente do atual.', variant: 'destructive' });
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
        title: 'Verificação enviada',
        description: 'Confira o novo email para concluir a alteração do acesso.',
      });
      setEmailChangeDialogOpen(false);
      setPendingAccessEmail('');
    }

    setSendingAccessEmailChange(false);
  };

  const handleSaveApiKey = async () => {
    if (!user) return;
    const apiKey = providerApiKey.trim();
    const customProvider = customProviderName.trim();

    if (!apiKey) {
      toast({ title: 'Campo obrigatório', description: 'Informe uma chave de API válida.', variant: 'destructive' });
      return;
    }

    if (apiProvider === 'other' && !customProvider) {
      toast({ title: 'Campo obrigatório', description: 'Informe o nome do provedor personalizado.', variant: 'destructive' });
      return;
    }

    setSavingApiKey(true);
    const { error } = await supabase.from('user_ai_api_keys').upsert(
      {
        user_id: user.id,
        provider: apiProvider,
        custom_provider: apiProvider === 'other' ? customProvider : null,
        api_key: apiKey,
      },
      { onConflict: 'user_id,provider' }
    );

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: providerAlreadyConnected ? 'Chave atualizada' : 'Provedor conectado',
        description: 'Configuração de API salva com sucesso.',
      });
      setProviderApiKey('');
      if (apiProvider === 'other') setCustomProviderName('');
      await loadApiKeys();
      window.dispatchEvent(new CustomEvent('onboarding:refetch'));
    }
    setSavingApiKey(false);
  };

  const handleDeleteApiKey = async (keyId: string) => {
    setDeletingApiKeyId(keyId);
    const { error } = await supabase.from('user_ai_api_keys').delete().eq('id', keyId);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover a chave.', variant: 'destructive' });
    } else {
      setApiKeys((prev) => prev.filter((item) => item.id !== keyId));
      toast({ title: 'Removido', description: 'Chave de API removida com sucesso.' });
    }
    setDeletingApiKeyId(null);
  };

  const handleValidateFirecrawlKey = async () => {
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

      // Network/CORS error — edge function unreachable, fallback to format check
      const isNetworkError = error && (
        error.message?.toLowerCase().includes('failed to fetch') ||
        error.message?.toLowerCase().includes('networkerror') ||
        error.message?.toLowerCase().includes('cors') ||
        !data
      );

      if (isNetworkError) {
        const looksValid = keyToValidate.startsWith('fc-') && keyToValidate.length > 20;
        if (looksValid) {
          setFirecrawlValidationStatus('valid');
          toast({ title: 'Formato aceito', description: 'Chave aceita pelo formato. A validação online não está disponível no momento.' });
        } else {
          setFirecrawlValidationStatus('invalid');
          toast({ title: 'Formato inválido', description: 'A chave deve começar com "fc-" e ter pelo menos 20 caracteres.', variant: 'destructive' });
        }
      } else if (error || !data?.valid) {
        setFirecrawlValidationStatus('invalid');
        toast({ title: 'Chave inválida', description: data?.error || 'Não foi possível validar a chave.', variant: 'destructive' });
      } else {
        setFirecrawlValidationStatus('valid');
        toast({ title: 'Chave válida!', description: 'Sua chave Firecrawl foi validada com sucesso.' });
      }
    } catch {
      // Unexpected throw — fallback to format check
      const looksValid = keyToValidate.startsWith('fc-') && keyToValidate.length > 20;
      if (looksValid) {
        setFirecrawlValidationStatus('valid');
        toast({ title: 'Formato aceito', description: 'Chave aceita pelo formato. A validação online não está disponível no momento.' });
      } else {
        setFirecrawlValidationStatus('invalid');
        toast({ title: 'Formato inválido', description: 'A chave deve começar com "fc-" e ter pelo menos 20 caracteres.', variant: 'destructive' });
      }
    }
    setValidatingFirecrawl(false);
  };

  const handleSaveFirecrawlKey = async () => {
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
  };

  const handleSaveIntegrations = async () => {
    if (!user) return;
    setSavingIntegrations(true);

    const newFirecrawlKey = firecrawlApiKeyInput.trim();
    const trimmedWebhookUrl = campaignWebhookUrl.trim();
    let normalizedWebhookUrl: string | null = null;

    if (trimmedWebhookUrl) {
      try {
        normalizedWebhookUrl = normalizeWebhookUrl(trimmedWebhookUrl);
      } catch {
        toast({
          title: 'Webhook inválido',
          description: 'Informe uma URL válida para o webhook do n8n.',
          variant: 'destructive',
        });
        setSavingIntegrations(false);
        return;
      }
    }

    const payload: Record<string, unknown> = {
      whatsapp_connection_type: whatsAppConnectionType,
      whatsapp_official_access_token: officialAccessToken.trim() || null,
      whatsapp_official_phone_number_id: officialPhoneNumberId.trim() || null,
      whatsapp_business_account_id: officialWabaId.trim() || null,
      whatsapp_unofficial_api_url: null,
      whatsapp_unofficial_api_token: null,
      whatsapp_unofficial_instance: null,
      campaign_sender_email: campaignSenderEmail.trim() || null,
      campaign_sender_name: campaignSenderName.trim() || null,
      proposal_link_domain: proposalLinkDomain.trim() || null,
      campaign_webhook_url: normalizedWebhookUrl,
      campaign_webhook_secret: campaignWebhookSecret.trim() || null,
      elevenlabs_voice_id: voiceId.trim() || null,
    };

    if (newFirecrawlKey) {
      payload.firecrawl_api_key = newFirecrawlKey;
    }

    const { error } = await supabase.from('profiles').update(payload).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      if (newFirecrawlKey) {
        setFirecrawlApiKey(newFirecrawlKey);
        setFirecrawlApiKeyInput('');
        setFirecrawlValidationStatus('idle');
      }
      toast({ title: 'Integrações atualizadas', description: 'Configurações de WhatsApp, email, domínio, webhook e Firecrawl salvas.' });
      window.dispatchEvent(new CustomEvent('onboarding:refetch'));
    }
    setSavingIntegrations(false);
  };

  const persistIntegration = async (payload: Record<string, unknown>, successTitle: string, successDescription: string) => {
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
  };

  const resetIntegrationDraft = (integration: IntegrationKey | null) => {
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
  };

  const openIntegration = (integration: IntegrationKey) => {
    resetIntegrationDraft(integration);
    setActiveIntegration(integration);
  };

  const closeIntegration = (integration: IntegrationKey | null = activeIntegration) => {
    resetIntegrationDraft(integration);
    setActiveIntegration(null);
  };

  const handleSaveWhatsAppIntegration = async () => {
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
  };

  const handleSaveEmailIntegration = async () => {
    const senderEmail = emailDraft.senderEmail.trim();
    if (senderEmail && !validateEmailAddress(senderEmail)) {
      toast({
        title: 'Email invalido',
        description: 'Informe um email remetente valido.',
        variant: 'destructive',
      });
      return;
    }

    const payload = buildEmailIntegrationPayload({
      senderEmail: emailDraft.senderEmail,
      senderName: emailDraft.senderName,
    }) as Record<string, string | null>;

    const ok = await persistIntegration(
      payload,
      'E-Mail salvo',
      'Remetente das propostas e campanhas atualizado com sucesso.'
    );

    if (!ok) return;

    setCampaignSenderEmail(payload.campaign_sender_email || '');
    setCampaignSenderName(payload.campaign_sender_name || '');
  };

  const handleSaveWebhookIntegration = async () => {
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
  };

  const handleSaveDomainIntegration = async () => {
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
  };

  const handleSaveElevenLabsIntegration = async () => {
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
  };

  const handleTestMetaConnection = async () => {
    const token = whatsAppDraft.accessToken.trim();
    const phoneId = whatsAppDraft.phoneNumberId.trim();
    if (!token || !phoneId) {
      toast({ title: 'Campos obrigatorios', description: 'Preencha o Access Token e o Phone Number ID antes de testar.', variant: 'destructive' });
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
        toast({ title: 'Conexao validada!', description: `Numero ${validation.displayPhoneNumber || phoneId} conectado com sucesso.` });
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
        toast({ title: 'Falha na conexao', description: validation?.error || 'Verifique o token e o Phone Number ID.', variant: 'destructive' });
      }
    } catch (err: any) {
      setMetaStatus('error');
      setMetaStatusInfo({ error: err?.message || 'Erro ao testar conexao.' });
      toast({ title: 'Erro', description: err?.message || 'Nao foi possivel conectar a API da Meta.', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copiado!', description: `${label} copiado para a area de transferencia.` });
    }).catch(() => {
      toast({ title: 'Erro', description: 'Nao foi possivel copiar.', variant: 'destructive' });
    });
  };

  const handleRemoveFirecrawlKey = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ firecrawl_api_key: null }).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setFirecrawlApiKey('');
      setFirecrawlApiKeyInput('');
      setFirecrawlValidationStatus('idle');
      toast({ title: 'Chave removida', description: 'Chave Firecrawl removida. Será usada a chave do sistema.' });
    }
  };

  const handleUpgrade = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      await startCheckout(planId);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível iniciar o checkout.', variant: 'destructive' });
    }
    setCheckoutLoading(null);
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível abrir o portal de gerenciamento.', variant: 'destructive' });
    }
  };

  const currentPlan = subscription?.plan || 'free';

  const usageItems = useMemo(
    () => [
      { label: 'Apresentações', used: subscription?.usage.presentations || 0, limit: subscription?.limits.presentations || 50 },
      { label: 'Campanhas', used: subscription?.usage.campaigns || 0, limit: subscription?.limits.campaigns || 2 },
      { label: 'Emails enviados', used: subscription?.usage.emails || 0, limit: subscription?.limits.emails || 50 },
    ],
    [subscription]
  );

  return (
    <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
      <section className="rounded-[28px] border border-[#ececf0] bg-white px-5 py-6 shadow-[0_14px_36px_rgba(20,20,24,0.06)] lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#75757d]">Painel Administrativo</p>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight text-[#1A1A1A] lg:text-4xl">
              <Settings2 className="h-7 w-7 text-[#EF3333]" />
              Configurações
            </h1>
            <p className="mt-2 text-sm text-[#66666d] lg:text-base">Gerencie dados da empresa, assinatura, integrações e chaves de IA no mesmo padrão visual do dashboard.</p>
          </div>
          <div className="rounded-2xl border border-[#f2d4d8] bg-[#fff5f6] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b94456]">Dica</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-[#7f2432]">
              <Sparkles className="h-4 w-4" />
              Complete o perfil para mais conversão
            </p>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-[22px] border border-[#ececf0] bg-[#f4f4f6] p-1.5 lg:grid-cols-4">
          <TabsTrigger
            value="empresa"
            className="flex h-11 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
          >
            <Building2 className="h-4 w-4 text-[#EF3333]" />
            Empresa
          </TabsTrigger>
          <TabsTrigger
            value="faturamento"
            className="flex h-11 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
          >
            <CreditCard className="h-4 w-4 text-[#EF3333]" />
            Faturamento
          </TabsTrigger>
          <TabsTrigger
            value="integracoes"
            className="flex h-11 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#EF3333]" />
            Integrações/APIs
          </TabsTrigger>
          <TabsTrigger
            value="apis"
            className="flex h-11 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
          >
            <KeyRound className="h-4 w-4 text-[#EF3333]" />
            Chaves IAs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-0">
          <Card className={cardClass}>
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-[#1A1A1A]">Logo da Empresa</Label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-lg border border-[#e6e6eb] object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#f5f5f7]">
                      <Building2 className="h-8 w-8 text-[#7b7b83]" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2 border-[#e6e6eb] hover:bg-[#f8f8fa]" asChild>
                      <span>
                        <Upload className="h-4 w-4" />
                        {uploading ? 'Enviando...' : 'Upload'}
                      </span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fullName" className="text-sm text-[#1A1A1A]">
                    Nome completo
                  </Label>
                  <Input id="fullName" className={fieldClass} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do responsável" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyName" className="text-sm text-[#1A1A1A]">
                    Nome da Empresa
                  </Label>
                  <Input id="companyName" className={fieldClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Sua empresa" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentNumber" className="text-sm text-[#1A1A1A]">
                    CPF ou CNPJ
                  </Label>
                  <Input
                    id="documentNumber"
                    className={`${fieldClass} bg-[#f7f7fa] text-[#65656d]`}
                    value={formatCpfCnpj(documentNumber)}
                    readOnly
                    disabled
                    placeholder="Documento principal"
                  />
                  <p className="text-xs text-[#6d6d75]">Esse documento define o perfil da empresa e não pode ser alterado após o cadastro.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settingsEmail" className="text-sm text-[#1A1A1A]">
                    Email de acesso
                  </Label>
                  <Input id="settingsEmail" className={`${fieldClass} bg-[#f7f7fa] text-[#65656d]`} type="email" value={email} readOnly disabled placeholder="contato@empresa.com" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-[#6d6d75]">O email de acesso só pode ser alterado com verificação.</p>
                    <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl border-[#f1d2d7] text-[#b2374b] hover:bg-[#fff3f5]" onClick={() => setEmailChangeDialogOpen(true)}>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Alterar com verificação
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settingsPhone" className="text-sm text-[#1A1A1A]">
                    Telefone
                  </Label>
                  <Input id="settingsPhone" className={fieldClass} value={phone} onChange={(e) => setPhone(formatBrazilPhone(e.target.value))} placeholder="(11) 99999-9999" />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="h-12 w-full rounded-xl gradient-primary text-primary-foreground font-semibold gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="faturamento" className="mt-0">
          <div className="space-y-5">
            {/* Pricing model notice */}
            <div className="rounded-2xl border border-[#f2d4d8] bg-[#fff5f6] px-5 py-4">
              <p className="text-sm font-semibold text-[#7f2432]">Modelo de custo transparente</p>
              <p className="mt-1 text-sm text-[#9b4458] leading-relaxed">
                A plataforma custa <span className="font-bold">R$ 79,90/mes</span>. As APIs de IA (Gemini, etc.) e o Firecrawl sao contratados separadamente, diretamente com cada provedor. Voce tem controle total sobre esses gastos — a plataforma nao cobra margem sobre eles.
              </p>
            </div>

            <Card className={cardClass}>
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#1A1A1A]">
                <BarChart3 className="h-5 w-5 text-[#EF3333]" />
                Uso do Mês
              </h3>
              {subLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[#7b7b83]" />
                </div>
              ) : (
                <div className="space-y-4">
                  {usageItems.map((item) => {
                    const isUnlimited = item.limit === -1;
                    const pct = isUnlimited ? 0 : Math.min(100, (item.used / item.limit) * 100);
                    const isNearLimit = !isUnlimited && pct >= 80;
                    return (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#1A1A1A]">{item.label}</span>
                          <span className={`font-medium ${isNearLimit ? 'text-[#bc374e]' : 'text-[#6d6d75]'}`}>
                            {item.used} / {isUnlimited ? 'sem limite' : item.limit}
                          </span>
                        </div>
                        {!isUnlimited && <Progress value={pct} className={`h-2 ${isNearLimit ? '[&>div]:bg-[#bc374e]' : ''}`} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className={cardClass}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-[#1A1A1A]">
                  <Crown className="h-5 w-5 text-[#EF3333]" />
                  Plano Atual
                </h3>
                <Badge variant="outline" className="rounded-full border-[#f2d4d8] bg-[#fff3f5] text-[#9b2a3d] capitalize">
                  {plans.find((p) => p.id === currentPlan)?.name || currentPlan}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {plans.map((plan) => {
                  const isCurrent = plan.id === currentPlan;
                  const priceFormatted = plan.price_cents === 0 ? 'R$ 0' : `R$ ${(plan.price_cents / 100).toFixed(0)}`;
                  return (
                    <div
                      key={plan.id}
                      className={`space-y-3 rounded-xl border p-4 transition-all ${
                        isCurrent ? 'border-[#f2d4d8] bg-[#fff5f6] ring-1 ring-[#ef3333]/20' : 'border-[#e7e7ec] hover:border-[#d8d8de]'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-[#1A1A1A]">{plan.name}</p>
                        <p className="text-xl font-bold text-[#1A1A1A]">
                          {priceFormatted}
                          <span className="text-xs font-normal text-[#6d6d75]">/mês</span>
                        </p>
                      </div>
                      <ul className="space-y-1.5">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-[#6d6d75]">
                            <Check className="h-3 w-3 shrink-0 text-[#EF3333]" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {isCurrent ? (
                        <Button variant="outline" size="sm" className="w-full rounded-xl" disabled>
                          Plano atual
                        </Button>
                      ) : !plan.stripe_price_id ? (
                        currentPlan !== 'free' ? (
                          <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={handleManageSubscription}>
                            Gerenciar
                          </Button>
                        ) : null
                      ) : (
                        <Button size="sm" className="w-full rounded-xl gap-1 gradient-primary text-primary-foreground" onClick={() => handleUpgrade(plan.id)} disabled={checkoutLoading === plan.id}>
                          {checkoutLoading === plan.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                          Fazer upgrade
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {currentPlan !== 'free' && (
                <div className="pt-4">
                  <Button variant="outline" size="sm" className="rounded-xl gap-2 border-[#e6e6eb] hover:bg-[#f8f8fa]" onClick={handleManageSubscription}>
                    <ExternalLink className="h-4 w-4" />
                    Gerenciar assinatura no portal
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integracoes" className="mt-0">
          <Card className={cardClass}>
            <div className="space-y-6">
              <div>
                <h3 className="mb-1 font-semibold text-[#1A1A1A]">Integrações</h3>
                <p className="text-sm text-[#6d6d75]">Clique em um card para configurar a integração.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={() => openIntegration('whatsapp')}
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

                {/* Email */}
                <button
                  type="button"
                  onClick={() => openIntegration('email')}
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
                    <Badge className="rounded-full border-[#cde8d9] bg-[#f0faf4] text-[10px] text-[#2d7a4a]">Configurado</Badge>
                  )}
                </button>

                {/* Webhook n8n */}
                <button
                  type="button"
                  onClick={() => openIntegration('webhook')}
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

                {/* Domínio */}
                <button
                  type="button"
                  onClick={() => openIntegration('dominio')}
                  className="group flex flex-col items-start gap-3 rounded-2xl border border-[#ececf0] bg-white p-5 text-left transition-all hover:border-[#d9e4ff] hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#356DFF]/10">
                    <Globe className="h-6 w-6 text-[#356DFF]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">Domínio</p>
                    <p className="mt-0.5 text-xs text-[#6d6d75]">Configure o domínio do link das propostas</p>
                  </div>
                  {proposalLinkDomain && (
                    <Badge className="rounded-full border-[#cde8d9] bg-[#f0faf4] text-[10px] text-[#2d7a4a]">Configurado</Badge>
                  )}
                </button>

                {/* Firecrawl */}
                <button
                  type="button"
                  onClick={() => openIntegration('firecrawl')}
                  className="group flex flex-col items-start gap-3 rounded-2xl border border-[#ececf0] bg-white p-5 text-left transition-all hover:border-[#d9e4ff] hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EF3333]/10">
                    <Flame className="h-6 w-6 text-[#EF3333]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">Firecrawl</p>
                    <p className="mt-0.5 text-xs text-[#6d6d75]">Raspagem automática de sites de prospects</p>
                  </div>
                  {firecrawlApiKey ? (
                    <Badge className="rounded-full border-[#cde8d9] bg-[#f0faf4] text-[10px] text-[#2d7a4a]">Chave própria</Badge>
                  ) : (
                    <Badge className="rounded-full border-[#e6e6eb] bg-[#fafafd] text-[10px] text-[#7b7b83]">Chave padrão</Badge>
                  )}
                </button>

                {/* ElevenLabs */}
                <button
                  type="button"
                  onClick={() => openIntegration('elevenlabs')}
                  className="group flex flex-col items-start gap-3 rounded-2xl border border-[#ececf0] bg-white p-5 text-left transition-all hover:border-[#d9e4ff] hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B5CF6]/10">
                    <Mic className="h-6 w-6 text-[#8B5CF6]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">ElevenLabs</p>
                    <p className="mt-0.5 text-xs text-[#6d6d75]">Envie áudios com sua voz clonada nas propostas</p>
                  </div>
                  {voiceId && (
                    <Badge className="rounded-full border-[#cde8d9] bg-[#f0faf4] text-[10px] text-[#2d7a4a]">Configurado</Badge>
                  )}
                </button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ═══════ DIALOG: WhatsApp ═══════ */}
        <Dialog open={activeIntegration === 'whatsapp'} onOpenChange={(open) => !open && closeIntegration('whatsapp')}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl rounded-[22px] border border-[#ececf0] bg-white p-0">
            <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10">
                <MessageCircle className="h-5 w-5 text-[#25D366]" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-[#1A1A1A]">WhatsApp — Meta Cloud API</DialogTitle>
                <DialogDescription className="text-xs text-[#6d6d75]">Configure suas credenciais da Meta para enviar mensagens via WhatsApp oficial.</DialogDescription>
              </div>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="flex items-center justify-between rounded-2xl border border-[#d9e4ff] bg-[#f4f7ff] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">Modo WhatsApp</p>
                  <p className="text-xs text-[#5a5a62]">Somente Meta Cloud API oficial permanece habilitada.</p>
                </div>
                <Badge className="rounded-full border-[#d9e4ff] bg-white text-[#365fc2]">Oficial</Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm text-[#1A1A1A]">Meta Access Token</Label>
                  <Input type="password" className={fieldClass} value={whatsAppDraft.accessToken} onChange={(e) => { setWhatsAppDraft((prev) => ({ ...prev, accessToken: e.target.value })); setMetaStatus('idle'); setMetaStatusInfo({}); }} placeholder="Cole o token permanente da Meta" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-[#1A1A1A]">Phone Number ID</Label>
                  <Input className={fieldClass} value={whatsAppDraft.phoneNumberId} onChange={(e) => { setWhatsAppDraft((prev) => ({ ...prev, phoneNumberId: e.target.value })); setMetaStatus('idle'); setMetaStatusInfo({}); }} placeholder="Ex: 123456789012345" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm text-[#1A1A1A]">
                    WABA ID <span className="text-[#9b9ba3] font-normal">(WhatsApp Business Account ID)</span>
                  </Label>
                  <Input className={fieldClass} value={whatsAppDraft.wabaId} onChange={(e) => { setWhatsAppDraft((prev) => ({ ...prev, wabaId: e.target.value })); setMetaStatus('idle'); setMetaStatusInfo({}); }} placeholder="Ex: 102098765432100" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={handleTestMetaConnection} disabled={metaStatus === 'testing' || !whatsAppDraft.accessToken.trim() || !whatsAppDraft.phoneNumberId.trim()} className="h-9 rounded-xl border-[#e0e0e8] gap-2">
                  {metaStatus === 'testing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                  Testar conexão
                </Button>
                {metaStatus === 'connected' && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#cde8d9] bg-[#eef8f3] px-3 py-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#1f8f47]" />
                    <span className="text-sm font-medium text-[#1f6e38]">
                      {metaStatusInfo.displayPhoneNumber ? `${metaStatusInfo.verifiedName || 'Conectado'} · ${metaStatusInfo.displayPhoneNumber}` : 'Conectado'}
                    </span>
                    {metaStatusInfo.qualityRating && <Badge className="rounded-full border-[#cde8d9] bg-white text-[#2a7a50] text-[10px] px-2">{metaStatusInfo.qualityRating}</Badge>}
                  </div>
                )}
                {metaStatus === 'error' && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#f2d4d8] bg-[#fff3f5] px-3 py-1.5">
                    <WifiOff className="h-4 w-4 text-[#b2374b]" />
                    <span className="text-sm text-[#8c2535]">{metaStatusInfo.error || 'Credenciais inválidas'}</span>
                  </div>
                )}
              </div>

              {metaStatusInfo.readiness && (
                <div className={`rounded-2xl border p-4 space-y-4 ${metaStatusInfo.readiness === 'ready' ? 'border-[#cde8d9] bg-[#eef8f3]' : metaStatusInfo.readiness === 'partial' ? 'border-[#f5c842]/40 bg-[#fffbeb]' : 'border-[#f2d4d8] bg-[#fff3f5]'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8b92]">Prontidão da integração</p>
                      <p className="text-sm text-[#44444c]">{metaStatusInfo.summary || 'Diagnóstico da integração oficial do WhatsApp.'}</p>
                    </div>
                    <Badge className={`rounded-full px-2.5 py-1 text-[10px] ${metaStatusInfo.readiness === 'ready' ? 'border-[#cde8d9] bg-white text-[#1f6e38]' : metaStatusInfo.readiness === 'partial' ? 'border-[#f5c842]/50 bg-white text-[#8b5e00]' : 'border-[#f2d4d8] bg-white text-[#8c2535]'}`}>
                      {metaStatusInfo.readiness === 'ready' ? 'Pronta' : metaStatusInfo.readiness === 'partial' ? 'Parcial' : 'Bloqueada'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {(metaStatusInfo.checks || []).map((check) => (
                      <div key={check.key} className="flex gap-2 rounded-xl border border-[#e7e7ee] bg-white/85 p-3">
                        {check.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1f8f47]" /> : check.severity === 'danger' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b2374b]" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#d97706]" />}
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-[#1A1A1A]">{check.label}</p>
                          <p className="text-[11px] leading-relaxed text-[#6d6d75]">{check.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {metaStatusInfo.issues && metaStatusInfo.issues.length > 0 && (
                    <div className="rounded-xl border border-[#e7e7ee] bg-white/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8b92]">Itens que exigem atenção</p>
                      <ul className="mt-2 space-y-2">
                        {metaStatusInfo.issues.map((issue) => (
                          <li key={issue.key} className="flex gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#d97706]" />
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-[#1A1A1A]">{issue.title}</p>
                              <p className="text-[11px] leading-relaxed text-[#6d6d75]">{issue.detail}</p>
                              {issue.action && <p className="text-[11px] leading-relaxed text-[#8b5e00]">Ação recomendada: {issue.action}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {metaStatusInfo.webhookUrl && (
                <div className="rounded-2xl border border-[#e8e8ef] bg-[#f5f5fa] p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8b92]">Configure no painel Meta Developer</p>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#5a5a62]">URL do Webhook</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={metaStatusInfo.webhookUrl} className="h-9 rounded-xl border-[#dcdce4] bg-white text-xs font-mono text-[#3a3a42]" />
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-xl border-[#dcdce4]" onClick={() => copyToClipboard(metaStatusInfo.webhookUrl!, 'URL do Webhook')}><Copy className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {metaStatusInfo.verifyToken && (
                    <div className="space-y-2">
                      <Label className="text-xs text-[#5a5a62]">Verify Token</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={metaStatusInfo.verifyToken} className="h-9 rounded-xl border-[#dcdce4] bg-white text-xs font-mono text-[#3a3a42]" />
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-xl border-[#dcdce4]" onClick={() => copyToClipboard(metaStatusInfo.verifyToken!, 'Verify Token')}><Copy className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-[#8b8b92]">No Meta for Developers: App → WhatsApp → Configuração → Webhooks → Editar → cole a URL e o Verify Token → Verificar → ative o campo <strong>messages</strong>.</p>
                </div>
              )}

              <button type="button" onClick={() => setShowMetaGuide((v) => !v)} className="flex items-center gap-1.5 text-xs text-[#6060c8] hover:text-[#4040a8] font-medium">
                {showMetaGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showMetaGuide ? 'Ocultar guia de configuração' : 'Como obter as credenciais Meta?'}
              </button>

              {showMetaGuide && (
                <div className="rounded-2xl border border-[#e4e4f0] bg-[#f8f8fd] p-4 text-sm text-[#44444c] space-y-3">
                  <p className="font-semibold text-[#1A1A1A]">Passo a passo — Meta WhatsApp Cloud API</p>
                  <ol className="space-y-2 list-none">
                    {[
                      'Acesse developers.facebook.com e crie um App do tipo "Business".',
                      'No app, va em "WhatsApp" → "Configuração" e adicione um número de telefone.',
                      'Copie o "Phone Number ID" que aparece na página de configuração — cole no campo acima.',
                      'Gere um Token de Acesso Permanente: va em "Configurações do Sistema" → "Usuários do Sistema" → adicione um usuário com permissão de administrador → gere o token com escopo "whatsapp_business_messaging".',
                      'Cole o token permanente no campo "Meta Access Token" acima.',
                      'Configure o META_WHATSAPP_APP_SECRET no Supabase para receber status de entrega e leitura.',
                      'Clique em "Testar conexão" para validar. Se der OK, salve as integrações.',
                      'Depois de salvar, clique novamente em "Testar conexão" para ver a URL do Webhook e o Verify Token.',
                      'No painel Meta: WhatsApp → Configuração → Webhooks → Editar → cole a URL e o Verify Token → ative o campo "messages".',
                    ].map((step, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8e8f8] text-[10px] font-bold text-[#5050b0]">{i + 1}</span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-[#8b8b92] pt-1">O custo de mensagens é cobrado diretamente pela Meta. As primeiras 1.000 conversas por mês são gratuitas.</p>
                </div>
              )}
            </div>
            <DialogFooter className="border-t border-[#f0f0f3] px-6 py-4">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => closeIntegration('whatsapp')}>Cancelar</Button>
              <Button onClick={handleSaveWhatsAppIntegration} disabled={savingIntegrations} className="h-11 rounded-xl gradient-primary text-primary-foreground gap-2">
                {savingIntegrations ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════ DIALOG: Email ═══════ */}
        <Dialog open={activeIntegration === 'email'} onOpenChange={(open) => !open && closeIntegration('email')}>
          <DialogContent className="sm:max-w-lg rounded-[22px] border border-[#ececf0] bg-white p-0">
            <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EA4335]/10">
                <Mail className="h-5 w-5 text-[#EA4335]" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-[#1A1A1A]">Configuração de E-Mail</DialogTitle>
                <DialogDescription className="text-xs text-[#6d6d75]">Configure o remetente das propostas e campanhas por email.</DialogDescription>
              </div>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="space-y-2">
                <Label className="text-sm text-[#1A1A1A]">Email remetente das propostas</Label>
                <Input className={fieldClass} type="email" value={emailDraft.senderEmail} onChange={(e) => setEmailDraft((prev) => ({ ...prev, senderEmail: e.target.value }))} placeholder="Ex: comercial@seudominio.com" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#1A1A1A]">Nome do remetente (opcional)</Label>
                <Input className={fieldClass} value={emailDraft.senderName} onChange={(e) => setEmailDraft((prev) => ({ ...prev, senderName: e.target.value }))} placeholder="Ex: Equipe EnvPRO" />
              </div>
            </div>
            <DialogFooter className="border-t border-[#f0f0f3] px-6 py-4">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => closeIntegration('email')}>Cancelar</Button>
              <Button onClick={handleSaveEmailIntegration} disabled={savingIntegrations} className="h-11 rounded-xl gradient-primary text-primary-foreground gap-2">
                {savingIntegrations ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════ DIALOG: Webhook n8n ═══════ */}
        <Dialog open={activeIntegration === 'webhook'} onOpenChange={(open) => !open && closeIntegration('webhook')}>
          <DialogContent className="sm:max-w-lg rounded-[22px] border border-[#ececf0] bg-white p-0">
            <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6D00]/10">
                <Webhook className="h-5 w-5 text-[#FF6D00]" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-[#1A1A1A]">Webhook das Campanhas</DialogTitle>
                <DialogDescription className="text-xs text-[#6d6d75]">Envie leads via POST para n8n ou outro orquestrador HTTP.</DialogDescription>
              </div>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="space-y-2">
                <Label className="text-sm text-[#1A1A1A]">URL do Webhook</Label>
                <Input className={fieldClass} value={webhookDraft.url} onChange={(e) => setWebhookDraft((prev) => ({ ...prev, url: e.target.value }))} placeholder="https://seu-n8n.com/webhook/..." />
                <p className="text-xs text-[#6d6d75]">Cada lead da campanha será enviado por POST para essa URL.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#1A1A1A]">Segredo do webhook (opcional)</Label>
                <Input type="password" className={fieldClass} value={webhookDraft.secret} onChange={(e) => setWebhookDraft((prev) => ({ ...prev, secret: e.target.value }))} placeholder="Token para validar a requisição no n8n" />
                <p className="text-xs text-[#6d6d75]">Se preenchido, o valor será enviado no header <span className="font-mono">X-N8N-Webhook-Secret</span>.</p>
              </div>
            </div>
            <DialogFooter className="border-t border-[#f0f0f3] px-6 py-4">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => closeIntegration('webhook')}>Cancelar</Button>
              <Button onClick={handleSaveWebhookIntegration} disabled={savingIntegrations} className="h-11 rounded-xl gradient-primary text-primary-foreground gap-2">
                {savingIntegrations ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════ DIALOG: Domínio ═══════ */}
        <Dialog open={activeIntegration === 'dominio'} onOpenChange={(open) => !open && closeIntegration('dominio')}>
          <DialogContent className="sm:max-w-lg rounded-[22px] border border-[#ececf0] bg-white p-0">
            <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#356DFF]/10">
                <Globe className="h-5 w-5 text-[#356DFF]" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-[#1A1A1A]">Domínio das Propostas</DialogTitle>
                <DialogDescription className="text-xs text-[#6d6d75]">Configure o domínio usado nos links das propostas enviadas.</DialogDescription>
              </div>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="space-y-2">
                <Label className="text-sm text-[#1A1A1A]">Domínio do link das propostas</Label>
                <Input className={fieldClass} value={domainDraft} onChange={(e) => setDomainDraft(e.target.value)} placeholder="Ex: app.seudominio.com" />
                <p className="text-xs text-[#7b7b83]">Use o domínio sem barra final. Pode informar com ou sem https://.</p>
              </div>
            </div>
            <DialogFooter className="border-t border-[#f0f0f3] px-6 py-4">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => closeIntegration('dominio')}>Cancelar</Button>
              <Button onClick={handleSaveDomainIntegration} disabled={savingIntegrations} className="h-11 rounded-xl gradient-primary text-primary-foreground gap-2">
                {savingIntegrations ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════ DIALOG: Firecrawl ═══════ */}
        <Dialog open={activeIntegration === 'firecrawl'} onOpenChange={(open) => !open && closeIntegration('firecrawl')}>
          <DialogContent className="sm:max-w-lg rounded-[22px] border border-[#ececf0] bg-white p-0">
            <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EF3333]/10">
                <Flame className="h-5 w-5 text-[#EF3333]" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-[#1A1A1A]">Firecrawl</DialogTitle>
                <DialogDescription className="text-xs text-[#6d6d75]">Chave usada para buscar e raspar sites de prospects automaticamente.</DialogDescription>
              </div>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <a href="https://firecrawl.dev" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-[#e6e6eb] bg-white px-2 py-0.5 text-[11px] font-medium text-[#356DFF] hover:bg-[#f0f4ff] transition-colors">
                  <ExternalLink className="h-3 w-3" /> firecrawl.dev
                </a>
                <button type="button" onClick={() => setShowFirecrawlGuide(true)} className="inline-flex items-center gap-1 rounded-md border border-[#e6e6eb] bg-white px-2 py-0.5 text-[11px] font-medium text-[#6d6d75] hover:bg-[#f5f5f7] transition-colors">Como obter minha chave?</button>
                {firecrawlApiKey && <span className="ml-auto rounded-full border border-[#d1f0dd] bg-[#f0faf4] px-2 py-0.5 text-[10px] font-semibold text-[#2d7a4a]">Configurada</span>}
              </div>

              {firecrawlApiKey && (
                <div className="flex items-center justify-between rounded-xl border border-[#ececf0] bg-[#fafafd] px-3 py-2">
                  <p className="text-xs text-[#6d6d75]">Chave atual: <span className="font-mono">{maskApiKey(firecrawlApiKey)}</span></p>
                  <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs text-[#b2374b] hover:bg-[#fff3f5]" onClick={handleRemoveFirecrawlKey}>
                    <Trash2 className="mr-1 h-3 w-3" /> Remover
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input type={showFirecrawlKey ? 'text' : 'password'} className={`${fieldClass} pr-10`} value={firecrawlApiKeyInput} onChange={(e) => { setFirecrawlApiKeyInput(e.target.value); setFirecrawlValidationStatus('idle'); }} placeholder={firecrawlApiKey ? 'Nova chave para substituir a atual' : 'Cole sua chave Firecrawl aqui'} onPaste={() => setFirecrawlValidationStatus('idle')} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9b9ba3] hover:text-[#1A1A1A]" onClick={() => setShowFirecrawlKey((v) => !v)}>
                    {showFirecrawlKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="outline" className="h-11 rounded-xl border-[#e6e6eb] gap-1.5 text-sm" disabled={!firecrawlApiKeyInput.trim() || validatingFirecrawl} onClick={handleValidateFirecrawlKey}>
                  {validatingFirecrawl ? <Loader2 className="h-4 w-4 animate-spin" /> : firecrawlValidationStatus === 'valid' ? <CheckCircle2 className="h-4 w-4 text-[#2d7a4a]" /> : firecrawlValidationStatus === 'invalid' ? <XCircle className="h-4 w-4 text-[#b2374b]" /> : <ShieldCheck className="h-4 w-4" />}
                  Validar
                </Button>
                <Button className="h-11 rounded-xl bg-[#EF3333] gap-1.5 text-sm text-white hover:bg-[#d42d2d]" disabled={!firecrawlApiKeyInput.trim() || savingFirecrawlKey} onClick={handleSaveFirecrawlKey}>
                  {savingFirecrawlKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Salvar
                </Button>
              </div>

              {firecrawlValidationStatus === 'valid' && <p className="flex items-center gap-1 text-xs text-[#2d7a4a]"><CheckCircle2 className="h-3 w-3" /> Chave validada com sucesso.</p>}
              {firecrawlValidationStatus === 'invalid' && <p className="flex items-center gap-1 text-xs text-[#b2374b]"><XCircle className="h-3 w-3" /> Chave inválida. Verifique e tente novamente.</p>}
              {!firecrawlApiKey && firecrawlValidationStatus === 'idle' && <p className="text-xs text-[#7b7b83]">Sem chave configurada será usada a chave padrão do sistema.</p>}
            </div>
            <DialogFooter className="border-t border-[#f0f0f3] px-6 py-4">
              <Button type="button" className="rounded-xl" onClick={() => closeIntegration('firecrawl')}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════ DIALOG: ElevenLabs ═══════ */}
        <Dialog open={activeIntegration === 'elevenlabs'} onOpenChange={(open) => !open && closeIntegration('elevenlabs')}>
          <DialogContent className="sm:max-w-lg rounded-[22px] border border-[#ececf0] bg-white p-0">
            <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/10">
                <Mic className="h-5 w-5 text-[#8B5CF6]" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-[#1A1A1A]">ElevenLabs</DialogTitle>
                <DialogDescription className="text-xs text-[#6d6d75]">Voice ID para enviar áudios com sua voz clonada nas propostas.</DialogDescription>
              </div>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="flex items-center gap-2">
                <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-[#e6e6eb] bg-white px-2 py-0.5 text-[11px] font-medium text-[#356DFF] hover:bg-[#f0f4ff] transition-colors">
                  <ExternalLink className="h-3 w-3" /> elevenlabs.io
                </a>
                {voiceId && <span className="ml-auto rounded-full border border-[#d1f0dd] bg-[#f0faf4] px-2 py-0.5 text-[10px] font-semibold text-[#2d7a4a]">Configurado</span>}
              </div>
              <div className="space-y-1">
                <Input id="voiceId" className={fieldClass} value={voiceIdDraft} onChange={(e) => setVoiceIdDraft(e.target.value)} placeholder="Cole aqui o ID da sua voz clonada" />
                <p className="text-xs text-[#6d6d75]">
                  Clone sua voz no{' '}
                  <a href="https://elevenlabs.io/voice-lab" target="_blank" rel="noopener noreferrer" className="text-[#b22b40] hover:underline">ElevenLabs Voice Lab</a>
                  {' '}e cole o Voice ID aqui.
                </p>
              </div>
            </div>
            <DialogFooter className="border-t border-[#f0f0f3] px-6 py-4">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => closeIntegration('elevenlabs')}>Cancelar</Button>
              <Button onClick={handleSaveElevenLabsIntegration} disabled={savingIntegrations} className="h-11 rounded-xl gradient-primary text-primary-foreground gap-2">
                {savingIntegrations ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <TabsContent value="apis" className="mt-0">
          <Card className={cardClass}>
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold text-[#1A1A1A]">
                    <Bot className="h-5 w-5 text-[#EF3333]" />
                    Chaves de API de IA
                  </h3>
                  <p className="mt-1 text-sm text-[#6d6d75]">Conecte quantos provedores de IA quiser. O custo das APIs e cobrado diretamente pelos provedores — voce tem controle total. Configure sua chave Firecrawl na aba Integracoes.</p>
                </div>
                <Badge variant="outline" className="rounded-full border-[#f2d4d8] bg-[#fff3f5] text-[#9b2a3d]">
                  {apiKeys.length} conectada{apiKeys.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="rounded-2xl border border-[#ececf0] bg-[#fafafd] p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[210px_1fr]">
                  <div className="space-y-2">
                    <Label className="text-sm text-[#1A1A1A]">Provedor</Label>
                    <Select value={apiProvider} onValueChange={(value) => setApiProvider(value as ApiProvider)}>
                      <SelectTrigger className={fieldClass}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {API_PROVIDER_OPTIONS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-[#1A1A1A]">Chave da API</Label>
                    <Input
                      type="password"
                      className={fieldClass}
                      value={providerApiKey}
                      onChange={(e) => setProviderApiKey(e.target.value)}
                      placeholder="Cole sua chave aqui"
                    />
                  </div>
                </div>

                {apiProvider === 'other' && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-sm text-[#1A1A1A]">Nome do provedor</Label>
                    <Input
                      className={fieldClass}
                      value={customProviderName}
                      onChange={(e) => setCustomProviderName(e.target.value)}
                      placeholder="Ex: Together, Anthropic API..."
                    />
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button onClick={handleSaveApiKey} disabled={!canSaveApiKey} className="h-11 rounded-xl gradient-primary text-primary-foreground gap-2">
                    {savingApiKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {providerAlreadyConnected ? 'Atualizar chave' : 'Salvar chave'}
                  </Button>
                  <p className="text-xs text-[#7b7b83]">As chaves ficam vinculadas apenas ao seu usuário. O gasto com tokens é cobrado diretamente pelo provedor de IA.</p>
                </div>
              </div>

              <div className="space-y-3">
                {loadingApiKeys ? (
                  <div className="flex items-center justify-center rounded-2xl border border-[#ececf0] bg-[#fafafd] py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[#7b7b83]" />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#e3e3e8] bg-[#fafafd] px-4 py-6 text-sm text-[#7b7b83]">
                    Nenhuma chave cadastrada ainda.
                  </div>
                ) : (
                  apiKeys.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ececf0] bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A1A]">{providerLabel(item.provider, item.custom_provider)}</p>
                        <p className="mt-0.5 text-xs text-[#6d6d75]">{maskApiKey(item.api_key)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-xl border-[#f1d2d7] text-[#b2374b] hover:bg-[#fff3f5]"
                        onClick={() => handleDeleteApiKey(item.id)}
                        disabled={deletingApiKeyId === item.id}
                      >
                        {deletingApiKeyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Remover
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={emailChangeDialogOpen} onOpenChange={setEmailChangeDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[22px] border border-[#ececf0] bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">Alterar email de acesso</DialogTitle>
            <DialogDescription className="text-[#6d6d75]">
              Enviaremos um link de verificação para o novo email. A troca só será concluída depois da confirmação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pendingAccessEmail" className="text-sm text-[#1A1A1A]">
                Novo email
              </Label>
              <Input
                id="pendingAccessEmail"
                type="email"
                className={fieldClass}
                value={pendingAccessEmail}
                onChange={(e) => setPendingAccessEmail(e.target.value)}
                placeholder="novoemail@empresa.com"
              />
            </div>

            <div className="rounded-xl border border-[#ececf0] bg-[#fafafd] p-3 text-xs text-[#6d6d75]">
              Email atual: <span className="font-semibold text-[#1A1A1A]">{email || 'nao informado'}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEmailChangeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" className="rounded-xl gradient-primary text-primary-foreground" onClick={handleRequestEmailChange} disabled={sendingAccessEmailChange}>
              {sendingAccessEmailChange ? 'Enviando...' : 'Enviar verificação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Firecrawl Guide Modal */}
      <Dialog open={showFirecrawlGuide} onOpenChange={setShowFirecrawlGuide}>
        <DialogContent className="sm:max-w-lg rounded-[22px] border border-[#ececf0] bg-white p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EF3333]/10">
              <Flame className="h-5 w-5 text-[#EF3333]" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-[#1A1A1A]">
                Como obter sua chave Firecrawl
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6d6d75]">
                Siga os passos abaixo para criar sua conta e copiar a chave.
              </DialogDescription>
            </div>
          </div>

          {/* Steps */}
          <div className="px-6 py-5">
            <ol className="space-y-4">
              {[
                {
                  step: 1,
                  title: 'Acesse o site do Firecrawl',
                  description: (
                    <>
                      Abra{' '}
                      <a
                        href="https://firecrawl.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 font-medium text-[#356DFF] underline-offset-2 hover:underline"
                      >
                        firecrawl.dev <ExternalLink className="h-3 w-3" />
                      </a>{' '}
                      no navegador e clique em <strong>Get Started</strong> ou <strong>Sign Up</strong>.
                    </>
                  ),
                },
                {
                  step: 2,
                  title: 'Crie sua conta gratuitamente',
                  description: 'Cadastre-se com seu email ou conta Google. O plano gratuito já inclui créditos suficientes para começar.',
                },
                {
                  step: 3,
                  title: 'Acesse o painel da API',
                  description: (
                    <>
                      Após entrar, vá no menu lateral e clique em <strong>API Keys</strong> ou acesse diretamente{' '}
                      <a
                        href="https://www.firecrawl.dev/app/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 font-medium text-[#356DFF] underline-offset-2 hover:underline"
                      >
                        firecrawl.dev/app/api-keys <ExternalLink className="h-3 w-3" />
                      </a>.
                    </>
                  ),
                },
                {
                  step: 4,
                  title: 'Gere uma nova chave',
                  description: 'Clique em "Create new key", dê um nome para identificar (ex: "Prospecta") e confirme.',
                },
                {
                  step: 5,
                  title: 'Copie e cole aqui',
                  description: 'Copie a chave gerada (começa com "fc-..."), volte para esta página, cole no campo acima e clique em Validar.',
                },
              ].map(({ step, title, description }) => (
                <li key={step} className="flex gap-4">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#EF3333] text-xs font-bold text-white">
                    {step}
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-semibold text-[#1A1A1A]">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#6d6d75]">{description}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-5 rounded-xl border border-[#e6f0ff] bg-[#f0f6ff] p-3">
              <p className="text-xs text-[#356DFF]">
                <strong>Dica:</strong> O plano gratuito do Firecrawl oferece 500 credits/mes — suficiente para centenas de buscas. Para uso intenso, considere o plano pago.
              </p>
            </div>
          </div>

          <DialogFooter className="border-t border-[#f0f0f3] px-6 py-4">
            <a
              href="https://firecrawl.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#356DFF] px-4 text-sm font-medium text-[#356DFF] hover:bg-[#f0f6ff] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir Firecrawl
            </a>
            <Button
              type="button"
              className="h-9 rounded-xl bg-[#EF3333] text-sm font-medium text-white hover:bg-[#d42d2d]"
              onClick={() => setShowFirecrawlGuide(false)}
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
