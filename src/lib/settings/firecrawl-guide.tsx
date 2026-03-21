import { ExternalLink } from 'lucide-react';

export const firecrawlGuideSteps = [
  {
    step: 1,
    title: 'Acesse o site do Firecrawl',
    description: (
      <>
        Abra{' '}
        <a
          href="https://firecrawl.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-medium text-[#356DFF] underline-offset-2 hover:underline"
        >
          firecrawl.dev <ExternalLink className="h-3 w-3" />
        </a>{' '}
        no navegador e clique em <strong>Get Started</strong> ou <strong>Sign Up</strong>.
      </>
    ),
  },
  {
    step: 2,
    title: 'Crie sua conta gratuitamente',
    description: 'Cadastre-se com seu email ou conta Google. O plano gratuito ja inclui creditos suficientes para comecar.',
  },
  {
    step: 3,
    title: 'Acesse o painel da API',
    description: (
      <>
        Apos entrar, va no menu lateral e clique em <strong>API Keys</strong> ou acesse diretamente{' '}
        <a
          href="https://www.firecrawl.dev/app/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-medium text-[#356DFF] underline-offset-2 hover:underline"
        >
          firecrawl.dev/app/api-keys <ExternalLink className="h-3 w-3" />
        </a>
        .
      </>
    ),
  },
  {
    step: 4,
    title: 'Gere uma nova chave',
    description: 'Clique em "Create new key", de um nome para identificar, como "Prospecta", e confirme.',
  },
  {
    step: 5,
    title: 'Copie e cole aqui',
    description: 'Copie a chave gerada, que comeca com "fc-...", volte para esta pagina, cole no campo acima e clique em Validar.',
  },
];
