import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type AnalysisItem = {
  id: string;
  name: string;
  status: 'pending' | 'analyzing' | 'generating' | 'done' | 'error';
  error?: string;
};

interface AnalysisProgressModalProps {
  open: boolean;
  items: AnalysisItem[];
  onClose: () => void;
  onFinish: () => void;
}

const statusIcon = (status: AnalysisItem['status']) => {
  switch (status) {
    case 'pending': return <Clock className="w-4 h-4 text-muted-foreground" />;
    case 'analyzing': return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    case 'generating': return <Loader2 className="w-4 h-4 text-accent animate-spin" />;
    case 'done': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
  }
};

const statusLabel = (status: AnalysisItem['status']) => {
  switch (status) {
    case 'pending': return 'Na fila';
    case 'analyzing': return 'Analisando site...';
    case 'generating': return 'Gerando apresentação...';
    case 'done': return 'Concluído';
    case 'error': return 'Erro';
  }
};

export const AnalysisProgressModal = ({ open, items, onClose, onFinish }: AnalysisProgressModalProps) => {
  const completed = items.filter(i => i.status === 'done' || i.status === 'error').length;
  const progress = items.length > 0 ? (completed / items.length) * 100 : 0;
  const allDone = completed === items.length && items.length > 0;

  return (
    <Dialog open={open} onOpenChange={allDone ? onClose : undefined}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={e => !allDone && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Analisando Empresas ({completed}/{items.length})</DialogTitle>
        </DialogHeader>

        <Progress value={progress} className="h-2" />

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              {statusIcon(item.status)}
              <span className="flex-1 truncate text-foreground">{item.name}</span>
              <span className="text-xs text-muted-foreground">{statusLabel(item.status)}</span>
            </div>
          ))}
        </div>

        {allDone && (
          <div className="flex justify-end pt-2">
            <Button onClick={onFinish} className="gradient-primary text-primary-foreground">
              Ver Apresentações
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
