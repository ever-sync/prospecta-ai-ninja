import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { BRAND } from "@/config/brand";
import { LEGAL_LAST_UPDATED } from "@/config/legal";
import { FloatingWhatsAppButton } from "@/components/site/FloatingWhatsAppButton";
import { SiteFooter } from "@/components/site/SiteFooter";
import { LgpdConsentBanner } from "@/components/site/LgpdConsentBanner";
import loginLogo from "@/logos/Group 157.svg";

type LegalPageLayoutProps = {
  title: string;
  summary: string;
  children: React.ReactNode;
};

export const LegalPageLayout = ({ title, summary, children }: LegalPageLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#fcfcfd] text-[#1A1A1A]">
      <header className="sticky top-0 z-40 border-b border-[#ececf0] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={loginLogo} alt={BRAND.name} className="h-9 w-auto" />
            <span className="text-sm font-semibold tracking-[0.16em] text-[#1A1A1A]">{BRAND.name}</span>
          </Link>

          <div className="flex items-center gap-5 text-sm font-medium text-[#66666d]">
            <Link to="/politica-de-privacidade" className="hidden transition-colors hover:text-[#ef3333] md:block">
              Privacidade
            </Link>
            <Link to="/termos-de-uso" className="hidden transition-colors hover:text-[#ef3333] md:block">
              Termos
            </Link>
            <Link to="/lgpd" className="hidden transition-colors hover:text-[#ef3333] md:block">
              LGPD
            </Link>
            <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-[#ececf0] px-4 py-2 text-[#4f4f57] transition-colors hover:border-[#ef3333]/35 hover:text-[#ef3333]">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao site
            </Link>
          </div>
        </div>
      </header>

      <main className="pb-24">
        <section className="border-b border-[#ececf0] bg-[linear-gradient(180deg,#fff_0%,#fff5f6_100%)]">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#ef3333]">Base jurídica do site</p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight lg:text-5xl">{title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#66666d]">{summary}</p>
            <p className="mt-4 text-sm font-medium text-[#8a8a92]">Última atualização: {LEGAL_LAST_UPDATED}</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="space-y-8">{children}</div>
        </section>
      </main>

      <SiteFooter />
      <FloatingWhatsAppButton />
      <LgpdConsentBanner />
    </div>
  );
};
