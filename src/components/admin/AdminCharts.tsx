import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DailyStat {
  date: string;
  presentations: number;
  views: number;
  emails: number;
}

export type PeriodDays = 7 | 30 | 90;

const chartConfig = {
  presentations: { label: 'Propostas', color: 'hsl(var(--primary))' },
  views: { label: 'Visualizações', color: 'hsl(142 76% 36%)' },
  emails: { label: 'Emails', color: 'hsl(262 83% 58%)' },
};

const formatDate = (date: string) => {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const periodLabels: Record<PeriodDays, string> = {
  7: '7 dias',
  30: '30 dias',
  90: '90 dias',
};

interface AdminChartsProps {
  data: DailyStat[];
  period: PeriodDays;
  onPeriodChange: (period: PeriodDays) => void;
  loading?: boolean;
}

export const AdminCharts = ({ data, period, onPeriodChange, loading }: AdminChartsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Evolução — Últimos {periodLabels[period]}
            </CardTitle>
            <CardDescription>Propostas, visualizações e emails enviados por dia</CardDescription>
          </div>
          <div className="flex gap-1">
            {([7, 30, 90] as PeriodDays[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? 'default' : 'outline'}
                onClick={() => onPeriodChange(p)}
                disabled={loading}
                className="text-xs"
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>
        </div>
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
