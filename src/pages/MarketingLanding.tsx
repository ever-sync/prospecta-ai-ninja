import { motion, Variants } from 'framer-motion';
import { Rocket, Search, MessageSquare, Zap, BarChart3, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import loginLogo from '@/logos/ligth.svg';

const MarketingLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const handleCtaClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

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

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-sans selection:bg-[#ef3333]/10 selection:text-[#ef3333]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#ececf0]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={loginLogo} alt="envPRO" className="h-10 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-[#66666d] hover:text-[#ef3333] transition-colors">Funcionalidades</a>
            <a href="#how-it-works" className="text-sm font-medium text-[#66666d] hover:text-[#ef3333] transition-colors">Como Funciona</a>
            <a href="#pricing" className="text-sm font-medium text-[#66666d] hover:text-[#ef3333] transition-colors">Preços</a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="rounded-full text-sm font-semibold" onClick={handleCtaClick}>
              {user ? 'Painel' : 'Login'}
            </Button>
            <Button className="rounded-full bg-[#ef3333] hover:bg-[#d42c2c] text-white px-6 font-semibold shadow-lg shadow-[#ef3333]/20" onClick={handleCtaClick}>
              {user ? 'Ir para o Painel' : 'Começar Agora'}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            className="flex-1 text-center lg:text-left"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fff1f1] text-[#ef3333] text-sm font-bold mb-6">
              <Rocket className="w-4 h-4" />
              <span>FOGUETE NÃO DÁ RÉ</span>
            </motion.div>
            <motion.h1 
              variants={itemVariants}
              className="text-5xl lg:text-[58px] xl:text-[66px] font-bold tracking-tight mb-8 leading-[1.05]"
            >
              <span className="block lg:whitespace-nowrap">Pare de caçar leads.</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#ef3333] to-[#ff6b6b] lg:whitespace-nowrap">
                Comece a fechar negócios.
              </span>
            </motion.h1>
            <motion.p 
              variants={itemVariants}
              className="text-lg lg:text-xl text-[#66666d] mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              Transforme a invisibilidade do Google em uma agenda cheia de reuniões. A envPRO faz o trabalho de 50 pessoas por você, entregando diagnósticos que leads não conseguem ignorar.
            </motion.p>
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Button className="h-14 px-8 rounded-full bg-[#ef3333] hover:bg-[#d42c2c] text-white text-lg font-bold shadow-xl shadow-[#ef3333]/25 group" onClick={handleCtaClick}>
                {user ? 'Acessar Painel' : 'Teste o Scanner Grátis'}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <p className="text-sm text-[#75757d] font-medium">
                Sem cartão de crédito • Resultados em 10 min
              </p>
            </motion.div>
          </motion.div>

          <motion.div 
            className="flex-1 relative"
            initial={{ opacity: 0, x: 50, rotate: 10 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="relative z-10 w-full max-w-[500px] mx-auto">
              {/* This is where the generated image would go. Using a stylized illustration for now. */}
              <div className="aspect-square bg-gradient-to-br from-white to-[#f8f8fa] rounded-[40px] flex items-center justify-center p-12 border border-white relative overflow-hidden group">
                <div className="absolute inset-0 bg-[#ef3333]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <motion.div
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Rocket className="w-64 h-64 text-[#ef3333]" strokeWidth={1} />
                </motion.div>
                {/* Visual accents */}
                <div className="absolute top-10 right-10 w-20 h-20 bg-[#ef3333]/10 blur-3xl rounded-full" />
                <div className="absolute bottom-10 left-10 w-32 h-32 bg-[#ef3333]/10 blur-3xl rounded-full" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-24 bg-[#fff1f1]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">O "Moedor de Carne" da prospecção manual está te matando?</h2>
            <p className="text-lg text-[#66666d]">
              Abrir aba por aba, analisar site por site, ligar para quem nem te conhece... Você é bom no que faz, mas seu concorrente — que é pior tecnicamente — fica com o cliente porque ele aparece e você não.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: MessageSquare, title: "Vácuo do Silêncio", desc: "Mande propostas que desaparecem no fundo da caixa de entrada." },
              { icon: Search, title: "Tédio da Pesquisa", desc: "Perca horas minerando dados no Google que uma IA faz em segundos." },
              { icon: Zap, title: "Injustiça Competitiva", desc: "Veja empresas menos qualificadas ganhando o mercado que é seu." }
            ].map((item, i) => (
              <Card key={i} className="p-8 rounded-[32px] bg-white border-none shadow-xl shadow-black/5">
                <item.icon className="w-12 h-12 text-[#ef3333] mb-6" />
                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                <p className="text-[#66666d] leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Concept Section: DNA Scan */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 order-1">
              <h2 className="text-4xl lg:text-[42px] xl:text-[48px] font-bold mb-8 leading-[1.1] tracking-tight">
                <span className="block lg:whitespace-nowrap">Conheça o Scanner de DNA:</span>
                <span className="block text-[#ef3333] lg:whitespace-nowrap">Sua inteligência de elite.</span>
              </h2>
              <p className="text-lg text-[#66666d] mb-8 leading-relaxed">
                Em 10 minutos, a envPRO faz o que seu time comercial levaria uma semana. Nosso motor rastreia o ecossistema digital do lead e gera uma proposta tão personalizada que ele vai acreditar que você parou tudo só para estudá-lo.
              </p>
              <ul className="space-y-4">
                {["Análise de Google Meu Negócio", "Avaliações de concorrentes", "Auditoria de Site e Anúncios"].map((text, i) => (
                  <li key={i} className="flex items-center gap-3 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-[#ef3333]" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 order-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-3xl bg-[#f8f8fa] border border-[#ececf0] space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#ef3333]">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold">DNA Scan</h4>
                  <p className="text-sm text-[#66666d]">Análise completa de reputação, SEO e anúncios.</p>
                </div>
                <div className="p-6 rounded-3xl bg-[#f8f8fa] border border-[#ececf0] mt-8 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#ef3333]">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold">Benchmark</h4>
                  <p className="text-sm text-[#66666d]">Compare o lead com os 3 melhores vizinhos.</p>
                </div>
                <div className="p-6 rounded-3xl bg-[#f8f8fa] border border-[#ececf0] space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#ef3333]">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold">Smart Hooks</h4>
                  <p className="text-sm text-[#66666d]">Ganchos de abordagem personalizados gerados por IA.</p>
                </div>
                <div className="p-6 rounded-3xl bg-[#f8f8fa] border border-[#ececf0] mt-8 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#ef3333]">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold">WhatsApp Loop</h4>
                  <p className="text-sm text-[#66666d]">Transição imediata para o engajamento real.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recursivity Section */}
      <section id="how-it-works" className="py-24 bg-[#f8f8fa]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-8">Loop de Persuasão Recursiva</h2>
          <p className="text-xl text-[#66666d] max-w-3xl mx-auto mb-16">
            Não é só um disparo. É uma conversa inteligente que nunca para.
          </p>
          <div className="max-w-4xl mx-auto p-12 rounded-[48px] bg-white shadow-2xl relative overflow-hidden border border-white">
            <div className="absolute top-0 right-0 p-8">
              <Zap className="w-12 h-12 text-[#ef3333]/20" />
            </div>
            <p className="text-2xl font-medium leading-relaxed mb-8">
              "Quando o lead responde ao formulário, nossa IA captura a dor dele e já inicia uma conversa no WhatsApp usando as respostas dele como gancho. É prospecção humana em escala industrial."
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="flex -space-x-4">
                {[
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
                  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
                ].map((url, i) => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-[#ececf0] overflow-hidden">
                    <img src={url} alt={`Closer ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-sm font-bold text-[#ef3333]">Usado por +500 Closers de elite</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits / Metrics */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: BarChart3, value: "80%", label: "Taxa de Visualização", desc: "Leads que abrem a proposta" },
              { icon: MessageSquare, value: "30%", label: "Taxa de Agendamento", desc: "Conversão em reuniões reais" },
              { icon: Clock, value: "+40h", label: "Horas Economizadas", desc: "Por mês, por usuário" },
              { icon: Zap, value: "50x", label: "Mais Produtivo", desc: "Escala com o poder da IA" }
            ].map((stat, i) => (
              <div key={i} className="text-center p-8 rounded-3xl hover:bg-[#ffefef]/30 transition-colors group">
                <stat.icon className="w-10 h-10 mx-auto mb-6 text-[#ef3333] group-hover:scale-110 transition-transform" />
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="font-bold text-sm uppercase tracking-widest mb-2">{stat.label}</div>
                <p className="text-xs text-[#75757d]">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Model Section */}
      <section id="pricing" className="py-24 bg-foreground text-white rounded-[60px] mx-6 mb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ef3333]/10 blur-[120px] rounded-full -mr-24 -mt-24" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-4xl lg:text-5xl font-bold mb-8">Traga sua própria chave. <br />Pague pelo que usar.</h2>
              <p className="text-lg text-white/60 mb-8 leading-relaxed">
                Sem taxas de tokens escondidas. Você conecta sua própria API Key do GPT ou Gemini e tem controle total dos custos enquanto foca na inteligência da envPRO.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <CheckCircle2 className="w-6 h-6 text-[#ef3333]" />
                  <span className="font-medium text-lg">Integração nativa com OpenAI e Gemini</span>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <CheckCircle2 className="w-6 h-6 text-[#ef3333]" />
                  <span className="font-medium text-lg">Custo fixo por Scans de DNA</span>
                </div>
              </div>
            </div>
            <div className="lg:w-[400px]">
              <Card className="p-10 rounded-[40px] bg-white text-[#1A1A1A] border-none shadow-2xl">
                <div className="text-sm font-bold text-[#ef3333] mb-4 uppercase tracking-widest">Plano Agency</div>
                <div className="text-5xl font-bold mb-6">Em Breve</div>
                <p className="text-[#66666d] mb-8">Entre na lista de espera para ser o primeiro a voar com o foguete envPRO.</p>
                <Button className="w-full h-14 rounded-full bg-[#ef3333] hover:bg-[#d42c2c] text-white text-lg font-bold">
                  Quero Garantir minha Vaga
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#ececf0]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <img src={loginLogo} alt="envPRO" className="h-8 w-auto opacity-50" />
          <p className="text-sm text-[#75757d]">© 2026 envPRO. Todos os direitos reservados. Foguete não dá ré.</p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-[#75757d] hover:text-[#ef3333]">Termos</a>
            <a href="#" className="text-sm text-[#75757d] hover:text-[#ef3333]">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLanding;
