import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Plus, Trash2, Send, Clock, Loader2, Calendar, CheckCircle2, BarChart3, Pencil, Eye, RefreshCw, CheckCheck, BookOpen, XCircle, AlertTriangle } from 'lucide-react';
import CampaignPreviewDialog from '@/components/CampaignPreviewDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { buildCRMHref } from '@/lib/crm/deriveLeadState';
import { buildCampaignWebhookPayload } from '../../supabase/functions/_shared/campaign-webhook.js';
import { getCampaignDispatchTarget, isDispatchableCampaignChannel } from '../../supabase/functions/_shared/campaign-routing.js';
import { getEdgeFunctionErrorMessage, invokeEdgeFunction } from '@/lib/invoke-edge-function';
import { useNavigate } from 'react-router-dom';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  channel: string;
  template_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  total: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  accepted: number;
  rejected: number;
  views: number;
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
  webhookPayloadPreview?: string;
}

const HYBRID_API_THRESHOLD = 15;

const resolvePublicBaseOrigin = (domain?: string | null) => {
  const fallback = 'https://envpro.com.br';
  const value = (domain || '').trim().replace(/\/+$/, '');
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

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
  const navigate = useNavigate();
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
  const [failuresCampaignId, setFailuresCampaignId] = useState<string | null>(null);
  const [failureRows, setFailureRows] = useState<{ business_name: string; business_phone: string; error_reason: string }[]>([]);

  // Preview state
  const [previewLeads, setPreviewLeads] = useState<PreviewLead[]>([]);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendAsAudio, setSendAsAudio] = useState(false);
  const [voiceId, setVoiceId] = useState<string | null>(null);

  // Create / Edit form
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
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
        .select('presentation_id, send_status, delivery_status')
        .eq('campaign_id', c.id);

      const presentationIds = (cpRows || []).map((r: any) => r.presentation_id);
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

      const { count: viewsCount } = await supabase
        .from('message_conversion_events')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', c.id)
        .eq('event_type', 'opened');

      const rows = (cpRows || []) as any[];
      enriched.push({
        id: c.id,
        name: c.name,
        description: c.description || '',
        status: c.status,
        channel: c.channel,
        template_id: c.template_id || null,
        scheduled_at: c.scheduled_at,
        sent_at: c.sent_at,
        created_at: c.created_at,
        total: rows.length,
        sent_count: rows.filter(r => r.send_status === 'sent').length,
        delivered_count: rows.filter(r => r.delivery_status === 'delivered' || r.delivery_status === 'read').length,
        read_count: rows.filter(r => r.delivery_status === 'read').length,
        failed_count: rows.filter(r => r.send_status === 'failed').length,
        accepted,
        rejected,
        views: viewsCount || 0,
      });
    }

    setCampaigns(enriched);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !formName.trim()) return;

    if (!isDispatchableCampaignChannel(formChannel)) {
      toast({
        title: 'Canal indisponivel',
        description: 'Webhook de campanha ainda nao possui envio automatizado.',
        variant: 'destructive',
      });
      return;
    }

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

  const openEdit = (c: Campaign) => {
    setEditingCampaign(c);
    setFormName(c.name);
    setFormDesc(c.description || '');
    setFormChannel(c.channel);
    setFormSchedule(c.scheduled_at ? c.scheduled_at.slice(0, 16) : '');
    setFormTemplateId(c.template_id || '');
    setShowCreate(true);
  };

  const handleUpdate = async () => {
    if (!editingCampaign || !formName.trim()) return;

    if (!isDispatchableCampaignChannel(formChannel)) {
      toast({
        title: 'Canal indisponivel',
        description: 'Webhook de campanha ainda nao possui envio automatizado.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    const { error } = await supabase.from('campaigns').update({
      name: formName.trim(),
      description: formDesc.trim(),
      channel: formChannel,
      template_id: formTemplateId || null,
      scheduled_at: formSchedule || null,
    } as any).eq('id', editingCampaign.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Campanha atualizada!' });
      setShowCreate(false);
      setEditingCampaign(null);
      setFormName(''); setFormDesc(''); setFormChannel('whatsapp'); setFormSchedule(''); setFormTemplateId('');
      fetchCampaigns();
    }
    setCreating(false);
  };

  const handleForceSend = async (c: Campaign) => {
    // Reset send_status of all campaign_presentations so they can be resent
    await supabase.from('campaign_presentations').update({ send_status: null } as any).eq('campaign_id', c.id);
    await supabase.from('campaigns').update({ status: 'draft' } as any).eq('id', c.id);
    await fetchCampaigns();
    handleSendCampaign({ ...c, status: 'draft', sent_count: 0 });
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
      .select('id, presentation_id, send_status, sent_at, delivery_status, followup_step, next_followup_at, provider_message_id, variant_id')
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
      .select('company_name, elevenlabs_voice_id, proposal_link_domain')
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
    const publishedOrigin = resolvePublicBaseOrigin((profile as any)?.proposal_link_domain);
    
    const cpIdByPresentation = new Map(cpRows.map((row) => [row.presentation_id, row.id]));

    const previews = presentations.map((pres: any) => {
      const cpId = cpIdByPresentation.get(pres.id) || '';
      const cpRow = (cpRows || []).find((row) => row.presentation_id === pres.id);
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
        message = `Olá! Tudo bem?\n\nSou da ${profile?.company_name || 'nossa empresa'} e preparei uma análise personalizada para ${pres.business_name}.\n\nAcesse aqui: ${publicUrl}`;
      }

      let webhookPayloadPreview: string | undefined;
      if (campaign.channel === 'webhook') {
        const webhookPayload = buildCampaignWebhookPayload({
          eventId: `${campaign.id}:${cpId || pres.id}`,
          attemptId: `preview:${campaign.id}:${pres.id}`,
          dispatchedAt: new Date().toISOString(),
          source: 'campaign_preview',
          campaign: {
            id: campaign.id,
            name: campaign.name,
            channel: campaign.channel,
            status: campaign.status,
            description: campaign.description,
            scheduled_at: campaign.scheduled_at,
            sent_at: campaign.sent_at,
            template_id: (campaign as any).template_id || null,
          },
          campaignPresentation: {
            id: cpId,
            send_status: cpRow?.send_status || 'pending',
            sent_at: cpRow?.sent_at || null,
            delivery_status: cpRow?.delivery_status || 'pending',
            followup_step: cpRow?.followup_step || 0,
            next_followup_at: cpRow?.next_followup_at || null,
            provider_message_id: cpRow?.provider_message_id || null,
            variant_id: chosenVariant?.id || null,
          },
          presentation: pres,
          profile: {
            company_name: profile?.company_name || null,
            proposal_link_domain: profile?.proposal_link_domain || null,
          },
          publicUrl,
          messagePreview: message,
          subjectPreview: subject || null,
        });
        webhookPayloadPreview = JSON.stringify(webhookPayload, null, 2);
        message = webhookPayloadPreview;
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
        webhookPayloadPreview,
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
    const dispatchTarget = getCampaignDispatchTarget(campaign.channel);

    if (!dispatchTarget) {
      toast({
        title: 'Canal indisponivel',
        description: 'Webhook de campanha ainda nao possui disparo configurado.',
        variant: 'destructive',
      });
      setSending(false);
      return;
    }

    if (dispatchTarget === 'email') {
      const { data, error } = await invokeEdgeFunction<{ sent?: number }>('send-campaign-emails', {
        body: { campaign_id: campaign.id },
      });
      if (error) {
        toast({ title: 'Erro ao enviar emails', description: error.message, variant: 'destructive' });
        setSending(false);
        return;
      }
      toast({ title: 'Emails enviados!', description: `${data?.sent || 0} email(s) enviado(s)` });
    } else if (dispatchTarget === 'whatsapp') {
      const { data: optimizeData, error: optimizeError } = await invokeEdgeFunction<{ groups_promoted?: number }>('whatsapp-optimize-variants', {
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
        const { data: apiData, error: apiError } = await invokeEdgeFunction<any>('whatsapp-send-batch', {
          body: { campaign_id: campaign.id, threshold: HYBRID_API_THRESHOLD },
        });

        const apiErrorMessage = apiError ? await getEdgeFunctionErrorMessage(apiError) : '';
        const isMissingMetaCredentials =
          apiErrorMessage.includes('Access Token') && apiErrorMessage.includes('Phone Number ID');

        if (!apiError && apiData?.mode === 'api') {
          handledByApi = true;
          const sent = apiData?.sent || 0;
          const failed = apiData?.failed || 0;
          if (failed === 0) {
            toast({ title: 'Envio concluído', description: `${sent} mensagem(ns) enviada(s) com sucesso.` });
          } else {
            toast({
              title: `Envio concluído com falhas`,
              description: `${sent} enviadas · ${failed} falharam. Veja os detalhes no card da campanha.`,
              variant: failed > sent ? 'destructive' : 'default',
            });
          }
        } else if (isMissingMetaCredentials) {
          toast({
            title: 'Integracao Meta incompleta',
            description: apiErrorMessage || 'Configure o Access Token e o Phone Number ID antes de enviar campanhas.',
            variant: 'destructive',
          });
          setSending(false);
          return;
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
    const { data, error } = await invokeEdgeFunction<any>('whatsapp-send-batch', {
      body: { campaign_id: campaignId, send_followups: true },
    });
    if (error) {
      const message = await getEdgeFunctionErrorMessage(error);
      toast({ title: 'Erro no follow-up', description: message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Follow-up executado', description: `${data?.sent || 0} mensagem(ns) enviada(s).` });
    fetchCampaigns();
  };

  const openFailures = async (campaignId: string) => {
    // Load failed campaign_presentations joined with presentation name/phone and last attempt error
    const { data: cpFailed } = await supabase
      .from('campaign_presentations')
      .select('presentation_id')
      .eq('campaign_id', campaignId)
      .eq('send_status', 'failed');

    if (!cpFailed || cpFailed.length === 0) { setFailureRows([]); setFailuresCampaignId(campaignId); return; }

    const presIds = cpFailed.map((r: any) => r.presentation_id);
    const { data: presRows } = await supabase
      .from('presentations')
      .select('id, business_name, business_phone')
      .in('id', presIds);

    const { data: attemptRows } = await supabase
      .from('campaign_message_attempts')
      .select('presentation_id, error_reason, created_at')
      .eq('campaign_id', campaignId)
      .eq('status', 'failed')
      .in('presentation_id', presIds)
      .order('created_at', { ascending: false });

    const lastErrorByPres = new Map<string, string>();
    for (const a of (attemptRows || []) as any[]) {
      if (!lastErrorByPres.has(a.presentation_id)) {
        lastErrorByPres.set(a.presentation_id, a.error_reason || 'Erro desconhecido');
      }
    }

    const rows = ((presRows || []) as any[]).map(p => ({
      business_name: p.business_name || 'Sem nome',
      business_phone: p.business_phone || '—',
      error_reason: lastErrorByPres.get(p.id) || 'Erro desconhecido',
    }));

    setFailureRows(rows);
    setFailuresCampaignId(campaignId);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge className="rounded-full border border-[#e7e7ec] bg-[#f7f7fa] text-[#5f5f68]">Rascunho</Badge>;
      case 'scheduled': return <Badge className="rounded-full border border-[#d9e4ff] bg-[#f4f7ff] text-[#365fc2]">Agendada</Badge>;
      case 'sending': return <Badge className="rounded-full border border-[#efe3cc] bg-[#fff9ef] text-[#9a7a2b]">Enviando</Badge>;
      case 'sent': return <Badge className="rounded-full border border-[#f2d4d8] bg-[#fff3f5] text-[#9b2a3d]">Enviada</Badge>;
      case 'cancelled': return <Badge className="rounded-full border border-[#f5c8ce] bg-[#fff0f2] text-[#c23a4f]">Cancelada</Badge>;
      default: return <Badge className="rounded-full border border-[#e7e7ec] bg-[#f7f7fa] text-[#5f5f68]">{status}</Badge>;
    }
  };

  const channelLabel = (ch: string) => {
    switch (ch) {
      case 'whatsapp': return '📱 WhatsApp';
      case 'email': return '📧 Email';
      case 'webhook': return '🔗 Webhook (indisponivel)';
      default: return ch;
    }
  };

  const overview = useMemo(() => {
    const totalCampaigns = campaigns.length;
    const active = campaigns.filter(c => c.status === 'draft' || c.status === 'scheduled' || c.status === 'sending').length;
    const sent = campaigns.filter(c => c.status === 'sent').length;
    const totalLeads = campaigns.reduce((acc, c) => acc + (c.total || 0), 0);
    const totalAccepted = campaigns.reduce((acc, c) => acc + (c.accepted || 0), 0);
    const conversion = totalLeads > 0 ? Math.round((totalAccepted / totalLeads) * 100) : 0;
    return { totalCampaigns, active, sent, totalLeads, conversion };
  }, [campaigns]);

  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
      <div className="rounded-[28px] border border-[#ececf0] bg-white px-5 py-6 shadow-[0_14px_36px_rgba(20,20,24,0.06)] lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#75757d]">Orquestração Comercial</p>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight text-[#1A1A1A] lg:text-4xl">
              <Megaphone className="h-7 w-7 text-[#EF3333]" />
              Campanhas
            </h1>
            <p className="mt-2 text-sm text-[#66666d] lg:text-base">Crie, dispare e acompanhe campanhas de WhatsApp e Email com visual premium.</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="h-10 rounded-xl gap-2 gradient-primary text-primary-foreground glow-primary">
            <Plus className="h-4 w-4" />
            Nova Campanha
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <p className="text-sm text-[#6f6f76]">Campanhas</p>
          <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{overview.totalCampaigns}</p>
        </Card>
        <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#7c7c83]" />
            <p className="text-sm text-[#6f6f76]">Ativas</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{overview.active}</p>
        </Card>
        <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-[#EF3333]" />
            <p className="text-sm text-[#6f6f76]">Enviadas</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{overview.sent}</p>
        </Card>
        <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#EF3333]" />
            <p className="text-sm text-[#6f6f76]">Leads totais</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{overview.totalLeads}</p>
        </Card>
        <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#EF3333]" />
            <p className="text-sm text-[#6f6f76]">Conversão</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{overview.conversion}%</p>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) { setEditingCampaign(null); setFormName(''); setFormDesc(''); setFormChannel('whatsapp'); setFormSchedule(''); setFormTemplateId(''); } }}>
        <DialogContent className="max-w-xl rounded-[22px] border border-[#ececf0] bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">{editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
            <DialogDescription>
              Configure o canal, template e agendamento {editingCampaign ? 'da campanha.' : 'para criar uma nova campanha.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Restaurantes SP - Marco" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea className="rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Objetivo da campanha..." />
            </div>
            <div className="space-y-2">
              <Label>Canal de Envio</Label>
              <Select value={formChannel} onValueChange={(v) => { setFormChannel(v); setFormTemplateId(''); }}>
                <SelectTrigger className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="webhook" disabled>🔗 Webhook (indisponível)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Template Selector - filtered by channel */}
            <div className="space-y-2">
              <Label>Template de Mensagem</Label>
              <Select value={formTemplateId} onValueChange={setFormTemplateId}>
                <SelectTrigger className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd]">
                  <SelectValue placeholder="Selecione um template (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.channel === formChannel).length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Nenhum template de {formChannel === 'whatsapp' ? 'WhatsApp' : 'Email'}. Crie um em Configurações (menu Templates).
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
              <Input className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]" type="datetime-local" value={formSchedule} onChange={e => setFormSchedule(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={editingCampaign ? handleUpdate : handleCreate} disabled={creating || !formName.trim()} className="rounded-xl gradient-primary text-primary-foreground glow-primary">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingCampaign ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Presentations Dialog */}
      <Dialog open={!!showAddPresentations} onOpenChange={() => setShowAddPresentations(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-[22px] border border-[#ececf0] bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">Adicionar Apresentações</DialogTitle>
            <DialogDescription>
              Selecione as apresentações que devem entrar nesta campanha.
            </DialogDescription>
          </DialogHeader>
          {availablePresentations.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhuma apresentação disponível para adicionar.</p>
          ) : (
            <div className="space-y-2">
              {availablePresentations.map(p => (
                <label key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#e8e8ec] bg-white hover:bg-[#fafafd] cursor-pointer transition-colors">
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
                    <p className="text-xs text-[#6e6e76]">{p.business_phone || 'Sem telefone'}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      navigate(buildCRMHref({ mode: 'queue', leadId: p.id }));
                    }}
                  >
                    CRM
                  </Button>
                </label>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPresentations(null)}>Cancelar</Button>
            <Button onClick={handleAddPresentations} disabled={selectedPresentationIds.size === 0} className="rounded-xl gradient-primary text-primary-foreground glow-primary">
              Adicionar ({selectedPresentationIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Failures Dialog */}
      <Dialog open={!!failuresCampaignId} onOpenChange={(o) => { if (!o) setFailuresCampaignId(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-[22px] border border-[#ececf0] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1A1A1A]">
              <AlertTriangle className="h-5 w-5 text-[#c2620a]" />
              Falhas de Envio
            </DialogTitle>
            <DialogDescription>Leads que não receberam a mensagem e o motivo do erro.</DialogDescription>
          </DialogHeader>
          {failureRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#6d6d75]">Nenhuma falha registrada.</p>
          ) : (
            <div className="space-y-1.5">
              {/* Summary by error type */}
              {(() => {
                const counts = failureRows.reduce((acc, r) => {
                  const key = r.error_reason;
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                return (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {Object.entries(counts).map(([reason, count]) => (
                      <span key={reason} className="rounded-full border border-[#f5d8c8] bg-[#fff8f4] px-2.5 py-0.5 text-[11px] font-medium text-[#c2620a]">
                        {count}× {reason}
                      </span>
                    ))}
                  </div>
                );
              })()}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Empresa</TableHead>
                    <TableHead className="text-xs">Telefone</TableHead>
                    <TableHead className="text-xs">Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failureRows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{r.business_name}</TableCell>
                      <TableCell className="text-sm text-[#6d6d75]">{r.business_phone}</TableCell>
                      <TableCell className="text-xs text-[#c2620a]">{r.error_reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailuresCampaignId(null)}>Fechar</Button>
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
        <Card className="rounded-[24px] border border-[#ececf0] bg-white p-12 text-center shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <div className="w-16 h-16 rounded-full bg-[#fff1f3] mx-auto flex items-center justify-center mb-4">
            <Megaphone className="w-8 h-8 text-[#EF3333]" />
          </div>
          <h3 className="text-lg font-medium text-[#1A1A1A]">Nenhuma campanha ainda</h3>
          <p className="text-sm text-muted-foreground mt-1">Crie uma campanha para enviar apresentações em massa.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(c => (
            <Card key={c.id} className="rounded-[22px] border border-[#ececf0] bg-white p-6 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-[#1A1A1A] text-lg truncate">{c.name}</h3>
                    {statusBadge(c.status)}
                    <Badge variant="outline" className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-xs text-[#5f5f67]">{channelLabel(c.channel)}</Badge>
                  </div>
                  {c.description && <p className="text-sm text-[#6e6e76] mb-3">{c.description}</p>}

                  {/* Metrics */}
                  <div className={`grid gap-2 ${c.channel === 'whatsapp' ? 'grid-cols-4 sm:grid-cols-7' : 'grid-cols-3 sm:grid-cols-6'}`}>
                    <div className="text-center p-2 rounded-xl bg-[#f7f7fa]">
                      <p className="text-xl font-bold text-[#1A1A1A]">{c.total}</p>
                      <p className="text-xs text-[#7b7b83]">Leads</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-[#f7f7fa]">
                      <p className="text-xl font-bold text-[#1A1A1A]">{c.sent_count}</p>
                      <p className="text-xs text-[#7b7b83]">Enviadas</p>
                    </div>
                    {c.channel === 'whatsapp' && (
                      <>
                        <div className="text-center p-2 rounded-xl bg-[#f0faf4]">
                          <p className="text-xl font-bold text-[#1a7a4a]">{c.delivered_count}</p>
                          <p className="text-xs text-[#7b7b83] flex items-center justify-center gap-0.5"><CheckCheck className="w-3 h-3" /> Entregues</p>
                        </div>
                        <div className="text-center p-2 rounded-xl bg-[#eef5ff]">
                          <p className="text-xl font-bold text-[#2563b0]">{c.read_count}</p>
                          <p className="text-xs text-[#7b7b83] flex items-center justify-center gap-0.5"><BookOpen className="w-3 h-3" /> Lidas</p>
                        </div>
                        {c.failed_count > 0 && (
                          <div className="text-center p-2 rounded-xl bg-[#fff5f0]">
                            <p className="text-xl font-bold text-[#c2620a]">{c.failed_count}</p>
                            <p className="text-xs text-[#7b7b83] flex items-center justify-center gap-0.5"><XCircle className="w-3 h-3" /> Falhas</p>
                          </div>
                        )}
                      </>
                    )}
                    {c.channel === 'email' && (
                      <div className="text-center p-2 rounded-xl bg-[#f0f4ff]">
                        <p className="text-xl font-bold text-[#3b5fc2]">{c.views}</p>
                        <p className="text-xs text-[#7b7b83] flex items-center justify-center gap-0.5"><Eye className="w-3 h-3" /> Abertas</p>
                      </div>
                    )}
                    <div className="text-center p-2 rounded-xl bg-[#fff3f5]">
                      <p className="text-xl font-bold text-[#EF3333]">{c.accepted}</p>
                      <p className="text-xs text-[#7b7b83]">Aceitas</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-[#f7f7fa]">
                      <p className="text-xl font-bold text-[#1A1A1A]">
                        {c.total > 0 ? Math.round((c.accepted / c.total) * 100) : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Conversão</p>
                    </div>
                  </div>

                  {c.scheduled_at && (
                    <p className="text-xs text-[#7b7b83] mt-3 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Agendada: {new Date(c.scheduled_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>

                <div className="flex sm:flex-col flex-row flex-wrap gap-1 shrink-0">
                  <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5 border-[#e6e6eb] hover:bg-[#f8f8fa]" onClick={() => openAddPresentations(c.id)}>
                    <Plus className="w-3.5 h-3.5" />
                    Leads
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5 border-[#e6e6eb] hover:bg-[#f8f8fa]" onClick={() => openEdit(c)}>
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  {c.status !== 'sent' && c.total > 0 && (
                    <Button size="sm" className="h-9 rounded-xl gap-1.5 gradient-primary text-primary-foreground glow-primary" onClick={() => handleSendCampaign(c)}>
                      <Send className="w-3.5 h-3.5" />
                      Enviar
                    </Button>
                  )}
                  {c.status === 'sent' && c.total > 0 && (
                    <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5 border-[#e6e6eb] hover:bg-[#fff8f0] hover:text-[#c2620a]" onClick={() => handleForceSend(c)}>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reenviar
                    </Button>
                  )}
                  {c.channel === 'whatsapp' && c.status === 'sent' && (
                    <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5 border-[#e6e6eb] hover:bg-[#f8f8fa]" onClick={() => handleRunFollowup(c.id)}>
                      <Clock className="w-3.5 h-3.5" />
                      Follow-up
                    </Button>
                  )}
                  {c.failed_count > 0 && (
                    <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5 border-[#f5d8c8] bg-[#fff8f4] text-[#c2620a] hover:bg-[#fff0e6]" onClick={() => openFailures(c.id)}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {c.failed_count} falha(s)
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-9 rounded-xl gap-1.5 text-[#8a8a92] hover:bg-[#fff1f3] hover:text-[#bc374e]" onClick={() => handleDelete(c.id)}>
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
