import { useMemo, useState } from "react";
import { FilterX, Globe, MapPin, Plus, Radar, Search, ShieldAlert, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  SearchFilters as Filters,
  AVAILABLE_NICHES,
  SearchRefinementFilters,
} from "@/types/business";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  onSearch: (filters: Filters) => void;
  isLoading: boolean;
  hasSearched?: boolean;
  totalResults?: number;
  filteredResults?: number;
  refinementFilters: SearchRefinementFilters;
  onRefinementChange: (partial: Partial<SearchRefinementFilters>) => void;
  onClearRefinements: () => void;
}

export const SearchFilters = ({
  onSearch,
  isLoading,
  hasSearched = false,
  totalResults = 0,
  filteredResults = 0,
  refinementFilters,
  onRefinementChange,
  onClearRefinements,
}: SearchFiltersProps) => {
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [customNiche, setCustomNiche] = useState("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(5);

  const toggleNiche = (value: string) => {
    setSelectedNiches((prev) =>
      prev.includes(value) ? prev.filter((n) => n !== value) : [...prev, value]
    );
  };

  const addCustomNiche = () => {
    const trimmed = customNiche.trim();
    if (trimmed && !selectedNiches.includes(trimmed)) {
      setSelectedNiches((prev) => [...prev, trimmed]);
      setCustomNiche("");
    }
  };

  const handleSearch = () => {
    if (selectedNiches.length === 0 || !location.trim()) return;
    onSearch({ niches: selectedNiches, location: location.trim(), radius });
  };

  const canSearch = selectedNiches.length > 0 && location.trim().length > 0;

  const searchSummary = useMemo(() => {
    if (!canSearch) {
      return "Defina nicho, localizacao e raio para montar uma varredura consultiva.";
    }

    return `${selectedNiches.length} nicho(s) em ${location.trim()} com varredura de ${radius} km.`;
  }, [canSearch, location, radius, selectedNiches.length]);

  const activeRefinementCount = useMemo(
    () =>
      Object.entries(refinementFilters).filter(
        ([key, value]) =>
          !(
            (key === "sortBy" && value === "score_desc") ||
            (key !== "sortBy" && value === "all")
          ),
      ).length,
    [refinementFilters],
  );

  const refinementOptionClass =
    "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all duration-200";

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-[#1d1d22] bg-[#111115] p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              Command Panel
            </p>
            <h3 className="mt-2 text-xl font-semibold">Monte a proxima leitura de mercado</h3>
          </div>
          <div className="rounded-2xl bg-white/6 p-3 text-[#EF3333]">
            <Radar className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Nicho</p>
            <p className="mt-2 text-sm font-medium text-white/90">
              {selectedNiches.length > 0 ? `${selectedNiches.length} ativo(s)` : "Ainda nao definido"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Local</p>
            <p className="mt-2 truncate text-sm font-medium text-white/90">
              {location.trim() || "Aguardando localizacao"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Raio</p>
            <p className="mt-2 text-sm font-medium text-white/90">{radius} km de cobertura</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#f24d62]/20 bg-[#EF3333]/10 px-4 py-3">
          <p className="text-sm leading-relaxed text-white/85">{searchSummary}</p>
        </div>

        {hasSearched && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Ultima varredura</p>
              <p className="mt-1 text-sm font-medium text-white/90">{totalResults} lead(s) retornado(s)</p>
            </div>
            <Badge className="rounded-full border border-[#EF3333]/35 bg-[#EF3333]/15 text-[#ffb6bf]">
              Sessao ativa
            </Badge>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-medium text-[#1A1A1A]">
          <Target className="h-4 w-4 text-[#EF3333]" />
          Nichos-alvo
        </Label>

        <div className="flex gap-2">
          <Input
            placeholder="Digite um nicho personalizado..."
            value={customNiche}
            onChange={(e) => setCustomNiche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomNiche())}
            className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={addCustomNiche}
            disabled={!customNiche.trim()}
            className="h-11 w-11 rounded-xl border-[#e6e6eb] bg-white hover:bg-[#fff1f3] hover:text-[#EF3333]"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {AVAILABLE_NICHES.map((niche) => (
            <Badge
              key={niche.value}
              variant="outline"
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all duration-200",
                selectedNiches.includes(niche.value)
                  ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                  : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]"
              )}
              onClick={() => toggleNiche(niche.value)}
            >
              {niche.label}
            </Badge>
          ))}

          {selectedNiches
            .filter((n) => !AVAILABLE_NICHES.some((item) => item.value === n))
            .map((niche) => (
              <Badge
                key={niche}
                variant="outline"
                className="cursor-pointer rounded-full border border-[#ef3333]/45 bg-[#fff2f4] px-3 py-1.5 text-xs text-[#8f2434]"
                onClick={() => toggleNiche(niche)}
              >
                {niche} x
              </Badge>
            ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium text-[#1A1A1A]">
          <MapPin className="h-4 w-4 text-[#EF3333]" />
          Base geografica
        </Label>
        <Input
          id="location"
          placeholder="Ex: Sao Paulo, SP ou Avenida Paulista"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
        />
      </div>

      <div className="space-y-3">
        <Label className="flex items-center justify-between text-sm font-medium text-[#1A1A1A]">
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[#EF3333]" />
            Intensidade da varredura
          </span>
          <span className="font-semibold text-[#EF3333]">{radius} km</span>
        </Label>
        <Slider
          value={[radius]}
          onValueChange={(value) => setRadius(value[0])}
          min={1}
          max={50}
          step={1}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-[#7c7c83]">
          <span>Foco local</span>
          <span>Busca expandida</span>
        </div>
      </div>

      <Button
        onClick={handleSearch}
        disabled={!canSearch || isLoading}
        className="h-12 w-full rounded-xl bg-[#EF3333] font-semibold text-white shadow-[0_16px_30px_rgba(239,51,51,0.25)] transition-all duration-200 hover:bg-[#d92a3f] disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Executando varredura...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Radar className="h-4 w-4" />
            Iniciar Scanner Consultivo
          </span>
        )}
      </Button>

      <div className="rounded-[24px] border border-[#ececf0] bg-[#fafafc] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a8a92]">
              Refinamento
            </p>
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
    </div>
  );
};
