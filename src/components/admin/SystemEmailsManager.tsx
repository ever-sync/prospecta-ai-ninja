import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Send, ExternalLink } from 'lucide-react';

interface EmailTemplate {
  id: string;
  type: string;
  name: string;
  subject: string;
  body_html: string;
  is_active: boolean;
  updated_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  onboarding: 'Boas-vindas (novo cadastro)',
  campaign_started: 'Campanha enviada',
  proposal_accepted: 'Proposta aceita pelo lead',
};

const TYPE_VARS: Record<string, string[]> = {
  onboarding: ['{{email}}', '{{link_dashboard}}'],
  campaign_started: ['{{nome_campanha}}', '{{total_enviados}}', '{{link_dashboard}}'],
  proposal_accepted: ['{{empresa_prospectada}}', '{{link_dashboard}}'],
};

export default function SystemEmailsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('system_email_templates')
      .select('*')
      .order('type');
    if (data) setTemplates(data as EmailTemplate[]);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from('system_email_templates')
      .update({
        subject: editing.subject,
        body_html: editing.body_html,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editing.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Template salvo!' });
      setEditing(null);
      load();
    }
  };

  const handleToggle = async (tpl: EmailTemplate) => {
    const { error } = await supabase
      .from('system_email_templates')
      .update({ is_active: !tpl.is_active })
      .eq('id', tpl.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      load();
    }
  };

  const handleSendTest = async (tpl: EmailTemplate) => {
    if (!user?.email) return;
    setSending(tpl.id);
    const { error } = await supabase.functions.invoke('send-system-email', {
      body: { type: tpl.type, user_email: user.email, variables: { email: user.email } },
    });
    setSending(null);
    if (error) {
      toast({ title: 'Erro ao enviar teste', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email de teste enviado!', description: `Enviado para ${user.email}` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Auth emails notice */}
      <Card className="border-border/50 bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Emails de Autenticação
          </CardTitle>
          <CardDescription>
            Confirmação de conta e redefinição de senha são gerenciados diretamente pelo Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://supabase.com/dashboard/project/_/auth/templates"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Configurar no Supabase Dashboard
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Transactional templates */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Emails Transacionais
        </h3>
        {templates.map((tpl) => (
          <Card key={tpl.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{tpl.name}</span>
                    <Badge variant={tpl.is_active ? 'default' : 'secondary'} className="text-xs">
                      {tpl.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {TYPE_LABELS[tpl.type] ?? tpl.type}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Assunto: {tpl.subject}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={tpl.is_active}
                    onCheckedChange={() => handleToggle(tpl)}
                    aria-label="Ativar/desativar"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendTest(tpl)}
                    disabled={sending === tpl.id || !tpl.is_active}
                  >
                    {sending === tpl.id ? (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    Testar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing({ ...tpl })}
                  >
                    <Pencil className="w-3 h-3" />
                    Editar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar template: {editing?.name}</DialogTitle>
            <DialogDescription>
              Ajuste assunto e HTML do template de email do sistema.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              {TYPE_VARS[editing.type] && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Variáveis disponíveis:</p>
                  <div className="flex flex-wrap gap-1">
                    {TYPE_VARS[editing.type].map((v) => (
                      <code key={v} className="text-xs bg-background border border-border rounded px-1.5 py-0.5">
                        {v}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <Input
                  value={editing.subject}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Corpo (HTML)</Label>
                <Textarea
                  value={editing.body_html}
                  onChange={(e) => setEditing({ ...editing, body_html: e.target.value })}
                  rows={18}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
