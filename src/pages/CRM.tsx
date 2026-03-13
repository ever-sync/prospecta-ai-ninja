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
import {
  Loader2,
  Search,
  Users,
  UserCheck,
  UserX,
  Clock,
  Filter,
  LayoutGrid,
  List,
  Plus,
  X,
  Tag,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
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
  { name: 'Aceitas', color: '#EF3333', position: 3, is_default: true, default_status: 'responded' },
];

const COLOR_PALETTE = ['#ef4444', '#f59e0b', '#EF3333', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#64748b', '#a855f7'];

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
      const { data: stagesData } = await supabase.from('pipeline_stages').select('*').eq('user_id', user.id).order('position');

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

  const categories = useMemo(() => {
    const cats = new Set<string>();
    leads.forEach((l) => {
      if (l.business_category) cats.add(l.business_category);
    });
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
    { title: 'Total de leads', value: total, icon: Users, dark: true, description: 'Volume no CRM' },
    { title: 'Prontos', value: ready, icon: UserCheck, dark: false, description: 'Aptos para envio' },
    { title: 'Respondidos', value: responded, icon: Clock, dark: false, description: 'Com retorno do lead' },
    { title: 'Pendentes', value: pending, icon: UserX, dark: false, description: 'Precisam de acao' },
  ];

  const getLeadsForStage = (stage: PipelineStage) =>
    filtered.filter((l) => {
      if (l.pipeline_stage_id) return l.pipeline_stage_id === stage.id;
      if (stage.is_default && stage.default_status) return (l.status || 'pending') === stage.default_status;
      return false;
    });

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

    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, pipeline_stage_id: stage.id, status: stage.default_status || l.status } : l)));

    const { error } = await supabase.from('presentations').update(updateData as never).eq('id', leadId);
    if (error) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? lead : l)));
      toast.error('Erro ao mover lead');
    } else {
      toast.success(`Lead movido para ${stage.name}`);
    }
  };

  const handleAddStage = async () => {
    if (!user || !newStageName.trim()) return;
    const maxPos = stages.length > 0 ? Math.max(...stages.map((s) => s.position)) : -1;
    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert({
        user_id: user.id,
        name: newStageName.trim(),
        color: newStageColor,
        position: maxPos + 1,
        is_default: false,
      })
      .select('*')
      .single();

    if (error) {
      toast.error('Erro ao criar etapa');
      return;
    }
    setStages((prev) => [...prev, data as PipelineStage]);
    setNewStageName('');
    setNewStageColor('#3b82f6');
    setShowAddStage(false);
    toast.success('Etapa criada');
  };

  const handleDeleteStage = async (stage: PipelineStage) => {
    const pendingStage = stages.find((s) => s.is_default && s.default_status === 'pending');
    if (pendingStage) {
      const affectedLeads = leads.filter((l) => l.pipeline_stage_id === stage.id);
      if (affectedLeads.length > 0) {
        await supabase.from('presentations').update({ pipeline_stage_id: pendingStage.id, status: 'pending' } as never).eq('pipeline_stage_id', stage.id);
        setLeads((prev) => prev.map((l) => (l.pipeline_stage_id === stage.id ? { ...l, pipeline_stage_id: pendingStage.id, status: 'pending' } : l)));
      }
    }

    const { error } = await supabase.from('pipeline_stages').delete().eq('id', stage.id);
    if (error) {
      toast.error('Erro ao remover etapa');
      return;
    }
    setStages((prev) => prev.filter((s) => s.id !== stage.id));
    setDeletingStage(null);
    toast.success('Etapa removida');
  };

  const handleUpdateColor = async (stageId: string, color: string) => {
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, color } : s)));
    await supabase.from('pipeline_stages').update({ color }).eq('id', stageId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-[#EF3333]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
      <section className="rounded-[24px] border border-[#ececf0] bg-white px-4 py-5 shadow-[0_14px_36px_rgba(20,20,24,0.06)] sm:rounded-[28px] sm:px-5 sm:py-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#75757d]">Operacao Comercial</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#1A1A1A] sm:text-3xl lg:text-4xl">
              <Workflow className="h-7 w-7 text-[#EF3333]" />
              CRM
            </h1>
            <p className="mt-2 text-sm text-[#66666d] lg:text-base">Organize o funil, mova leads entre etapas e acompanhe sua operacao no mesmo padrao visual do dashboard.</p>
          </div>
          <div className="rounded-2xl border border-[#f2d4d8] bg-[#fff5f6] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b94456]">Recomendado</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-[#7f2432]">
              <Sparkles className="h-4 w-4" />
              Priorize follow-up dos pendentes
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.25 }}>
            <Card
              className={cn(
                'h-full rounded-[22px] border p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]',
                s.dark ? 'border-[#1E1E24] bg-[#17171D] text-white' : 'border-[#ececf0] bg-white text-[#1A1A1A]'
              )}
            >
              <div className="flex items-center justify-between">
                <p className={cn('text-sm', s.dark ? 'text-white/75' : 'text-[#6f6f76]')}>{s.title}</p>
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-2xl', s.dark ? 'bg-[#EF3333]' : 'bg-[#fff0f1]')}>
                  <s.icon className={cn('h-[18px] w-[18px]', s.dark ? 'text-white' : 'text-[#EF3333]')} strokeWidth={1.8} />
                </div>
              </div>
              <p className={cn('mt-3 text-3xl font-semibold tracking-tight', s.dark ? 'text-white' : 'text-[#1A1A1A]')}>{s.value}</p>
              <p className={cn('mt-1 text-sm', s.dark ? 'text-white/65' : 'text-[#7a7a82]')}>{s.description}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="rounded-[24px] border border-[#ececf0] bg-white shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-base font-semibold text-[#1A1A1A]">Pipeline de Leads</CardTitle>
              <div className="flex items-center rounded-xl border border-[#ececf0] bg-[#f4f4f6] p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 rounded-lg px-3 text-xs gap-1.5',
                    viewMode === 'kanban' ? 'bg-white text-[#1A1A1A] shadow-[inset_0_0_0_1px_rgba(239,51,51,0.2)]' : 'text-[#66666d]'
                  )}
                  onClick={() => setViewMode('kanban')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Kanban
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 rounded-lg px-3 text-xs gap-1.5',
                    viewMode === 'table' ? 'bg-white text-[#1A1A1A] shadow-[inset_0_0_0_1px_rgba(239,51,51,0.2)]' : 'text-[#66666d]'
                  )}
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-3.5 w-3.5" />
                  Lista
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8b92]" />
                <Input
                  placeholder="Buscar lead..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border-[#e6e6eb] bg-[#fcfcfd] pl-9 text-[#1A1A1A] focus-visible:ring-[#EF3333] sm:w-[230px]"
                />
              </div>

              {categories.length > 0 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-[#e6e6eb] bg-[#fcfcfd] text-[#1A1A1A] focus:ring-[#EF3333] sm:w-[190px]">
                    <Tag className="mr-2 h-4 w-4 text-[#8b8b92]" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {viewMode === 'table' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-[#e6e6eb] bg-[#fcfcfd] text-[#1A1A1A] focus:ring-[#EF3333] sm:w-[170px]">
                    <Filter className="mr-2 h-4 w-4 text-[#8b8b92]" />
                    <SelectValue placeholder="Etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas etapas</SelectItem>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.default_status || s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {viewMode === 'kanban' ? (
            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scrollbar-hidden px-1 pb-3 touch-pan-x">
              {stages.map((stage) => {
                const columnLeads = getLeadsForStage(stage);
                const isDragOver = dragOverColumn === stage.id;

                return (
                  <div
                    key={stage.id}
                    className={cn(
                      'w-[86vw] max-w-[280px] snap-start shrink-0 rounded-[20px] border border-[#e8e8ee] bg-[#fbfbfd] transition-all duration-200 sm:w-[280px]',
                      isDragOver ? 'ring-2 ring-[#EF3333]/35 bg-[#fff7f8]' : ''
                    )}
                    onDragOver={(e) => handleDragOver(e, stage.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, stage)}
                  >
                    <div className="flex items-center justify-between border-b border-[#ececf0] px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-[#d8d8df] transition-all hover:ring-2 hover:ring-[#EF3333]/45"
                              style={{ backgroundColor: stage.color }}
                              title="Mudar cor"
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto rounded-xl border border-[#ececf0] bg-white p-3" align="start">
                            <div className="grid grid-cols-6 gap-1.5">
                              {COLOR_PALETTE.map((c) => (
                                <button
                                  key={c}
                                  className={cn('h-7 w-7 rounded-full transition-all hover:scale-110', stage.color === c ? 'ring-2 ring-[#EF3333] ring-offset-2 ring-offset-white' : 'ring-1 ring-[#dddde4]')}
                                  style={{ backgroundColor: c }}
                                  onClick={() => handleUpdateColor(stage.id, c)}
                                />
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <span className="truncate text-sm font-semibold text-[#1A1A1A]">{stage.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="h-5 min-w-[22px] justify-center rounded-full bg-[#f1f1f5] text-xs text-[#4d4d56]">
                          {columnLeads.length}
                        </Badge>
                        {!stage.is_default && (
                          <button
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-[#8c8c94] transition-colors hover:bg-[#fff0f2] hover:text-[#bc374e]"
                            onClick={() => setDeletingStage(stage)}
                            title="Remover etapa"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="min-h-[120px] space-y-2 p-2">
                      <AnimatePresence mode="popLayout">
                        {columnLeads.map((lead) => (
                          <KanbanCard key={lead.id} lead={lead} onDragStart={handleDragStart} />
                        ))}
                      </AnimatePresence>

                      {columnLeads.length === 0 && <div className="flex h-20 items-center justify-center text-xs text-[#a0a0a8]">Arraste leads aqui</div>}
                    </div>
                  </div>
                );
              })}

              <button
                className="flex min-h-[210px] w-[86vw] max-w-[280px] snap-start shrink-0 flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-[#e2e2e8] bg-[#fafafd] text-[#7e7e86] transition-all hover:border-[#EF3333]/45 hover:bg-[#fff5f6] hover:text-[#b73549] sm:w-[280px]"
                onClick={() => setShowAddStage(true)}
              >
                <Plus className="h-6 w-6" />
                <span className="mt-2 text-sm font-medium">Adicionar Etapa</span>
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#7d7d84]">Nenhum lead encontrado</p>
          ) : (
            <div className="overflow-x-auto scrollbar-hidden rounded-[18px] border border-[#ececf0]">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="border-b border-[#ececf0] bg-[#f9f9fb] hover:bg-[#f9f9fb]">
                    <TableHead className="font-semibold text-[#1A1A1A]">Empresa</TableHead>
                    <TableHead className="font-semibold text-[#1A1A1A]">Categoria</TableHead>
                    <TableHead className="font-semibold text-[#1A1A1A]">Telefone</TableHead>
                    <TableHead className="font-semibold text-[#1A1A1A]">Etapa</TableHead>
                    <TableHead className="font-semibold text-[#1A1A1A]">Resposta</TableHead>
                    <TableHead className="font-semibold text-[#1A1A1A]">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => {
                    const stage = stages.find((s) => (lead.pipeline_stage_id ? s.id === lead.pipeline_stage_id : s.is_default && s.default_status === (lead.status || 'pending')));
                    return (
                      <TableRow key={lead.id} className="border-b border-[#f0f0f3] hover:bg-[#fafafd]">
                        <TableCell className="font-medium text-[#1A1A1A]">{lead.business_name || '-'}</TableCell>
                        <TableCell className="text-[#65656d]">{lead.business_category || '-'}</TableCell>
                        <TableCell className="text-[#65656d]">{lead.business_phone || '-'}</TableCell>
                        <TableCell>
                          {stage ? (
                            <Badge variant="outline" className="gap-1.5 rounded-full border-[#e8e8ee] bg-[#f8f8fa] text-[#4f4f58]">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                              {stage.name}
                            </Badge>
                          ) : (
                            <span className="text-[#7a7a82]">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.lead_response && lead.lead_response !== 'pending' ? (
                            <Badge variant="outline" className="rounded-full border-[#f2d4d8] bg-[#fff3f5] text-[#9b2a3d]">
                              Sim
                            </Badge>
                          ) : (
                            <span className="text-sm text-[#7a7a82]">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-[#65656d]">{lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddStage} onOpenChange={setShowAddStage}>
        <DialogContent className="sm:max-w-md rounded-[22px] border border-[#ececf0] bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">Nova etapa do pipeline</DialogTitle>
            <DialogDescription className="text-[#6d6d75]">Crie uma nova etapa para organizar seus leads.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[#1A1A1A]">Nome da etapa</Label>
              <Input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="Ex: Negociacao, Follow-up..."
                className="h-10 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#EF3333]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1A1A1A]">Cor</Label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    className={cn('h-8 w-8 rounded-full transition-all hover:scale-110', newStageColor === c ? 'ring-2 ring-[#EF3333] ring-offset-2 ring-offset-white' : 'ring-1 ring-[#dddde4]')}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewStageColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-[#e6e6eb]" onClick={() => setShowAddStage(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddStage} disabled={!newStageName.trim()} className="rounded-xl gradient-primary text-primary-foreground">
              Criar etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deletingStage}
        onOpenChange={(open) => {
          if (!open) setDeletingStage(null);
        }}
      >
        <DialogContent className="sm:max-w-sm rounded-[22px] border border-[#ececf0] bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">Remover etapa</DialogTitle>
            <DialogDescription className="text-[#6d6d75]">Leads nessa etapa serao movidos para Pendente. Deseja continuar?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-[#e6e6eb]" onClick={() => setDeletingStage(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={() => deletingStage && handleDeleteStage(deletingStage)}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRM;
