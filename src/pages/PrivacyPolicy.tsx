import { LegalPageLayout } from "@/components/site/LegalPageLayout";
import { BRAND } from "@/config/brand";

const cardClass = "rounded-[28px] border border-[#ececf0] bg-white p-8 shadow-[0_14px_36px_rgba(20,20,24,0.06)]";
const titleClass = "text-2xl font-semibold text-[#1A1A1A]";
const textClass = "mt-4 text-sm leading-7 text-[#5f5f67]";

const PrivacyPolicy = () => {
  return (
    <LegalPageLayout
      title="Politica de Privacidade"
      summary="Este documento explica como a envPRO coleta, usa, armazena e protege dados pessoais quando voce navega no site, cria conta, utiliza formularios ou interage com nossos canais."
    >
      <section className={cardClass}>
        <h2 className={titleClass}>1. Controlador dos dados</h2>
        <p className={textClass}>
          A {BRAND.name}, acessivel em {BRAND.domain}, atua como controladora dos dados pessoais tratados no contexto do site,
          do cadastro de usuarios, das paginas publicas e das funcionalidades da plataforma. Contato principal: {BRAND.contactEmail}.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>2. Dados que podemos coletar</h2>
        <p className={textClass}>Podemos tratar as seguintes categorias de dados, conforme a sua interacao com o site e a plataforma:</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Dados cadastrais, como nome, email, telefone e empresa.</li>
          <li>Dados de autenticacao e sessao, inclusive informacoes necessarias para login e seguranca da conta.</li>
          <li>Dados enviados em formularios, propostas, campanhas e interacoes comerciais.</li>
          <li>Dados tecnicos de uso, como endereco IP, navegador, dispositivo, paginas acessadas e horarios de acesso.</li>
          <li>Preferencias gravadas por cookies e armazenamento local, inclusive consentimento LGPD.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>3. Finalidades do tratamento</h2>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Disponibilizar o site, a area autenticada e os recursos contratados.</li>
          <li>Executar autenticacao, seguranca, prevencao a fraude e protecao de conta.</li>
          <li>Processar formularios, auditorias, campanhas, propostas e interacoes comerciais solicitadas pelo usuario.</li>
          <li>Responder contato comercial, suporte, atendimento e solicitacoes relacionadas a LGPD.</li>
          <li>Cumprir obrigacoes legais, regulatorias e exercer direitos em processos administrativos ou judiciais.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>4. Bases legais</h2>
        <p className={textClass}>
          O tratamento de dados pessoais pode ocorrer com fundamento em execucao de contrato, procedimentos preliminares,
          cumprimento de obrigacao legal, exercicio regular de direitos, interesse legitimo e, quando aplicavel, consentimento.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>5. Compartilhamento com terceiros</h2>
        <p className={textClass}>A {BRAND.name} pode compartilhar dados com operadores e fornecedores indispensaveis para a operacao do servico, como:</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Infraestrutura em nuvem, autenticacao, banco de dados e hospedagem.</li>
          <li>Servicos de email, mensageria, processamento de campanhas e automacao.</li>
          <li>Ferramentas de IA, crawling, enrichment e geracao de conteudo contratadas pelo usuario ou pela plataforma.</li>
          <li>Prestadores de suporte, compliance, contabilidade ou defesa juridica, quando necessario.</li>
        </ul>
        <p className={textClass}>Sempre que possivel, o compartilhamento sera limitado ao minimo necessario para cada finalidade.</p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>6. Cookies e armazenamento local</h2>
        <p className={textClass}>O site pode utilizar cookies e tecnologias equivalentes para:</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Manter autenticacao, sessao, protecao de rotas e seguranca.</li>
          <li>Guardar preferencias de interface, consentimento e configuracoes locais.</li>
          <li>Viabilizar experiencias opcionais que dependam de autorizacao do usuario.</li>
        </ul>
        <p className={textClass}>Voce pode rever ou revogar o consentimento na pagina de LGPD e Cookies.</p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>7. Retencao e seguranca</h2>
        <p className={textClass}>
          Os dados sao mantidos pelo periodo necessario para cumprir as finalidades descritas nesta politica, respeitando
          prazos legais, regulatorios e necessidades de seguranca. Adotamos medidas administrativas e tecnicas razoaveis
          para reduzir riscos de acesso nao autorizado, alteracao indevida, perda ou destruicao de dados.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>8. Direitos do titular</h2>
        <p className={textClass}>Nos termos da LGPD, o titular pode solicitar, quando aplicavel:</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Confirmacao da existencia de tratamento e acesso aos dados.</li>
          <li>Correcao de dados incompletos, inexatos ou desatualizados.</li>
          <li>Anonimizacao, bloqueio ou eliminacao de dados desnecessarios.</li>
          <li>Portabilidade, informacao sobre compartilhamentos e revisao de consentimento.</li>
          <li>Eliminacao de dados tratados com base em consentimento, quando cabivel.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>9. Contato para privacidade</h2>
        <p className={textClass}>
          Solicitacoes relacionadas a dados pessoais, privacidade e exercicio de direitos podem ser encaminhadas para
          {` ${BRAND.contactEmail}`} ou {` ${BRAND.supportEmail}`}. Se necessario, tambem atendemos pelo WhatsApp {BRAND.supportPhoneDisplay}.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
