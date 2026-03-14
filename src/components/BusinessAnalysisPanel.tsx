import { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  Globe,
  Loader2,
  MapPin,
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
import { Business } from "@/types/business";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ApproachSuggestion } from "@/components/ApproachSuggestion";
import { deriveLeadSignalSummary } from "@/lib/lead-scoring";

interface BusinessAnalysisPanelProps {
  business: Business;
  onClose: () => void;
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

type AnalysisCache = {
  competitors?: CompetitorData;
  score?: ScoreData;
  profile?: ProfileData;
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

export const BusinessAnalysisPanel = ({ business, onClose }: BusinessAnalysisPanelProps) => {
  const [cache, setCache] = useState<AnalysisCache>({});
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const signal = useMemo(() => deriveLeadSignalSummary(business), [business]);

  const fetchAnalysis = async (mode: "competitors" | "score" | "profile") => {
    if (cache[mode] && !loading) return;
    setLoading(mode);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-business", {
        body: { business, mode },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setCache((prev) => ({ ...prev, [mode]: data.result }));
    } catch (error) {
      console.error(`Error fetching ${mode}:`, error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro na analise",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const refresh = (mode: "competitors" | "score" | "profile") => {
    setCache((prev) => {
      const next = { ...prev };
      delete next[mode];
      return next;
    });
    fetchAnalysis(mode);
  };

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

        <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-xl text-[#5b5b62]">
          <X className="h-4 w-4" />
        </Button>
      </div>

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
          if (value === "competitors" && !cache.competitors) fetchAnalysis("competitors");
          if (value === "score" && !cache.score) fetchAnalysis("score");
          if (value === "profile" && !cache.profile) fetchAnalysis("profile");
        }}
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-[22px] border border-[#ececf0] bg-[#f5f5f7] p-2 sm:grid-cols-5">
          <TabsTrigger value="summary" className="rounded-2xl text-xs font-semibold data-[state=active]:bg-white">
            Resumo
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

        <TabsContent value="approach" className="mt-5">
          <ApproachSuggestion business={business} onClose={() => undefined} embedded />
        </TabsContent>

        <TabsContent value="competitors" className="mt-5">
          {loading === "competitors" ? (
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
          {loading === "score" ? (
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
          {loading === "profile" ? (
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
