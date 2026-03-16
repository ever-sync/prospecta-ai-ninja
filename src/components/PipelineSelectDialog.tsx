import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { dedupeStages, sortStages } from '@/lib/crm/deriveLeadState';
import { Loader2 } from 'lucide-react';

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  default_status: string | null;
}

type ResponseMode = 'buttons' | 'form';
type ApiProvider = 'gemini' | 'claude_code' | 'groq' | 'openai' | 'other';

interface FormTemplate {
  id: string;
  name: string;
  body: string;
}

interface UserAiApiKey {
  id: string;
  provider: ApiProvider;
  custom_provider: string | null;
  api_key: string;
}

interface PipelineSelectDialogProps {
  open: boolean;
  onConfirm: (result: {
    attach: boolean;
    stageId?: string;
    responseMode: ResponseMode;
    analysisProvider?: ApiProvider;
    formTemplateId?: string;
    formTemplateName?: string;
    formTemplateBody?: string;
  }) => void;
  onCancel: () => void;
}

const ANALYSIS_PROVIDER_META: Record<ApiProvider, { label: string; supported: boolean; summary: string }> = {
  gemini: {
    label: 'Gemini',
    supported: true,
    summary: 'Rapido e custo eficiente. Modelo: gemini-2.5-flash. Recomendado para a maioria dos casos.',
  },
  openai: {
    label: 'OpenAI',
    supported: true,
    summary: 'Alta consistencia e qualidade. Modelo: gpt-4o-mini. Bom para apresentacoes mais elaboradas.',
  },
  groq: {
    label: 'Groq',
    supported: true,
    summary: 'Latencia muito baixa. Modelo: llama-3.3-70b-versatile. Ideal para analises rapidas.',
  },
  claude_code: {
    label: 'Claude (Anthropic)',
    supported: true,
    summary: 'Excelente leitura contextual e redacao. Modelo: claude-3-5-haiku. Indicado para textos de abordagem.',
  },
  other: {
    label: 'Outro',
    supported: false,
    summary: 'Provider personalizado. Formato de API desconhecido — nao suportado nesta etapa.',
  },
};

