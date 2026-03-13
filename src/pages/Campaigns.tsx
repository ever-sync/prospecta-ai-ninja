import { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, Send, Clock, Loader2, Calendar } from 'lucide-react';
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

interface TemplateRow {
  id: string;
  name: string;
  channel: string;
  body?: string;
  subject?: string;
  image_url?: string;
  include_proposal_link?: boolean;
  send_as_audio?: boolean;
  experiment_group?: string | null;
  variant_key?: string;
  target_persona?: string | null;
  campaign_objective?: string | null;
  cta_trigger?: string | null;
  is_active?: boolean;
}

interface PreviewLead {
  id: string;
  campaignPresentationId: string;
  business_name: string;
  business_phone: string;
  business_category?: string | null;
  pipeline_stage_id?: string | null;
  analysis_data?: any;
  public_id: string;
  publicUrl: string;
  message: string;
  subject?: string;
  templateId?: string | null;
  variantId?: string | null;
}

const HYBRID_API_THRESHOLD = 15;

const scoreBucket = (analysisData: any): 'low' | 'medium' | 'high' | 'unknown' => {
  const score = analysisData?.scores?.overall;
  if (typeof score !== 'number') return 'unknown';
  if (score < 40) return 'low';
  if (score < 70) return 'medium';
  return 'high';
};

const normalizeText = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const variantPriorityScore = (
  variant: TemplateRow,
  lead: Pick<PreviewLead, 'business_category' | 'analysis_data'>
) => {
  const persona = normalizeText(variant.target_persona);
  const objective = normalizeText(variant.campaign_objective);
  const trigger = normalizeText(variant.cta_trigger);
  const leadCategory = normalizeText(lead.business_category);
  const bucket = scoreBucket(lead.analysis_data);

  let score = 0;
  if (persona) {
    if (leadCategory && persona.includes(leadCategory)) score += 4;
    if (persona.includes(bucket) || persona.includes(`score:${bucket}`)) score += 4;
  }
  if (objective.includes('recuperar') && bucket === 'low') score += 1;
  if (objective.includes('escala') && bucket === 'high') score += 1;
  if (trigger.includes('urgencia') && bucket !== 'high') score += 1;
  if (trigger.includes('prova social') && bucket === 'medium') score += 1;
  return score;
};

const pickVariantForLead = (
  lead: Pick<PreviewLead, 'id' | 'business_category' | 'analysis_data'>,
  variants: TemplateRow[],
  fallback: TemplateRow | null
) => {
  if (variants.length === 0) return fallback;
  if (variants.length === 1) return variants[0];

  const scored = variants.map((variant) => ({
    variant,
    score: variantPriorityScore(variant, lead),
  }));

  const topScore = Math.max(...scored.map(row => row.score));
  const top = scored.filter(row => row.score === topScore).map(row => row.variant);
  return top[hashToIndex(lead.id, top.length)] || fallback;
};

