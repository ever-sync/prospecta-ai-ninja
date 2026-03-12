import { useState, useEffect } from 'react';
import { Save, Loader2, Palette, MessageCircle, FileEdit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const TEMPLATE_STYLES = [
  { key: 'modern-dark', label: 'Modern Dark', desc: 'Fundo escuro, accent indigo, visual tech.', preview: 'bg-[#0a0a1a] border-indigo-500/40' },
  { key: 'clean-light', label: 'Clean Light', desc: 'Fundo branco, minimalista, elegante.', preview: 'bg-white border-blue-400/40' },
  { key: 'corporate', label: 'Corporate', desc: 'Estilo corporativo, formal e profissional.', preview: 'bg-gray-100 border-blue-800/40' },
  { key: 'bold-gradient', label: 'Bold Gradient', desc: 'Gradientes fortes, glassmorphism, ousado.', preview: 'bg-gradient-to-br from-purple-600 to-blue-500 border-purple-400/40' },
];

const TONES = [
  { key: 'professional', label: '💼 Profissional', desc: 'Objetivo, focado em dados e resultados.' },
  { key: 'consultive', label: '🎓 Consultivo', desc: 'Educativo, explica o "porquê" de cada recomendação.' },
  { key: 'urgent', label: '⚡ Urgente', desc: 'Destaca riscos e oportunidades perdidas.' },
  { key: 'friendly', label: '😊 Amigável', desc: 'Linguagem simples e encorajadora.' },
  { key: 'technical', label: '🔧 Técnico', desc: 'Detalhado, com termos específicos e métricas.' },
];

const ProposalTemplateTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('modern-dark');
  const [selectedTone, setSelectedTone] = useState('professional');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('company_dna')
      .select('presentation_template, presentation_tone, presentation_instructions')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSelectedTemplate((data as any).presentation_template || 'modern-dark');
          setSelectedTone((data as any).presentation_tone || 'professional');
          setInstructions((data as any).presentation_instructions || '');
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    // Check if DNA row exists
    const { data: existing } = await supabase
      .from('company_dna')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const payload = {
      presentation_template: selectedTemplate,
      presentation_tone: selectedTone,
      presentation_instructions: instructions,
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
    <div className="space-y-6">
      {/* Template Style */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          Estilo Visual da Proposta
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATE_STYLES.map((t) => (
            <Card
              key={t.key}
              className={cn(
                'p-4 cursor-pointer transition-all border-2',
                selectedTemplate === t.key
                  ? 'border-primary ring-1 ring-primary/20'
                  : 'border-border hover:border-muted-foreground/30'
              )}
              onClick={() => setSelectedTemplate(t.key)}
            >
              <div className={cn('w-full h-10 rounded-md border mb-3', t.preview)} />
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          Tom de Comunicação
        </Label>
        <div className="grid gap-2">
          {TONES.map((t) => (
            <Card
              key={t.key}
              className={cn(
                'p-3 cursor-pointer transition-all border-2 flex items-center gap-3',
                selectedTone === t.key
                  ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              )}
              onClick={() => setSelectedTone(t.key)}
            >
              <span className="text-sm font-medium text-foreground">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.desc}</span>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-primary" />
          Instruções Personalizadas
        </Label>
        <p className="text-xs text-muted-foreground">
          Adicione instruções extras para a IA usar ao gerar as propostas. Ex: "Sempre mencionar nosso prazo de entrega de 7 dias", "Focar em ROI".
        </p>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Ex: Sempre incluir uma seção sobre nosso suporte 24/7 e garantia de 30 dias..."
          className="bg-secondary border-border min-h-[120px]"
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
