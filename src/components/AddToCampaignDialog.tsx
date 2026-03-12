import { useEffect, useState } from 'react';
import { Loader2, Megaphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddToCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentationIds: string[];
  onSuccess: () => void;
}

export const AddToCampaignDialog = ({ open, onOpenChange, presentationIds, onSuccess }: AddToCampaignDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; status: string }[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (open && user) {
      setFetching(true);
      supabase
        .from('campaigns')
        .select('id, name, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setCampaigns(data || []);
          setSelectedCampaignId('');
          setFetching(false);
        });
    }
  }, [open, user]);

  const handleSubmit = async () => {
    if (!selectedCampaignId || presentationIds.length === 0) return;
    setLoading(true);

    try {
      // Check which presentations are already in the campaign
      const { data: existing } = await supabase
        .from('campaign_presentations')
        .select('presentation_id')
        .eq('campaign_id', selectedCampaignId)
        .in('presentation_id', presentationIds);

      const existingIds = new Set((existing || []).map(e => e.presentation_id));
      const newIds = presentationIds.filter(id => !existingIds.has(id));

      if (newIds.length === 0) {
        toast({ title: 'Aviso', description: 'Todas as apresentações já estão nesta campanha.' });
        setLoading(false);
        return;
      }

      const rows = newIds.map(pid => ({
        campaign_id: selectedCampaignId,
        presentation_id: pid,
      }));

      const { error } = await supabase.from('campaign_presentations').insert(rows);
      if (error) throw error;

      const skipped = presentationIds.length - newIds.length;
      toast({
        title: 'Adicionadas!',
        description: `${newIds.length} apresentação(ões) adicionada(s) à campanha.${skipped > 0 ? ` ${skipped} já existia(m).` : ''}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao adicionar à campanha', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Enviar para Campanha
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {presentationIds.length} apresentação(ões) selecionada(s)
          </p>

          {fetching ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando campanhas...
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma campanha encontrada. Crie uma campanha primeiro na aba Campanhas.
            </p>
          ) : (
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma campanha" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedCampaignId || loading || campaigns.length === 0}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
