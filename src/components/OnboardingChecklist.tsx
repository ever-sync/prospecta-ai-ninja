import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Dna,
  Flame,
  Key,
  Search,
  FileText,
  Megaphone,
  X,
  Rocket,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface StepDef {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  path: string;
}

const STEPS: StepDef[] = [
  {
    key: 'dna',
    label: 'Preencher DNA da empresa',
    description: 'Configure o posicionamento, ICP, oferta e canais da sua empresa.',
    icon: Dna,
    path: '/dna',
  },
  {
    key: 'firecrawl',
    label: 'Configurar chave Firecrawl',
    description: 'Adicione sua chave para buscar e raspar sites de prospects.',
    icon: Flame,
    path: '/settings?tab=integracoes',
  },
  {
    key: 'ai_key',
    label: 'Configurar chave de IA (Gemini)',
    description: 'Conecte um provedor de IA para gerar analises e propostas.',
    icon: Key,
    path: '/settings?tab=apis',
  },
  {
    key: 'first_search',
    label: 'Gerar primeira busca',
    description: 'Use o Scanner para encontrar empresas e oportunidades.',
    icon: Search,
    path: '/search',
  },
  {
    key: 'first_presentation',
    label: 'Gerar primeira apresentação',
    description: 'Crie uma proposta personalizada para um lead.',
    icon: FileText,
    path: '/presentations',
  },
  {
    key: 'first_campaign',
    label: 'Criar primeira campanha',
    description: 'Envie propostas de forma automatizada via campanha.',
    icon: Megaphone,
    path: '/campaigns',
  },
];

// Bump version suffix to reset for all users
const CELEBRATED_KEY = 'prospecta.onboarding.celebrated.v2';

/* ---------- confetti / rocket celebration ---------- */
// Stable random values so they don't re-generate on re-render
const BURST_PARTICLES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 0.8,
  duration: 1.5 + Math.random() * 1.5,
  size: 8 + Math.random() * 14,
  color: ['#EF3333', '#1F8F47', '#356DFF', '#FFB020', '#A855F7', '#EC4899', '#F97316', '#06B6D4'][i % 8],
  xDrift: (Math.random() - 0.5) * 500,
  rotateTo: 360 + Math.random() * 720,
}));

const FALL_PARTICLES = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: 0.4 + Math.random() * 1.2,
  duration: 2.5 + Math.random() * 2,
  w: 6 + Math.random() * 10,
  h: 10 + Math.random() * 16,
  color: ['#EF3333', '#1F8F47', '#356DFF', '#FFB020', '#A855F7', '#EC4899', '#F97316', '#06B6D4'][i % 8],
  xDrift: (Math.random() - 0.5) * 200,
  rotateTo: 180 + Math.random() * 720,
}));

