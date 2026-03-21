import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CampaignSavedViewDialogProps = {
  open: boolean;
  editing: boolean;
  savedViewName: string;
  onSavedViewNameChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
};

export const CampaignSavedViewDialog = ({
  open,
  editing,
  savedViewName,
  onSavedViewNameChange,
  onOpenChange,
  onSave,
}: CampaignSavedViewDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md rounded-[22px] border border-[#ececf0] bg-white">
      <DialogHeader>
        <DialogTitle className="text-[#1A1A1A]">{editing ? 'Renomear view salva' : 'Salvar visao atual'}</DialogTitle>
        <DialogDescription>
          {editing
            ? 'Ajuste apenas o nome da view. Os filtros originais permanecem os mesmos.'
            : 'Reaproveite esta combinacao de filtros, busca e ordenacao sem remontar a triagem.'}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="campaign-saved-view-name">Nome da visao</Label>
        <Input
          id="campaign-saved-view-name"
          className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
          value={savedViewName}
          onChange={(event) => onSavedViewNameChange(event.target.value)}
          placeholder="Ex: Webhook com falha recente"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={onSave} className="rounded-xl gradient-primary text-primary-foreground glow-primary">
          {editing ? 'Salvar nome' : 'Salvar visao'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
