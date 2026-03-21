import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type PresentationOption = {
  id: string;
  business_name: string;
  business_phone: string;
};

type CampaignAddPresentationsDialogProps = {
  open: boolean;
  availablePresentations: PresentationOption[];
  selectedPresentationIds: Set<string>;
  onOpenChange: (open: boolean) => void;
  onTogglePresentation: (presentationId: string, checked: boolean) => void;
  onOpenCrm: (presentationId: string) => void;
  onAdd: () => void;
};

export const CampaignAddPresentationsDialog = ({
  open,
  availablePresentations,
  selectedPresentationIds,
  onOpenChange,
  onTogglePresentation,
  onOpenCrm,
  onAdd,
}: CampaignAddPresentationsDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-[22px] border border-[#ececf0] bg-white">
      <DialogHeader>
        <DialogTitle className="text-[#1A1A1A]">Adicionar apresentacoes</DialogTitle>
        <DialogDescription>Selecione as apresentacoes que devem entrar nesta campanha.</DialogDescription>
      </DialogHeader>
      {availablePresentations.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Nenhuma apresentacao disponivel para adicionar.</p>
      ) : (
        <div className="space-y-2">
          {availablePresentations.map((presentation) => (
            <label
              key={presentation.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e8e8ec] bg-white p-3 transition-colors hover:bg-[#fafafd]"
            >
              <Checkbox
                checked={selectedPresentationIds.has(presentation.id)}
                onCheckedChange={(checked) => onTogglePresentation(presentation.id, checked === true)}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{presentation.business_name}</p>
                <p className="text-xs text-[#6e6e76]">{presentation.business_phone || 'Sem telefone'}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onOpenCrm(presentation.id);
                }}
              >
                CRM
              </Button>
            </label>
          ))}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button
          onClick={onAdd}
          disabled={selectedPresentationIds.size === 0}
          className="rounded-xl gradient-primary text-primary-foreground glow-primary"
        >
          Adicionar ({selectedPresentationIds.size})
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
