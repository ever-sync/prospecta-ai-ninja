import { useEffect, useState } from 'react';
import { Presentation, Eye, Send, Trash2, Loader2, RefreshCw, Megaphone } from 'lucide-react';
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

const Presentations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [presentations, setPresentations] = useState<PresentationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [sendDialog, setSendDialog] = useState<{ open: boolean; publicUrl: string; name: string; phone: string }>({
    open: false, publicUrl: '', name: '', phone: '',
  });
  const [regenDialog, setRegenDialog] = useState<{ open: boolean; presentation: PresentationRow | null }>({
    open: false, presentation: null,
  });

  const fetchPresentations = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('presentations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Falha ao carregar apresentações', variant: 'destructive' });
    } else {
      setPresentations((data as any) || []);
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
      setPresentations(prev => prev.filter(p => p.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast({ title: 'Excluída', description: 'Apresentação removida' });
    }
  };

  const getPublicUrl = (publicId: string) =>
    `${window.location.origin}/presentation/${publicId}`;

  const handleRegenerate = async (template: string, tone: string, customInstructions: string) => {
    const p = regenDialog.presentation;
    if (!p || !user) return;

    await supabase.from('presentations').update({ status: 'analyzing' } as any).eq('id', p.id);
    setPresentations(prev => prev.map(x => x.id === p.id ? { ...x, status: 'analyzing' } : x));

    try {
      const [dnaRes, profileRes, testimonialsRes, clientLogosRes] = await Promise.all([
        supabase.from('company_dna').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('testimonials').select('name, company, testimonial, image_url').eq('user_id', user.id),
        supabase.from('client_logos').select('company_name, logo_url').eq('user_id', user.id),
      ]);

      const { data: genData, error: genError } = await supabase.functions.invoke('generate-presentation', {
        body: {
          analysis: p.analysis_data,
          business: {
            name: p.business_name, address: p.business_address, phone: p.business_phone,
            website: p.business_website, category: p.business_category, rating: p.business_rating,
          },
          dna: dnaRes.data, profile: profileRes.data, testimonials: testimonialsRes.data,
          clientLogos: clientLogosRes.data, template, tone, customInstructions, publicId: p.public_id,
        },
      });

      if (genError) throw genError;

      await supabase.from('presentations')
        .update({ presentation_html: genData.html, status: 'ready' } as any)
        .eq('id', p.id);

      setPresentations(prev => prev.map(x => x.id === p.id ? { ...x, status: 'ready' } : x));
      toast({ title: 'Regenerada!', description: 'Apresentação atualizada com sucesso' });
    } catch (err) {
      console.error(err);
      await supabase.from('presentations').update({ status: 'error' } as any).eq('id', p.id);
      setPresentations(prev => prev.map(x => x.id === p.id ? { ...x, status: 'error' } : x));
      toast({ title: 'Erro', description: 'Falha ao regenerar apresentação', variant: 'destructive' });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const readyPresentations = presentations.filter(p => p.status === 'ready');
  const allReadySelected = readyPresentations.length > 0 && readyPresentations.every(p => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allReadySelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(readyPresentations.map(p => p.id)));
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'ready': return <Badge className="bg-primary/10 text-primary border-primary/20">Pronta</Badge>;
      case 'analyzing': return <Badge variant="secondary">Analisando</Badge>;
      case 'error': return <Badge variant="destructive">Erro</Badge>;
      default: return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const responseBadge = (response: string) => {
    switch (response) {
      case 'accepted': return <Badge className="bg-primary/10 text-primary border-primary/20">Aceita</Badge>;
      case 'rejected': return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Recusada</Badge>;
      default: return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">Aguardando</Badge>;
    }
  };

  const overallScore = (data: any) => data?.scores?.overall ?? '—';

  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Presentation className="w-6 h-6 text-primary" />
          <span className="truncate">Apresentações ({presentations.length})</span>
        </h1>

        {selectedIds.size > 0 && (
          <Button onClick={() => setCampaignDialog(true)} className="gap-2 shrink-0 w-full sm:w-auto">
            <Megaphone className="w-4 h-4" />
            Enviar para Campanha ({selectedIds.size})
          </Button>
        )}
      </div>

      <SendPresentationDialog
        open={sendDialog.open}
        onOpenChange={(open) => setSendDialog(prev => ({ ...prev, open }))}
        publicUrl={sendDialog.publicUrl}
        businessName={sendDialog.name}
        businessPhone={sendDialog.phone}
      />

      <RegeneratePresentationDialog
        open={regenDialog.open}
        onOpenChange={(open) => setRegenDialog(prev => ({ ...prev, open }))}
        onRegenerate={handleRegenerate}
        businessName={regenDialog.presentation?.business_name || ''}
      />

      <AddToCampaignDialog
        open={campaignDialog}
        onOpenChange={setCampaignDialog}
        presentationIds={Array.from(selectedIds)}
        onSuccess={() => setSelectedIds(new Set())}
      />

      {presentations.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center">
              <Presentation className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">Nenhuma apresentação ainda</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione empresas na aba Busca e clique em "Analisar Selecionadas" para gerar apresentações.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[750px]">
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="w-10">
                  <Checkbox checked={allReadySelected} onCheckedChange={toggleSelectAll} aria-label="Selecionar todas" />
                </TableHead>
                <TableHead className="text-foreground font-semibold">Empresa</TableHead>
                <TableHead className="text-foreground font-semibold">Categoria</TableHead>
                <TableHead className="text-foreground font-semibold text-center">Score</TableHead>
                <TableHead className="text-foreground font-semibold text-center">Status</TableHead>
                <TableHead className="text-foreground font-semibold text-center">Resposta</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presentations.map(p => (
                <TableRow key={p.id} className={`hover:bg-accent/50 ${selectedIds.has(p.id) ? 'bg-primary/5' : ''}`}>
                  <TableCell>
                    <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} disabled={p.status !== 'ready'} aria-label={`Selecionar ${p.business_name}`} />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{p.business_name}</div>
                      <div className="text-xs text-muted-foreground">{p.business_address}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{p.business_category}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-lg font-bold text-primary">{overallScore(p.analysis_data)}</span>
                  </TableCell>
                  <TableCell className="text-center">{statusBadge(p.status)}</TableCell>
                  <TableCell className="text-center">{responseBadge(p.lead_response)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === 'ready' && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Visualizar" onClick={() => window.open(getPublicUrl(p.public_id), '_blank')}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Regenerar" onClick={() => setRegenDialog({ open: true, presentation: p })}>
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Enviar" onClick={() => setSendDialog({
                            open: true, publicUrl: getPublicUrl(p.public_id), name: p.business_name, phone: p.business_phone || '',
                          })}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default Presentations;
