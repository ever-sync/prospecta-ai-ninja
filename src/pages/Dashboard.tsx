import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { Loader2, File, CircleCheck, ArrowUpRight, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

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
  analysis_data: { scores?: AnalysisScores } | null;
  created_at: string | null;
}

const chartConfig = {
  seo: { label: 'SEO', color: '#EF3333' },
  speed: { label: 'Velocidade', color: '#1A1A1A' },
  layout: { label: 'Layout', color: '#EF3333' },
  security: { label: 'Seguranca', color: '#4E4E56' },
  count: { label: 'Apresentacoes', color: '#EF3333' },
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [presentations, setPresentations] = useState<PresentationRow[]>([]);
  const [viewedCount, setViewedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [presRes, viewsRes] = await Promise.all([
        supabase.from('presentations').select('id, status, analysis_data, created_at').eq('user_id', user.id),
        supabase.from('presentation_views').select('presentation_id'),
      ]);

      if (presRes.data) setPresentations(presRes.data as unknown as PresentationRow[]);
      if (viewsRes.data) {
        const uniqueIds = new Set(viewsRes.data.map((v: { presentation_id: string }) => v.presentation_id));
        setViewedCount(uniqueIds.size);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const total = presentations.length;
  const ready = presentations.filter((p) => p.status === 'ready').length;
  const readyPresentations = presentations.filter((p) => p.status === 'ready' && p.analysis_data?.scores);
  const avgOverall =
    readyPresentations.length > 0
      ? Math.round(readyPresentations.reduce((sum, p) => sum + (p.analysis_data?.scores?.overall ?? 0), 0) / readyPresentations.length)
      : 0;
  const openRate = total > 0 ? Math.round((viewedCount / total) * 100) : 0;
  const readyRate = total > 0 ? Math.round((ready / total) * 100) : 0;

  const categories = useMemo(
    () =>
      (['seo', 'speed', 'layout', 'security'] as const).map((key) => ({
        category: chartConfig[key].label,
        score:
          readyPresentations.length > 0
            ? Math.round(readyPresentations.reduce((sum, p) => sum + (p.analysis_data?.scores?.[key] ?? 0), 0) / readyPresentations.length)
            : 0,
      })),
    [readyPresentations]
  );

  const timeline = useMemo(() => {
    const timelineMap = new Map<string, number>();
    presentations.forEach((p) => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      timelineMap.set(key, (timelineMap.get(key) ?? 0) + 1);
    });

    return Array.from(timelineMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        count,
      }));
  }, [presentations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-[#EF3333]" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de apresentacoes',
      value: total,
      description: 'Volume acumulado',
      icon: File,
      dark: true,
    },
    {
      title: 'Prontas',
      value: ready,
      description: `${readyRate}% do total`,
      icon: CircleCheck,
      dark: false,
    },
    {
      title: 'Score medio',
      value: avgOverall,
      description: 'Baseado nas analises',
      icon: ArrowUpRight,
      dark: false,
    },
    {
      title: 'Taxa de abertura',
      value: `${openRate}%`,
      description: `${viewedCount} visualizacoes unicas`,
      icon: Eye,
      dark: false,
    },
  ];

  return (
    <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-[28px] border border-[#ececf0] bg-white px-6 py-7 shadow-[0_14px_36px_rgba(20,20,24,0.06)] lg:px-8"
      >
        <p className="text-sm font-medium text-[#75757d]">Dashboard</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1A1A1A] lg:text-4xl">Welcome Back</h1>
        <p className="mt-2 text-sm text-[#66666d] lg:text-base">
          Visao consolidada das suas apresentacoes, desempenho e evolucao semanal.
        </p>
      </motion.section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.25 }}
          >
            <Card
              className={cn(
                'h-full rounded-[24px] border shadow-[0_10px_24px_rgba(18,18,22,0.05)]',
                card.dark ? 'border-[#1E1E24] bg-[#17171D] text-white' : 'border-[#ececf0] bg-white text-[#1A1A1A]'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={cn('text-sm font-medium', card.dark ? 'text-white/75' : 'text-[#6a6a72]')}>{card.title}</CardTitle>
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-2xl',
                      card.dark ? 'bg-[#EF3333]' : 'bg-[#fff0f1] text-[#EF3333]'
                    )}
                  >
                    <card.icon className={cn('h-[18px] w-[18px]', card.dark ? 'text-white' : 'text-[#EF3333]')} strokeWidth={1.9} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className={cn('text-3xl font-semibold tracking-tight', card.dark ? 'text-white' : 'text-[#1A1A1A]')}>{card.value}</p>
                <p className={cn('mt-1 text-sm', card.dark ? 'text-white/65' : 'text-[#787880]')}>{card.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
          <Card className="h-full rounded-[24px] border border-[#ececf0] bg-white shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-[#1A1A1A]">Scores medios por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {readyPresentations.length === 0 ? (
                <p className="py-12 text-center text-sm text-[#7d7d84]">Nenhuma analise concluida ainda.</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <BarChart data={categories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ededf1" />
                    <XAxis dataKey="category" className="text-xs" tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="score" fill="#EF3333" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.3 }}>
            <Card className="rounded-[24px] border border-[#ececf0] bg-white shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-[#1A1A1A]">Apresentacoes por semana</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="py-10 text-center text-sm text-[#7d7d84]">Nenhuma apresentacao criada ainda.</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <LineChart data={timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ededf1" />
                      <XAxis dataKey="date" className="text-xs" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="count" stroke="#EF3333" strokeWidth={2.5} dot={{ fill: '#EF3333', r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.3 }}>
            <Card className="rounded-[24px] border border-[#1E1E24] bg-[#17171D] text-white shadow-[0_16px_30px_rgba(10,10,14,0.2)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold">Resumo rapido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl bg-white/6 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-white/65">Conversao inicial</p>
                  <p className="mt-1 text-2xl font-semibold">{openRate}%</p>
                </div>
                <div className="rounded-2xl bg-white/6 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-white/65">Prontas para envio</p>
                  <p className="mt-1 text-2xl font-semibold">{ready}</p>
                </div>
                <div className="rounded-2xl bg-[#EF3333] px-4 py-3 text-white">
                  <p className="text-xs uppercase tracking-[0.1em] text-white/80">Prioridade</p>
                  <p className="mt-1 text-sm font-medium">Focar follow-up das apresentacoes abertas esta semana.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
