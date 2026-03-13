import { useMemo, useState } from 'react';
import { Dna, Quote, ImageIcon, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DNAFormTab from '@/components/DNAFormTab';
import TestimonialsTab from '@/components/TestimonialsTab';
import ClientLogosTab from '@/components/ClientLogosTab';

const DNA = () => {
  const [activeTab, setActiveTab] = useState('dna');

  const activeCopy = useMemo(() => {
    if (activeTab === 'testimonials') {
      return {
        title: 'Provas Sociais',
        subtitle: 'Organize depoimentos para reforcar confianca nas apresentacoes.',
      };
    }
    if (activeTab === 'logos') {
      return {
        title: 'Credibilidade Visual',
        subtitle: 'Gerencie logos de clientes para fortalecer autoridade da marca.',
      };
    }
    return {
      title: 'Essencia da Empresa',
      subtitle: 'Defina servicos, diferenciais e posicionamento para IA gerar abordagens melhores.',
    };
  }, [activeTab]);

  return (
    <div className="space-y-4 p-2 lg:space-y-5 lg:p-4">
      <section className="rounded-[28px] border border-[#ececf0] bg-white px-5 py-6 shadow-[0_14px_36px_rgba(20,20,24,0.06)] lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#75757d]">Biblioteca de Marca</p>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight text-[#1A1A1A] lg:text-4xl">
              <Dna className="h-7 w-7 text-[#EF3333]" />
              DNA da Empresa
            </h1>
            <p className="mt-2 text-sm text-[#66666d] lg:text-base">{activeCopy.subtitle}</p>
          </div>

          <div className="rounded-2xl border border-[#f2d4d8] bg-[#fff5f6] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b94456]">Foco Atual</p>
            <p className="mt-1 text-sm font-semibold text-[#7f2432]">{activeCopy.title}</p>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-[22px] border border-[#ececf0] bg-[#f4f4f6] p-1.5">
          <TabsTrigger
            value="dna"
            className="flex h-12 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
          >
            <Dna className="h-4 w-4 text-[#EF3333]" />
            DNA
          </TabsTrigger>
          <TabsTrigger
            value="testimonials"
            className="flex h-12 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
          >
            <Quote className="h-4 w-4 text-[#EF3333]" />
            Testemunhos
          </TabsTrigger>
          <TabsTrigger
            value="logos"
            className="flex h-12 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
          >
            <ImageIcon className="h-4 w-4 text-[#EF3333]" />
            Logos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dna" className="mt-4">
          <div className="rounded-[24px] border border-[#ececf0] bg-white p-4 shadow-[0_10px_24px_rgba(18,18,22,0.05)] lg:p-6">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#EF3333]" />
              <p className="text-sm font-semibold text-[#1A1A1A]">Base estrategica da marca</p>
            </div>
            <DNAFormTab />
          </div>
        </TabsContent>

        <TabsContent value="testimonials" className="mt-4">
          <div className="rounded-[24px] border border-[#ececf0] bg-white p-4 shadow-[0_10px_24px_rgba(18,18,22,0.05)] lg:p-6">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#EF3333]" />
              <p className="text-sm font-semibold text-[#1A1A1A]">Provas sociais em destaque</p>
            </div>
            <TestimonialsTab />
          </div>
        </TabsContent>

        <TabsContent value="logos" className="mt-4">
          <div className="rounded-[24px] border border-[#ececf0] bg-white p-4 shadow-[0_10px_24px_rgba(18,18,22,0.05)] lg:p-6">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#EF3333]" />
              <p className="text-sm font-semibold text-[#1A1A1A]">Galeria de marcas atendidas</p>
            </div>
            <ClientLogosTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DNA;
