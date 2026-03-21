import { useMemo, useState, useEffect } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { SettingsBillingSection } from '@/components/settings/SettingsBillingSection';
import { SettingsCompanySection } from '@/components/settings/SettingsCompanySection';
import { SettingsApiKeysSection } from '@/components/settings/SettingsApiKeysSection';
import { SettingsDialogs } from '@/components/settings/SettingsDialogs';
import { SettingsIntegrationsSection } from '@/components/settings/SettingsIntegrationsSection';
import { SettingsPageHeader } from '@/components/settings/SettingsPageHeader';
import { SettingsTabsNavigation } from '@/components/settings/SettingsTabsNavigation';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsApiKeys } from '@/hooks/settings/useSettingsApiKeys';
import { useSettingsProfile } from '@/hooks/settings/useSettingsProfile';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { formatBrazilPhone, formatCpfCnpj } from '@/lib/br-utils';
import { firecrawlGuideSteps } from '@/lib/settings/firecrawl-guide';

const SETTINGS_TABS = ['empresa', 'faturamento', 'integracoes', 'apis'] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

const resolveInitialTab = (): SettingsTab => {
  if (typeof window === 'undefined') return 'empresa';
  const tab = new URLSearchParams(window.location.search).get('tab');
  return SETTINGS_TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : 'empresa';
};


