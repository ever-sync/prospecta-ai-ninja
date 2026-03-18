import { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  NotebookPen,
  Phone,
  Send,
  Smartphone,
  Star,
  XCircle,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Note = { id: string; content: string; created_at: string };
type Event = { id: string; event_type: string; channel: string | null; created_at: string };
type Campaign = {
  id: string;
  send_status: string | null;
  sent_at: string | null;
  campaigns: { name?: string | null; channel?: string | null } | null;
};

type ClientProfileSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentationId: string;
  publicId: string;
  businessName: string | null;
  businessCategory?: string | null;
  businessPhone?: string | null;
  businessEmail?: string | null;
  businessWebsite?: string | null;
  businessAddress?: string | null;
  analysisScore?: number | null;
  acceptedAt?: string | null;
};

function normalizeWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return '55' + digits;
  return digits;
}

function isMobilePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  const n = digits.startsWith('55') ? digits.slice(2) : digits;
  return n.length === 11 && n[2] === '9';
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const eventConfig: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  accepted:  { label: 'Proposta aceita',     icon: CheckCircle2, cls: 'text-green-600 bg-green-50' },
  opened:    { label: 'Proposta visualizada', icon: ExternalLink, cls: 'text-blue-600 bg-blue-50' },
  sent:      { label: 'Proposta enviada',     icon: Send,         cls: 'text-[#EF3333] bg-red-50' },
  rejected:  { label: 'Proposta recusada',    icon: XCircle,      cls: 'text-red-600 bg-red-50' },
};

