import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface DailyStat {
  date: string;
  presentations: number;
  views: number;
  emails: number;
}

const chartConfig = {
  presentations: { label: 'Propostas', color: 'hsl(var(--primary))' },
  views: { label: 'Visualizações', color: 'hsl(142 76% 36%)' },
  emails: { label: 'Emails', color: 'hsl(262 83% 58%)' },
};

const formatDate = (date: string) => {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const AdminCharts = ({ data }: { data: DailyStat[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Evolução — Últimos 30 dias
        </CardTitle>
        <CardDescription>Propostas, visualizações e emails enviados por dia</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillPresentations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillEmails" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatDate(v as string)} />} />
            <Area type="monotone" dataKey="presentations" stroke="hsl(var(--primary))" fill="url(#fillPresentations)" strokeWidth={2} />
            <Area type="monotone" dataKey="views" stroke="hsl(142 76% 36%)" fill="url(#fillViews)" strokeWidth={2} />
            <Area type="monotone" dataKey="emails" stroke="hsl(262 83% 58%)" fill="url(#fillEmails)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
