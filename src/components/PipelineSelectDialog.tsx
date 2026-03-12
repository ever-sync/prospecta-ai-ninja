import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
}

interface PipelineSelectDialogProps {
  open: boolean;
  onConfirm: (result: { attach: boolean; stageId?: string }) => void;
  onCancel: () => void;
}

const DEFAULT_STAGES = [
  { name: 'Propostas Criadas', color: '#6366f1', position: 0, is_default: true, default_status: 'ready' },
  { name: 'Enviadas', color: '#f59e0b', position: 1, is_default: true, default_status: 'sent' },
  { name: 'Pendente', color: '#8b5cf6', position: 2, is_default: true, default_status: 'pending' },
  { name: 'Aceitas', color: '#22c55e', position: 3, is_default: true, default_status: 'responded' },
];

export const PipelineSelectDialog = ({ open, onConfirm, onCancel }: PipelineSelectDialogProps) => {
  const { user } = useAuth();
  const [attach, setAttach] = useState(true);
  const [stageId, setStageId] = useState<string>('');
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('user_id', user.id)
        .order('position');

      if (!data || data.length === 0) {
        // Create default stages
        const toInsert = DEFAULT_STAGES.map((s) => ({ ...s, user_id: user.id }));
        const { data: inserted } = await supabase.from('pipeline_stages').insert(toInsert).select('*');
        if (inserted) {
          setStages(inserted as PipelineStage[]);
          setStageId(inserted[0].id);
        }
      } else {
        setStages(data as PipelineStage[]);
        setStageId(data[0].id);
      }
      setLoading(false);
    };
    load();
  }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anexar ao Pipeline</DialogTitle>
          <DialogDescription>Deseja anexar as apresentações a uma etapa do seu pipeline?</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="attach-pipeline" className="text-sm font-medium">Anexar ao pipeline?</Label>
              <Switch id="attach-pipeline" checked={attach} onCheckedChange={setAttach} />
            </div>

            {attach && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Selecione a etapa</Label>
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma etapa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            onClick={() => onConfirm({ attach, stageId: attach ? stageId : undefined })}
            disabled={loading || (attach && !stageId)}
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
