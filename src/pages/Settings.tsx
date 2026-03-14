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

const fieldClass = 'h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]';
const cardClass = 'rounded-[22px] border border-[#ececf0] bg-white p-6 shadow-[0_10px_24px_rgba(18,18,22,0.05)]';
const MAX_AI_KEYS = 2;

const SETTINGS_TABS = ['empresa', 'faturamento', 'integracoes', 'apis'] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];
type ApiProvider = 'gemini' | 'claude_code' | 'groq' | 'openai' | 'other';
type WhatsAppConnectionType = 'unofficial' | 'meta_official';

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
  { value: 'claude_code', label: 'Claude Code' },
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
  const [whatsAppConnectionType, setWhatsAppConnectionType] = useState<WhatsAppConnectionType>('unofficial');
  const [officialAccessToken, setOfficialAccessToken] = useState('');
  const [officialPhoneNumberId, setOfficialPhoneNumberId] = useState('');
  const [unofficialApiUrl, setUnofficialApiUrl] = useState('');
  const [unofficialApiToken, setUnofficialApiToken] = useState('');
  const [unofficialInstance, setUnofficialInstance] = useState('');
  const [campaignSenderEmail, setCampaignSenderEmail] = useState('');
  const [campaignSenderName, setCampaignSenderName] = useState('');
  const [proposalLinkDomain, setProposalLinkDomain] = useState('');

  const [apiKeys, setApiKeys] = useState<UserAiApiKey[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [deletingApiKeyId, setDeletingApiKeyId] = useState<string | null>(null);
  const [apiProvider, setApiProvider] = useState<ApiProvider>('gemini');
  const [customProviderName, setCustomProviderName] = useState('');
  const [providerApiKey, setProviderApiKey] = useState('');

  const providerAlreadyConnected = useMemo(() => apiKeys.some((item) => item.provider === apiProvider), [apiKeys, apiProvider]);
  const limitReachedForNewProvider = apiKeys.length >= MAX_AI_KEYS && !providerAlreadyConnected;
  const canSaveApiKey =
    providerApiKey.trim().length > 0 &&
    (apiProvider !== 'other' || customProviderName.trim().length > 0) &&
    !savingApiKey &&
    !limitReachedForNewProvider;

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
          setWhatsAppConnectionType((data.whatsapp_connection_type as WhatsAppConnectionType) || 'unofficial');
          setOfficialAccessToken(data.whatsapp_official_access_token || '');
          setOfficialPhoneNumberId(data.whatsapp_official_phone_number_id || '');
          setUnofficialApiUrl(data.whatsapp_unofficial_api_url || '');
          setUnofficialApiToken(data.whatsapp_unofficial_api_token || '');
          setUnofficialInstance(data.whatsapp_unofficial_instance || '');
          setCampaignSenderEmail(data.campaign_sender_email || '');
          setCampaignSenderName(data.campaign_sender_name || '');
          setProposalLinkDomain(data.proposal_link_domain || '');
        }
      });
  }, [user]);

  const loadApiKeys = async () => {
    if (!user) return;
    setLoadingApiKeys(true);
    const { data, error } = await supabase
      .from('user_ai_api_keys')
      .select('id, provider, custom_provider, api_key, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at');

    if (error) {
      toast({ title: 'Erro', description: 'Nao foi possivel carregar as chaves de API.', variant: 'destructive' });
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
      toast({ title: 'Campo obrigatorio', description: 'Informe o nome completo do responsavel.', variant: 'destructive' });
      return;
    }
    if (!companyName.trim()) {
      toast({ title: 'Campo obrigatorio', description: 'Informe o nome da empresa.', variant: 'destructive' });
      return;
    }
    if (!validateBrazilPhone(phone)) {
      toast({ title: 'Telefone invalido', description: 'Informe um telefone valido com DDD.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        company_name: companyName.trim(),
        company_logo_url: logoUrl,
        elevenlabs_voice_id: voiceId || null,
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
  };

  const handleRequestEmailChange = async () => {
    if (!pendingAccessEmail.trim()) {
      toast({ title: 'Campo obrigatorio', description: 'Informe o novo email de acesso.', variant: 'destructive' });
      return;
    }

    if (pendingAccessEmail.trim().toLowerCase() === (email || '').trim().toLowerCase()) {
      toast({ title: 'Sem alteracao', description: 'Informe um email diferente do atual.', variant: 'destructive' });
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
  };

  const handleSaveApiKey = async () => {
    if (!user) return;
    const apiKey = providerApiKey.trim();
    const customProvider = customProviderName.trim();

    if (!apiKey) {
      toast({ title: 'Campo obrigatorio', description: 'Informe uma chave de API valida.', variant: 'destructive' });
      return;
    }

    if (apiProvider === 'other' && !customProvider) {
      toast({ title: 'Campo obrigatorio', description: 'Informe o nome do provedor personalizado.', variant: 'destructive' });
      return;
    }

    if (limitReachedForNewProvider) {
      toast({
        title: 'Limite atingido',
        description: 'Voce pode conectar no maximo 2 provedores de IA.',
        variant: 'destructive',
      });
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
        description: 'Configuracao de API salva com sucesso.',
      });
      setProviderApiKey('');
      if (apiProvider === 'other') setCustomProviderName('');
      await loadApiKeys();
    }
    setSavingApiKey(false);
  };

  const handleDeleteApiKey = async (keyId: string) => {
    setDeletingApiKeyId(keyId);
    const { error } = await supabase.from('user_ai_api_keys').delete().eq('id', keyId);
    if (error) {
      toast({ title: 'Erro', description: 'Nao foi possivel remover a chave.', variant: 'destructive' });
    } else {
      setApiKeys((prev) => prev.filter((item) => item.id !== keyId));
      toast({ title: 'Removido', description: 'Chave de API removida com sucesso.' });
    }
    setDeletingApiKeyId(null);
  };

  const handleSaveIntegrations = async () => {
    if (!user) return;
    setSavingIntegrations(true);
    const payload = {
      whatsapp_connection_type: whatsAppConnectionType,
      whatsapp_official_access_token: officialAccessToken.trim() || null,
      whatsapp_official_phone_number_id: officialPhoneNumberId.trim() || null,
      whatsapp_unofficial_api_url: unofficialApiUrl.trim() || null,
      whatsapp_unofficial_api_token: unofficialApiToken.trim() || null,
      whatsapp_unofficial_instance: unofficialInstance.trim() || null,
      campaign_sender_email: campaignSenderEmail.trim() || null,
      campaign_sender_name: campaignSenderName.trim() || null,
      proposal_link_domain: proposalLinkDomain.trim() || null,
    };

    const { error } = await supabase.from('profiles').update(payload).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Integracoes atualizadas', description: 'Configuracoes de WhatsApp, email e dominio salvas.' });
    }
    setSavingIntegrations(false);
  };

  const handleUpgrade = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      await startCheckout(planId);
    } catch {
      toast({ title: 'Erro', description: 'Nao foi possivel iniciar o checkout.', variant: 'destructive' });
    }
    setCheckoutLoading(null);
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch {
      toast({ title: 'Erro', description: 'Nao foi possivel abrir o portal de gerenciamento.', variant: 'destructive' });
    }
  };

  const currentPlan = subscription?.plan || 'free';

  const usageItems = useMemo(
    () => [
      { label: 'Apresentacoes', used: subscription?.usage.presentations || 0, limit: subscription?.limits.presentations || 50 },
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
              Configuracoes
            </h1>
            <p className="mt-2 text-sm text-[#66666d] lg:text-base">Gerencie dados da empresa, assinatura, integracoes e chaves de IA no mesmo padrao visual do dashboard.</p>
          </div>
          <div className="rounded-2xl border border-[#f2d4d8] bg-[#fff5f6] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b94456]">Dica</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-[#7f2432]">
              <Sparkles className="h-4 w-4" />
              Complete o perfil para mais conversao
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
            Integracoes
          </TabsTrigger>
          <TabsTrigger
            value="apis"
            className="flex h-11 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
          >
            <KeyRound className="h-4 w-4 text-[#EF3333]" />
            APIs
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
                  <Input id="fullName" className={fieldClass} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do responsavel" />
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
                  <p className="text-xs text-[#6d6d75]">Esse documento define o perfil da empresa e nao pode ser alterado apos o cadastro.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settingsEmail" className="text-sm text-[#1A1A1A]">
                    Email de acesso
                  </Label>
                  <Input id="settingsEmail" className={`${fieldClass} bg-[#f7f7fa] text-[#65656d]`} type="email" value={email} readOnly disabled placeholder="contato@empresa.com" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-[#6d6d75]">O email de acesso so pode ser alterado com verificacao.</p>
                    <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl border-[#f1d2d7] text-[#b2374b] hover:bg-[#fff3f5]" onClick={() => setEmailChangeDialogOpen(true)}>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Alterar com verificacao
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

              <div className="space-y-2">
                <Label htmlFor="voiceId" className="flex items-center gap-2 text-sm text-[#1A1A1A]">
                  <Mic className="h-4 w-4 text-[#EF3333]" />
                  Voice ID do ElevenLabs
                </Label>
                <Input id="voiceId" className={fieldClass} value={voiceId} onChange={(e) => setVoiceId(e.target.value)} placeholder="Cole aqui o ID da sua voz clonada" />
                <p className="text-xs text-[#6d6d75]">
                  Clone sua voz no{' '}
                  <a href="https://elevenlabs.io/voice-lab" target="_blank" rel="noopener noreferrer" className="text-[#b22b40] hover:underline">
                    ElevenLabs Voice Lab
                  </a>{' '}
                  e cole o Voice ID aqui para enviar audios com sua voz.
                </p>
              </div>

              <Button onClick={handleSave} disabled={saving} className="h-12 w-full rounded-xl gradient-primary text-primary-foreground font-semibold gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar Configuracoes'}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="faturamento" className="mt-0">
          <div className="space-y-5">
            <Card className={cardClass}>
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#1A1A1A]">
                <BarChart3 className="h-5 w-5 text-[#EF3333]" />
                Uso do Mes
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
                          <span className="text-xs font-normal text-[#6d6d75]">/mes</span>
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
                <h3 className="mb-1 font-semibold text-[#1A1A1A]">Integracoes</h3>
                <p className="text-sm text-[#6d6d75]">Conecte WhatsApp oficial ou nao oficial, e configure email remetente e dominio dos links das propostas.</p>
              </div>

              <div className="rounded-2xl border border-[#ececf0] bg-[#fafafd] p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm text-[#1A1A1A]">Modo WhatsApp</Label>
                    <Select value={whatsAppConnectionType} onValueChange={(value) => setWhatsAppConnectionType(value as WhatsAppConnectionType)}>
                      <SelectTrigger className={fieldClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unofficial">Nao oficial (API externa)</SelectItem>
                        <SelectItem value="meta_official">Oficial (Meta Cloud API)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {whatsAppConnectionType === 'meta_official' ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm text-[#1A1A1A]">Meta Access Token</Label>
                        <Input
                          type="password"
                          className={fieldClass}
                          value={officialAccessToken}
                          onChange={(e) => setOfficialAccessToken(e.target.value)}
                          placeholder="Cole o token oficial da Meta"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-[#1A1A1A]">Phone Number ID</Label>
                        <Input
                          className={fieldClass}
                          value={officialPhoneNumberId}
                          onChange={(e) => setOfficialPhoneNumberId(e.target.value)}
                          placeholder="Ex: 123456789012345"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm text-[#1A1A1A]">URL da API nao oficial</Label>
                        <Input
                          className={fieldClass}
                          value={unofficialApiUrl}
                          onChange={(e) => setUnofficialApiUrl(e.target.value)}
                          placeholder="Ex: https://seu-servidor-evolution.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-[#1A1A1A]">Token da API nao oficial</Label>
                        <Input
                          type="password"
                          className={fieldClass}
                          value={unofficialApiToken}
                          onChange={(e) => setUnofficialApiToken(e.target.value)}
                          placeholder="Token da API externa"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm text-[#1A1A1A]">Instancia (opcional)</Label>
                        <Input
                          className={fieldClass}
                          value={unofficialInstance}
                          onChange={(e) => setUnofficialInstance(e.target.value)}
                          placeholder="Ex: prospecta-main"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm text-[#1A1A1A]">Email remetente das propostas</Label>
                    <Input
                      className={fieldClass}
                      type="email"
                      value={campaignSenderEmail}
                      onChange={(e) => setCampaignSenderEmail(e.target.value)}
                      placeholder="Ex: comercial@seudominio.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-[#1A1A1A]">Nome do remetente (opcional)</Label>
                    <Input
                      className={fieldClass}
                      value={campaignSenderName}
                      onChange={(e) => setCampaignSenderName(e.target.value)}
                      placeholder="Ex: Equipe EnvPRO"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-[#1A1A1A]">Dominio do link das propostas</Label>
                    <Input
                      className={fieldClass}
                      value={proposalLinkDomain}
                      onChange={(e) => setProposalLinkDomain(e.target.value)}
                      placeholder="Ex: app.seudominio.com"
                    />
                  </div>
                </div>

                <p className="mt-3 text-xs text-[#7b7b83]">Use o dominio sem barra final. Pode informar com ou sem https://.</p>

                <div className="mt-4">
                  <Button onClick={handleSaveIntegrations} disabled={savingIntegrations} className="h-11 rounded-xl gradient-primary text-primary-foreground gap-2">
                    {savingIntegrations ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Integracoes
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-[#ececf0] bg-white p-3">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-[#EF3333]" />
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">WhatsApp</p>
                      <p className="text-xs text-[#6d6d75]">{whatsAppConnectionType === 'meta_official' ? 'Meta Cloud API (oficial)' : 'API nao oficial configuravel'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#9b2a3d]">{whatsAppConnectionType === 'meta_official' ? 'Oficial' : 'Nao oficial'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#ececf0] bg-white p-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-[#EF3333]" />
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">Email e Link</p>
                      <p className="text-xs text-[#6d6d75]">{campaignSenderEmail || 'Remetente padrao'} / {proposalLinkDomain || 'Dominio padrao'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#9b2a3d]">Configuravel</span>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="apis" className="mt-0">
          <Card className={cardClass}>
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold text-[#1A1A1A]">
                    <Bot className="h-5 w-5 text-[#EF3333]" />
                    Chaves de API de IA
                  </h3>
                  <p className="mt-1 text-sm text-[#6d6d75]">Conecte ate 2 provedores de IA para usar suas proprias chaves. O consumo de Firecrawl permanece na infraestrutura da envPRO.</p>
                </div>
                <Badge variant="outline" className="rounded-full border-[#f2d4d8] bg-[#fff3f5] text-[#9b2a3d]">
                  {apiKeys.length}/{MAX_AI_KEYS} conectadas
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

                {limitReachedForNewProvider && (
                  <p className="mt-3 text-xs text-[#bc374e]">Limite de 2 provedores atingido. Remova um para adicionar outro.</p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button onClick={handleSaveApiKey} disabled={!canSaveApiKey} className="h-11 rounded-xl gradient-primary text-primary-foreground gap-2">
                    {savingApiKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {providerAlreadyConnected ? 'Atualizar chave' : 'Salvar chave'}
                  </Button>
                  <p className="text-xs text-[#7b7b83]">As chaves ficam vinculadas apenas ao seu usuario. Aqui o cliente cadastra somente a chave de IA.</p>
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
              Enviaremos um link de verificacao para o novo email. A troca so sera concluida depois da confirmacao.
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
              {sendingAccessEmailChange ? 'Enviando...' : 'Enviar verificacao'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
