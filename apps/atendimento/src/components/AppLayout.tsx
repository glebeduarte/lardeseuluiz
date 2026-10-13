import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  HeartPulse,
  Users,
  MessageSquare,
  Stethoscope,
  Bed,
  UserCog,
  CalendarDays,
  Shield,
  Headset,
  MessagesSquare,
  Eye,
  Check,
  Sparkles,
  Download,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MolduraSistema, useAreasLsl, type GrupoMenuLsl, type LinkLslProps } from "@/compartilhado";

const LinkTS = ({ href, className, title, onClick, children }: LinkLslProps) => (
  <Link to={href} className={className} title={title} onClick={onClick}>{children}</Link>
);

const ROLE_META: Record<AppRole, { label: string; icon: typeof Shield; className: string }> = {
  admin: { label: "Administrador", icon: Shield, className: "text-brand-red" },
  dialogador: { label: "Dialogador", icon: MessagesSquare, className: "text-brand-teal" },
  recepcao: { label: "Acolhimento", icon: Headset, className: "text-brand-blue" },
  medium: { label: "Médium", icon: Sparkles, className: "text-brand-teal-dark" },
};

function pickPrimaryRole(roles: AppRole[]): AppRole | null {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("dialogador")) return "dialogador";
  if (roles.includes("recepcao")) return "recepcao";
  if (roles.includes("medium")) return "medium";
  return null;
}

function initialsFromEmail(email?: string | null) {
  if (!email) return "?";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
  return letters.toUpperCase() || "?";
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
  return letters.toUpperCase() || "?";
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, roles, effectiveRoles, isAdmin, isDialogador, isMedium, isRealAdmin, viewAsRole, setViewAsRole, signOut, comoChamar } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const areas = useAreasLsl(supabase, user?.id);

  // "Visualizando como médium" só vale para admins que escolheram ver o app
  // como médium. Um usuário comum com recepção + médium deve continuar vendo
  // o menu da recepção.
  const isViewingAsMedium =
    effectiveRoles.length === 1 && effectiveRoles[0] === "medium";
  const canSeeRecepcao =
    !isViewingAsMedium &&
    (effectiveRoles.includes("recepcao") ||
      effectiveRoles.includes("dialogador") ||
      effectiveRoles.includes("admin"));

  const groups = [
    {
      title: "Principal",
      items: [
        { to: "/", label: "Início", icon: Home, show: true },
        { to: "/recepcao", label: "Acolhimento", icon: Stethoscope, show: canSeeRecepcao },
        { to: "/medium", label: "Lançar sessão", icon: Sparkles, show: isMedium },
      ],
    },
    {
      title: "Atendimento",
      show: isDialogador,
      items: [
        { to: "/dialogo/novo", label: "Novo diálogo", icon: MessageSquare, show: true },
        { to: "/consulentes", label: "Consulentes", icon: Users, show: true },
        { to: "/relatorios", label: "Relatórios", icon: BarChart3, show: true },
      ],
    },
    {
      title: "Gestão",
      show: isAdmin,
      items: [
        { to: "/admin/macas", label: "Macas", icon: Bed, show: true },
        { to: "/admin/usuarios", label: "Equipe", icon: UserCog, show: true },
        { to: "/admin/sessoes", label: "Sessões", icon: CalendarDays, show: true },
        { to: "/admin/exportar", label: "Exportar", icon: Download, show: true },
      ],
    },
  ];


  const visibleGroups = groups.filter((g) => g.show !== false);
  const allItems = visibleGroups.flatMap((g) => g.items.filter((i) => i.show !== false));

  const isActive = (to: string) =>
    pathname === to || (to !== "/" && pathname.startsWith(to));


  const primaryRole = pickPrimaryRole(roles);
  const effectivePrimaryRole: AppRole | null = isRealAdmin && viewAsRole ? viewAsRole : primaryRole;
  const RoleIcon = effectivePrimaryRole ? ROLE_META[effectivePrimaryRole].icon : null;
  const displayName =
    comoChamar ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Usuário";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const viewAsOptions: { role: AppRole; label: string }[] = [
    { role: "admin", label: "Administrador (real)" },
    { role: "dialogador", label: "Dialogador" },
    { role: "recepcao", label: "Acolhimento" },
    { role: "medium", label: "Médium" },
  ];

  const grupos: GrupoMenuLsl[] = visibleGroups.map((g) => ({
    rotulo: g.title,
    itens: g.items.filter((i) => i.show !== false).map((i) => ({ href: i.to, rotulo: i.label, icone: i.icon })),
  }));

  const papel = effectivePrimaryRole ? ROLE_META[effectivePrimaryRole].label : "Sem papel";
  // Rotas do Atendimento abrem sem recarregar; as outras áreas são outros apps
  const navegar = (href: string) => {
    if (!href.startsWith("/atendimento")) return false;
    navigate({ to: href.replace(/^\/atendimento/, "") || "/" });
    return true;
  };

  const visualizarComo = (recolhida: boolean) =>
    isRealAdmin ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="lsl-item" title={recolhida ? "Visualizar como" : undefined}>
            <Eye />
            {!recolhida && <span>Visualizar como</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-60">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Ver o Atendimento como</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {viewAsOptions.map((opt) => {
            const Icon = ROLE_META[opt.role].icon;
            const active = (opt.role === "admin" && !viewAsRole) || viewAsRole === opt.role;
            return (
              <DropdownMenuItem key={opt.role} onClick={() => setViewAsRole(opt.role === "admin" ? null : opt.role)} className="cursor-pointer">
                <Icon className={cn("h-4 w-4 mr-2", ROLE_META[opt.role].className)} />
                <span className="flex-1">{opt.label}</span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  const simulando = isRealAdmin && viewAsRole && viewAsRole !== "admin";

  return (
    <MolduraSistema
      sistema="atendimento" titulo="Atendimento" subtitulo="Sistema de Macas" iconeSistema={HeartPulse}
      grupos={grupos} ativo={isActive} Link={LinkTS} areas={areas} navegar={navegar}
      usuario={{ nome: displayName, papel: simulando ? `Vendo como ${papel}` : papel, foto: areas?.foto }}
      aoAbrirPerfil={() => window.location.assign("/app/perfil")} aoSair={handleSignOut} versao="v1.7.0"
      rodape={visualizarComo}
      avisos={simulando ? (
        <div className="lsl-aviso" role="status">
          <span>Visualizando como {ROLE_META[viewAsRole!].label}. Você é {primaryRole ? ROLE_META[primaryRole].label : "Administrador"}.</span>
          <button type="button" onClick={() => setViewAsRole(null)}>Sair da simulação</button>
        </div>
      ) : null}
    >
      {children}
    </MolduraSistema>
  );
}
