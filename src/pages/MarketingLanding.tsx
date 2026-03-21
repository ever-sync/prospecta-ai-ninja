import { motion, Variants } from "framer-motion";
import { ArrowRight, BarChart3, CheckCircle2, Clock, MessageSquare, Rocket, Search, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FloatingWhatsAppButton } from "@/components/site/FloatingWhatsAppButton";
import { SiteFooter } from "@/components/site/SiteFooter";
import { LgpdConsentBanner } from "@/components/site/LgpdConsentBanner";
import { useAuth } from "@/hooks/useAuth";
import { BRAND } from "@/config/brand";
import loginLogo from "@/logos/Group 157.svg";

const painPoints = [
  {
    icon: MessageSquare,
    title: "Vazio do silêncio",
    desc: "Pare de mandar propostas que somem no fundo da caixa de entrada sem abrir conversa real.",
  },
  {
    icon: Search,
    title: "Pesquisa cansativa",
    desc: "Troque horas abrindo abas por uma leitura estruturada do mercado em minutos.",
  },
  {
    icon: Zap,
    title: "Injustiça competitiva",
    desc: "Não deixe empresas menos preparadas ocuparem o espaço que deveria ser seu.",
  },
];

const featureCards = [
  {
    icon: Search,
    title: "DNA Scan",
    desc: "Auditoria de reputação, SEO, site e sinais comerciais em um fluxo único.",
  },
  {
    icon: BarChart3,
    title: "Benchmark",
    desc: "Compare o lead com o que ja funciona no mesmo recorte.",
  },
  {
    icon: Zap,
    title: "Smart Hooks",
    desc: "Ganchos de abordagem personalizados para cada oportunidade.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Loop",
    desc: "Transição rápida da leitura para o contato e a conversa.",
  },
];

