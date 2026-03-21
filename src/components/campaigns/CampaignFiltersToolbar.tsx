import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CampaignViewFilter = 'all' | 'attention' | 'completed';
type CampaignChannelFilter = 'all' | 'whatsapp' | 'email' | 'webhook';
type CampaignStatusFilter = 'all' | 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
type CampaignSortOption = 'priority' | 'recent' | 'oldest' | 'leads' | 'conversion';

type CampaignFiltersToolbarProps = {
  campaignViewFilter: CampaignViewFilter;
  channelFilter: CampaignChannelFilter;
  statusFilter: CampaignStatusFilter;
  sortOption: CampaignSortOption;
  searchTerm: string;
  hasCustomFilters: boolean;
  filterCounts: {
    all: number;
    attention: number;
    completed: number;
  };
  viewLabel: string;
  channelLabel: string;
  statusLabel: string;
  sortLabel: string;
  onSetCampaignViewFilter: (value: CampaignViewFilter) => void;
  onSetChannelFilter: (value: CampaignChannelFilter) => void;
  onSetStatusFilter: (value: CampaignStatusFilter) => void;
  onSetSortOption: (value: CampaignSortOption) => void;
  onSetSearchTerm: (value: string) => void;
  onResetFilters: () => void;
};

export const CampaignFiltersToolbar = ({
  campaignViewFilter,
  channelFilter,
  statusFilter,
  sortOption,
  searchTerm,
  hasCustomFilters,
  filterCounts,
  viewLabel,
  channelLabel,
  statusLabel,
  sortLabel,
  onSetCampaignViewFilter,
  onSetChannelFilter,
  onSetStatusFilter,
  onSetSortOption,
  onSetSearchTerm,
  onResetFilters,
}: CampaignFiltersToolbarProps) => (
  <>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`rounded-xl ${campaignViewFilter === 'all' ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white hover:bg-[#2a2a2a]' : 'border-[#e6e6eb] bg-white text-[#5f5f67] hover:bg-[#f8f8fa]'}`}
          onClick={() => onSetCampaignViewFilter('all')}
        >
          Todas ({filterCounts.all})
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`rounded-xl ${campaignViewFilter === 'attention' ? 'border-[#c2620a] bg-[#fff8f4] text-[#c2620a] hover:bg-[#fff0e6]' : 'border-[#f5d8c8] bg-white text-[#9b6c46] hover:bg-[#fff8f4]'}`}
          onClick={() => onSetCampaignViewFilter('attention')}
        >
          Acao necessaria ({filterCounts.attention})
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`rounded-xl ${campaignViewFilter === 'completed' ? 'border-[#2d7a4a] bg-[#eef8f3] text-[#2d7a4a] hover:bg-[#e2f2e9]' : 'border-[#cde8d9] bg-white text-[#2d7a4a] hover:bg-[#eef8f3]'}`}
          onClick={() => onSetCampaignViewFilter('completed')}
        >
          Concluidas ({filterCounts.completed})
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Input
          value={searchTerm}
          onChange={(event) => onSetSearchTerm(event.target.value)}
          placeholder="Buscar campanha..."
          className="h-9 w-full rounded-xl border-[#e6e6eb] bg-white text-[#5f5f67] lg:w-[220px]"
        />
        <Select value={channelFilter} onValueChange={(value) => onSetChannelFilter(value as CampaignChannelFilter)}>
          <SelectTrigger className="h-9 w-[170px] rounded-xl border-[#e6e6eb] bg-white text-[#5f5f67]">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="webhook">Webhook / n8n</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => onSetStatusFilter(value as CampaignStatusFilter)}>
          <SelectTrigger className="h-9 w-[170px] rounded-xl border-[#e6e6eb] bg-white text-[#5f5f67]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="scheduled">Agendada</SelectItem>
            <SelectItem value="sending">Enviando</SelectItem>
            <SelectItem value="sent">Enviada</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortOption} onValueChange={(value) => onSetSortOption(value as CampaignSortOption)}>
          <SelectTrigger className="h-9 w-[190px] rounded-xl border-[#e6e6eb] bg-white text-[#5f5f67]">
            <SelectValue placeholder="Ordenacao" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Prioridade operacional</SelectItem>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="oldest">Mais antigas</SelectItem>
            <SelectItem value="leads">Mais leads</SelectItem>
            <SelectItem value="conversion">Maior conversao</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasCustomFilters}
          className="rounded-xl border-[#e6e6eb] bg-white text-[#5f5f67] hover:bg-[#f8f8fa]"
          onClick={onResetFilters}
        >
          Limpar filtros
        </Button>
      </div>
    </div>

    {hasCustomFilters && (
      <div className="flex flex-wrap gap-2">
        {campaignViewFilter !== 'all' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-[#e6e6eb] bg-[#fafafd] text-[#5f5f67] hover:bg-[#f2f2f6]"
            onClick={() => onSetCampaignViewFilter('all')}
          >
            Visao: {viewLabel} ×
          </Button>
        )}
        {channelFilter !== 'all' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-[#e6e6eb] bg-[#fafafd] text-[#5f5f67] hover:bg-[#f2f2f6]"
            onClick={() => onSetChannelFilter('all')}
          >
            Canal: {channelLabel} ×
          </Button>
        )}
        {statusFilter !== 'all' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-[#e6e6eb] bg-[#fafafd] text-[#5f5f67] hover:bg-[#f2f2f6]"
            onClick={() => onSetStatusFilter('all')}
          >
            Status: {statusLabel} ×
          </Button>
        )}
        {sortOption !== 'priority' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-[#e6e6eb] bg-[#fafafd] text-[#5f5f67] hover:bg-[#f2f2f6]"
            onClick={() => onSetSortOption('priority')}
          >
            Ordenacao: {sortLabel} ×
          </Button>
        )}
        {searchTerm.trim().length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-[#e6e6eb] bg-[#fafafd] text-[#5f5f67] hover:bg-[#f2f2f6]"
            onClick={() => onSetSearchTerm('')}
          >
            Busca: {searchTerm.trim()} ×
          </Button>
        )}
      </div>
    )}
  </>
);
