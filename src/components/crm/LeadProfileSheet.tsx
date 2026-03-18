import { useState } from 'react';
import { Copy, ExternalLink, Mail, Phone, Smartphone, Globe, MapPin, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type LeadProfileSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  businessCategory?: string | null;
  businessAddress?: string | null;
  businessWebsite?: string | null;
  businessRating?: number | null;
  primaryPhone?: string | null;
  primaryEmail?: string | null;
  extraPhones?: string[];
  extraEmails?: string[];
  onSelectPhone?: (phone: string) => void;
};

function isMobilePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  // Brazilian mobile: after DDD (2 digits), number starts with 9 and has 9 digits
  const withoutCountry = digits.startsWith('55') ? digits.slice(2) : digits;
  return withoutCountry.length === 11 && withoutCountry[2] === '9';
}

function normalizeWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return '55' + digits;
  return digits;
}

export const LeadProfileSheet = ({
  open,
  onOpenChange,
  businessName,
  businessCategory,
  businessAddress,
  businessWebsite,
  businessRating,
  primaryPhone,
  primaryEmail,
  extraPhones = [],
  extraEmails = [],
  onSelectPhone,
}: LeadProfileSheetProps) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const allPhones = [...new Set([
    ...(primaryPhone ? [primaryPhone] : []),
    ...extraPhones,
  ])].filter(Boolean);

  const allEmails = [...new Set([
    ...(primaryEmail ? [primaryEmail] : []),
    ...extraEmails,
  ])].filter(Boolean);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success('Copiado!');
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l border-[#ececf0] bg-white px-6 pb-8 sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">{businessName}</SheetTitle>
          {businessCategory && (
            <p className="text-sm text-[#696971]">{businessCategory}</p>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Info rápida */}
          <div className="flex flex-wrap gap-2">
            {businessRating != null && (
              <Badge variant="outline" className="gap-1 rounded-full">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {businessRating.toFixed(1)}
              </Badge>
            )}
            {businessWebsite && (
              <Badge variant="outline" className="gap-1 rounded-full">
                <Globe className="h-3 w-3" />
                {businessWebsite}
              </Badge>
            )}
          </div>

          {businessAddress && (
            <div className="flex items-start gap-2 text-sm text-[#696971]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{businessAddress}</span>
            </div>
          )}

          {/* Telefones */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#8a8a92]">
              Telefones ({allPhones.length})
            </h3>
            {allPhones.length === 0 ? (
              <p className="text-sm text-[#8a8a92]">Nenhum telefone encontrado</p>
            ) : (
              <div className="space-y-2">
                {allPhones.map((phone) => {
                  const mobile = isMobilePhone(phone);
                  return (
                    <div
                      key={phone}
                      className="flex items-center justify-between rounded-xl border border-[#ececf0] bg-[#fafafd] px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        {mobile ? (
                          <Smartphone className="h-4 w-4 text-[#1A1A1A]" />
                        ) : (
                          <Phone className="h-4 w-4 text-[#8a8a92]" />
                        )}
                        <span className="text-sm font-medium text-[#1A1A1A]">{phone}</span>
                        <Badge variant="outline" className="rounded-full text-[10px]">
                          {mobile ? 'Celular' : 'Fixo'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {mobile && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg px-2 text-green-600 hover:bg-green-50 hover:text-green-700"
                            onClick={() => window.open(`https://web.whatsapp.com/send?phone=${normalizeWhatsApp(phone)}`, '_blank', 'noopener,noreferrer')}
                          >
                            WA
                          </Button>
                        )}
                        {onSelectPhone && mobile && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg px-2 text-blue-600 hover:bg-blue-50"
                            onClick={() => { onSelectPhone(phone); onOpenChange(false); }}
                          >
                            Usar
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => copyToClipboard(phone)}
                        >
                          <Copy className={`h-3.5 w-3.5 ${copiedText === phone ? 'text-green-500' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Emails */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#8a8a92]">
              Emails ({allEmails.length})
            </h3>
            {allEmails.length === 0 ? (
              <p className="text-sm text-[#8a8a92]">Nenhum email encontrado</p>
            ) : (
              <div className="space-y-2">
                {allEmails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between rounded-xl border border-[#ececf0] bg-[#fafafd] px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#1A1A1A]" />
                      <span className="text-sm font-medium text-[#1A1A1A]">{email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg px-2"
                        onClick={() => window.open(`mailto:${email}`, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => copyToClipboard(email)}
                      >
                        <Copy className={`h-3.5 w-3.5 ${copiedText === email ? 'text-green-500' : ''}`} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {businessWebsite && (
            <Button
              variant="outline"
              className="w-full justify-start rounded-xl"
              onClick={() => window.open(`https://${businessWebsite.replace(/^https?:\/\//, '')}`, '_blank', 'noopener,noreferrer')}
            >
              <Globe className="mr-2 h-4 w-4" />
              Abrir site
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
