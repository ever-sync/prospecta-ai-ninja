import { ExternalLink, Phone, MapPin, Star, Sparkles } from 'lucide-react';
import { Business, AVAILABLE_NICHES } from '@/types/business';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ResultsTableProps {
  businesses: Business[];
  onSelectBusiness: (business: Business) => void;
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
  onToggleAll: () => void;
}

const getCategoryLabel = (value: string): string => {
  const niche = AVAILABLE_NICHES.find(n => n.value === value);
  return niche?.label || value;
};

export const ResultsTable = ({ businesses, onSelectBusiness, selectedIds, onToggleSelected, onToggleAll }: ResultsTableProps) => {
  if (businesses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum resultado encontrado. Tente ajustar os filtros.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/50">
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.size === businesses.length && businesses.length > 0}
                onCheckedChange={onToggleAll}
              />
            </TableHead>
            <TableHead className="text-foreground font-semibold">Empresa</TableHead>
            <TableHead className="text-foreground font-semibold">Contato</TableHead>
            <TableHead className="text-foreground font-semibold">Categoria</TableHead>
            <TableHead className="text-foreground font-semibold text-center">IA</TableHead>
            <TableHead className="text-foreground font-semibold text-right">Distância</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {businesses.map((business, index) => (
            <TableRow
              key={business.id}
              className="animate-fade-in hover:bg-accent/50 transition-colors"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(business.id)}
                  onCheckedChange={() => onToggleSelected(business.id)}
                />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium text-foreground flex items-center gap-2">
                    {business.name}
                    {business.rating && (
                      <span className="flex items-center gap-1 text-xs text-warning">
                        <Star className="w-3 h-3 fill-current" />
                        {business.rating}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {business.address}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm text-foreground">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    {business.phone}
                  </div>
                  {business.website && (
                    <a href={`https://${business.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" />
                      {business.website}
                    </a>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {getCategoryLabel(business.category)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary" onClick={() => onSelectBusiness(business)}>
                      <Sparkles className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Gerar sugestão de abordagem</p></TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm font-medium text-primary">{business.distance} km</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
