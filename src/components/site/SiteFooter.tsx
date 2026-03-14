import { Link } from "react-router-dom";
import { BRAND } from "@/config/brand";
import loginLogo from "@/logos/ligth.svg";

export const SiteFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#ececf0] py-12">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1.2fr_0.9fr_1fr]">
        <div className="flex flex-col gap-3 text-center lg:text-left">
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <img src={loginLogo} alt={BRAND.name} className="h-8 w-auto opacity-60" />
            <span className="text-sm font-semibold tracking-[0.16em] text-[#1A1A1A]">{BRAND.name}</span>
          </div>
          <p className="text-sm leading-relaxed text-[#75757d]">
            Scanner consultivo, auditoria pesada e propostas comerciais com foco em leitura de mercado e conformidade.
          </p>
          <p className="text-sm text-[#75757d]">Copyright {year} {BRAND.name}. Todos os direitos reservados.</p>
        </div>

        <div className="grid gap-3 text-center lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a8a92]">Base legal</p>
          <Link to="/politica-de-privacidade" className="text-sm text-[#75757d] transition-colors hover:text-[#ef3333]">
            Politica de Privacidade
          </Link>
          <Link to="/termos-de-uso" className="text-sm text-[#75757d] transition-colors hover:text-[#ef3333]">
            Termos de Uso
          </Link>
          <Link to="/lgpd" className="text-sm text-[#75757d] transition-colors hover:text-[#ef3333]">
            LGPD e Cookies
          </Link>
        </div>

        <div className="grid gap-3 text-center lg:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a8a92]">Contato</p>
          <a href={BRAND.websiteUrl} className="text-sm text-[#75757d] transition-colors hover:text-[#ef3333]">
            {BRAND.domain}
          </a>
          <a href={`mailto:${BRAND.contactEmail}`} className="text-sm text-[#75757d] transition-colors hover:text-[#ef3333]">
            {BRAND.contactEmail}
          </a>
          <a href={`mailto:${BRAND.supportEmail}`} className="text-sm text-[#75757d] transition-colors hover:text-[#ef3333]">
            {BRAND.supportEmail}
          </a>
          <a href={`https://wa.me/${BRAND.supportPhoneRaw}`} className="text-sm text-[#75757d] transition-colors hover:text-[#ef3333]">
            WhatsApp: {BRAND.supportPhoneDisplay}
          </a>
          <a href={BRAND.instagramUrl} target="_blank" rel="noreferrer" className="text-sm text-[#75757d] transition-colors hover:text-[#ef3333]">
            Instagram: @{BRAND.instagramHandle}
          </a>
        </div>
      </div>
    </footer>
  );
};
