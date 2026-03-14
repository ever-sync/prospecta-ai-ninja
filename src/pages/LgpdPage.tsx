import { useEffect, useState } from "react";
import { ShieldCheck, RotateCcw } from "lucide-react";
import { getCookieConsentValue, resetCookieConsentValue } from "react-cookie-consent";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LegalPageLayout } from "@/components/site/LegalPageLayout";
import { BRAND } from "@/config/brand";
import { COOKIE_CONSENT_NAME } from "@/config/legal";

const resolveConsentLabel = (value?: string) => {
  if (value === "accepted") return "Cookies opcionais aceitos";
  if (value === "declined") return "Somente cookies essenciais";
  return "Consentimento ainda nao definido";
};

const LgpdPage = () => {
  const [consentValue, setConsentValue] = useState<string | undefined>();

  useEffect(() => {
    setConsentValue(getCookieConsentValue(COOKIE_CONSENT_NAME));
  }, []);

  const handleResetConsent = () => {
    resetCookieConsentValue(COOKIE_CONSENT_NAME);
    window.localStorage.removeItem(COOKIE_CONSENT_NAME);
    window.location.reload();
  };

  return (
    <LegalPageLayout
      title="LGPD e Cookies"
      summary="Esta pagina resume como a envPRO trata dados pessoais sob a perspectiva da LGPD, quais sao os seus direitos e como voce pode revisar o consentimento relacionado a cookies e tecnologias locais."
    >
      <Card className="rounded-[28px] border border-[#f2d4d8] bg-[#fff7f8] p-8 shadow-[0_14px_36px_rgba(20,20,24,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ef3333]">Painel de consentimento</p>
            <h2 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-[#1A1A1A]">
              <ShieldCheck className="h-6 w-6 text-[#ef3333]" />
              {resolveConsentLabel(consentValue)}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f5f67]">
              Se quiser rever sua escolha, limpe o registro de consentimento. O banner voltara a aparecer no site para que voce
              possa aceitar ou recusar cookies opcionais novamente.
            </p>
          </div>

          <Button
            onClick={handleResetConsent}
            variant="outline"
            className="h-11 rounded-full border-[#ef3333]/25 text-[#b3273a] hover:bg-[#fff1f3]"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Rever consentimento
          </Button>
        </div>
      </Card>

      <section className="rounded-[28px] border border-[#ececf0] bg-white p-8 shadow-[0_14px_36px_rgba(20,20,24,0.06)]">
        <h2 className="text-2xl font-semibold text-[#1A1A1A]">1. Seus direitos como titular</h2>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Confirmar se tratamos seus dados pessoais.</li>
          <li>Solicitar acesso, correcao, atualizacao ou complementacao de dados.</li>
          <li>Solicitar anonimizacao, bloqueio ou eliminacao quando houver excesso ou irregularidade.</li>
          <li>Solicitar informacoes sobre compartilhamento e portabilidade, quando aplicavel.</li>
          <li>Revogar consentimento e pedir eliminacao de dados tratados com essa base legal, observadas as excecoes legais.</li>
        </ul>
      </section>

      <section className="rounded-[28px] border border-[#ececf0] bg-white p-8 shadow-[0_14px_36px_rgba(20,20,24,0.06)]">
        <h2 className="text-2xl font-semibold text-[#1A1A1A]">2. Como exercitar esses direitos</h2>
        <p className="mt-4 text-sm leading-7 text-[#5f5f67]">
          Para exercicio de direitos previstos na LGPD, envie sua solicitacao para {BRAND.contactEmail} com o assunto
          "LGPD - Solicitacao do Titular". Se o tema for operacional ou tecnico, tambem atendemos por {BRAND.supportEmail}.
        </p>
        <p className="mt-4 text-sm leading-7 text-[#5f5f67]">
          Para validacao de identidade e seguranca, podemos solicitar informacoes adicionais antes de atender a demanda.
        </p>
      </section>

      <section className="rounded-[28px] border border-[#ececf0] bg-white p-8 shadow-[0_14px_36px_rgba(20,20,24,0.06)]">
        <h2 className="text-2xl font-semibold text-[#1A1A1A]">3. Cookies usados pelo site</h2>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Cookies essenciais para autenticacao, seguranca e protecao de rotas.</li>
          <li>Preferencias locais da interface, como estado de navegacao e consentimento.</li>
          <li>Registros necessarios para formularios, fluxo comercial e operacao tecnica do site.</li>
        </ul>
        <p className="mt-4 text-sm leading-7 text-[#5f5f67]">
          Se houver ativacao futura de recursos opcionais de medicao, personalizacao ou automacao que dependam de consentimento,
          o banner LGPD continuara sendo o ponto de controle dessa escolha.
        </p>
      </section>

      <section className="rounded-[28px] border border-[#ececf0] bg-white p-8 shadow-[0_14px_36px_rgba(20,20,24,0.06)]">
        <h2 className="text-2xl font-semibold text-[#1A1A1A]">4. Canal de atendimento</h2>
        <p className="mt-4 text-sm leading-7 text-[#5f5f67]">Privacidade e LGPD: {BRAND.contactEmail}</p>
        <p className="mt-2 text-sm leading-7 text-[#5f5f67]">Suporte operacional: {BRAND.supportEmail}</p>
        <p className="mt-2 text-sm leading-7 text-[#5f5f67]">WhatsApp de suporte: {BRAND.supportPhoneDisplay}</p>
      </section>
    </LegalPageLayout>
  );
};

export default LgpdPage;
