import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MolduraSistema, useAreasLsl, type GrupoMenuLsl, type LinkLslProps } from "@/compartilhado";
import {
  LayoutDashboard, DollarSign, FileText, Vote, Heart, Shield, Users, Building2,
  CalendarDays, Landmark, UserCheck,
  Briefcase, Sparkles, Settings, HeartPulse, GraduationCap, HeartHandshake, Home, UserPlus, Ticket, KeyRound
} from "lucide-react";

import { usePermissions, type ModulePermission } from "@/hooks/usePermissions";
import VisualizarComo from "@/components/simulacao/VisualizarComo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface NavItem { to?: string; href?: string; icon: any; label: string; perm?: ModulePermission | "always" | "acessos"; }
interface NavGroup { label: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
  {
    label: "",
    items: [{ to: "/app", icon: LayoutDashboard, label: "Dashboard", perm: "always" }],
  },
  {
    label: "Operacional",
    items: [
      { to: "/app/secretarias", icon: Building2, label: "Secretarias", perm: "always" },
      { to: "/app/acoes", icon: HeartHandshake, label: "Ações sociais", perm: "modulo_projetos" },
      { to: "/app/familias", icon: Home, label: "Famílias atendidas", perm: "modulo_projetos" },
      { to: "/app/rifas", icon: Ticket, label: "Rifas", perm: "modulo_projetos" },
      { to: "/app/eventos", icon: CalendarDays, label: "Eventos e palestras", perm: "always" },
      { href: "/atendimento/", icon: HeartPulse, label: "Sistema de Macas", perm: "modulo_macas" },
      { href: "/formacao/admin", icon: GraduationCap, label: "Formação", perm: "modulo_formacao" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/app/financeiro", icon: DollarSign, label: "Financeiro", perm: "modulo_financeiro" },
      { to: "/app/assembleias", icon: Vote, label: "Assembleias", perm: "modulo_gestao" },
      { to: "/app/documentos", icon: FileText, label: "Documentos", perm: "always" },
      { to: "/app/acessos", icon: KeyRound, label: "Acessos", perm: "acessos" },
      { to: "/app/lgpd", icon: Shield, label: "LGPD", perm: "modulo_admin" },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { to: "/app/pessoas", icon: UserCheck, label: "Pessoas (unificado)", perm: "modulo_gestao" },
      { to: "/app/chamamento", icon: UserPlus, label: "Chamamento", perm: "modulo_recepcao" },
      { to: "/app/associados", icon: UserCheck, label: "Associados", perm: "modulo_gestao" },
      { to: "/app/frequentadores", icon: Users, label: "Frequentadores", perm: "modulo_recepcao" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { to: "/app/configuracoes/funcoes", icon: Settings, label: "Funções", perm: "modulo_admin" },
    ],
  },
];


const LinkRR = ({ href, className, title, onClick, children }: LinkLslProps) => (
  <Link to={href} className={className} title={title} onClick={onClick}>{children}</Link>
);

/** Moldura única da plataforma aplicada à Governança (mesma usada na Formação e no Atendimento). */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut, simulacao } = useAuth();
  const { canAccess, isAdmin, isGestor } = usePermissions();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const areas = useAreasLsl(supabase, user?.id);
  // Painel de acessos: admin geral, admin do Atendimento ou admin da Formação
  const ar = areas as { admin?: boolean; formacao_admin?: boolean; atendimento_papeis?: string[] } | null;
  const podeAcessos = isAdmin || !!ar?.admin || !!ar?.formacao_admin || !!ar?.atendimento_papeis?.includes("admin");

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const grupos: GrupoMenuLsl[] = navGroups.map((g) => ({
    rotulo: g.label,
    itens: g.items
      .filter((i) => i.perm === "always" || !i.perm || (i.perm === "acessos" ? podeAcessos : canAccess(i.perm)))
      .map((i) => ({ href: (i.to || i.href)!, rotulo: i.label, icone: i.icon, externo: !!i.href })),
  }));

  const papel = simulacao ? `Vendo como ${simulacao.rotulo}` : isAdmin ? "Administrador" : isGestor ? "Gestor" : "Trabalhador";
  const ativo = (href: string) => href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(href + "/");
  // Rotas deste app abrem sem recarregar; as outras áreas (Formação, Atendimento) são outros apps
  const navegar = (href: string) => {
    if (href.startsWith("/formacao") || href.startsWith("/atendimento")) return false;
    navigate(href);
    return true;
  };

  return (
    <MolduraSistema
      sistema="governanca" titulo="Governança" subtitulo="Sistema de Gestão" iconeSistema={Landmark}
      grupos={grupos} ativo={ativo} Link={LinkRR} areas={areas} navegar={navegar}
      usuario={{ nome: areas?.nome || user?.email?.split("@")[0] || "", papel, foto: areas?.foto }}
      aoAbrirPerfil={() => navigate("/app/perfil")} aoSair={handleSignOut} versao="v1.0"
      rodape={(recolhida) => (
        <VisualizarComo compacto={recolhida}
          className={`w-full gap-2 ${recolhida ? "justify-center px-2" : "justify-start"} rounded-full text-[15px] font-medium text-slate-700 hover:bg-[#eef4fb] hover:text-[#003c7f]`} />
      )}
    >
      {children}
    </MolduraSistema>
  );
}
