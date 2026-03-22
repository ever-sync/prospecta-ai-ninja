import { FileText, Loader2, Sparkles } from 'lucide-react';
import TemplatesManager from '@/components/TemplatesManager';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UpgradePlanDialog } from '@/components/subscription/UpgradePlanDialog';
import { useSubscription } from '@/hooks/useSubscription';
import { useState } from 'react';

const Templates = () => {
  const { subscription, plans, startCheckout, loading } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const currentPlan = subscription?.plan || 'free';
  const isFreePlan = !loading && currentPlan === 'free';

  if (loading) {
    return (
      <div className="flex justify-center p-4 lg:p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#EF3333]" />
      </div>
    );
  }

  if (isFreePlan) {
    return (
      <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
        <UpgradePlanDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          title="Templates bloqueados no plano gratuito"
          description="Templates ficam liberados somente nos planos pagos. Ative um plano para montar mensagens, variantes e playbooks."
          plans={plans}
          startCheckout={startCheckout}
        />

        <section className="rounded-[28px] border border-[#ececf0] bg-white px-5 py-6 shadow-[0_14px_36px_rgba(20,20,24,0.06)] lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#75757d]">Playbook Comercial</p>
              <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight text-[#1A1A1A] lg:text-4xl">
                <FileText className="h-7 w-7 text-[#EF3333]" />
                Templates
              </h1>
              <p className="mt-2 text-sm text-[#66666d] lg:text-base">
                Este modulo fica liberado somente nos planos pagos.
              </p>
            </div>
            <Button onClick={() => setShowUpgradeDialog(true)} className="rounded-xl gradient-primary text-primary-foreground">
              Ativar plano
            </Button>
          </div>
        </section>

        <Card className="rounded-[28px] border border-[#f2d4d8] bg-white p-8 shadow-[0_12px_28px_rgba(20,20,24,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b94456]">Plano gratuito</p>
          <h2 className="mt-3 text-2xl font-semibold text-[#1A1A1A]">Templates bloqueados</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6d6d75]">
            No gratuito voce pode gerar ate 3 apresentacoes por mes. Para salvar mensagens, variantes e estruturas de campanha, faca upgrade do plano.
          </p>
          <div className="mt-6">
            <Button onClick={() => setShowUpgradeDialog(true)} className="rounded-xl gradient-primary text-primary-foreground">
              Fazer upgrade
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
      <section className="rounded-[28px] border border-[#ececf0] bg-white px-5 py-6 shadow-[0_14px_36px_rgba(20,20,24,0.06)] lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#75757d]">Playbook Comercial</p>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight text-[#1A1A1A] lg:text-4xl">
              <FileText className="h-7 w-7 text-[#EF3333]" />
              Templates
            </h1>
            <p className="mt-2 text-sm text-[#66666d] lg:text-base">
              Organize mensagens, variantes A/B e modelos de proposta no mesmo padrao visual do dashboard.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-2xl border border-[#f2d4d8] bg-[#fff5f6] px-4 py-3 sm:block">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b94456]">Recomendado</p>
              <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-[#7f2432]">
                <Sparkles className="h-4 w-4" />
                Mantenha 2 variantes por canal
              </p>
            </div>
          </div>
        </div>
      </section>

      <TemplatesManager />
    </div>
  );
};

export default Templates;
