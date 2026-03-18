import { LegalPageLayout } from "@/components/site/LegalPageLayout";
import { BRAND } from "@/config/brand";

const cardClass = "rounded-[28px] border border-[#ececf0] bg-white p-8 shadow-[0_14px_36px_rgba(20,20,24,0.06)]";
const titleClass = "text-2xl font-semibold text-[#1A1A1A]";
const textClass = "mt-4 text-sm leading-7 text-[#5f5f67]";

const TermsOfUse = () => {
  return (
    <LegalPageLayout
      title="Termos de Uso"
      summary="Estes termos regulam o acesso ao site e ao uso da plataforma envPRO. Ao navegar, criar conta ou utilizar os recursos dispon?veis, o usu?rio declara estar de acordo com as condi??es abaixo."
    >
      <section className={cardClass}>
        <h2 className={titleClass}>1. Objeto</h2>
        <p className={textClass}>
          A {BRAND.name} disponibiliza recursos para prospec??o, auditoria comercial, leitura consultiva, gera??o de propostas,
          campanhas e opera??es relacionadas ao fluxo comercial do usu?rio.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>2. Cadastro e responsabilidade da conta</h2>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>O usu?rio deve fornecer informa??es verdadeiras, atualizadas e suficientes para o uso da plataforma.</li>
          <li>Credenciais de acesso s?o pessoais e n?o devem ser compartilhadas com terceiros sem autoriza??o formal.</li>
          <li>O titular da conta responde pelas atividades realizadas a partir de seu login e de suas integracoes.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>3. Uso permitido</h2>
        <p className={textClass}>O usu?rio se compromete a utilizar a plataforma de forma l?cita, ?tica e compat?vel com a legisla??o aplic?vel.</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>? vedado utilizar a envPRO para fraude, spam ilegal, ass?dio, engenharia social abusiva ou viola??o de direitos de terceiros.</li>
          <li>? vedado tentar contornar limites t?cnicos, explorar falhas ou acessar dados sem permiss?o.</li>
          <li>? vedado inserir conte?do il?cito, ofensivo, discriminat?rio ou que viole propriedade intelectual de terceiros.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>4. Integra??es e servi?os de terceiros</h2>
        <p className={textClass}>
          A plataforma pode depender de servi?os de terceiros para autentica??o, IA, envio de email, mensagens, scraping,
          hospedagem e pagamentos. O uso dessas integra??es pode exigir credenciais pr?prias do usu?rio e tamb?m fica sujeito
          aos termos e pol?ticas dos respectivos fornecedores.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>5. Propriedade intelectual</h2>
        <p className={textClass}>
          O software, a marca {BRAND.name}, a identidade visual, os fluxos, os textos-base, componentes e demais elementos
          da plataforma pertencem a seus titulares e n?o podem ser copiados, revendidos, desmontados ou explorados sem autoriza??o.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>6. Planos, cobranca e uso de APIs</h2>
        <p className={textClass}>
          Alguns recursos podem depender de assinatura, franquia de uso ou configura??es adicionais. Quando o usu?rio conectar
          chaves pr?prias de IA ou integra??es externas, ele permanece respons?vel pelos custos, limites e compliance desses servi?os.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>7. Disponibilidade e limita??es</h2>
        <p className={textClass}>
          A {BRAND.name} busca manter a plataforma dispon?vel e segura, mas n?o garante opera??o ininterrupta nem aus?ncia absoluta de falhas,
          indisponibilidades, mudan?as de provedores terceiros ou varia??es de resposta de modelos de IA e servi?os externos.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>8. Suspens?o e encerramento</h2>
        <p className={textClass}>
          Contas podem ser suspensas ou encerradas em caso de viola??o destes termos, uso abusivo, risco operacional, fraude,
          exig?ncia legal ou inadimplemento, sem preju?zo das medidas cab?veis para resguardar a plataforma e terceiros.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>9. Privacidade e prote??o de dados</h2>
        <p className={textClass}>
          O tratamento de dados pessoais segue a Pol?tica de Privacidade e a p?gina de LGPD e Cookies, que integram estes termos
          para todos os fins.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>10. Contato e foro</h2>
        <p className={textClass}>
          Em caso de d?vidas sobre estes termos, entre em contato por {BRAND.contactEmail}. Na aus?ncia de disposi??o legal diversa,
          aplica-se ? legisla??o brasileira.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default TermsOfUse;
