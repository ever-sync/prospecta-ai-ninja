import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Sparkles, Building2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SearchFilters } from '@/components/SearchFilters';
import { ResultsTable } from '@/components/ResultsTable';
import { BusinessAnalysisPanel } from '@/components/BusinessAnalysisPanel';
import { AnalysisProgressModal, AnalysisItem } from '@/components/AnalysisProgressModal';
import { Business, SearchFilters as Filters } from '@/types/business';
import { exportToCSV } from '@/utils/exportCSV';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [analysisItems, setAnalysisItems] = useState<AnalysisItem[]>([]);
  const [showProgress, setShowProgress] = useState(false);
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
      toast({ title: 'Busca concluída', description: `${results.length} empresa(s) encontrada(s) em ${filters.location}` });
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
    toast({ title: 'Exportação concluída', description: 'O arquivo CSV foi baixado com sucesso.' });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
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
      setSelectedIds(new Set(businesses.map(b => b.id)));
    }
  };

  const handleAnalyzeSelected = async () => {
    if (!user) return;

    const selected = businesses.filter(b => selectedIds.has(b.id));
    if (selected.length === 0) return;

    if (!canUse('presentations')) {
      toast({
        title: 'Limite atingido',
        description: 'Você atingiu o limite de apresentações do seu plano. Faça upgrade em Configurações → Faturamento.',
        variant: 'destructive',
      });
      return;
    }

    const remaining = getRemainingUsage('presentations');
    if (remaining !== null && remaining !== Infinity && selected.length > remaining) {
      toast({
        title: 'Limite insuficiente',
        description: `Você pode gerar mais ${remaining} apresentação(ões). Selecione menos ou faça upgrade do plano.`,
        variant: 'destructive',
      });
      return;
    }

    const items: AnalysisItem[] = selected.map(b => ({
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

      setAnalysisItems(prev => prev.map(item =>
        item.id === business.id ? { ...item, status: 'analyzing' as const } : item
      ));

      try {
        const { data: analyzeResult, error: analyzeError } = await supabase.functions.invoke('deep-analyze', {
          body: { business, dna, profile },
        });

        if (analyzeError) throw new Error(analyzeError.message);
        if (analyzeResult.error) throw new Error(analyzeResult.error);

        const analysis = analyzeResult.analysis;

        setAnalysisItems(prev => prev.map(item =>
          item.id === business.id ? { ...item, status: 'generating' as const } : item
        ));

        const { data: insertedRow, error: insertError } = await supabase.from('presentations').insert({
          user_id: user.id,
          business_name: business.name,
          business_address: business.address,
          business_phone: business.phone,
          business_website: business.website,
          business_category: business.category,
          business_rating: business.rating,
          analysis_data: analysis,
          status: 'generating',
        }).select('id, public_id').single();

        if (insertError || !insertedRow) throw new Error(insertError?.message || 'Insert failed');

        const { data: genResult, error: genError } = await supabase.functions.invoke('generate-presentation', {
          body: {
            analysis, business, dna, profile, testimonials, clientLogos,
            publicId: insertedRow.public_id,
            template: (dna as any)?.presentation_template || 'modern-dark',
            tone: (dna as any)?.presentation_tone || 'professional',
            customInstructions: (dna as any)?.presentation_instructions || '',
          },
        });

        if (genError) throw new Error(genError.message);
        if (genResult.error) throw new Error(genResult.error);

        const { error: updateError } = await supabase.from('presentations')
          .update({ presentation_html: genResult.html, status: 'ready' })
          .eq('id', insertedRow.id);

        if (updateError) throw new Error(updateError.message);

        setAnalysisItems(prev => prev.map(item =>
          item.id === business.id ? { ...item, status: 'done' as const } : item
        ));
      } catch (err) {
        console.error(`Error analyzing ${business.name}:`, err);
        setAnalysisItems(prev => prev.map(item =>
          item.id === business.id ? { ...item, status: 'error' as const, error: err instanceof Error ? err.message : 'Erro' } : item
        ));
      }
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <AnalysisProgressModal
        open={showProgress}
        items={analysisItems}
        onClose={() => setShowProgress(false)}
        onFinish={() => { setShowProgress(false); navigate('/presentations'); }}
      />

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        <aside className="space-y-6">
          <Card className="p-6 sticky top-20">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Filtros de Busca
            </h2>
            <SearchFilters onSearch={handleSearch} isLoading={isLoading} />
          </Card>
        </aside>

        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Resultados</h2>
              {hasSearched && (
                <p className="text-sm text-muted-foreground">
                  {businesses.length} empresa(s) encontrada(s)
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedIds.size > 0 && (
                <Button
                  onClick={handleAnalyzeSelected}
                  size="sm"
                  className="gap-2 gradient-primary text-primary-foreground glow-primary"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Analisar Selecionadas</span>
                  <span className="sm:hidden">Analisar</span>
                  ({selectedIds.size})
                </Button>
              )}
              {businesses.length > 0 && (
                <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar CSV</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
              )}
            </div>
          </div>

          {selectedBusiness && (
            <BusinessAnalysisPanel business={selectedBusiness} onClose={() => setSelectedBusiness(null)} />
          )}

          {!hasSearched ? (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">Comece sua prospecção</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Selecione os filtros ao lado e clique em buscar para encontrar potenciais clientes.
                  </p>
                </div>
                <div className="pt-4 border-t border-border mt-6">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>IA disponível para sugestões de abordagem personalizadas</span>
                  </div>
                </div>
              </div>
            </Card>
          ) : isLoading ? (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground">Buscando empresas...</h3>
                  <p className="text-sm text-muted-foreground mt-1">Consultando bases de dados e APIs</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <ResultsTable
                businesses={businesses}
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
