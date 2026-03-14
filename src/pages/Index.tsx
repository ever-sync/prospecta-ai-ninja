import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Download,
  Filter,
  Radar,
  Search,
  SlidersHorizontal,
  Target,
  Telescope,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchFilters } from "@/components/SearchFilters";
import { ResultsTable } from "@/components/ResultsTable";
import { BusinessAnalysisPanel } from "@/components/BusinessAnalysisPanel";
import { AnalysisProgressModal, AnalysisItem } from "@/components/AnalysisProgressModal";
import { PipelineSelectDialog } from "@/components/PipelineSelectDialog";
import { SearchRefinementPanel } from "@/components/SearchRefinementPanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Business,
  DEFAULT_SEARCH_REFINEMENT_FILTERS,
  ScannerSessionState,
  SearchFilters as Filters,
  SearchRefinementFilters,
} from "@/types/business";
import { exportToCSV } from "@/utils/exportCSV";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { deriveLeadSignalSummary } from "@/lib/lead-scoring";
import { getEdgeFunctionErrorMessage, invokeEdgeFunction } from "@/lib/invoke-edge-function";
import { selectFirstRow } from "@/lib/supabase/select-first-row";

type ProposalResponseMode = "buttons" | "form";
type AnalysisProvider = "gemini" | "claude_code" | "groq" | "openai" | "other";

type ProposalFormTemplate = {
  id: string;
  name: string;
  body: string;
};

const contactFilterOptions = [
  { value: "all", label: "Todos" },
  { value: "any", label: "Com contato" },
  { value: "email", label: "Com email" },
  { value: "phone", label: "Com telefone" },
] as const;

const hasSocialPresence = (business: Business) =>
  Object.values(business.onlinePresence?.socialLinks || {}).some(Boolean);

const matchesSmartPreset = (business: Business, preset: SearchRefinementFilters["smartPreset"]) => {
  const signal = business.signalSummary ?? deriveLeadSignalSummary(business);
  const rating = business.rating ?? 0;
  const hasContactForm = business.onlinePresence?.hasContactForm ?? false;
  const hasMetaDescription = business.onlinePresence?.hasMetaDescription ?? false;
  const contentDepth = business.onlinePresence?.contentDepth ?? "low";

  switch (preset) {
    case "attack_now":
      return (signal.onlinePresenceTone === "critical" || !signal.hasWebsite) && (signal.hasPhone || signal.hasEmail);
    case "consultative":
      return signal.hasWebsite && signal.onlinePresenceScore <= 55;
    case "premium":
      return rating >= 4.3 && signal.onlinePresenceScore <= 55 && signal.contactCompleteness >= 2;
    case "authority_gap":
      return rating >= 4 && (!hasMetaDescription || contentDepth === "low" || !hasContactForm);
    default:
      return true;
  }
};

const sortBusinesses = (items: Business[], sortBy: SearchRefinementFilters["sortBy"]) => {
  return [...items].sort((a, b) => {
    const aSignal = a.signalSummary ?? deriveLeadSignalSummary(a);
    const bSignal = b.signalSummary ?? deriveLeadSignalSummary(b);

    switch (sortBy) {
      case "pain_desc":
        return aSignal.onlinePresenceScore - bSignal.onlinePresenceScore || bSignal.score - aSignal.score;
      case "rating_desc":
        return (b.rating ?? 0) - (a.rating ?? 0) || bSignal.score - aSignal.score;
      case "distance_asc":
        return a.distance - b.distance || bSignal.score - aSignal.score;
      case "contact_desc":
        return bSignal.contactCompleteness - aSignal.contactCompleteness || bSignal.score - aSignal.score;
      case "score_desc":
      default:
        return bSignal.score - aSignal.score;
    }
  });
};

