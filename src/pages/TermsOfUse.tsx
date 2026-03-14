import { LegalPageLayout } from "@/components/site/LegalPageLayout";
import { BRAND } from "@/config/brand";

const cardClass = "rounded-[28px] border border-[#ececf0] bg-white p-8 shadow-[0_14px_36px_rgba(20,20,24,0.06)]";
const titleClass = "text-2xl font-semibold text-[#1A1A1A]";
const textClass = "mt-4 text-sm leading-7 text-[#5f5f67]";

const TermsOfUse = () => {
  return (
    <LegalPageLayout
      title="Termos de Uso"
      summary="Estes termos regulam o acesso ao site e ao uso da plataforma envPRO. Ao navegar, criar conta ou utilizar os recursos disponiveis, o usuario declara estar de acordo com as condicoes abaixo."
    >
      <section className={cardClass}>
        <h2 className={titleClass}>1. Objeto</h2>
        <p className={textClass}>
          A {BRAND.name} disponibiliza recursos para prospeccao, auditoria comercial, leitura consultiva, geracao de propostas,
          campanhas e operacoes relacionadas ao fluxo comercial do usuario.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>2. Cadastro e responsabilidade da conta</h2>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>O usuario deve fornecer informacoes verdadeiras, atualizadas e suficientes para o uso da plataforma.</li>
          <li>Credenciais de acesso sao pessoais e nao devem ser compartilhadas com terceiros sem autorizacao formal.</li>
          <li>O titular da conta responde pelas atividades realizadas a partir de seu login e de suas integracoes.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>3. Uso permitido</h2>
        <p className={textClass}>O usuario se compromete a utilizar a plataforma de forma licita, etica e compativel com a legislacao aplicavel.</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[#5f5f67]">
          <li>E vedado utilizar a envPRO para fraude, spam ilegal, assedio, engenharia social abusiva ou violacao de direitos de terceiros.</li>
          <li>E vedado tentar contornar limites tecnicos, explorar falhas ou acessar dados sem permissao.</li>
          <li>E vedado inserir conteudo ilicito, ofensivo, discriminatorio ou que viole propriedade intelectual de terceiros.</li>
        </ul>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>4. Integracoes e servicos de terceiros</h2>
        <p className={textClass}>
          A plataforma pode depender de servicos de terceiros para autenticacao, IA, envio de email, mensagens, scraping,
          hospedagem e pagamentos. O uso dessas integracoes pode exigir credenciais proprias do usuario e tambem fica sujeito
          aos termos e politicas dos respectivos fornecedores.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>5. Propriedade intelectual</h2>
        <p className={textClass}>
          O software, a marca {BRAND.name}, a identidade visual, os fluxos, os textos-base, componentes e demais elementos
          da plataforma pertencem a seus titulares e nao podem ser copiados, revendidos, desmontados ou explorados sem autorizacao.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>6. Planos, cobranca e uso de APIs</h2>
        <p className={textClass}>
          Alguns recursos podem depender de assinatura, franquia de uso ou configuracoes adicionais. Quando o usuario conectar
          chaves proprias de IA ou integracoes externas, ele permanece responsavel pelos custos, limites e compliance desses servicos.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>7. Disponibilidade e limitacoes</h2>
        <p className={textClass}>
          A {BRAND.name} busca manter a plataforma disponivel e segura, mas nao garante operacao ininterrupta nem ausencia absoluta de falhas,
          indisponibilidades, mudancas de provedores terceiros ou variacoes de resposta de modelos de IA e servicos externos.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>8. Suspensao e encerramento</h2>
        <p className={textClass}>
          Contas podem ser suspensas ou encerradas em caso de violacao destes termos, uso abusivo, risco operacional, fraude,
          exigencia legal ou inadimplemento, sem prejuizo das medidas cabiveis para resguardar a plataforma e terceiros.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>9. Privacidade e protecao de dados</h2>
        <p className={textClass}>
          O tratamento de dados pessoais segue a Politica de Privacidade e a pagina de LGPD e Cookies, que integram estes termos
          para todos os fins.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className={titleClass}>10. Contato e foro</h2>
        <p className={textClass}>
          Em caso de duvidas sobre estes termos, entre em contato por {BRAND.contactEmail}. Na ausencia de disposicao legal diversa,
          aplica-se a legislacao brasileira.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default TermsOfUse;
