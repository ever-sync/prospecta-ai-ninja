import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Users, UserCheck, UserX, Clock, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

interface Lead {
  id: string;
  business_name: string | null;
  business_phone: string | null;
  business_website: string | null;
  business_category: string | null;
  status: string | null;
  lead_response: string | null;
  created_at: string | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  analyzing: { label: 'Analisando', className: 'bg-warning/10 text-warning border-warning/30' },
  ready: { label: 'Pronto', className: 'bg-primary/10 text-primary border-primary/30' },
  sent: { label: 'Enviado', className: 'bg-accent text-accent-foreground' },
  responded: { label: 'Respondido', className: 'bg-success/10 text-success border-success/30' },
  lost: { label: 'Perdido', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const CRM = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    const fetchLeads = async () => {
      const { data } = await supabase
        .from('presentations')
        .select('id, business_name, business_phone, business_website, business_category, status, lead_response, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setLeads(data as Lead[]);
      setLoading(false);
    };
    fetchLeads();
  }, [user]);

  const filtered = leads.filter((l) => {
    const matchSearch = !search || l.business_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total = leads.length;
  const ready = leads.filter((l) => l.status === 'ready').length;
  const responded = leads.filter((l) => l.lead_response).length;
  const pending = leads.filter((l) => l.status === 'pending' || l.status === 'analyzing').length;

  const statCards = [
    { title: 'Total de Leads', value: total, icon: Users },
    { title: 'Prontos', value: ready, icon: UserCheck },
    { title: 'Respondidos', value: responded, icon: Clock },
    { title: 'Pendentes', value: pending, icon: UserX },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">CRM</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
          >
            <Card className="border-0 shadow-card h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
                <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                  <s.icon className="w-[18px] h-[18px] text-accent-foreground" strokeWidth={1.75} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-0 shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Pipeline de Leads</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar lead..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 w-full sm:w-[220px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[160px]">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="analyzing">Analisando</SelectItem>
                  <SelectItem value="ready">Pronto</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="responded">Respondido</SelectItem>
                  <SelectItem value="lost">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum lead encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resposta</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => {
                    const st = statusConfig[lead.status || 'pending'] || statusConfig.pending;
                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.business_name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.business_category || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.business_phone || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={st.className}>{st.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {lead.lead_response ? (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/30">Sim</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CRM;
