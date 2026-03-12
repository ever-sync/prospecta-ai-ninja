import { useState, useEffect, DragEvent, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Users, UserCheck, UserX, Clock, Filter, LayoutGrid, List, Plus, X, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { KanbanCard } from '@/components/KanbanCard';

interface Lead {
  id: string;
  business_name: string | null;
  business_phone: string | null;
  business_website: string | null;
  business_category: string | null;
  status: string | null;
  lead_response: string | null;
  created_at: string | null;
  pipeline_stage_id: string | null;
}

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  default_status: string | null;
}

const DEFAULT_STAGES = [
  { name: 'Propostas Criadas', color: '#6366f1', position: 0, is_default: true, default_status: 'ready' },
  { name: 'Enviadas', color: '#f59e0b', position: 1, is_default: true, default_status: 'sent' },
  { name: 'Pendente', color: '#8b5cf6', position: 2, is_default: true, default_status: 'pending' },
  { name: 'Aceitas', color: '#22c55e', position: 3, is_default: true, default_status: 'responded' },
];

const COLOR_PALETTE = [
  '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#64748b', '#a855f7',
];

const CRM = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#3b82f6');
  const [deletingStage, setDeletingStage] = useState<PipelineStage | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: stagesData } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('user_id', user.id)
        .order('position');

      let finalStages: PipelineStage[];
      if (!stagesData || stagesData.length === 0) {
        const toInsert = DEFAULT_STAGES.map((s) => ({ ...s, user_id: user.id }));
        const { data: inserted } = await supabase.from('pipeline_stages').insert(toInsert).select('*').order('position');
        finalStages = (inserted || []) as PipelineStage[];
      } else {
        finalStages = stagesData as PipelineStage[];
      }
      setStages(finalStages);

      const { data: leadsData } = await supabase
        .from('presentations')
        .select('id, business_name, business_phone, business_website, business_category, status, lead_response, created_at, pipeline_stage_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (leadsData) setLeads(leadsData as Lead[]);
      setLoading(false);
    };
    load();
  }, [user]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    leads.forEach((l) => { if (l.business_category) cats.add(l.business_category); });
    return Array.from(cats).sort();
  }, [leads]);

  const filtered = leads.filter((l) => {
    const matchSearch = !search || l.business_name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || l.business_category === categoryFilter;
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
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

  const getLeadsForStage = (stage: PipelineStage) => {
    return filtered.filter((l) => {
      if (l.pipeline_stage_id) return l.pipeline_stage_id === stage.id;
      if (stage.is_default && stage.default_status) return (l.status || 'pending') === stage.default_status;
      return false;
    });
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(stageId);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = async (e: DragEvent<HTMLDivElement>, stage: PipelineStage) => {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = e.dataTransfer.getData('leadId');
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const updateData: Record<string, unknown> = { pipeline_stage_id: stage.id };
    if (stage.is_default && stage.default_status) updateData.status = stage.default_status;

    setLeads((prev) => prev.map((l) =>
      l.id === leadId ? { ...l, pipeline_stage_id: stage.id, status: (stage.default_status || l.status) } : l
    ));

    const { error } = await supabase.from('presentations').update(updateData as any).eq('id', leadId);
    if (error) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? lead : l)));
      toast.error('Erro ao mover lead');
    } else {
      toast.success(`Lead movido para ${stage.name}`);
    }
  };

  const handleAddStage = async () => {
    if (!user || !newStageName.trim()) return;
    const maxPos = stages.length > 0 ? Math.max(...stages.map(s => s.position)) : -1;
    const { data, error } = await supabase.from('pipeline_stages').insert({
      user_id: user.id,
      name: newStageName.trim(),
      color: newStageColor,
      position: maxPos + 1,
      is_default: false,
    }).select('*').single();

    if (error) { toast.error('Erro ao criar etapa'); return; }
    setStages(prev => [...prev, data as PipelineStage]);
    setNewStageName('');
    setNewStageColor('#3b82f6');
    setShowAddStage(false);
    toast.success('Etapa criada!');
  };

  const handleDeleteStage = async (stage: PipelineStage) => {
    const pendingStage = stages.find(s => s.is_default && s.default_status === 'pending');
    if (pendingStage) {
      const affectedLeads = leads.filter(l => l.pipeline_stage_id === stage.id);
      if (affectedLeads.length > 0) {
        await supabase.from('presentations')
          .update({ pipeline_stage_id: pendingStage.id, status: 'pending' } as any)
          .eq('pipeline_stage_id', stage.id);
        setLeads(prev => prev.map(l =>
          l.pipeline_stage_id === stage.id ? { ...l, pipeline_stage_id: pendingStage.id, status: 'pending' } : l
        ));
      }
    }

    const { error } = await supabase.from('pipeline_stages').delete().eq('id', stage.id);
    if (error) { toast.error('Erro ao remover etapa'); return; }
    setStages(prev => prev.filter(s => s.id !== stage.id));
    setDeletingStage(null);
    toast.success('Etapa removida');
  };

  const handleUpdateColor = async (stageId: string, color: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, color } : s));
    await supabase.from('pipeline_stages').update({ color }).eq('id', stageId);
  };

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
                <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={() => setViewMode('kanban')}>
                  <LayoutGrid className="w-3.5 h-3.5" /> Kanban
                </Button>
                <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={() => setViewMode('table')}>
                  <List className="w-3.5 h-3.5" /> Lista
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar lead..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-full sm:w-[220px]" />
              </div>
              {/* Category filter - available in both views */}
              {categories.length > 0 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-[180px]">
                    <Tag className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {viewMode === 'table' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-[160px]">
                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas etapas</SelectItem>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.default_status || s.id}>{s.name}</SelectItem>
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
              {stages.map((stage) => {
                const columnLeads = getLeadsForStage(stage);
                const isDragOver = dragOverColumn === stage.id;
                return (
                  <div
                    key={stage.id}
                    className={`flex-shrink-0 w-[260px] rounded-xl border-t-[3px] bg-muted/30 flex flex-col transition-all duration-200 ${isDragOver ? 'ring-2 ring-primary/40 bg-primary/5' : ''}`}
                    style={{ borderTopColor: stage.color }}
                    onDragOver={(e) => handleDragOver(e, stage.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, stage)}
                  >
                    <div className="flex items-center justify-between p-3 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="w-3.5 h-3.5 rounded-full flex-shrink-0 cursor-pointer ring-1 ring-border hover:ring-2 hover:ring-primary/50 transition-all"
                              style={{ backgroundColor: stage.color }}
                              title="Mudar cor"
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3" align="start">
                            <div className="grid grid-cols-6 gap-1.5">
                              {COLOR_PALETTE.map((c) => (
                                <button
                                  key={c}
                                  className={`w-7 h-7 rounded-full transition-all hover:scale-110 ${stage.color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'ring-1 ring-border'}`}
                                  style={{ backgroundColor: c }}
                                  onClick={() => handleUpdateColor(stage.id, c)}
                                />
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <span className="text-sm font-semibold text-foreground truncate">{stage.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs h-5 min-w-[20px] justify-center">{columnLeads.length}</Badge>
                        {!stage.is_default && (
                          <button
                            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => setDeletingStage(stage)}
                            title="Remover etapa"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 p-2 pt-0 space-y-2 min-h-[120px]">
                      <AnimatePresence mode="popLayout">
                        {columnLeads.map((lead) => (
                          <KanbanCard key={lead.id} lead={lead} onDragStart={handleDragStart} />
                        ))}
                      </AnimatePresence>
                      {columnLeads.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">Arraste leads aqui</div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div
                className="flex-shrink-0 w-[260px] rounded-xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center min-h-[200px] cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
                onClick={() => setShowAddStage(true)}
              >
                <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                  <Plus className="w-6 h-6" />
                  <span className="text-sm font-medium">Adicionar Etapa</span>
                </div>
              </div>
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
                    <TableHead>Etapa</TableHead>
                    <TableHead>Resposta</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => {
                    const stage = stages.find(s =>
                      lead.pipeline_stage_id ? s.id === lead.pipeline_stage_id : s.is_default && s.default_status === (lead.status || 'pending')
                    );
                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.business_name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.business_category || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.business_phone || '—'}</TableCell>
                        <TableCell>
                          {stage && (
                            <Badge variant="outline" className="gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                              {stage.name}
                            </Badge>
                          )}
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

      {/* Add Stage Dialog */}
      <Dialog open={showAddStage} onOpenChange={setShowAddStage}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Etapa do Pipeline</DialogTitle>
            <DialogDescription>Crie uma nova etapa para organizar seus leads.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da etapa</Label>
              <Input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="Ex: Negociação, Follow-up..." />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${newStageColor === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'ring-1 ring-border'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewStageColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStage(false)}>Cancelar</Button>
            <Button onClick={handleAddStage} disabled={!newStageName.trim()}>Criar Etapa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Stage Confirmation */}
      <Dialog open={!!deletingStage} onOpenChange={(o) => { if (!o) setDeletingStage(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover etapa</DialogTitle>
            <DialogDescription>Leads nessa etapa serão movidos para "Pendente". Deseja continuar?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingStage(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deletingStage && handleDeleteStage(deletingStage)}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRM;