export const ClientProfileSheet = ({
  open,
  onOpenChange,
  presentationId,
  publicId,
  businessName,
  businessCategory,
  businessPhone,
  businessEmail,
  businessWebsite,
  businessAddress,
  analysisScore,
  acceptedAt,
}: ClientProfileSheetProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [presentationHtml, setPresentationHtml] = useState<string | null>(null);
  const [extraPhones, setExtraPhones] = useState<string[]>([]);
  const [extraEmails, setExtraEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !presentationId) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      const [notesRes, eventsRes, campaignsRes, presRes] = await Promise.all([
        supabase
          .from('lead_notes')
          .select('id, content, created_at')
          .eq('presentation_id', presentationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('message_conversion_events')
          .select('id, event_type, channel, created_at')
          .eq('presentation_id', presentationId)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('campaign_presentations')
          .select('id, send_status, sent_at, campaigns(name, channel)')
          .eq('presentation_id', presentationId)
          .order('sent_at', { ascending: false })
          .limit(10),
        supabase
          .from('presentations')
          .select('presentation_html, analysis_data')
          .eq('id', presentationId)
          .single(),
      ]);

      if (!active) return;
      setNotes((notesRes.data || []) as Note[]);
      setEvents((eventsRes.data || []) as Event[]);
      setCampaigns((campaignsRes.data || []) as Campaign[]);
      setPresentationHtml(presRes.data?.presentation_html || null);
      const ad = (presRes.data?.analysis_data as Record<string, unknown>) || {};
      setExtraPhones((ad.extra_phones as string[]) || []);
      setExtraEmails((ad.extra_emails as string[]) || []);
      setLoading(false);
    };

    void load();
    return () => { active = false; };
  }, [open, presentationId]);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const publicUrl = `${window.location.origin}/presentation/${publicId}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden border-l border-[#ececf0] bg-white p-0 sm:max-w-2xl"
      >
        {/* Header */}
        <SheetHeader className="shrink-0 border-b border-[#ececf0] px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-lg">{businessName || 'Sem nome'}</SheetTitle>
              {businessCategory && (
                <p className="mt-0.5 text-sm text-[#696971]">{businessCategory}</p>
              )}
            </div>
            {analysisScore != null && (
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 rounded-full',
                  analysisScore >= 80 ? 'border-green-200 bg-green-50 text-green-700'
                  : analysisScore >= 60 ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                  : 'border-red-200 bg-red-50 text-red-700'
                )}
              >
                <Star className="mr-1 h-3 w-3" />
                Score {analysisScore}
              </Badge>
            )}
          </div>

          {/* Quick contact */}
          <div className="mt-3 flex flex-wrap gap-2">
            {businessPhone && (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full border border-[#ececf0] bg-[#fafafd] px-3 py-1.5 text-xs text-[#1A1A1A] hover:bg-[#f0f0f3]"
                onClick={() => copy(businessPhone, 'Telefone')}
              >
                {isMobilePhone(businessPhone) ? <Smartphone className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                {businessPhone}
                <Copy className="h-3 w-3 text-[#8a8a92]" />
              </button>
            )}
            {businessEmail && (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full border border-[#ececf0] bg-[#fafafd] px-3 py-1.5 text-xs text-[#1A1A1A] hover:bg-[#f0f0f3]"
                onClick={() => copy(businessEmail, 'Email')}
              >
                <Mail className="h-3.5 w-3.5" />
                {businessEmail}
                <Copy className="h-3 w-3 text-[#8a8a92]" />
              </button>
            )}
            {acceptedAt && (
              <span className="flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-xs text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aceitou em {new Date(acceptedAt).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Abrir proposta
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => copy(publicUrl, 'Link')}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {businessPhone && isMobilePhone(businessPhone) && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-green-600 hover:border-green-300 hover:bg-green-50"
                onClick={() =>
                  window.open(`https://web.whatsapp.com/send?phone=${normalizeWhatsApp(businessPhone)}`, '_blank', 'noopener,noreferrer')
                }
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="presentation" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="shrink-0 rounded-none border-b border-[#ececf0] bg-white px-6 py-0 h-11 justify-start gap-4">
            <TabsTrigger value="presentation" className="rounded-none border-b-2 border-transparent pb-2.5 pt-2 text-sm font-medium text-[#696971] data-[state=active]:border-[#EF3333] data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-none bg-transparent px-0 h-full">
              Proposta
            </TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-none border-b-2 border-transparent pb-2.5 pt-2 text-sm font-medium text-[#696971] data-[state=active]:border-[#EF3333] data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-none bg-transparent px-0 h-full">
              Histórico {events.length > 0 && <span className="ml-1 rounded-full bg-[#f5f5f7] px-1.5 py-0.5 text-[10px]">{events.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent pb-2.5 pt-2 text-sm font-medium text-[#696971] data-[state=active]:border-[#EF3333] data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-none bg-transparent px-0 h-full">
              Notas {notes.length > 0 && <span className="ml-1 rounded-full bg-[#f5f5f7] px-1.5 py-0.5 text-[10px]">{notes.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent pb-2.5 pt-2 text-sm font-medium text-[#696971] data-[state=active]:border-[#EF3333] data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-none bg-transparent px-0 h-full">
              Info
            </TabsTrigger>
          </TabsList>

          {/* Proposta */}
          <TabsContent value="presentation" className="flex-1 overflow-hidden m-0 p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-8 w-full rounded-xl" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
              </div>
            ) : presentationHtml ? (
              <iframe
                srcDoc={presentationHtml}
                className="h-full w-full border-0"
                title={`Proposta — ${businessName}`}
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <p className="text-sm text-[#8a8a92]">Proposta não disponível para visualização inline.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 rounded-xl"
                  onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Abrir proposta
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="timeline" className="flex-1 overflow-y-auto m-0 px-6 py-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-8 w-8 text-[#c4c4cc]" />
                <p className="mt-3 text-sm text-[#8a8a92]">Nenhum evento registrado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((ev) => {
                  const cfg = eventConfig[ev.event_type] || {
                    label: ev.event_type,
                    icon: Calendar,
                    cls: 'text-[#696971] bg-[#f5f5f7]',
                  };
                  const Icon = cfg.icon;
                  return (
                    <div key={ev.id} className="flex items-start gap-3 rounded-xl border border-[#ececf0] p-3">
                      <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', cfg.cls)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1A1A1A]">{cfg.label}</p>
                        <p className="text-xs text-[#8a8a92]">
                          {formatDate(ev.created_at)}{ev.channel ? ` · via ${ev.channel}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {campaigns.length > 0 && (
                  <>
                    <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-[#8a8a92]">Campanhas</p>
                    {campaigns.map((cp) => (
                      <div key={cp.id} className="flex items-start gap-3 rounded-xl border border-[#ececf0] p-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f0f0f3] text-[#696971]">
                          <Send className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#1A1A1A]">
                            {cp.campaigns?.name || 'Campanha'}{cp.campaigns?.channel ? ` · ${cp.campaigns.channel}` : ''}
                          </p>
                          <p className="text-xs text-[#8a8a92]">
                            Status: {cp.send_status || 'desconhecido'} · {cp.sent_at ? formatDate(cp.sent_at) : '-'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </TabsContent>

          {/* Notas */}
          <TabsContent value="notes" className="flex-1 overflow-y-auto m-0 px-6 py-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <NotebookPen className="h-8 w-8 text-[#c4c4cc]" />
                <p className="mt-3 text-sm text-[#8a8a92]">Nenhuma nota registrada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-[#ececf0] p-4">
                    <p className="whitespace-pre-wrap text-sm text-[#1A1A1A]">{note.content}</p>
                    <p className="mt-2 text-xs text-[#8a8a92]">{formatDate(note.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Info */}
          <TabsContent value="info" className="flex-1 overflow-y-auto m-0 px-6 py-4">
            <div className="space-y-4">
              {/* Phones */}
              {(() => {
                const allPhones = [...new Set([...(businessPhone ? [businessPhone] : []), ...extraPhones])];
                if (allPhones.length === 0) return null;
                return (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a92]">Telefones</p>
                    <div className="space-y-2">
                      {allPhones.map((phone) => {
                        const mobile = isMobilePhone(phone);
                        return (
                          <div key={phone} className="flex items-center gap-3 rounded-xl border border-[#ececf0] bg-[#fafafd] px-4 py-3">
                            {mobile ? <Smartphone className="h-4 w-4 shrink-0 text-[#8a8a92]" /> : <Phone className="h-4 w-4 shrink-0 text-[#8a8a92]" />}
                            <span className="flex-1 text-sm text-[#1A1A1A]">{phone}</span>
                            <Badge variant="outline" className={cn('rounded-full text-[10px]', mobile ? 'border-blue-100 bg-blue-50 text-blue-600' : 'border-[#ececf0] bg-[#f5f5f7] text-[#8a8a92]')}>
                              {mobile ? 'Celular' : 'Fixo'}
                            </Badge>
                            {mobile && (
                              <button
                                type="button"
                                className="shrink-0 rounded-lg p-1 text-green-600 hover:bg-green-50"
                                title="Abrir WhatsApp"
                                onClick={() => window.open(`https://web.whatsapp.com/send?phone=${normalizeWhatsApp(phone)}`, '_blank', 'noopener,noreferrer')}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              className="shrink-0 rounded-lg p-1 text-[#8a8a92] hover:bg-[#ececf0]"
                              title="Copiar telefone"
                              onClick={() => copy(phone, 'Telefone')}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Emails */}
              {(() => {
                const allEmails = [...new Set([...(businessEmail ? [businessEmail] : []), ...extraEmails])];
                if (allEmails.length === 0) return null;
                return (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a92]">Emails</p>
                    <div className="space-y-2">
                      {allEmails.map((email) => (
                        <div key={email} className="flex items-center gap-3 rounded-xl border border-[#ececf0] bg-[#fafafd] px-4 py-3">
                          <Mail className="h-4 w-4 shrink-0 text-[#8a8a92]" />
                          <span className="flex-1 break-all text-sm text-[#1A1A1A]">{email}</span>
                          <button
                            type="button"
                            className="shrink-0 rounded-lg p-1 text-[#8a8a92] hover:bg-[#ececf0]"
                            onClick={() => window.open(`mailto:${email}`, '_self')}
                            title="Enviar email"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="shrink-0 rounded-lg p-1 text-[#8a8a92] hover:bg-[#ececf0]"
                            title="Copiar email"
                            onClick={() => copy(email, 'Email')}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Website & Address */}
              {[
                { icon: Globe, label: 'Website', value: businessWebsite },
                { icon: MapPin, label: 'Endereço', value: businessAddress },
              ].filter(item => item.value).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 rounded-xl border border-[#ececf0] bg-[#fafafd] px-4 py-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#8a8a92]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a92]">{label}</p>
                    <p className="mt-0.5 break-all text-sm text-[#1A1A1A]">{value}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg p-1 text-[#8a8a92] hover:bg-[#ececf0]"
                    onClick={() => copy(value!, label)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
