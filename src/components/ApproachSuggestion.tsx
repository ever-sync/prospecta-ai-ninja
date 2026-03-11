import { useState } from 'react';
import { Sparkles, Copy, Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Business } from '@/types/business';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ApproachSuggestionProps {
  business: Business;
  onClose: () => void;
  embedded?: boolean;
}

export const ApproachSuggestion = ({ business, onClose, embedded }: ApproachSuggestionProps) => {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateSuggestion = async () => {
    setIsLoading(true);
    setSuggestion(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-approach', {
        body: { business },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSuggestion(data.suggestion);
    } catch (error) {
      console.error('Error generating suggestion:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao gerar sugestão',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!suggestion) return;
    
    try {
      await navigator.clipboard.writeText(suggestion);
      setCopied(true);
      toast({
        title: 'Copiado!',
        description: 'Sugestão copiada para a área de transferência',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o texto',
        variant: 'destructive',
      });
    }
  };

  if (embedded) {
    return (
      <div className="space-y-4">
        {!suggestion && !isLoading && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              A IA irá analisar o perfil da empresa e sugerir a melhor forma de abordagem comercial.
            </p>
            <Button onClick={generateSuggestion} className="gradient-primary text-primary-foreground">
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Sugestão
            </Button>
          </div>
        )}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Analisando empresa e gerando sugestão...</p>
          </div>
        )}
        {suggestion && (
          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-lg p-4 border border-border">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{suggestion}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                {copied ? <><Check className="w-4 h-4 mr-2 text-green-400" />Copiado</> : <><Copy className="w-4 h-4 mr-2" />Copiar Texto</>}
              </Button>
              <Button onClick={generateSuggestion} variant="secondary">
                <Sparkles className="w-4 h-4 mr-2" />Nova Sugestão
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="p-6 bg-card border-border animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Sugestão de Abordagem IA</h3>
            <p className="text-xs text-muted-foreground">{business.name}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {!suggestion && !isLoading && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-4">
            A IA irá analisar o perfil da empresa e sugerir a melhor forma de abordagem comercial.
          </p>
          <Button onClick={generateSuggestion} className="gradient-primary text-primary-foreground">
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Sugestão
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Analisando empresa e gerando sugestão...</p>
        </div>
      )}

      {suggestion && (
        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-lg p-4 border border-border">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {suggestion}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={copyToClipboard} variant="outline" className="flex-1">
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-success" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Texto
                </>
              )}
            </Button>
            <Button onClick={generateSuggestion} variant="secondary">
              <Sparkles className="w-4 h-4 mr-2" />
              Nova Sugestão
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
