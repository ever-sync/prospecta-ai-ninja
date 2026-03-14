import { useState } from 'react';
import { LayoutGrid, List, Plus, Save, Search, Sparkles, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CRMPipelineStage, CRMFilters, CRMMetricCards, CRMMode, CRMSavedView } from '@/types/crm';
import { cn } from '@/lib/utils';
import { slugifyCRMViewName } from '@/lib/crm/deriveLeadState';

type CRMViewBarProps = {
  mode: CRMMode;
  onModeChange: (mode: CRMMode) => void;
  filters: CRMFilters;
  onFiltersChange: (patch: Partial<CRMFilters>) => void;
  metrics: CRMMetricCards;
  categories: string[];
  channels: string[];
  stages: CRMPipelineStage[];
  views: CRMSavedView[];
  activeViewSlug: string;
  onSelectView: (slug: string) => void;
  onSaveView: (name: string) => Promise<boolean>;
  onOpenCreateStage: () => void;
};

const metricCards = [
  { key: 'readyNotSent', label: 'Prontas sem envio', accent: 'bg-[#fff4f6] text-[#b22135] border-[#f6c3ca]' },
  { key: 'followupDue', label: 'Follow-up vencido', accent: 'bg-[#fff8ef] text-[#9a5a10] border-[#f1d3a5]' },
  { key: 'openedNoResponse', label: 'Abertas sem resposta', accent: 'bg-[#eef4ff] text-[#355fc1] border-[#d8e4ff]' },
  { key: 'accepted', label: 'Aceitas', accent: 'bg-[#eefbf3] text-[#1f8f47] border-[#cdebd7]' },
] as const;

export const CRMViewBar = ({
  mode,
  onModeChange,
  filters,
  onFiltersChange,
  metrics,
  categories,
  channels,
  stages,
  views,
  activeViewSlug,
  onSelectView,
  onSaveView,
  onOpenCreateStage,
}: CRMViewBarProps) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveView = async () => {
    if (!viewName.trim()) return;
    setSaving(true);
    const ok = await onSaveView(viewName.trim());
    setSaving(false);
    if (!ok) return;
    setViewName('');
    setSaveDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((item) => (
          <Card key={item.key} className="rounded-[22px] border border-[#ececf0] bg-white p-4 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
            <Badge className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', item.accent)}>
              {item.label}
            </Badge>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1A1A1A]">
              {metrics[item.key]}
            </p>
          </Card>
        ))}
      </div>

      <Card className="rounded-[26px] border border-[#ececf0] bg-white p-5 shadow-[0_12px_32px_rgba(18,18,22,0.05)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-[#6d6d75]">Workspace comercial</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1A1A1A] lg:text-4xl">CRM</h1>
              <p className="mt-2 text-sm text-[#66666d]">
                Fila de acao, board e lista analitica no mesmo fluxo comercial.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-2xl border border-[#e7e7eb] bg-[#f8f8fa] p-1">
                <Button
                  type="button"
                  variant="ghost"
                  className={cn('rounded-xl px-3', mode === 'queue' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6b6b73]')}
                  onClick={() => onModeChange('queue')}
                >
                  <Workflow className="mr-2 h-4 w-4" />
                  Fila
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn('rounded-xl px-3', mode === 'kanban' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6b6b73]')}
                  onClick={() => onModeChange('kanban')}
                >
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Kanban
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn('rounded-xl px-3', mode === 'list' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6b6b73]')}
                  onClick={() => onModeChange('list')}
                >
                  <List className="mr-2 h-4 w-4" />
                  Lista
                </Button>
              </div>

              {mode === 'kanban' ? (
                <Button type="button" className="rounded-xl gradient-primary text-primary-foreground" onClick={onOpenCreateStage}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova coluna
                </Button>
              ) : null}

              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setSaveDialogOpen(true)}>
                <Save className="mr-2 h-4 w-4" />
                Salvar view
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {views.map((view) => {
              const slug = slugifyCRMViewName(view.name);
              return (
                <Button
                  key={view.id}
                  type="button"
                  variant="outline"
                  className={cn(
                    'rounded-full border-[#e7e7eb] bg-[#fafafd] px-3 text-[#5f5f67]',
                    activeViewSlug === slug && 'border-[#ef3333]/35 bg-[#fff2f4] text-[#a32438]'
                  )}
                  onClick={() => onSelectView(slug)}
                >
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  {view.name}
                </Button>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <div className="relative xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91919a]" />
              <Input
                value={filters.search}
                onChange={(event) => onFiltersChange({ search: event.target.value })}
                placeholder="Buscar empresa, categoria ou telefone"
                className="h-11 rounded-xl border-[#e6e6eb] pl-9"
              />
            </div>

            <Select value={filters.category} onValueChange={(value) => onFiltersChange({ category: value })}>
              <SelectTrigger className="h-11 rounded-xl border-[#e6e6eb]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.channel} onValueChange={(value) => onFiltersChange({ channel: value })}>
              <SelectTrigger className="h-11 rounded-xl border-[#e6e6eb]">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos canais</SelectItem>
                {channels.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {channel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.systemStatus} onValueChange={(value) => onFiltersChange({ systemStatus: value as CRMFilters['systemStatus'] })}>
              <SelectTrigger className="h-11 rounded-xl border-[#e6e6eb]">
                <SelectValue placeholder="Status do sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="ready">Criada</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="responded">Respondida</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.stageId} onValueChange={(value) => onFiltersChange({ stageId: value })}>
              <SelectTrigger className="h-11 rounded-xl border-[#e6e6eb]">
                <SelectValue placeholder="Etapa manual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas etapas</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.temperature} onValueChange={(value) => onFiltersChange({ temperature: value as CRMFilters['temperature'] })}>
              <SelectTrigger className="h-11 rounded-xl border-[#e6e6eb]">
                <SelectValue placeholder="Temperatura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas temperaturas</SelectItem>
                <SelectItem value="hot">Quente</SelectItem>
                <SelectItem value="warm">Morna</SelectItem>
                <SelectItem value="cold">Fria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn('rounded-full', filters.onlyReadyNotSent && 'border-[#ef3333]/35 bg-[#fff2f4] text-[#a32438]')}
              onClick={() => onFiltersChange({ onlyReadyNotSent: !filters.onlyReadyNotSent })}
            >
              Prontas sem envio
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn('rounded-full', filters.scoreBand === 'high' && 'border-[#ef3333]/35 bg-[#fff2f4] text-[#a32438]')}
              onClick={() => onFiltersChange({ scoreBand: filters.scoreBand === 'high' ? 'all' : 'high' })}
            >
              Score alto
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn('rounded-full', filters.onlyRejected && 'border-[#ef3333]/35 bg-[#fff2f4] text-[#a32438]')}
              onClick={() => onFiltersChange({ onlyRejected: !filters.onlyRejected, onlyAccepted: false })}
            >
              Recusadas
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar view do CRM</DialogTitle>
            <DialogDescription>
              Salve os filtros atuais para reutilizar esse recorte comercial depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="crm-view-name">Nome da view</Label>
            <Input
              id="crm-view-name"
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              placeholder="Ex: Follow-up da semana"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveView} disabled={saving || !viewName.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
