import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, ChevronLeft, ChevronRight, Eye, MessageSquare, Mail, Mic } from 'lucide-react';

interface PreviewLead {
  id: string;
  business_name: string;
  business_phone: string;
  message: string;
  subject?: string;
}

interface CampaignPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: PreviewLead[];
  channel: string;
  campaignName: string;
  onConfirmSend: () => void;
  sending: boolean;
  sendAsAudio?: boolean;
}

const CampaignPreviewDialog = ({
  open,
  onOpenChange,
  leads,
  channel,
  campaignName,
  onConfirmSend,
  sending,
  sendAsAudio = false,
}: CampaignPreviewDialogProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const current = leads[currentIndex];
  if (!current && leads.length === 0) return null;

  const goNext = () => setCurrentIndex(i => Math.min(i + 1, leads.length - 1));
  const goPrev = () => setCurrentIndex(i => Math.max(i - 1, 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Preview — {campaignName}
          </DialogTitle>
          <DialogDescription>
            Revise as mensagens da campanha antes de disparar o envio para os leads selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {channel === 'whatsapp' ? <><MessageSquare className="w-3 h-3 mr-1" /> WhatsApp</> : <><Mail className="w-3 h-3 mr-1" /> Email</>}
            </Badge>
            {sendAsAudio && channel === 'whatsapp' && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                <Mic className="w-3 h-3 mr-1" /> Áudio será gerado
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev} disabled={currentIndex === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground font-medium">
              {currentIndex + 1} / {leads.length}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext} disabled={currentIndex === leads.length - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {current && (
          <div className="flex-1 min-h-0">
            <div className="mb-3">
              <p className="text-sm font-semibold text-foreground">{current.business_name}</p>
              <p className="text-xs text-muted-foreground">{current.business_phone || 'Sem telefone'}</p>
            </div>

            {channel === 'email' && current.subject && (
              <div className="mb-2 px-3 py-2 rounded-md bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground">Assunto:</p>
                <p className="text-sm text-foreground font-medium">{current.subject}</p>
              </div>
            )}

            <ScrollArea className="h-[300px] rounded-lg border border-border">
              {channel === 'whatsapp' ? (
                <div className="p-4 bg-[hsl(var(--secondary))]/30">
                  <div className="max-w-[85%] bg-[hsl(var(--accent))]/20 border border-border rounded-xl rounded-tl-sm p-3">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{current.message}</p>
                  </div>
                  {sendAsAudio && (
                    <div className="max-w-[85%] mt-2 bg-primary/5 border border-primary/20 rounded-xl rounded-tl-sm p-3 flex items-center gap-2">
                      <Mic className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        🎙️ Um áudio com sua voz será gerado e anexado a esta mensagem
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4">
                  <div className="bg-secondary/30 border border-border rounded-lg p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{current.message}</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={onConfirmSend}
            disabled={sending}
            className="gap-2 gradient-primary text-primary-foreground glow-primary"
          >
            <Send className="w-4 h-4" />
            {sending
              ? (sendAsAudio ? 'Gerando áudios e enviando...' : 'Enviando...')
              : `Enviar ${leads.length} mensagen${leads.length > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignPreviewDialog;
