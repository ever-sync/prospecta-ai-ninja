import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, RefreshCw } from 'lucide-react';

const TEMPLATES = [
  { value: 'modern-dark', label: 'Moderno Escuro', description: 'Fundo escuro, cores vibrantes, visual tech' },
  { value: 'clean-light', label: 'Clean Claro', description: 'Fundo branco, tipografia elegante, minimalista' },
  { value: 'corporate', label: 'Corporativo', description: 'Layout formal, tons sóbrios, estilo enterprise' },
  { value: 'bold-gradient', label: 'Gradiente Bold', description: 'Gradientes fortes, tipografia grande, impactante' },
];

const TONES = [
  { value: 'professional', label: 'Profissional' },
  { value: 'consultive', label: 'Consultivo' },
  { value: 'urgent', label: 'Urgente' },
  { value: 'friendly', label: 'Amigável' },
  { value: 'technical', label: 'Técnico' },
];

interface RegeneratePresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegenerate: (template: string, tone: string, customInstructions: string) => Promise<void>;
  businessName: string;
}

export const RegeneratePresentationDialog = ({
  open,
  onOpenChange,
  onRegenerate,
  businessName,
}: RegeneratePresentationDialogProps) => {
  const [template, setTemplate] = useState('modern-dark');
  const [tone, setTone] = useState('professional');
  const [customInstructions, setCustomInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      await onRegenerate(template, tone, customInstructions);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Regenerar Apresentação
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {businessName}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-foreground">Template Visual</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div>
                      <span className="font-medium">{t.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Tom de Comunicação</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Instruções Adicionais</Label>
            <Textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Ex: Destaque os problemas de SEO, use linguagem mais direta..."
              className="bg-background border-border resize-none h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleRegenerate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Regenerar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
