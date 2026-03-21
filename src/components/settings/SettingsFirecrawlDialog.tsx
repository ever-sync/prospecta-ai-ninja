import { Check, CheckCircle2, ExternalLink, Eye, EyeOff, Flame, Loader2, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const fieldClass = 'h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]';

type FirecrawlValidationStatus = 'idle' | 'valid' | 'invalid';

type SettingsFirecrawlDialogProps = {
  open: boolean;
  firecrawlApiKey: string;
  firecrawlApiKeyInput: string;
  showFirecrawlKey: boolean;
  validatingFirecrawl: boolean;
  validationStatus: FirecrawlValidationStatus;
  savingFirecrawlKey: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenGuide: () => void;
  onRemove: () => void;
  onToggleShowKey: () => void;
  onInputChange: (value: string) => void;
  onValidate: () => void;
  onSave: () => void;
  maskApiKey: (value: string) => string;
};

export const SettingsFirecrawlDialog = ({
  open,
  firecrawlApiKey,
  firecrawlApiKeyInput,
  showFirecrawlKey,
  validatingFirecrawl,
  validationStatus,
  savingFirecrawlKey,
  onOpenChange,
  onOpenGuide,
  onRemove,
  onToggleShowKey,
  onInputChange,
  onValidate,
  onSave,
  maskApiKey,
}: SettingsFirecrawlDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg rounded-[22px] border border-[#ececf0] bg-white p-0">
      <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EF3333]/10">
          <Flame className="h-5 w-5 text-[#EF3333]" />
        </div>
        <div>
          <DialogTitle className="text-base font-semibold text-[#1A1A1A]">Firecrawl</DialogTitle>
          <DialogDescription className="text-xs text-[#6d6d75]">Chave usada para buscar e raspar sites de prospects automaticamente.</DialogDescription>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://firecrawl.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-[#e6e6eb] bg-white px-2 py-0.5 text-[11px] font-medium text-[#356DFF] transition-colors hover:bg-[#f0f4ff]"
          >
            <ExternalLink className="h-3 w-3" /> firecrawl.dev
          </a>
          <button
            type="button"
            onClick={onOpenGuide}
            className="inline-flex items-center gap-1 rounded-md border border-[#e6e6eb] bg-white px-2 py-0.5 text-[11px] font-medium text-[#6d6d75] transition-colors hover:bg-[#f5f5f7]"
          >
            Como obter minha chave?
          </button>
          {firecrawlApiKey && (
            <span className="ml-auto rounded-full border border-[#d1f0dd] bg-[#f0faf4] px-2 py-0.5 text-[10px] font-semibold text-[#2d7a4a]">
              Configurada
            </span>
          )}
        </div>

        {firecrawlApiKey && (
          <div className="flex items-center justify-between rounded-xl border border-[#ececf0] bg-[#fafafd] px-3 py-2">
            <p className="text-xs text-[#6d6d75]">
              Chave atual: <span className="font-mono">{maskApiKey(firecrawlApiKey)}</span>
            </p>
            <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs text-[#b2374b] hover:bg-[#fff3f5]" onClick={onRemove}>
              <Trash2 className="mr-1 h-3 w-3" />
              Remover
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showFirecrawlKey ? 'text' : 'password'}
              className={`${fieldClass} pr-10`}
              value={firecrawlApiKeyInput}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder={firecrawlApiKey ? 'Nova chave para substituir a atual' : 'Cole sua chave Firecrawl aqui'}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9b9ba3] hover:text-[#1A1A1A]"
              onClick={onToggleShowKey}
            >
              {showFirecrawlKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button
            variant="outline"
            className="h-11 gap-1.5 rounded-xl border-[#e6e6eb] text-sm"
            disabled={!firecrawlApiKeyInput.trim() || validatingFirecrawl}
            onClick={onValidate}
          >
            {validatingFirecrawl ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : validationStatus === 'valid' ? (
              <CheckCircle2 className="h-4 w-4 text-[#2d7a4a]" />
            ) : validationStatus === 'invalid' ? (
              <XCircle className="h-4 w-4 text-[#b2374b]" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Validar
          </Button>

          <Button
            className="h-11 gap-1.5 rounded-xl bg-[#EF3333] text-sm text-white hover:bg-[#d42d2d]"
            disabled={!firecrawlApiKeyInput.trim() || savingFirecrawlKey}
            onClick={onSave}
          >
            {savingFirecrawlKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Salvar
          </Button>
        </div>

        {validationStatus === 'valid' && (
          <p className="flex items-center gap-1 text-xs text-[#2d7a4a]">
            <CheckCircle2 className="h-3 w-3" /> Chave validada com sucesso.
          </p>
        )}
        {validationStatus === 'invalid' && (
          <p className="flex items-center gap-1 text-xs text-[#b2374b]">
            <XCircle className="h-3 w-3" /> Chave invalida. Verifique e tente novamente.
          </p>
        )}
        {!firecrawlApiKey && validationStatus === 'idle' && (
          <p className="text-xs text-[#7b7b83]">Sem chave configurada sera usada a chave padrao do sistema.</p>
        )}
      </div>

      <DialogFooter className="border-t border-[#f0f0f3] px-6 py-4">
        <Button type="button" className="rounded-xl" onClick={() => onOpenChange(false)}>
          Fechar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