const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscription, plans, loading: subLoading, startCheckout, openCustomerPortal, refreshSubscription } = useSubscription();

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => resolveInitialTab());
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const {
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
  } = useSettingsProfile({ user, toast });

  const {
    apiKeys,
    loadingApiKeys,
    savingApiKey,
    deletingApiKeyId,
    apiProvider,
    setApiProvider,
    customProviderName,
    setCustomProviderName,
    providerApiKey,
    setProviderApiKey,
    providerAlreadyConnected,
    canSaveApiKey,
    handleSaveApiKey,
    handleDeleteApiKey,
  } = useSettingsApiKeys({ userId: user?.id, toast });

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
  const handleUpgrade = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      await startCheckout(planId);
    } catch {
      toast({ title: 'Erro', description: 'NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o foi possÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­vel iniciar o checkout.', variant: 'destructive' });
    }
    setCheckoutLoading(null);
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch {
      toast({ title: 'Erro', description: 'NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o foi possÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­vel abrir o portal de gerenciamento.', variant: 'destructive' });
    }
  };

  const currentPlan = subscription?.plan || 'free';

  const usageItems = useMemo(
    () => [
      { label: 'ApresentaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âµes', used: subscription?.usage.presentations || 0, limit: subscription?.limits.presentations || 50 },
      { label: 'Campanhas', used: subscription?.usage.campaigns || 0, limit: subscription?.limits.campaigns || 2 },
      { label: 'Emails enviados', used: subscription?.usage.emails || 0, limit: subscription?.limits.emails || 50 },
    ],
    [subscription]
  );

  return (
    <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
      <SettingsPageHeader />
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className="space-y-5">
        <SettingsTabsNavigation />
        <TabsContent value="empresa" className="mt-0">
          <SettingsCompanySection
            logoUrl={logoUrl}
            uploading={uploading}
            fullName={fullName}
            companyName={companyName}
            documentNumber={documentNumber}
            email={email}
            phone={phone}
            saving={saving}
            formattedDocumentNumber={formatCpfCnpj(documentNumber)}
            onLogoUpload={handleLogoUpload}
            onFullNameChange={setFullName}
            onCompanyNameChange={setCompanyName}
            onPhoneChange={(value) => setPhone(formatBrazilPhone(value))}
            onOpenEmailChange={() => setEmailChangeDialogOpen(true)}
            onSave={handleSave}
          />
        </TabsContent>
        <TabsContent value="faturamento" className="mt-0">
          <SettingsBillingSection
            subLoading={subLoading}
            usageItems={usageItems}
            plans={plans}
            currentPlan={currentPlan}
            checkoutLoading={checkoutLoading}
            onManageSubscription={handleManageSubscription}
            onUpgrade={handleUpgrade}
          />
        </TabsContent>
        <TabsContent value="integracoes" className="mt-0">
          <SettingsIntegrationsSection
            officialAccessToken={officialAccessToken}
            officialPhoneNumberId={officialPhoneNumberId}
            campaignSenderEmail={campaignSenderEmail}
            emailSenderStatus={emailSenderStatus}
            campaignWebhookUrl={campaignWebhookUrl}
            proposalLinkDomain={proposalLinkDomain}
            firecrawlApiKey={firecrawlApiKey}
            voiceId={voiceId}
            onOpenIntegration={openIntegration}
          />
        </TabsContent>
        <TabsContent value="apis" className="mt-0">
          <SettingsApiKeysSection
            apiKeys={apiKeys}
            loadingApiKeys={loadingApiKeys}
            savingApiKey={savingApiKey}
            deletingApiKeyId={deletingApiKeyId}
            apiProvider={apiProvider}
            customProviderName={customProviderName}
            providerApiKey={providerApiKey}
            canSaveApiKey={canSaveApiKey}
            providerAlreadyConnected={providerAlreadyConnected}
            onApiProviderChange={setApiProvider}
            onCustomProviderNameChange={setCustomProviderName}
            onProviderApiKeyChange={setProviderApiKey}
            onSaveApiKey={handleSaveApiKey}
            onDeleteApiKey={handleDeleteApiKey}
          />
        </TabsContent>
      </Tabs>
      <SettingsDialogs
        activeIntegration={activeIntegration}
        closeIntegration={closeIntegration}
        whatsApp={{
          draft: whatsAppDraft,
          setDraft: setWhatsAppDraft,
          saving: savingIntegrations,
          metaStatus,
          setMetaStatus,
          metaStatusInfo,
          setMetaStatusInfo,
          showGuide: showMetaGuide,
          setShowGuide: setShowMetaGuide,
          onTestConnection: handleTestMetaConnection,
          onCopyToClipboard: copyToClipboard,
          onSave: handleSaveWhatsAppIntegration,
        }}
        email={{
          draft: emailDraft,
          setDraft: setEmailDraft,
          campaignSenderEmail,
          saving: savingIntegrations,
          validating: validatingEmailSender,
          emailSenderStatus,
          emailSenderError,
          emailSenderInfo,
          setEmailSenderInfo,
          emailSenderDomain,
          emailSenderLastCheckedAt,
          emailSenderVerifiedAt,
          onValidate: handleValidateEmailSender,
          onSave: handleSaveEmailIntegration,
        }}
        webhook={{
          draft: webhookDraft,
          setDraft: setWebhookDraft,
          saving: savingIntegrations,
          onSave: handleSaveWebhookIntegration,
        }}
        domain={{
          draft: domainDraft,
          setDraft: setDomainDraft,
          saving: savingIntegrations,
          onSave: handleSaveDomainIntegration,
        }}
        firecrawl={{
          apiKey: firecrawlApiKey,
          input: firecrawlApiKeyInput,
          setInput: setFirecrawlApiKeyInput,
          showKey: showFirecrawlKey,
          setShowKey: setShowFirecrawlKey,
          validating: validatingFirecrawl,
          validationStatus: firecrawlValidationStatus,
          setValidationStatus: setFirecrawlValidationStatus,
          saving: savingFirecrawlKey,
          showGuide: showFirecrawlGuide,
          setShowGuide: setShowFirecrawlGuide,
          guideSteps: firecrawlGuideSteps,
          onValidate: handleValidateFirecrawlKey,
          onSave: handleSaveFirecrawlKey,
          onRemove: handleRemoveFirecrawlKey,
        }}
        elevenlabs={{
          configured: !!voiceId,
          draft: voiceIdDraft,
          setDraft: setVoiceIdDraft,
          saving: savingIntegrations,
          onSave: handleSaveElevenLabsIntegration,
        }}
        emailChange={{
          open: emailChangeDialogOpen,
          setOpen: setEmailChangeDialogOpen,
          email,
          pendingEmail: pendingAccessEmail,
          setPendingEmail: setPendingAccessEmail,
          sending: sendingAccessEmailChange,
          onSubmit: handleRequestEmailChange,
        }}
      />
    </div>
  );
};

export default Settings;
