import type { ReactNode } from 'react';
import { ExternalLink, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';

type GuideStep = {
  step: number;
  title: string;
  description: ReactNode;
};

type SettingsFirecrawlGuideDialogProps = {
  open: boolean;
  steps: GuideStep[];
  onOpenChange: (open: boolean) => void;
};

export const SettingsFirecrawlGuideDialog = ({
  open,
  steps,
  onOpenChange,
}: SettingsFirecrawlGuideDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg overflow-hidden rounded-[22px] border border-[#ececf0] bg-white p-0">
      <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EF3333]/10">
          <Flame className="h-5 w-5 text-[#EF3333]" />
        </div>
        <div>
          <DialogTitle className="text-base font-semibold text-[#1A1A1A]">Como obter sua chave Firecrawl</DialogTitle>
          <DialogDescription className="text-xs text-[#6d6d75]">
            Siga os passos abaixo para criar sua conta e copiar a chave.
          </DialogDescription>
        </div>
      </div>

      <div className="px-6 py-5">
        <ol className="space-y-4">
          {steps.map(({ step, title, description }) => (
            <li key={step} className="flex gap-4">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#EF3333] text-xs font-bold text-white">
                {step}
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-[#1A1A1A]">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#6d6d75]">{description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-xl border border-[#e6f0ff] bg-[#f0f6ff] p-3">
          <p className="text-xs text-[#356DFF]">
            <strong>Dica:</strong> O plano gratuito do Firecrawl oferece 500 credits/mes, suficiente para centenas de buscas. Para uso intenso, considere o plano pago.
          </p>
        </div>
      </div>

      <DialogFooter className="border-t border-[#f0f0f3] px-6 py-4">
        <a
          href="https://firecrawl.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#356DFF] px-4 text-sm font-medium text-[#356DFF] transition-colors hover:bg-[#f0f6ff]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir Firecrawl
        </a>
        <Button
          type="button"
          className="h-9 rounded-xl bg-[#EF3333] text-sm font-medium text-white hover:bg-[#d42d2d]"
          onClick={() => onOpenChange(false)}
        >
          Entendido
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
