import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Cpu,
  Globe,
  Loader2,
  MapPin,
  Megaphone,
  Phone,
  RefreshCw,
  Sparkles,
  Swords,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Business } from "@/types/business";
import { useToast } from "@/hooks/use-toast";
import { ApproachSuggestion } from "@/components/ApproachSuggestion";
import { deriveLeadSignalSummary } from "@/lib/lead-scoring";
import { getEdgeFunctionErrorMessage, invokeEdgeFunction } from "@/lib/invoke-edge-function";
import { supabase } from "@/integrations/supabase/client";

type ApiProvider = 'gemini' | 'claude_code' | 'groq' | 'openai' | 'other';
const PROVIDER_LABELS: Record<ApiProvider, string> = {
  gemini: 'Gemini',
  claude_code: 'Claude (Anthropic)',
  groq: 'Groq',
  openai: 'OpenAI',
  other: 'Outro',
};

interface BusinessAnalysisPanelProps {
  business: Business;
  onClose: () => void;
  onGenerateProposal: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

interface CompetitorData {
  competitors: { name: string; strength: string; weakness: string }[];
  differentials: string[];
  opportunities: string[];
  summary: string;
}

interface ScoreData {
  totalScore: number;
  breakdown: Record<string, { score: number; max: number; reason: string }>;
  recommendation: string;
  priority: string;
}

interface ProfileData {
  overview: string;
  targetAudience: string;
  estimatedSize: string;
  strengths: string[];
  challenges: string[];
  bestApproachTime: string;
  decisionMaker: string;
  insights: string;
}

interface HeavyAnalysisData {
  scores: {
    seo?: number;
    speed?: number;
    layout?: number;
    security?: number;
    overall?: number;
  };
  seo_details?: {
    has_title?: boolean;
    has_meta_description?: boolean;
    has_h1?: boolean;
    has_sitemap?: boolean;
    issues?: string[];
  };
  security_details?: {
    has_https?: boolean;
    has_ssl?: boolean;
    issues?: string[];
  };
  google_presence?: {
    rating?: number;
    estimated_position?: string;
    strengths?: string[];
    weaknesses?: string[];
  };
  recommendations?: { title: string; description: string; priority: string; category: string }[];
  summary?: string;
  scraped?: boolean;
  has_website?: boolean;
  website_screenshot?: string | null;
  google_maps_screenshot?: string | null;
  marketing_signals?: {
    has_facebook_pixel?: boolean;
    has_google_ads?: boolean;
    has_linkedin_insight?: boolean;
    detected_tags?: string[];
  };
}

type AnalysisCache = {
  competitors?: CompetitorData;
  score?: ScoreData;
  profile?: ProfileData;
  heavy?: HeavyAnalysisData;
};

const priorityToneClass = {
  high: "border-[#f4c6cd] bg-[#fff3f5] text-[#9f2336]",
  medium: "border-[#eadcb8] bg-[#fffaf0] text-[#946d1d]",
  low: "border-[#e4e4e9] bg-[#f7f7fa] text-[#666670]",
};

const onlinePresenceToneClass = {
  critical: "border-[#f4c6cd] bg-[#fff3f5] text-[#9f2336]",
  warning: "border-[#eadcb8] bg-[#fffaf0] text-[#946d1d]",
  healthy: "border-[#d8e8de] bg-[#f3fbf5] text-[#21603a]",
};

const buildScreenshotSrc = (value?: string | null) => {
  if (!value) return null;
  return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
};

export const BusinessAnalysisPanel = ({
  business,
  onClose,
  onGenerateProposal,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}: BusinessAnalysisPanelProps) => {
  const [cache, setCache] = useState<AnalysisCache>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<{ id: string; provider: ApiProvider; custom_provider: string | null }[]>([]);
  const [analysisProvider, setAnalysisProvider] = useState('');
  const activeBusinessIdRef = useRef(business.id);
  const { toast } = useToast();

  const signal = useMemo(() => deriveLeadSignalSummary(business), [business]);

  useEffect(() => {
    const loadKeys = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_ai_api_keys')
        .select('id, provider, custom_provider')
        .eq('user_id', user.id)
        .order('created_at');
      if (data && data.length > 0) {
        setApiKeys(data as any);
        setAnalysisProvider((prev) => prev || (data as any)[0].provider);
      }
    };
    loadKeys();
  }, []);

