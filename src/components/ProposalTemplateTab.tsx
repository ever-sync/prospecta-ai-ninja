import { useState, useEffect } from 'react';
import { Save, Loader2, Palette, MessageCircle, FileEdit, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const PROPOSAL_MODELS = [
  {
    key: 'modern-dark',
    label: 'Tech Moderna',
    desc: 'Visual escuro e futurista com accent indigo. Ideal para agências digitais e empresas de tecnologia.',
  },
  {
    key: 'clean-light',
    label: 'Clean & Elegante',
    desc: 'Fundo claro, tipografia refinada e muito espaço em branco. Perfeito para consultorias e escritórios.',
  },
  {
    key: 'corporate',
    label: 'Corporativa',
    desc: 'Layout formal com seções bem estruturadas. Ideal para propostas enterprise e B2B.',
  },
  {
    key: 'bold-gradient',
    label: 'Bold & Criativa',
    desc: 'Gradientes vibrantes e glassmorphism. Perfeito para agências criativas e startups.',
  },
  {
    key: 'custom',
    label: 'Customizado',
    desc: 'Defina suas próprias cores de texto, botões e fundo da página.',
  },
];
const TONES = [
  { key: 'professional', label: '💼 Profissional', desc: 'Objetivo, focado em dados e resultados.' },
  { key: 'consultive', label: '🎓 Consultivo', desc: 'Educativo, explica o "porquê" de cada recomendação.' },
  { key: 'urgent', label: '⚡ Urgente', desc: 'Destaca riscos e oportunidades perdidas.' },
  { key: 'friendly', label: '😊 Amigável', desc: 'Linguagem simples e encorajadora.' },
  { key: 'technical', label: '🔧 Técnico', desc: 'Detalhado, com termos específicos e métricas.' },
];

const ProposalPreview = ({ modelKey, customColors }: { modelKey: string; customColors?: { text: string; button: string; bg: string } }) => {
  if (modelKey === 'custom' && customColors) {
    return (
      <div className="w-full h-full rounded-md overflow-hidden p-3 flex flex-col gap-2" style={{ backgroundColor: customColors.bg }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded" style={{ backgroundColor: customColors.button }} />
          <div className="h-2 w-16 rounded" style={{ backgroundColor: customColors.text, opacity: 0.5 }} />
        </div>
        <div className="h-2 w-3/4 rounded mt-1" style={{ backgroundColor: customColors.text, opacity: 0.3 }} />
        <div className="h-2 w-1/2 rounded" style={{ backgroundColor: customColors.text, opacity: 0.2 }} />
        <div className="flex gap-2 mt-1">
          <div className="flex-1 rounded p-2" style={{ backgroundColor: customColors.button + '33' }}>
            <div className="h-1.5 w-full rounded mb-1" style={{ backgroundColor: customColors.button, opacity: 0.7 }} />
            <div className="h-1 w-2/3 rounded" style={{ backgroundColor: customColors.text, opacity: 0.2 }} />
          </div>
          <div className="flex-1 rounded p-2" style={{ backgroundColor: customColors.button + '33' }}>
            <div className="h-1.5 w-full rounded mb-1" style={{ backgroundColor: customColors.button, opacity: 0.7 }} />
            <div className="h-1 w-2/3 rounded" style={{ backgroundColor: customColors.text, opacity: 0.2 }} />
          </div>
        </div>
        <div className="flex gap-2 mt-auto">
          <div className="h-4 flex-1 rounded" style={{ backgroundColor: customColors.button }} />
          <div className="h-4 flex-1 rounded" style={{ backgroundColor: customColors.text, opacity: 0.15 }} />
        </div>
      </div>
    );
  }

  const previews: Record<string, React.ReactNode> = {
    'modern-dark': (
      <div className="w-full h-full bg-[#0c0c1d] rounded-md overflow-hidden p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-500/80" />
          <div className="h-2 w-16 rounded bg-indigo-400/40" />
        </div>
        <div className="h-2 w-3/4 rounded bg-slate-600/50 mt-1" />
        <div className="h-2 w-1/2 rounded bg-slate-600/30" />
        <div className="flex gap-2 mt-1">
          <div className="flex-1 rounded bg-indigo-500/20 p-2">
            <div className="h-1.5 w-full rounded bg-indigo-500/60 mb-1" />
            <div className="h-1 w-2/3 rounded bg-slate-600/30" />
          </div>
          <div className="flex-1 rounded bg-indigo-500/20 p-2">
            <div className="h-1.5 w-full rounded bg-emerald-500/60 mb-1" />
            <div className="h-1 w-2/3 rounded bg-slate-600/30" />
          </div>
          <div className="flex-1 rounded bg-indigo-500/20 p-2">
            <div className="h-1.5 w-full rounded bg-amber-500/60 mb-1" />
            <div className="h-1 w-2/3 rounded bg-slate-600/30" />
          </div>
        </div>
        <div className="flex gap-2 mt-auto">
          <div className="h-4 flex-1 rounded bg-emerald-500/40" />
          <div className="h-4 flex-1 rounded bg-slate-600/30" />
        </div>
      </div>
    ),
    'clean-light': (
      <div className="w-full h-full bg-white rounded-md overflow-hidden p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-500/70" />
          <div className="h-2 w-16 rounded bg-gray-300" />
        </div>
        <div className="h-2 w-3/4 rounded bg-gray-200 mt-1" />
        <div className="h-2 w-1/2 rounded bg-gray-200" />
        <div className="flex gap-2 mt-1">
          <div className="flex-1 rounded border border-gray-200 p-2">
            <div className="h-1.5 w-full rounded bg-blue-400/50 mb-1" />
            <div className="h-1 w-2/3 rounded bg-gray-200" />
          </div>
          <div className="flex-1 rounded border border-gray-200 p-2">
            <div className="h-1.5 w-full rounded bg-green-400/50 mb-1" />
            <div className="h-1 w-2/3 rounded bg-gray-200" />
          </div>
          <div className="flex-1 rounded border border-gray-200 p-2">
            <div className="h-1.5 w-full rounded bg-amber-400/50 mb-1" />
            <div className="h-1 w-2/3 rounded bg-gray-200" />
          </div>
        </div>
        <div className="flex gap-2 mt-auto">
          <div className="h-4 flex-1 rounded bg-blue-500/40" />
          <div className="h-4 flex-1 rounded bg-gray-200" />
        </div>
      </div>
    ),
    'corporate': (
      <div className="w-full h-full bg-[#f0f2f5] rounded-md overflow-hidden p-3 flex flex-col gap-2">
        <div className="bg-[#1e3a5f] rounded p-1.5 flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white/30" />
          <div className="h-1.5 w-14 rounded bg-white/40" />
        </div>
        <div className="h-2 w-3/4 rounded bg-gray-400/30 mt-1" />
        <div className="h-2 w-1/2 rounded bg-gray-400/20" />
        <div className="bg-white rounded p-2 border border-gray-300/50">
          <div className="h-1.5 w-full rounded bg-[#1e3a5f]/40 mb-1" />
          <div className="h-1 w-2/3 rounded bg-gray-300/60" />
          <div className="h-1 w-1/2 rounded bg-gray-300/40 mt-1" />
        </div>
        <div className="flex gap-2 mt-auto">
          <div className="h-4 flex-1 rounded bg-[#1e3a5f]/60" />
          <div className="h-4 flex-1 rounded bg-gray-400/20" />
        </div>
      </div>
    ),
    'bold-gradient': (
      <div className="w-full h-full bg-gradient-to-br from-purple-700 to-blue-600 rounded-md overflow-hidden p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-white/30 backdrop-blur" />
          <div className="h-2 w-16 rounded bg-white/30" />
        </div>
        <div className="h-2 w-3/4 rounded bg-white/20 mt-1" />
        <div className="h-2 w-1/2 rounded bg-white/15" />
        <div className="flex gap-2 mt-1">
          <div className="flex-1 rounded-lg bg-white/10 backdrop-blur p-2 border border-white/20">
            <div className="h-1.5 w-full rounded bg-pink-400/60 mb-1" />
            <div className="h-1 w-2/3 rounded bg-white/20" />
          </div>
          <div className="flex-1 rounded-lg bg-white/10 backdrop-blur p-2 border border-white/20">
            <div className="h-1.5 w-full rounded bg-cyan-400/60 mb-1" />
            <div className="h-1 w-2/3 rounded bg-white/20" />
          </div>
        </div>
        <div className="flex gap-2 mt-auto">
          <div className="h-4 flex-1 rounded-full bg-white/30" />
          <div className="h-4 flex-1 rounded-full bg-white/15" />
        </div>
      </div>
    ),
  };
  return previews[modelKey] || null;
};

const ProposalTemplateTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('modern-dark');
  const [selectedTone, setSelectedTone] = useState('professional');
  const [instructions, setInstructions] = useState('');
  const [customTextColor, setCustomTextColor] = useState('#ffffff');
  const [customButtonColor, setCustomButtonColor] = useState('#6366f1');
  const [customBgColor, setCustomBgColor] = useState('#0c0c1d');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('company_dna')
      .select('presentation_template, presentation_tone, presentation_instructions, custom_text_color, custom_button_color, custom_bg_color')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSelectedTemplate((data as any).presentation_template || 'modern-dark');
          setSelectedTone((data as any).presentation_tone || 'professional');
          setInstructions((data as any).presentation_instructions || '');
          setCustomTextColor((data as any).custom_text_color || '#ffffff');
          setCustomButtonColor((data as any).custom_button_color || '#6366f1');
          setCustomBgColor((data as any).custom_bg_color || '#0c0c1d');
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { data: existing } = await supabase
      .from('company_dna')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const payload = {
      presentation_template: selectedTemplate,
      presentation_tone: selectedTone,
      presentation_instructions: instructions,
      custom_text_color: customTextColor,
      custom_button_color: customButtonColor,
      custom_bg_color: customBgColor,
    } as any;

    let error;
    if (existing) {
      ({ error } = await supabase.from('company_dna').update(payload).eq('user_id', user.id));
    } else {
      ({ error } = await supabase.from('company_dna').insert({ ...payload, user_id: user.id }));
    }

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Configurações de proposta salvas!' });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Modelo Visual */}
      <div className="space-y-3">
        <Label className="text-base font-semibold text-foreground flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Modelo da Proposta
        </Label>
        <p className="text-sm text-muted-foreground">
          Selecione o modelo visual que será usado para gerar suas propostas comerciais.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {PROPOSAL_MODELS.map((model) => {
            const isSelected = selectedTemplate === model.key;
            return (
              <div
                key={model.key}
                className={cn(
                  'relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden group',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10'
                    : 'border-border hover:border-muted-foreground/40 hover:shadow-md'
                )}
                onClick={() => setSelectedTemplate(model.key)}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}

                {/* Preview */}
                <div className="h-36 p-2">
                  <ProposalPreview modelKey={model.key} customColors={model.key === 'custom' ? { text: customTextColor, button: customButtonColor, bg: customBgColor } : undefined} />
                </div>

                {/* Info */}
                <div className="p-3 border-t border-border bg-card">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{model.label}</p>
                    {isSelected && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                        Ativo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{model.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tone */}
      <div className="space-y-3">
        <Label className="text-base font-semibold text-foreground flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          Tom de Comunicação
        </Label>
        <div className="grid gap-2">
          {TONES.map((t) => (
            <div
              key={t.key}
              className={cn(
                'p-3 rounded-lg cursor-pointer transition-all border-2 flex items-center gap-3',
                selectedTone === t.key
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-muted-foreground/30'
              )}
              onClick={() => setSelectedTone(t.key)}
            >
              {selectedTone === t.key && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <div className={cn(!selectedTone || selectedTone !== t.key ? 'ml-8' : '')}>
                <span className="text-sm font-medium text-foreground">{t.label}</span>
                <span className="text-xs text-muted-foreground ml-2">{t.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="space-y-3">
        <Label className="text-base font-semibold text-foreground flex items-center gap-2">
          <FileEdit className="w-5 h-5 text-primary" />
          Instruções Personalizadas
        </Label>
        <p className="text-xs text-muted-foreground">
          Adicione instruções extras para a IA usar ao gerar as propostas. Ex: "Sempre mencionar nosso prazo de entrega de 7 dias", "Focar em ROI".
        </p>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Ex: Sempre incluir uma seção sobre nosso suporte 24/7 e garantia de 30 dias..."
          className="min-h-[120px]"
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full gradient-primary text-primary-foreground font-semibold py-5 glow-primary gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Salvando...' : 'Salvar Configurações da Proposta'}
      </Button>
    </div>
  );
};

export default ProposalTemplateTab;
