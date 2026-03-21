import { useState } from 'react';
import { Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Por favor, selecione uma nota.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('feedbacks').insert({
        user_id: user?.id,
        rating,
        message,
      });

      if (error) throw error;

      toast.success('Feedback enviado com sucesso! Obrigado.');
      setRating(0);
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Erro ao enviar feedback. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-[22px] border-[#ececf0] bg-white p-6 shadow-[0_18px_40px_rgba(20,20,24,0.10)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#1A1A1A]">Enviar Feedback</DialogTitle>
          <DialogDescription className="text-[#7a7a82]">
            Sua opinião é muito importante para nós. Como está sendo sua experiência?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="flex flex-col items-center gap-3">
            <Label className="text-sm font-semibold text-[#1A1A1A]">Sua nota</Label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform duration-150 active:scale-90"
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors fill-current",
                      (hoveredRating || rating) >= star 
                        ? "text-[#EF3333]" 
                        : "text-[#ececf0]"
                    )}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message" className="text-sm font-semibold text-[#1A1A1A]">
              Mensagem (opcional)
            </Label>
            <Textarea
              id="message"
              placeholder="Conte-nos o que você gostou ou o que podemos melhorar..."
              className="resize-none rounded-xl border-[#ececf0] bg-[#f8f8f9] p-3 text-sm focus:border-[#EF3333] focus:ring-0"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-6 text-[#7a7a82] hover:bg-[#f5f5f7] hover:text-[#1A1A1A]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="rounded-xl bg-[#EF3333] px-6 text-white transition-opacity hover:bg-[#d62e2e] disabled:opacity-50"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
