import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, MessageCircle, ClipboardList, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type ApiProvider = 'gemini' | 'claude_code' | 'groq' | 'openai' | 'other';
const PROVIDER_LABELS: Record<ApiProvider, string> = {
  gemini: 'Gemini',
  claude_code: 'Claude (Anthropic)',
  groq: 'Groq',
  openai: 'OpenAI',
  other: 'Outro',
};

interface RegenOptions {
  customInstructions: string;
  responseMode: string;
  provider?: string;
  formSchemaId?: string;
  formTemplateName?: string;
  formTemplateBody?: string;
  formSlug?: string;
  formFields?: any[];
  whatsappPhone?: string;
  whatsappButtonLabel?: string;
}

interface RegeneratePresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegenerate: (options: RegenOptions) => Promise<void>;
  businessName: string;
}

interface FormSchema {
  id: string;
  title: string;
  templateName: string;
  slug: string;
  fields: any[];
}

const CTA_OPTIONS = [
  { value: 'buttons', label: 'Botão WhatsApp', desc: 'CTA direto para conversa no WhatsApp', icon: MessageCircle },
  { value: 'form', label: 'Formulário', desc: 'Lead preenche um formulário de qualificação', icon: ClipboardList },
];

export const RegeneratePresentationDialog = ({
  open,
  onOpenChange,
  onRegenerate,
  businessName,
}: RegeneratePresentationDialogProps) => {
  const [customInstructions, setCustomInstructions] = useState('');
  const [responseMode, setResponseMode] = useState('buttons');
  const [loading, setLoading] = useState(false);

  // WhatsApp fields
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappButtonLabel, setWhatsappButtonLabel] = useState('Quero saber mais');

  // Form fields
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [selectedFormId, setSelectedFormId] = useState('');

  // Provider selection
  const [apiKeys, setApiKeys] = useState<{ id: string; provider: ApiProvider; custom_provider: string | null }[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');

  useEffect(() => {
    if (open) {
      loadForms();
      loadApiKeys();
    }
  }, [open]);

  const loadApiKeys = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('user_ai_api_keys')
      .select('id, provider, custom_provider')
      .eq('user_id', user.id)
      .order('created_at');
    if (data && data.length > 0) {
      setApiKeys(data as any);
      setSelectedProvider((prev) => prev || (data as any)[0].provider);
    }
  };

  const loadForms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get template IDs + names for this user's formulario templates
    const { data: templates } = await supabase
      .from('message_templates')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('channel', 'formulario');

    if (!templates || templates.length === 0) return;

    const templateIds = templates.map(t => t.id);
    const { data } = await supabase
      .from('form_schemas')
      .select('id, title, slug, fields, template_id')
      .in('template_id', templateIds);

    if (data) {
      const merged = data.map((f: any) => ({
        ...f,
        templateName: templates.find(t => t.id === f.template_id)?.name || f.title,
      }));
      setForms(merged as FormSchema[]);
      if (merged.length > 0 && !selectedFormId) setSelectedFormId(merged[0].id);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const selectedForm = forms.find(f => f.id === selectedFormId);
      const fieldLabels = selectedForm
        ? selectedForm.fields.map((f: any) => f.label).join(', ')
        : '';

      await onRegenerate({
        customInstructions,
        responseMode,
        provider: selectedProvider || undefined,
        formSchemaId: responseMode === 'form' ? selectedFormId : undefined,
        formTemplateName: responseMode === 'form' ? selectedForm?.title : undefined,
        formTemplateBody: responseMode === 'form' ? fieldLabels : undefined,
        formSlug: responseMode === 'form' ? selectedForm?.slug : undefined,
        formFields: responseMode === 'form' ? selectedForm?.fields : undefined,
        whatsappPhone: responseMode === 'buttons' ? whatsappPhone : undefined,
        whatsappButtonLabel: responseMode === 'buttons' ? whatsappButtonLabel : undefined,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Regenerar Apresentação
          </DialogTitle>
          <DialogDescription>
            Ajuste as opções abaixo e gere uma nova versão da proposta.
          </DialogDescription>
          <p className="text-sm text-muted-foreground font-medium">{businessName}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Provider selector */}
          {apiKeys.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                Motor de IA
              </Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecione o provedor..." />
                </SelectTrigger>
                <SelectContent>
                  {apiKeys.map((item) => {
                    const label = item.provider === 'other' && item.custom_provider
                      ? item.custom_provider
                      : PROVIDER_LABELS[item.provider];
                    return (
                      <SelectItem key={item.id} value={item.provider}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* CTA selector */}
          <div className="space-y-2">
            <Label className="text-foreground">Call to Action</Label>
            <div className="grid grid-cols-2 gap-2">
              {CTA_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setResponseMode(opt.value)}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-colors',
                      responseMode === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn('w-4 h-4', responseMode === opt.value ? 'text-primary' : 'text-muted-foreground')} />
                      <p className="text-sm font-semibold">{opt.label}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* WhatsApp fields */}
          {responseMode === 'buttons' && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Telefone de contato</Label>
                <Input
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Texto do botão</Label>
                <Input
                  value={whatsappButtonLabel}
                  onChange={(e) => setWhatsappButtonLabel(e.target.value)}
                  placeholder="Quero saber mais"
                  className="bg-background border-border"
                />
              </div>
            </div>
          )}

          {/* Form selector */}
          {responseMode === 'form' && (
            <div className="space-y-1.5">
              <Label className="text-sm">Formulário</Label>
              {forms.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2 rounded-lg border border-border bg-muted/30">
                  Nenhum formulário cadastrado. Crie um na aba Templates.
                </p>
              ) : (
                <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione um formulário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {forms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.templateName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-2">
            <Label className="text-foreground">Instruções Adicionais</Label>
            <Textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Ex: Destaque os problemas de SEO, use linguagem mais direta..."
              className="bg-background border-border resize-none h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleRegenerate} disabled={loading || (responseMode === 'form' && forms.length === 0)}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Regenerar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
