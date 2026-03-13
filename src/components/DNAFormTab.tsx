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
    const total = 11;
    if (services.length > 0) filled++;
    if (differentials.length > 0) filled++;
    if (targetAudience.trim()) filled++;
    if (valueProposition.trim()) filled++;
    if (tone.trim()) filled++;
    if (additionalInfo.trim()) filled++;
    if (portfolioUrl.trim()) filled++;
    if (instagramUrl.trim()) filled++;
    if (linkedinUrl.trim()) filled++;
    if (facebookUrl.trim()) filled++;
    if (youtubeUrl.trim()) filled++;
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
      facebook_url: facebookUrl,
      youtube_url: youtubeUrl,
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
      toast({ title: 'DNA salvo!', description: 'As informacoes da sua empresa foram atualizadas.' });
    }
    setSaving(false);
  };

  const { filled, total, percent } = completeness();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#66666d]">
          Quanto mais completo o DNA, mais assertivas ficam as propostas e campanhas.
        </p>
        <Badge
          variant={percent === 100 ? 'default' : 'secondary'}
          className="gap-1.5 rounded-full border border-[#f3c9d0] bg-[#fff2f4] px-3 py-1 text-[#9d2b3d]"
        >
          {percent === 100 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {filled}/{total} completo
        </Badge>
      </div>

      <Card className="space-y-6 rounded-[24px] border border-[#ececf0] bg-white p-6 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#f1f1f4]">
          <div className="h-full bg-[#EF3333] transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Servicos Oferecidos</Label>
          <div className="flex gap-2">
            <Input
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              placeholder="Ex: Criacao de sites"
              className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(services, setServices, newService, setNewService))}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-[#e6e6eb] bg-white hover:bg-[#fff1f3] hover:text-[#EF3333]"
              onClick={() => addTag(services, setServices, newService, setNewService)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {services.map((s, i) => (
              <Badge key={i} variant="secondary" className="gap-1 rounded-full border border-[#f0d9dd] bg-[#fff5f6] pr-1 text-[#702530]">
                {s}
                <button onClick={() => removeTag(services, setServices, i)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Diferenciais</Label>
          <div className="flex gap-2">
            <Input
              value={newDifferential}
              onChange={(e) => setNewDifferential(e.target.value)}
              placeholder="Ex: Atendimento 24h"
              className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(differentials, setDifferentials, newDifferential, setNewDifferential))}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-[#e6e6eb] bg-white hover:bg-[#fff1f3] hover:text-[#EF3333]"
              onClick={() => addTag(differentials, setDifferentials, newDifferential, setNewDifferential)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {differentials.map((d, i) => (
              <Badge key={i} variant="secondary" className="gap-1 rounded-full border border-[#f0d9dd] bg-[#fff5f6] pr-1 text-[#702530]">
                {d}
                <button onClick={() => removeTag(differentials, setDifferentials, i)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Publico-Alvo</Label>
          <Textarea
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="Descreva seu publico-alvo ideal..."
            className="min-h-[90px] rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Proposta de Valor</Label>
          <Textarea
            value={valueProposition}
            onChange={(e) => setValueProposition(e.target.value)}
            placeholder="O que torna sua empresa unica?"
            className="min-h-[90px] rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Tom de Comunicacao</Label>
          <Input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="Ex: Profissional, amigavel, tecnico..."
            className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Informacoes Adicionais</Label>
          <Textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Outras informacoes relevantes sobre sua empresa..."
            className="min-h-[90px] rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm font-medium text-foreground">Link do Portfolio</Label>
            <Input
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://seusite.com/portfolio"
              className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
            />
            <p className="text-xs text-muted-foreground">
              O botao "Acessar Portfolio" sera exibido na apresentacao gerada.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Instagram</Label>
            <Input
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/suaempresa"
              className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">LinkedIn</Label>
            <Input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/company/suaempresa"
              className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Facebook</Label>
            <Input
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/suaempresa"
              className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">YouTube</Label>
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/@suaempresa"
              className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="h-12 w-full rounded-xl gradient-primary text-primary-foreground font-semibold glow-primary gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar DNA'}
        </Button>
      </Card>
    </div>
  );
};

export default DNAFormTab;
