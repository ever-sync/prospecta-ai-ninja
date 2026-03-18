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
  Bell,
  CheckCircle2,
  Clock3,
  SendHorizontal,
  XCircle,
  FileText,
  Eye,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { buildCRMHref } from '@/lib/crm/deriveLeadState';
import { cn } from '@/lib/utils';
import { BRAND } from '@/config/brand';
import { useState, useEffect, type ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import sidebarExpandedLogo from '@/logos/dark.svg';
import sidebarCollapsedLogo from '@/logos/favicon.svg';
import OnboardingChecklist from '@/components/OnboardingChecklist';

const SIDEBAR_STORAGE_KEY = 'prospecta.sidebar.collapsed';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { path: '/crm', label: 'CRM', icon: Users },
  { path: '/dna', label: 'DNA', icon: Fingerprint },
  { path: '/search', label: 'Scanner', icon: SearchIcon },
  { path: '/robots', label: 'Robôs', icon: Bot, comingSoon: true },
  { path: '/ai-atendimento', label: 'IA de Atendimento', icon: MessageSquare, comingSoon: true },
  { path: '/presentations', label: 'Apresentações', icon: FileBarChart },
  { path: '/campaigns', label: 'Campanhas', icon: Send },
  { path: '/templates', label: 'Templates', icon: FileStack },
];

const generalItems = [
  { path: '/settings', label: 'Configurações', icon: Settings },
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
  comingSoon?: boolean;
};

type PlatformNotification = {
  id: string;
  createdAt: string;
  description: string;
  href: string;
  icon: ElementType;
  iconClassName: string;
  title: string;
};

type PresentationNotificationRow = {
  business_name: string | null;
  created_at: string | null;
  id: string;
  status: string | null;
};

type ConversionNotificationRow = {
  created_at: string;
  event_type: string;
  id: string;
  presentation_id: string;
};

type TaskNotificationRow = {
  due_at: string | null;
  id: string;
  presentation_id: string;
  title: string;
};

const routeMeta: Record<string, { eyebrow: string; title: string; description: string }> = {
  '/dashboard': {
    eyebrow: 'Mission Control',
    title: 'Centro de Comando',
    description: '',
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
    description: 'Gerencie propostas prontas, respostas e próximos envios.',
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
    description: 'Controle plano, faturamento e configurações operacionais.',
  },
  '/admin': {
    eyebrow: 'Controle Interno',
    title: 'Admin',
    description: 'Monitore uso, planos e dados administrativos.',
  },
};

