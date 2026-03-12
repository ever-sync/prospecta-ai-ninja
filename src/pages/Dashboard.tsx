import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
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
  seo: { label: 'SEO', color: 'hsl(var(--primary))' },
  speed: { label: 'Velocidade', color: 'hsl(var(--accent-foreground))' },
  layout: { label: 'Layout', color: 'hsl(var(--success))' },
  security: { label: 'Segurança', color: 'hsl(var(--warning))' },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const total = presentations.length;
  const ready = presentations.filter((p) => p.status === 'ready').length;
  const readyPresentations = presentations.filter((p) => p.status === 'ready' && p.analysis_data?.scores);
  const avgOverall =
    readyPresentations.length > 0
      ? Math.round(readyPresentations.reduce((sum, p) => sum + (p.analysis_data?.scores?.overall ?? 0), 0) / readyPresentations.length)
      : 0;
  const openRate = total > 0 ? Math.round((viewedCount / total) * 100) : 0;

  const categories = (['seo', 'speed', 'layout', 'security'] as const).map((key) => ({
    category: chartConfig[key].label,
    score: readyPresentations.length > 0
      ? Math.round(readyPresentations.reduce((sum, p) => sum + (p.analysis_data?.scores?.[key] ?? 0), 0) / readyPresentations.length)
      : 0,
  }));

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
    { title: 'Total', value: total, icon: File, highlight: true },
    { title: 'Prontas', value: ready, icon: CircleCheck },
    { title: 'Score Médio', value: avgOverall, icon: ArrowUpRight },
    { title: 'Taxa de Abertura', value: `${openRate}%`, icon: Eye },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
          >
            <Card
              className={
                s.highlight
                  ? 'bg-primary text-primary-foreground border-0 shadow-card h-full'
                  : 'border-0 shadow-card h-full'
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className={`text-sm font-medium ${s.highlight ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {s.title}
                </CardTitle>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.highlight ? 'bg-primary-foreground/20' : 'bg-accent'}`}>
                  <s.icon className={`w-[18px] h-[18px] ${s.highlight ? 'text-primary-foreground' : 'text-accent-foreground'}`} strokeWidth={1.75} />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${s.highlight ? 'text-primary-foreground' : 'text-foreground'}`}>{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {[
          {
            title: 'Scores Médios por Categoria',
            empty: readyPresentations.length === 0,
            emptyMsg: 'Nenhuma análise concluída ainda',
            chart: (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <BarChart data={categories}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="category" className="text-xs" />
                  <YAxis domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ),
          },
          {
            title: 'Apresentações por Semana',
            empty: timeline.length === 0,
            emptyMsg: 'Nenhuma apresentação criada ainda',
            chart: (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ChartContainer>
            ),
          },
        ].map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.08, duration: 0.3 }}
          >
            <Card className="border-0 shadow-card h-full">
              <CardHeader>
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {section.empty ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">{section.emptyMsg}</p>
                ) : (
                  section.chart
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
