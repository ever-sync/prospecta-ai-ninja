import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Loader2, FileText, CheckCircle, TrendingUp, Eye } from 'lucide-react';

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
  seo: { label: 'SEO', color: 'hsl(var(--primary))' },
  speed: { label: 'Velocidade', color: 'hsl(var(--accent))' },
  layout: { label: 'Layout', color: 'hsl(142 71% 45%)' },
  security: { label: 'Segurança', color: 'hsl(38 92% 50%)' },
  count: { label: 'Apresentações', color: 'hsl(var(--primary))' },
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
        supabase
          .from('presentations')
          .select('id, status, analysis_data, created_at')
          .eq('user_id', user.id),
        supabase
          .from('presentation_views')
          .select('presentation_id'),
      ]);

      if (presRes.data) {
        setPresentations(presRes.data as unknown as PresentationRow[]);
      }

      if (viewsRes.data) {
        const uniqueIds = new Set(viewsRes.data.map((v: { presentation_id: string }) => v.presentation_id));
        setViewedCount(uniqueIds.size);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const total = presentations.length;
  const ready = presentations.filter((p) => p.status === 'ready').length;

  const readyPresentations = presentations.filter(
    (p) => p.status === 'ready' && p.analysis_data?.scores
  );

  const avgOverall =
    readyPresentations.length > 0
      ? Math.round(
          readyPresentations.reduce(
            (sum, p) => sum + (p.analysis_data?.scores?.overall ?? 0),
            0
          ) / readyPresentations.length
        )
      : 0;

  const openRate = total > 0 ? Math.round((viewedCount / total) * 100) : 0;

  // Category averages
  const categories: { category: string; score: number }[] = (['seo', 'speed', 'layout', 'security'] as const).map(
    (key) => ({
      category: chartConfig[key].label,
      score:
        readyPresentations.length > 0
          ? Math.round(
              readyPresentations.reduce(
                (sum, p) => sum + (p.analysis_data?.scores?.[key] ?? 0),
                0
              ) / readyPresentations.length
            )
          : 0,
    })
  );

  // Timeline: group by week
  const timelineMap = new Map<string, number>();
  presentations.forEach((p) => {
    if (!p.created_at) return;
    const d = new Date(p.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    timelineMap.set(key, (timelineMap.get(key) ?? 0) + 1);
  });
  const timeline = Array.from(timelineMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      count,
    }));

  const statCards = [
    { title: 'Total', value: total, icon: FileText, color: 'text-primary' },
    { title: 'Prontas', value: ready, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Score Médio', value: avgOverall, icon: TrendingUp, color: 'text-accent-foreground' },
    { title: 'Taxa de Abertura', value: `${openRate}%`, icon: Eye, color: 'text-amber-500' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Scores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scores Médios por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {readyPresentations.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                Nenhuma análise concluída ainda
              </p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <BarChart data={categories}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="category" className="text-xs" />
                  <YAxis domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Apresentações por Semana</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                Nenhuma apresentação criada ainda
              </p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
