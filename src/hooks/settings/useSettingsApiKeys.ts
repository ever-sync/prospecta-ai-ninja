import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type ApiProvider, type UserAiApiKey } from '@/lib/settings/api-keys-ui';

type ToastFn = (options: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}) => void;

type UseSettingsApiKeysParams = {
  userId?: string;
  toast: ToastFn;
};

export const useSettingsApiKeys = ({ userId, toast }: UseSettingsApiKeysParams) => {
  const [apiKeys, setApiKeys] = useState<UserAiApiKey[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [deletingApiKeyId, setDeletingApiKeyId] = useState<string | null>(null);
  const [apiProvider, setApiProvider] = useState<ApiProvider>('gemini');
  const [customProviderName, setCustomProviderName] = useState('');
  const [providerApiKey, setProviderApiKey] = useState('');

  const loadApiKeys = useCallback(async () => {
    if (!userId) return;
    setLoadingApiKeys(true);

    const { data, error } = await supabase
      .from('user_ai_api_keys')
      .select('id, provider, custom_provider, api_key, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at');

    if (error) {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel carregar as chaves de API.',
        variant: 'destructive',
      });
    } else {
      setApiKeys((data || []) as UserAiApiKey[]);
    }

    setLoadingApiKeys(false);
  }, [toast, userId]);

  useEffect(() => {
    if (!userId) return;
    void loadApiKeys();
  }, [loadApiKeys, userId]);

  useEffect(() => {
    if (apiProvider !== 'other' && customProviderName) {
      setCustomProviderName('');
    }
  }, [apiProvider, customProviderName]);

  const providerAlreadyConnected = useMemo(
    () => apiKeys.some((item) => item.provider === apiProvider),
    [apiKeys, apiProvider]
  );

  const canSaveApiKey =
    providerApiKey.trim().length > 0 &&
    (apiProvider !== 'other' || customProviderName.trim().length > 0) &&
    !savingApiKey;

  const handleSaveApiKey = useCallback(async () => {
    if (!userId) return;

    const apiKey = providerApiKey.trim();
    const customProvider = customProviderName.trim();

    if (!apiKey) {
      toast({
        title: 'Campo obrigatorio',
        description: 'Informe uma chave de API valida.',
        variant: 'destructive',
      });
      return;
    }

    if (apiProvider === 'other' && !customProvider) {
      toast({
        title: 'Campo obrigatorio',
        description: 'Informe o nome do provedor personalizado.',
        variant: 'destructive',
      });
      return;
    }

    setSavingApiKey(true);
    const { error } = await supabase.from('user_ai_api_keys').upsert(
      {
        user_id: userId,
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
      window.dispatchEvent(new CustomEvent('onboarding:refetch'));
    }

    setSavingApiKey(false);
  }, [
    apiProvider,
    customProviderName,
    loadApiKeys,
    providerAlreadyConnected,
    providerApiKey,
    toast,
    userId,
  ]);

  const handleDeleteApiKey = useCallback(
    async (keyId: string) => {
      setDeletingApiKeyId(keyId);

      const { error } = await supabase.from('user_ai_api_keys').delete().eq('id', keyId);
      if (error) {
        toast({
          title: 'Erro',
          description: 'Nao foi possivel remover a chave.',
          variant: 'destructive',
        });
      } else {
        setApiKeys((prev) => prev.filter((item) => item.id !== keyId));
        toast({ title: 'Removido', description: 'Chave de API removida com sucesso.' });
      }

      setDeletingApiKeyId(null);
    },
    [toast]
  );

  return {
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
  };
};
