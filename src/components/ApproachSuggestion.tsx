import { useState } from 'react';
import { Sparkles, Copy, Check, Loader2, X, RefreshCw, Swords, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Business } from '@/types/business';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { invokeEdgeFunction } from '@/lib/invoke-edge-function';

interface ApproachMessage {
  type: string;
  text: string;
}

interface ApproachSuggestionProps {
  business: Business;
  analysis?: any; // The heavy analysis data
  onClose: () => void;
  embedded?: boolean;
  provider?: string;
}

export const ApproachSuggestion = ({ business, analysis, onClose, embedded, provider }: ApproachSuggestionProps) => {
  const [messages, setMessages] = useState<ApproachMessage[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const generateSuggestion = async () => {
    setIsLoading(true);
    setMessages(null);

    try {
      // First try to generate using the shock approach (if analysis is available)
      if (analysis) {
        const { data, error } = await invokeEdgeFunction<{ generated?: { messages: ApproachMessage[] }; error?: string }>('generate-approach-shock', {
          body: { business, analysis, provider },
        });

        if (!error && data?.generated?.messages) {
          setMessages(data.generated.messages);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to normal approach
      const { data, error } = await invokeEdgeFunction<{ suggestion?: string; error?: string }>('generate-approach', {
        body: { business, provider },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      // Wrapper to conform to the messages array interface
      if (data?.suggestion) {
        setMessages([{ type: "Padrão", text: data.suggestion }]);
      }
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

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast({
        title: 'Copiado!',
        description: 'Sugestão copiada para a área de transferência',
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o texto',
        variant: 'destructive',
      });
    }
  };

  const openWhatsApp = (text: string) => {
    let phoneToUse = business.phone;
    if (phoneToUse) {
      phoneToUse = phoneToUse.replace(/\D/g, "");
      // Assume BR code if no code is present
      if (phoneToUse.length === 10 || phoneToUse.length === 11) {
        phoneToUse = "55" + phoneToUse;
      }
    }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}${phoneToUse ? `&phone=${phoneToUse}` : ''}`;
    window.open(url, '_blank');
  };

  const renderContent = () => (
    <div className="space-y-4">
      {!messages && !isLoading && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-4">
            A IA irá analisar as dores técnicas da empresa e sugerir 3 textos de ABORDAGEM DE CHOQUE prontos para o WhatsApp.
          </p>
          <Button onClick={generateSuggestion} className="bg-[#EF3333] hover:bg-[#c92a2a] text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Abordagens
          </Button>
        </div>
      )}
      
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-[#EF3333] animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Analisando feridas e montando script letal...</p>
        </div>
      )}

      {messages && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Scripts Prontos:</h4>
            <Button onClick={generateSuggestion} variant="outline" size="sm" className="h-8">
              <RefreshCw className="w-3.5 h-3.5 mr-2" />Nova Sugestão
            </Button>
          </div>
          
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className="bg-secondary/20 rounded-xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EF3333]/10 flex items-center justify-center">
                    <Swords className="w-4 h-4 text-[#EF3333]" />
                  </div>
                  <h5 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {msg.type.replace(/_/g, " ")}
                  </h5>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mb-4">
                  {msg.text}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => copyToClipboard(msg.text, idx)} variant="outline" size="sm" className="flex-1 sm:flex-none">
                    {copiedIndex === idx ? <><Check className="w-4 h-4 mr-2 text-[#EF3333]" />Copiado</> : <><Copy className="w-4 h-4 mr-2" />Copiar</>}
                  </Button>
                  <Button onClick={() => openWhatsApp(msg.text)} variant="default" size="sm" className="flex-1 sm:flex-none bg-[#25D366] hover:bg-[#1DA851] text-white">
                    <Phone className="w-4 h-4 mr-2" />
                    Abrir no WhatsApp
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return renderContent();
  }

  return (
    <Card className="p-6 border-[#ececf0] animate-slide-up shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#EF3333]/10 flex items-center justify-center">
            <Swords className="w-4 h-4 text-[#EF3333]" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">A Regra do Dedo na Ferida</h3>
            <p className="text-xs text-muted-foreground">{business.name}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>
      {renderContent()}
    </Card>
  );
};