  useEffect(() => {
    activeBusinessIdRef.current = business.id;
    setCache({});
    setLoading({});
  }, [business.id]);

  const fetchAnalysis = useCallback(async (mode: "competitors" | "score" | "profile") => {
    if (cache[mode] && !loading[mode]) return;
    setLoading((prev) => ({ ...prev, [mode]: true }));
    const requestedBusinessId = business.id;

    try {
      const { data, error } = await invokeEdgeFunction<{ result?: any; error?: string }>("analyze-business", {
        body: { business, mode, provider: analysisProvider || undefined },
      });

      if (error) throw error;
      if (!data) throw new Error("Nenhum dado retornado da função.");
      if (data.error) throw new Error(data.error);
      if (activeBusinessIdRef.current !== requestedBusinessId) return;

      if (data.result) {
        setCache((prev) => ({ ...prev, [mode]: data.result }));
      } else {
        throw new Error(`Resultado para ${mode} não encontrado na resposta.`);
      }
    } catch (error) {
      console.error(`Error fetching ${mode}:`, error);
      const message = await getEdgeFunctionErrorMessage(error);
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      if (activeBusinessIdRef.current === requestedBusinessId) {
        setLoading((prev) => ({ ...prev, [mode]: false }));
      }
    }
  }, [business, cache, loading, analysisProvider, toast]);

