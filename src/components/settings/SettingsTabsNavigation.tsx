import { Building2, CreditCard, KeyRound, SlidersHorizontal } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export const SettingsTabsNavigation = () => (
  <TabsList className="grid h-auto w-full grid-cols-2 rounded-[22px] border border-[#ececf0] bg-[#f4f4f6] p-1.5 lg:grid-cols-4">
    <TabsTrigger
      value="empresa"
      className="flex h-11 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
    >
      <Building2 className="h-4 w-4 text-[#EF3333]" />
      Empresa
    </TabsTrigger>
    <TabsTrigger
      value="faturamento"
      className="flex h-11 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
    >
      <CreditCard className="h-4 w-4 text-[#EF3333]" />
      Faturamento
    </TabsTrigger>
    <TabsTrigger
      value="integracoes"
      className="flex h-11 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
    >
      <SlidersHorizontal className="h-4 w-4 text-[#EF3333]" />
      Integracoes/APIs
    </TabsTrigger>
    <TabsTrigger
      value="apis"
      className="flex h-11 items-center gap-2 rounded-2xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1A1A1A] data-[state=active]:shadow-[inset_0_0_0_1px_rgba(239,51,51,0.22)]"
    >
      <KeyRound className="h-4 w-4 text-[#EF3333]" />
      Chaves IAs
    </TabsTrigger>
  </TabsList>
);
