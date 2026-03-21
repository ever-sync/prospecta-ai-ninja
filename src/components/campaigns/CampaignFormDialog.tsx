import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type CampaignTemplateOption = {
  id: string;
  name: string;
  channel: string;
};

type CampaignFormReadiness = {
  ready: boolean;
  tone: 'ready' | 'blocked' | 'neutral';
  title: string;
  detail: string;
};

type CampaignFormDialogProps = {
  open: boolean;
  editing: boolean;
  formName: string;
  formDesc: string;
  formChannel: string;
  formSchedule: string;
  formTemplateId: string;
  templates: CampaignTemplateOption[];
  formReadiness: CampaignFormReadiness;
  creating: boolean;
  onOpenChange: (open: boolean) => void;
  onFormNameChange: (value: string) => void;
  onFormDescChange: (value: string) => void;
  onFormChannelChange: (value: string) => void;
  onFormTemplateIdChange: (value: string) => void;
  onFormScheduleChange: (value: string) => void;
  onConfigureChannel: () => void;
  onSubmit: () => void;
};

export const CampaignFormDialog = ({
  open,
  editing,
  formName,
  formDesc,
  formChannel,
  formSchedule,
  formTemplateId,
  templates,
  formReadiness,
  creating,
  onOpenChange,
  onFormNameChange,
  onFormDescChange,
  onFormChannelChange,
  onFormTemplateIdChange,
  onFormScheduleChange,
  onConfigureChannel,
  onSubmit,
}: CampaignFormDialogProps) => {
  const channelTemplates = templates.filter((template) => template.channel === formChannel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-[22px] border border-[#ececf0] bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">{editing ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
          <DialogDescription>
            Configure o canal, template e agendamento {editing ? 'da campanha.' : 'para criar uma nova campanha.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
              value={formName}
              onChange={(event) => onFormNameChange(event.target.value)}
              placeholder="Ex: Restaurantes SP - Marco"
            />
          </div>
          <div className="space-y-2">
            <Label>Descricao</Label>
            <Textarea
              className="rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
              value={formDesc}
              onChange={(event) => onFormDescChange(event.target.value)}
              placeholder="Objetivo da campanha..."
            />
          </div>
          <div className="space-y-2">
            <Label>Canal de envio</Label>
            <Select value={formChannel} onValueChange={onFormChannelChange}>
              <SelectTrigger className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="webhook">Webhook / n8n</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formChannel === 'webhook' ? (
            <div className="rounded-xl border border-[#d9e4ff] bg-[#f4f7ff] px-4 py-3">
              <p className="text-sm font-medium text-[#1A1A1A]">Webhook n8n</p>
              <p className="mt-1 text-xs leading-6 text-[#5a5a62]">
                Esse canal envia o payload completo da campanha para a URL configurada em Integracoes. Template e
                opcional e nao e usado no disparo.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Template de mensagem</Label>
              <Select value={formTemplateId} onValueChange={onFormTemplateIdChange}>
                <SelectTrigger className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd]">
                  <SelectValue placeholder="Selecione um template (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {channelTemplates.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Nenhum template de {formChannel === 'whatsapp' ? 'WhatsApp' : 'Email'}. Crie um em Configuracoes
                      no menu Templates.
                    </div>
                  ) : (
                    channelTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Agendamento (opcional)</Label>
            <Input
              className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
              type="datetime-local"
              value={formSchedule}
              onChange={(event) => onFormScheduleChange(event.target.value)}
            />
          </div>
          <div
            className={`rounded-xl border px-4 py-3 ${
              formReadiness.tone === 'ready'
                ? 'border-[#cde8d9] bg-[#eef8f3]'
                : formReadiness.tone === 'blocked'
                  ? 'border-[#f5d8c8] bg-[#fff8f4]'
                  : 'border-[#e6e6eb] bg-[#fafafd]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">{formReadiness.title}</p>
                <p className="mt-1 text-xs leading-6 text-[#5a5a62]">{formReadiness.detail}</p>
              </div>
              {!formReadiness.ready && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-[#f5d8c8] bg-white text-[#c2620a] hover:bg-[#fff0e6]"
                  onClick={onConfigureChannel}
                >
                  Configurar
                </Button>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={onSubmit}
            disabled={creating || !formName.trim()}
            className="rounded-xl gradient-primary text-primary-foreground glow-primary"
          >
            {creating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {editing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
