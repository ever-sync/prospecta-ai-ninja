import { useMemo, useState } from 'react';
import { Crown, ExternalLink, Loader2, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PlanData } from '@/hooks/useSubscription';

type UpgradePlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  plans: PlanData[];
  startCheckout: (planId: string) => Promise<void>;
};

export const UpgradePlanDialog = ({
  open,
  onOpenChange,
  title,
  description,
  plans,
  startCheckout,
}: UpgradePlanDialogProps) => {
  const [loading, setLoading] = useState(false);

  const recommendedPlan = useMemo(
    () =>
      plans
        .filter((plan) => plan.id !== 'free' && !!plan.stripe_price_id)
        .sort((left, right) => left.price_cents - right.price_cents)[0] || null,
    [plans],
  );

  const priceLabel = recommendedPlan
    ? `R$ ${(recommendedPlan.price_cents / 100).toFixed(0)}/mes`
    : null;

  const handleUpgrade = async () => {
    if (!recommendedPlan) {
      window.location.assign('/settings?tab=faturamento');
      return;
    }

    setLoading(true);
    try {
      await startCheckout(recommendedPlan.id);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[22px] border border-[#ececf0] bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1A1A1A]">
            <Lock className="h-5 w-5 text-[#EF3333]" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-[#6d6d75]">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-[#f2d4d8] bg-[#fff5f6] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b94456]">Plano recomendado</p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-base font-semibold text-[#7f2432]">
                <Crown className="h-4 w-4" />
                {recommendedPlan?.name || 'Plano pago'}
              </p>
              {priceLabel && <p className="mt-1 text-sm text-[#9b4458]">{priceLabel}</p>}
            </div>
            <Sparkles className="mt-0.5 h-5 w-5 text-[#EF3333]" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => window.location.assign('/settings?tab=faturamento')}
          >
            Ver planos
          </Button>
          <Button
            type="button"
            className="gap-2 rounded-xl gradient-primary text-primary-foreground"
            onClick={() => void handleUpgrade()}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Fazer upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
