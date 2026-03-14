import { Copy, MessageCircle, Megaphone, RefreshCw, SquareArrowOutUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CRMQuickActionsProps = {
  publicUrl: string;
  onCopyLink: () => Promise<void> | void;
  onOpenSend: () => void;
  onOpenCampaign: () => void;
  onRegenerate: () => void;
};

export const CRMQuickActions = ({
  publicUrl,
  onCopyLink,
  onOpenSend,
  onOpenCampaign,
  onRegenerate,
}: CRMQuickActionsProps) => (
  <div className="grid gap-2 md:grid-cols-2">
    <Button type="button" variant="outline" className="justify-start rounded-xl" disabled={!publicUrl} onClick={() => publicUrl && window.open(publicUrl, '_blank', 'noopener,noreferrer')}>
      <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
      Abrir proposta
    </Button>
    <Button type="button" variant="outline" className="justify-start rounded-xl" disabled={!publicUrl} onClick={onCopyLink}>
      <Copy className="mr-2 h-4 w-4" />
      Copiar link
    </Button>
    <Button type="button" variant="outline" className="justify-start rounded-xl" onClick={onOpenSend}>
      <MessageCircle className="mr-2 h-4 w-4" />
      Enviar via WhatsApp
    </Button>
    <Button type="button" variant="outline" className="justify-start rounded-xl" onClick={onOpenCampaign}>
      <Megaphone className="mr-2 h-4 w-4" />
      Mandar para campanha
    </Button>
    <Button type="button" variant="outline" className="justify-start rounded-xl md:col-span-2" onClick={onRegenerate}>
      <RefreshCw className="mr-2 h-4 w-4" />
      Regenerar proposta
    </Button>
  </div>
);
