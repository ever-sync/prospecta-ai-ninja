import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, Image, Link2, MessageSquare, Mail, Loader2, FileText } from 'lucide-react';
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
  created_at: string;
}

const VARIABLES = [
  { key: '{{nome_empresa}}', label: 'Nome da empresa', desc: 'Nome do lead' },
  { key: '{{categoria}}', label: 'Categoria', desc: 'Setor do lead' },
  { key: '{{endereco}}', label: 'Endereço', desc: 'Endereço do lead' },
  { key: '{{telefone}}', label: 'Telefone', desc: 'Telefone do lead' },
  { key: '{{website}}', label: 'Website', desc: 'Site do lead' },
  { key: '{{rating}}', label: 'Rating Google', desc: 'Nota no Google' },
  { key: '{{score}}', label: 'Score Geral', desc: 'Score da análise' },
  { key: '{{link_proposta}}', label: 'Link da Proposta', desc: 'URL da apresentação' },
  { key: '{{sua_empresa}}', label: 'Sua Empresa', desc: 'Nome da sua empresa' },
];

const TemplatesManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formChannel, setFormChannel] = useState('whatsapp');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIncludeLink, setFormIncludeLink] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('message_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTemplates((data as any) || []);
    setLoading(false);
  };

  const openCreate = (channel: string) => {
    setEditingTemplate(null);
    setFormName('');
    setFormChannel(channel);
    setFormSubject('');
    setFormBody(channel === 'whatsapp'
      ? 'Olá! Sou da {{sua_empresa}}. Preparamos uma análise exclusiva para {{nome_empresa}}.\n\nVeja sua proposta: {{link_proposta}}'
      : '');
    setFormImageUrl('');
    setFormIncludeLink(true);
    setShowEditor(true);
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormChannel(t.channel);
    setFormSubject(t.subject);
    setFormBody(t.body);
    setFormImageUrl(t.image_url);
    setFormIncludeLink(t.include_proposal_link);
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
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Template excluído' });
    }
  };

  const insertVariable = (variable: string) => {
    setFormBody(prev => prev + variable);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/template-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('company-logos')
      .upload(path, file, { upsert: true });

    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } else {
      const { data: { publicUrl } } = supabase.storage.from('company-logos').getPublicUrl(path);
      setFormImageUrl(publicUrl);
    }
    setUploading(false);
  };

  const whatsappTemplates = templates.filter(t => t.channel === 'whatsapp');
  const emailTemplates = templates.filter(t => t.channel === 'email');

  const renderTemplateList = (list: Template[], channel: string) => (
    <div className="space-y-4">
      <Button onClick={() => openCreate(channel)} variant="outline" className="gap-2 w-full border-dashed">
        <Plus className="w-4 h-4" />
        Novo Template de {channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
      </Button>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum template de {channel === 'whatsapp' ? 'WhatsApp' : 'Email'} criado ainda.
        </p>
      ) : (
        list.map(t => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-foreground truncate">{t.name}</h4>
                  {t.include_proposal_link && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      <Link2 className="w-3 h-3 mr-1" /> Link
                    </Badge>
                  )}
                  {t.image_url && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      <Image className="w-3 h-3 mr-1" /> Imagem
                    </Badge>
                  )}
                </div>
                {t.subject && <p className="text-xs text-muted-foreground mb-1">Assunto: {t.subject}</p>}
                <p className="text-sm text-muted-foreground line-clamp-2">{t.body}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)} title="Editar">
                  <Save className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)} title="Excluir">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="w-4 h-4" /> WhatsApp ({whatsappTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="w-4 h-4" /> Email ({emailTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="proposta" className="gap-2">
            <FileText className="w-4 h-4" /> Proposta
          </TabsTrigger>
        </TabsList>
        <TabsContent value="whatsapp">{renderTemplateList(whatsappTemplates, 'whatsapp')}</TabsContent>
        <TabsContent value="email">{renderTemplateList(emailTemplates, 'email')}</TabsContent>
        <TabsContent value="proposta"><ProposalTemplateTab /></TabsContent>
      </Tabs>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="bg-card max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              {formChannel === 'whatsapp' ? <MessageSquare className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Template *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Proposta Restaurantes" />
            </div>

            {formChannel === 'email' && (
              <div className="space-y-2">
                <Label>Assunto do Email</Label>
                <Input value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder="Ex: Análise exclusiva para {{nome_empresa}}" className="bg-secondary border-border" />
              </div>
            )}

            {/* Variables */}
            <div className="space-y-2">
              <Label className="text-sm">Variáveis Disponíveis</Label>
              <p className="text-xs text-muted-foreground">Clique para inserir no corpo da mensagem</p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map(v => (
                  <Badge
                    key={v.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors text-xs"
                    onClick={() => insertVariable(v.key)}
                    title={v.desc}
                  >
                    {v.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label>Corpo da Mensagem *</Label>
              <Textarea
                value={formBody}
                onChange={e => setFormBody(e.target.value)}
                placeholder={formChannel === 'whatsapp'
                  ? 'Olá! Sou da {{sua_empresa}}...'
                  : '<p>Olá!</p><p>Preparamos uma análise para {{nome_empresa}}...</p>'}
                className="bg-secondary border-border min-h-[200px] font-mono text-sm"
              />
            </div>

            {/* Image */}
            <div className="space-y-2">
              <Label>Imagem (opcional)</Label>
              <div className="flex items-center gap-3">
                {formImageUrl && (
                  <img src={formImageUrl} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-border" />
                )}
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <span>
                      <Image className="w-4 h-4" />
                      {uploading ? 'Enviando...' : 'Upload Imagem'}
                    </span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
                {formImageUrl && (
                  <Button variant="ghost" size="sm" onClick={() => setFormImageUrl('')} className="text-muted-foreground">
                    Remover
                  </Button>
                )}
              </div>
            </div>

            {/* Include proposal link */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <Label className="text-sm font-medium">Incluir Link da Proposta</Label>
                <p className="text-xs text-muted-foreground">Adiciona automaticamente o link da apresentação</p>
              </div>
              <Switch checked={formIncludeLink} onCheckedChange={setFormIncludeLink} />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-sm">Pré-visualização</Label>
              <Card className="p-4 bg-secondary/50 border-border">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {formBody
                    .replace(/\{\{nome_empresa\}\}/g, 'Restaurante Exemplo')
                    .replace(/\{\{categoria\}\}/g, 'Restaurante')
                    .replace(/\{\{endereco\}\}/g, 'Rua Exemplo, 123')
                    .replace(/\{\{telefone\}\}/g, '(11) 99999-9999')
                    .replace(/\{\{website\}\}/g, 'www.exemplo.com.br')
                    .replace(/\{\{rating\}\}/g, '4.5')
                    .replace(/\{\{score\}\}/g, '72')
                    .replace(/\{\{link_proposta\}\}/g, 'https://app.com/presentation/abc123')
                    .replace(/\{\{sua_empresa\}\}/g, 'Minha Empresa')}
                </p>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim() || !formBody.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {editingTemplate ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesManager;
