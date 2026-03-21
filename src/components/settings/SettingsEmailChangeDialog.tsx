import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fieldClass = 'h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]';

type SettingsEmailChangeDialogProps = {
  open: boolean;
  email: string;
  pendingEmail: string;
  sending: boolean;
  onOpenChange: (open: boolean) => void;
  onPendingEmailChange: (value: string) => void;
  onSubmit: () => void;
};

export const SettingsEmailChangeDialog = ({
  open,
  email,
  pendingEmail,
  sending,
  onOpenChange,
  onPendingEmailChange,
  onSubmit,
}: SettingsEmailChangeDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md rounded-[22px] border border-[#ececf0] bg-white">
      <DialogHeader>
        <DialogTitle className="text-[#1A1A1A]">Alterar email de acesso</DialogTitle>
        <DialogDescription className="text-[#6d6d75]">
          Enviaremos um link de verificacao para o novo email. A troca so sera concluida depois da confirmacao.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pendingAccessEmail" className="text-sm text-[#1A1A1A]">
            Novo email
          </Label>
          <Input
            id="pendingAccessEmail"
            type="email"
            className={fieldClass}
            value={pendingEmail}
            onChange={(event) => onPendingEmailChange(event.target.value)}
            placeholder="novoemail@empresa.com"
          />
        </div>

        <div className="rounded-xl border border-[#ececf0] bg-[#fafafd] p-3 text-xs text-[#6d6d75]">
          Email atual: <span className="font-semibold text-[#1A1A1A]">{email || 'nao informado'}</span>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="rounded-xl gradient-primary text-primary-foreground" onClick={onSubmit} disabled={sending}>
          {sending ? 'Enviando...' : 'Enviar verificacao'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
