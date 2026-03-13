import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Sparkles, Building2, BarChart3, Filter, Search, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SearchFilters } from '@/components/SearchFilters';
import { ResultsTable } from '@/components/ResultsTable';
import { BusinessAnalysisPanel } from '@/components/BusinessAnalysisPanel';
import { AnalysisProgressModal, AnalysisItem } from '@/components/AnalysisProgressModal';
import { PipelineSelectDialog } from '@/components/PipelineSelectDialog';
import { Business, SearchFilters as Filters } from '@/types/business';
import { exportToCSV } from '@/utils/exportCSV';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const Index = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contactFilter, setContactFilter] = useState<'all' | 'email' | 'phone' | 'any'>('all');
  const [analysisItems, setAnalysisItems] = useState<AnalysisItem[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const [showPipelineDialog, setShowPipelineDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { canUse, getRemainingUsage } = useSubscription();
  const navigate = useNavigate();

  const handleSearch = async (filters: Filters) => {
    setIsLoading(true);
    setHasSearched(true);
    setSelectedBusiness(null);
    setSelectedIds(new Set());

    try {
      const { data, error } = await supabase.functions.invoke('search-businesses', {
        body: { niches: filters.niches, location: filters.location, radius: filters.radius },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      const results = data.businesses || [];
      setBusinesses(results);
      toast({ title: 'Busca concluida', description: `${results.length} empresa(s) encontrada(s) em ${filters.location}` });
    } catch (error) {
      console.error('Error searching businesses:', error);
      toast({ title: 'Erro na busca', description: error instanceof Error ? error.message : 'Erro ao buscar empresas', variant: 'destructive' });
      setBusinesses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (businesses.length === 0) return;
    exportToCSV(businesses);
    toast({ title: 'Exportacao concluida', description: 'O arquivo CSV foi baixado com sucesso.' });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === businesses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(businesses.map((b) => b.id)));
    }
  };

  const handleAnalyzeSelected = () => {
    if (!user) return;

    const selected = businesses.filter((b) => selectedIds.has(b.id));
    if (selected.length === 0) return;

    if (!canUse('presentations')) {
      toast({
        title: 'Limite atingido',
        description: 'Voce atingiu o limite de apresentacoes do seu plano. Faca upgrade em Configuracoes > Faturamento.',
        variant: 'destructive',
      });
      return;
    }

    const remaining = getRemainingUsage('presentations');
    if (remaining !== null && remaining !== Infinity && selected.length > remaining) {
      toast({
        title: 'Limite insuficiente',
        description: `Voce pode gerar mais ${remaining} apresentacao(oes). Selecione menos ou faca upgrade do plano.`,
        variant: 'destructive',
      });
      return;
    }

    setShowPipelineDialog(true);
  };

  const startAnalysis = async (pipelineStageId?: string) => {
    if (!user) return;
    const selected = businesses.filter((b) => selectedIds.has(b.id));

    const items: AnalysisItem[] = selected.map((b) => ({
      id: b.id,
      name: b.name,
      status: 'pending' as const,
    }));
    setAnalysisItems(items);
    setShowProgress(true);

    const [{ data: dna }, { data: profile }, { data: testimonials }, { data: clientLogos }] = await Promise.all([
      supabase.from('company_dna').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('testimonials').select('name, company, testimonial, image_url').eq('user_id', user.id),
      supabase.from('client_logos').select('company_name, logo_url').eq('user_id', user.id),
    ]);

    for (let i = 0; i < selected.length; i++) {
      const business = selected[i];

      setAnalysisItems((prev) => prev.map((item) => (item.id === business.id ? { ...item, status: 'analyzing' as const } : item)));

      try {
        const { data: analyzeResult, error: analyzeError } = await supabase.functions.invoke('deep-analyze', {
          body: { business, dna, profile },
        });

        if (analyzeError) throw new Error(analyzeError.message);
        if (analyzeResult.error) throw new Error(analyzeResult.error);

        const analysis = analyzeResult.analysis;

        setAnalysisItems((prev) => prev.map((item) => (item.id === business.id ? { ...item, status: 'generating' as const } : item)));

        const insertData: Record<string, unknown> = {
          user_id: user.id,
          business_name: business.name,
          business_address: business.address,
          business_phone: business.phone,
          business_email: business.email || null,
          business_website: business.website,
          business_category: business.category,
          business_rating: business.rating,
          analysis_data: analysis,
          status: 'generating',
        };

        if (pipelineStageId) {
          insertData.pipeline_stage_id = pipelineStageId;
        }

        const { data: insertedRow, error: insertError } = await supabase
          .from('presentations')
          .insert(insertData as any)
          .select('id, public_id')
          .single();

        if (insertError || !insertedRow) throw new Error(insertError?.message || 'Insert failed');

        const { data: genResult, error: genError } = await supabase.functions.invoke('generate-presentation', {
          body: {
            analysis,
            business,
            dna,
            profile,
            testimonials,
            clientLogos,
            publicId: insertedRow.public_id,
            template: (dna as any)?.presentation_template || 'modern-dark',
            tone: (dna as any)?.presentation_tone || 'professional',
            customInstructions: (dna as any)?.presentation_instructions || '',
          },
        });

        if (genError) throw new Error(genError.message);
        if (genResult.error) throw new Error(genResult.error);

        const { error: updateError } = await supabase.from('presentations').update({ presentation_html: genResult.html, status: 'ready' }).eq('id', insertedRow.id);

        if (updateError) throw new Error(updateError.message);

        setAnalysisItems((prev) => prev.map((item) => (item.id === business.id ? { ...item, status: 'done' as const } : item)));
      } catch (err) {
        console.error(`Error analyzing ${business.name}:`, err);
        setAnalysisItems((prev) =>
          prev.map((item) =>
            item.id === business.id ? { ...item, status: 'error' as const, error: err instanceof Error ? err.message : 'Erro' } : item
          )
        );
      }
    }
  };

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      if (contactFilter === 'email') return !!b.email;
      if (contactFilter === 'phone') return !!b.phone;
      if (contactFilter === 'any') return !!b.email || !!b.phone;
      return true;
    });
  }, [businesses, contactFilter]);

  return (
    <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
      <AnalysisProgressModal
        open={showProgress}
        items={analysisItems}
        onClose={() => setShowProgress(false)}
        onFinish={() => {
          setShowProgress(false);
          navigate('/presentations');
        }}
      />

      <PipelineSelectDialog
        open={showPipelineDialog}
        onConfirm={(result) => {
          setShowPipelineDialog(false);
          startAnalysis(result.attach ? result.stageId : undefined);
        }}
        onCancel={() => setShowPipelineDialog(false)}
      />

      <section className="rounded-[28px] border border-[#ececf0] bg-white px-5 py-6 shadow-[0_14px_36px_rgba(20,20,24,0.06)] lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#75757d]">Prospeccao</p>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight text-[#1A1A1A] lg:text-4xl">
              <Search className="h-7 w-7 text-[#EF3333]" />
              Busca Inteligente
            </h1>
            <p className="mt-2 text-sm text-[#66666d] lg:text-base">Encontre empresas com fit e gere abordagens prontas com IA.</p>
          </div>
          <div className="rounded-2xl border border-[#f2d4d8] bg-[#fff5f6] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b94456]">Status da Sessao</p>
            <p className="mt-1 text-sm font-semibold text-[#7f2432]">{hasSearched ? `${businesses.length} resultado(s)` : 'Aguardando busca'}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <Card className="sticky top-20 rounded-[24px] border border-[#ececf0] bg-white p-6 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-[#1A1A1A]">
              <Building2 className="h-5 w-5 text-[#EF3333]" />
              Filtros de Busca
            </h2>
            <SearchFilters onSearch={handleSearch} isLoading={isLoading} />
          </Card>
        </aside>

        <section className="space-y-5">
          <Card className="rounded-[24px] border border-[#ececf0] bg-white p-4 shadow-[0_10px_24px_rgba(18,18,22,0.05)] lg:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1A1A1A]">Resultados</h2>
                {hasSearched && <p className="text-sm text-[#6e6e76]">{filteredBusinesses.length} empresa(s) na visualizacao atual</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hasSearched && businesses.length > 0 && (
                  <div className="flex items-center gap-1 rounded-xl border border-[#e7e7eb] bg-[#f9f9fa] p-1">
                    {([
                      { value: 'all', label: 'Todos' },
                      { value: 'any', label: 'Com contato' },
                      { value: 'email', label: 'Com email' },
                      { value: 'phone', label: 'Com telefone' },
                    ] as const).map((opt) => (
                      <Button
                        key={opt.value}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-8 rounded-lg px-2.5 text-xs',
                          contactFilter === opt.value
                            ? 'bg-white text-[#1A1A1A] shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]'
                            : 'text-[#6f6f76] hover:bg-white'
                        )}
                        onClick={() => setContactFilter(opt.value)}
                      >
                        {opt.value === 'all' && <Filter className="mr-1 h-3 w-3" />}
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                )}

                {selectedIds.size > 0 && (
                  <Button onClick={handleAnalyzeSelected} size="sm" className="h-9 rounded-xl gap-2 gradient-primary text-primary-foreground glow-primary">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Analisar Selecionadas</span>
                    <span className="sm:hidden">Analisar</span>
                    ({selectedIds.size})
                  </Button>
                )}

                {businesses.length > 0 && (
                  <Button onClick={handleExport} variant="outline" size="sm" className="h-9 rounded-xl gap-2 border-[#e6e6eb] bg-white hover:bg-[#f8f8fa]">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Exportar CSV</span>
                    <span className="sm:hidden">CSV</span>
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {selectedBusiness && <BusinessAnalysisPanel business={selectedBusiness} onClose={() => setSelectedBusiness(null)} />}

          {!hasSearched ? (
            <Card className="rounded-[24px] border border-[#ececf0] bg-white p-12 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1f3]">
                  <Building2 className="h-8 w-8 text-[#EF3333]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#1A1A1A]">Comece sua prospeccao</h3>
                  <p className="mt-1 text-sm text-[#6e6e76]">Selecione os filtros ao lado e clique em buscar para encontrar potenciais clientes.</p>
                </div>
                <div className="mt-6 border-t border-[#ececf0] pt-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-[#6e6e76]">
                    <Sparkles className="h-4 w-4 text-[#EF3333]" />
                    <span>IA disponivel para sugestoes de abordagem personalizadas</span>
                  </div>
                </div>
              </div>
            </Card>
          ) : isLoading ? (
            <Card className="rounded-[24px] border border-[#ececf0] bg-white p-12 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1f3]">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#ef3333]/25 border-t-[#ef3333]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#1A1A1A]">Buscando empresas...</h3>
                  <p className="mt-1 text-sm text-[#6e6e76]">Consultando bases de dados e APIs</p>
                </div>
              </div>
            </Card>
          ) : filteredBusinesses.length === 0 ? (
            <Card className="rounded-[24px] border border-[#ececf0] bg-white p-12 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f5f7]">
                  <WandSparkles className="h-8 w-8 text-[#7c7c83]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#1A1A1A]">Nenhum resultado com este filtro</h3>
                  <p className="mt-1 text-sm text-[#6e6e76]">Troque o filtro de contato para visualizar mais empresas encontradas.</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden rounded-[24px] border border-[#ececf0] bg-white shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
              <ResultsTable
                businesses={filteredBusinesses}
                onSelectBusiness={setSelectedBusiness}
                selectedIds={selectedIds}
                onToggleSelected={toggleSelected}
                onToggleAll={toggleAll}
              />
            </Card>
          )}
        </section>
      </div>
    </div>
  );
};

export default Index;
