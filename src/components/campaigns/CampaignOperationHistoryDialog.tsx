import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type CampaignOperationHistoryRow = {
  id: string;
  created_at: string;
  event_type: string;
  source: string;
  reason_code?: string | null;
  message?: string | null;
};

type CampaignOperationHistoryDialogProps = {
  open: boolean;
  rows: CampaignOperationHistoryRow[];
  onOpenChange: (open: boolean) => void;
  formatOperationEventType: (eventType: string) => string;
  formatOperationReason: (reason?: string | null) => string;
};

export const CampaignOperationHistoryDialog = ({
  open,
  rows,
  onOpenChange,
  formatOperationEventType,
  formatOperationReason,
}: CampaignOperationHistoryDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-[22px] border border-[#ececf0] bg-white">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-[#1A1A1A]">
          <BookOpen className="h-5 w-5 text-[#365fc2]" />
          Historico operacional
        </DialogTitle>
        <DialogDescription>Eventos recentes de bloqueio, cancelamento e execucao desta campanha.</DialogDescription>
      </DialogHeader>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#6d6d75]">Nenhum evento operacional registrado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Evento</TableHead>
              <TableHead className="text-xs">Origem</TableHead>
              <TableHead className="text-xs">Detalhe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs text-[#6d6d75]">{new Date(row.created_at).toLocaleString('pt-BR')}</TableCell>
                <TableCell className="text-sm font-medium text-[#1A1A1A]">{formatOperationEventType(row.event_type)}</TableCell>
                <TableCell className="text-xs text-[#6d6d75]">{row.source}</TableCell>
                <TableCell className="text-xs text-[#4f4f57]">
                  {row.message || formatOperationReason(row.reason_code)}
                  {row.reason_code && (
                    <span className="mt-1 block text-[11px] text-[#8a8a92]">Codigo: {row.reason_code}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