  const fetchHeavyAnalysis = useCallback(async (force = false) => {
    if (cache.heavy && !force) return;
    setLoading((prev) => ({ ...prev, heavy: true }));
    const requestedBusinessId = business.id;

    try {
      const { data, error } = await invokeEdgeFunction<{ analysis?: HeavyAnalysisData; error?: string }>(
        "deep-analyze",
        {
          body: { business, provider: analysisProvider || undefined },
        },
      );

      if (error) throw error;
      if (!data) throw new Error("Nenhum dado retornado da função profunda.");
      if (data.error) throw new Error(data.error);
      if (!data.analysis) throw new Error("Analise pesada nao retornou dados.");
      if (activeBusinessIdRef.current !== requestedBusinessId) return;

      setCache((prev) => ({ ...prev, heavy: data.analysis }));
    } catch (error) {
      console.error("Error fetching heavy analysis:", error);
      if (activeBusinessIdRef.current !== requestedBusinessId) return;

      toast({
        title: "Erro",
        description: await getEdgeFunctionErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      if (activeBusinessIdRef.current === requestedBusinessId) {
        setLoading((prev) => ({ ...prev, heavy: false }));
      }
    }
  }, [business, cache.heavy, analysisProvider, toast]);

  const refresh = (mode: "competitors" | "score" | "profile") => {
    setCache((prev) => {
      const next = { ...prev };
      delete next[mode];
      return next;
    });
    fetchAnalysis(mode);
  };

  const refreshHeavy = () => {
    setCache((prev) => ({ ...prev, heavy: undefined }));
    fetchHeavyAnalysis(true);
  };

  useEffect(() => {
    fetchHeavyAnalysis();
  }, [business.id]);

  const LoadingState = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-[#ececf0] bg-[#fafafc] px-6 py-12">
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#EF3333]" />
      <p className="text-sm text-[#66666d]">{label}</p>
    </div>
  );

  return (
    <Card className="rounded-[28px] border border-[#ececf0] bg-white p-5 shadow-[0_18px_40px_rgba(16,16,20,0.08)] lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b8b92]">
            Lead Intelligence
          </p>
          <h3 className="mt-2 truncate text-2xl font-semibold text-[#1A1A1A]">{business.name}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className={`rounded-full border ${priorityToneClass[signal.priorityTone]}`}>
              {signal.priorityLabel}
            </Badge>
            <Badge className={`rounded-full border ${onlinePresenceToneClass[signal.onlinePresenceTone]}`}>
              {signal.onlinePresenceLabel}
            </Badge>
            <Badge variant="outline" className="rounded-full border-[#ececf0] bg-white text-[#5f5f67]">
              Score heuristico {signal.score}
            </Badge>
            <Badge variant="outline" className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-[#5f5f67]">
              {signal.reputationLabel}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={!canGoPrevious}
              className="rounded-xl border-[#e6e6eb] bg-white"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Lead anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={!canGoNext}
              className="rounded-xl border-[#e6e6eb] bg-white"
            >
              Proximo lead
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={onGenerateProposal}
            className="rounded-xl bg-[#111115] text-white hover:bg-[#1d1d24]"
          >
            <Sparkles className="mr-2 h-4 w-4 text-[#EF3333]" />
            Gerar proposta para este lead
          </Button>

          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-xl text-[#5b5b62]">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {apiKeys.length > 1 && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#ececf0] bg-[#fafafc] px-4 py-2.5">
          <Cpu className="h-4 w-4 shrink-0 text-[#8b8b92]" />
          <span className="text-xs font-medium text-[#6d6d75] shrink-0">Motor de IA:</span>
          <Select value={analysisProvider} onValueChange={setAnalysisProvider}>
            <SelectTrigger className="h-7 rounded-lg border-[#e6e6eb] bg-white text-xs px-2 py-0 w-44">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {apiKeys.map((item) => {
                const label = item.provider === 'other' && item.custom_provider
                  ? item.custom_provider
                  : PROVIDER_LABELS[item.provider];
                return (
                  <SelectItem key={item.id} value={item.provider} className="text-xs">
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[22px] border border-[#ececf0] bg-[#fafafc] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
            <MapPin className="h-4 w-4 text-[#EF3333]" />
            Contexto geografico
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#66666d]">{business.address || "Endereco nao encontrado"}</p>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-[#8d8d95]">
            {signal.proximityLabel}
          </p>
        </div>

        <div className="rounded-[22px] border border-[#ececf0] bg-[#fafafc] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
            <Building2 className="h-4 w-4 text-[#EF3333]" />
            Janela de acao
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#66666d]">
            {signal.priorityTone === "high"
              ? "Lead com sinais suficientes para analise completa e proposta consultiva."
              : signal.priorityTone === "medium"
                ? "Vale ler melhor o contexto antes de disparar a proposta."
                : "Exige reforco de contexto ou contato antes de entrar na fila principal."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {signal.signalFlags.map((flag) => (
              <span
                key={flag}
                className="rounded-full border border-[#e8e8ec] bg-white px-2.5 py-1 text-[11px] font-medium text-[#6d6d75]"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="summary"
        className="mt-6"
        onValueChange={(value) => {
          if (value === "heavy" && !cache.heavy) fetchHeavyAnalysis();
          if (value === "competitors" && !cache.competitors) fetchAnalysis("competitors");
          if (value === "score" && !cache.score) fetchAnalysis("score");
          if (value === "profile" && !cache.profile) fetchAnalysis("profile");
        }}
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-[22px] border border-[#ececf0] bg-[#f5f5f7] p-2 sm:grid-cols-6">
          <TabsTrigger value="summary" className="rounded-2xl text-xs font-semibold data-[state=active]:bg-white">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="heavy" className="rounded-2xl text-xs font-semibold data-[state=active]:bg-white">
            Auditoria
          </TabsTrigger>
          <TabsTrigger value="approach" className="rounded-2xl text-xs font-semibold data-[state=active]:bg-white">
            Abordagem
          </TabsTrigger>
          <TabsTrigger value="competitors" className="rounded-2xl text-xs font-semibold data-[state=active]:bg-white">
            Concorrencia
          </TabsTrigger>
          <TabsTrigger value="score" className="rounded-2xl text-xs font-semibold data-[state=active]:bg-white">
            Score
          </TabsTrigger>
          <TabsTrigger value="profile" className="rounded-2xl text-xs font-semibold data-[state=active]:bg-white">
            Perfil
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-[#ececf0] bg-white p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Contato</p>
              <p className="mt-2 text-2xl font-semibold text-[#1A1A1A]">{signal.contactCompleteness}/3</p>
              <p className="mt-1 text-sm text-[#66666d]">Canais diretos disponiveis</p>
            </div>
            <div className="rounded-[22px] border border-[#ececf0] bg-white p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Reputacao</p>
              <p className="mt-2 text-2xl font-semibold text-[#1A1A1A]">{business.rating ?? "-"}</p>
              <p className="mt-1 text-sm text-[#66666d]">{signal.reputationLabel}</p>
            </div>
            <div className="rounded-[22px] border border-[#ececf0] bg-white p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Distancia</p>
              <p className="mt-2 text-2xl font-semibold text-[#1A1A1A]">{business.distance} km</p>
              <p className="mt-1 text-sm text-[#66666d]">{signal.proximityLabel}</p>
            </div>
            <div className="rounded-[22px] border border-[#ececf0] bg-white p-4 sm:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Presenca online</p>
                  <p className="mt-2 text-2xl font-semibold text-[#1A1A1A]">{signal.onlinePresenceScore}/100</p>
                </div>
                <Badge className={`rounded-full border ${onlinePresenceToneClass[signal.onlinePresenceTone]}`}>
                  {signal.onlinePresenceLabel}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#66666d]">{signal.opportunityNarrative}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {signal.onlinePresenceWeaknesses.slice(0, 3).map((weakness) => (
                  <span
                    key={weakness}
                    className="rounded-full border border-[#f1d4d8] bg-[#fff6f7] px-2.5 py-1 text-[11px] font-medium text-[#8c2b38]"
                  >
                    {weakness}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#1d1d22] bg-[#111115] p-5 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#EF3333]" />
              <p className="text-sm font-semibold">Leitura executiva</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              {business.name} entra como{" "}
              <span className="font-semibold text-white">{signal.priorityLabel.toLowerCase()}</span>. O melhor proximo
              passo e validar a narrativa consultiva com base em contato disponivel, presenca web e sinais de reputacao
              local antes de gerar a proposta completa.
            </p>

            <div className="mt-4 rounded-2xl border border-[#EF3333]/20 bg-[#EF3333]/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#ffb6bf]">Onde esta a dor</p>
              <p className="mt-2 text-sm leading-relaxed text-white/85">{signal.opportunityNarrative}</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Contato principal</p>
                <div className="mt-3 space-y-2 text-sm text-white/85">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#ff9aa8]" />
                    <span>{business.phone || "Telefone nao encontrado"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#ff9aa8]" />
                    <span className="truncate">{business.website || "Site proprio nao encontrado"}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Leitura de risco</p>
                <div className="mt-3 space-y-2 text-sm text-white/85">
                  <p>{signal.hasWebsite ? "Tem base para auditoria de site." : "Sem site proprio; foco maior em reputacao e contato."}</p>
                  <p>{signal.hasPhone || signal.hasEmail ? "Existe canal para abordagem direta." : "Exige enriquecimento manual antes do disparo."}</p>
                  <p>{signal.onlinePresenceWeaknesses[0] || "Sem fraqueza prioritaria identificada."}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="heavy" className="mt-5">
          {loading.heavy ? (
            <LoadingState label="Rodando auditoria pesada do site, SEO, seguranca e capturas visuais..." />
          ) : cache.heavy ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold text-[#1A1A1A]">Auditoria pesada</h4>
                  <p className="text-sm text-[#66666d]">
                    Leitura tecnica aprofundada do site e da presenca digital do lead.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={refreshHeavy} className="rounded-xl">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Atualizar
                </Button>
              </div>

              <div className="rounded-[24px] border border-[#1d1d22] bg-[#111115] p-6 text-white">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Diagnostico principal</p>
                    <p className="mt-2 text-5xl font-semibold">{cache.heavy.scores?.overall ?? "-"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "SEO", value: cache.heavy.scores?.seo },
                      { label: "Velocidade", value: cache.heavy.scores?.speed },
                      { label: "Layout", value: cache.heavy.scores?.layout },
                      { label: "Seguranca", value: cache.heavy.scores?.security },
                    ].map((item) => (
                      <Badge
                        key={item.label}
                        variant="outline"
                        className="rounded-full border-white/15 bg-white/5 text-white/85"
                      >
                        {item.label} {item.value ?? "-"}
                      </Badge>
                    ))}
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-white/78">
                  {cache.heavy.summary || "A auditoria pesada foi concluida, mas nao retornou um resumo executivo."}
                </p>
              </div>

              {(buildScreenshotSrc(cache.heavy.website_screenshot) || buildScreenshotSrc(cache.heavy.google_maps_screenshot)) ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {buildScreenshotSrc(cache.heavy.website_screenshot) ? (
                    <div className="rounded-[24px] border border-[#ececf0] bg-white p-4">
                      <p className="text-sm font-semibold text-[#1A1A1A]">Screenshot do site</p>
                      <img
                        src={buildScreenshotSrc(cache.heavy.website_screenshot) || undefined}
                        alt={`Screenshot do site de ${business.name}`}
                        className="mt-3 w-full rounded-[20px] border border-[#ececf0] object-cover shadow-[0_12px_30px_rgba(20,20,24,0.08)]"
                      />
                    </div>
                  ) : null}

                  {buildScreenshotSrc(cache.heavy.google_maps_screenshot) ? (
                    <div className="rounded-[24px] border border-[#ececf0] bg-white p-4">
                      <p className="text-sm font-semibold text-[#1A1A1A]">Screenshot do Google Maps</p>
                      <img
                        src={buildScreenshotSrc(cache.heavy.google_maps_screenshot) || undefined}
                        alt={`Google Maps de ${business.name}`}
                        className="mt-3 w-full rounded-[20px] border border-[#ececf0] object-cover shadow-[0_12px_30px_rgba(20,20,24,0.08)]"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] border border-[#ececf0] bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#EF3333]" />
                    <p className="text-sm font-semibold text-[#1A1A1A]">SEO e estrutura</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { label: "Title", ok: cache.heavy.seo_details?.has_title },
                      { label: "Meta description", ok: cache.heavy.seo_details?.has_meta_description },
                      { label: "H1", ok: cache.heavy.seo_details?.has_h1 },
                      { label: "Sitemap", ok: cache.heavy.seo_details?.has_sitemap },
                    ].map((item) => (
                      <Badge
                        key={item.label}
                        className={
                          item.ok
                            ? "rounded-full border border-[#cfe6d7] bg-[#f3fbf5] text-[#21603a]"
                            : "rounded-full border border-[#f4c6cd] bg-[#fff3f5] text-[#9f2336]"
                        }
                      >
                        {item.ok ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <AlertTriangle className="mr-1 h-3.5 w-3.5" />}
                        {item.label}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    {(cache.heavy.seo_details?.issues || []).length > 0 ? (
                      cache.heavy.seo_details?.issues?.map((issue) => (
                        <p key={issue} className="text-sm text-[#53535a]">
                          {issue}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-[#66666d]">Nenhum problema estrutural relevante retornado.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#ececf0] bg-white p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#EF3333]" />
                    <p className="text-sm font-semibold text-[#1A1A1A]">Seguranca e reputacao local</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { label: "HTTPS", ok: cache.heavy.security_details?.has_https },
                      { label: "SSL", ok: cache.heavy.security_details?.has_ssl },
                    ].map((item) => (
                      <Badge
                        key={item.label}
                        className={
                          item.ok
                            ? "rounded-full border border-[#cfe6d7] bg-[#f3fbf5] text-[#21603a]"
                            : "rounded-full border border-[#f4c6cd] bg-[#fff3f5] text-[#9f2336]"
                        }
                      >
                        {item.ok ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <AlertTriangle className="mr-1 h-3.5 w-3.5" />}
                        {item.label}
                      </Badge>
                    ))}
                    {typeof cache.heavy.google_presence?.rating === "number" ? (
                      <Badge variant="outline" className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-[#5f5f67]">
                        Rating {cache.heavy.google_presence.rating}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-4 space-y-2">
                    {(cache.heavy.security_details?.issues || []).length > 0 ? (
                      cache.heavy.security_details?.issues?.map((issue) => (
                        <p key={issue} className="text-sm text-[#53535a]">
                          {issue}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-[#66666d]">Nenhum problema critico de seguranca retornado.</p>
                    )}
                    {cache.heavy.google_presence?.estimated_position ? (
                      <p className="text-sm text-[#53535a]">
                        Posicionamento estimado no Google: {cache.heavy.google_presence.estimated_position}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#ececf0] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-[#EF3333]" />
                    <p className="text-sm font-semibold text-[#1A1A1A]">Inteligencia de Trafego (Pixels e Scripts)</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1">
                    <p className="text-sm text-[#66666d] mb-3">Sinais tecnicos identificados no site do lead indicativos de campanhas ativas.</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Facebook Pixel", ok: cache.heavy.marketing_signals?.has_facebook_pixel },
                        { label: "Google Ads / GTAG", ok: cache.heavy.marketing_signals?.has_google_ads },
                        { label: "LinkedIn Insight", ok: cache.heavy.marketing_signals?.has_linkedin_insight },
                      ].map((item) => (
                        <Badge
                          key={item.label}
                          className={
                            item.ok
                              ? "rounded-full border border-[#cfe6d7] bg-[#f3fbf5] text-[#21603a]"
                              : "rounded-full border border-[#ececf0] bg-[#fafafc] text-[#8d8d95]"
                          }
                        >
                          {item.ok ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <X className="mr-1 h-3.5 w-3.5" />}
                          {item.label}
                        </Badge>
                      ))}
                    </div>
                    {cache.heavy.marketing_signals?.detected_tags && cache.heavy.marketing_signals.detected_tags.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d8d95] mb-2">Tags Encontradas:</p>
                        <div className="flex flex-wrap gap-1">
                          {cache.heavy.marketing_signals.detected_tags.map(tag => (
                            <span key={tag} className="text-xs bg-[#f4f4f5] text-[#3f3f46] px-2 py-1 rounded-md border border-[#e4e4e7]">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:min-w-[240px]">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-xs border-[#ececf0]"
                      onClick={() => window.open(`https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=BR&q=${encodeURIComponent(business.name)}&sort_data[direction]=desc&sort_data[mode]=relevancy_monthly_grouped&search_type=keyword_unordered&media_type=all`, '_blank')}
                    >
                      <Globe className="mr-2 h-3.5 w-3.5" />
                      Pesquisar na FB Ad Library
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-xs border-[#ececf0]"
                      onClick={() => window.open(`https://adstransparency.google.com/?region=BR&domain=${business.website ? encodeURIComponent(business.website) : ''}`, '_blank')}
                    >
                      <Globe className="mr-2 h-3.5 w-3.5" />
                      Pesquisar no Google Ads
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] border border-[#ececf0] bg-white p-4">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Forcas percebidas</p>
                  <div className="mt-3 space-y-2">
                    {(cache.heavy.google_presence?.strengths || []).length > 0 ? (
                      cache.heavy.google_presence?.strengths?.map((item) => (
                        <p key={item} className="text-sm text-[#53535a]">
                          {item}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-[#66666d]">Nenhuma forca relevante foi destacada.</p>
                    )}
                  </div>
                </div>
                <div className="rounded-[24px] border border-[#ececf0] bg-white p-4">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Fraquezas percebidas</p>
                  <div className="mt-3 space-y-2">
                    {(cache.heavy.google_presence?.weaknesses || []).length > 0 ? (
                      cache.heavy.google_presence?.weaknesses?.map((item) => (
                        <p key={item} className="text-sm text-[#53535a]">
                          {item}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-[#66666d]">Nenhuma fraqueza relevante foi destacada.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#ececf0] bg-white p-4">
                <p className="text-sm font-semibold text-[#1A1A1A]">Recomendacoes prioritarias</p>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {(cache.heavy.recommendations || []).length > 0 ? (
                    cache.heavy.recommendations?.map((item, index) => (
                      <div key={`${item.title}-${index}`} className="rounded-[20px] border border-[#ececf0] bg-[#fafafc] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="rounded-full border border-[#ef3333]/25 bg-[#fff2f4] text-[#8f2434]">
                            {item.priority}
                          </Badge>
                          <Badge variant="outline" className="rounded-full border-[#ececf0] bg-white text-[#5f5f67]">
                            {item.category}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-[#1A1A1A]">{item.title}</p>
                        <p className="mt-2 text-sm leading-relaxed text-[#5f5f67]">{item.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#66666d]">A auditoria pesada nao retornou recomendacoes estruturadas.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#e0e0e6] bg-[#fafafc] px-6 py-12 text-center">
              <p className="text-sm text-[#66666d]">
                Execute uma auditoria pesada para inspecionar site, SEO, seguranca e sinais comerciais com captura visual.
              </p>
              <Button onClick={() => fetchHeavyAnalysis(true)} className="mt-4 rounded-xl bg-[#111115] text-white hover:bg-[#1d1d24]">
                <Sparkles className="mr-2 h-4 w-4 text-[#EF3333]" />
                Rodar auditoria pesada
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approach" className="mt-5">
          <ApproachSuggestion business={business} analysis={cache.heavy} onClose={() => undefined} embedded provider={analysisProvider} />
        </TabsContent>

        <TabsContent value="competitors" className="mt-5">
          {loading.competitors ? (
            <LoadingState label="Lendo concorrencia e brechas de posicionamento..." />
          ) : cache.competitors ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold text-[#1A1A1A]">Mapa competitivo</h4>
                  <p className="text-sm text-[#66666d]">Use estas brechas para construir a proposta consultiva.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refresh("competitors")} className="rounded-xl">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Atualizar
                </Button>
              </div>

              <div className="rounded-[22px] border border-[#ececf0] bg-[#fafafc] p-4">
                <p className="text-sm leading-relaxed text-[#53535a]">{cache.competitors.summary}</p>
              </div>

              <div className="space-y-3">
                {cache.competitors.competitors.map((competitor, index) => (
                  <div key={`${competitor.name}-${index}`} className="rounded-[22px] border border-[#ececf0] p-4">
                    <div className="flex items-center gap-2">
                      <Swords className="h-4 w-4 text-[#EF3333]" />
                      <p className="font-semibold text-[#1A1A1A]">{competitor.name}</p>
                    </div>
                    <p className="mt-3 text-sm text-[#44444b]">
                      <span className="font-medium text-[#1A1A1A]">Forca:</span> {competitor.strength}
                    </p>
                    <p className="mt-1 text-sm text-[#44444b]">
                      <span className="font-medium text-[#1A1A1A]">Brecha:</span> {competitor.weakness}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-[#ececf0] p-4">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Diferenciais sugeridos</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cache.competitors.differentials.map((item) => (
                      <Badge key={item} variant="outline" className="rounded-full border-[#ef3333]/30 bg-[#fff5f7] text-[#962536]">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-[22px] border border-[#ececf0] p-4">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Oportunidades</p>
                  <div className="mt-3 space-y-2">
                    {cache.competitors.opportunities.map((item) => (
                      <p key={item} className="text-sm text-[#53535a]">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#e0e0e6] bg-[#fafafc] px-6 py-12 text-center">
              <p className="text-sm text-[#66666d]">Leia os principais concorrentes para aumentar a autoridade da proposta.</p>
              <Button onClick={() => fetchAnalysis("competitors")} className="mt-4 rounded-xl bg-[#111115] text-white hover:bg-[#1d1d24]">
                <Swords className="mr-2 h-4 w-4 text-[#EF3333]" />
                Analisar concorrencia
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="score" className="mt-5">
          {loading.score ? (
            <LoadingState label="Pontuando nivel de oportunidade e chance de conversao..." />
          ) : cache.score ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold text-[#1A1A1A]">Score de qualificacao</h4>
                  <p className="text-sm text-[#66666d]">Pontuacao aprofundada gerada pela IA.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refresh("score")} className="rounded-xl">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Atualizar
                </Button>
              </div>

              <div className="rounded-[24px] border border-[#1d1d22] bg-[#111115] p-6 text-white">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Score IA</p>
                    <p className="mt-2 text-5xl font-semibold">{cache.score.totalScore}</p>
                  </div>
                  <Badge className="rounded-full border border-[#EF3333]/30 bg-[#EF3333]/15 text-[#ffb6bf]">
                    Prioridade {cache.score.priority}
                  </Badge>
                </div>
                <p className="mt-4 text-sm text-white/75">{cache.score.recommendation}</p>
              </div>

              <div className="space-y-3 rounded-[22px] border border-[#ececf0] p-4">
                {Object.entries(cache.score.breakdown).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-[#5f5f67]">{value.reason}</span>
                      <span className="font-medium text-[#1A1A1A]">
                        {value.score}/{value.max}
                      </span>
                    </div>
                    <Progress value={(value.score / value.max) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#e0e0e6] bg-[#fafafc] px-6 py-12 text-center">
              <p className="text-sm text-[#66666d]">Calcule um score aprofundado para decidir se o lead entra na fila premium.</p>
              <Button onClick={() => fetchAnalysis("score")} className="mt-4 rounded-xl bg-[#111115] text-white hover:bg-[#1d1d24]">
                <BarChart3 className="mr-2 h-4 w-4 text-[#EF3333]" />
                Calcular score
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile" className="mt-5">
          {loading.profile ? (
            <LoadingState label="Montando leitura executiva da operacao e do decisor..." />
          ) : cache.profile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold text-[#1A1A1A]">Perfil executivo</h4>
                  <p className="text-sm text-[#66666d]">Visao sintetica de publico, porte e melhor abordagem.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refresh("profile")} className="rounded-xl">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Atualizar
                </Button>
              </div>

              <div className="rounded-[22px] border border-[#ececf0] bg-[#fafafc] p-4">
                <p className="text-sm leading-relaxed text-[#53535a]">{cache.profile.overview}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-[#ececf0] p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Publico-alvo</p>
                  <p className="mt-2 text-sm font-medium text-[#1A1A1A]">{cache.profile.targetAudience}</p>
                </div>
                <div className="rounded-[22px] border border-[#ececf0] p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Porte</p>
                  <p className="mt-2 text-sm font-medium capitalize text-[#1A1A1A]">{cache.profile.estimatedSize}</p>
                </div>
                <div className="rounded-[22px] border border-[#ececf0] p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Decisor provavel</p>
                  <p className="mt-2 text-sm font-medium text-[#1A1A1A]">{cache.profile.decisionMaker}</p>
                </div>
                <div className="rounded-[22px] border border-[#ececf0] p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Melhor janela</p>
                  <p className="mt-2 text-sm font-medium text-[#1A1A1A]">{cache.profile.bestApproachTime}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-[#ececf0] p-4">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Forcas</p>
                  <div className="mt-3 space-y-2">
                    {cache.profile.strengths.map((item) => (
                      <p key={item} className="text-sm text-[#53535a]">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="rounded-[22px] border border-[#ececf0] p-4">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Desafios</p>
                  <div className="mt-3 space-y-2">
                    {cache.profile.challenges.map((item) => (
                      <p key={item} className="text-sm text-[#53535a]">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-[#f2d4d8] bg-[#fff5f6] p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#b04a58]">Insight</p>
                <p className="mt-2 text-sm leading-relaxed text-[#6e2b37]">{cache.profile.insights}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#e0e0e6] bg-[#fafafc] px-6 py-12 text-center">
              <p className="text-sm text-[#66666d]">Gere uma leitura executiva para saber com quem falar e como abordar.</p>
              <Button onClick={() => fetchAnalysis("profile")} className="mt-4 rounded-xl bg-[#111115] text-white hover:bg-[#1d1d24]">
                <User className="mr-2 h-4 w-4 text-[#EF3333]" />
                Gerar perfil executivo
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
