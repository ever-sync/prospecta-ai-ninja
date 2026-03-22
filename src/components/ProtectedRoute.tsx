import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, ExternalLink, RefreshCcw, Sparkles } from 'lucide-react';

const BillingBlockedState = () => {
  const { subscription, plans, openCustomerPortal, startCheckout, refreshSubscription } = useSubscription();

  const fallbackPaidPlan = plans
    .filter((plan) => plan.id !== 'free' && !!plan.stripe_price_id)
    .sort((left, right) => left.price_cents - right.price_cents)[0];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-2xl rounded-[28px] border border-[#f2d4d8] bg-white p-8 shadow-[0_20px_60px_rgba(12,12,18,0.10)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff5f6] text-[#EF3333]">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-[#1A1A1A]">Acesso temporariamente bloqueado por billing</h1>
        <p className="mt-3 text-sm leading-7 text-[#6d6d75]">
          {subscription?.block_reason || 'Sua assinatura precisa ser regularizada para liberar o acesso novamente.'}
        </p>

        <div className="mt-6 rounded-2xl border border-[#ececf0] bg-[#f8f8fa] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9b4458]">Status atual</p>
          <p className="mt-2 text-sm text-[#1A1A1A]">
            Plano: <span className="font-semibold capitalize">{subscription?.plan || 'free'}</span>
          </p>
          {subscription?.billing_status && (
            <p className="mt-1 text-sm text-[#1A1A1A]">
              Stripe: <span className="font-semibold">{subscription.billing_status}</span>
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            className="gap-2 rounded-xl bg-[#EF3333] text-white hover:bg-[#d62e2e]"
            onClick={() => void openCustomerPortal()}
          >
            <CreditCard className="h-4 w-4" />
            Regularizar no portal Stripe
          </Button>
          {fallbackPaidPlan && (
            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => void startCheckout(fallbackPaidPlan.id)}
            >
              <ExternalLink className="h-4 w-4" />
              Gerar novo checkout
            </Button>
          )}
          <Button
            variant="ghost"
            className="gap-2 rounded-xl"
            onClick={() => void refreshSubscription()}
          >
            <RefreshCcw className="h-4 w-4" />
            Atualizar status
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { loading: subscriptionLoading, isBillingBlocked } = useSubscription();

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center glow-primary animate-pulse">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isBillingBlocked) {
    return <BillingBlockedState />;
  }

  return <>{children}</>;
};
