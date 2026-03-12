import { useState } from 'react';
import { Search, MapPin, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { SearchFilters as Filters, AVAILABLE_NICHES } from '@/types/business';

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
    setSelectedNiches(prev =>
      prev.includes(value)
        ? prev.filter(n => n !== value)
        : [...prev, value]
    );
  };

  const addCustomNiche = () => {
    const trimmed = customNiche.trim();
    if (trimmed && !selectedNiches.includes(trimmed)) {
      setSelectedNiches(prev => [...prev, trimmed]);
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
        <Label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Nicho de Atuação
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="Digite um nicho personalizado..."
            value={customNiche}
            onChange={(e) => setCustomNiche(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomNiche()}
            className="focus:border-primary transition-colors"
          />
          <Button variant="outline" size="sm" onClick={addCustomNiche} disabled={!customNiche.trim()} className="shrink-0">
            +
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_NICHES.map(niche => (
            <Badge
              key={niche.value}
              variant={selectedNiches.includes(niche.value) ? 'default' : 'outline'}
              className={`cursor-pointer transition-all duration-200 ${
                selectedNiches.includes(niche.value)
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => toggleNiche(niche.value)}
            >
              {niche.label}
            </Badge>
          ))}
          {/* Custom niches that aren't in the predefined list */}
          {selectedNiches
            .filter(n => !AVAILABLE_NICHES.some(an => an.value === n))
            .map(n => (
              <Badge
                key={n}
                variant="default"
                className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => toggleNiche(n)}
              >
                {n} ✕
              </Badge>
            ))}
        </div>
        {selectedNiches.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {selectedNiches.length} nicho(s) selecionado(s)
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="location" className="text-sm font-medium text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Localização Base
        </Label>
        <Input
          id="location"
          placeholder="Ex: São Paulo, SP ou Av. Paulista, 1000"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="bg-secondary border-border focus:border-primary transition-colors"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Raio de Busca
          </span>
          <span className="text-primary font-semibold">{radius} km</span>
        </Label>
        <Slider
          value={[radius]}
          onValueChange={(value) => setRadius(value[0])}
          min={1}
          max={50}
          step={1}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 km</span>
          <span>50 km</span>
        </div>
      </div>

      <Button
        onClick={handleSearch}
        disabled={!canSearch || isLoading}
        className="w-full gradient-primary text-primary-foreground font-semibold py-6 transition-all duration-200 hover:opacity-90 glow-primary disabled:opacity-50 disabled:glow-none"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Buscando...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Buscar Empresas
          </span>
        )}
      </Button>
    </div>
  );
};
