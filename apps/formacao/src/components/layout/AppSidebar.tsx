import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

import {
  LayoutDashboard,
  BookOpen,
  Users,
  LogOut,
  UserCog,
  FolderOpen,
  Mail,
  Palette,
  Megaphone,
  Library,
  ClipboardCheck,
  ListChecks,
  CalendarCheck,
  Bell,
  UserCircle,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoLarSeuLuiz from '@/assets/logo-lar-seu-luiz.png';

const studentMenuItems = [
  { title: 'Início', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Meus Cursos', url: '/explore', icon: BookOpen },
  { title: 'Avisos', url: '/avisos', icon: Bell },
  { title: 'Biblioteca', url: '/biblioteca', icon: Library },
  { title: 'Minha Frequência', url: '/minha-frequencia', icon: CalendarCheck },
  { title: 'Minha Conta', url: '/my-account', icon: UserCircle },
];

const adminMenuGroups = [
  {
    label: 'Visão Geral',
    items: [
      { title: 'Painel Admin', url: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { title: 'Cursos', url: '/admin/courses', icon: FolderOpen },
      { title: 'Avaliações', url: '/admin/assessments', icon: ClipboardCheck },
      { title: 'Biblioteca', url: '/admin/library', icon: Library },
      { title: 'Calendário ESDE', url: '/admin/esde-calendar', icon: CalendarCheck },
    ],
  },
  {
    label: 'Pessoas',
    items: [
      { title: 'Alunos', url: '/admin/students', icon: Users },
      { title: 'Inscrições', url: '/admin/inscricoes', icon: Link2 },
      { title: 'Presenças', url: '/admin/attendance', icon: ListChecks },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { title: 'E-mails', url: '/admin/emails', icon: Mail },
      { title: 'Avisos', url: '/admin/announcements', icon: Megaphone },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { title: 'Administradores', url: '/admin/admins', icon: UserCog },
    ],
  },
];

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = isMobile ? false : state === 'collapsed';
  const location = useLocation();
  const { profile, signOut, isAdmin } = useAuth();

  const renderItem = (item: { title: string; url: string; icon: React.ElementType }) => {
    const isActive = location.pathname === item.url ||
      (item.url !== '/dashboard' && item.url !== '/admin' && location.pathname.startsWith(item.url));

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={collapsed ? item.title : undefined}
          className="hover:bg-white/10 data-[active=true]:bg-white/15"
        >
          <NavLink
            to={item.url}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative font-sans text-[13px] font-medium ${
              isActive
                ? 'bg-white/15 text-white'
                : 'text-white/85 hover:bg-white/10 hover:text-white'
            }`}
            activeClassName=""
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[hsl(var(--brand-gold))] rounded-r-full" />
            )}
            <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 shadow-[2px_0_12px_rgba(0,60,127,0.15)] [&>*]:bg-[hsl(var(--brand-blue-dark))]">
      <div className="px-[18px] py-[22px] pb-4 border-b border-white/10 bg-[hsl(var(--brand-blue-dark))]">
        <NavLink to="/dashboard" className="flex items-center gap-2.5">
          <img src={logoLarSeuLuiz} alt="Lar de Seu Luiz" className="h-9 w-9 rounded-[9px] object-contain bg-white/10 p-1 flex-shrink-0" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-sans font-bold text-[13px] leading-tight text-white">Lar de Seu Luiz</span>
              <span className="text-[10px] text-white/65 font-semibold tracking-[0.12em] uppercase">Sistema de Gestão</span>
            </div>
          )}
        </NavLink>
      </div>

      <SidebarContent className="px-3 py-4 bg-[hsl(var(--brand-blue-dark))]">
        {isAdmin ? (
          adminMenuGroups.map((group, gi) => (
            <SidebarGroup key={group.label} className={gi > 0 ? 'mt-3' : ''}>
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-white/55 mb-1.5 font-sans font-semibold">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(renderItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        ) : (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-white/55 mb-2 font-sans font-semibold">
                Menu
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {studentMenuItems.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup className="mt-4">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-white/55 mb-2 font-sans font-semibold">
                Aluno
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={collapsed ? 'Visão Aluno' : undefined} className="hover:bg-white/10">
                    <NavLink
                      to="/dashboard?student-view"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-white/85 hover:bg-white/10 hover:text-white font-sans text-[13px] font-medium"
                      activeClassName=""
                    >
                      <BookOpen className="h-[18px] w-[18px] flex-shrink-0" />
                      {!collapsed && <span>Visão Aluno</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={collapsed ? 'Biblioteca' : undefined} className="hover:bg-white/10">
                    <NavLink
                      to="/biblioteca"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-white/85 hover:bg-white/10 hover:text-white font-sans text-[13px] font-medium"
                      activeClassName=""
                    >
                      <Library className="h-[18px] w-[18px] flex-shrink-0" />
                      {!collapsed && <span>Biblioteca</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-white/10 bg-[hsl(var(--brand-blue-dark))]">
        {profile && !collapsed ? (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
            <div className="h-8 w-8 rounded-full bg-[hsl(var(--brand-gold))] flex items-center justify-center text-xs font-bold text-[hsl(var(--brand-blue-dark))] flex-shrink-0">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate text-white">{profile.full_name}</p>
              <p className="text-[10px] text-white/65 font-semibold uppercase tracking-wider">{profile.role === 'admin' ? 'Admin' : 'Aluno'}</p>
            </div>
            <button onClick={signOut} className="text-white/65 hover:text-white transition-colors" title="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-white/85 hover:text-white hover:bg-white/10 font-sans text-[13px]"
            onClick={signOut}
          >
            <LogOut className="h-[18px] w-[18px]" />
            {!collapsed && <span>Sair</span>}
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
