import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Presentation, Megaphone, Eye, Mail, TrendingUp, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { AdminCharts } from '@/components/admin/AdminCharts';

interface AdminStats {
  totals: {
    users: number;
    presentations: number;
    campaigns: number;
    views: number;
    emails: number;
  };
  thisMonth: {
    presentations: number;
    views: number;
    emails: number;
  };
  dailyStats: Array<{
    date: string;
    presentations: number;
    views: number;
    emails: number;
  }>;
  topUsers: Array<{
    userId: string;
    email: string;
    company: string;
    count: number;
  }>;
  recentPresentations: Array<{
    id: string;
    business_name: string;
    status: string;
    lead_response: string;
    created_at: string;
    user_id: string;
  }>;
}

const StatCard = ({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: number | string; sub?: string; color: string;
}) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const Admin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      if (!user) return;

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      try {
        const { data, error } = await supabase.functions.invoke('admin-stats');
        if (error) throw error;
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
        toast({ title: 'Erro ao carregar estatísticas', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetch();
  }, [user]);

  if (isAdmin === false) return <Navigate to="/" replace />;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Monitoramento geral da plataforma</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} label="Usuários" value={stats.totals.users} color="bg-primary/10 text-primary" />
        <StatCard icon={Presentation} label="Propostas" value={stats.totals.presentations} sub={`${stats.thisMonth.presentations} este mês`} color="bg-blue-500/10 text-blue-500" />
        <StatCard icon={Megaphone} label="Campanhas" value={stats.totals.campaigns} color="bg-amber-500/10 text-amber-500" />
        <StatCard icon={Eye} label="Visualizações" value={stats.totals.views} sub={`${stats.thisMonth.views} este mês`} color="bg-emerald-500/10 text-emerald-500" />
        <StatCard icon={Mail} label="Emails Enviados" value={stats.totals.emails} sub={`${stats.thisMonth.emails} este mês`} color="bg-purple-500/10 text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Top Usuários
            </CardTitle>
            <CardDescription>Por número de propostas geradas</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Propostas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topUsers.map((u, i) => (
                  <TableRow key={u.userId}>
                    <TableCell className="font-medium text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.company}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={i === 0 ? 'default' : 'secondary'}>{u.count}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {stats.topUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum dado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Presentations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Presentation className="w-5 h-5 text-primary" />
              Propostas Recentes
            </CardTitle>
            <CardDescription>Últimas 20 propostas geradas</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resposta</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentPresentations.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.business_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {p.status === 'completed' ? 'Concluída' : p.status === 'pending' ? 'Pendente' : p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          p.lead_response === 'accepted' ? 'border-emerald-500/30 text-emerald-500' :
                          p.lead_response === 'rejected' ? 'border-destructive/30 text-destructive' :
                          ''
                        }`}
                      >
                        {p.lead_response === 'accepted' ? 'Aceita' : p.lead_response === 'rejected' ? 'Recusada' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
                {stats.recentPresentations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum dado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
