import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  SearchIcon,
  Fingerprint,
  FileBarChart,
  Send,
  FileStack,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useState, useEffect, type ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import sidebarExpandedLogo from '@/logos/dark.svg';
import sidebarCollapsedLogo from '@/logos/favicon.svg';

const SIDEBAR_STORAGE_KEY = 'prospecta.sidebar.collapsed';

const menuItems = [
  { path: '/dashboard', label: 'Mission Control', icon: LayoutGrid },
  { path: '/crm', label: 'CRM', icon: Users },
  { path: '/search', label: 'Scanner', icon: SearchIcon },
  { path: '/dna', label: 'DNA', icon: Fingerprint },
  { path: '/presentations', label: 'Apresentacoes', icon: FileBarChart },
  { path: '/campaigns', label: 'Campanhas', icon: Send },
  { path: '/templates', label: 'Templates', icon: FileStack },
];

const generalItems = [
  { path: '/settings', label: 'Configuracoes', icon: Settings },
];

const planBadgeConfig: Record<string, { label: string; className: string }> = {
  free: { label: 'Gratuito', className: 'border-[#e8e8eb] text-[#65656b] bg-[#fafafa]' },
  pro: { label: 'Pro', className: 'border-[#f6c3ca] text-[#b22135] bg-[#fff4f6]' },
  enterprise: { label: 'Enterprise', className: 'border-[#ef3333]/45 text-[#9e1f1f] bg-[#fff0f0]' },
};

type NavItemProps = {
  path: string;
  label: string;
  icon: ElementType;
  collapsed: boolean;
  onNavigate: (path: string) => void;
  currentPath: string;
};

const routeMeta: Record<string, { eyebrow: string; title: string; description: string }> = {
  '/dashboard': {
    eyebrow: 'Mission Control',
    title: 'Centro de Comando',
    description: 'Acompanhe prontidao, foco comercial e os proximos movimentos do scanner.',
  },
  '/search': {
    eyebrow: 'Scanner Workspace',
    title: 'Scanner Consultivo',
    description: 'Varra o mercado, leia os sinais e transforme contexto em proposta.',
  },
  '/dna': {
    eyebrow: 'Biblioteca de Marca',
    title: 'DNA da Empresa',
    description: 'Configure a base de autoridade usada para personalizar cada proposta.',
  },
  '/presentations': {
    eyebrow: 'Conteudo Comercial',
    title: 'Apresentacoes',
    description: 'Gerencie propostas prontas, respostas e proximos envios.',
  },
  '/campaigns': {
    eyebrow: 'Orquestracao',
    title: 'Campanhas',
    description: 'Ative cadencias e acompanhe o desempenho de disparo.',
  },
  '/crm': {
    eyebrow: 'Pipeline',
    title: 'CRM',
    description: 'Organize follow-ups, fases e movimentacao de leads.',
  },
  '/templates': {
    eyebrow: 'Playbooks',
    title: 'Templates',
    description: 'Ajuste os assets que sustentam mensagens e formularios.',
  },
  '/settings': {
    eyebrow: 'Configuracao',
    title: 'Ajustes da Conta',
    description: 'Controle plano, faturamento e configuracoes operacionais.',
  },
  '/admin': {
    eyebrow: 'Controle Interno',
    title: 'Admin',
    description: 'Monitore uso, planos e dados administrativos.',
  },
};

