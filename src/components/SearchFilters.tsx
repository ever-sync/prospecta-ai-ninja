import { useState } from 'react';
import { Search, MapPin, Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { SearchFilters as Filters, AVAILABLE_NICHES } from '@/types/business';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  onSearch: (filters: Filters) => void;
  isLoading: boolean;
}

export const SearchFilters = ({ onSearch, isLoading }: SearchFiltersProps) => {
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [customNiche, setCustomNiche] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(5);

  const toggleNiche = (value: string) => {
    setSelectedNiches((prev) => (prev.includes(value) ? prev.filter((n) => n !== value) : [...prev, value]));
  };

  const addCustomNiche = () => {
    const trimmed = customNiche.trim();
    if (trimmed && !selectedNiches.includes(trimmed)) {
      setSelectedNiches((prev) => [...prev, trimmed]);
      setCustomNiche('');
    }
  };

  const handleSearch = () => {
    if (selectedNiches.length === 0 || !location) return;
    onSearch({ niches: selectedNiches, location, radius });
  };

  const canSearch = selectedNiches.length > 0 && location.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-medium text-[#1A1A1A]">
          <Target className="h-4 w-4 text-[#EF3333]" />
          Nicho de Atuacao
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="Digite um nicho personalizado..."
            value={customNiche}
            onChange={(e) => setCustomNiche(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomNiche())}
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
                'cursor-pointer rounded-full border px-3 py-1 text-xs transition-all duration-200',
                selectedNiches.includes(niche.value)
                  ? 'border-[#ef3333]/45 bg-[#fff2f4] text-[#8f2434]'
                  : 'border-[#e6e6eb] bg-white text-[#6f6f76] hover:border-[#ef3333]/35 hover:bg-[#fff8f9]'
              )}
              onClick={() => toggleNiche(niche.value)}
            >
              {niche.label}
            </Badge>
          ))}

          {selectedNiches
            .filter((n) => !AVAILABLE_NICHES.some((an) => an.value === n))
            .map((n) => (
              <Badge
                key={n}
                variant="outline"
                className="cursor-pointer rounded-full border border-[#ef3333]/45 bg-[#fff2f4] px-3 py-1 text-xs text-[#8f2434]"
                onClick={() => toggleNiche(n)}
              >
                {n} x
              </Badge>
            ))}
        </div>
        {selectedNiches.length > 0 && <p className="text-xs text-[#6f6f76]">{selectedNiches.length} nicho(s) selecionado(s)</p>}
      </div>

      <div className="space-y-3">
        <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium text-[#1A1A1A]">
          <MapPin className="h-4 w-4 text-[#EF3333]" />
          Localizacao Base
        </Label>
        <Input
          id="location"
          placeholder="Ex: Sao Paulo, SP ou Av. Paulista, 1000"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]"
        />
      </div>

      <div className="space-y-3">
        <Label className="flex items-center justify-between text-sm font-medium text-[#1A1A1A]">
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[#EF3333]" />
            Raio de Busca
          </span>
          <span className="font-semibold text-[#EF3333]">{radius} km</span>
        </Label>
        <Slider value={[radius]} onValueChange={(value) => setRadius(value[0])} min={1} max={50} step={1} className="py-2" />
        <div className="flex justify-between text-xs text-[#7c7c83]">
          <span>1 km</span>
          <span>50 km</span>
        </div>
      </div>

      <Button
        onClick={handleSearch}
        disabled={!canSearch || isLoading}
        className="h-12 w-full rounded-xl gradient-primary text-primary-foreground font-semibold transition-all duration-200 hover:opacity-95 glow-primary disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            Buscando...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Buscar Empresas
          </span>
        )}
      </Button>
    </div>
  );
};
