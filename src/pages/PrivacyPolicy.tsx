import { LegalPageLayout } from "@/components/site/LegalPageLayout";
import { BRAND } from "@/config/brand";

const cardClass = "rounded-[28px] border border-[#ececf0] bg-white p-8 shadow-[0_14px_36px_rgba(20,20,24,0.06)]";
const titleClass = "text-2xl font-semibold text-[#1A1A1A]";
const textClass = "mt-4 text-sm leading-7 text-[#5f5f67]";

const PrivacyPolicy = () => {
  return (
    <LegalPageLayout
      title="Pol?tica de Privacidade"
      summary="Este documento explica como a envPRO coleta, usa, armazena e protege dados pessoais quando voc? navega no site, cria conta, utiliza formul?rios ou interage com nossos canais."
    >
      <section className={cardClass}>
        <h2 className={titleClass}>1. Controlador dos dados</h2>
        <p className={textClass}>
          A {BRAND.name}, acessivel em {BRAND.domain}, atua como controladora dos dados pessoais tratados no contexto do site,
          do cadastro de usu?rios, das p?ginas p?blicas e das funcionalidades da plataforma. Contato principal: {BRAND.contactEmail}.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>2. Dados que podemos coletar</h2>
        <p className={textClass}>Podemos tratar as seguintes categorias de dados, conforme a sua intera??o com o site e a plataforma:</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Dados cadastrais, como nome, email, telefone e empresa.</li>
          <li>Dados de autentica??o e sess?o, inclusive informa??es necess?rias para login e seguran?a da conta.</li>
          <li>Dados enviados em formul?rios, propostas, campanhas e intera??es comerciais.</li>
          <li>Dados t?cnicos de uso, como endere?o IP, navegador, dispositivo, p?ginas acessadas e hor?rios de acesso.</li>
          <li>Preferencias gravadas por cookies e armazenamento local, inclusive consentimento LGPD.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>3. Finalidades do tratamento</h2>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Disponibilizar o site, a ?rea autenticada e os recursos contratados.</li>
          <li>Executar autentica??o, seguran?a, preven??o ? fraude e prote??o de conta.</li>
          <li>Processar formul?rios, auditorias, campanhas, propostas e intera??es comerciais solicitadas pelo usu?rio.</li>
          <li>Responder contato comercial, suporte, atendimento e solicita??es relacionadas ? LGPD.</li>
          <li>Cumprir obriga??es legais, regulat?rias e exercer direitos em processos administrativos ou judiciais.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>4. Bases legais</h2>
        <p className={textClass}>
          O tratamento de dados pessoais pode ocorrer com fundamento em execu??o de contrato, procedimentos preliminares,
          cumprimento de obriga??o legal, exerc?cio regular de direitos, interesse leg?timo e, quando aplic?vel, consentimento.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>5. Compartilhamento com terceiros</h2>
        <p className={textClass}>A {BRAND.name} pode compartilhar dados com operadores e fornecedores indispens?veis para a opera??o do servi?o, como:</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Infraestrutura em nuvem, autentica??o, banco de dados e hospedagem.</li>
          <li>Servi?os de email, mensageria, processamento de campanhas e automa??o.</li>
          <li>Ferramentas de IA, crawling, enrichment e gera??o de conte?do contratadas pelo usu?rio ou pela plataforma.</li>
          <li>Prestadores de suporte, compliance, contabilidade ou defesa jur?dica, quando necess?rio.</li>
        </ul>
        <p className={textClass}>Sempre que poss?vel, o compartilhamento ser? limitado ao m?nimo necess?rio para cada finalidade.</p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>6. Cookies e armazenamento local</h2>
        <p className={textClass}>O site pode utilizar cookies e tecnologias equivalentes para:</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Manter autentica??o, sess?o, prote??o de rotas e seguran?a.</li>
          <li>Guardar prefer?ncias de interface, consentimento e configura??es locais.</li>
          <li>Viabilizar experi?ncias opcionais que dependam de autoriza??o do usu?rio.</li>
        </ul>
        <p className={textClass}>Voc? pode rever ou revogar o consentimento na p?gina de LGPD e Cookies.</p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>7. Reten??o e seguran?a</h2>
        <p className={textClass}>
          Os dados s?o mantidos pelo per?odo necess?rio para cumprir as finalidades descritas nesta pol?tica, respeitando
          prazos legais, regulat?rios e necessidades de seguran?a. Adotamos medidas administrativas e t?cnicas razo?veis
          para reduzir riscos de acesso n?o autorizado, altera??o indevida, perda ou destrui??o de dados.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>8. Direitos do titular</h2>
        <p className={textClass}>Nos termos da LGPD, o titular pode solicitar, quando aplicavel:</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Confirma??o da exist?ncia de tratamento e acesso aos dados.</li>
          <li>Corre??o de dados incompletos, inexatos ou desatualizados.</li>
          <li>Anonimiza??o, bloqueio ou elimina??o de dados desnecess?rios.</li>
          <li>Portabilidade, informa??o sobre compartilhamentos e revis?o de consentimento.</li>
          <li>Elimina??o de dados tratados com base em consentimento, quando cab?vel.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>9. Contato para privacidade</h2>
        <p className={textClass}>
          Solicita??es relacionadas a dados pessoais, privacidade e exerc?cio de direitos podem ser encaminhadas para
          {` ${BRAND.contactEmail}`} ou {` ${BRAND.supportEmail}`}. Se necess?rio, tamb?m atendemos pelo WhatsApp {BRAND.supportPhoneDisplay}.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