const Index = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contactFilter, setContactFilter] = useState<"all" | "email" | "phone" | "any">("all");
  const [refinementFilters, setRefinementFilters] = useState<SearchRefinementFilters>(
    DEFAULT_SEARCH_REFINEMENT_FILTERS
  );
  const [analysisItems, setAnalysisItems] = useState<AnalysisItem[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const [showPipelineDialog, setShowPipelineDialog] = useState(false);
  const [showRefinementDialog, setShowRefinementDialog] = useState(false);
  const [analysisTargets, setAnalysisTargets] = useState<Business[] | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { canUse, getRemainingUsage } = useSubscription();
  const navigate = useNavigate();

  const handleSearch = async (filters: Filters) => {
    setIsLoading(true);
    setHasSearched(true);
    setSelectedBusiness(null);
    setSelectedIds(new Set());
    setRefinementFilters(DEFAULT_SEARCH_REFINEMENT_FILTERS);

    try {
      const { data, error } = await invokeEdgeFunction<{ businesses?: Business[]; error?: string }>("search-businesses", {
        body: {
          niches: filters.niches,
          location: filters.location,
          radius: filters.radius,
          advanced: filters.advanced,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const results = (data.businesses || []) as Business[];
      setBusinesses(results);
      toast({
        title: "Varredura concluida",
        description: `${results.length} empresa(s) encontrada(s) para leitura em ${filters.location}.`,
      });
    } catch (error) {
      console.error("Error searching businesses:", error);
      const message = await getEdgeFunctionErrorMessage(error);
      toast({
        title: "Erro na busca",
        description: message,
        variant: "destructive",
      });
      setBusinesses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (businesses.length === 0) return;
    exportToCSV(businesses);
    toast({ title: "Exportacao concluida", description: "O arquivo CSV foi baixado com sucesso." });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAnalyzeSelected = () => {
    if (!user) return;

    const selected = businesses.filter((item) => selectedIds.has(item.id));
    if (selected.length === 0) return;

    if (!canUse("presentations")) {
      toast({
        title: "Limite atingido",
        description: "Voce atingiu o limite de apresentacoes do seu plano. Faca upgrade em Configuracoes > Faturamento.",
        variant: "destructive",
      });
      return;
    }

    const remaining = getRemainingUsage("presentations");
    if (remaining !== null && remaining !== Infinity && selected.length > remaining) {
      toast({
        title: "Limite insuficiente",
        description: `Voce pode gerar mais ${remaining} apresentacao(oes). Selecione menos ou faca upgrade do plano.`,
        variant: "destructive",
      });
      return;
    }

    setAnalysisTargets(selected);
    setShowPipelineDialog(true);
  };

  const handleGenerateProposalForBusiness = (business: Business) => {
    if (!user) return;

    if (!canUse("presentations")) {
      toast({
        title: "Limite atingido",
        description: "Voce atingiu o limite de apresentacoes do seu plano. Faca upgrade em Configuracoes > Faturamento.",
        variant: "destructive",
      });
      return;
    }

    const remaining = getRemainingUsage("presentations");
    if (remaining !== null && remaining !== Infinity && remaining < 1) {
      toast({
        title: "Limite insuficiente",
        description: "Voce nao possui apresentacoes disponiveis no momento.",
        variant: "destructive",
      });
      return;
    }

    setAnalysisTargets([business]);
    setSelectedBusiness(null);
    setShowPipelineDialog(true);
  };

  const startAnalysis = async (
    pipelineStageId?: string,
    responseMode: ProposalResponseMode = "buttons",
    analysisProvider: AnalysisProvider = "gemini",
    formTemplate?: ProposalFormTemplate,
    explicitTargets?: Business[] | null,
  ) => {
    if (!user) return;
    const selected = explicitTargets ?? businesses.filter((item) => selectedIds.has(item.id));

    const items: AnalysisItem[] = selected.map((item) => ({
      id: item.id,
      name: item.name,
      status: "pending",
    }));

    setAnalysisItems(items);
    setShowProgress(true);

    const [{ data: dna }, { data: profile }, { data: testimonials }, { data: clientLogos }] =
      await Promise.all([
        selectFirstRow(supabase.from("company_dna").select("*").eq("user_id", user.id)),
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("testimonials").select("name, company, testimonial, image_url").eq("user_id", user.id),
        supabase.from("client_logos").select("company_name, logo_url").eq("user_id", user.id),
      ]);

    for (let i = 0; i < selected.length; i += 1) {
      const business = selected[i];

      setAnalysisItems((prev) =>
        prev.map((item) => (item.id === business.id ? { ...item, status: "analyzing" } : item))
      );

      try {
        const { data: analyzeResult, error: analyzeError } = await invokeEdgeFunction<{ analysis?: any; error?: string }>(
          "deep-analyze",
          {
            body: { business, dna, profile, provider: analysisProvider },
          }
        );

        if (analyzeError) throw analyzeError;
        if (analyzeResult.error) throw new Error(analyzeResult.error);

        const analysis = analyzeResult.analysis;

        setAnalysisItems((prev) =>
          prev.map((item) => (item.id === business.id ? { ...item, status: "generating" } : item))
        );

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
          status: "generating",
        };

        if (pipelineStageId) insertData.pipeline_stage_id = pipelineStageId;

        const { data: insertedRow, error: insertError } = await supabase
          .from("presentations")
          .insert(insertData as never)
          .select("id, public_id")
          .single();

        if (insertError || !insertedRow) throw new Error(insertError?.message || "Insert failed");

        const { data: genResult, error: genError } = await invokeEdgeFunction<{ html?: string; error?: string }>(
          "generate-presentation",
          {
            body: {
              analysis,
              business,
              dna,
              profile,
              testimonials,
              clientLogos,
              publicId: insertedRow.public_id,
              template: (dna as { presentation_template?: string } | null)?.presentation_template || "modern-dark",
              tone: (dna as { presentation_tone?: string } | null)?.presentation_tone || "professional",
              customInstructions:
                (dna as { presentation_instructions?: string } | null)?.presentation_instructions || "",
              provider: analysisProvider,
              responseMode,
              formTemplateId: responseMode === "form" ? formTemplate?.id || null : null,
              formTemplateName: responseMode === "form" ? formTemplate?.name || null : null,
              formTemplateBody: responseMode === "form" ? formTemplate?.body || null : null,
            },
          }
        );

        if (genError) throw genError;
        if (genResult.error) throw new Error(genResult.error);

        const { error: updateError } = await supabase
          .from("presentations")
          .update({ presentation_html: genResult.html, status: "ready" } as never)
          .eq("id", insertedRow.id);

        if (updateError) throw new Error(updateError.message);

        setAnalysisItems((prev) =>
          prev.map((item) => (item.id === business.id ? { ...item, status: "done" } : item))
        );
      } catch (err) {
        console.error(`Error analyzing ${business.name}:`, err);
        const errorMessage = await getEdgeFunctionErrorMessage(err);
        setAnalysisItems((prev) =>
          prev.map((item) =>
            item.id === business.id
              ? {
                  ...item,
                  status: "error",
                  error: errorMessage,
                }
              : item
          )
        );
      }
    }
  };

  const filteredBusinesses = useMemo(() => {
    const enriched = businesses.map((business) => {
      const signalSummary = deriveLeadSignalSummary(business);
      return {
        ...business,
        signalSummary,
        priorityLabel: signalSummary.priorityLabel,
        signalFlags: signalSummary.signalFlags,
        contactCompleteness: signalSummary.contactCompleteness,
      };
    });

    const visible = enriched.filter((business) => {
      const signal = business.signalSummary ?? deriveLeadSignalSummary(business);
      const hasContactForm = business.onlinePresence?.hasContactForm ?? false;
      const contentDepth = business.onlinePresence?.contentDepth ?? "low";
      const rating = business.rating ?? 0;
      const socialPresence = hasSocialPresence(business);

      if (contactFilter === "email" && !business.email) return false;
      if (contactFilter === "phone" && !business.phone) return false;
      if (contactFilter === "any" && !business.email && !business.phone) return false;

      if (refinementFilters.siteStatus === "with_site" && !signal.hasWebsite) return false;
      if (refinementFilters.siteStatus === "without_site" && signal.hasWebsite) return false;

      if (refinementFilters.presenceTone !== "all" && signal.onlinePresenceTone !== refinementFilters.presenceTone) {
        return false;
      }

      if (refinementFilters.contactQuality === "complete" && signal.contactCompleteness < 3) return false;
      if (refinementFilters.contactQuality === "partial" && signal.contactCompleteness !== 2) return false;
      if (refinementFilters.contactQuality === "weak" && signal.contactCompleteness > 1) return false;

      if (refinementFilters.contentDepth !== "all" && contentDepth !== refinementFilters.contentDepth) return false;

      if (refinementFilters.minRating === "4_plus" && rating < 4) return false;
      if (refinementFilters.minRating === "4_5_plus" && rating < 4.5) return false;

      if (refinementFilters.hasContactForm === "yes" && !hasContactForm) return false;
      if (refinementFilters.hasContactForm === "no" && hasContactForm) return false;

      if (refinementFilters.hasSocialLinks === "yes" && !socialPresence) return false;
      if (refinementFilters.hasSocialLinks === "no" && socialPresence) return false;

      if (!matchesSmartPreset(business, refinementFilters.smartPreset)) return false;

      return true;
    });

    return sortBusinesses(visible, refinementFilters.sortBy);
  }, [businesses, contactFilter, refinementFilters]);

  const updateRefinementFilters = (partial: Partial<SearchRefinementFilters>) => {
    setRefinementFilters((current) => ({ ...current, ...partial }));
  };

  const clearRefinements = () => {
    setRefinementFilters(DEFAULT_SEARCH_REFINEMENT_FILTERS);
  };

  const selectedBusinesses = useMemo(
    () => filteredBusinesses.filter((business) => selectedIds.has(business.id)),
    [filteredBusinesses, selectedIds]
  );
  const activeRefinementCount = useMemo(
    () =>
      Object.entries(refinementFilters).filter(
        ([key, value]) =>
          !((key === "sortBy" && value === "score_desc") || (key !== "sortBy" && value === "all")),
      ).length,
    [refinementFilters],
  );

  const topLead = filteredBusinesses[0] || null;
  const hotLeadCount = filteredBusinesses.filter((business) => business.signalSummary?.priorityTone === "high").length;
  const weakPresenceCount = filteredBusinesses.filter(
    (business) => business.signalSummary?.onlinePresenceTone === "critical"
  ).length;
  const focusedSignal = selectedBusiness ? deriveLeadSignalSummary(selectedBusiness) : topLead?.signalSummary;
  const sessionState: ScannerSessionState = {
    hasSearched,
    totalResults: businesses.length,
    filteredResults: filteredBusinesses.length,
    selectedCount: selectedIds.size,
    contactFilter,
  };

  const toggleAll = () => {
    if (selectedBusinesses.length === filteredBusinesses.length && filteredBusinesses.length > 0) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(filteredBusinesses.map((business) => business.id)));
  };

  return (
    <div className="space-y-4 p-2 pb-28 lg:space-y-5 lg:p-4 lg:pb-6">
      <AnalysisProgressModal
        open={showProgress}
        items={analysisItems}
        onClose={() => setShowProgress(false)}
        onFinish={() => {
          setShowProgress(false);
          navigate("/presentations");
        }}
      />

      <PipelineSelectDialog
        open={showPipelineDialog}
        onConfirm={(result) => {
          const targets = analysisTargets;
          setShowPipelineDialog(false);
          setAnalysisTargets(null);
          startAnalysis(
            result.attach ? result.stageId : undefined,
            result.responseMode,
            result.analysisProvider || "gemini",
            result.responseMode === "form" && result.formTemplateId
              ? {
                  id: result.formTemplateId,
                  name: result.formTemplateName || "Formulario",
                  body: result.formTemplateBody || "",
                }
              : undefined,
            targets,
          );
        }}
        onCancel={() => {
          setShowPipelineDialog(false);
          setAnalysisTargets(null);
        }}
      />

      <Dialog open={showRefinementDialog} onOpenChange={setShowRefinementDialog}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[28px] border-[#ececf0] bg-white p-0">
          <DialogHeader className="border-b border-[#ececf0] px-6 py-5">
            <DialogTitle>Refinar leads</DialogTitle>
            <DialogDescription>
              Aplique filtros de dor digital, contato e autoridade para limpar a lista de oportunidades.
            </DialogDescription>
          </DialogHeader>
          <div className="p-5">
            <SearchRefinementPanel
              hasSearched={hasSearched}
              filteredResults={filteredBusinesses.length}
              refinementFilters={refinementFilters}
              onRefinementChange={updateRefinementFilters}
              onClearRefinements={clearRefinements}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBusiness} onOpenChange={(open) => !open && setSelectedBusiness(null)}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedBusiness?.name || "Lead intelligence"}</DialogTitle>
            <DialogDescription>
              Leia o contexto completo do lead antes de enviar para analise e proposta.
            </DialogDescription>
          </DialogHeader>
          {selectedBusiness ? (
            <BusinessAnalysisPanel
              business={selectedBusiness}
              onClose={() => setSelectedBusiness(null)}
              onGenerateProposal={() => handleGenerateProposalForBusiness(selectedBusiness)}
              onPrevious={() => {
                const currentIndex = filteredBusinesses.findIndex((business) => business.id === selectedBusiness.id);
                if (currentIndex > 0) {
                  setSelectedBusiness(filteredBusinesses[currentIndex - 1]);
                }
              }}
              onNext={() => {
                const currentIndex = filteredBusinesses.findIndex((business) => business.id === selectedBusiness.id);
                if (currentIndex >= 0 && currentIndex < filteredBusinesses.length - 1) {
                  setSelectedBusiness(filteredBusinesses[currentIndex + 1]);
                }
              }}
              canGoPrevious={filteredBusinesses.findIndex((business) => business.id === selectedBusiness.id) > 0}
              canGoNext={
                (() => {
                  const currentIndex = filteredBusinesses.findIndex((business) => business.id === selectedBusiness.id);
                  return currentIndex >= 0 && currentIndex < filteredBusinesses.length - 1;
                })()
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <section className="overflow-hidden rounded-[32px] border border-[#1c1c22] bg-[#111115] text-white shadow-[0_24px_60px_rgba(12,12,18,0.22)]">
        <div className="relative overflow-hidden px-5 py-6 lg:px-8 lg:py-8">
          <div className="absolute inset-y-0 right-0 w-[320px] bg-[radial-gradient(circle_at_top_right,_rgba(239,51,51,0.22),_transparent_60%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#ffb6bf]">
                <Radar className="h-3.5 w-3.5" />
                Scanner consultivo
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight lg:text-5xl">
                Encontre sinais, leia contexto e ataque os leads certos.
              </h1>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Sinais fortes</p>
                <p className="mt-2 text-3xl font-semibold">{hotLeadCount}</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Lead em foco</p>
                <p className="mt-2 text-sm font-semibold text-white/90">
                  {selectedBusiness?.name || topLead?.name || "Aguardando varredura"}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Presenca critica</p>
                <p className="mt-2 text-sm font-semibold text-white/90">
                  {hasSearched ? `${weakPresenceCount} lead(s) com dor digital explicita` : "Aguardando varredura"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="sticky top-[94px] self-start space-y-5">
          <Card className="rounded-[28px] border border-[#ececf0] bg-white p-5 shadow-[0_14px_36px_rgba(20,20,24,0.06)] lg:p-6">
            <SearchFilters
              onSearch={handleSearch}
              isLoading={isLoading}
              hasSearched={hasSearched}
              totalResults={businesses.length}
            />
          </Card>
        </aside>

        <section className="space-y-5">
          <Card className="rounded-[28px] border border-[#ececf0] bg-white p-4 shadow-[0_12px_28px_rgba(20,20,24,0.05)] lg:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Target className="h-4 w-4 text-[#EF3333]" />
                  <h2 className="text-base font-semibold text-[#1A1A1A]">Resumo da sessao</h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="min-w-[160px] rounded-[20px] border border-[#ececf0] bg-[#fafafc] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Resultados</p>
                    <p className="mt-1 text-2xl font-semibold text-[#1A1A1A]">{sessionState.filteredResults}</p>
                  </div>

                  <div className="min-w-[160px] rounded-[20px] border border-[#ececf0] bg-[#fafafc] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Selecionados</p>
                    <p className="mt-1 text-2xl font-semibold text-[#1A1A1A]">{sessionState.selectedCount}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Button
                  onClick={() => setShowRefinementDialog(true)}
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl gap-2 border-[#e6e6eb] bg-white hover:bg-[#f8f8fa]"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtrar
                  {activeRefinementCount > 0 ? (
                    <span className="rounded-full bg-[#111115] px-2 py-0.5 text-[11px] font-semibold text-white">
                      {activeRefinementCount}
                    </span>
                  ) : null}
                </Button>

                <div className="flex items-center gap-1 rounded-xl border border-[#e7e7eb] bg-[#f9f9fa] p-1">
                  {contactFilterOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 rounded-lg px-2.5 text-xs",
                        contactFilter === option.value
                          ? "bg-white text-[#1A1A1A] shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
                          : "text-[#6f6f76] hover:bg-white"
                      )}
                      onClick={() => setContactFilter(option.value)}
                    >
                      {option.value === "all" ? <Filter className="mr-1 h-3 w-3" /> : null}
                      {option.label}
                    </Button>
                  ))}
                </div>

                {businesses.length > 0 ? (
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl gap-2 border-[#e6e6eb] bg-white hover:bg-[#f8f8fa]"
                  >
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          {!hasSearched ? (
            <Card className="rounded-[28px] border border-[#ececf0] bg-white p-10 shadow-[0_12px_28px_rgba(20,20,24,0.05)] lg:p-14">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1f3]">
                  <Telescope className="h-8 w-8 text-[#EF3333]" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-[#1A1A1A]">Comece pela leitura do mercado</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#66666d] lg:text-base">
                  Escolha nicho, localizacao e raio. A envPRO vai retornar os leads mais relevantes para voce
                  decidir quem merece analise consultiva completa.
                </p>
              </div>
            </Card>
          ) : isLoading ? (
            <Card className="rounded-[28px] border border-[#ececf0] bg-white p-10 shadow-[0_12px_28px_rgba(20,20,24,0.05)] lg:p-14">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#111115] text-[#EF3333]">
                  <Radar className="h-8 w-8 animate-pulse" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-[#1A1A1A]">Executando scanner consultivo</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#66666d] lg:text-base">
                  Consultando fontes, montando o recorte e devolvendo sinais que ajudam a decidir o proximo ataque.
                </p>
              </div>
            </Card>
          ) : filteredBusinesses.length === 0 ? (
            <Card className="rounded-[28px] border border-[#ececf0] bg-white p-10 shadow-[0_12px_28px_rgba(20,20,24,0.05)] lg:p-14">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f5f7]">
                  <WandSparkles className="h-8 w-8 text-[#7c7c83]" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-[#1A1A1A]">Nenhum lead com este recorte</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#66666d] lg:text-base">
                  Ajuste o filtro de contato ou rode uma nova varredura para aumentar a densidade do seu recorte.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="rounded-[24px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Radar quente</p>
                  <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">{hotLeadCount}</p>
                  <p className="mt-1 text-sm text-[#66666d]">Leads com janela clara para entrar na fila premium.</p>
                </Card>
                <Card className="rounded-[24px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Filtro ativo</p>
                  <p className="mt-2 text-3xl font-semibold capitalize text-[#1A1A1A]">{contactFilter}</p>
                  <p className="mt-1 text-sm text-[#66666d]">Vista atual de contatos para triagem.</p>
                </Card>
                <Card className="rounded-[24px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Melhor lead</p>
                  <p className="mt-2 line-clamp-1 text-lg font-semibold text-[#1A1A1A]">
                    {topLead?.name || "Nenhum"}
                  </p>
                  <p className="mt-1 text-sm text-[#66666d]">
                    {topLead?.signalSummary?.priorityLabel || "Sem prioridade calculada"}
                  </p>
                </Card>
              </div>

              <Card className="overflow-hidden rounded-[28px] border border-[#ececf0] bg-white p-4 shadow-[0_12px_28px_rgba(20,20,24,0.05)] lg:p-5">
                <ResultsTable
                  businesses={filteredBusinesses}
                  onSelectBusiness={setSelectedBusiness}
                  selectedIds={selectedIds}
                  onToggleSelected={toggleSelected}
                  onToggleAll={toggleAll}
                  activeBusinessId={selectedBusiness?.id}
                />
              </Card>
            </div>
          )}
        </section>
      </div>

      {selectedIds.size > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ececf0] bg-white/95 px-3 py-3 backdrop-blur sm:px-4 lg:bottom-4 lg:left-[max(1rem,calc((100vw-1600px)/2+1rem))] lg:right-4 lg:rounded-[24px] lg:border lg:shadow-[0_24px_50px_rgba(12,12,18,0.12)] xl:left-[calc((100vw-1600px)/2+392px)]">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1A1A1A]">
                {selectedIds.size} lead(s) pronto(s) para leitura profunda
              </p>
              <p className="text-sm text-[#66666d]">
                Proximo passo: gerar analise completa e transformar os sinais em propostas consultivas.
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
                className="rounded-xl border-[#e6e6eb] bg-white"
              >
                Limpar selecao
              </Button>
              <Button
                onClick={handleAnalyzeSelected}
                className="rounded-xl bg-[#111115] text-white hover:bg-[#1d1d24]"
              >
                <BarChart3 className="mr-2 h-4 w-4 text-[#EF3333]" />
                Analisar selecionadas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Index;
