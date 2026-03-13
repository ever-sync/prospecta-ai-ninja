import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Mail, Globe, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SendPresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicUrl: string;
  businessName: string;
  businessPhone?: string;
}

export const SendPresentationDialog = ({ open, onOpenChange, publicUrl, businessName, businessPhone }: SendPresentationDialogProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast({ title: 'Link copiado!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const sendWhatsApp = () => {
    const phone = businessPhone?.replace(/\D/g, '') || '';
    const fullPhone = phone && (phone.startsWith('55') ? phone : `55${phone}`);
    const message = encodeURIComponent(
      `Olá! Preparamos uma análise completa do site da ${businessName}. Confira: ${publicUrl}`
    );
    const url = fullPhone
      ? `https://wa.me/${fullPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Apresentação</DialogTitle>
          <DialogDescription>Compartilhe a análise de {businessName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={publicUrl} readOnly className="text-xs" />
            <Button variant="outline" size="icon" onClick={copyLink}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <Button onClick={sendWhatsApp} className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
            <MessageCircle className="w-4 h-4" />
            Enviar via WhatsApp
          </Button>

          <Button variant="outline" className="w-full gap-2" disabled>
            <Mail className="w-4 h-4" />
            Enviar por Email (em breve)
          </Button>

          <Button variant="outline" className="w-full gap-2" disabled>
            <Globe className="w-4 h-4" />
            Webhook (em breve)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
