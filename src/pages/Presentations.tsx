import { useEffect, useMemo, useState } from 'react';
import { Presentation, Eye, Send, Trash2, Loader2, RefreshCw, Megaphone, Sparkles, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SendPresentationDialog } from '@/components/SendPresentationDialog';
import { RegeneratePresentationDialog } from '@/components/RegeneratePresentationDialog';
import { AddToCampaignDialog } from '@/components/AddToCampaignDialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { invokeEdgeFunction } from '@/lib/invoke-edge-function';

type PresentationRow = {
  id: string;
  public_id: string;
  business_name: string;
  business_address: string;
  business_phone: string;
  business_website: string;
  business_category: string;
  business_rating: number | null;
  analysis_data: any;
  status: string;
  lead_response: string;
  created_at: string;
};

const resolvePublicBaseOrigin = (domain?: string | null) => {
  const fallback = 'https://prospecta-ai-ninja.lovable.app';
  const value = (domain || '').trim().replace(/\/+$/, '');
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const Presentations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [presentations, setPresentations] = useState<PresentationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [sendDialog, setSendDialog] = useState<{ open: boolean; publicUrl: string; name: string; phone: string }>({
    open: false,
    publicUrl: '',
    name: '',
    phone: '',
  });
  const [regenDialog, setRegenDialog] = useState<{ open: boolean; presentation: PresentationRow | null }>({
    open: false,
    presentation: null,
  });
  const [publicBaseOrigin, setPublicBaseOrigin] = useState('https://prospecta-ai-ninja.lovable.app');

  const fetchPresentations = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('presentations').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const { data: profileData } = await supabase.from('profiles').select('proposal_link_domain').eq('user_id', user.id).maybeSingle();

    if (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Falha ao carregar apresentacoes', variant: 'destructive' });
    } else {
      setPresentations((data as any) || []);
      setPublicBaseOrigin(resolvePublicBaseOrigin((profileData as any)?.proposal_link_domain));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPresentations();
  }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('presentations').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir', variant: 'destructive' });
    } else {
      setPresentations((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      toast({ title: 'Excluida', description: 'Apresentacao removida' });
    }
  };

  const getPublicUrl = (publicId: string) => `${publicBaseOrigin}/presentation/${publicId}`;

  const handleRegenerate = async (
    template: string,
    tone: string,
    customInstructions: string,
    customColors?: { textColor: string; buttonColor: string; bgColor: string }
  ) => {
    const p = regenDialog.presentation;
    if (!p || !user) return;

    await supabase.from('presentations').update({ status: 'analyzing' } as any).eq('id', p.id);
    setPresentations((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: 'analyzing' } : x)));

    try {
      const [dnaRes, profileRes, testimonialsRes, clientLogosRes] = await Promise.all([
        supabase.from('company_dna').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('testimonials').select('name, company, testimonial, image_url').eq('user_id', user.id),
        supabase.from('client_logos').select('company_name, logo_url').eq('user_id', user.id),
      ]);

      const { data: genData, error: genError } = await invokeEdgeFunction<{ html: string }>('generate-presentation', {
        body: {
          analysis: p.analysis_data,
          business: {
            name: p.business_name,
            address: p.business_address,
            phone: p.business_phone,
            website: p.business_website,
            category: p.business_category,
            rating: p.business_rating,
          },
          dna: {
            ...dnaRes.data,
            ...(customColors
              ? {
                  custom_text_color: customColors.textColor,
                  custom_button_color: customColors.buttonColor,
                  custom_bg_color: customColors.bgColor,
                }
              : {}),
          },
          profile: profileRes.data,
          testimonials: testimonialsRes.data,
          clientLogos: clientLogosRes.data,
          template,
          tone,
          customInstructions,
          publicId: p.public_id,
        },
      });

      if (genError) throw genError;

      await supabase.from('presentations').update({ presentation_html: genData.html, status: 'ready' } as any).eq('id', p.id);

      setPresentations((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: 'ready' } : x)));
      toast({ title: 'Regenerada!', description: 'Apresentacao atualizada com sucesso' });
    } catch (err) {
      console.error(err);
      await supabase.from('presentations').update({ status: 'error' } as any).eq('id', p.id);
      setPresentations((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: 'error' } : x)));
      toast({ title: 'Erro', description: 'Falha ao regenerar apresentacao', variant: 'destructive' });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const readyPresentations = presentations.filter((p) => p.status === 'ready');
  const allReadySelected = readyPresentations.length > 0 && readyPresentations.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allReadySelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(readyPresentations.map((p) => p.id)));
  };

  const stats = useMemo(() => {
    const ready = presentations.filter((p) => p.status === 'ready').length;
    const processing = presentations.filter((p) => p.status === 'analyzing' || p.status === 'pending').length;
    const accepted = presentations.filter((p) => p.lead_response === 'accepted').length;
    return {
      total: presentations.length,
      ready,
      processing,
      accepted,
    };
  }, [presentations]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="rounded-full border border-[#f2d4d8] bg-[#fff3f5] text-[#9b2a3d]">Pronta</Badge>;
      case 'analyzing':
        return <Badge className="rounded-full border border-[#e7e7ec] bg-[#f7f7fa] text-[#5f5f68]">Analisando</Badge>;
      case 'error':
        return <Badge className="rounded-full border border-[#f5c8ce] bg-[#fff0f2] text-[#c23a4f]">Erro</Badge>;
      default:
        return <Badge className="rounded-full border border-[#e7e7ec] bg-[#f7f7fa] text-[#5f5f68]">Pendente</Badge>;
    }
  };

  const responseBadge = (response: string) => {
    switch (response) {
      case 'accepted':
        return <Badge className="rounded-full border border-[#f2d4d8] bg-[#fff3f5] text-[#9b2a3d]">Aceita</Badge>;
      case 'rejected':
        return <Badge className="rounded-full border border-[#f5c8ce] bg-[#fff0f2] text-[#c23a4f]">Recusada</Badge>;
      default:
        return <Badge className="rounded-full border border-[#efe7d2] bg-[#fffbf2] text-[#9a7a2b]">Aguardando</Badge>;
    }
  };

  const overallScore = (data: any) => data?.scores?.overall ?? '-';
  const formatDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4 lg:p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#EF3333]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
      <div className="rounded-[28px] border border-[#ececf0] bg-white px-5 py-6 shadow-[0_14px_36px_rgba(20,20,24,0.06)] lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#75757d]">Conteudo Comercial</p>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight text-[#1A1A1A] lg:text-4xl">
              <Presentation className="h-7 w-7 text-[#EF3333]" />
              Apresentacoes
            </h1>
            <p className="mt-2 text-sm text-[#66666d] lg:text-base">Gerencie propostas geradas, respostas de leads e envios para campanhas.</p>
          </div>

          {selectedIds.size > 0 && (
            <Button onClick={() => setCampaignDialog(true)} className="h-10 rounded-xl gap-2 gradient-primary text-primary-foreground glow-primary">
              <Megaphone className="h-4 w-4" />
              Enviar para Campanha ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <p className="text-sm text-[#6f6f76]">Total</p>
          <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{stats.total}</p>
        </Card>
        <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#EF3333]" />
            <p className="text-sm text-[#6f6f76]">Prontas</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{stats.ready}</p>
        </Card>
        <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[#7c7c83]" />
            <p className="text-sm text-[#6f6f76]">Em processamento</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{stats.processing}</p>
        </Card>
        <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#EF3333]" />
            <p className="text-sm text-[#6f6f76]">Aceitas</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{stats.accepted}</p>
        </Card>
      </div>

      <SendPresentationDialog
        open={sendDialog.open}
        onOpenChange={(open) => setSendDialog((prev) => ({ ...prev, open }))}
        publicUrl={sendDialog.publicUrl}
        businessName={sendDialog.name}
        businessPhone={sendDialog.phone}
      />

      <RegeneratePresentationDialog
        open={regenDialog.open}
        onOpenChange={(open) => setRegenDialog((prev) => ({ ...prev, open }))}
        onRegenerate={handleRegenerate}
        businessName={regenDialog.presentation?.business_name || ''}
      />

      <AddToCampaignDialog open={campaignDialog} onOpenChange={setCampaignDialog} presentationIds={Array.from(selectedIds)} onSuccess={() => setSelectedIds(new Set())} />

      {presentations.length === 0 ? (
        <Card className="rounded-[24px] border border-[#ececf0] bg-white p-12 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1f3]">
              <Presentation className="h-8 w-8 text-[#EF3333]" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-[#1A1A1A]">Nenhuma apresentacao ainda</h3>
              <p className="mt-1 text-sm text-[#6e6e76]">Selecione empresas na aba Busca e clique em "Analisar Selecionadas" para gerar apresentacoes.</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="overflow-x-auto rounded-[24px] border border-[#ececf0] bg-white shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
          <Table className="min-w-[840px]">
            <TableHeader>
              <TableRow className="border-b border-[#ececf0] bg-[#f9f9fb] hover:bg-[#f9f9fb]">
                <TableHead className="w-10">
                  <Checkbox checked={allReadySelected} onCheckedChange={toggleSelectAll} aria-label="Selecionar todas" />
                </TableHead>
                <TableHead className="font-semibold text-[#1A1A1A]">Empresa</TableHead>
                <TableHead className="font-semibold text-[#1A1A1A]">Categoria</TableHead>
                <TableHead className="text-center font-semibold text-[#1A1A1A]">Score</TableHead>
                <TableHead className="text-center font-semibold text-[#1A1A1A]">Status</TableHead>
                <TableHead className="text-center font-semibold text-[#1A1A1A]">Resposta</TableHead>
                <TableHead className="text-right font-semibold text-[#1A1A1A]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presentations.map((p) => (
                <TableRow
                  key={p.id}
                  className={cn(
                    'border-b border-[#f0f0f3] transition-colors hover:bg-[#fafafd]',
                    selectedIds.has(p.id) ? 'bg-[#fff7f8]' : ''
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(p.id)}
                      onCheckedChange={() => toggleSelect(p.id)}
                      disabled={p.status !== 'ready'}
                      aria-label={`Selecionar ${p.business_name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-[#1A1A1A]">{p.business_name}</div>
                      <div className="text-xs text-[#6e6e76]">{p.business_address}</div>
                      <div className="mt-1 text-xs text-[#9a9aa1]">Criada em {formatDate(p.created_at)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-xs text-[#5f5f67]">
                      {p.business_category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-lg font-semibold text-[#EF3333]">{overallScore(p.analysis_data)}</span>
                  </TableCell>
                  <TableCell className="text-center">{statusBadge(p.status)}</TableCell>
                  <TableCell className="text-center">{responseBadge(p.lead_response)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === 'ready' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-[#707078] hover:bg-[#f5f5f7] hover:text-[#1A1A1A]"
                            title="Visualizar"
                            onClick={() => window.open(getPublicUrl(p.public_id), '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-[#707078] hover:bg-[#f5f5f7] hover:text-[#1A1A1A]"
                            title="Regenerar"
                            onClick={() => setRegenDialog({ open: true, presentation: p })}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-[#707078] hover:bg-[#fff1f3] hover:text-[#EF3333]"
                            title="Enviar"
                            onClick={() =>
                              setSendDialog({
                                open: true,
                                publicUrl: getPublicUrl(p.public_id),
                                name: p.business_name,
                                phone: p.business_phone || '',
                              })
                            }
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl text-[#8a8a92] hover:bg-[#fff1f3] hover:text-[#bc374e]"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {selectedIds.size > 0 && (
        <Card className="rounded-[20px] border border-[#f2d4d8] bg-[#fff5f6] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-[#8f2a3a]">
              <AlertTriangle className="h-4 w-4" />
              <span>{selectedIds.size} apresentacao(oes) pronta(s) selecionada(s) para campanha.</span>
            </div>
            <Button onClick={() => setCampaignDialog(true)} className="h-9 rounded-xl gap-2 gradient-primary text-primary-foreground">
              <Megaphone className="h-4 w-4" />
              Continuar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Presentations;
