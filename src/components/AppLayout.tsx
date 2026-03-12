import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, LayoutDashboard, Search, Dna, Presentation, Megaphone, FileText, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/search', label: 'Busca', icon: Search },
  { path: '/dna', label: 'DNA', icon: Dna },
  { path: '/presentations', label: 'Apresentações', icon: Presentation },
  { path: '/campaigns', label: 'Campanhas', icon: Megaphone },
  { path: '/settings', label: 'Configurações', icon: Settings },
];

const planBadgeConfig = {
  free: { label: 'Gratuito', className: 'border-border text-muted-foreground bg-secondary' },
  pro: { label: 'Pro', className: 'border-primary/30 text-primary bg-primary/10' },
  enterprise: { label: 'Enterprise', className: 'border-amber-500/30 text-amber-400 bg-amber-500/10' },
};

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();

  const plan = subscription?.plan || 'free';
  const badge = planBadgeConfig[plan];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center glow-primary">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">Prospecta IA</span>
              {subLoading ? (
                <Skeleton className="h-5 w-16 rounded-full" />
              ) : (
                <Badge
                  className={cn('cursor-pointer text-[10px] px-2 py-0.5', badge.className)}
                  onClick={() => navigate('/settings')}
                >
                  {badge.label}
                </Badge>
              )}
            </div>

            <nav className="flex items-center gap-1">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Button
                  key={path}
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(path)}
                  className={cn(
                    'gap-2 text-sm',
                    location.pathname === path
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              ))}
            </nav>

            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
};
