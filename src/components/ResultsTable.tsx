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
      <div className="grid gap-3 lg:hidden">
        {businesses.map((business) => {
          const signal = deriveLeadSignalSummary(business);
          return (
            <div
              key={business.id}
              className={cn(
                "rounded-[24px] border p-4 transition-all",
                activeBusinessId === business.id
                  ? "border-[#EF3333]/35 bg-[#fff9fa] shadow-[0_18px_34px_rgba(239,51,51,0.12)]"
                  : "border-[#ececf0] bg-white"
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.has(business.id)}
                  onCheckedChange={() => onToggleSelected(business.id)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-[#1A1A1A]">{business.name}</h3>
                    {business.rating ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff2f4] px-2 py-1 text-xs font-medium text-[#9f2336]">
                        <Star className="h-3 w-3 fill-current" />
                        {business.rating}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge className={cn("rounded-full border", priorityToneClass[signal.priorityTone])}>
                      {signal.priorityLabel}
                    </Badge>
                    <Badge className={cn("rounded-full border", onlinePresenceToneClass[signal.onlinePresenceTone])}>
                      {signal.onlinePresenceLabel}
                    </Badge>
                    <Badge variant="outline" className="rounded-full border-[#ececf0] bg-[#f8f8fa] text-[#5f5f67]">
                      Score {signal.score}
                    </Badge>
                    <Badge variant="outline" className="rounded-full border-[#ececf0] bg-white text-[#6f6f76]">
                      {getCategoryLabel(business.category)}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2 text-sm text-[#5f5f67]">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#8d8d95]" />
                      <span className="line-clamp-2">{business.address}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Radar className="h-4 w-4 text-[#EF3333]" />
                        {signal.proximityLabel}
                      </span>
                      <span>{signal.reputationLabel}</span>
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-4 w-4 text-[#8d8d95]" />
                        Presenca {signal.onlinePresenceScore}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {signal.signalFlags.map((flag) => (
                      <span
                        key={flag}
                        className="rounded-full border border-[#ececf0] bg-[#fcfcfd] px-2.5 py-1 text-[11px] font-medium text-[#6e6e76]"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-[#777780]">
                    {signal.onlinePresenceWeaknesses[0] || "Sem leitura de fraqueza disponivel."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="h-10 rounded-xl border-[#e6e6eb] bg-white"
                      onClick={() => onSelectBusiness(business)}
                    >
                      <SearchCheck className="mr-2 h-4 w-4" />
                      Ver inteligencia
                    </Button>
                    {business.website ? (
                      <Button
                        variant="ghost"
                        className="h-10 rounded-xl text-[#7a2431] hover:bg-[#fff1f3]"
                        asChild
                      >
                        <a href={`https://${business.website}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Site
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow className="border-b border-[#ececf0] bg-[#f9f9fb] hover:bg-[#f9f9fb]">
              <TableHead className="w-12">
                <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
              </TableHead>
              <TableHead className="font-semibold text-[#1A1A1A]">Lead</TableHead>
              <TableHead className="font-semibold text-[#1A1A1A]">Sinais</TableHead>
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
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {signal.signalFlags.map((flag) => (
                          <span
                            key={flag}
                            className="rounded-full border border-[#ececf0] bg-[#fcfcfd] px-2.5 py-1 text-[11px] font-medium text-[#6e6e76]"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs font-medium text-[#8b8b93]">
                        Completude de contato: {signal.contactCompleteness}/3
                      </div>
                      <div className="text-xs font-medium text-[#8b8b93]">
                        Presenca online: {signal.onlinePresenceScore}/100
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
