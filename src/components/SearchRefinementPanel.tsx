import { useMemo } from "react";
import { FilterX, Globe, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchRefinementFilters } from "@/types/business";
import { cn } from "@/lib/utils";

interface SearchRefinementPanelProps {
  hasSearched?: boolean;
  filteredResults?: number;
  refinementFilters: SearchRefinementFilters;
  onRefinementChange: (partial: Partial<SearchRefinementFilters>) => void;
  onClearRefinements: () => void;
}

export const SearchRefinementPanel = ({
  hasSearched = false,
  filteredResults = 0,
  refinementFilters,
  onRefinementChange,
  onClearRefinements,
}: SearchRefinementPanelProps) => {
  const activeRefinementCount = useMemo(
    () =>
      Object.entries(refinementFilters).filter(
        ([key, value]) =>
          !((key === "sortBy" && value === "score_desc") || (key !== "sortBy" && value === "all")),
      ).length,
    [refinementFilters],
  );

  const refinementOptionClass =
    "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all duration-200";

  return (
    <div className="rounded-[24px] border border-[#ececf0] bg-[#fafafc] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a8a92]">Refinamento</p>
          <h4 className="mt-1 text-base font-semibold text-[#1A1A1A]">Filtre por dor digital</h4>
          <p className="mt-1 text-sm text-[#66666d]">
            Afine os resultados com base nos sinais raspados de Google e site.
          </p>
        </div>
        {activeRefinementCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearRefinements}
            className="h-8 rounded-xl px-2 text-[#8a2434] hover:bg-[#fff1f3]"
          >
            <FilterX className="mr-1 h-3.5 w-3.5" />
            Limpar
          </Button>
        ) : null}
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <Label className="text-sm font-medium text-[#1A1A1A]">Atalhos inteligentes</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { value: "all", label: "Todos" },
              { value: "attack_now", label: "Ataque rapido" },
              { value: "consultative", label: "Consultivo" },
              { value: "premium", label: "Lead premium" },
              { value: "authority_gap", label: "Gap de autoridade" },
            ].map((option) => (
              <Badge
                key={option.value}
                variant="outline"
                className={cn(
                  refinementOptionClass,
                  refinementFilters.smartPreset === option.value
                    ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                    : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
                )}
                onClick={() =>
                  onRefinementChange({
                    smartPreset: option.value as SearchRefinementFilters["smartPreset"],
                  })
                }
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-2 text-sm font-medium text-[#1A1A1A]">
            <ShieldAlert className="h-4 w-4 text-[#EF3333]" />
            Presenca online
          </Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { value: "all", label: "Todas" },
              { value: "critical", label: "Critica" },
              { value: "warning", label: "Fraca / media" },
              { value: "healthy", label: "Consistente" },
            ].map((option) => (
              <Badge
                key={option.value}
                variant="outline"
                className={cn(
                  refinementOptionClass,
                  refinementFilters.presenceTone === option.value
                    ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                    : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
                )}
                onClick={() =>
                  onRefinementChange({
                    presenceTone: option.value as SearchRefinementFilters["presenceTone"],
                  })
                }
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="flex items-center gap-2 text-sm font-medium text-[#1A1A1A]">
              <Globe className="h-4 w-4 text-[#EF3333]" />
              Site e conversao
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { value: "all", label: "Todos" },
                { value: "with_site", label: "Com site" },
                { value: "without_site", label: "Sem site" },
              ].map((option) => (
                <Badge
                  key={option.value}
                  variant="outline"
                  className={cn(
                    refinementOptionClass,
                    refinementFilters.siteStatus === option.value
                      ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                      : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
                  )}
                  onClick={() =>
                    onRefinementChange({
                      siteStatus: option.value as SearchRefinementFilters["siteStatus"],
                    })
                  }
                >
                  {option.label}
                </Badge>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { value: "all", label: "Formulario: todos" },
                { value: "yes", label: "Com formulario" },
                { value: "no", label: "Sem formulario" },
              ].map((option) => (
                <Badge
                  key={option.value}
                  variant="outline"
                  className={cn(
                    refinementOptionClass,
                    refinementFilters.hasContactForm === option.value
                      ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                      : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
                  )}
                  onClick={() =>
                    onRefinementChange({
                      hasContactForm: option.value as SearchRefinementFilters["hasContactForm"],
                    })
                  }
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-[#1A1A1A]">Qualidade do contato</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { value: "all", label: "Todos" },
                { value: "complete", label: "Completo" },
                { value: "partial", label: "Parcial" },
                { value: "weak", label: "Fraco" },
              ].map((option) => (
                <Badge
                  key={option.value}
                  variant="outline"
                  className={cn(
                    refinementOptionClass,
                    refinementFilters.contactQuality === option.value
                      ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                      : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
                  )}
                  onClick={() =>
                    onRefinementChange({
                      contactQuality: option.value as SearchRefinementFilters["contactQuality"],
                    })
                  }
                >
                  {option.label}
                </Badge>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { value: "all", label: "Sociais: todos" },
                { value: "yes", label: "Com redes" },
                { value: "no", label: "Sem redes" },
              ].map((option) => (
                <Badge
                  key={option.value}
                  variant="outline"
                  className={cn(
                    refinementOptionClass,
                    refinementFilters.hasSocialLinks === option.value
                      ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                      : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
                  )}
                  onClick={() =>
                    onRefinementChange({
                      hasSocialLinks: option.value as SearchRefinementFilters["hasSocialLinks"],
                    })
                  }
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-sm font-medium text-[#1A1A1A]">Profundidade do conteudo</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { value: "all", label: "Todas" },
                { value: "low", label: "Baixa" },
                { value: "medium", label: "Media" },
                { value: "high", label: "Alta" },
              ].map((option) => (
                <Badge
                  key={option.value}
                  variant="outline"
                  className={cn(
                    refinementOptionClass,
                    refinementFilters.contentDepth === option.value
                      ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                      : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
                  )}
                  onClick={() =>
                    onRefinementChange({
                      contentDepth: option.value as SearchRefinementFilters["contentDepth"],
                    })
                  }
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-[#1A1A1A]">Nota minima</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { value: "all", label: "Qualquer nota" },
                { value: "4_plus", label: "4.0+" },
                { value: "4_5_plus", label: "4.5+" },
              ].map((option) => (
                <Badge
                  key={option.value}
                  variant="outline"
                  className={cn(
                    refinementOptionClass,
                    refinementFilters.minRating === option.value
                      ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                      : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
                  )}
                  onClick={() =>
                    onRefinementChange({
                      minRating: option.value as SearchRefinementFilters["minRating"],
                    })
                  }
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#ececf0] bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d8d95]">Ordenacao</p>
              <p className="mt-1 text-sm font-medium text-[#1A1A1A]">
                {refinementFilters.sortBy === "score_desc" && "Maior oportunidade"}
                {refinementFilters.sortBy === "pain_desc" && "Maior dor digital"}
                {refinementFilters.sortBy === "rating_desc" && "Maior reputacao"}
                {refinementFilters.sortBy === "distance_asc" && "Mais proximos"}
                {refinementFilters.sortBy === "contact_desc" && "Melhor contato"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "score_desc", label: "Score" },
                { value: "pain_desc", label: "Dor" },
                { value: "rating_desc", label: "Rating" },
                { value: "distance_asc", label: "Distancia" },
                { value: "contact_desc", label: "Contato" },
              ].map((option) => (
                <Badge
                  key={option.value}
                  variant="outline"
                  className={cn(
                    refinementOptionClass,
                    refinementFilters.sortBy === option.value
                      ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                      : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
                  )}
                  onClick={() =>
                    onRefinementChange({
                      sortBy: option.value as SearchRefinementFilters["sortBy"],
                    })
                  }
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {hasSearched ? (
          <div className="rounded-2xl border border-[#f2d4d8] bg-[#fff5f6] px-4 py-3">
            <p className="text-sm leading-relaxed text-[#7a2a38]">
              {filteredResults} lead(s) visivel(is) apos aplicar {activeRefinementCount} filtro(s) de refinamento.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
