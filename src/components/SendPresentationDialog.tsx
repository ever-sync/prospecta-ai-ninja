import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Mail, Globe, Copy, Check, Phone, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SendPresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicUrl: string;
  businessName: string;
  businessPhone?: string;
  extraPhones?: string[];
  preselectedPhone?: string | null;
}

function isMobilePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  const withoutCountry = digits.startsWith('55') ? digits.slice(2) : digits;
  return withoutCountry.length === 11 && withoutCountry[2] === '9';
}

export const SendPresentationDialog = ({
  open,
  onOpenChange,
  publicUrl,
  businessName,
  businessPhone,
  extraPhones = [],
  preselectedPhone,
}: SendPresentationDialogProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

  const allPhones = [...new Set([
    ...(businessPhone ? [businessPhone] : []),
    ...extraPhones,
  ])].filter(Boolean);

  const showSelector = allPhones.length > 1;

  useEffect(() => {
    if (open) {
      const initial = preselectedPhone || businessPhone || '';
      setPhoneInput(initial);
    }
  }, [open, businessPhone, preselectedPhone]);

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
            {showSelector ? (
              <>
                <Select value={phoneInput} onValueChange={setPhoneInput}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o número" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPhones.map((phone) => {
                      const mobile = isMobilePhone(phone);
                      return (
                        <SelectItem key={phone} value={phone}>
                          <span className="flex items-center gap-2">
                            {mobile
                              ? <Smartphone className="h-3.5 w-3.5 text-green-600" />
                              : <Phone className="h-3.5 w-3.5 text-[#8a8a92]" />
                            }
                            {phone}
                            <span className="text-xs text-muted-foreground">
                              {mobile ? '· Celular' : '· Fixo'}
                            </span>
                          </span>
                        </SelectItem>
                      );
                    })}
                    <SelectItem value="">Digitar outro número</SelectItem>
                  </SelectContent>
                </Select>
                {phoneInput === '' && (
                  <Input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="Digite o número (com DDD)"
                    maxLength={20}
                    className="mt-1"
                  />
                )}
              </>
            ) : (
              <Input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Telefone WhatsApp (com DDD)"
                maxLength={20}
              />
            )}
            <p className="text-xs text-muted-foreground">
              {showSelector
                ? 'Selecione o celular para envio via WhatsApp.'
                : 'Se o telefone estiver errado, edite antes de enviar.'}
            </p>
          </div>

          <Button onClick={sendWhatsApp} className="w-full gap-2 bg-[#EF3333] hover:bg-[#d92f2f] text-white">
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
