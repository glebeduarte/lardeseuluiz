import { ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { supabase } from '@/integrations/supabase/client';
import { MolduraSistema, useAreasLsl, type GrupoMenuLsl, type LinkLslProps } from '@/compartilhado';
import {
  Loader2, LayoutDashboard, BookOpen, Users, UserCog, FolderOpen, Mail, Megaphone, Library,
  ClipboardCheck, ListChecks, CalendarCheck, Bell, Link2, GraduationCap, Eye,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  /** Páginas que ocupam a largura toda (ex.: player da aula). */
  larguraTotal?: boolean;
}

const gruposAluno: GrupoMenuLsl[] = [
  {
    rotulo: 'Meus estudos',
    itens: [
      { href: '/dashboard', rotulo: 'Início', icone: LayoutDashboard },
      { href: '/explore', rotulo: 'Meus cursos', icone: BookOpen },
      { href: '/avisos', rotulo: 'Avisos', icone: Bell },
      { href: '/biblioteca', rotulo: 'Biblioteca', icone: Library },
      { href: '/minha-frequencia', rotulo: 'Minha frequência', icone: CalendarCheck },
    ],
  },
];

const gruposAdmin: GrupoMenuLsl[] = [
  { rotulo: '', itens: [{ href: '/admin', rotulo: 'Painel da Formação', icone: LayoutDashboard }] },
  {
    rotulo: 'Conteúdo',
    itens: [
      { href: '/admin/courses', rotulo: 'Cursos', icone: FolderOpen },
      { href: '/admin/assessments', rotulo: 'Avaliações', icone: ClipboardCheck },
      { href: '/admin/library', rotulo: 'Biblioteca', icone: Library },
      { href: '/admin/esde-calendar', rotulo: 'Calendário ESDE', icone: CalendarCheck },
    ],
  },
  {
    rotulo: 'Pessoas',
    itens: [
      { href: '/admin/students', rotulo: 'Alunos', icone: Users },
      { href: '/admin/inscricoes', rotulo: 'Inscrições', icone: Link2 },
      { href: '/admin/attendance', rotulo: 'Presenças', icone: ListChecks },
    ],
  },
  {
    rotulo: 'Comunicação',
    itens: [
      { href: '/admin/emails', rotulo: 'E-mails', icone: Mail },
      { href: '/admin/announcements', rotulo: 'Avisos', icone: Megaphone },
    ],
  },
  { rotulo: 'Sistema', itens: [{ href: '/admin/admins', rotulo: 'Administradores', icone: UserCog }] },
  {
    rotulo: 'Aluno',
    itens: [
      { href: '/dashboard?student-view', rotulo: 'Visão do aluno', icone: Eye },
      { href: '/biblioteca', rotulo: 'Biblioteca', icone: Library },
    ],
  },
];

const LinkRR = ({ href, className, title, onClick, children }: LinkLslProps) => (
  <Link to={href} className={className} title={title} onClick={onClick}>{children}</Link>
);

/** Moldura única da plataforma aplicada à Formação (a mesma da Governança e do Atendimento). */
export function DashboardLayout({ children, larguraTotal }: DashboardLayoutProps) {
  const { user, loading, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const areas = useAreasLsl(supabase, user?.id);

  useAdminNotifications();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  const visaoAluno = search.includes('student-view');
  const ativo = (href: string) => {
    const [rota, q] = href.split('?');
    if (q) return pathname === rota && visaoAluno;
    if (rota === '/dashboard' || rota === '/admin') return pathname === rota && !(rota === '/dashboard' && visaoAluno && isAdmin);
    return pathname === rota || pathname.startsWith(rota + '/');
  };
  // Links da Formação abrem sem recarregar; o resto (site, Governança, Atendimento, perfil) é outro app
  const navegar = (href: string) => {
    if (!href.startsWith('/formacao')) return false;
    navigate(href.replace(/^\/formacao/, '') || '/');
    return true;
  };

  return (
    <MolduraSistema
      sistema="formacao" titulo="Formação" subtitulo={isAdmin ? 'Gestão de cursos' : 'Área do aluno'} iconeSistema={GraduationCap}
      grupos={isAdmin ? gruposAdmin : gruposAluno} ativo={ativo} Link={LinkRR} areas={areas} navegar={navegar}
      usuario={{ nome: areas?.nome || profile?.full_name || user.email?.split('@')[0] || '', papel: isAdmin ? 'Administrador' : 'Aluno', foto: areas?.foto || profile?.avatar_url }}
      aoAbrirPerfil={() => window.location.assign('/app/perfil')} aoSair={handleSignOut}
      extraBarra={<div className="lsl-sino">{<NotificationBell />}</div>}
      larguraTotal={larguraTotal}
    >
      <div className="animate-fade-in">{children}</div>
    </MolduraSistema>
  );
}
