import { useState, useEffect } from 'react';
import { Save, Loader2, MessageCircle, FileEdit, Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { selectFirstRow } from '@/lib/supabase/select-first-row';

const TONES = [
  { key: 'professional', label: '💼 Profissional', desc: 'Objetivo, focado em dados e resultados.' },
  { key: 'consultive', label: '🎓 Consultivo', desc: 'Educativo, explica o "porquê" de cada recomendação.' },
  { key: 'urgent', label: '⚡ Urgente', desc: 'Destaca riscos e oportunidades perdidas.' },
  { key: 'friendly', label: '😊 Amigável', desc: 'Linguagem simples e encorajadora.' },
  { key: 'technical', label: '🔧 Técnico', desc: 'Detalhado, com termos específicos e métricas.' },
];

const HEADING_FONTS = [
  { key: 'Sora', label: 'Sora', desc: 'Moderno e tecnológico' },
  { key: 'Inter', label: 'Inter', desc: 'Clean e neutro' },
  { key: 'Playfair Display', label: 'Playfair', desc: 'Elegante e sofisticado' },
  { key: 'Montserrat', label: 'Montserrat', desc: 'Forte e corporativo' },
  { key: 'Poppins', label: 'Poppins', desc: 'Amigável e moderno' },
  { key: 'DM Sans', label: 'DM Sans', desc: 'Minimalista e atual' },
];

const ProposalTemplateTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedTone, setSelectedTone] = useState('professional');
  const [instructions, setInstructions] = useState('');
  const [accentColor, setAccentColor] = useState('#EF3333');
  const [bgColor, setBgColor] = useState('#080c18');
  const [textColor, setTextColor] = useState('#f8fafc');
  const [fontHeading, setFontHeading] = useState('Sora');
  const [showEffects, setShowEffects] = useState(true);

  useEffect(() => {
    if (!user) return;
    selectFirstRow(
      supabase
        .from('company_dna')
        .select('presentation_tone, presentation_instructions, custom_button_color, custom_bg_color, custom_text_color, custom_font_heading, custom_show_effects')
        .eq('user_id', user.id)
    ).then(({ data }) => {
      if (data) {
        setSelectedTone((data as any).presentation_tone || 'professional');
        setInstructions((data as any).presentation_instructions || '');
        setAccentColor((data as any).custom_button_color || '#EF3333');
        setBgColor((data as any).custom_bg_color || '#080c18');
        setTextColor((data as any).custom_text_color || '#f8fafc');
        setFontHeading((data as any).custom_font_heading || 'Sora');
        setShowEffects((data as any).custom_show_effects !== false);
      }
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { data: existing } = await selectFirstRow(
      supabase.from('company_dna').select('id').eq('user_id', user.id)
    );

    const payload = {
      presentation_template: 'modern-dark',
      presentation_tone: selectedTone,
      presentation_instructions: instructions,
      custom_button_color: accentColor,
      custom_bg_color: bgColor,
      custom_text_color: textColor,
      custom_font_heading: fontHeading,
      custom_show_effects: showEffects,
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

      {/* Visual */}
      <div className="space-y-4">
        <Label className="text-base font-semibold text-foreground flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Aparência da Proposta
        </Label>

        {/* Colors */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl border border-border bg-muted/30">
          {[
            { label: 'Cor de Destaque', value: accentColor, onChange: setAccentColor },
            { label: 'Cor de Fundo', value: bgColor, onChange: setBgColor },
            { label: 'Cor do Texto', value: textColor, onChange: setTextColor },
          ].map((c) => (
            <div key={c.label} className="space-y-2">
              <Label className="text-xs font-medium">{c.label}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={c.value}
                  onChange={(e) => c.onChange(e.target.value)}
                  title={c.label}
                  aria-label={c.label}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <span className="text-xs text-muted-foreground font-mono">{c.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Font */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Fonte dos Títulos</Label>
          <div className="grid grid-cols-3 gap-2">
            {HEADING_FONTS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFontHeading(f.key)}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  fontHeading === f.key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                )}
              >
                {/* eslint-disable-next-line react/forbid-dom-props */}
                <p className="text-sm font-semibold" style={{ fontFamily: f.key }}>{f.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Effects */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium">Efeitos animados</p>
            <p className="text-xs text-muted-foreground">Orbes, animações de entrada e scroll.</p>
          </div>
          <Switch checked={showEffects} onCheckedChange={setShowEffects} />
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
          Adicione instruções extras para a IA usar ao gerar as propostas.
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
