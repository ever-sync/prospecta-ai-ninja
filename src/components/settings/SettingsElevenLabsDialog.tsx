import { ExternalLink, Loader2, Mic, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const fieldClass = 'h-11 rounded-xl border-[#e6e6eb] bg-[#fcfcfd] focus-visible:ring-[#ef3333]';

type SettingsElevenLabsDialogProps = {
  open: boolean;
  saving: boolean;
  configured: boolean;
  voiceId: string;
  onVoiceIdChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
};

export const SettingsElevenLabsDialog = ({
  open,
  saving,
  configured,
  voiceId,
  onVoiceIdChange,
  onOpenChange,
  onSave,
}: SettingsElevenLabsDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg rounded-[22px] border border-[#ececf0] bg-white p-0">
      <div className="flex items-center gap-3 border-b border-[#f0f0f3] px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/10">
          <Mic className="h-5 w-5 text-[#8B5CF6]" />
        </div>
        <div>
          <DialogTitle className="text-base font-semibold text-[#1A1A1A]">ElevenLabs</DialogTitle>
          <DialogDescription className="text-xs text-[#6d6d75]">Voice ID para enviar audios com sua voz clonada nas propostas.</DialogDescription>
        </div>
      </div>
      <div className="space-y-4 px-6 py-5">
        <div className="flex items-center gap-2">
          <a
            href="https://elevenlabs.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-[#e6e6eb] bg-white px-2 py-0.5 text-[11px] font-medium text-[#356DFF] transition-colors hover:bg-[#f0f4ff]"
          >
            <ExternalLink className="h-3 w-3" />
            elevenlabs.io
          </a>
          {configured && (
            <span className="ml-auto rounded-full border border-[#d1f0dd] bg-[#f0faf4] px-2 py-0.5 text-[10px] font-semibold text-[#2d7a4a]">
              Configurado
            </span>
          )}
        </div>
        <div className="space-y-1">
          <Input
            id="voiceId"
            className={fieldClass}
            value={voiceId}
            onChange={(event) => onVoiceIdChange(event.target.value)}
            placeholder="Cole aqui o ID da sua voz clonada"
          />
          <p className="text-xs text-[#6d6d75]">
            Clone sua voz no{' '}
            <a
              href="https://elevenlabs.io/voice-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#b22b40] hover:underline"
            >
              ElevenLabs Voice Lab
            </a>{' '}
            e cole o Voice ID aqui.
          </p>
        </div>
      </div>
      <DialogFooter className="border-t border-[#f0f0f3] px-6 py-4">
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={onSave} disabled={saving} className="h-11 rounded-xl gap-2 gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
