import { Settings2, Sparkles } from 'lucide-react';

export const SettingsPageHeader = () => (
  <section className="rounded-[28px] border border-[#ececf0] bg-white px-5 py-6 shadow-[0_14px_36px_rgba(20,20,24,0.06)] lg:px-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[#75757d]">Painel Administrativo</p>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight text-[#1A1A1A] lg:text-4xl">
          <Settings2 className="h-7 w-7 text-[#EF3333]" />
          Configuracoes
        </h1>
        <p className="mt-2 text-sm text-[#66666d] lg:text-base">
          Gerencie dados da empresa, assinatura, integracoes e chaves de IA no mesmo padrao visual do dashboard.
        </p>
      </div>
      <div className="rounded-2xl border border-[#f2d4d8] bg-[#fff5f6] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b94456]">Dica</p>
        <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-[#7f2432]">
          <Sparkles className="h-4 w-4" />
          Complete o perfil para mais conversao
        </p>
      </div>
    </div>
  </section>
);
