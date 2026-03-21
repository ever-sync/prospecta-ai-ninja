import { LegalPageLayout } from "@/components/site/LegalPageLayout";
import { BRAND } from "@/config/brand";

const cardClass = "rounded-[28px] border border-[#ececf0] bg-white p-8 shadow-[0_14px_36px_rgba(20,20,24,0.06)]";
const titleClass = "text-2xl font-semibold text-[#1A1A1A]";
const textClass = "mt-4 text-sm leading-7 text-[#5f5f67]";

const PrivacyPolicy = () => {
  return (
    <LegalPageLayout
      title="Política de Privacidade"
      summary="Este documento explica como a envPRO coleta, usa, armazena e protege dados pessoais quando você navega no site, cria conta, utiliza formulários ou interage com nossos canais."
    >
      <section className={cardClass}>
        <h2 className={titleClass}>1. Controlador dos dados</h2>
        <p className={textClass}>
          A {BRAND.name}, acessivel em {BRAND.domain}, atua como controladora dos dados pessoais tratados no contexto do site,
          do cadastro de usuários, das páginas públicas e das funcionalidades da plataforma. Contato principal: {BRAND.contactEmail}.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>2. Dados que podemos coletar</h2>
        <p className={textClass}>Podemos tratar as seguintes categorias de dados, conforme a sua interação com o site e a plataforma:</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Dados cadastrais, como nome, email, telefone e empresa.</li>
          <li>Dados de autenticação e sessão, inclusive informações necessárias para login e segurança da conta.</li>
          <li>Dados enviados em formulários, propostas, campanhas e interações comerciais.</li>
          <li>Dados técnicos de uso, como endereço IP, navegador, dispositivo, páginas acessadas e horários de acesso.</li>
          <li>Preferencias gravadas por cookies e armazenamento local, inclusive consentimento LGPD.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>3. Finalidades do tratamento</h2>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Disponibilizar o site, a área autenticada e os recursos contratados.</li>
          <li>Executar autenticação, segurança, prevenção à fraude e proteção de conta.</li>
          <li>Processar formulários, auditorias, campanhas, propostas e interações comerciais solicitadas pelo usuário.</li>
          <li>Responder contato comercial, suporte, atendimento e solicitações relacionadas à LGPD.</li>
          <li>Cumprir obrigações legais, regulatórias e exercer direitos em processos administrativos ou judiciais.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>4. Bases legais</h2>
        <p className={textClass}>
          O tratamento de dados pessoais pode ocorrer com fundamento em execução de contrato, procedimentos preliminares,
          cumprimento de obrigação legal, exercício regular de direitos, interesse legítimo e, quando aplicável, consentimento.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>5. Compartilhamento com terceiros</h2>
        <p className={textClass}>A {BRAND.name} pode compartilhar dados com operadores e fornecedores indispensáveis para a operação do serviço, como:</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Infraestrutura em nuvem, autenticação, banco de dados e hospedagem.</li>
          <li>Serviços de email, mensageria, processamento de campanhas e automação.</li>
          <li>Ferramentas de IA, crawling, enrichment e geração de conteúdo contratadas pelo usuário ou pela plataforma.</li>
          <li>Prestadores de suporte, compliance, contabilidade ou defesa jurídica, quando necessário.</li>
        </ul>
        <p className={textClass}>Sempre que possível, o compartilhamento será limitado ao mínimo necessário para cada finalidade.</p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>6. Cookies e armazenamento local</h2>
        <p className={textClass}>O site pode utilizar cookies e tecnologias equivalentes para:</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Manter autenticação, sessão, proteção de rotas e segurança.</li>
          <li>Guardar preferências de interface, consentimento e configurações locais.</li>
          <li>Viabilizar experiências opcionais que dependam de autorização do usuário.</li>
        </ul>
        <p className={textClass}>Você pode rever ou revogar o consentimento na página de LGPD e Cookies.</p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>7. Retenção e segurança</h2>
        <p className={textClass}>
          Os dados são mantidos pelo período necessário para cumprir as finalidades descritas nesta política, respeitando
          prazos legais, regulatórios e necessidades de segurança. Adotamos medidas administrativas e técnicas razoáveis
          para reduzir riscos de acesso não autorizado, alteração indevida, perda ou destruição de dados.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>8. Direitos do titular</h2>
        <p className={textClass}>Nos termos da LGPD, o titular pode solicitar, quando aplicavel:</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>Confirmação da existência de tratamento e acesso aos dados.</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
          <li>Portabilidade, informação sobre compartilhamentos e revisão de consentimento.</li>
          <li>Eliminação de dados tratados com base em consentimento, quando cabível.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>9. Contato para privacidade</h2>
        <p className={textClass}>
          Solicitações relacionadas a dados pessoais, privacidade e exercício de direitos podem ser encaminhadas para
          {` ${BRAND.contactEmail}`} ou {` ${BRAND.supportEmail}`}. Se necessário, também atendemos pelo WhatsApp {BRAND.supportPhoneDisplay}.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
