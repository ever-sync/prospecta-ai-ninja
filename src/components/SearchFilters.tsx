import { useEffect, useMemo, useState } from "react";
import { ChevronDown, MapPin, Plus, Radar, Search, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_SEARCH_ADVANCED_FILTERS,
  SearchAdvancedFilters,
  SearchFilters as Filters,
  AVAILABLE_NICHES,
} from "@/types/business";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  onSearch: (filters: Filters) => void;
  isLoading: boolean;
  hasSearched?: boolean;
  totalResults?: number;
}

const LAST_SEARCH_STORAGE_KEY = "envpro:last-search-filters";

const RADIUS_PRESETS = [
  { label: "Foco local", value: 3, helper: "Ideal para rua, quarteirao ou um polo comercial bem proximo." },
  { label: "Bairro", value: 8, helper: "Bom para recortes de bairro com volume util sem diluir demais." },
  { label: "Cidade", value: 15, helper: "Equilibrio entre cobertura e relevancia em centros urbanos." },
  { label: "Regional", value: 30, helper: "Busca ampla para testar mercado ou cidades muito espalhadas." },
] as const;

export const SearchFilters = ({
  onSearch,
  isLoading,
}: SearchFiltersProps) => {
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [customNiche, setCustomNiche] = useState("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(5);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SearchAdvancedFilters>(DEFAULT_SEARCH_ADVANCED_FILTERS);

  const nicheLabelMap = useMemo(
    () => new Map(AVAILABLE_NICHES.map((niche) => [niche.value, niche.label])),
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawSavedSearch = window.localStorage.getItem(LAST_SEARCH_STORAGE_KEY);
      if (!rawSavedSearch) return;

      const savedSearch = JSON.parse(rawSavedSearch) as Partial<Filters>;
      if (!Array.isArray(savedSearch.niches) || typeof savedSearch.location !== "string" || typeof savedSearch.radius !== "number") {
        return;
      }

      setSelectedNiches(savedSearch.niches.filter((item): item is string => typeof item === "string"));
      setLocation(savedSearch.location);
      setRadius(savedSearch.radius);
      setAdvancedFilters({
        ...DEFAULT_SEARCH_ADVANCED_FILTERS,
        ...(savedSearch.advanced || {}),
      });
    } catch (error) {
      console.error("Error loading saved search filters:", error);
    }
  }, []);

  const updateAdvancedFilter = <K extends keyof SearchAdvancedFilters>(
    key: K,
    value: SearchAdvancedFilters[K],
  ) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleNiche = (value: string) => {
    setSelectedNiches((prev) =>
      prev.includes(value) ? prev.filter((n) => n !== value) : [...prev, value],
    );
  };

  const addCustomNiche = () => {
    const trimmed = customNiche.trim();
    if (!trimmed) return;

    const matchedNiche = AVAILABLE_NICHES.find(
      (niche) =>
        niche.value.toLowerCase() === trimmed.toLowerCase() || niche.label.toLowerCase() === trimmed.toLowerCase(),
    );

    const nicheValue = matchedNiche?.value ?? trimmed;
    if (selectedNiches.includes(nicheValue)) {
      setCustomNiche("");
      return;
    }

    setSelectedNiches((prev) => [...prev, nicheValue]);
    setCustomNiche("");
  };

  const persistSearch = () => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      LAST_SEARCH_STORAGE_KEY,
      JSON.stringify({
        niches: selectedNiches,
        location: location.trim(),
        radius,
        advanced: advancedFilters,
      }),
    );
  };

  const handleSearch = () => {
    if (selectedNiches.length === 0 || !location.trim()) return;
    persistSearch();
    onSearch({ niches: selectedNiches, location: location.trim(), radius, advanced: advancedFilters });
  };

  const canSearch = selectedNiches.length > 0 && location.trim().length > 0;
  const filteredAvailableNiches = useMemo(() => {
    const searchTerm = customNiche.trim().toLowerCase();

    return AVAILABLE_NICHES.filter((niche) => {
      if (selectedNiches.includes(niche.value)) return false;
      if (!searchTerm) return true;

      return (
        niche.label.toLowerCase().includes(searchTerm) || niche.value.toLowerCase().includes(searchTerm)
      );
    });
  }, [customNiche, selectedNiches]);

  const selectedNicheLabels = useMemo(
    () => selectedNiches.map((niche) => nicheLabelMap.get(niche) ?? niche),
    [nicheLabelMap, selectedNiches],
  );

  const expectedDepthPerNiche = useMemo(() => {
    if (selectedNiches.length === 0) return 0;
    return Math.min(10, Math.ceil(15 / selectedNiches.length));
  }, [selectedNiches.length]);

  const activeRadiusPreset = useMemo(() => {
    return (
      RADIUS_PRESETS.reduce((closest, preset) =>
        Math.abs(preset.value - radius) < Math.abs(closest.value - radius) ? preset : closest,
      ) ?? RADIUS_PRESETS[0]
    );
  }, [radius]);

  const activeAdvancedFilterCount = useMemo(() => {
    return [
      advancedFilters.district.trim().length > 0,
      advancedFilters.queryHint.trim().length > 0,
      advancedFilters.minRating !== "any",
      advancedFilters.websiteMode !== "any",
      advancedFilters.requirePhone,
      advancedFilters.requireEmail,
      advancedFilters.limitResults !== DEFAULT_SEARCH_ADVANCED_FILTERS.limitResults,
      advancedFilters.initialSort !== DEFAULT_SEARCH_ADVANCED_FILTERS.initialSort,
    ].filter(Boolean).length;
  }, [advancedFilters]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-medium text-[#1A1A1A]">
          <Target className="h-4 w-4 text-[#EF3333]" />
          Nichos-alvo
        </Label>

        <div className="flex gap-2">
          <Input
            placeholder="Busque ou crie um nicho..."
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

        <p className="text-xs leading-relaxed text-[#7c7c83]">
          Selecione poucos nichos por vez para aprofundar melhor cada recorte.
        </p>

        {selectedNiches.length > 0 ? (
          <div className="rounded-2xl border border-[#ececf0] bg-[#fafafc] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8d8d95]">Recorte ativo</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedNiches.map((niche) => (
                <Badge
                  key={niche}
                  variant="outline"
                  className="cursor-pointer rounded-full border border-[#ef3333]/45 bg-[#fff2f4] px-3 py-1.5 text-xs text-[#8f2434]"
                  onClick={() => toggleNiche(niche)}
                >
                  {nicheLabelMap.get(niche) ?? niche}
                  <X className="ml-1.5 h-3 w-3" />
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {filteredAvailableNiches.map((niche) => (
            <Badge
              key={niche.value}
              variant="outline"
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all duration-200",
                selectedNiches.includes(niche.value)
                  ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                  : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
              )}
              onClick={() => toggleNiche(niche.value)}
            >
              {niche.label}
            </Badge>
          ))}
        </div>

        {customNiche.trim() && filteredAvailableNiches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e5d5d8] bg-[#fff8f9] px-4 py-3 text-sm text-[#7a2a38]">
            Nenhum nicho padrao encontrado. Clique no botao <strong>+</strong> para criar esse recorte personalizado.
          </div>
        ) : null}
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
        <p className="text-xs leading-relaxed text-[#7c7c83]">
          Use cidade + UF para cobertura ampla, ou bairro / avenida para uma varredura mais cirurgica.
        </p>
      </div>

      <Collapsible open={showAdvancedSearch} onOpenChange={setShowAdvancedSearch}>
        <div className="rounded-[24px] border border-[#ececf0] bg-[#fcfcfd] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a8a92]">Busca avancada</p>
              <p className="mt-1 text-sm text-[#66666d]">
                Abra mais campos para deixar a coleta mais criteriosa.
              </p>
            </div>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-[#e6e6eb] bg-white px-3 hover:bg-[#fff8f9]"
              >
                {activeAdvancedFilterCount > 0 ? `${activeAdvancedFilterCount} ativo(s)` : "Configurar"}
                <ChevronDown
                  className={cn(
                    "ml-2 h-4 w-4 transition-transform duration-200",
                    showAdvancedSearch ? "rotate-180" : "rotate-0",
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-4 space-y-4">
            <div className="grid gap-4 grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="district" className="text-sm font-medium text-[#1A1A1A]">
                  Bairro ou regiao
                </Label>
                <Input
                  id="district"
                  placeholder="Ex: Vila Ema, Centro, Zona Sul"
                  value={advancedFilters.district}
                  onChange={(e) => updateAdvancedFilter("district", e.target.value)}
                  className="h-11 rounded-xl border-[#e6e6eb] bg-white focus-visible:ring-[#ef3333]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="queryHint" className="text-sm font-medium text-[#1A1A1A]">
                  Palavra-chave extra
                </Label>
                <Input
                  id="queryHint"
                  placeholder="Ex: premium, ortodontia, delivery"
                  value={advancedFilters.queryHint}
                  onChange={(e) => updateAdvancedFilter("queryHint", e.target.value)}
                  className="h-11 rounded-xl border-[#e6e6eb] bg-white focus-visible:ring-[#ef3333]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#1A1A1A]">Nota minima</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "any", label: "Qualquer nota" },
                  { value: "4_plus", label: "4.0+" },
                  { value: "4_5_plus", label: "4.5+" },
                ].map((option) => (
                  <Badge
                    key={option.value}
                    variant="outline"
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all duration-200",
                      advancedFilters.minRating === option.value
                        ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                        : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
                    )}
                    onClick={() =>
                      updateAdvancedFilter("minRating", option.value as SearchAdvancedFilters["minRating"])
                    }
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#1A1A1A]">Presenca de site</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "any", label: "Tanto faz" },
                  { value: "with_site", label: "Com site" },
                  { value: "without_site", label: "Sem site" },
                ].map((option) => (
                  <Badge
                    key={option.value}
                    variant="outline"
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all duration-200",
                      advancedFilters.websiteMode === option.value
                        ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                        : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
                    )}
                    onClick={() =>
                      updateAdvancedFilter("websiteMode", option.value as SearchAdvancedFilters["websiteMode"])
                    }
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-[#ececf0] bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Limite de resultados</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#7c7c83]">
                      Controle o tamanho do lote retornado nessa busca.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#fff2f4] px-2.5 py-1 text-xs font-semibold text-[#8f2434]">
                    {advancedFilters.limitResults}
                  </span>
                </div>
                <Slider
                  value={[advancedFilters.limitResults]}
                  onValueChange={(value) => updateAdvancedFilter("limitResults", value[0])}
                  min={5}
                  max={50}
                  step={5}
                  className="mt-4 py-2"
                />
                <div className="mt-2 flex justify-between text-xs text-[#7c7c83]">
                  <span>Curto</span>
                  <span>Lote maior</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#ececf0] bg-white p-3">
                <p className="text-sm font-medium text-[#1A1A1A]">Ordenacao inicial</p>
                <p className="mt-1 text-xs leading-relaxed text-[#7c7c83]">
                  Define como os leads chegam ordenados na primeira leitura.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { value: "score_desc", label: "Maior oportunidade" },
                    { value: "rating_desc", label: "Melhor rating" },
                    { value: "distance_asc", label: "Mais proximos" },
                  ].map((option) => (
                    <Badge
                      key={option.value}
                      variant="outline"
                      className={cn(
                        "cursor-pointer rounded-2xl border px-3 py-2 text-left text-xs transition-all duration-200",
                        advancedFilters.initialSort === option.value
                          ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                          : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
                      )}
                      onClick={() =>
                        updateAdvancedFilter("initialSort", option.value as SearchAdvancedFilters["initialSort"])
                      }
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  key: "requirePhone" as const,
                  label: "Exigir telefone",
                  helper: "Filtra resultados sem telefone identificado.",
                },
                {
                  key: "requireEmail" as const,
                  label: "Exigir email",
                  helper: "Mantem apenas leads com email visivel.",
                },
              ].map((item) => (
                <div key={item.key} className="rounded-2xl border border-[#ececf0] bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">{item.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#7c7c83]">{item.helper}</p>
                    </div>
                    <Switch
                      checked={advancedFilters[item.key]}
                      onCheckedChange={(checked) => updateAdvancedFilter(item.key, checked)}
                      className="data-[state=checked]:bg-[#EF3333]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

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
        <div className="flex flex-wrap gap-2">
          {RADIUS_PRESETS.map((preset) => (
            <Badge
              key={preset.label}
              variant="outline"
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all duration-200",
                Math.abs(radius - preset.value) <= 1
                  ? "border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]"
                  : "border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]",
              )}
              onClick={() => setRadius(preset.value)}
            >
              {preset.label}
            </Badge>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-[#7c7c83]">{activeRadiusPreset.helper}</p>
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
    </div>
  );
};
