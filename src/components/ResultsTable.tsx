import {
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Radar,
  SearchCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { Business, AVAILABLE_NICHES } from "@/types/business";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deriveLeadSignalSummary } from "@/lib/lead-scoring";

interface ResultsTableProps {
  businesses: Business[];
  onSelectBusiness: (business: Business) => void;
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
  onToggleAll: () => void;
  activeBusinessId?: string | null;
}

const getCategoryLabel = (value: string): string => {
  const niche = AVAILABLE_NICHES.find((item) => item.value === value);
  return niche?.label || value;
};

const priorityToneClass = {
  high: "border-[#f4c6cd] bg-[#fff3f5] text-[#9f2336]",
  medium: "border-[#eadcb8] bg-[#fffaf0] text-[#946d1d]",
  low: "border-[#e4e4e9] bg-[#f7f7fa] text-[#666670]",
};

const onlinePresenceToneClass = {
  critical: "border-[#f1c6cd] bg-[#fff1f4] text-[#9c2235]",
  warning: "border-[#ecd8b0] bg-[#fff8ec] text-[#8f6616]",
  healthy: "border-[#cfe6d7] bg-[#f3fbf5] text-[#21603a]",
};

export const ResultsTable = ({
  businesses,
  onSelectBusiness,
  selectedIds,
  onToggleSelected,
  onToggleAll,
  activeBusinessId,
}: ResultsTableProps) => {
  if (businesses.length === 0) {
    return (
      <div className="py-12 text-center text-[#6e6e76]">
        <p>Nenhum resultado encontrado. Tente ajustar os filtros.</p>
      </div>
    );
  }

  const allSelected = selectedIds.size === businesses.length && businesses.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:hidden">
        {businesses.map((business) => {
          const signal = deriveLeadSignalSummary(business);
          return (
            <div
              key={business.id}
              className={cn(
                "group relative overflow-hidden rounded-[28px] border transition-all duration-300",
                activeBusinessId === business.id
                  ? "border-[#EF3333]/40 bg-[#fff9fa] shadow-[0_20px_45px_rgba(239,51,51,0.18)]"
                  : "border-[#ececf0] bg-white hover:border-[#EF3333]/20 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)]"
              )}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-bold tracking-tight text-[#1A1A1A]">{business.name}</h3>
                      {business.rating ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fff2f4] px-2 py-1 text-[11px] font-bold text-[#b02a3a]">
                          <Star className="h-3 w-3 fill-current" />
                          {business.rating}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8d8d95]">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">{business.address}</span>
                    </div>
                  </div>
                  <Checkbox
                    checked={selectedIds.has(business.id)}
                    onCheckedChange={() => onToggleSelected(business.id)}
                    className="h-5 w-5 rounded-lg border-[#e2e2e8] data-[state=checked]:bg-[#EF3333]"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Badge className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", priorityToneClass[signal.priorityTone])}>
                    {signal.priorityLabel}
                  </Badge>
                  <Badge className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", onlinePresenceToneClass[signal.onlinePresenceTone])}>
                    {signal.onlinePresenceLabel}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-[#ececf0] bg-[#f8f8fa] px-2.5 py-0.5 text-[10px] font-bold text-[#5f5f67]">
                    SCORE {signal.score}
                  </Badge>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 border-y border-[#ececf0]/50 py-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8d8d95]">Proximidade</p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1A1A1A]">
                      <Radar className="h-3.5 w-3.5 text-[#EF3333]" />
                      {signal.proximityLabel}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8d8d95]">Reputacao</p>
                    <div className="text-xs font-semibold text-[#1A1A1A]">
                      {signal.reputationLabel}
                    </div>
                  </div>
                </div>

                <div className="mt-4 min-h-[40px]">
                  <p className="text-xs leading-relaxed text-[#66666e]">
                    {signal.onlinePresenceWeaknesses[0] || "Sem leitura de fraqueza disponivel no momento."}
                  </p>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-2xl border-[#e6e6eb] bg-white text-sm font-bold shadow-sm hover:bg-[#fff9fa] hover:text-[#EF3333]"
                    onClick={() => onSelectBusiness(business)}
                  >
                    <SearchCheck className="mr-2 h-4 w-4" />
                    Contexto
                  </Button>
                  {business.website ? (
                    <Button
                      variant="ghost"
                      className="h-11 w-11 shrink-0 rounded-2xl bg-[#fff2f4] text-[#7a2431] hover:bg-[#ffe4e8]"
                      asChild
                    >
                      <a href={`https://${business.website}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto xl:block">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow className="border-b border-[#ececf0] bg-[#f9f9fb] hover:bg-[#f9f9fb]">
              <TableHead className="w-12">
                <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
              </TableHead>
              <TableHead className="font-semibold text-[#1A1A1A]">Lead</TableHead>
              <TableHead className="font-semibold text-[#1A1A1A]">Contato</TableHead>
              <TableHead className="text-center font-semibold text-[#1A1A1A]">Prioridade</TableHead>
              <TableHead className="text-right font-semibold text-[#1A1A1A]">Acao</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businesses.map((business, index) => {
              const signal = deriveLeadSignalSummary(business);
              return (
                <TableRow
                  key={business.id}
                  className={cn(
                    "animate-fade-in border-b border-[#f0f0f3] transition-colors hover:bg-[#fafafd]",
                    activeBusinessId === business.id ? "bg-[#fff8fa]" : ""
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <Checkbox checked={selectedIds.has(business.id)} onCheckedChange={() => onToggleSelected(business.id)} />
                  </TableCell>

                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectBusiness(business)}
                          className="text-left text-base font-semibold text-[#1A1A1A] hover:text-[#8c2332]"
                        >
                          {business.name}
                        </button>
                        {business.rating ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff2f4] px-2 py-1 text-xs font-medium text-[#9f2336]">
                            <Star className="h-3 w-3 fill-current" />
                            {business.rating}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#6e6e76]">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-1">{business.address}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-[#5f5f67]">
                          {getCategoryLabel(business.category)}
                        </Badge>
                        <Badge className={cn("rounded-full border", onlinePresenceToneClass[signal.onlinePresenceTone])}>
                          {signal.onlinePresenceLabel}
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-[#ececf0] bg-white text-[#6f6f76]">
                          {signal.proximityLabel}
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-[#ececf0] bg-white text-[#6f6f76]">
                          {signal.reputationLabel}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>


                  <TableCell>
                    <div className="space-y-2 text-sm text-[#1A1A1A]">
                      {business.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-[#8a8a92]" />
                          <span>{business.phone}</span>
                        </div>
                      ) : (
                        <div className="text-xs italic text-[#8a8a92]">Sem telefone</div>
                      )}

                      {business.email ? (
                        <a href={`mailto:${business.email}`} className="flex items-center gap-2 text-[#9f2336] hover:underline">
                          <Mail className="h-4 w-4" />
                          <span>{business.email}</span>
                        </a>
                      ) : (
                        <div className="text-xs italic text-[#8a8a92]">Sem email</div>
                      )}

                      {business.website ? (
                        <a
                          href={`https://${business.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[#9f2336] hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>{business.website}</span>
                        </a>
                      ) : (
                        <div className="text-xs italic text-[#8a8a92]">Sem site proprio</div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Badge className={cn("rounded-full border", priorityToneClass[signal.priorityTone])}>
                        {signal.priorityLabel}
                      </Badge>
                      <div className="text-2xl font-semibold text-[#1A1A1A]">{signal.score}</div>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      onClick={() => onSelectBusiness(business)}
                      className="rounded-xl bg-[#111115] text-white hover:bg-[#1d1d24]"
                    >
                      <Sparkles className="mr-2 h-4 w-4 text-[#EF3333]" />
                      Ler lead
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