const stats = [
  { icon: BarChart3, value: "80%", label: "Taxa de visualização", desc: "Leads que abrem a proposta" },
  { icon: MessageSquare, value: "30%", label: "Taxa de agendamento", desc: "Conversão em reuniões reais" },
  { icon: Clock, value: "+40h", label: "Horas economizadas", desc: "Por mês, por usuário" },
  { icon: Zap, value: "50x", label: "Mais produtivo", desc: "Escala com o poder da IA" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const MarketingLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCtaClick = () => {
    if (user) {
      navigate("/dashboard");
      return;
    }

    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-[#1A1A1A] selection:bg-[#ef3333]/10 selection:text-[#ef3333]">
      <nav className="fixed top-0 z-50 w-full border-b border-[#ececf0] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <img src={loginLogo} alt={BRAND.name} className="h-10 w-auto" />
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-[#66666d] transition-colors hover:text-[#ef3333]">
              Funcionalidades
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-[#66666d] transition-colors hover:text-[#ef3333]">
              Como funciona
            </a>
            <a href="#pricing" className="text-sm font-medium text-[#66666d] transition-colors hover:text-[#ef3333]">
              Preços
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" className="rounded-full text-sm font-semibold" onClick={handleCtaClick}>
              {user ? "Painel" : "Login"}
            </Button>
            <Button
              className="rounded-full bg-[#ef3333] px-6 font-semibold text-white shadow-lg shadow-[#ef3333]/20 hover:bg-[#d42c2c]"
              onClick={handleCtaClick}
            >
              {user ? "Ir para o Painel" : "Começar agora"}
            </Button>
          </div>
        </div>
      </nav>

      <section className="overflow-hidden pt-40 pb-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row">
          <motion.div className="flex-1 text-center lg:text-left" initial="hidden" animate="visible" variants={containerVariants}>
            <motion.div
              variants={itemVariants}
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#fff1f1] px-4 py-2 text-sm font-bold text-[#ef3333]"
            >
              <Rocket className="h-4 w-4" />
              <span>FOGUETE NA DIREÇÃO</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mb-8 text-5xl font-bold leading-[1.05] tracking-tight lg:text-[58px] xl:text-[66px]"
            >
              <span className="block lg:whitespace-nowrap">Pare de caçar leads.</span>
              <span className="block bg-gradient-to-r from-[#ef3333] to-[#ff6b6b] bg-clip-text text-transparent lg:whitespace-nowrap">
                Comece a fechar negócios.
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[#66666d] lg:mx-0 lg:text-xl"
            >
              Transforme a invisibilidade do Google em uma agenda cheia de reuniões. A {BRAND.name} opera como um scanner
              comercial que encontra oportunidades, gera leitura consultiva e acelera conversas reais.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Button
                className="group h-14 rounded-full bg-[#ef3333] px-8 text-lg font-bold text-white shadow-xl shadow-[#ef3333]/25 hover:bg-[#d42c2c]"
                onClick={handleCtaClick}
              >
                {user ? "Acessar painel" : "Testar o scanner"}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <p className="text-sm font-medium text-[#75757d]">Sem cartão de crédito. Resultado em minutos.</p>
            </motion.div>
          </motion.div>

          <motion.div
            className="relative flex-1"
            initial={{ opacity: 0, x: 50, rotate: 10 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="relative z-10 mx-auto w-full max-w-[500px]">
              <div className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-[40px] border border-white bg-gradient-to-br from-white to-[#f8f8fa] p-12">
                <div className="absolute inset-0 bg-[#ef3333]/5 opacity-0 transition-opacity group-hover:opacity-100" />
                <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                  <Rocket className="h-64 w-64 text-[#ef3333]" strokeWidth={1} />
                </motion.div>
                <div className="absolute top-10 right-10 h-20 w-20 rounded-full bg-[#ef3333]/10 blur-3xl" />
                <div className="absolute bottom-10 left-10 h-32 w-32 rounded-full bg-[#ef3333]/10 blur-3xl" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#fff1f1] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-6 text-3xl font-bold lg:text-4xl">O moedor de carne da prospecção manual ainda te prende?</h2>
            <p className="text-lg text-[#66666d]">
              Abrir aba por aba, analisar site por site e ligar no escuro não escala. O objetivo da {BRAND.name} é trocar
              volume cego por leitura comercial orientada.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {painPoints.map((item) => (
              <Card key={item.title} className="rounded-[32px] border-none bg-white p-8 shadow-xl shadow-black/5">
                <item.icon className="mb-6 h-12 w-12 text-[#ef3333]" />
                <h3 className="mb-4 text-xl font-bold">{item.title}</h3>
                <p className="leading-relaxed text-[#66666d]">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-20 lg:flex-row">
            <div className="flex-1">
              <h2 className="mb-8 text-4xl font-bold leading-[1.1] tracking-tight lg:text-[42px] xl:text-[48px]">
                <span className="block lg:whitespace-nowrap">Conheça o Scanner de DNA:</span>
                <span className="block text-[#ef3333] lg:whitespace-nowrap">sua inteligência de elite.</span>
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-[#66666d]">
                Em minutos, a {BRAND.name} rastreia o ecossistema digital do lead, monta a leitura comercial e te entrega
                um caminho claro para abordagem consultiva.
              </p>
              <ul className="space-y-4">
                {[
                  "Análise de Google Meu Negócio",
                  "Leitura de concorrência e reputação",
                  "Auditoria de site, SEO e sinais comerciais",
                ].map((text) => (
                  <li key={text} className="flex items-center gap-3 font-medium">
                    <CheckCircle2 className="h-5 w-5 text-[#ef3333]" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-1">
              <div className="grid grid-cols-2 gap-4">
                {featureCards.map((item, index) => (
                  <div
                    key={item.title}
                    className={`space-y-4 rounded-3xl border border-[#ececf0] bg-[#f8f8fa] p-6 ${index % 2 === 1 ? "mt-8" : ""}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#ef3333] shadow-sm">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h4 className="font-bold">{item.title}</h4>
                    <p className="text-sm text-[#66666d]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#f8f8fa] py-24">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="mb-8 text-4xl font-bold lg:text-5xl">Loop de Persuasão Recursiva</h2>
          <p className="mx-auto mb-16 max-w-3xl text-xl text-[#66666d]">
            Não é só um disparo. É uma conversa inteligente que nunca para.
          </p>

          <div className="mx-auto max-w-4xl overflow-hidden rounded-[48px] border border-white bg-white p-12 shadow-2xl">
            <div className="relative">
              <div className="absolute top-0 right-0">
                <Zap className="h-12 w-12 text-[#ef3333]/20" />
              </div>
              <p className="mb-8 text-2xl font-medium leading-relaxed text-[#1A1A1A]">
                "Quando o lead responde ao formulário, nossa IA captura a dor dele e já inicia uma conversa no WhatsApp usando as respostas dele como gancho. É prospecção humana em escala industrial."
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="flex -space-x-4">
                  {[
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
                    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
                  ].map((url, index) => (
                    <div key={index} className="h-12 w-12 overflow-hidden rounded-full border-4 border-white bg-[#ececf0]">
                      <img src={url} alt={`Closer ${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
                <p className="text-sm font-bold text-[#ef3333]">Usado por +500 Closers de elite</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="group rounded-3xl p-8 text-center transition-colors hover:bg-[#ffefef]/30">
                <stat.icon className="mx-auto mb-6 h-10 w-10 text-[#ef3333] transition-transform group-hover:scale-110" />
                <div className="mb-2 text-4xl font-bold">{stat.value}</div>
                <div className="mb-2 text-sm font-bold uppercase tracking-widest">{stat.label}</div>
                <p className="text-xs text-[#75757d]">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative mx-6 mb-16 overflow-hidden rounded-[60px] bg-foreground py-24 text-white">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 h-[500px] w-[500px] rounded-full bg-[#ef3333]/10 blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-16 lg:flex-row">
            <div className="flex-1">
              <h2 className="mb-8 text-4xl font-bold lg:text-5xl">
                Um preço único.
                <br />
                Sem surpresas.
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-white/60">
                A plataforma custa R$ 79,90/mes. Voce conecta suas proprias chaves de IA (Gemini, etc.) e Firecrawl —
                esses custos ficam direto com os provedores, sem margem da {BRAND.name}.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <CheckCircle2 className="h-6 w-6 text-[#ef3333]" />
                  <span className="text-lg font-medium">Plataforma completa por R$ 79,90/mes</span>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <CheckCircle2 className="h-6 w-6 text-[#ef3333]" />
                  <span className="text-lg font-medium">APIs de IA e Firecrawl: custo direto com o provedor</span>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <CheckCircle2 className="h-6 w-6 text-[#ef3333]" />
                  <span className="text-lg font-medium">Sem taxa sobre uso. Você controla o gasto de API</span>
                </div>
              </div>
            </div>

            <div className="lg:w-[400px]">
              <Card className="rounded-[40px] border-none bg-white p-10 text-[#1A1A1A] shadow-2xl">
                <div className="mb-4 text-sm font-bold uppercase tracking-widest text-[#ef3333]">Acesso Completo</div>
                <div className="mb-1 flex items-end gap-2">
                  <span className="text-5xl font-bold">R$ 79</span>
                  <span className="mb-2 text-2xl font-bold text-[#66666d]">,90</span>
                </div>
                <p className="mb-1 text-sm text-[#66666d]">por mes · cancele quando quiser</p>
                <p className="mb-6 mt-4 text-xs leading-5 text-[#9b9ba3]">
                  APIs de IA (Gemini, etc.) e Firecrawl são contratadas separadamente direto com os provedores. Você tem controle total do gasto.
                </p>
                <Button
                  onClick={() => navigate('/auth')}
                  className="h-14 w-full rounded-full bg-[#ef3333] text-lg font-bold text-white hover:bg-[#d42c2c]"
                >
                  Começar agora
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mb-20 max-w-7xl px-6">
        <div className="rounded-[36px] border border-[#ececf0] bg-white p-8 shadow-[0_14px_36px_rgba(20,20,24,0.06)] lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ef3333]">Transparência e conformidade</p>
              <h2 className="mt-2 text-3xl font-bold text-[#1A1A1A]">Privacidade, termos e LGPD acessíveis no site</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#66666d]">
                A {BRAND.name} publica bases jurídicas, política de privacidade, termos de uso e controle de consentimento para cookies
                em páginas dedicadas.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline" className="rounded-full border-[#ef3333]/25 text-[#b3273a] hover:bg-[#fff1f3]">
                <Link to="/politica-de-privacidade">Política de Privacidade</Link>
              </Button>
              <Button asChild className="rounded-full bg-[#ef3333] text-white hover:bg-[#d42c2c]">
                <Link to="/lgpd">Ver página LGPD</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
      <FloatingWhatsAppButton />
      <LgpdConsentBanner />
    </div>
  );
};

export default MarketingLanding;