const NavItem = ({ path, label, icon: Icon, collapsed, onNavigate, currentPath }: NavItemProps) => {
  const active = currentPath === path;

  return (
    <button
      title={label}
      onClick={() => onNavigate(path)}
      className={cn(
        'group relative flex w-full items-center rounded-2xl transition-all duration-200',
        collapsed ? 'h-11 justify-center px-0' : 'h-11 gap-3 px-3.5',
        active
          ? 'bg-[#16161a] text-[#f5f5f7] shadow-[inset_0_0_0_1px_rgba(239,51,51,0.35)]'
          : 'text-[#b7b7bf] hover:bg-[#141418] hover:text-white'
      )}
    >
      <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-[#EF3333]' : 'text-[#8e8e98]')} strokeWidth={1.8} />
      {!collapsed && (
        <>
          <span className="truncate text-sm font-medium">{label}</span>
          {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#EF3333]" />}
        </>
      )}
    </button>
  );
};

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'moderator'])
      .then(({ data }) => setIsAdmin(!!(data && data.length > 0)));
  }, [user]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, isSidebarCollapsed ? '1' : '0');
  }, [isSidebarCollapsed]);

  const plan = subscription?.plan || 'free';
  const badge = planBadgeConfig[plan] || planBadgeConfig.free;
  const userEmail = user?.email || '';
  const userInitial = userEmail.charAt(0).toUpperCase();
  const allRouteItems = [...menuItems, ...generalItems, { path: '/admin', label: 'Admin', icon: ShieldCheck }];
  const activeRoute = allRouteItems.find((item) => item.path === location.pathname);
  const currentMeta = routeMeta[location.pathname] || {
    eyebrow: 'Workspace',
    title: activeRoute?.label || 'Painel',
    description: 'Controle o fluxo atual do workspace.',
  };

  const renderSidebarContent = ({ mobile }: { mobile: boolean }) => {
    const collapsed = mobile ? false : isSidebarCollapsed;

    return (
      <div className="flex h-full flex-col">
        <div className={cn('border-b border-[#1f1f25]', collapsed ? 'px-2.5 py-4' : 'px-4 py-5')}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <img src={sidebarCollapsedLogo} alt="Prospecta IA" className="h-9 w-9" />
              <button
                type="button"
                aria-label="Expandir sidebar"
                onClick={() => setIsSidebarCollapsed(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#25252d] text-[#b7b7bf] transition-colors hover:bg-[#17171c] hover:text-white"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <img src={sidebarExpandedLogo} alt="Prospecta IA" className="h-10 w-auto" />
              {mobile ? (
                <button
                  type="button"
                  aria-label="Fechar menu"
                  onClick={() => setSidebarOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#25252d] text-[#b7b7bf] transition-colors hover:bg-[#17171c] hover:text-white"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Colapsar sidebar"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#25252d] text-[#b7b7bf] transition-colors hover:bg-[#17171c] hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className={cn('flex-1 overflow-hidden py-4', collapsed ? 'px-2' : 'px-3')}>
          {!collapsed && (
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8f97]">
              Menu
            </p>
          )}
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <NavItem
                key={item.path}
                collapsed={collapsed}
                onNavigate={navigate}
                currentPath={location.pathname}
                {...item}
              />
            ))}
          </nav>

          <div className={cn('pt-5', collapsed ? 'mt-3 border-t border-[#1f1f25]' : 'mt-5')}>
            {!collapsed && (
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8f97]">
                Geral
              </p>
            )}
            <nav className="space-y-1">
              {generalItems.map((item) => (
                <NavItem
                  key={item.path}
                  collapsed={collapsed}
                  onNavigate={navigate}
                  currentPath={location.pathname}
                  {...item}
                />
              ))}
              {isAdmin && (
                <NavItem
                  path="/admin"
                  label="Admin"
                  icon={ShieldCheck}
                  collapsed={collapsed}
                  onNavigate={navigate}
                  currentPath={location.pathname}
                />
              )}
            </nav>
          </div>
        </div>

        <div className={cn('border-t border-[#1f1f25]', collapsed ? 'p-2' : 'p-3')}>
          <button
            onClick={signOut}
            title="Sair"
            className={cn(
              'flex w-full items-center rounded-2xl text-sm font-medium text-[#b7b7bf] transition-colors hover:bg-[#2a1216] hover:text-[#ff9ea8]',
              collapsed ? 'h-11 justify-center px-0' : 'h-11 gap-3 px-3.5'
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-white p-0 sm:p-3 lg:p-4">
      <div className="flex h-screen w-full overflow-hidden rounded-none bg-[#f4f4f6] shadow-none sm:h-[calc(100vh-1.5rem)] sm:rounded-[30px] sm:shadow-[0_25px_75px_rgba(0,0,0,0.34)] lg:h-[calc(100vh-2rem)]">
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-[#09090d]/35 backdrop-blur-[1px] lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="fixed inset-y-0 left-0 z-50 w-[82vw] max-w-[296px] border-r border-[#1a1a20] bg-[#0A0A0A] sm:inset-y-2 sm:left-2 sm:rounded-[24px] sm:border lg:hidden"
              >
                {renderSidebarContent({ mobile: true })}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <aside
          className={cn(
            'relative hidden h-full shrink-0 border-r border-[#1a1a20] bg-[#0A0A0A] transition-[width] duration-300 ease-out lg:flex',
            isSidebarCollapsed ? 'w-[78px] lg:pl-[10px]' : 'w-[248px]'
          )}
        >
          {renderSidebarContent({ mobile: false })}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#ebebef] bg-white/90 px-2.5 backdrop-blur sm:h-[74px] sm:px-3 lg:px-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-[#54545a] hover:bg-[#f2f2f4] hover:text-[#1A1A1A] lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="hidden sm:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a8a91]">{currentMeta.eyebrow}</p>
                <p className="text-sm font-semibold text-[#1A1A1A]">{currentMeta.title}</p>
                <p className="mt-0.5 max-w-[420px] text-xs text-[#7a7a82]">{currentMeta.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {subLoading ? (
                <Skeleton className="h-7 w-20 rounded-full" />
              ) : (
                <Badge
                  className={cn('h-7 cursor-pointer rounded-full border px-3 text-[11px] font-semibold', badge.className)}
                  onClick={() => navigate('/settings')}
                >
                  {badge.label}
                </Badge>
              )}

              <div
                className="flex cursor-pointer items-center gap-2 rounded-full border border-[#ececf0] bg-white px-1.5 py-1 transition-colors hover:bg-[#f8f8f9]"
                onClick={() => navigate('/settings')}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EF3333]">
                  <span className="text-xs font-bold text-white">{userInitial}</span>
                </div>
                <span className="hidden max-w-[180px] truncate pr-2 text-sm font-medium text-[#1A1A1A] sm:inline">
                  {userEmail}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

      </div>
    </div>
  );
};
