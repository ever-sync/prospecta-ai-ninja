import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  CircleCheck,
  Eye,
  FileSearch,
  Fingerprint,
  Link2,
  Loader2,
  Quote,
  Radar,
  Shapes,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardReadinessState } from "@/types/business";

interface AnalysisScores {
  overall?: number;
  seo?: number;
  speed?: number;
  layout?: number;
  security?: number;
}

interface PresentationRow {
  id: string;
  status: string | null;
  business_name: string | null;
  analysis_data: { scores?: AnalysisScores } | null;
  created_at: string | null;
}

const chartConfig = {
  seo: { label: "SEO", color: "#EF3333" },
  speed: { label: "Velocidade", color: "#1A1A1A" },
  layout: { label: "Layout", color: "#EF3333" },
  security: { label: "Seguranca", color: "#4E4E56" },
  count: { label: "Apresentacoes", color: "#EF3333" },
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [presentations, setPresentations] = useState<PresentationRow[]>([]);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [readiness, setReadiness] = useState<DashboardReadinessState[]>([]);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      const [
        presentationsRes,
        dnaRes,
        testimonialsRes,
        logosRes,
        profileRes,
      ] = await Promise.all([
        supabase
          .from("presentations")
          .select("id, status, business_name, analysis_data, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("company_dna").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("testimonials").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("client_logos").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("profiles").select("company_name, proposal_link_domain").eq("user_id", user.id).maybeSingle(),
      ]);

      const presentationRows = (presentationsRes.data || []) as PresentationRow[];
      setPresentations(presentationRows);

      const presentationIds = presentationRows.map((item) => item.id);
      if (presentationIds.length > 0) {
        const { data: viewsData } = await supabase
          .from("presentation_views")
          .select("presentation_id")
          .in("presentation_id", presentationIds);
        setViewedIds(new Set((viewsData || []).map((item) => item.presentation_id)));
      } else {
        setViewedIds(new Set());
      }

      const dna = dnaRes.data as Record<string, unknown> | null;
      const testimonialsCount = testimonialsRes.count || 0;
      const logosCount = logosRes.count || 0;
      const profile = profileRes.data as { company_name?: string | null; proposal_link_domain?: string | null } | null;

      setCompanyName(profile?.company_name || null);
      setReadiness([
        {
          label: "DNA estrategico",
          ready: Boolean(dna && ((dna.services as unknown[] | null)?.length || 0) > 0 && dna.value_proposition),
          detail: dna ? "Base configurada para analise e proposta." : "Preencha servicos e proposta de valor.",
        },
        {
          label: "Provas sociais",
          ready: testimonialsCount > 0,
          detail: testimonialsCount > 0 ? `${testimonialsCount} testemunho(s) pronto(s).` : "Adicione testemunhos para elevar autoridade.",
        },
        {
          label: "Credibilidade visual",
          ready: logosCount > 0,
          detail: logosCount > 0 ? `${logosCount} logo(s) de clientes disponiveis.` : "Suba logos para reforcar confianca.",
        },
        {
          label: "Dominio de proposta",
          ready: Boolean(profile?.proposal_link_domain),
          detail: profile?.proposal_link_domain
            ? "Link de proposta configurado."
            : "Defina o dominio publico das propostas.",
        },
      ]);

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const total = presentations.length;
  const ready = presentations.filter((item) => item.status === "ready").length;
  const readyPresentations = presentations.filter(
    (item) => item.status === "ready" && item.analysis_data?.scores
  );
  const avgOverall =
    readyPresentations.length > 0
      ? Math.round(
          readyPresentations.reduce(
            (sum, item) => sum + (item.analysis_data?.scores?.overall ?? 0),
            0
          ) / readyPresentations.length
        )
      : 0;
  const openRate = total > 0 ? Math.round((viewedIds.size / total) * 100) : 0;

  const categories = useMemo(
    () =>
      (["seo", "speed", "layout", "security"] as const).map((key) => ({
        category: chartConfig[key].label,
        score:
          readyPresentations.length > 0
            ? Math.round(
                readyPresentations.reduce(
                  (sum, item) => sum + (item.analysis_data?.scores?.[key] ?? 0),
                  0
                ) / readyPresentations.length
              )
            : 0,
      })),
    [readyPresentations]
  );

  const timeline = useMemo(() => {
    const timelineMap = new Map<string, number>();
    presentations.forEach((item) => {
      if (!item.created_at) return;
      const date = new Date(item.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      timelineMap.set(key, (timelineMap.get(key) ?? 0) + 1);
    });

    return Array.from(timelineMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        count,
      }));
  }, [presentations]);

  const hotPresentations = useMemo(() => {
    return presentations
      .filter((item) => item.status === "ready")
      .map((item) => ({
        ...item,
        viewed: viewedIds.has(item.id),
        score: item.analysis_data?.scores?.overall ?? 0,
      }))
      .sort((a, b) => {
        if (Number(b.viewed) !== Number(a.viewed)) return Number(b.viewed) - Number(a.viewed);
        return (b.score || 0) - (a.score || 0);
      })
      .slice(0, 4);
  }, [presentations, viewedIds]);

  const nextAction = useMemo(() => {
    if (ready === 0) return "Rode sua primeira varredura e transforme os melhores leads em propostas.";
    if (openRate >= 50) return "Faca follow-up das propostas abertas primeiro. A janela esta quente.";
    if (readiness.some((item) => !item.ready)) return "Complete a base de autoridade para aumentar a percepcao consultiva das propostas.";
    return "Selecione os leads com melhor leitura e gere a proxima leva de analises.";
  }, [openRate, readiness, ready]);

  if (loading) {
    return (
      <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
        <Skeleton className="h-[180px] rounded-[28px]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[148px] rounded-[24px]" />
          ))}
        </div>
        <Skeleton className="h-[420px] rounded-[28px]" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Prontas para envio",
      value: ready,
      description: ready > 0 ? "Propostas disponiveis agora." : "Nenhuma proposta pronta ainda.",
      icon: CircleCheck,
      accent: "dark",
    },
    {
      title: "Taxa de abertura",
      value: `${openRate}%`,
      description: `${viewedIds.size} visualizacao(oes) unicas.`,
      icon: Eye,
      accent: "light",
    },
    {
      title: "Score medio",
      value: avgOverall,
      description: "Media das analises ja concluida(s).",
      icon: FileSearch,
      accent: "light",
    },
    {
      title: "Operacao em andamento",
      value: total,
      description: "Apresentacoes geradas no workspace.",
      icon: Activity,
      accent: "light",
    },
  ];

  return (
    <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="overflow-hidden rounded-[32px] border border-[#1c1c22] bg-[#111115] text-white shadow-[0_24px_60px_rgba(12,12,18,0.22)]"
      >
        <div className="relative overflow-hidden px-6 py-7 lg:px-8 lg:py-8">
          <div className="absolute inset-y-0 right-0 w-[320px] bg-[radial-gradient(circle_at_top_right,_rgba(239,51,51,0.22),_transparent_60%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ffb6bf]">
                Mission Control
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight lg:text-5xl">
                Centro de comando do scanner consultivo
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/68 lg:text-base">
                {companyName
                  ? `${companyName}, aqui voce acompanha a operacao comercial com contexto, prontidao e foco.`
                  : "Aqui voce acompanha a operacao comercial com contexto, prontidao e foco."}
              </p>
            </div>

            <div className="max-w-md rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Proxima recomendacao</p>
              <p className="mt-3 text-sm leading-relaxed text-white/85">{nextAction}</p>
              <Button
                onClick={() => navigate("/search")}
                className="mt-4 rounded-xl bg-white text-[#111115] hover:bg-white/90"
              >
                Ir para o scanner
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.24 }}
          >
            <Card
              className={cn(
                "h-full rounded-[24px] border shadow-[0_10px_24px_rgba(18,18,22,0.05)]",
                card.accent === "dark"
                  ? "border-[#1E1E24] bg-[#17171D] text-white"
                  : "border-[#ececf0] bg-white text-[#1A1A1A]"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle
                    className={cn(
                      "text-sm font-medium",
                      card.accent === "dark" ? "text-white/75" : "text-[#6a6a72]"
                    )}
                  >
                    {card.title}
                  </CardTitle>
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-2xl",
                      card.accent === "dark"
                        ? "bg-[#EF3333] text-white"
                        : "bg-[#fff0f1] text-[#EF3333]"
                    )}
                  >
                    <card.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
                <p className={cn("mt-1 text-sm", card.accent === "dark" ? "text-white/65" : "text-[#787880]")}>
                  {card.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}>
            <Card className="rounded-[28px] border border-[#ececf0] bg-white shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Qualidade media das analises</CardTitle>
                <p className="text-sm text-[#66666d]">Acompanhe a consistencia do scanner nas ultimas propostas prontas.</p>
              </CardHeader>
              <CardContent>
                {readyPresentations.length === 0 ? (
                  <p className="py-12 text-center text-sm text-[#7d7d84]">
                    Nenhuma analise concluida ainda. Rode uma primeira varredura no scanner.
                  </p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <BarChart data={categories}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ededf1" />
                      <XAxis dataKey="category" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="score" fill="#EF3333" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.3 }}>
            <Card className="rounded-[28px] border border-[#ececf0] bg-white shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Cadencia semanal</CardTitle>
                <p className="text-sm text-[#66666d]">Volume de propostas geradas por semana.</p>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="py-12 text-center text-sm text-[#7d7d84]">
                    Ainda nao existe historico suficiente para mostrar evolucao semanal.
                  </p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[240px] w-full">
                    <LineChart data={timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ededf1" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#EF3333"
                        strokeWidth={2.5}
                        dot={{ fill: "#EF3333", r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.3 }}>
            <Card className="rounded-[28px] border border-[#ececf0] bg-white shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Prontidao da operacao</CardTitle>
                <p className="text-sm text-[#66666d]">O que ja esta pronto para sustentar uma proposta consultiva.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {readiness.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-[22px] border border-[#ececf0] px-4 py-4"
                  >
                    <div className={cn("mt-0.5 rounded-2xl p-2", item.ready ? "bg-[#effaf3] text-[#1f8f47]" : "bg-[#fff2f4] text-[#b23246]")}>
                      {item.label === "DNA estrategico" ? (
                        <Fingerprint className="h-4 w-4" />
                      ) : item.label === "Provas sociais" ? (
                        <Quote className="h-4 w-4" />
                      ) : item.label === "Credibilidade visual" ? (
                        <Shapes className="h-4 w-4" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#1A1A1A]">{item.label}</p>
                        <Badge
                          className={cn(
                            "rounded-full border",
                            item.ready
                              ? "border-[#cce9d5] bg-[#effaf3] text-[#1f8f47]"
                              : "border-[#f2d4d8] bg-[#fff5f6] text-[#b23246]"
                          )}
                        >
                          {item.ready ? "Pronto" : "Pendente"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-[#66666d]">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.3 }}>
            <Card className="rounded-[28px] border border-[#1E1E24] bg-[#17171D] text-white shadow-[0_16px_30px_rgba(10,10,14,0.2)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold">Foco de execucao</CardTitle>
                <p className="text-sm text-white/60">Escolha as proximas propostas que merecem energia agora.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {hotPresentations.length === 0 ? (
                  <div className="rounded-[22px] bg-white/6 px-4 py-4 text-sm text-white/70">
                    Sem apresentacoes prontas no momento. Va para o scanner e monte a primeira leva.
                  </div>
                ) : (
                  hotPresentations.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate("/presentations")}
                      className="flex w-full items-center justify-between gap-3 rounded-[22px] bg-white/6 px-4 py-4 text-left transition-colors hover:bg-white/10"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{item.business_name || "Lead sem nome"}</p>
                        <p className="mt-1 text-xs text-white/60">
                          {item.viewed ? "Ja abriu a proposta" : "Ainda nao abriu"} • criada em {formatDate(item.created_at)}
                        </p>
                      </div>
                      <Badge className="rounded-full border border-[#EF3333]/30 bg-[#EF3333]/15 text-[#ffb6bf]">
                        {item.score}
                      </Badge>
                    </button>
                  ))
                )}

                <div className="rounded-[22px] bg-[#EF3333] px-4 py-4 text-white">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/80">Prioridade</p>
                  <p className="mt-2 text-sm font-medium">{nextAction}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }}>
            <Card className="rounded-[28px] border border-[#ececf0] bg-white shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Atalhos do workspace</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Button variant="outline" className="justify-start rounded-xl border-[#e6e6eb] bg-white" onClick={() => navigate("/search")}>
                  <Radar className="mr-2 h-4 w-4 text-[#EF3333]" />
                  Abrir scanner
                </Button>
                <Button variant="outline" className="justify-start rounded-xl border-[#e6e6eb] bg-white" onClick={() => navigate("/dna")}>
                  <BookOpenCheck className="mr-2 h-4 w-4 text-[#EF3333]" />
                  Revisar DNA da empresa
                </Button>
                <Button variant="outline" className="justify-start rounded-xl border-[#e6e6eb] bg-white" onClick={() => navigate("/presentations")}>
                  <FileSearch className="mr-2 h-4 w-4 text-[#EF3333]" />
                  Ver apresentacoes
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
