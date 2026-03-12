import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Plus, Trash2, Loader2, Crown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  id: string;
  name: string;
  price_cents: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  limit_presentations: number;
  limit_campaigns: number;
  limit_emails: number;
  features: string[];
  display_order: number;
  is_active: boolean;
}

const PlanManager = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newFeature, setNewFeature] = useState<Record<string, string>>({});

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('display_order');
    if (error) {
      toast({ title: 'Erro ao carregar planos', variant: 'destructive' });
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const updatePlan = (id: string, field: keyof Plan, value: any) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const savePlan = async (plan: Plan) => {
    setSavingId(plan.id);
    const { id, ...rest } = plan;
    const { error } = await supabase
      .from('plans')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Plano salvo!' });
    }
    setSavingId(null);
  };

  const addFeature = (planId: string) => {
    const feat = newFeature[planId]?.trim();
    if (!feat) return;
    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, features: [...p.features, feat] } : p
    ));
    setNewFeature(prev => ({ ...prev, [planId]: '' }));
  };

  const removeFeature = (planId: string, index: number) => {
    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, features: p.features.filter((_, i) => i !== index) } : p
    ));
  };

  const createPlan = async () => {
    const newId = `plan_${Date.now()}`;
    const newPlan: Plan = {
      id: newId,
      name: 'Novo Plano',
      price_cents: 0,
      stripe_price_id: null,
      stripe_product_id: null,
      limit_presentations: 50,
      limit_campaigns: 2,
      limit_emails: 50,
      features: [],
      display_order: plans.length,
      is_active: true,
    };
    const { error } = await supabase.from('plans').insert(newPlan);
    if (error) {
      toast({ title: 'Erro ao criar plano', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Plano criado!' });
      fetchPlans();
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Plano excluído!' });
      fetchPlans();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Gestão de Planos
          </h2>
          <p className="text-sm text-muted-foreground">Gerencie planos, limites e preços da plataforma</p>
        </div>
        <Button onClick={createPlan} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Plano
        </Button>
      </div>

      <div className="grid gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={`${!plan.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {plan.name}
                  <Badge variant="outline" className="text-xs">{plan.id}</Badge>
                  {!plan.is_active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Ativo</Label>
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={(v) => updatePlan(plan.id, 'is_active', v)}
                    />
                  </div>
                  {!['free', 'pro', 'enterprise'].includes(plan.id) && (
                    <Button variant="ghost" size="icon" onClick={() => deletePlan(plan.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={plan.name}
                    onChange={(e) => updatePlan(plan.id, 'name', e.target.value)}
                    className=""
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Preço (R$)</Label>
                  <Input
                    type="number"
                    value={plan.price_cents / 100}
                    onChange={(e) => updatePlan(plan.id, 'price_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                    className=""
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ordem de exibição</Label>
                  <Input
                    type="number"
                    value={plan.display_order}
                    onChange={(e) => updatePlan(plan.id, 'display_order', parseInt(e.target.value || '0'))}
                    className=""
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Limite Apresentações (-1 = ilimitado)</Label>
                  <Input
                    type="number"
                    value={plan.limit_presentations}
                    onChange={(e) => updatePlan(plan.id, 'limit_presentations', parseInt(e.target.value || '0'))}
                    className=""
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Limite Campanhas (-1 = ilimitado)</Label>
                  <Input
                    type="number"
                    value={plan.limit_campaigns}
                    onChange={(e) => updatePlan(plan.id, 'limit_campaigns', parseInt(e.target.value || '0'))}
                    className=""
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Limite Emails (-1 = ilimitado)</Label>
                  <Input
                    type="number"
                    value={plan.limit_emails}
                    onChange={(e) => updatePlan(plan.id, 'limit_emails', parseInt(e.target.value || '0'))}
                    className=""
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Stripe Price ID</Label>
                  <Input
                    value={plan.stripe_price_id || ''}
                    onChange={(e) => updatePlan(plan.id, 'stripe_price_id', e.target.value || null)}
                    placeholder="price_..."
                    className="bg-secondary border-border font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Stripe Product ID</Label>
                  <Input
                    value={plan.stripe_product_id || ''}
                    onChange={(e) => updatePlan(plan.id, 'stripe_product_id', e.target.value || null)}
                    placeholder="prod_..."
                    className="bg-secondary border-border font-mono text-xs"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs">Features (exibidas na página de preços)</Label>
                <div className="flex flex-wrap gap-2">
                  {plan.features.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {f}
                      <button onClick={() => removeFeature(plan.id, i)} className="ml-1 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newFeature[plan.id] || ''}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, [plan.id]: e.target.value }))}
                    placeholder="Nova feature..."
                    className="bg-secondary border-border text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addFeature(plan.id)}
                  />
                  <Button variant="outline" size="sm" onClick={() => addFeature(plan.id)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => savePlan(plan)} disabled={savingId === plan.id} className="gap-2">
                  {savingId === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Plano
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlanManager;
