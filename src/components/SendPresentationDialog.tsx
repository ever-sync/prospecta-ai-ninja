import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Mail, Globe, Copy, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    if (open) {
      setPhoneInput(businessPhone || '');
    }
  }, [open, businessPhone]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast({ title: 'Link copiado!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const normalizeWhatsAppPhone = (rawPhone: string) => {
    const digits = rawPhone.replace(/\D/g, '');
    if (!digits) return '';

    if (digits.startsWith('55')) {
      const nationalNumber = digits.slice(2);
      return nationalNumber.length >= 10 && nationalNumber.length <= 11 ? digits : '';
    }

    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }

    if (digits.length >= 12 && digits.length <= 15) {
      return digits;
    }

    return '';
  };

  const sendWhatsApp = async () => {
    const normalizedPhone = normalizeWhatsAppPhone(phoneInput);

    if (phoneInput.trim() && !normalizedPhone) {
      toast({
        title: 'Telefone inválido',
        description: 'Edite o telefone para um número válido antes de enviar.',
        variant: 'destructive',
      });
      return;
    }

    const rawMessage = `Olá! Tudo bem? 👋\n\nSou especialista em presença digital e preparei uma *análise personalizada* para a *${businessName}*.\n\nNela você vai encontrar:\n✅ Diagnóstico completo do seu site\n✅ Pontos de melhoria em SEO e performance\n✅ Oportunidades de crescimento\n\n📊 Acesse aqui: ${publicUrl}\n\nFique à vontade para me chamar se tiver alguma dúvida!`;

    const message = encodeURIComponent(rawMessage);
    const url = normalizedPhone
      ? `https://web.whatsapp.com/send?phone=${normalizedPhone}&text=${message}`
      : `https://web.whatsapp.com/send?text=${message}`;

    // Copy message as fallback
    try {
      await navigator.clipboard.writeText(rawMessage);
    } catch {}

    window.open(url, '_blank', 'noopener,noreferrer');
    toast({ title: '📋 Mensagem copiada!', description: 'Se o WhatsApp não abrir, cole a mensagem manualmente.' });
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

          <div className="space-y-1">
            <Input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Telefone WhatsApp (com DDD)"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              Se o telefone vindo do Google/site estiver errado, edite antes de enviar.
            </p>
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
