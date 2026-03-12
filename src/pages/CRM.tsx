import { useState, useEffect, DragEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Users, UserCheck, UserX, Clock, Filter, LayoutGrid, List, Phone, Tag, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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

const STATUSES = ['pending', 'analyzing', 'ready', 'sent', 'responded', 'lost'] as const;

const statusConfig: Record<string, { label: string; className: string; columnClass: string }> = {
  pending: { label: 'Pendente', className: 'bg-muted text-muted-foreground', columnClass: 'border-t-muted-foreground' },
  analyzing: { label: 'Analisando', className: 'bg-warning/10 text-warning border-warning/30', columnClass: 'border-t-warning' },
  ready: { label: 'Pronto', className: 'bg-primary/10 text-primary border-primary/30', columnClass: 'border-t-primary' },
  sent: { label: 'Enviado', className: 'bg-accent text-accent-foreground', columnClass: 'border-t-accent-foreground' },
  responded: { label: 'Respondido', className: 'bg-success/10 text-success border-success/30', columnClass: 'border-t-success' },
  lost: { label: 'Perdido', className: 'bg-destructive/10 text-destructive border-destructive/30', columnClass: 'border-t-destructive' },
};

const CRM = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

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
  const responded = leads.filter((l) => l.lead_response && l.lead_response !== 'pending').length;
  const pending = leads.filter((l) => l.status === 'pending' || l.status === 'analyzing').length;

  const statCards = [
    { title: 'Total de Leads', value: total, icon: Users },
    { title: 'Prontos', value: ready, icon: UserCheck },
    { title: 'Respondidos', value: responded, icon: Clock },
    { title: 'Pendentes', value: pending, icon: UserX },
  ];

  const handleDragStart = (e: DragEvent<HTMLDivElement>, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = e.dataTransfer.getData('leadId');
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    // Optimistic update
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));

    const { error } = await supabase.from('presentations').update({ status: newStatus }).eq('id', leadId);
    if (error) {
      // Revert
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: lead.status } : l)));
      toast.error('Erro ao mover lead');
    } else {
      toast.success(`Lead movido para ${statusConfig[newStatus]?.label}`);
    }
  };

  const getLeadsByStatus = (status: string) =>
    filtered.filter((l) => (l.status || 'pending') === status);

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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }}>
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

      {/* Pipeline */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Pipeline de Leads</CardTitle>
              <div className="flex items-center bg-muted rounded-lg p-0.5">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1"
                  onClick={() => setViewMode('kanban')}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Kanban
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1"
                  onClick={() => setViewMode('table')}
                >
                  <List className="w-3.5 h-3.5" />
                  Lista
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar lead..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-full sm:w-[220px]" />
              </div>
              {viewMode === 'table' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-[160px]">
                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'kanban' ? (
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
              {STATUSES.map((status) => {
                const config = statusConfig[status];
                const columnLeads = getLeadsByStatus(status);
                const isDragOver = dragOverColumn === status;
                return (
                  <div
                    key={status}
                    className={`flex-shrink-0 w-[260px] rounded-xl border-t-[3px] bg-muted/30 flex flex-col transition-all duration-200 ${config.columnClass} ${isDragOver ? 'ring-2 ring-primary/40 bg-primary/5' : ''}`}
                    onDragOver={(e) => handleDragOver(e, status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, status)}
                  >
                    <div className="flex items-center justify-between p-3 pb-2">
                      <span className="text-sm font-semibold text-foreground">{config.label}</span>
                      <Badge variant="secondary" className="text-xs h-5 min-w-[20px] justify-center">
                        {columnLeads.length}
                      </Badge>
                    </div>
                    <div className="flex-1 p-2 pt-0 space-y-2 min-h-[120px]">
                      <AnimatePresence mode="popLayout">
                        {columnLeads.map((lead) => (
                          <motion.div
                            key={lead.id}
                            layoutId={lead.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            draggable
                            onDragStart={(e) => handleDragStart(e as unknown as DragEvent<HTMLDivElement>, lead.id)}
                            className="bg-background rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group"
                          >
                            <div className="flex items-start gap-2">
                              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <p className="text-sm font-medium text-foreground truncate">{lead.business_name || '—'}</p>
                                {lead.business_category && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Tag className="w-3 h-3" />
                                    <span className="truncate">{lead.business_category}</span>
                                  </div>
                                )}
                                {lead.business_phone && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Phone className="w-3 h-3" />
                                    <span>{lead.business_phone}</span>
                                  </div>
                                )}
                                {lead.created_at && (
                                  <p className="text-[10px] text-muted-foreground/60">
                                    {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {columnLeads.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">
                          Arraste leads aqui
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : filtered.length === 0 ? (
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
                          {lead.lead_response && lead.lead_response !== 'pending' ? (
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
