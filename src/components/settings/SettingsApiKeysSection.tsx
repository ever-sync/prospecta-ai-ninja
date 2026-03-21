import { Bot, Loader2, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  API_PROVIDER_OPTIONS,
  providerLabel,
  maskApiKey,
  type ApiProvider,
  type UserAiApiKey,
} from '@/lib/settings/api-keys-ui';

const fieldClass = 'h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]';
const cardClass = 'rounded-[22px] border border-[#ececf0] bg-white p-6 shadow-[0_10px_24px_rgba(18,18,22,0.05)]';

type SettingsApiKeysSectionProps = {
  apiKeys: UserAiApiKey[];
  loadingApiKeys: boolean;
  savingApiKey: boolean;
  deletingApiKeyId: string | null;
  apiProvider: ApiProvider;
  customProviderName: string;
  providerApiKey: string;
  canSaveApiKey: boolean;
  providerAlreadyConnected: boolean;
  onApiProviderChange: (value: ApiProvider) => void;
  onCustomProviderNameChange: (value: string) => void;
  onProviderApiKeyChange: (value: string) => void;
  onSaveApiKey: () => void;
  onDeleteApiKey: (keyId: string) => void;
};

export const SettingsApiKeysSection = ({
  apiKeys,
  loadingApiKeys,
  savingApiKey,
  deletingApiKeyId,
  apiProvider,
  customProviderName,
  providerApiKey,
  canSaveApiKey,
  providerAlreadyConnected,
  onApiProviderChange,
  onCustomProviderNameChange,
  onProviderApiKeyChange,
  onSaveApiKey,
  onDeleteApiKey,
}: SettingsApiKeysSectionProps) => (
  <Card className={cardClass}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-[#1A1A1A]">
            <Bot className="h-5 w-5 text-[#EF3333]" />
            Chaves de API de IA
          </h3>
          <p className="mt-1 text-sm text-[#6d6d75]">
            Conecte quantos provedores de IA quiser. O custo das APIs e cobrado diretamente pelos provedores e voce
            tem controle total. Configure sua chave Firecrawl na aba Integracoes.
          </p>
        </div>
        <Badge variant="outline" className="rounded-full border-[#f2d4d8] bg-[#fff3f5] text-[#9b2a3d]">
          {apiKeys.length} conectada{apiKeys.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="rounded-2xl border border-[#ececf0] bg-[#fafafd] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[210px_1fr]">
          <div className="space-y-2">
            <Label className="text-sm text-[#1A1A1A]">Provedor</Label>
            <Select value={apiProvider} onValueChange={(value) => onApiProviderChange(value as ApiProvider)}>
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
              onChange={(event) => onProviderApiKeyChange(event.target.value)}
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
              onChange={(event) => onCustomProviderNameChange(event.target.value)}
              placeholder="Ex: Together, Anthropic API..."
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={onSaveApiKey} disabled={!canSaveApiKey} className="h-11 gap-2 rounded-xl gradient-primary text-primary-foreground">
            {savingApiKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {providerAlreadyConnected ? 'Atualizar chave' : 'Salvar chave'}
          </Button>
          <p className="text-xs text-[#7b7b83]">
            As chaves ficam vinculadas apenas ao seu usuario. O gasto com tokens e cobrado diretamente pelo provedor
            de IA.
          </p>
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
                onClick={() => onDeleteApiKey(item.id)}
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
);
