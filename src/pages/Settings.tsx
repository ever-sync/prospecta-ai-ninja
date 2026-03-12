import { useState, useEffect } from 'react';
import { Save, Upload, Building2, Settings2, Crown, Check, Loader2, ExternalLink, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscription, plans, loading: subLoading, startCheckout, openCustomerPortal, refreshSubscription } = useSubscription();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

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
          setVoiceId(data.elevenlabs_voice_id || '');
        }
      });
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      toast({ title: 'Assinatura ativada!', description: 'Seu plano foi atualizado com sucesso.' });
      refreshSubscription();
      window.history.replaceState({}, '', '/settings?tab=faturamento');
    }
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/logo.${ext}`;
    const { error } = await supabase.storage.from('company-logos').upload(path, file, { upsert: true });
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
      .update({ company_name: companyName, email, phone, company_logo_url: logoUrl, elevenlabs_voice_id: voiceId || null })
      .eq('user_id', user.id);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Salvo!', description: 'Configurações atualizadas com sucesso.' });
    }
    setSaving(false);
  };

  const handleUpgrade = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      await startCheckout(planId);
    } catch (err) {
      toast({ title: 'Erro', description: 'Não foi possível iniciar o checkout.', variant: 'destructive' });
    }
    setCheckoutLoading(null);
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível abrir o portal de gerenciamento.', variant: 'destructive' });
    }
  };

  const currentPlan = subscription?.plan || 'free';

  const usageItems = [
    { label: 'Apresentações', used: subscription?.usage.presentations || 0, limit: subscription?.limits.presentations || 50 },
    { label: 'Campanhas', used: subscription?.usage.campaigns || 0, limit: subscription?.limits.campaigns || 2 },
    { label: 'Emails enviados', used: subscription?.usage.emails || 0, limit: subscription?.limits.emails || 50 },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-3">
        <Settings2 className="w-6 h-6 text-primary" />
        Configurações
      </h1>

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="empresa">🏢 Empresa</TabsTrigger>
          <TabsTrigger value="faturamento">💳 Faturamento</TabsTrigger>
          <TabsTrigger value="integracoes">⚙️ Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">Logo da Empresa</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center">
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
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm text-foreground">Nome da Empresa</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Sua empresa" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settingsEmail" className="text-sm text-foreground">Email</Label>
              <Input id="settingsEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settingsPhone" className="text-sm text-foreground">Telefone</Label>
              <Input id="settingsPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-primary-foreground font-semibold py-5 glow-primary gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="faturamento">
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">📊 Uso do Mês</h3>
              {subLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {usageItems.map((item) => {
                    const isUnlimited = item.limit === -1;
                    const pct = isUnlimited ? 0 : Math.min(100, (item.used / item.limit) * 100);
                    const isNearLimit = !isUnlimited && pct >= 80;
                    return (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{item.label}</span>
                          <span className={`font-medium ${isNearLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {item.used} / {isUnlimited ? '∞' : item.limit}
                          </span>
                        </div>
                        {!isUnlimited && (
                          <Progress value={pct} className={`h-2 ${isNearLimit ? '[&>div]:bg-destructive' : ''}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Plano Atual
                </h3>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 capitalize">
                  {plans.find(p => p.id === currentPlan)?.name || currentPlan}
                </Badge>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                {plans.map((plan) => {
                  const isCurrent = plan.id === currentPlan;
                  const priceFormatted = plan.price_cents === 0
                    ? 'R$ 0'
                    : `R$ ${(plan.price_cents / 100).toFixed(0)}`;
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-xl border p-4 space-y-3 transition-all ${
                        isCurrent
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-foreground">{plan.name}</p>
                        <p className="text-xl font-bold text-foreground">
                          {priceFormatted}<span className="text-xs font-normal text-muted-foreground">/mês</span>
                        </p>
                      </div>
                      <ul className="space-y-1.5">
                        {plan.features.map((f) => (
                          <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {isCurrent ? (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          Plano atual
                        </Button>
                      ) : !plan.stripe_price_id ? (
                        currentPlan !== 'free' ? (
                          <Button variant="outline" size="sm" className="w-full" onClick={handleManageSubscription}>
                            Gerenciar
                          </Button>
                        ) : null
                      ) : (
                        <Button
                          size="sm"
                          className="w-full gap-1"
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={checkoutLoading === plan.id}
                        >
                          {checkoutLoading === plan.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ExternalLink className="w-3 h-3" />
                          )}
                          Fazer upgrade
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {currentPlan !== 'free' && (
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleManageSubscription}>
                    <ExternalLink className="w-4 h-4" />
                    Gerenciar assinatura no portal
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integracoes">
          <Card className="p-6 space-y-4">
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
                <span className="text-xs text-primary font-medium">Ativo</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📧</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Email</p>
                    <p className="text-xs text-muted-foreground">Envio via API transacional (Resend)</p>
                  </div>
                </div>
                <span className="text-xs text-primary font-medium">Ativo</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
