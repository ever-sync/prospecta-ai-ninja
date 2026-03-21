import { LegalPageLayout } from "@/components/site/LegalPageLayout";
import { BRAND } from "@/config/brand";

const cardClass = "rounded-[28px] border border-[#ececf0] bg-white p-8 shadow-[0_14px_36px_rgba(20,20,24,0.06)]";
const titleClass = "text-2xl font-semibold text-[#1A1A1A]";
const textClass = "mt-4 text-sm leading-7 text-[#5f5f67]";

const TermsOfUse = () => {
  return (
    <LegalPageLayout
      title="Termos de Uso"
      summary="Estes termos regulam o acesso ao site e ao uso da plataforma envPRO. Ao navegar, criar conta ou utilizar os recursos disponíveis, o usuário declara estar de acordo com as condições abaixo."
    >
      <section className={cardClass}>
        <h2 className={titleClass}>1. Objeto</h2>
        <p className={textClass}>
          A {BRAND.name} disponibiliza recursos para prospecção, auditoria comercial, leitura consultiva, geração de propostas,
          campanhas e operações relacionadas ao fluxo comercial do usuário.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>2. Cadastro e responsabilidade da conta</h2>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>O usuário deve fornecer informações verdadeiras, atualizadas e suficientes para o uso da plataforma.</li>
          <li>Credenciais de acesso são pessoais e não devem ser compartilhadas com terceiros sem autorização formal.</li>
          <li>O titular da conta responde pelas atividades realizadas a partir de seu login e de suas integrações.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>3. Uso permitido</h2>
        <p className={textClass}>O usuário se compromete a utilizar a plataforma de forma lícita, ética e compatível com a legislação aplicável.</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>É vedado utilizar a envPRO para fraude, spam ilegal, assédio, engenharia social abusiva ou violação de direitos de terceiros.</li>
          <li>É vedado tentar contornar limites técnicos, explorar falhas ou acessar dados sem permissão.</li>
          <li>É vedado inserir conteúdo ilícito, ofensivo, discriminatório ou que viole propriedade intelectual de terceiros.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>4. Integrações e serviços de terceiros</h2>
        <p className={textClass}>
          A plataforma pode depender de serviços de terceiros para autenticação, IA, envio de email, mensagens, scraping,
          hospedagem e pagamentos. O uso dessas integrações pode exigir credenciais próprias do usuário e também fica sujeito
          aos termos e políticas dos respectivos fornecedores.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>5. Propriedade intelectual</h2>
        <p className={textClass}>
          O software, a marca {BRAND.name}, a identidade visual, os fluxos, os textos-base, componentes e demais elementos
          da plataforma pertencem a seus titulares e não podem ser copiados, revendidos, desmontados ou explorados sem autorização.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>6. Planos, cobrança e uso de APIs</h2>
        <p className={textClass}>
          Alguns recursos podem depender de assinatura, franquia de uso ou configurações adicionais. Quando o usuário conectar
          chaves próprias de IA ou integrações externas, ele permanece responsável pelos custos, limites e compliance desses serviços.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>7. Disponibilidade e limitações</h2>
        <p className={textClass}>
          A {BRAND.name} busca manter a plataforma disponível e segura, mas não garante operação ininterrupta nem ausência absoluta de falhas,
          indisponibilidades, mudanças de provedores terceiros ou variações de resposta de modelos de IA e serviços externos.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>8. Suspensão e encerramento</h2>
        <p className={textClass}>
          Contas podem ser suspensas ou encerradas em caso de violação destes termos, uso abusivo, risco operacional, fraude,
          exigência legal ou inadimplemento, sem prejuízo das medidas cabíveis para resguardar a plataforma e terceiros.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>9. Privacidade e proteção de dados</h2>
        <p className={textClass}>
          O tratamento de dados pessoais segue a Política de Privacidade e a página de LGPD e Cookies, que integram estes termos
          para todos os fins.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>10. Contato e foro</h2>
        <p className={textClass}>
          Em caso de dúvidas sobre estes termos, entre em contato por {BRAND.contactEmail}. Na ausência de disposição legal diversa,
          aplica-se à legislação brasileira.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default TermsOfUse;
