import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type FailureRow = {
  business_name: string;
  business_phone: string;
  error_reason: string;
};

type CampaignFailuresDialogProps = {
  open: boolean;
  rows: FailureRow[];
  onOpenChange: (open: boolean) => void;
  formatFailureReason: (reason?: string | null) => string;
};

export const CampaignFailuresDialog = ({
  open,
  rows,
  onOpenChange,
  formatFailureReason,
}: CampaignFailuresDialogProps) => {
  const summaryByReason = rows.reduce((accumulator, row) => {
    const key = formatFailureReason(row.error_reason);
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {} as Record<string, number>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-[22px] border border-[#ececf0] bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1A1A1A]">
            <AlertTriangle className="h-5 w-5 text-[#c2620a]" />
            Falhas de envio
          </DialogTitle>
          <DialogDescription>Leads que nao receberam a mensagem e o motivo do erro.</DialogDescription>
        </DialogHeader>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#6d6d75]">Nenhuma falha registrada.</p>
        ) : (
          <div className="space-y-1.5">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {Object.entries(summaryByReason).map(([reason, count]) => (
                <span
                  key={reason}
                  className="rounded-full border border-[#f5d8c8] bg-[#fff8f4] px-2.5 py-0.5 text-[11px] font-medium text-[#c2620a]"
                >
                  {count}x {reason}
                </span>
              ))}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Empresa</TableHead>
                  <TableHead className="text-xs">Telefone</TableHead>
                  <TableHead className="text-xs">Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={`${row.business_name}-${index}`}>
                    <TableCell className="text-sm font-medium">{row.business_name}</TableCell>
                    <TableCell className="text-sm text-[#6d6d75]">{row.business_phone}</TableCell>
                    <TableCell className="text-xs text-[#c2620a]">{formatFailureReason(row.error_reason)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
