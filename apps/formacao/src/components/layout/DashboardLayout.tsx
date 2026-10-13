import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { BottomNav } from '@/components/layout/BottomNav';
import { NavLink } from '@/components/NavLink';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, LogOut, Shield, UserCircle } from 'lucide-react';
import logoLarSeuLuiz from '@/assets/logo-lar-seu-luiz.png';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  useAdminNotifications();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        {/* Sidebar: visible only on md+ for everyone */}
        <div className="hidden md:flex">
          <AppSidebar />
        </div>

        <SidebarInset className="flex-1 min-w-0 overflow-x-hidden">
          {/* Header */}
          <header className="sticky top-0 z-30 flex h-[58px] items-center gap-3 border-b border-border bg-card/85 backdrop-blur-lg px-3 md:px-4">
            {/* Desktop: sidebar trigger */}
            <SidebarTrigger className="h-8 w-8 hidden md:inline-flex" />

            {/* Mobile: logo + brand */}
            <NavLink to="/dashboard" className="md:hidden flex items-center gap-2 mr-auto">
              <img src={logoLarSeuLuiz} alt="Lar de Seu Luiz" className="h-8 w-8 rounded-lg object-contain" />
              <span className="font-display font-bold text-[13px] leading-tight">Lar de Seu Luiz</span>
            </NavLink>

            <div className="hidden md:block flex-1" />

            <NotificationBell />

            {profile && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium">{profile.full_name}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      {profile.role === 'admin' ? 'Administrador' : 'Aluno'}
                    </p>
                  </div>
                  <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium font-display">{profile.full_name}</p>
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="h-4 w-4 mr-2" />
                      Painel Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/my-account')}>
                    <UserCircle className="h-4 w-4 mr-2" />
                    Minha Conta
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>

          <main className="flex-1 animate-fade-in overflow-x-hidden pb-[68px] md:pb-0">
            {children}
          </main>
        </SidebarInset>

        {/* Bottom nav: only mobile (visible to all logged users; admin shows admin nav) */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
