import { FileText, Sparkles } from 'lucide-react';
import TemplatesManager from '@/components/TemplatesManager';

const Templates = () => {
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
