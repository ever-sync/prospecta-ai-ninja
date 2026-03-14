import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2, Radar, Sparkles, Telescope, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AnalysisItem = {
  id: string;
  name: string;
  status: "pending" | "analyzing" | "generating" | "done" | "error";
  error?: string;
};

interface AnalysisProgressModalProps {
  open: boolean;
  items: AnalysisItem[];
  onClose: () => void;
  onFinish: () => void;
}

const statusConfig: Record<
  AnalysisItem["status"],
  { label: string; detail: string; icon: JSX.Element }
> = {
  pending: {
    label: "Na fila",
    detail: "Aguardando leitura",
    icon: <Telescope className="h-4 w-4 text-[#7a7a82]" />,
  },
  analyzing: {
    label: "Lendo contexto",
    detail: "Site, reputacao e sinais",
    icon: <Loader2 className="h-4 w-4 animate-spin text-[#EF3333]" />,
  },
  generating: {
    label: "Montando proposta",
    detail: "Transformando leitura em acao",
    icon: <Sparkles className="h-4 w-4 text-[#EF3333]" />,
  },
  done: {
    label: "Pronto",
    detail: "Enviado para apresentacoes",
    icon: <CheckCircle2 className="h-4 w-4 text-[#1f8f47]" />,
  },
  error: {
    label: "Erro",
    detail: "Falha na etapa atual",
    icon: <XCircle className="h-4 w-4 text-[#c53f52]" />,
  },
};

export const AnalysisProgressModal = ({
  open,
  items,
  onClose,
  onFinish,
}: AnalysisProgressModalProps) => {
  const completed = items.filter((item) => item.status === "done" || item.status === "error").length;
  const progress = items.length > 0 ? (completed / items.length) * 100 : 0;
  const allDone = completed === items.length && items.length > 0;
  const successCount = items.filter((item) => item.status === "done").length;
  const errorCount = items.filter((item) => item.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={allDone ? onClose : undefined}>
      <DialogContent
        className="max-w-[720px] rounded-[28px] border border-[#ececf0] bg-white p-0 shadow-[0_32px_80px_rgba(14,14,18,0.18)]"
        onPointerDownOutside={(event) => !allDone && event.preventDefault()}
      >
        <div className="rounded-t-[28px] bg-[#111115] px-6 py-6 text-white">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2">
              <div className="rounded-2xl bg-white/8 p-2 text-[#EF3333]">
                <Radar className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-semibold">Fila de missao</DialogTitle>
                <DialogDescription className="text-white/65">
                  O scanner esta lendo os leads e montando a proxima leva de propostas consultivas.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Progresso</p>
              <p className="mt-2 text-2xl font-semibold">
                {completed}/{items.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Concluidas</p>
              <p className="mt-2 text-2xl font-semibold">{successCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Falhas</p>
              <p className="mt-2 text-2xl font-semibold">{errorCount}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-[#1A1A1A]">Execucao da fila</span>
              <span className="text-[#66666d]">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />
          </div>

          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {items.map((item) => {
              const config = statusConfig[item.status];

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-[22px] border border-[#ececf0] bg-[#fafafc] px-4 py-4"
                >
                  <div className="mt-0.5 rounded-2xl bg-white p-2 shadow-sm">{config.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="truncate font-medium text-[#1A1A1A]">{item.name}</p>
                      <span className="rounded-full border border-[#ececf0] bg-white px-2.5 py-1 text-xs font-semibold text-[#66666d]">
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#66666d]">{config.detail}</p>
                    {item.error ? <p className="mt-2 text-xs text-[#b23246]">{item.error}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>

          {allDone ? (
            <div className="flex flex-col gap-3 rounded-[22px] border border-[#f2d4d8] bg-[#fff6f7] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[#1A1A1A]">Scanner finalizado</p>
                <p className="text-sm text-[#6d6d75]">
                  {successCount} proposta(s) pronta(s) para seguir para a etapa de apresentacoes.
                </p>
              </div>
              <Button onClick={onFinish} className="rounded-xl bg-[#111115] text-white hover:bg-[#1d1d24]">
                Ver apresentacoes
              </Button>
            </div>
          ) : (
            <div className="rounded-[22px] border border-[#ececf0] bg-[#fafafc] px-4 py-3 text-sm text-[#66666d]">
              Feche esta janela apenas quando a fila terminar. O fluxo continua automaticamente.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
