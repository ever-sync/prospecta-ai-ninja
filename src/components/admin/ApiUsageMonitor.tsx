import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, DollarSign, Zap, Flame, Mail, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { invokeEdgeFunction } from '@/lib/invoke-edge-function';

type PeriodDays = 7 | 30 | 90;

interface ApiUsageData {
  isEstimated: boolean;
  period: number;
  summary: { totalCalls: number; totalCostCents: number; totalCostUSD: string };
  serviceBreakdown: Record<string, { calls: number; costCents: number }>;
  dailyUsage: Array<{ date: string; firecrawl: number; ai: number; resend: number }>;
  topConsumers: Array<{ email: string; company: string; calls: number; costCents: number }>;
}

const SERVICE_COLORS: Record<string, string> = {
  firecrawl: '#f97316',
  ai: '#8b5cf6',
  resend: '#06b6d4',
};

const SERVICE_LABELS: Record<string, string> = {
  firecrawl: 'Firecrawl',
  ai: 'AI (Gemini)',
  resend: 'Resend (Email)',
};

const SERVICE_ICONS: Record<string, any> = {
  firecrawl: Flame,
  ai: Brain,
  resend: Mail,
};

const formatBRL = (cents: number) => {
  const brl = (cents / 100) * 5.5; // Approximate USD to BRL
  return `R$ ${brl.toFixed(2)}`;
};

const formatUSD = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const ApiUsageMonitor = () => {
  const { toast } = useToast();
  const [data, setData] = useState<ApiUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodDays>(30);

  const fetchUsage = useCallback(async (days: PeriodDays) => {
    setLoading(true);
    try {
      const { data: result, error } = await invokeEdgeFunction<ApiUsageData>('admin-api-usage', {
        body: { days },
      });
      if (error) throw error;
      setData(result);
    } catch (err) {
      console.error('Failed to fetch API usage:', err);
      toast({ title: 'Erro ao carregar uso de APIs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsage(period);
  }, [period, fetchUsage]);

  const handlePeriodChange = (value: string) => {
    setPeriod(Number(value) as PeriodDays);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!data) return null;

  const pieData = Object.entries(data.serviceBreakdown).map(([service, info]) => ({
    name: SERVICE_LABELS[service] || service,
    value: info.costCents,
    color: SERVICE_COLORS[service] || '#94a3b8',
  }));

  return (
    <div className="space-y-6">
      {data.isEstimated && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Valores estimados com base no uso da plataforma. O tracking real será ativado automaticamente nas próximas operações.
          </p>
        </div>
      )}

      {/* Period selector + summary */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Monitoramento de APIs</h3>
        <Select value={String(period)} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Chamadas</p>
                <p className="text-2xl font-bold mt-1">{data.summary.totalCalls.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {Object.entries(data.serviceBreakdown).map(([service, info]) => {
          const Icon = SERVICE_ICONS[service] || Zap;
          const color = SERVICE_COLORS[service] || '#94a3b8';
          return (
            <Card key={service}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{SERVICE_LABELS[service] || service}</p>
                    <p className="text-2xl font-bold mt-1">{info.calls.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatUSD(info.costCents)} · {formatBRL(info.costCents)}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cost summary */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-[#EF3333]" />
            <div>
              <p className="text-sm text-muted-foreground">Custo Total Estimado ({period} dias)</p>
              <p className="text-xl font-bold">
                {formatUSD(data.summary.totalCostCents)} <span className="text-sm font-normal text-muted-foreground">≈ {formatBRL(data.summary.totalCostCents)}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Uso Diário por Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => {
                    const d = new Date(v + 'T12:00:00');
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip
                  labelFormatter={(v) => new Date(v + 'T12:00:00').toLocaleDateString('pt-BR')}
                  formatter={(value: number, name: string) => [value, SERVICE_LABELS[name] || name]}
                />
                <Legend formatter={(value) => SERVICE_LABELS[value] || value} />
                <Area type="monotone" dataKey="firecrawl" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                <Area type="monotone" dataKey="ai" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                <Area type="monotone" dataKey="resend" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Custos</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {pieData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatUSD(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top consumers */}
      {data.topConsumers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Consumidores de API</CardTitle>
            <CardDescription>Usuários com maior uso no período</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Chamadas</TableHead>
                  <TableHead className="text-right">Custo Est.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topConsumers.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.company}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{u.calls}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatUSD(u.costCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ApiUsageMonitor;
