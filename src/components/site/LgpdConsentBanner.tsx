import CookieConsent from "react-cookie-consent";
import { Link } from "react-router-dom";
import { BRAND } from "@/config/brand";
import { COOKIE_CONSENT_NAME } from "@/config/legal";

export const LgpdConsentBanner = () => {
  const persistLocalChoice = (value: "accepted" | "declined") => {
    window.localStorage.setItem(COOKIE_CONSENT_NAME, value);
  };

  return (
    <CookieConsent
      location="bottom"
      buttonText="Aceitar cookies"
      declineButtonText="Recusar opcionais"
      enableDeclineButton
      cookieName={COOKIE_CONSENT_NAME}
      cookieValue="accepted"
      declineCookieValue="declined"
      sameSite="lax"
      expires={180}
      disableStyles
      containerClasses="fixed inset-x-4 bottom-4 z-[70] mx-auto flex max-w-5xl flex-col gap-4 rounded-[28px] border border-[#f2d4d8] bg-white/95 p-5 shadow-[0_24px_60px_rgba(20,20,24,0.18)] backdrop-blur"
      contentClasses="m-0 flex-1"
      buttonWrapperClasses="flex flex-col gap-3 sm:flex-row"
      buttonClasses="inline-flex h-11 items-center justify-center rounded-full bg-[#ef3333] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#d42c2c]"
      declineButtonClasses="inline-flex h-11 items-center justify-center rounded-full border border-[#d7d7de] px-5 text-sm font-semibold text-[#4f4f57] transition-colors hover:border-[#ef3333]/35 hover:text-[#ef3333]"
      onAccept={() => persistLocalChoice("accepted")}
      onDecline={() => persistLocalChoice("declined")}
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ef3333]">LGPD e Cookies</p>
        <p className="text-sm leading-relaxed text-[#4f4f57]">
          A {BRAND.name} usa cookies e armazenamento local para autentica??o, seguran?a, prefer?ncias do usu?rio
          e registro do consentimento. Recursos opcionais s? devem ser ativados mediante sua autoriza??o.
        </p>
        <p className="text-sm leading-relaxed text-[#6d6d75]">
          Leia nossa{" "}
          <Link to="/politica-de-privacidade" className="font-semibold text-[#ef3333] underline-offset-4 hover:underline">
            Pol?tica de Privacidade
          </Link>
          , os{" "}
          <Link to="/termos-de-uso" className="font-semibold text-[#ef3333] underline-offset-4 hover:underline">
            Termos de Uso
          </Link>
          {" "}e a p?gina de{" "}
          <Link to="/lgpd" className="font-semibold text-[#ef3333] underline-offset-4 hover:underline">
            LGPD
          </Link>
          .
        </p>
      </div>
    </CookieConsent>
  );
};