const hashToIndex = (value: string, max: number) => {
  if (max <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % max;
};

const plusDaysIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

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
  const [templates, setTemplates] = useState<TemplateRow[]>([]);

  // Preview state
  const [previewLeads, setPreviewLeads] = useState<PreviewLead[]>([]);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendAsAudio, setSendAsAudio] = useState(false);
  const [voiceId, setVoiceId] = useState<string | null>(null);

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
      .select('id, name, channel, experiment_group, variant_key, target_persona, campaign_objective, cta_trigger, is_active')
      .eq('user_id', user.id)
      .order('name');
    setTemplates((data as TemplateRow[]) || []);
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
      .select('id, public_id, business_name, business_phone, business_website, business_address, business_category, business_rating, analysis_data, pipeline_stage_id')
      .in('id', presIds);

    if (!presentations) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, elevenlabs_voice_id')
      .eq('user_id', user.id)
      .single();

    let template: TemplateRow | null = null;
    if ((campaign as any).template_id) {
      const { data: tpl } = await supabase
        .from('message_templates')
        .select('id, name, channel, body, subject, image_url, include_proposal_link, send_as_audio, experiment_group, variant_key, target_persona, campaign_objective, cta_trigger, is_active')
        .eq('id', (campaign as any).template_id)
        .single();
      template = tpl as TemplateRow;
    }

    let variants: TemplateRow[] = [];
    if (template?.experiment_group) {
      const { data: variantRows } = await supabase
        .from('message_templates')
        .select('id, name, channel, body, subject, image_url, include_proposal_link, send_as_audio, experiment_group, variant_key, target_persona, campaign_objective, cta_trigger, is_active')
        .eq('user_id', user.id)
        .eq('channel', campaign.channel)
        .eq('experiment_group', template.experiment_group)
        .eq('is_active', true)
        .order('variant_key');
      variants = (variantRows as TemplateRow[]) || [];
    }
    if (variants.length === 0 && template) variants = [template];

    setSendAsAudio((template?.send_as_audio || false) && campaign.channel === 'whatsapp');
    setVoiceId(profile?.elevenlabs_voice_id || null);

    const replaceVars = (text: string, pres: any, publicUrl: string) => {
      return text
        .replace(/\{\{nome_empresa\}\}/g, pres.business_name || '')
        .replace(/\{\{categoria\}\}/g, pres.business_category || '')
        .replace(/\{\{endereco\}\}/g, pres.business_address || '')
        .replace(/\{\{telefone\}\}/g, pres.business_phone || '')
        .replace(/\{\{website\}\}/g, pres.business_website || '')
        .replace(/\{\{rating\}\}/g, pres.business_rating?.toString() || '')
        .replace(/\{\{score\}\}/g, (pres.analysis_data as any)?.scores?.overall?.toString() || '')
        .replace(/\{\{link_proposta\}\}/g, publicUrl)
        .replace(/\{\{sua_empresa\}\}/g, profile?.company_name || 'Nossa Empresa');
    };

    // Use published URL if available, fallback to current origin
    const publishedOrigin = 'https://prospecta-ai-ninja.lovable.app';
    
    const cpIdByPresentation = new Map(cpRows.map((row) => [row.presentation_id, row.id]));

    const previews = presentations.map((pres: any) => {
      const cpId = cpIdByPresentation.get(pres.id) || '';
      const chosenVariant = pickVariantForLead(
        {
          id: pres.id,
          business_category: pres.business_category || null,
          analysis_data: pres.analysis_data,
        },
        variants,
        template
      );
      const tracking = new URLSearchParams({
        cid: campaign.id,
        cpid: cpId,
        ch: campaign.channel,
        src: campaign.channel === 'whatsapp' ? 'campaign_whatsapp' : 'campaign_email',
      });
      if ((campaign as any).template_id) tracking.set('tid', (campaign as any).template_id);
      if (chosenVariant?.id) tracking.set('vid', chosenVariant.id);
      const publicUrl = `${publishedOrigin}/presentation/${pres.public_id}?${tracking.toString()}`;
      let message: string;
      let subject: string | undefined;
      if (chosenVariant?.body || template?.body) {
        const body = chosenVariant?.body || template?.body || '';
        message = replaceVars(body, pres, publicUrl);
        const subjectTemplate = chosenVariant?.subject || template?.subject;
        subject = subjectTemplate ? replaceVars(subjectTemplate, pres, publicUrl) : undefined;
      } else {
        message = `Ola! Tudo bem?\n\nSou da ${profile?.company_name || 'nossa empresa'} e preparei uma analise personalizada para ${pres.business_name}.\n\nAcesse aqui: ${publicUrl}`;
      }
      return {
        id: pres.id,
        campaignPresentationId: cpId,
        business_name: pres.business_name || 'Sem nome',
        business_phone: pres.business_phone || '',
        business_category: pres.business_category || null,
        pipeline_stage_id: pres.pipeline_stage_id || null,
        analysis_data: pres.analysis_data,
        public_id: pres.public_id,
        publicUrl,
        message,
        subject,
        templateId: (campaign as any).template_id || null,
        variantId: chosenVariant?.id || null,
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
      const { data: optimizeData, error: optimizeError } = await supabase.functions.invoke('whatsapp-optimize-variants', {
        body: { mode: 'auto' },
      });
      if (optimizeError) {
        console.warn('Falha ao executar otimização semanal de variantes:', optimizeError);
      } else if (optimizeData?.groups_promoted > 0) {
        toast({
          title: 'Otimização A/B aplicada',
          description: `${optimizeData.groups_promoted} grupo(s) de variante atualizados antes do envio.`,
        });
      }

      let handledByApi = false;
      if (previewLeads.length > HYBRID_API_THRESHOLD) {
        const { data: apiData, error: apiError } = await supabase.functions.invoke('whatsapp-send-batch', {
          body: { campaign_id: campaign.id, threshold: HYBRID_API_THRESHOLD },
        });

        if (!apiError && apiData?.mode === 'api') {
          handledByApi = true;
          toast({
            title: 'Envio API concluido',
            description: `${apiData?.sent || 0} enviados, ${apiData?.failed || 0} falhas.`,
          });
        } else if (apiError) {
          console.error('whatsapp-send-batch error, fallback manual:', apiError);
        }
      }

      if (!handledByApi) {
      const { data: cpRows } = await supabase
        .from('campaign_presentations')
        .select('id, presentation_id')
        .eq('campaign_id', campaign.id)
        .eq('send_status', 'pending');

      for (const lead of previewLeads) {
        const phone = lead.business_phone.replace(/\D/g, '');
        if (!phone) continue;

        let finalMessage = lead.message;

        // Generate audio if send_as_audio is enabled
        if (sendAsAudio && voiceId) {
          try {
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ text: lead.message, voice_id: voiceId }),
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.audioContent) {
                // Decode base64 and upload to storage
                const binaryStr = atob(data.audioContent);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                  bytes[i] = binaryStr.charCodeAt(i);
                }
                const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
                const audioPath = `${user.id}/${campaign.id}/${lead.id}.mp3`;

                const { error: uploadError } = await supabase.storage
                  .from('audio-messages')
                  .upload(audioPath, audioBlob, { upsert: true, contentType: 'audio/mpeg' });

                if (!uploadError) {
                  const { data: { publicUrl } } = supabase.storage
                    .from('audio-messages')
                    .getPublicUrl(audioPath);
                  finalMessage += `\n\n🎙️ Ouça a mensagem em áudio: ${publicUrl}`;
                }
              }
            }
          } catch (audioErr) {
            console.error('Audio generation error for lead:', lead.id, audioErr);
          }
        }

        // Add country code 55 only if not already present
        const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
        const whatsappUrl = `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(finalMessage)}`;
        try {
          await navigator.clipboard.writeText(finalMessage);
        } catch (clipboardError) {
          console.warn('Falha ao copiar mensagem para clipboard:', clipboardError);
        }
        window.open(whatsappUrl, '_blank');

        const cpRow = (cpRows || []).find(r => r.presentation_id === lead.id);
        if (cpRow) {
          const sentAt = new Date().toISOString();
          await supabase
            .from('campaign_presentations')
            .update({
              send_status: 'sent',
              sent_at: sentAt,
              delivery_status: 'sent',
              last_status_at: sentAt,
              variant_id: lead.variantId || null,
              followup_step: 0,
              next_followup_at: plusDaysIso(1),
            } as any)
            .eq('id', cpRow.id);

          await supabase.from('campaign_message_attempts').insert({
            user_id: user.id,
            campaign_presentation_id: cpRow.id,
            campaign_id: campaign.id,
            presentation_id: lead.id,
            template_id: lead.templateId || null,
            variant_id: lead.variantId || null,
            channel: 'whatsapp',
            send_mode: 'manual',
            provider: 'manual',
            status: 'sent',
            sent_at: sentAt,
            next_followup_at: plusDaysIso(1),
            metadata: {
              manual_window_open: true,
              public_url: lead.publicUrl,
            },
          } as any);

          await supabase.from('message_conversion_events').insert({
            event_type: 'sent',
            presentation_id: lead.id,
            user_id: user.id,
            campaign_id: campaign.id,
            campaign_presentation_id: cpRow.id,
            template_id: lead.templateId || null,
            variant_id: lead.variantId || null,
            channel: 'whatsapp',
            pipeline_stage_id: lead.pipeline_stage_id || null,
            niche: lead.business_category || null,
            score_bucket: scoreBucket(lead.analysis_data),
            source: 'manual_whatsapp',
            metadata: {
              public_url: lead.publicUrl,
            },
          } as any);
        }
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

  const handleRunFollowup = async (campaignId: string) => {
    const { data, error } = await supabase.functions.invoke('whatsapp-send-batch', {
      body: { campaign_id: campaignId, send_followups: true },
    });
    if (error) {
      toast({ title: 'Erro no follow-up', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Follow-up executado', description: `${data?.sent || 0} mensagem(ns) enviada(s).` });
    fetchCampaigns();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Rascunho</Badge>;
      case 'scheduled': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Agendada</Badge>;
      case 'sending': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Enviando</Badge>;
      case 'sent': return <Badge className="bg-[#EF3333]/20 text-[#EF3333] border-[#EF3333]/30">Enviada</Badge>;
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
      <div className="p-4 lg:p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-primary" />
          Campanhas ({campaigns.length})
        </h1>
        <Button onClick={() => setShowCreate(true)} className="gap-2 gradient-primary text-primary-foreground glow-primary w-full sm:w-auto">
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
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Objetivo da campanha..." />
            </div>
            <div className="space-y-2">
              <Label>Canal de Envio</Label>
              <Select value={formChannel} onValueChange={(v) => { setFormChannel(v); setFormTemplateId(''); }}>
                <SelectTrigger>
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
                <SelectTrigger>
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
              <Input type="datetime-local" value={formSchedule} onChange={e => setFormSchedule(e.target.value)} />
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
        <DialogContent className="bg-card max-w-lg max-h-[80vh] overflow-y-auto">
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
                      if (checked) {
                        next.add(p.id);
                      } else {
                        next.delete(p.id);
                      }
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
        sendAsAudio={sendAsAudio}
      />

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
            <Megaphone className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Nenhuma campanha ainda</h3>
          <p className="text-sm text-muted-foreground mt-1">Crie uma campanha para enviar apresentações em massa.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(c => (
            <Card key={c.id} className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground text-lg truncate">{c.name}</h3>
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
                    <div className="text-center p-2 rounded-lg bg-[#EF3333]/10">
                      <p className="text-xl font-bold text-[#EF3333]">{c.accepted}</p>
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

                <div className="flex sm:flex-col flex-row flex-wrap gap-1 shrink-0">
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
                  {c.channel === 'whatsapp' && c.status === 'sent' && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleRunFollowup(c.id)}>
                      <Clock className="w-3.5 h-3.5" />
                      Follow-up
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
