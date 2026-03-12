import { useState, useEffect } from 'react';
import { Save, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const DNAFormTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<string[]>([]);
  const [differentials, setDifferentials] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [tone, setTone] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [newService, setNewService] = useState('');
  const [newDifferential, setNewDifferential] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasRecord, setHasRecord] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('company_dna')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setHasRecord(true);
          setServices(data.services || []);
          setDifferentials(data.differentials || []);
          setTargetAudience(data.target_audience || '');
          setValueProposition(data.value_proposition || '');
          setTone(data.tone || '');
          setAdditionalInfo(data.additional_info || '');
          setPortfolioUrl((data as any).portfolio_url || '');
          setInstagramUrl((data as any).instagram_url || '');
          setLinkedinUrl((data as any).linkedin_url || '');
          setFacebookUrl((data as any).facebook_url || '');
          setYoutubeUrl((data as any).youtube_url || '');
        }
      });
  }, [user]);

  const addTag = (list: string[], setList: (v: string[]) => void, value: string, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput('');
  };

  const removeTag = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const completeness = () => {
    let filled = 0;
    const total = 9;
    if (services.length > 0) filled++;
    if (differentials.length > 0) filled++;
    if (targetAudience.trim()) filled++;
    if (valueProposition.trim()) filled++;
    if (tone.trim()) filled++;
    if (additionalInfo.trim()) filled++;
    if (portfolioUrl.trim()) filled++;
    if (instagramUrl.trim()) filled++;
    if (linkedinUrl.trim()) filled++;
    return { filled, total, percent: Math.round((filled / total) * 100) };
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      services,
      differentials,
      target_audience: targetAudience,
      value_proposition: valueProposition,
      tone,
      additional_info: additionalInfo,
      portfolio_url: portfolioUrl,
      instagram_url: instagramUrl,
      linkedin_url: linkedinUrl,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (hasRecord) {
      ({ error } = await supabase.from('company_dna').update(payload).eq('user_id', user.id));
    } else {
      ({ error } = await supabase.from('company_dna').insert(payload));
      if (!error) setHasRecord(true);
    }

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'DNA salvo!', description: 'As informações da sua empresa foram atualizadas.' });
    }
    setSaving(false);
  };

  const { filled, total, percent } = completeness();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Badge
          variant={percent === 100 ? 'default' : 'secondary'}
          className="gap-1.5 py-1 px-3"
        >
          {percent === 100 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {filled}/{total} completo
        </Badge>
      </div>

      <Card className="p-6 bg-card border-border space-y-6">
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full gradient-primary transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>

        {/* Services */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Serviços Oferecidos</Label>
          <div className="flex gap-2">
            <Input
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              placeholder="Ex: Criação de sites"
              className="bg-secondary border-border"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(services, setServices, newService, setNewService))}
            />
            <Button variant="outline" size="icon" onClick={() => addTag(services, setServices, newService, setNewService)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {services.map((s, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {s}
                <button onClick={() => removeTag(services, setServices, i)} className="hover:text-destructive ml-1">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Differentials */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Diferenciais</Label>
          <div className="flex gap-2">
            <Input
              value={newDifferential}
              onChange={(e) => setNewDifferential(e.target.value)}
              placeholder="Ex: Atendimento 24h"
              className="bg-secondary border-border"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(differentials, setDifferentials, newDifferential, setNewDifferential))}
            />
            <Button variant="outline" size="icon" onClick={() => addTag(differentials, setDifferentials, newDifferential, setNewDifferential)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {differentials.map((d, i) => (
              <Badge key={i} variant="secondary" className="gap-1 pr-1">
                {d}
                <button onClick={() => removeTag(differentials, setDifferentials, i)} className="hover:text-destructive ml-1">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Público-Alvo</Label>
          <Textarea value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Descreva seu público-alvo ideal..." className="bg-secondary border-border min-h-[80px]" />
        </div>

        {/* Value Proposition */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Proposta de Valor</Label>
          <Textarea value={valueProposition} onChange={(e) => setValueProposition(e.target.value)} placeholder="O que torna sua empresa única?" className="bg-secondary border-border min-h-[80px]" />
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Tom de Comunicação</Label>
          <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Ex: Profissional, amigável, técnico..." className="bg-secondary border-border" />
        </div>

        {/* Additional Info */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Informações Adicionais</Label>
          <Textarea value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} placeholder="Outras informações relevantes sobre sua empresa..." className="bg-secondary border-border min-h-[80px]" />
        </div>

        {/* Portfolio URL */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Link do Portfólio</Label>
          <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://seusite.com/portfolio" className="bg-secondary border-border" />
          <p className="text-xs text-muted-foreground">O botão "Acessar Portfólio" será exibido na apresentação gerada.</p>
        </div>

        {/* Instagram */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Instagram</Label>
          <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/suaempresa" className="bg-secondary border-border" />
        </div>

        {/* LinkedIn */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">LinkedIn</Label>
          <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/company/suaempresa" className="bg-secondary border-border" />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-primary-foreground font-semibold py-5 glow-primary gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar DNA'}
        </Button>
      </Card>
    </div>
  );
};

export default DNAFormTab;
