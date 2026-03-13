import { ExternalLink, Phone, MapPin, Star, Sparkles, Mail } from 'lucide-react';
import { Business, AVAILABLE_NICHES } from '@/types/business';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const niche = AVAILABLE_NICHES.find((n) => n.value === value);
  return niche?.label || value;
};

export const ResultsTable = ({ businesses, onSelectBusiness, selectedIds, onToggleSelected, onToggleAll }: ResultsTableProps) => {
  if (businesses.length === 0) {
    return (
      <div className="py-12 text-center text-[#6e6e76]">
        <p>Nenhum resultado encontrado. Tente ajustar os filtros.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="border-b border-[#ececf0] bg-[#f9f9fb] hover:bg-[#f9f9fb]">
            <TableHead className="w-12">
              <Checkbox checked={selectedIds.size === businesses.length && businesses.length > 0} onCheckedChange={onToggleAll} />
            </TableHead>
            <TableHead className="font-semibold text-[#1A1A1A]">Empresa</TableHead>
            <TableHead className="font-semibold text-[#1A1A1A]">Contato</TableHead>
            <TableHead className="font-semibold text-[#1A1A1A]">Categoria</TableHead>
            <TableHead className="text-center font-semibold text-[#1A1A1A]">IA</TableHead>
            <TableHead className="text-right font-semibold text-[#1A1A1A]">Distancia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {businesses.map((business, index) => (
            <TableRow
              key={business.id}
              className="animate-fade-in border-b border-[#f0f0f3] transition-colors hover:bg-[#fafafd]"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <TableCell>
                <Checkbox checked={selectedIds.has(business.id)} onCheckedChange={() => onToggleSelected(business.id)} />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-medium text-[#1A1A1A]">
                    {business.name}
                    {business.rating && (
                      <span className="flex items-center gap-1 text-xs text-[#EF3333]">
                        <Star className="h-3 w-3 fill-current" />
                        {business.rating}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#6e6e76]">
                    <MapPin className="h-3 w-3" />
                    {business.address}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {business.phone ? (
                    <div className="flex items-center gap-1 text-sm text-[#1A1A1A]">
                      <Phone className="h-3 w-3 text-[#8a8a92]" />
                      {business.phone}
                    </div>
                  ) : (
                    <span className="text-xs italic text-[#8a8a92]">Sem telefone</span>
                  )}
                  {business.email ? (
                    <a href={`mailto:${business.email}`} className="flex items-center gap-1 text-xs text-[#b22b40] hover:underline">
                      <Mail className="h-3 w-3" />
                      {business.email}
                    </a>
                  ) : (
                    <span className="text-xs italic text-[#8a8a92]">Sem email</span>
                  )}
                  {business.website ? (
                    <a href={`https://${business.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#b22b40] hover:underline">
                      <ExternalLink className="h-3 w-3" />
                      {business.website}
                    </a>
                  ) : (
                    <span className="text-xs italic text-[#8a8a92]">Sem site</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-xs text-[#5f5f67]">
                  {getCategoryLabel(business.category)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-[#707078] hover:bg-[#fff1f3] hover:text-[#EF3333]"
                      onClick={() => onSelectBusiness(business)}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Gerar sugestao de abordagem</p>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm font-semibold text-[#EF3333]">{business.distance} km</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
