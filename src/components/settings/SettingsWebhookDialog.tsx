import { Loader2, Save, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fieldClass = 'h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]';

type SettingsWebhookDialogProps = {
  open: boolean;
  saving: boolean;
  url: string;
  secret: string;
  onUrlChange: (value: string) => void;
  onSecretChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
};

export const SettingsWebhookDialog = ({
  open,
  saving,
  url,
  secret,
  onUrlChange,
  onSecretChange,
  onOpenChange,
  onSave,
}: SettingsWebhookDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg rounded-[22px] border border-[#ececf0] bg-white p-0">
      <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6D00]/10">
          <Webhook className="h-5 w-5 text-[#FF6D00]" />
        </div>
        <div>
          <DialogTitle className="text-base font-semibold text-[#1A1A1A]">Webhook das campanhas</DialogTitle>
          <DialogDescription className="text-xs text-[#6d6d75]">Envie leads via POST para n8n ou outro orquestrador HTTP.</DialogDescription>
        </div>
      </div>
      <div className="space-y-4 px-6 py-5">
        <div className="space-y-2">
          <Label className="text-sm text-[#1A1A1A]">URL do webhook</Label>
          <Input
            className={fieldClass}
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://seu-n8n.com/webhook/..."
          />
          <p className="text-xs text-[#6d6d75]">Cada lead da campanha sera enviado por POST para essa URL.</p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-[#1A1A1A]">Segredo do webhook (opcional)</Label>
          <Input
            type="password"
            className={fieldClass}
            value={secret}
            onChange={(event) => onSecretChange(event.target.value)}
            placeholder="Token para validar a requisicao no n8n"
          />
          <p className="text-xs text-[#6d6d75]">
            Se preenchido, o valor sera enviado no header <span className="font-mono">X-N8N-Webhook-Secret</span>.
          </p>
        </div>
      </div>
      <DialogFooter className="border-t border-[#f0f0f3] px-6 py-4">
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={onSave} disabled={saving} className="h-11 rounded-xl gap-2 gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
