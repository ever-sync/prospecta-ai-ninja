import { BarChart3, Check, Crown, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { PlanData } from '@/hooks/useSubscription';

const cardClass = 'rounded-[22px] border border-[#ececf0] bg-white p-6 shadow-[0_10px_24px_rgba(18,18,22,0.05)]';

type UsageItem = {
  label: string;
  used: number;
  limit: number;
};

type SettingsBillingSectionProps = {
  subLoading: boolean;
  usageItems: UsageItem[];
  plans: PlanData[];
  currentPlan: string;
  checkoutLoading: string | null;
  onManageSubscription: () => void;
  onUpgrade: (planId: string) => void;
};

export const SettingsBillingSection = ({
  subLoading,
  usageItems,
  plans,
  currentPlan,
  checkoutLoading,
  onManageSubscription,
  onUpgrade,
}: SettingsBillingSectionProps) => (
  <div className="space-y-5">
    <div className="rounded-2xl border border-[#f2d4d8] bg-[#fff5f6] px-5 py-4">
      <p className="text-sm font-semibold text-[#7f2432]">Modelo de custo transparente</p>
      <p className="mt-1 text-sm leading-relaxed text-[#9b4458]">
        A plataforma custa <span className="font-bold">R$ 79,90/mes</span>. As APIs de IA e o Firecrawl sao
        contratados separadamente, diretamente com cada provedor. Voce tem controle total sobre esses gastos e a
        plataforma nao cobra margem sobre eles.
      </p>
    </div>

    <Card className={cardClass}>
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#1A1A1A]">
        <BarChart3 className="h-5 w-5 text-[#EF3333]" />
        Uso do Mes
      </h3>
      {subLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#7b7b83]" />
        </div>
      ) : (
        <div className="space-y-4">
          {usageItems.map((item) => {
            const isUnlimited = item.limit === -1;
            const pct = isUnlimited ? 0 : Math.min(100, (item.used / item.limit) * 100);
            const isNearLimit = !isUnlimited && pct >= 80;
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#1A1A1A]">{item.label}</span>
                  <span className={`font-medium ${isNearLimit ? 'text-[#bc374e]' : 'text-[#6d6d75]'}`}>
                    {item.used} / {isUnlimited ? 'sem limite' : item.limit}
                  </span>
                </div>
                {!isUnlimited && <Progress value={pct} className={`h-2 ${isNearLimit ? '[&>div]:bg-[#bc374e]' : ''}`} />}
              </div>
            );
          })}
        </div>
      )}
    </Card>

    <Card className={cardClass}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-[#1A1A1A]">
          <Crown className="h-5 w-5 text-[#EF3333]" />
          Plano Atual
        </h3>
        <Badge variant="outline" className="rounded-full border-[#f2d4d8] bg-[#fff3f5] text-[#9b2a3d] capitalize">
          {plans.find((plan) => plan.id === currentPlan)?.name || currentPlan}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const priceFormatted = plan.price_cents === 0 ? 'R$ 0' : `R$ ${(plan.price_cents / 100).toFixed(0)}`;

          return (
            <div
              key={plan.id}
              className={`space-y-3 rounded-xl border p-4 transition-all ${
                isCurrent ? 'border-[#f2d4d8] bg-[#fff5f6] ring-1 ring-[#ef3333]/20' : 'border-[#e7e7ec] hover:border-[#d8d8de]'
              }`}
            >
              <div>
                <p className="font-semibold text-[#1A1A1A]">{plan.name}</p>
                <p className="text-xl font-bold text-[#1A1A1A]">
                  {priceFormatted}
                  <span className="text-xs font-normal text-[#6d6d75]">/mes</span>
                </p>
              </div>

              <ul className="space-y-1.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-1.5 text-xs text-[#6d6d75]">
                    <Check className="h-3 w-3 shrink-0 text-[#EF3333]" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="outline" size="sm" className="w-full rounded-xl" disabled>
                  Plano atual
                </Button>
              ) : !plan.stripe_price_id ? (
                currentPlan !== 'free' ? (
                  <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={onManageSubscription}>
                    Gerenciar
                  </Button>
                ) : null
              ) : (
                <Button
                  size="sm"
                  className="w-full gap-1 rounded-xl gradient-primary text-primary-foreground"
                  onClick={() => onUpgrade(plan.id)}
                  disabled={checkoutLoading === plan.id}
                >
                  {checkoutLoading === plan.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                  Fazer upgrade
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {currentPlan !== 'free' && (
        <div className="pt-4">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl border-[#e6e6eb] hover:bg-[#f8f8fa]" onClick={onManageSubscription}>
            <ExternalLink className="h-4 w-4" />
            Gerenciar assinatura no portal
          </Button>
        </div>
      )}
    </Card>
  </div>
);
