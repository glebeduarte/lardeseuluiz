import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  LogOut,
  Menu,
  Home,
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
  ChevronRight,
  Download,
  BarChart3,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { ReactNode } from "react";
import logoLSL from "@/assets/logo-lsl.png";

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
  const [menuOpen, setMenuOpen] = useState(false);

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

  const currentItem = [...allItems].sort((a, b) => b.to.length - a.to.length).find((i) => isActive(i.to));
  const pageTitle = currentItem?.label ?? "Início";

  const primaryRole = pickPrimaryRole(roles);
  const effectivePrimaryRole: AppRole | null = isRealAdmin && viewAsRole ? viewAsRole : primaryRole;
  const RoleIcon = effectivePrimaryRole ? ROLE_META[effectivePrimaryRole].icon : null;
  const displayName =
    comoChamar ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Usuário";
  const avatarInitials = comoChamar ? initialsFromName(comoChamar) : initialsFromEmail(user?.email);

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

  const UserCard = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Conta de ${displayName} — abrir menu do usuário`}
          className="flex items-center gap-2.5 rounded-full border bg-card pl-1 pr-3 py-1 text-left transition-colors hover:bg-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >

          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs font-semibold text-white" style={{ background: "#1E3A5F" }}>
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm font-medium text-foreground truncate max-w-[140px]">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{displayName}</span>
          <span className="text-xs text-muted-foreground font-normal truncate">{user?.email}</span>
        </DropdownMenuLabel>
        {effectivePrimaryRole && (
          <div className="px-2 pb-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium bg-secondary",
                ROLE_META[effectivePrimaryRole].className,
              )}
            >
              {RoleIcon && <RoleIcon className="h-3 w-3" />}
              {ROLE_META[effectivePrimaryRole].label}
              {isRealAdmin && viewAsRole && viewAsRole !== "admin" && " · simulação"}
            </span>
          </div>
        )}
        {isRealAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Visualizar como
            </DropdownMenuLabel>
            {viewAsOptions.map((opt) => {
              const Icon = ROLE_META[opt.role].icon;
              const active = (opt.role === "admin" && !viewAsRole) || viewAsRole === opt.role;
              return (
                <DropdownMenuItem
                  key={opt.role}
                  onClick={() => setViewAsRole(opt.role === "admin" ? null : opt.role)}
                  className="cursor-pointer"
                >
                  <Icon className={cn("h-4 w-4 mr-2", ROLE_META[opt.role].className)} />
                  <span className="flex-1">{opt.label}</span>
                  {active && <Check className="h-4 w-4 text-brand-teal" />}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
        <DropdownMenuSeparator />
        {/* Plataforma unificada: um perfil único para todas as áreas */}
        <DropdownMenuItem onClick={() => window.location.assign("/app/perfil")} className="cursor-pointer">
          <UserRound className="h-4 w-4 mr-2" />
          Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const SidebarNav = (
    <nav className="flex-1 py-3 overflow-y-auto">
      {visibleGroups.map((group) => (
        <div key={group.title} className="mb-3">
          <p className="px-5 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#5B8DB8" }}>
            {group.title}
          </p>
          <div>
            {group.items.filter((i) => i.show !== false).map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex items-center gap-2.5 px-5 py-2.5 text-sm transition-colors",
                    active
                      ? "text-white font-semibold"
                      : "text-[#A8C4D8] hover:text-white",
                  )}
                  style={
                    active
                      ? { background: "rgba(52,209,181,0.15)" }
                      : undefined
                  }
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "";
                  }}
                >
                  {active && (
                    <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: "#34D1B5" }} />
                  )}
                  <item.icon className={cn("h-5 w-5 shrink-0", active ? "text-white" : "text-[#A8C4D8]")} strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const SidebarBrand = (
    <Link to="/" className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
      <img src={logoLSL} alt="Lar de Seu Luiz" className="h-10 w-10 object-contain rounded-md bg-white/10 p-1" />
      <div className="flex flex-col leading-tight">
        <span className="text-[15px] font-bold text-white">Lar de Seu Luiz</span>
        <span className="text-[11px]" style={{ color: "#A8C4D8" }}>Sistema de Macas</span>
      </div>
    </Link>
  );

  const SidebarUser = (
    <div className="flex items-center gap-2.5 px-5 py-3 border-b border-white/10">
      <div className="h-9 w-9 rounded-full text-white flex items-center justify-center font-bold text-[13px] shrink-0" style={{ background: "#0EA5A0" }}>
        {avatarInitials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-white truncate">{displayName}</div>
        <div className="text-[11px] truncate" style={{ color: "#A8C4D8" }}>
          {user?.email}
        </div>
      </div>
    </div>
  );

  const rolesLabel =
    roles.length > 0
      ? roles.map((r) => ROLE_META[r].label).join(" · ")
      : "Sem perfil atribuído";

  const SidebarFooter = (
    <div className="px-5 py-3 border-t border-white/10 space-y-1">
      <div className="text-[11px] font-medium leading-snug" style={{ color: "#A8C4D8" }}>
        {rolesLabel}
      </div>
      <div className="text-[11px]" style={{ color: "#5B8DB8" }}>
        Lar de Seu Luiz · v1.7.0
      </div>
    </div>
  );


  return (
    <div className="min-h-screen flex bg-background print:bg-white">
      {/* Sidebar desktop */}
      <aside
        className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col z-30 print:hidden"
        style={{ background: "linear-gradient(180deg, #1E3A5F 0%, #162D4A 100%)" }}
      >
        {SidebarBrand}
        {SidebarUser}
        {SidebarNav}
        {SidebarFooter}
      </aside>


      {/* Conteúdo */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white flex items-center justify-between px-4 md:px-7 shrink-0 print:hidden" style={{ borderBottom: "1px solid #E2EBF4" }}>
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile menu trigger */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden -ml-2" aria-label="Abrir menu de navegação">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] p-0 border-r border-white/10 text-white flex flex-col"
                style={{ background: "linear-gradient(180deg, #1E3A5F 0%, #162D4A 100%)" }}
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu de navegação</SheetTitle>
                </SheetHeader>
                {SidebarBrand}
                {SidebarUser}
                <div onClick={() => setMenuOpen(false)} className="flex-1 overflow-y-auto">
                  {SidebarNav}
                </div>
                {SidebarFooter}
              </SheetContent>
            </Sheet>

            <span className="md:hidden font-display font-bold text-[15px] truncate" style={{ color: "#1E3A5F" }}>
              {pageTitle}
            </span>

            <nav aria-label="Você está em" className="hidden md:flex items-center gap-1.5 text-sm min-w-0">
              {pageTitle !== "Início" && (
                <>
                  <Link to="/" style={{ color: "#64748B" }} className="hover:underline">Início</Link>
                  <ChevronRight className="h-3.5 w-3.5" style={{ color: "#94A3B8" }} />
                </>
              )}
              <span className="font-display font-bold truncate" style={{ color: "#1E3A5F" }}>{pageTitle}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">{UserCard}</div>
        </header>

        {isRealAdmin && viewAsRole && viewAsRole !== "admin" && (
          <div
            className="print:hidden flex items-center justify-between gap-3 px-4 md:px-7 py-2 text-[13px] font-medium"
            style={{ background: "#FFF1E2", color: "#9A4B0B", borderBottom: "1px solid #F3D3AE" }}
            role="status"
          >
            <span className="min-w-0 truncate">
              Simulando: {ROLE_META[viewAsRole].label}. Você é {primaryRole ? ROLE_META[primaryRole].label : "Administrador"}.
            </span>
            <button
              type="button"
              onClick={() => setViewAsRole(null)}
              className="shrink-0 rounded-md border px-2.5 py-1 text-[12px] font-semibold hover:bg-white/60"
              style={{ borderColor: "#E0A96D" }}
            >
              Sair da simulação
            </button>
          </div>
        )}


        <main className="flex-1 px-4 md:px-7 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6 print:px-0 print:py-0">{children}</main>

        <footer className="border-t py-3 text-center text-xs text-muted-foreground hidden md:block print:hidden">
          Centro Espiritualista Lar de Seu Luiz · Sistema de Macas v1.7.0
        </footer>

        {/* Bottom nav mobile — estilo app */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t print:hidden"
          style={{
            borderColor: "#E2EBF4",
            paddingBottom: "env(safe-area-inset-bottom)",
            boxShadow: "0 -2px 12px rgba(30,58,95,0.08)",
          }}
        >
          <ul className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(allItems.length, 4) + (allItems.length > 4 ? 1 : 0)}, minmax(0, 1fr))` }}>
            {allItems.slice(0, 4).map((item) => {
              const active = isActive(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors"
                    style={{ color: active ? "#0EA5A0" : "#64748B" }}
                  >
                    <item.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                    <span className="truncate max-w-[72px] leading-tight">{item.label}</span>
                  </Link>
                </li>
              );
            })}
            {allItems.length > 4 && (
              <li>
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="w-full flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium"
                  style={{ color: "#64748B" }}
                >
                  <Menu className="h-5 w-5" />
                  <span className="leading-tight">Mais</span>
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </div>
  );
}
