import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CampaignSavedViewChip = {
  id: string;
  name: string;
};

type CampaignViewsCardProps = {
  hasCustomFilters: boolean;
  defaultSavedViews: CampaignSavedViewChip[];
  activeDefaultViewId: string | null;
  defaultSavedViewCounts: Record<string, number>;
  savedViews: CampaignSavedViewChip[];
  activeSavedViewId: string | null;
  userSavedViewCounts: Record<string, number>;
  onOpenSaveCurrentViewDialog: () => void;
  onClearSavedViews: () => void;
  onApplySavedView: (savedView: CampaignSavedViewChip) => void;
  onRemoveSavedView: (savedViewId: string) => void;
  onReorderSavedView: (savedViewId: string, direction: 'left' | 'right') => void;
  onRenameSavedView: (savedView: CampaignSavedViewChip) => void;
};

export const CampaignViewsCard = ({
  hasCustomFilters,
  defaultSavedViews,
  activeDefaultViewId,
  defaultSavedViewCounts,
  savedViews,
  activeSavedViewId,
  userSavedViewCounts,
  onOpenSaveCurrentViewDialog,
  onClearSavedViews,
  onApplySavedView,
  onRemoveSavedView,
  onReorderSavedView,
  onRenameSavedView,
}: CampaignViewsCardProps) => (
  <Card className="rounded-[22px] border border-[#ececf0] bg-white p-5 shadow-[0_10px_24px_rgba(18,18,22,0.05)]">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-sm font-medium text-[#1A1A1A]">Views operacionais</p>
        <p className="mt-1 text-sm text-[#6f6f76]">
          Use atalhos padrao do sistema e guarde combinacoes proprias para retomar a triagem sem remontar tudo.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasCustomFilters}
          className="rounded-xl border-[#e6e6eb] bg-white text-[#5f5f67] hover:bg-[#f8f8fa]"
          onClick={onOpenSaveCurrentViewDialog}
        >
          Salvar visao atual
        </Button>
        {savedViews.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-[#f2d4d8] bg-white text-[#8c2535] hover:bg-[#fff3f5]"
            onClick={onClearSavedViews}
          >
            Limpar views
          </Button>
        )}
      </div>
    </div>

    <div className="mt-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#7b7b83]">Sugestoes do sistema</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {defaultSavedViews.map((savedView) => {
          const isActive = savedView.id === activeDefaultViewId;
          const count = defaultSavedViewCounts[savedView.id] || 0;
          return (
            <Button
              key={savedView.id}
              type="button"
              variant="outline"
              size="sm"
              className={`rounded-full gap-2 ${
                isActive
                  ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white hover:bg-[#2a2a2a]'
                  : count === 0
                    ? 'border-dashed border-[#ececf0] bg-white text-[#a0a0a8] hover:bg-[#fafafd]'
                    : 'border-[#e6e6eb] bg-[#fafafd] text-[#5f5f67] hover:bg-[#f2f2f6]'
              }`}
              onClick={() => onApplySavedView(savedView)}
            >
              <span>{savedView.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : count === 0
                      ? 'bg-[#fafafd] text-[#a0a0a8]'
                      : 'bg-white text-[#7b7b83]'
                }`}
              >
                {count}
              </span>
            </Button>
          );
        })}
      </div>
    </div>

    <div className="mt-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#7b7b83]">Views salvas</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {savedViews.length === 0 ? (
          <p className="text-sm text-[#7b7b83]">Nenhuma view salva ainda. Monte um filtro, busca ou ordenacao e salve para reutilizar.</p>
        ) : (
          savedViews.map((savedView, index) => {
            const isActive = savedView.id === activeSavedViewId;
            const count = userSavedViewCounts[savedView.id] || 0;
            return (
              <div
                key={savedView.id}
                className={`flex items-center gap-1 rounded-full p-1 ${
                  count === 0 && !isActive ? 'border border-dashed border-[#ececf0] bg-white' : 'border border-[#e6e6eb] bg-[#fafafd]'
                }`}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`h-8 rounded-full px-3 gap-2 ${
                    isActive
                      ? 'bg-[#1A1A1A] text-white hover:bg-[#2a2a2a]'
                      : count === 0
                        ? 'text-[#a0a0a8] hover:bg-[#fafafd]'
                        : 'text-[#5f5f67] hover:bg-[#f2f2f6]'
                  }`}
                  onClick={() => onApplySavedView(savedView)}
                >
                  <span>{savedView.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : count === 0
                          ? 'bg-[#fafafd] text-[#a0a0a8]'
                          : 'bg-white text-[#7b7b83]'
                    }`}
                  >
                    {count}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-[#5f5f67] hover:bg-[#f2f2f6]"
                  onClick={() => onRenameSavedView(savedView)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  className="h-8 w-8 rounded-full text-[#5f5f67] hover:bg-[#f2f2f6] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => onReorderSavedView(savedView.id, 'left')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === savedViews.length - 1}
                  className="h-8 w-8 rounded-full text-[#5f5f67] hover:bg-[#f2f2f6] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => onReorderSavedView(savedView.id, 'right')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-[#8c2535] hover:bg-[#fff3f5] hover:text-[#8c2535]"
                  onClick={() => onRemoveSavedView(savedView.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  </Card>
);
