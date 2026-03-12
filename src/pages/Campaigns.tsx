import { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, Send, Clock, Eye, CheckCircle2, XCircle, Loader2, Calendar } from 'lucide-react';
import CampaignPreviewDialog from '@/components/CampaignPreviewDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  channel: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  total: number;
  sent_count: number;
  accepted: number;
  rejected: number;
}

interface PresentationOption {
  id: string;
  public_id: string;
  business_name: string;
  business_phone: string;
  lead_response: string;
}

const Campaigns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canUse } = useSubscription();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddPresentations, setShowAddPresentations] = useState<string | null>(null);
  const [availablePresentations, setAvailablePresentations] = useState<PresentationOption[]>([]);
  const [selectedPresentationIds, setSelectedPresentationIds] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<{ id: string; name: string; channel: string }[]>([]);

  // Preview state
  const [previewLeads, setPreviewLeads] = useState<{ id: string; business_name: string; business_phone: string; message: string; subject?: string }[]>([]);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);

  // Create form
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formChannel, setFormChannel] = useState('whatsapp');
  const [formSchedule, setFormSchedule] = useState('');
  const [formTemplateId, setFormTemplateId] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('message_templates')
      .select('id, name, channel')
      .eq('user_id', user.id)
      .order('name');
    setTemplates((data as any) || []);
  };

  const fetchCampaigns = async () => {
    if (!user) return;

    const { data: campaignRows } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!campaignRows) { setLoading(false); return; }

    // Get metrics for each campaign
    const enriched: Campaign[] = [];
    for (const c of campaignRows) {
      const { data: cpRows } = await supabase
        .from('campaign_presentations')
        .select('presentation_id, send_status')
        .eq('campaign_id', c.id);

      const presentationIds = (cpRows || []).map(r => r.presentation_id);
      let accepted = 0;
      let rejected = 0;

      if (presentationIds.length > 0) {
        const { data: pRows } = await supabase
          .from('presentations')
          .select('lead_response')
          .in('id', presentationIds);
        accepted = (pRows || []).filter(p => p.lead_response === 'accepted').length;
        rejected = (pRows || []).filter(p => p.lead_response === 'rejected').length;
      }

      enriched.push({
        id: c.id,
        name: c.name,
        description: c.description || '',
        status: c.status,
        channel: c.channel,
        scheduled_at: c.scheduled_at,
        sent_at: c.sent_at,
        created_at: c.created_at,
        total: cpRows?.length || 0,
        sent_count: (cpRows || []).filter(r => r.send_status === 'sent').length,
        accepted,
        rejected,
      });
    }

    setCampaigns(enriched);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !formName.trim()) return;

    if (!canUse('campaigns')) {
      toast({
        title: 'Limite atingido',
        description: 'Você atingiu o limite de campanhas do seu plano. Faça upgrade em Configurações → Faturamento.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    const { error } = await supabase.from('campaigns').insert({
      user_id: user.id,
      name: formName.trim(),
      description: formDesc.trim(),
      channel: formChannel,
      template_id: formTemplateId || null,
      scheduled_at: formSchedule || null,
      status: formSchedule ? 'scheduled' : 'draft',
    } as any);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Campanha criada!' });
      setShowCreate(false);
      setFormName('');
      setFormDesc('');
      setFormChannel('whatsapp');
      setFormSchedule('');
      setFormTemplateId('');
      fetchCampaigns();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Campanha excluída' });
    }
  };

  const openAddPresentations = async (campaignId: string) => {
    if (!user) return;

    // Get already-added presentation IDs
    const { data: existing } = await supabase
      .from('campaign_presentations')
      .select('presentation_id')
      .eq('campaign_id', campaignId);
    const existingIds = new Set((existing || []).map(e => e.presentation_id));

    // Get all ready presentations
    const { data: presentations } = await supabase
      .from('presentations')
      .select('id, public_id, business_name, business_phone, lead_response')
      .eq('user_id', user.id)
      .eq('status', 'ready');

    setAvailablePresentations(
      ((presentations as any) || []).filter((p: PresentationOption) => !existingIds.has(p.id))
    );
    setSelectedPresentationIds(new Set());
    setShowAddPresentations(campaignId);
  };

  const handleAddPresentations = async () => {
    if (!showAddPresentations || selectedPresentationIds.size === 0) return;

    const rows = Array.from(selectedPresentationIds).map(pid => ({
      campaign_id: showAddPresentations,
      presentation_id: pid,
    }));

    const { error } = await supabase.from('campaign_presentations').insert(rows);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `${rows.length} apresentação(ões) adicionada(s)` });
      setShowAddPresentations(null);
      fetchCampaigns();
    }
  };

  const handleSendCampaign = async (campaign: Campaign) => {
    if (!user) return;

    if (!canUse('emails')) {
      toast({
        title: 'Limite atingido',
        description: 'Você atingiu o limite de envios do seu plano. Faça upgrade em Configurações → Faturamento.',
        variant: 'destructive',
      });
      return;
    }

    const { data: cpRows } = await supabase
      .from('campaign_presentations')
      .select('id, presentation_id')
      .eq('campaign_id', campaign.id)
      .eq('send_status', 'pending');

    if (!cpRows || cpRows.length === 0) {
      toast({ title: 'Nada para enviar', description: 'Todas já foram enviadas ou nenhuma adicionada.', variant: 'destructive' });
      return;
    }

    const presIds = cpRows.map(r => r.presentation_id);
    const { data: presentations } = await supabase
      .from('presentations')
      .select('id, public_id, business_name, business_phone, business_website, business_address, business_category, business_rating, analysis_data')
      .in('id', presIds);

    if (!presentations) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name')
      .eq('user_id', user.id)
      .single();

    let template: { body: string; subject: string; image_url: string; include_proposal_link: boolean } | null = null;
    if ((campaign as any).template_id) {
      const { data: tpl } = await supabase
        .from('message_templates')
        .select('body, subject, image_url, include_proposal_link')
        .eq('id', (campaign as any).template_id)
        .single();
      template = tpl as any;
    }

    const replaceVars = (text: string, pres: any, publicUrl: string) => {
      return text
        .replace(/\{\{nome_empresa\}\}/g, pres.business_name || '')
        .replace(/\{\{categoria\}\}/g, pres.business_category || '')
        .replace(/\{\{endereco\}\}/g, pres.business_address || '')
        .replace(/\{\{telefone\}\}/g, pres.business_phone || '')
        .replace(/\{\{website\}\}/g, pres.business_website || '')
        .replace(/\{\{rating\}\}/g, pres.business_rating?.toString() || '')
        .replace(/\{\{score\}\}/g, (pres.analysis_data as any)?.overallScore?.toString() || '')
        .replace(/\{\{link_proposta\}\}/g, publicUrl)
        .replace(/\{\{sua_empresa\}\}/g, profile?.company_name || 'Nossa Empresa');
    };

    const previews = presentations.map(pres => {
      const publicUrl = `${window.location.origin}/presentation/${pres.public_id}`;
      let message: string;
      let subject: string | undefined;
      if (template) {
        message = replaceVars(template.body, pres, publicUrl);
        subject = template.subject ? replaceVars(template.subject, pres, publicUrl) : undefined;
      } else {
        message = `Olá! Sou da ${profile?.company_name || 'nossa empresa'}. Preparamos uma apresentação exclusiva para ${pres.business_name}: ${publicUrl}`;
      }
      return {
        id: pres.id,
        business_name: pres.business_name || 'Sem nome',
        business_phone: pres.business_phone || '',
        message,
        subject,
      };
    });

    setPreviewLeads(previews);
    setPreviewCampaign(campaign);
    setShowPreview(true);
  };

  const confirmSendCampaign = async () => {
    if (!previewCampaign || !user) return;
    setSending(true);

    const campaign = previewCampaign;

    if (campaign.channel === 'email') {
      const { data, error } = await supabase.functions.invoke('send-campaign-emails', {
        body: { campaign_id: campaign.id },
      });
      if (error) {
        toast({ title: 'Erro ao enviar emails', description: error.message, variant: 'destructive' });
        setSending(false);
        return;
      }
      toast({ title: 'Emails enviados!', description: `${data?.sent || 0} email(s) enviado(s)` });
    } else if (campaign.channel === 'whatsapp') {
      const { data: cpRows } = await supabase
        .from('campaign_presentations')
        .select('id, presentation_id')
        .eq('campaign_id', campaign.id)
        .eq('send_status', 'pending');

      for (const lead of previewLeads) {
        const phone = lead.business_phone.replace(/\D/g, '');
        if (!phone) continue;
        const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(lead.message)}`;
        window.open(whatsappUrl, '_blank');

        const cpRow = (cpRows || []).find(r => r.presentation_id === lead.id);
        if (cpRow) {
          await supabase
            .from('campaign_presentations')
            .update({ send_status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', cpRow.id);
        }
      }
    }

    await supabase
      .from('campaigns')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', campaign.id);

    toast({ title: 'Campanha enviada!', description: `${previewLeads.length} mensagen(s) enviada(s)` });
    setShowPreview(false);
    setPreviewCampaign(null);
    setSending(false);
    fetchCampaigns();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Rascunho</Badge>;
      case 'scheduled': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Agendada</Badge>;
      case 'sending': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Enviando</Badge>;
      case 'sent': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Enviada</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelada</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const channelLabel = (ch: string) => {
    switch (ch) {
      case 'whatsapp': return '📱 WhatsApp';
      case 'email': return '📧 Email';
      case 'webhook': return '🔗 Webhook';
      default: return ch;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-primary" />
          Campanhas ({campaigns.length})
        </h1>
        <Button onClick={() => setShowCreate(true)} className="gap-2 gradient-primary text-primary-foreground glow-primary">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nova Campanha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Restaurantes SP - Março" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Objetivo da campanha..." className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>Canal de Envio</Label>
              <Select value={formChannel} onValueChange={(v) => { setFormChannel(v); setFormTemplateId(''); }}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="webhook">🔗 Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Template Selector - filtered by channel */}
            <div className="space-y-2">
              <Label>Template de Mensagem</Label>
              <Select value={formTemplateId} onValueChange={setFormTemplateId}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione um template (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.channel === formChannel).length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Nenhum template de {formChannel === 'whatsapp' ? 'WhatsApp' : 'Email'}. Crie um em Configurações → Templates.
                    </div>
                  ) : (
                    templates
                      .filter(t => t.channel === formChannel)
                      .map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agendamento (opcional)</Label>
              <Input type="datetime-local" value={formSchedule} onChange={e => setFormSchedule(e.target.value)} className="bg-secondary border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !formName.trim()} className="gradient-primary text-primary-foreground glow-primary">
              {creating ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Presentations Dialog */}
      <Dialog open={!!showAddPresentations} onOpenChange={() => setShowAddPresentations(null)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Apresentações</DialogTitle>
          </DialogHeader>
          {availablePresentations.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhuma apresentação disponível para adicionar.</p>
          ) : (
            <div className="space-y-2">
              {availablePresentations.map(p => (
                <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer transition-colors">
                  <Checkbox
                    checked={selectedPresentationIds.has(p.id)}
                    onCheckedChange={(checked) => {
                      const next = new Set(selectedPresentationIds);
                      checked ? next.add(p.id) : next.delete(p.id);
                      setSelectedPresentationIds(next);
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{p.business_name}</p>
                    <p className="text-xs text-muted-foreground">{p.business_phone || 'Sem telefone'}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPresentations(null)}>Cancelar</Button>
            <Button onClick={handleAddPresentations} disabled={selectedPresentationIds.size === 0} className="gradient-primary text-primary-foreground glow-primary">
              Adicionar ({selectedPresentationIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <CampaignPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        leads={previewLeads}
        channel={previewCampaign?.channel || 'whatsapp'}
        campaignName={previewCampaign?.name || ''}
        onConfirmSend={confirmSendCampaign}
        sending={sending}
      />

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card className="p-12 bg-card border-border text-center">
          <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
            <Megaphone className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Nenhuma campanha ainda</h3>
          <p className="text-sm text-muted-foreground mt-1">Crie uma campanha para enviar apresentações em massa.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(c => (
            <Card key={c.id} className="p-6 bg-card border-border">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-foreground text-lg">{c.name}</h3>
                    {statusBadge(c.status)}
                    <Badge variant="outline" className="text-xs">{channelLabel(c.channel)}</Badge>
                  </div>
                  {c.description && <p className="text-sm text-muted-foreground mb-3">{c.description}</p>}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="text-center p-2 rounded-lg bg-secondary/50">
                      <p className="text-xl font-bold text-foreground">{c.total}</p>
                      <p className="text-xs text-muted-foreground">Leads</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-secondary/50">
                      <p className="text-xl font-bold text-foreground">{c.sent_count}</p>
                      <p className="text-xs text-muted-foreground">Enviadas</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-green-500/10">
                      <p className="text-xl font-bold text-green-400">{c.accepted}</p>
                      <p className="text-xs text-muted-foreground">Aceitas</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-red-500/10">
                      <p className="text-xl font-bold text-red-400">{c.rejected}</p>
                      <p className="text-xs text-muted-foreground">Recusadas</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-secondary/50">
                      <p className="text-xl font-bold text-foreground">
                        {c.total > 0 ? Math.round((c.accepted / c.total) * 100) : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Conversão</p>
                    </div>
                  </div>

                  {c.scheduled_at && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Agendada: {new Date(c.scheduled_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openAddPresentations(c.id)}>
                    <Plus className="w-3.5 h-3.5" />
                    Leads
                  </Button>
                  {c.status !== 'sent' && c.total > 0 && (
                    <Button size="sm" className="gap-1.5 gradient-primary text-primary-foreground glow-primary" onClick={() => handleSendCampaign(c)}>
                      <Send className="w-3.5 h-3.5" />
                      Enviar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Campaigns;