const CelebrationOverlay = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 5500);
    return () => clearTimeout(timer);
  }, [onDone]);

  const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onDone}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

      {/* Burst confetti from center */}
      {BURST_PARTICLES.map((p) => (
        <motion.div
          key={`burst-${p.id}`}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, backgroundColor: p.color, left: '50%', top: '50%' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: p.xDrift,
            y: -(screenH * 0.4 + Math.random() * 300),
            opacity: [1, 1, 0],
            scale: [1, 1.4, 0.3],
            rotate: p.rotateTo,
          }}
          transition={{ duration: p.duration, delay: 0.2 + p.delay, ease: 'easeOut' }}
        />
      ))}

      {/* Falling confetti from top */}
      {FALL_PARTICLES.map((p) => (
        <motion.div
          key={`fall-${p.id}`}
          className="absolute"
          style={{ width: p.w, height: p.h, backgroundColor: p.color, left: `${p.x}%`, top: '-3%', borderRadius: 3 }}
          initial={{ y: 0, opacity: 0, rotate: 0, x: 0 }}
          animate={{
            y: screenH * 1.15,
            opacity: [0, 1, 1, 0],
            rotate: p.rotateTo,
            x: p.xDrift,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
        />
      ))}

      {/* Giant rocket flying up */}
      <motion.div
        className="absolute"
        style={{ left: '50%', bottom: '-10%' }}
        initial={{ y: 0, x: '-50%', opacity: 0, scale: 0.5 }}
        animate={{ y: -screenH * 1.3, x: '-50%', opacity: [0, 1, 1, 0], scale: [0.5, 1.6, 1.8, 1.2] }}
        transition={{ duration: 2.8, delay: 0.1, ease: [0.2, 0, 0.4, 1] }}
      >
        <Rocket className="h-40 w-40 text-white drop-shadow-[0_0_40px_rgba(239,51,51,0.9)]" />
      </motion.div>

      {/* Message card */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-6 px-8 text-center"
        initial={{ scale: 0.4, opacity: 0, y: 60 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.5 }}
      >
        <motion.div
          animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white shadow-[0_0_80px_rgba(239,51,51,0.6)]">
            <Rocket className="h-20 w-20 text-[#EF3333]" />
          </div>
        </motion.div>

        <div>
          <motion.h2
            className="text-5xl font-black text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            🎉 Tudo pronto!
          </motion.h2>
          <motion.p
            className="mt-3 text-2xl font-medium text-white/90 drop-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            Sua plataforma está 100% configurada.
          </motion.p>
          <motion.p
            className="mt-2 text-base text-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
          >
            Clique em qualquer lugar para continuar
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const OnboardingChecklist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({
    dna: false,
    firecrawl: false,
    ai_key: false,
    first_search: false,
    first_presentation: false,
    first_campaign: false,
  });
  const [loading, setLoading] = useState(true);
  const [celebrating, setCelebrating] = useState(false);
  const [celebrated, setCelebrated] = useState(() => {
    try {
      // Clear old key from previous versions
      localStorage.removeItem('prospecta.onboarding.dismissed');
      return localStorage.getItem(CELEBRATED_KEY) === 'true';
    } catch { return false; }
  });

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
        const [dnaRes, profileRes, aiKeysRes, presentationsRes, campaignsRes] = await Promise.all([
          supabase
            .from('company_dna')
            .select('services, differentials, value_proposition')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('firecrawl_api_key')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('user_ai_api_keys')
            .select('id')
            .eq('user_id', user.id)
            .limit(1),
          supabase
            .from('presentations')
            .select('id')
            .eq('user_id', user.id)
            .limit(1),
          supabase
            .from('campaigns')
            .select('id')
            .eq('user_id', user.id)
            .limit(1),
        ]);

        const dna = dnaRes.data as Record<string, unknown> | null;
        const hasDna = Boolean(
          dna &&
            ((Array.isArray(dna.services) && dna.services.length > 0) ||
              (Array.isArray(dna.differentials) && dna.differentials.length > 0) ||
              (typeof dna.value_proposition === 'string' && dna.value_proposition.trim()))
        );

        const profile = profileRes.data as { firecrawl_api_key?: string | null } | null;
        const hasFirecrawl = Boolean(profile?.firecrawl_api_key?.trim());
        const hasAiKey = Boolean(aiKeysRes.data && aiKeysRes.data.length > 0);
        const hasPresentations = Boolean(presentationsRes.data && presentationsRes.data.length > 0);
        const hasCampaigns = Boolean(campaignsRes.data && campaignsRes.data.length > 0);

        setCompletedSteps({
          dna: hasDna,
          firecrawl: hasFirecrawl,
          ai_key: hasAiKey,
          first_search: hasPresentations,
          first_presentation: hasPresentations,
          first_campaign: hasCampaigns,
        });
    } catch (err) {
      console.error('Onboarding check error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  // Re-fetch when panel opens
  useEffect(() => {
    if (open) void fetchStatus();
  }, [open, fetchStatus]);

  // Re-fetch when user comes back to the tab
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchStatus();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchStatus]);

  // Re-fetch when any part of the app signals a save happened
  useEffect(() => {
    const onRefetch = () => void fetchStatus();
    window.addEventListener('onboarding:refetch', onRefetch);
    return () => window.removeEventListener('onboarding:refetch', onRefetch);
  }, [fetchStatus]);

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const totalSteps = STEPS.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);
  const allDone = completedCount === totalSteps;
  const currentStepIndex = STEPS.findIndex((s) => !completedSteps[s.key]);

  // Fire celebration the first time all steps are done
  useEffect(() => {
    if (allDone && !loading && !celebrated) {
      setCelebrating(true);
    }
  }, [allDone, loading, celebrated]);

  const handleCelebrationDone = useCallback(() => {
    setCelebrating(false);
    setCelebrated(true);
    try { localStorage.setItem(CELEBRATED_KEY, 'true'); } catch { /* noop */ }
  }, []);

  // Hide FAB/panel once all done and celebration is over
  if (!celebrating && allDone && celebrated) return null;
  if (loading && !celebrating) return null;

  return (
    <>
      {/* Celebration overlay */}
      <AnimatePresence>
        {celebrating && <CelebrationOverlay onDone={handleCelebrationDone} />}
      </AnimatePresence>

      {/* Floating button (bottom-right) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Expanded panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="w-[360px] overflow-hidden rounded-[24px] border border-[#ececf0] bg-white shadow-[0_20px_60px_rgba(12,12,18,0.18)]"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-[#f0f0f3] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EF3333]/10">
                    <Rocket className="h-[18px] w-[18px] text-[#EF3333]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1A1A1A]">Primeiros passos</h3>
                    <p className="text-xs text-[#9b9ba3]">
                      {completedCount}/{totalSteps} concluídos
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9b9ba3] transition-colors hover:bg-[#f5f5f7] hover:text-[#1A1A1A]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Progress */}
              <div className="px-5 pt-3">
                <Progress
                  value={progressPercent}
                  className="h-1.5 rounded-full bg-[#f0f0f3]"
                />
              </div>

              {/* Steps list */}
              <div className="max-h-[420px] overflow-y-auto px-4 pb-4 pt-3">
                <ol className="space-y-0.5">
                  {STEPS.map((step, index) => {
                    const done = completedSteps[step.key];
                    const isCurrent = index === currentStepIndex;
                    const isLocked = !done && index > currentStepIndex;
                    const StepIcon = step.icon;

                    return (
                      <li key={step.key}>
                        <div
                          role={!done && !isLocked ? 'button' : undefined}
                          tabIndex={!done && !isLocked ? 0 : undefined}
                          onClick={() => {
                            if (!done && !isLocked) {
                              navigate(step.path);
                              setOpen(false);
                            }
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && !done && !isLocked) {
                              navigate(step.path);
                              setOpen(false);
                            }
                          }}
                          className={cn(
                            'group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                            done
                              ? 'cursor-default'
                              : isCurrent
                                ? 'cursor-pointer bg-[#FFF5F5] hover:bg-[#FFE8E8]'
                                : isLocked
                                  ? 'cursor-not-allowed opacity-45'
                                  : 'cursor-pointer hover:bg-[#f8f8fa]'
                          )}
                        >
                          {/* Indicator */}
                          <div className="relative mt-0.5 flex-shrink-0">
                            {done ? (
                              <CheckCircle2 className="h-5 w-5 text-[#1F8F47]" />
                            ) : isCurrent ? (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#EF3333] bg-white">
                                <span className="text-[10px] font-bold text-[#EF3333]">{index + 1}</span>
                              </div>
                            ) : (
                              <Circle className="h-5 w-5 text-[#d0d0d5]" />
                            )}
                            {index < STEPS.length - 1 && (
                              <div
                                className={cn(
                                  'absolute left-[9px] top-6 h-[calc(100%+2px)] w-0.5',
                                  done ? 'bg-[#1F8F47]/25' : 'bg-[#ececf0]'
                                )}
                              />
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <StepIcon
                                className={cn(
                                  'h-3.5 w-3.5 flex-shrink-0',
                                  done ? 'text-[#1F8F47]' : isCurrent ? 'text-[#EF3333]' : 'text-[#a0a0a8]'
                                )}
                              />
                              <span
                                className={cn(
                                  'text-[13px] font-medium leading-tight',
                                  done
                                    ? 'text-[#1F8F47] line-through decoration-[#1F8F47]/40'
                                    : isCurrent
                                      ? 'text-[#1A1A1A]'
                                      : 'text-[#6d6d75]'
                                )}
                              >
                                {step.label}
                              </span>
                            </div>
                            {isCurrent && (
                              <p className="mt-0.5 text-[11px] leading-snug text-[#787880]">
                                {step.description}
                              </p>
                            )}
                            {isCurrent && (
                              <Button
                                size="sm"
                                className="mt-2 h-7 rounded-lg bg-[#EF3333] px-3 text-[11px] font-semibold text-white hover:bg-[#d42d2d]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(step.path);
                                  setOpen(false);
                                }}
                              >
                                Comecar
                              </Button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB button */}
        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#EF3333] text-white shadow-[0_8px_30px_rgba(239,51,51,0.35)] transition-shadow hover:shadow-[0_8px_40px_rgba(239,51,51,0.5)]"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          <Rocket className="h-6 w-6" />

          {/* Badge with remaining count */}
          {completedCount < totalSteps && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#EF3333] shadow-sm ring-2 ring-[#EF3333]">
              {totalSteps - completedCount}
            </span>
          )}

          {/* Pulse ring */}
          <span className="absolute inset-0 animate-ping rounded-full bg-[#EF3333] opacity-20" />
        </motion.button>
      </div>
    </>
  );
};

export default OnboardingChecklist;