export const PipelineSelectDialog = ({ open, onConfirm, onCancel }: PipelineSelectDialogProps) => {
  const { user } = useAuth();
  const [attach, setAttach] = useState(true);
  const [stageId, setStageId] = useState<string>('');
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [responseMode, setResponseMode] = useState<ResponseMode>('buttons');
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [formTemplateId, setFormTemplateId] = useState('');
  const [apiKeys, setApiKeys] = useState<UserAiApiKey[]>([]);
  const [analysisProvider, setAnalysisProvider] = useState<ApiProvider | ''>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !user) return;
    const load = async () => {
      setLoading(true);
      setResponseMode('buttons');
      setFormTemplateId('');

      const [{ data: stagesData }, { data: templatesData }, { data: apiKeysData }] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('*')
          .eq('user_id', user.id)
          .order('position'),
        supabase
          .from('message_templates')
          .select('id, name, body')
          .eq('user_id', user.id)
          .eq('channel', 'formulario')
          .order('name'),
        supabase
          .from('user_ai_api_keys')
          .select('id, provider, custom_provider, api_key')
          .eq('user_id', user.id)
          .order('created_at'),
      ]);

      const normalizedStages = dedupeStages(sortStages(((stagesData || []) as PipelineStage[]) || []));
      const resolvedApiKeys = ((apiKeysData || []) as UserAiApiKey[]) || [];

      if (normalizedStages.length > 0) {
        setStages(normalizedStages);
        setStageId(normalizedStages[0].id);
      } else {
        setStages([]);
        setStageId('');
      }
      setFormTemplates((templatesData as FormTemplate[]) || []);
      setApiKeys(resolvedApiKeys);
      const preferredProvider = resolvedApiKeys.find((item) => item.provider === 'gemini')?.provider || resolvedApiKeys[0]?.provider || '';
      setAnalysisProvider(preferredProvider);
      setLoading(false);
    };
    load();
  }, [open, user]);

  const selectedFormTemplate = formTemplates.find((tpl) => tpl.id === formTemplateId);
  const mustSelectFormTemplate = responseMode === 'form' && !formTemplateId;
  const selectedApiKey = apiKeys.find((item) => item.provider === analysisProvider);
  const selectedProviderMeta = analysisProvider ? ANALYSIS_PROVIDER_META[analysisProvider] : null;
  const selectedProviderName =
    selectedApiKey?.provider === 'other' && selectedApiKey.custom_provider
      ? selectedApiKey.custom_provider
      : (analysisProvider ? ANALYSIS_PROVIDER_META[analysisProvider].label : '');
  const providerSupported = selectedProviderMeta?.supported ?? false;
  const mustSelectSupportedProvider = apiKeys.length > 0 && (!analysisProvider || !providerSupported);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anexar ao Pipeline</DialogTitle>
          <DialogDescription>Deseja anexar as apresentações a uma etapa do seu pipeline?</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="attach-pipeline" className="text-sm font-medium">Anexar ao pipeline?</Label>
              <Switch id="attach-pipeline" checked={attach} onCheckedChange={setAttach} />
            </div>

            {attach && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Selecione a etapa</Label>
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma etapa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Motor da analise</Label>
              {apiKeys.length === 0 ? (
                <div className="rounded-xl border border-[#f2d4d8] bg-[#fff5f6] px-4 py-3 text-sm text-[#7a2a38]">
                  Nenhuma chave de IA encontrada. Cadastre ao menos uma em Configuracoes &gt; APIs.
                </div>
              ) : (
                <>
                  <Select value={analysisProvider} onValueChange={(value) => setAnalysisProvider(value as ApiProvider)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione qual chave usar na analise..." />
                    </SelectTrigger>
                    <SelectContent>
                      {apiKeys.map((item) => {
                        const meta = ANALYSIS_PROVIDER_META[item.provider];
                        const label = item.provider === 'other' && item.custom_provider ? item.custom_provider : meta.label;
                        return (
                          <SelectItem key={item.id} value={item.provider}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {selectedProviderMeta ? (
                    <div className="rounded-xl border border-[#ececf0] bg-[#fafafc] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#1A1A1A]">{selectedProviderName}</p>
                        <Badge className={selectedProviderMeta.supported ? 'border-[#cdebd7] bg-[#eefbf3] text-[#1f8f47]' : 'border-[#f5d2d7] bg-[#fff3f5] text-[#a22639]'}>
                          {selectedProviderMeta.supported ? 'Disponivel agora' : 'Em breve nesta etapa'}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#66666d]">{selectedProviderMeta.summary}</p>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Resposta da proposta</Label>
              <Select value={responseMode} onValueChange={(value) => setResponseMode(value as ResponseMode)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um modo de resposta..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buttons">Botoes de Aceitar e Recusar</SelectItem>
                  <SelectItem value="form">Formulario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {responseMode === 'form' && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Template de formulario</Label>
                <Select value={formTemplateId} onValueChange={setFormTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um formulario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formTemplates.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Nenhum template de formulario encontrado. Crie um em Templates.
                      </div>
                    ) : (
                      formTemplates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            onClick={() =>
              onConfirm({
                attach,
                stageId: attach ? stageId : undefined,
                responseMode,
                analysisProvider: analysisProvider || undefined,
                formTemplateId: responseMode === 'form' ? formTemplateId : undefined,
                formTemplateName: responseMode === 'form' ? selectedFormTemplate?.name : undefined,
                formTemplateBody: responseMode === 'form' ? selectedFormTemplate?.body : undefined,
              })
            }
            disabled={loading || (attach && !stageId) || mustSelectFormTemplate || mustSelectSupportedProvider}
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
