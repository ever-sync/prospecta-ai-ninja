import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles, LayoutDashboard, Search, Dna, Presentation,
  Megaphone, FileText, Settings, LogOut, ShieldCheck, Menu, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/search', label: 'Busca', icon: Search },
  { path: '/dna', label: 'DNA', icon: Dna },
  { path: '/presentations', label: 'Apresentações', icon: Presentation },
  { path: '/campaigns', label: 'Campanhas', icon: Megaphone },
  { path: '/templates', label: 'Templates', icon: FileText },
];

const generalItems = [
  { path: '/settings', label: 'Configurações', icon: Settings },
];

const planBadgeConfig: Record<string, { label: string; className: string }> = {
  free: { label: 'Gratuito', className: 'border-border text-muted-foreground bg-secondary' },
  pro: { label: 'Pro', className: 'border-primary/30 text-primary bg-primary/10' },
  enterprise: { label: 'Enterprise', className: 'border-warning/30 text-warning bg-warning/10' },
};

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const plan = subscription?.plan || 'free';
  const badge = planBadgeConfig[plan] || planBadgeConfig.free;
  const userEmail = user?.email || '';
  const userInitial = userEmail.charAt(0).toUpperCase();

  const NavItem = ({ path, label, icon: Icon }: { path: string; label: string; icon: React.ElementType }) => {
    const active = location.pathname === path;
    return (
      <button
        onClick={() => navigate(path)}
        className={cn(
          'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          active
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        )}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[260px] bg-card border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">Prospecta IA</span>
        </div>

        {/* Menu section */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Menu
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </nav>

          <p className="px-3 mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Geral
          </p>
          <nav className="space-y-1">
            {generalItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
            {isAdmin && (
              <NavItem path="/admin" label="Admin" icon={ShieldCheck} />
            )}
          </nav>
        </div>

        {/* User / Logout */}
        <div className="border-t border-border p-3">
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {subLoading ? (
              <Skeleton className="h-5 w-16 rounded-full" />
            ) : (
              <Badge
                className={cn('cursor-pointer text-[10px] px-2.5 py-0.5', badge.className)}
                onClick={() => navigate('/settings')}
              >
                {badge.label}
              </Badge>
            )}

            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/settings')}
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">{userInitial}</span>
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:inline max-w-[160px] truncate">
                {userEmail}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