const NavItem = ({ path, label, icon: Icon, collapsed, onNavigate, currentPath, comingSoon }: NavItemProps) => {
  const active = currentPath === path;

  return (
    <button
      title={label}
      onClick={() => !comingSoon && onNavigate(path)}
      className={cn(
        'group relative flex w-full items-center rounded-2xl transition-all duration-200',
        collapsed ? 'h-11 justify-center px-0' : 'h-11 gap-3 px-3.5',
        comingSoon
          ? 'cursor-not-allowed opacity-50'
          : active
          ? 'bg-[#16161a] text-[#f5f5f7] shadow-[inset_0_0_0_1px_rgba(239,51,51,0.35)]'
          : 'text-[#b7b7bf] hover:bg-[#141418] hover:text-white'
      )}
    >
      <Icon className={cn('h-[18px] w-[18px] shrink-0', active && !comingSoon ? 'text-[#EF3333]' : 'text-[#8e8e98]')} strokeWidth={1.8} />
      {!collapsed && (
        <>
          <span className="flex-1 text-sm font-medium text-white">{label}</span>
          {comingSoon ? (
            <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-[#EF3333] px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-white">
              Em breve
            </span>
          ) : active ? (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#EF3333]" />
          ) : null}
        </>
      )}
    </button>
  );
};

const formatNotificationTime = (value: string) => {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} d`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
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
      .in('role', ['superadmin', 'admin', 'moderator'])
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
  const recentNotificationCount = notifications.filter((item) => Date.now() - new Date(item.createdAt).getTime() < 1000 * 60 * 60 * 24).length;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }

    let active = true;

    const loadNotifications = async () => {
      setNotificationsLoading(true);

      const { data: presentationRows, error: presentationsError } = await supabase
        .from('presentations')
        .select('id, business_name, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(12);

      const { data: conversionRows, error: conversionsError } = await supabase
        .from('message_conversion_events')
        .select('id, created_at, event_type, presentation_id')
        .eq('user_id', user.id)
        .in('event_type', ['sent', 'opened', 'accepted', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: taskRows, error: tasksError } = await supabase
        .from('crm_tasks')
        .select('id, title, due_at, presentation_id')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .not('due_at', 'is', null)
        .lte('due_at', new Date().toISOString())
        .order('due_at', { ascending: false })
        .limit(8);

      if (!active) return;

      if (presentationsError || conversionsError || tasksError) {
        setNotifications([]);
        setNotificationsLoading(false);
        return;
      }

      const presentations = (presentationRows || []) as PresentationNotificationRow[];
      const conversions = (conversionRows || []) as ConversionNotificationRow[];
      const overdueTasks = (taskRows || []) as TaskNotificationRow[];
      const presentationMap = new Map(presentations.map((item) => [item.id, item]));

      const missingIds = [...conversions.map((item) => item.presentation_id), ...overdueTasks.map((item) => item.presentation_id)]
        .filter((id) => !presentationMap.has(id));

      if (missingIds.length > 0) {
        const { data: extraPresentations } = await supabase
          .from('presentations')
          .select('id, business_name, status, created_at')
          .in('id', [...new Set(missingIds)]);

        (extraPresentations || []).forEach((item) => {
          const row = item as PresentationNotificationRow;
          presentationMap.set(row.id, row);
        });
      }

      const createdNotifications: PlatformNotification[] = presentations
        .filter((item) => Boolean(item.created_at))
        .map((item) => {
          const isReady = item.status === 'ready';
          return {
            id: `presentation-${item.id}`,
            createdAt: item.created_at || new Date().toISOString(),
            description: isReady ? 'A proposta ja esta pronta para envio.' : 'Nova proposta entrou em analise na plataforma.',
            href: buildCRMHref({ mode: 'queue', leadId: item.id }),
            icon: isReady ? CheckCircle2 : FileText,
            iconClassName: isReady ? 'bg-[#effaf3] text-[#1f8f47]' : 'bg-[#fff0f1] text-[#EF3333]',
            title: isReady
              ? `Proposta pronta${item.business_name ? `: ${item.business_name}` : ''}`
              : `Proposta criada${item.business_name ? `: ${item.business_name}` : ''}`,
          };
        });

      const conversionNotifications: PlatformNotification[] = conversions.map((item) => {
        const presentation = presentationMap.get(item.presentation_id);
        const businessName = presentation?.business_name ? `: ${presentation.business_name}` : '';

        const config: Record<string, Omit<PlatformNotification, 'id' | 'createdAt' | 'href'>> = {
          accepted: {
            title: `Proposta aceita${businessName}`,
            description: 'O lead demonstrou interesse e abriu espaco para avancar.',
            icon: CheckCircle2,
            iconClassName: 'bg-[#effaf3] text-[#1f8f47]',
          },
          opened: {
            title: `Proposta visualizada${businessName}`,
            description: 'O lead abriu a proposta e entrou no radar quente.',
            icon: Eye,
            iconClassName: 'bg-[#eef4ff] text-[#356dff]',
          },
          rejected: {
            title: `Proposta recusada${businessName}`,
            description: 'O lead recusou a proposta. Vale revisar abordagem e timing.',
            icon: XCircle,
            iconClassName: 'bg-[#fff5f6] text-[#b23246]',
          },
          sent: {
            title: `Proposta enviada${businessName}`,
            description: 'A plataforma concluiu o envio para esse lead.',
            icon: SendHorizontal,
            iconClassName: 'bg-[#fff0f1] text-[#EF3333]',
          },
        };

        const resolved = config[item.event_type] || {
          title: `Atualizacao da proposta${businessName}`,
          description: 'A plataforma registrou um novo evento nesse lead.',
          icon: Clock3,
          iconClassName: 'bg-[#f5f5f7] text-[#66666d]',
        };

        return {
          id: `conversion-${item.id}`,
          createdAt: item.created_at,
          description: resolved.description,
          href: buildCRMHref({ mode: 'queue', leadId: item.presentation_id }),
          icon: resolved.icon,
          iconClassName: resolved.iconClassName,
          title: resolved.title,
        };
      });

      const overdueTaskNotifications: PlatformNotification[] = overdueTasks.map((task) => {
        const presentation = presentationMap.get(task.presentation_id);
        const businessName = presentation?.business_name ? `: ${presentation.business_name}` : '';

        return {
          id: `task-${task.id}`,
          createdAt: task.due_at || new Date().toISOString(),
          description: task.title,
          href: buildCRMHref({ mode: 'queue', leadId: task.presentation_id }),
          icon: Clock3,
          iconClassName: 'bg-[#fff8ef] text-[#9a5a10]',
          title: `Follow-up vencido${businessName}`,
        };
      });

      const merged = [...overdueTaskNotifications, ...conversionNotifications, ...createdNotifications]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 12);

      setNotifications(merged);
      setNotificationsLoading(false);
    };

    void loadNotifications();

    const refreshChannel = supabase
      .channel(`platform-notifications-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentations', filter: `user_id=eq.${user.id}` }, () => {
        void loadNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_conversion_events', filter: `user_id=eq.${user.id}` }, () => {
        void loadNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks', filter: `user_id=eq.${user.id}` }, () => {
        void loadNotifications();
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(refreshChannel);
    };
  }, [user]);

  const renderSidebarContent = ({ mobile }: { mobile: boolean }) => {
    const collapsed = mobile ? false : isSidebarCollapsed;

    return (
      <div className="flex h-full flex-col">
        <div className={cn('border-b border-[#1f1f25]', collapsed ? 'px-2.5 py-4' : 'px-4 py-5')}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <img src={sidebarCollapsedLogo} alt={BRAND.name} className="h-9 w-9" />
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
              <img src={sidebarExpandedLogo} alt={BRAND.name} className="h-10 w-auto" />
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
            onClick={handleSignOut}
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
            isSidebarCollapsed ? 'w-[78px] lg:pl-[10px]' : 'w-[280px]'
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
                {currentMeta.description ? <p className="mt-0.5 max-w-[420px] text-xs text-[#7a7a82]">{currentMeta.description}</p> : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-full border border-[#ececf0] bg-white text-[#1A1A1A] hover:bg-[#f8f8f9]"
                  >
                    <Bell className="h-4 w-4" />
                    {recentNotificationCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EF3333] px-1 text-[10px] font-bold text-white">
                        {recentNotificationCount > 9 ? '9+' : recentNotificationCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[380px] rounded-[22px] border border-[#ececf0] bg-white p-0 shadow-[0_18px_40px_rgba(20,20,24,0.10)]">
                  <div className="border-b border-[#ececf0] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A1A]">Notificacoes</p>
                        <p className="mt-0.5 text-xs text-[#7a7a82]">Propostas, respostas e envios recentes da plataforma.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="rounded-full border-[#f2d4d8] bg-[#fff5f6] text-[#b23246]">
                          {notifications.length}
                        </Badge>
                        {notifications.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setNotifications([])}
                            className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#9a9aa1] transition-colors hover:bg-[#f5f5f7] hover:text-[#EF3333]"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto p-2">
                    {notificationsLoading ? (
                      <div className="space-y-2 p-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Skeleton key={index} className="h-[74px] rounded-[18px]" />
                        ))}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f5f7] text-[#7a7a82]">
                          <Bell className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-[#1A1A1A]">Nenhuma notificacao ainda</p>
                        <p className="mt-1 text-xs leading-5 text-[#7a7a82]">Quando a plataforma gerar, enviar, abrir ou receber resposta em propostas, tudo aparece aqui.</p>
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigate(item.href)}
                          className="flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left transition-colors hover:bg-[#f8f8fa]"
                        >
                          <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', item.iconClassName)}>
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-[#1A1A1A]">{item.title}</p>
                              <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-[#9a9aa1]">
                                {formatNotificationTime(item.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-[#6f6f77]">{item.description}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

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

        <OnboardingChecklist />
      </div>
    </div>
  );
};
