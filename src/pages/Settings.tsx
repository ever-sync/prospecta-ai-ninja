import { useState, useEffect } from 'react';
import { Save, Upload, Building2, Settings2, CreditCard, Receipt, Crown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import TemplatesManager from '@/components/TemplatesManager';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCompanyName(data.company_name || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          setLogoUrl(data.company_logo_url || '');
        }
      });
  }, [user]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/logo.${ext}`;

    const { error } = await supabase.storage
      .from('company-logos')
      .upload(path, file, { upsert: true });

    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } else {
      const { data: { publicUrl } } = supabase.storage.from('company-logos').getPublicUrl(path);
      setLogoUrl(publicUrl);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        company_name: companyName,
        email,
        phone,
        company_logo_url: logoUrl,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Salvo!', description: 'Configurações atualizadas com sucesso.' });
    }
    setSaving(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-3">
        <Settings2 className="w-6 h-6 text-primary" />
        Configurações
      </h1>

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="empresa">🏢 Empresa</TabsTrigger>
          <TabsTrigger value="faturamento">💳 Faturamento</TabsTrigger>
          <TabsTrigger value="templates">📝 Templates</TabsTrigger>
          <TabsTrigger value="integracoes">⚙️ Integrações</TabsTrigger>
        </TabsList>

        {/* Empresa Tab */}
        <TabsContent value="empresa">
          <Card className="p-6 bg-card border-border space-y-6">
            {/* Logo */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">Logo da Empresa</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-secondary border border-border flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <span>
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Enviando...' : 'Upload'}
                    </span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                </label>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm text-foreground">Nome da Empresa</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Sua empresa" className="bg-secondary border-border" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settingsEmail" className="text-sm text-foreground">Email</Label>
              <Input id="settingsEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" className="bg-secondary border-border" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settingsPhone" className="text-sm text-foreground">Telefone</Label>
              <Input id="settingsPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="bg-secondary border-border" />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-primary-foreground font-semibold py-5 glow-primary gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </Card>
        </TabsContent>

        {/* Faturamento Tab */}
        <TabsContent value="faturamento">
          <div className="space-y-6">
            {/* Plano Atual */}
            <Card className="p-6 bg-card border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Plano Atual
                </h3>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  Gratuito
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { name: 'Gratuito', price: 'R$ 0', features: ['50 apresentações/mês', '2 campanhas', 'Suporte por email'], current: true },
                  { name: 'Pro', price: 'R$ 97', features: ['500 apresentações/mês', 'Campanhas ilimitadas', 'Suporte prioritário', 'Templates premium'], current: false },
                  { name: 'Enterprise', price: 'R$ 297', features: ['Apresentações ilimitadas', 'API dedicada', 'Suporte 24/7', 'White-label'], current: false },
                ].map((plan) => (
                  <div
                    key={plan.name}
                    className={`rounded-xl border p-4 space-y-3 transition-all ${
                      plan.current
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-foreground">{plan.name}</p>
                      <p className="text-xl font-bold text-foreground">{plan.price}<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
                    </div>
                    <ul className="space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.current ? 'outline' : 'default'}
                      size="sm"
                      className="w-full"
                      disabled={plan.current}
                    >
                      {plan.current ? 'Plano atual' : 'Fazer upgrade'}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Histórico de Faturas */}
            <Card className="p-6 bg-card border-border space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Histórico de Faturas
              </h3>

              <div className="space-y-2">
                {[
                  { date: '01/03/2026', desc: 'Plano Gratuito', valor: 'R$ 0,00', status: 'Pago' },
                  { date: '01/02/2026', desc: 'Plano Gratuito', valor: 'R$ 0,00', status: 'Pago' },
                  { date: '01/01/2026', desc: 'Plano Gratuito', valor: 'R$ 0,00', status: 'Pago' },
                ].map((fatura, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{fatura.desc}</p>
                        <p className="text-xs text-muted-foreground">{fatura.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{fatura.valor}</p>
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                        {fatura.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <TemplatesManager />
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integracoes">
          <Card className="p-6 bg-card border-border space-y-4">
            <h3 className="font-semibold text-foreground">Integrações</h3>
            <p className="text-sm text-muted-foreground">
              Configurações de WhatsApp e Email estão integradas aos templates acima. 
              Configure seus templates de mensagem na aba "Templates" para personalizar 
              o envio das campanhas.
            </p>
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📱</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">Envio via link direto do WhatsApp Web</p>
                  </div>
                </div>
                <span className="text-xs text-green-400">Ativo</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📧</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Email</p>
                    <p className="text-xs text-muted-foreground">Envio via API transacional (Resend)</p>
                  </div>
                </div>
                <span className="text-xs text-green-400">Ativo</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
