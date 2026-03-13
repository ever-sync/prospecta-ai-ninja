import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Image, Link2, MessageSquare, Mail, Loader2, FileText, Mic, Square, Volume2, Pencil, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProposalTemplateTab from '@/components/ProposalTemplateTab';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Template {
  id: string;
  name: string;
  channel: string;
  subject: string;
  body: string;
  image_url: string;
  include_proposal_link: boolean;
  send_as_audio: boolean;
  variant_key: string;
  experiment_group: string | null;
  target_persona: string | null;
  campaign_objective: string | null;
  cta_trigger: string | null;
  is_active: boolean;
  created_at: string;
}

const VARIABLES = [
  { key: '{{nome_empresa}}', label: 'Nome da empresa', desc: 'Nome do lead' },
  { key: '{{categoria}}', label: 'Categoria', desc: 'Setor do lead' },
  { key: '{{endereco}}', label: 'Endereco', desc: 'Endereco do lead' },
  { key: '{{telefone}}', label: 'Telefone', desc: 'Telefone do lead' },
  { key: '{{website}}', label: 'Website', desc: 'Site do lead' },
  { key: '{{rating}}', label: 'Rating Google', desc: 'Nota no Google' },
  { key: '{{score}}', label: 'Score Geral', desc: 'Score da analise' },
  { key: '{{link_proposta}}', label: 'Link da Proposta', desc: 'URL da apresentacao' },
  { key: '{{sua_empresa}}', label: 'Sua Empresa', desc: 'Nome da sua empresa' },
];

const fieldClass = 'h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]';
const sectionCardClass = 'rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]';

const getDefaultBodyByChannel = (channel: string) => {
  if (channel === 'whatsapp') {
    return 'Ola! Sou da {{sua_empresa}}. Preparamos uma analise exclusiva para {{nome_empresa}}.\n\nVeja sua proposta: {{link_proposta}}';
  }
  if (channel === 'email') {
    return 'Ola, {{nome_empresa}}!\n\nAnalisamos o seu negocio e preparamos uma proposta personalizada com oportunidades praticas de crescimento.\n\nAcesse aqui: {{link_proposta}}\n\nAtenciosamente,\n{{sua_empresa}}';
  }
  if (channel === 'formulario') {
    return 'Ola, {{nome_empresa}}! Para personalizarmos sua proposta, responda este formulario rapido:\n\nNome:\nWhatsApp:\nPrincipal desafio hoje:\nObjetivo para os proximos 90 dias:\n\nLink: {{link_proposta}}';
  }
  return '';
};

const TemplatesManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [creationChannel, setCreationChannel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formChannel, setFormChannel] = useState('whatsapp');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIncludeLink, setFormIncludeLink] = useState(true);
  const [formSendAsAudio, setFormSendAsAudio] = useState(false);
  const [formVariantKey, setFormVariantKey] = useState('A');
  const [formExperimentGroup, setFormExperimentGroup] = useState('');
  const [formTargetPersona, setFormTargetPersona] = useState('');
  const [formCampaignObjective, setFormCampaignObjective] = useState('');
  const [formCtaTrigger, setFormCtaTrigger] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioRef] = useState<{ current: HTMLAudioElement | null }>({ current: null });

  useEffect(() => {
    if (user) fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;
    const { data } = await supabase.from('message_templates').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setTemplates((data as any) || []);
    setLoading(false);
  };

  const openCreate = (channel: string) => {
    setEditingTemplate(null);
    setCreationChannel(channel);
    setActiveTab(channel);
    setFormName('');
    setFormChannel(channel);
    setFormSubject('');
    setFormBody(getDefaultBodyByChannel(channel));
    setFormImageUrl('');
    setFormIncludeLink(true);
    setFormSendAsAudio(false);
    setFormVariantKey('A');
    setFormExperimentGroup('');
    setFormTargetPersona('');
    setFormCampaignObjective('');
    setFormCtaTrigger('');
    setFormIsActive(true);
    setShowEditor(true);
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setCreationChannel(null);
    setFormName(t.name);
    setFormChannel(t.channel);
    setFormSubject(t.subject);
    setFormBody(t.body);
    setFormImageUrl(t.image_url);
    setFormIncludeLink(t.include_proposal_link);
    setFormSendAsAudio(t.send_as_audio || false);
    setFormVariantKey(t.variant_key || 'A');
    setFormExperimentGroup(t.experiment_group || '');
    setFormTargetPersona(t.target_persona || '');
    setFormCampaignObjective(t.campaign_objective || '');
    setFormCtaTrigger(t.cta_trigger || '');
    setFormIsActive(t.is_active ?? true);
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!user || !formName.trim() || !formBody.trim()) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      name: formName.trim(),
      channel: formChannel,
      subject: formSubject.trim(),
      body: formBody,
      image_url: formImageUrl,
      include_proposal_link: formIncludeLink,
      send_as_audio: formChannel === 'whatsapp' ? formSendAsAudio : false,
      variant_key: formVariantKey || 'A',
      experiment_group: formExperimentGroup.trim() || null,
      target_persona: formTargetPersona.trim() || null,
      campaign_objective: formCampaignObjective.trim() || null,
      cta_trigger: formCtaTrigger.trim() || null,
      is_active: formIsActive,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingTemplate) {
      ({ error } = await supabase.from('message_templates').update(payload).eq('id', editingTemplate.id));
    } else {
      ({ error } = await supabase.from('message_templates').insert(payload));
    }

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingTemplate ? 'Template atualizado!' : 'Template criado!' });
      setShowEditor(false);
      fetchTemplates();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('message_templates').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({ title: 'Template excluido' });
    }
  };

  const handleOptimizeVariants = async () => {
    setOptimizing(true);
    const { data, error } = await supabase.functions.invoke('whatsapp-optimize-variants', {
      body: { mode: 'manual' },
    });
    if (error) {
      toast({ title: 'Erro na otimizacao', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Otimizacao concluida',
        description: `${data?.groups_promoted || 0} grupo(s) atualizados.`,
      });
      fetchTemplates();
    }
    setOptimizing(false);
  };

  const insertVariable = (variable: string) => {
    setFormBody((prev) => prev + variable);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/template-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from('company-logos').upload(path, file, { upsert: true });

    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } else {
      const {
        data: { publicUrl },
      } = supabase.storage.from('company-logos').getPublicUrl(path);
      setFormImageUrl(publicUrl);
    }
    setUploading(false);
  };

  const getPreviewText = () => {
    return formBody
      .replace(/\{\{nome_empresa\}\}/g, 'Restaurante Exemplo')
      .replace(/\{\{categoria\}\}/g, 'Restaurante')
      .replace(/\{\{endereco\}\}/g, 'Rua Exemplo, 123')
      .replace(/\{\{telefone\}\}/g, '(11) 99999-9999')
      .replace(/\{\{website\}\}/g, 'www.exemplo.com.br')
      .replace(/\{\{rating\}\}/g, '4.5')
      .replace(/\{\{score\}\}/g, '72')
      .replace(/\{\{link_proposta\}\}/g, 'https://app.com/presentation/abc123')
      .replace(/\{\{sua_empresa\}\}/g, 'Minha Empresa');
  };

  const getChannelLabel = (channel: string) => {
    if (channel === 'whatsapp') return 'WhatsApp';
    if (channel === 'email') return 'Email';
    if (channel === 'formulario') return 'Formulario';
    return channel;
  };

  const getChannelIcon = (channel: string) => {
    if (channel === 'whatsapp') return <MessageSquare className="h-5 w-5 text-[#EF3333]" />;
    if (channel === 'email') return <Mail className="h-5 w-5 text-[#EF3333]" />;
    if (channel === 'formulario') return <ClipboardList className="h-5 w-5 text-[#EF3333]" />;
    return <FileText className="h-5 w-5 text-[#EF3333]" />;
  };

  const handleAudioPreview = async () => {
    if (!user || !formBody.trim()) return;

    if (audioPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setAudioPlaying(false);
      return;
    }

    setGeneratingAudio(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('elevenlabs_voice_id').eq('user_id', user.id).single();

      if (!profile?.elevenlabs_voice_id) {
        toast({
          title: 'Voice ID nao configurado',
          description: 'Vá em Configuracoes e cole seu Voice ID do ElevenLabs.',
          variant: 'destructive',
        });
        setGeneratingAudio(false);
        return;
      }

      const previewText = getPreviewText();

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: previewText, voice_id: profile.elevenlabs_voice_id }),
      });

      if (!response.ok) throw new Error('Falha ao gerar audio');

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);

      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      setAudioPreviewUrl(audioUrl);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setAudioPlaying(false);
      setAudioPlaying(true);
      await audio.play();
    } catch (err: any) {
      toast({ title: 'Erro ao gerar audio', description: err.message, variant: 'destructive' });
    }
    setGeneratingAudio(false);
  };

  const whatsappTemplates = templates.filter((t) => t.channel === 'whatsapp');
  const emailTemplates = templates.filter((t) => t.channel === 'email');
  const formularioTemplates = templates.filter((t) => t.channel === 'formulario');

  const renderTemplateList = (list: Template[], channel: string) => (
    <div className="space-y-4">
      {channel === 'whatsapp' && (
        <Button
          onClick={handleOptimizeVariants}
          className="h-10 w-full rounded-xl border border-[#e7d7db] bg-[#fff5f6] text-[#9b2a3d] hover:bg-[#ffeef1]"
          disabled={optimizing}
          variant="outline"
        >
          {optimizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
          {optimizing ? 'Otimizando variantes...' : 'Rodar otimizacao A/B agora'}
        </Button>
      )}

      <Button onClick={() => openCreate(channel)} variant="outline" className="h-10 w-full rounded-xl gap-2 border-dashed border-[#e5e5ea] hover:bg-[#fafafd]">
        <Plus className="h-4 w-4" />
        Novo Template de {getChannelLabel(channel)}
      </Button>

      {list.length === 0 ? (
        <Card className={sectionCardClass}>
          <p className="py-8 text-center text-sm text-[#6d6d75]">Nenhum template de {getChannelLabel(channel)} criado ainda.</p>
        </Card>
      ) : (
        list.map((t) => (
          <Card key={t.id} className={sectionCardClass}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h4 className="truncate font-medium text-[#1A1A1A]">{t.name}</h4>
                  <Badge variant="outline" className="shrink-0 rounded-full border-[#ececf0] bg-[#f8f8fa] text-xs text-[#5f5f67]">
                    Variante {t.variant_key || 'A'}
                  </Badge>
                  {t.experiment_group && (
                    <Badge variant="outline" className="shrink-0 rounded-full border-[#f2d4d8] bg-[#fff3f5] text-xs text-[#9b2a3d]">
                      A/B: {t.experiment_group}
                    </Badge>
                  )}
                  {t.is_active === false && (
                    <Badge variant="outline" className="shrink-0 rounded-full border-[#efe7d2] bg-[#fffbf2] text-xs text-[#9a7a2b]">
                      Inativo
                    </Badge>
                  )}
                  {t.include_proposal_link && (
                    <Badge variant="outline" className="shrink-0 rounded-full border-[#ececf0] bg-[#f8f8fa] text-xs text-[#5f5f67]">
                      <Link2 className="mr-1 h-3 w-3" /> Link
                    </Badge>
                  )}
                  {t.image_url && (
                    <Badge variant="outline" className="shrink-0 rounded-full border-[#ececf0] bg-[#f8f8fa] text-xs text-[#5f5f67]">
                      <Image className="mr-1 h-3 w-3" /> Imagem
                    </Badge>
                  )}
                  {t.send_as_audio && (
                    <Badge variant="outline" className="shrink-0 rounded-full border-[#f2d4d8] bg-[#fff3f5] text-xs text-[#9b2a3d]">
                      Audio
                    </Badge>
                  )}
                </div>
                {t.subject && <p className="mb-1 text-xs text-[#6d6d75]">Assunto: {t.subject}</p>}
                {(t.target_persona || t.campaign_objective) && (
                  <p className="mb-1 text-xs text-[#6d6d75]">
                    {t.target_persona ? `Persona: ${t.target_persona}` : ''}
                    {t.target_persona && t.campaign_objective ? ' - ' : ''}
                    {t.campaign_objective ? `Objetivo: ${t.campaign_objective}` : ''}
                  </p>
                )}
                <p className="line-clamp-2 text-sm text-[#5e5e66]">{t.body}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#707078] hover:bg-[#f5f5f7] hover:text-[#1A1A1A]" onClick={() => openEdit(t)} title="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl text-[#8a8a92] hover:bg-[#fff1f3] hover:text-[#bc374e]"
                  onClick={() => handleDelete(t.id)}
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#EF3333]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-4 rounded-[22px] border border-[#ececf0] bg-[#f4f4f6] p-1.5">
          <TabsTrigger
            value="whatsapp"
            className="flex h-11 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
          >
            <MessageSquare className="h-4 w-4 text-[#EF3333]" /> WhatsApp ({whatsappTemplates.length})
          </TabsTrigger>
          <TabsTrigger
            value="email"
            className="flex h-11 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
          >
            <Mail className="h-4 w-4 text-[#EF3333]" /> Email ({emailTemplates.length})
          </TabsTrigger>
          <TabsTrigger
            value="formulario"
            className="flex h-11 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
          >
            <ClipboardList className="h-4 w-4 text-[#EF3333]" /> Formulario ({formularioTemplates.length})
          </TabsTrigger>
          <TabsTrigger
            value="proposta"
            className="flex h-11 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
          >
            <FileText className="h-4 w-4 text-[#EF3333]" /> Proposta
          </TabsTrigger>
        </TabsList>
        <TabsContent value="whatsapp" className="mt-4">
          {renderTemplateList(whatsappTemplates, 'whatsapp')}
        </TabsContent>
        <TabsContent value="email" className="mt-4">
          {renderTemplateList(emailTemplates, 'email')}
        </TabsContent>
        <TabsContent value="formulario" className="mt-4">
          {renderTemplateList(formularioTemplates, 'formulario')}
        </TabsContent>
        <TabsContent value="proposta" className="mt-4">
          <Card className={sectionCardClass}>
            <ProposalTemplateTab />
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent key={`${editingTemplate?.id || 'new'}-${formChannel}`} className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[22px] border border-[#ececf0] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1A1A1A]">
              {getChannelIcon(formChannel)}
              {editingTemplate ? `Editar Template de ${getChannelLabel(formChannel)}` : `Novo Template de ${getChannelLabel(formChannel)}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={formChannel} onValueChange={setFormChannel} disabled={!editingTemplate && !!creationChannel}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="formulario">Formulario</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome do Template *</Label>
              <Input className={fieldClass} value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Proposta Restaurantes" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Chave da Variante</Label>
                <Input className={fieldClass} value={formVariantKey} onChange={(e) => setFormVariantKey(e.target.value.toUpperCase())} placeholder="A" maxLength={8} />
              </div>
              <div className="space-y-2">
                <Label>Grupo de Experimento (A/B)</Label>
                <Input className={fieldClass} value={formExperimentGroup} onChange={(e) => setFormExperimentGroup(e.target.value)} placeholder="ex: whatsapp-oferta-marco" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Persona alvo (opcional)</Label>
                <Input className={fieldClass} value={formTargetPersona} onChange={(e) => setFormTargetPersona(e.target.value)} placeholder="ex: Dono de restaurante" />
              </div>
              <div className="space-y-2">
                <Label>Objetivo da campanha (opcional)</Label>
                <Input className={fieldClass} value={formCampaignObjective} onChange={(e) => setFormCampaignObjective(e.target.value)} placeholder="ex: Agendar chamada" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gatilho de CTA (opcional)</Label>
              <Input className={fieldClass} value={formCtaTrigger} onChange={(e) => setFormCtaTrigger(e.target.value)} placeholder="ex: urgencia e prova social" />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#ececf0] bg-[#fafafd] p-3">
              <div>
                <Label className="text-sm font-medium">Template ativo</Label>
                <p className="text-xs text-[#6d6d75]">Somente templates ativos entram na distribuicao A/B.</p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>

            {formChannel === 'email' && (
              <div className="space-y-2">
                <Label>Assunto do Email</Label>
                <Input className={fieldClass} value={formSubject} onChange={(e) => setFormSubject(e.target.value)} placeholder="Ex: Analise exclusiva para {{nome_empresa}}" />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm">Variaveis Disponiveis</Label>
              <p className="text-xs text-[#6d6d75]">Clique para inserir no corpo da mensagem.</p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <Badge
                    key={v.key}
                    variant="outline"
                    className="cursor-pointer rounded-full border-[#ececf0] bg-white text-xs text-[#5f5f67] hover:border-[#ef3333]/35 hover:bg-[#fff5f6]"
                    onClick={() => insertVariable(v.key)}
                    title={v.desc}
                  >
                    {v.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Corpo da Mensagem *</Label>
              <Textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder={formChannel === 'whatsapp' ? 'Ola! Sou da {{sua_empresa}}...' : '<p>Ola!</p><p>Preparamos uma analise para {{nome_empresa}}...</p>'}
                className="min-h-[200px] rounded-xl border-[#e6e6eb] bg-[#fcfcfd] font-mono text-sm focus-visible:ring-[#ef3333]"
              />
            </div>

            <div className="space-y-2">
              <Label>Imagem (opcional)</Label>
              <div className="flex items-center gap-3">
                {formImageUrl && <img src={formImageUrl} alt="Preview" className="h-16 w-16 rounded-lg border border-[#e6e6eb] object-cover" />}
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl border-[#e6e6eb] hover:bg-[#f8f8fa]" asChild>
                    <span>
                      <Image className="h-4 w-4" />
                      {uploading ? 'Enviando...' : 'Upload Imagem'}
                    </span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
                {formImageUrl && (
                  <Button variant="ghost" size="sm" onClick={() => setFormImageUrl('')} className="rounded-xl text-[#6d6d75] hover:bg-[#f5f5f7]">
                    Remover
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#ececf0] bg-[#fafafd] p-3">
              <div>
                <Label className="text-sm font-medium">Incluir Link da Proposta</Label>
                <p className="text-xs text-[#6d6d75]">Adiciona automaticamente o link da apresentacao.</p>
              </div>
              <Switch checked={formIncludeLink} onCheckedChange={setFormIncludeLink} />
            </div>

            {formChannel === 'whatsapp' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-[#ececf0] bg-[#fafafd] p-3">
                  <div>
                    <Label className="text-sm font-medium">Enviar como Audio</Label>
                    <p className="text-xs text-[#6d6d75]">Converte o texto em audio com sua voz clonada (ElevenLabs).</p>
                  </div>
                  <Switch checked={formSendAsAudio} onCheckedChange={setFormSendAsAudio} />
                </div>

                {formSendAsAudio && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-full gap-2 rounded-xl border-[#e6e6eb] hover:bg-[#f8f8fa]"
                    onClick={handleAudioPreview}
                    disabled={generatingAudio || !formBody.trim()}
                  >
                    {generatingAudio ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : audioPlaying ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                    {generatingAudio ? 'Gerando audio...' : audioPlaying ? 'Parar audio' : 'Ouvir preview do audio'}
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm">Pre-visualizacao</Label>
              <Card className="rounded-xl border border-[#ececf0] bg-[#fafafd] p-4">
                <p className="whitespace-pre-wrap text-sm text-[#1A1A1A]">{getPreviewText()}</p>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formName.trim() || !formBody.trim()}
              className="rounded-xl gradient-primary text-primary-foreground"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingTemplate ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesManager;
