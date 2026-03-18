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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProposalTemplateTab from '@/components/ProposalTemplateTab';
import FormBuilder, { defaultFormSchema, type FormSchema } from '@/components/FormBuilder';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { BRAND } from '@/config/brand';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/lib/invoke-edge-function';

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

const LEAD_VARIABLES = [
  { key: '{{nome_empresa}}', label: 'Nome da empresa', desc: 'Nome do lead' },
  { key: '{{categoria}}', label: 'Categoria', desc: 'Setor do lead' },
  { key: '{{endereco}}', label: 'Endereco', desc: 'Endereco do lead' },
  { key: '{{telefone}}', label: 'Telefone', desc: 'Telefone do lead' },
  { key: '{{website}}', label: 'Website', desc: 'Site do lead' },
  { key: '{{rating}}', label: 'Rating Google', desc: 'Nota no Google' },
  { key: '{{score}}', label: 'Score Geral', desc: 'Score da analise' },
  { key: '{{link_proposta}}', label: 'Link da Proposta', desc: 'URL da apresentacao' },
];

const MY_COMPANY_VARIABLES = [
  { key: '{{sua_empresa}}', label: 'Minha Empresa', desc: 'Nome da sua empresa' },
  { key: '{{seu_telefone}}', label: 'Meu Telefone', desc: 'Telefone da sua empresa' },
  { key: '{{seu_email}}', label: 'Meu Email', desc: 'Email da sua empresa' },
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
  const [formSchema, setFormSchema] = useState<FormSchema>(defaultFormSchema());
  const [formSchemaId, setFormSchemaId] = useState<string | null>(null);
  const [showResponses, setShowResponses] = useState<string | null>(null); // template id
  const [responses, setResponses] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [audioRef] = useState<{ current: HTMLAudioElement | null }>({ current: null });
  const [myProfile, setMyProfile] = useState<{ company_name: string | null; phone: string | null; email: string | null } | null>(null);

  useEffect(() => {
    if (user) {
      fetchTemplates();
      supabase.from('profiles').select('company_name, phone, email').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setMyProfile(data); });
    }
  }, [user]);

  const handleSendTest = async () => {
    if (!user || !user.email) return;
    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke('send-marketing-email', {
        body: {
          targetEmail: user.email,
          senderName: myProfile?.company_name || BRAND.name,
          customSubject: formSubject,
          customBody: formBody,
          variables: {
            nome_empresa: 'Restaurante Exemplo',
            sua_empresa: myProfile?.company_name || BRAND.name,
            seu_telefone: myProfile?.phone || '',
            seu_email: myProfile?.email || '',
            link_proposta: `${BRAND.websiteUrl}/demo`
          }
        }
      });

      if (error) throw error;
      toast({ title: 'Teste enviado!', description: `Verifique sua caixa de entrada (${user.email})` });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar teste', description: err.message, variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

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
    setFormSchema(defaultFormSchema());
    setFormSchemaId(null);
    setShowEditor(true);
  };

  const openEdit = async (t: Template) => {
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
    if (t.channel === 'formulario') {
      const { data } = await supabase.from('form_schemas').select('*').eq('template_id', t.id).maybeSingle();
      if (data) {
        setFormSchemaId(data.id);
        setFormSchema({
          title: data.title,
          description: data.description,
          thank_you_message: data.thank_you_message,
          redirect_url: (data as any).redirect_url || '',
          slug: data.slug,
          fields: data.fields as any,
          submission_behavior: (data as any).submission_behavior || 'popup',
        });
      } else {
        setFormSchemaId(null);
        setFormSchema(defaultFormSchema());
      }
    }
    setShowEditor(true);
  };

  const openResponses = async (templateId: string) => {
    const { data: schemaData } = await supabase
      .from('form_schemas').select('id').eq('template_id', templateId).maybeSingle();
    if (!schemaData) { toast({ title: 'Formulário não configurado ainda.' }); return; }
    const { data } = await supabase
      .from('form_responses').select('*').eq('form_schema_id', schemaData.id).order('submitted_at', { ascending: false });
    setResponses(data || []);
    setShowResponses(templateId);
  };

  const handleSave = async () => {
    if (!user || !formName.trim()) return;
    if (formChannel !== 'formulario' && !formBody.trim()) return;
    setSaving(true);

    const bodyValue = formChannel === 'formulario'
      ? `Formulário: ${formSchema.title} (${formSchema.fields.length} campos)`
      : formBody;

    const payload = {
      user_id: user.id,
      name: formName.trim(),
      channel: formChannel,
      subject: formSubject.trim(),
      body: bodyValue,
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
    let savedTemplateId: string | undefined = editingTemplate?.id;
    if (editingTemplate) {
      ({ error } = await supabase.from('message_templates').update(payload).eq('id', editingTemplate.id));
    } else {
      const { data: inserted, error: insertErr } = await supabase.from('message_templates').insert(payload).select('id').single();
      error = insertErr;
      savedTemplateId = inserted?.id;
    }

    // Upsert form_schemas if formulario
    if (!error && formChannel === 'formulario' && savedTemplateId) {
      if (!formSchema.slug.trim()) {
        toast({ title: 'Defina uma URL para o formulário', description: 'Aba Configurações → URL personalizada', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const schemaPayload = {
        template_id: savedTemplateId,
        user_id: user.id,
        title: formSchema.title,
        description: formSchema.description,
        thank_you_message: formSchema.thank_you_message,
        redirect_url: formSchema.redirect_url,
        slug: formSchema.slug,
        fields: formSchema.fields as any,
        submission_behavior: formSchema.submission_behavior,
        updated_at: new Date().toISOString(),
      };
      if (formSchemaId) {
        await supabase.from('form_schemas').update(schemaPayload).eq('id', formSchemaId);
      } else {
        await supabase.from('form_schemas').insert({ ...schemaPayload });
      }
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
    const { data, error } = await invokeEdgeFunction<{ groups_promoted?: number }>('whatsapp-optimize-variants', {
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
      .replace(/\{\{sua_empresa\}\}/g, myProfile?.company_name || BRAND.name)
      .replace(/\{\{seu_telefone\}\}/g, myProfile?.phone || '')
      .replace(/\{\{seu_email\}\}/g, myProfile?.email || '');
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
                {t.channel === 'formulario' && (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#707078] hover:bg-[#f5f5f7] hover:text-[#1A1A1A]" onClick={() => openResponses(t.id)} title="Ver Respostas">
                      <ClipboardList className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#707078] hover:bg-[#f5f5f7] hover:text-[#1A1A1A]" onClick={async () => {
                      const { data } = await supabase.from('form_schemas').select('slug').eq('template_id', t.id).maybeSingle();
                      if (data?.slug) { navigator.clipboard.writeText(`${window.location.origin}/form/${data.slug}`); toast({ title: 'Link copiado!' }); }
                      else { toast({ title: 'URL não configurada', description: 'Edite o formulário e defina uma URL.', variant: 'destructive' }); }
                    }} title="Copiar Link">
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Button 
          onClick={() => openCreate('whatsapp')}
          className="h-auto flex-col gap-2 rounded-2xl border border-[#ececf0] bg-white py-4 text-[#1A1A1A] shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:bg-[#fafafa]"
          variant="outline"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold whitespace-nowrap">Novo WhatsApp</span>
        </Button>

        <Button 
          onClick={() => openCreate('email')}
          className="h-auto flex-col gap-2 rounded-2xl border border-[#ececf0] bg-white py-4 text-[#1A1A1A] shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:bg-[#fafafa]"
          variant="outline"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EF3333]/10 text-[#EF3333]">
            <Mail className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold whitespace-nowrap">Novo Email</span>
        </Button>

        <Button 
          onClick={() => openCreate('formulario')}
          className="h-auto flex-col gap-2 rounded-2xl border border-[#ececf0] bg-white py-4 text-[#1A1A1A] shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:bg-[#fafafa]"
          variant="outline"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <ClipboardList className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold whitespace-nowrap">Novo Formulário</span>
        </Button>

        <Button 
          onClick={() => setActiveTab('proposta')}
          className="h-auto flex-col gap-2 rounded-2xl border border-[#ececf0] bg-white py-4 text-[#1A1A1A] shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:bg-[#fafafa]"
          variant="outline"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold whitespace-nowrap">Design Proposta</span>
        </Button>
      </div>

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

      {/* Responses dialog */}
      <Dialog open={!!showResponses} onOpenChange={(o) => { if (!o) setShowResponses(null); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-[22px] border border-[#ececf0] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1A1A1A]">
              <ClipboardList className="h-5 w-5 text-[#EF3333]" />
              Respostas do Formulário
            </DialogTitle>
            <DialogDescription>
              Consulte as respostas recebidas para este template de formulario.
            </DialogDescription>
          </DialogHeader>
          {responses.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#6d6d75]">Nenhuma resposta recebida ainda.</p>
          ) : (
            <div className="space-y-3">
              {responses.map((r, i) => (
                <Card key={r.id} className="rounded-[18px] border border-[#ececf0] bg-[#fafafd] p-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a92]">
                    Resposta #{responses.length - i} · {new Date(r.submitted_at).toLocaleString('pt-BR')}
                  </p>
                  <div className="space-y-1.5">
                    {Object.entries(r.respondent_data as Record<string, string | string[]>).map(([key, val]) => (
                      <div key={key} className="flex gap-2 text-sm">
                        <span className="shrink-0 font-medium text-[#5f5f67]">{key}:</span>
                        <span className="text-[#1A1A1A]">{Array.isArray(val) ? val.join(', ') : val}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponses(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent key={`${editingTemplate?.id || 'new'}-${formChannel}`} className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[22px] border border-[#ececf0] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1A1A1A]">
              {getChannelIcon(formChannel)}
              {editingTemplate ? `Editar Template de ${getChannelLabel(formChannel)}` : `Novo Template de ${getChannelLabel(formChannel)}`}
            </DialogTitle>
            <DialogDescription>
              Configure o conteudo e as variaveis do template para este canal.
            </DialogDescription>
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


            <div className="flex items-center justify-between rounded-xl border border-[#ececf0] bg-[#fafafd] p-3">
              <div>
                <Label className="text-sm font-medium">Template ativo</Label>
                <p className="text-xs text-[#6d6d75]">Somente templates ativos entram na distribuicao A/B.</p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>

            {formChannel === 'email' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Assunto do Email</Label>
                    <span className="text-[10px] text-[#6d6d75] uppercase tracking-wider">Abertura: 22% (est.)</span>
                  </div>
                  <div className="relative">
                    <Input 
                      id="email-subject-input"
                      className={fieldClass} 
                      value={formSubject} 
                      onChange={(e) => setFormSubject(e.target.value)} 
                      placeholder="Ex: Analise exclusiva para {{nome_empresa}}" 
                    />
                  </div>
                </div>

                {/* Inbox Preview Case */}
                <div className="rounded-xl border border-[#ececf0] bg-[#f8f8fa] p-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a8a92]">Preview na Caixa de Entrada</p>
                  <div className="flex items-start gap-3 rounded-lg bg-white p-3 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EF3333]/10 text-[#EF3333]">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-[#1A1A1A]">
                          {user?.email?.split('@')[0] || 'Seu Time'}
                        </p>
                        <span className="text-[10px] text-[#8a8a92]">10:42 AM</span>
                      </div>
                      <p className="truncate text-sm font-medium text-[#1A1A1A]">
                        {formSubject.replace(/\{\{nome_empresa\}\}/g, 'Restaurante Exemplo') || '(Sem assunto)'}
                      </p>
                      <p className="line-clamp-1 text-xs text-[#6d6d75]">
                        {getPreviewText()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formChannel === 'formulario' ? (
              <FormBuilder value={formSchema} onChange={setFormSchema} />
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Tags de Personalização</Label>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-[#ececf0] bg-white">Smart Tags</Badge>
                  </div>
                  <p className="text-[11px] text-[#6d6d75]">Clique para inserir onde o texto estiver focado.</p>
                  {[
                    { title: 'Lead', vars: LEAD_VARIABLES },
                    { title: 'Minha Empresa', vars: MY_COMPANY_VARIABLES },
                  ].map((group) => (
                    <div key={group.title} className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9d9da8]">{group.title}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.vars.map((v) => (
                          <Button key={v.key} variant="ghost" size="sm"
                            className="h-7 rounded-lg border border-[#ececf0] bg-white px-2.5 text-[11px] font-medium text-[#5f5f67] hover:border-[#ef3333]/35 hover:bg-[#fff5f6] hover:text-[#ef3333]"
                            onClick={() => {
                              const subjectEl = document.getElementById('email-subject-input') as HTMLInputElement;
                              const bodyEl = document.querySelector('textarea') as HTMLTextAreaElement;
                              if (document.activeElement === subjectEl) {
                                const start = subjectEl.selectionStart || 0; const end = subjectEl.selectionEnd || 0; const text = subjectEl.value;
                                setFormSubject(text.substring(0, start) + v.key + text.substring(end));
                              } else {
                                const start = bodyEl.selectionStart || 0; const end = bodyEl.selectionEnd || 0; const text = bodyEl.value;
                                setFormBody(text.substring(0, start) + v.key + text.substring(end));
                              }
                            }} title={v.desc}>{v.label}</Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Corpo da Mensagem *</Label>
                  <Textarea value={formBody} onChange={(e) => setFormBody(e.target.value)}
                    placeholder={formChannel === 'whatsapp' ? 'Ola! Sou da {{sua_empresa}}...' : '<p>Ola!</p><p>Preparamos uma analise para {{nome_empresa}}...</p>'}
                    className="min-h-[200px] rounded-xl border-[#e6e6eb] bg-[#fcfcfd] font-mono text-sm focus-visible:ring-[#ef3333]" />
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
                      <Button type="button" variant="outline" size="sm" className="h-10 w-full gap-2 rounded-xl border-[#e6e6eb] hover:bg-[#f8f8fa]"
                        onClick={handleAudioPreview} disabled={generatingAudio || !formBody.trim()}>
                        {generatingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : audioPlaying ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
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
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowEditor(false)}>Cancelar</Button>
            
            {formChannel === 'email' && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleSendTest}
                disabled={sendingTest || !formBody.trim()}
                className="rounded-xl border border-[#ececf0] bg-white text-[#1A1A1A] hover:bg-[#f8f8fa]"
              >
                {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4 text-[#EF3333]" />}
                Enviar Teste
              </Button>
            )}

            <Button
              onClick={handleSave}
              disabled={saving || !formName.trim() || (formChannel !== 'formulario' && !formBody.trim())}
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
