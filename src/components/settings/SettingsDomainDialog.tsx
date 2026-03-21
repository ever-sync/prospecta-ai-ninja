import { Globe, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fieldClass = 'h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]';

type SettingsDomainDialogProps = {
  open: boolean;
  saving: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
};

export const SettingsDomainDialog = ({
  open,
  saving,
  value,
  onValueChange,
  onOpenChange,
  onSave,
}: SettingsDomainDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg rounded-[22px] border border-[#ececf0] bg-white p-0">
      <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#356DFF]/10">
          <Globe className="h-5 w-5 text-[#356DFF]" />
        </div>
        <div>
          <DialogTitle className="text-base font-semibold text-[#1A1A1A]">Dominio das propostas</DialogTitle>
          <DialogDescription className="text-xs text-[#6d6d75]">Configure o dominio usado nos links das propostas enviadas.</DialogDescription>
        </div>
      </div>
      <div className="space-y-4 px-6 py-5">
        <div className="space-y-2">
          <Label className="text-sm text-[#1A1A1A]">Dominio do link das propostas</Label>
          <Input
            className={fieldClass}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder="Ex: app.seudominio.com"
          />
          <p className="text-xs text-[#7b7b83]">Use o dominio sem barra final. Pode informar com ou sem https://.</p>
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
