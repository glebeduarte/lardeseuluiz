import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Bell, UserCircle, LayoutDashboard, FolderOpen, Users, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { NavLink } from '@/components/NavLink';
import {
  ClipboardCheck,
  ListChecks,
  CalendarCheck,
  Library,
  Mail,
  Megaphone,
  UserCog,
} from 'lucide-react';

interface BottomNavItem {
  label: string;
  icon: typeof Home;
  url: string;
  match: (path: string) => boolean;
}

const studentItems: BottomNavItem[] = [
  { label: 'Início', icon: Home, url: '/dashboard', match: (p) => p === '/dashboard' || p === '/' },
  { label: 'Cursos', icon: BookOpen, url: '/explore', match: (p) => p === '/explore' || p.startsWith('/course/') || p.startsWith('/lesson/') },
  { label: 'Avisos', icon: Bell, url: '/avisos', match: (p) => p === '/avisos' },
  { label: 'Perfil', icon: UserCircle, url: '/my-account', match: (p) => p === '/my-account' || p === '/minha-frequencia' },
];

const adminPrimaryItems: BottomNavItem[] = [
  { label: 'Painel', icon: LayoutDashboard, url: '/admin', match: (p) => p === '/admin' },
  { label: 'Cursos', icon: FolderOpen, url: '/admin/courses', match: (p) => p.startsWith('/admin/courses') },
  { label: 'Alunos', icon: Users, url: '/admin/students', match: (p) => p.startsWith('/admin/students') },
  { label: 'Avisos', icon: Megaphone, url: '/admin/announcements', match: (p) => p.startsWith('/admin/announcements') },
];

const adminMoreItems = [
  { title: 'Avaliações', url: '/admin/assessments', icon: ClipboardCheck },
  { title: 'Presenças', url: '/admin/attendance', icon: ListChecks },
  { title: 'Calendário ESDE', url: '/admin/esde-calendar', icon: CalendarCheck },
  { title: 'Biblioteca', url: '/admin/library', icon: Library },
  { title: 'Comunicação', url: '/admin/emails', icon: Mail },
  { title: 'Administradores', url: '/admin/admins', icon: UserCog },
  { title: 'Visão Aluno', url: '/dashboard?student-view', icon: BookOpen },
  { title: 'Minha Conta', url: '/my-account', icon: UserCircle },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!user || isAdmin) return;
    supabase
      .from('announcements')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .then(({ count }) => setUnreadAnnouncements(count || 0));
  }, [user, isAdmin]);

  const items = isAdmin ? adminPrimaryItems : studentItems;
  const showMoreButton = isAdmin;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      <div className="flex items-stretch justify-around h-[60px]">
        {items.map((item) => {
          const isActive = item.match(location.pathname);
          const Icon = item.icon;
          const showBadge = !isAdmin && item.url === '/avisos' && unreadAnnouncements > 0;
          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              aria-label={
                showBadge
                  ? `${item.label}, ${unreadAnnouncements} ${unreadAnnouncements === 1 ? 'novo aviso' : 'novos avisos'}`
                  : item.label
              }
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                isActive ? 'text-primary' : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-10 bg-primary rounded-b-full"
                  aria-hidden="true"
                />
              )}
              <div className="relative">
                <Icon
                  className={`h-[22px] w-[22px] ${isActive ? 'fill-primary/10' : ''}`}
                  strokeWidth={isActive ? 2.4 : 2}
                  aria-hidden="true"
                />
                {showBadge && (
                  <span
                    className="absolute -top-1 -right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {unreadAnnouncements > 9 ? '9+' : unreadAnnouncements}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {showMoreButton && (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Mais opções"
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] transition-colors rounded-md text-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <Menu className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
                <span className="text-[10px] tracking-tight font-medium">Mais</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
              <SheetHeader className="text-left mb-3">
                <SheetTitle>Mais opções</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-2 pb-4">
                {adminMoreItems.map((item) => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-blue-lt transition-colors text-sm font-medium"
                  >
                    <item.icon className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                    <span className="leading-tight">{item.title}</span>
                  </NavLink>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
