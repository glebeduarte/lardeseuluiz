import { ReactNode, useState } from "react";
import logoLSL from "@/assets/logo-lsl-new.png";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, DollarSign, FileText, Vote, Heart, Shield, Users, Building2,
  Menu, X, LogOut, ChevronsLeft, ChevronsRight, CalendarDays, UserCheck,
  Briefcase, Sparkles, Settings, ExternalLink
} from "lucide-react";

import { usePermissions, type ModulePermission } from "@/hooks/usePermissions";

interface NavItem { to?: string; href?: string; icon: any; label: string; perm?: ModulePermission | "always"; }
interface NavGroup { label: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
  {
    label: "",
    items: [{ to: "/app", icon: LayoutDashboard, label: "Dashboard", perm: "always" }],
  },
  {
    label: "Operacional",
    items: [
      { to: "/app/secretarias", icon: Building2, label: "Secretarias", perm: "modulo_secretaria" },
      { to: "/app/projetos", icon: Briefcase, label: "Projetos sociais", perm: "modulo_projetos" },
      { to: "/app/eventos", icon: CalendarDays, label: "Eventos", perm: "always" },
      { href: "/atendimento/", icon: ExternalLink, label: "Sistema de Macas", perm: "modulo_macas" },
      { href: "/formacao/admin", icon: ExternalLink, label: "Formação", perm: "modulo_formacao" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/app/financeiro", icon: DollarSign, label: "Financeiro", perm: "modulo_financeiro" },
      { to: "/app/assembleias", icon: Vote, label: "Assembleias", perm: "modulo_gestao" },
      { to: "/app/documentos", icon: FileText, label: "Documentos", perm: "always" },
      { to: "/app/usuarios", icon: Users, label: "Usuários", perm: "modulo_admin" },
      { to: "/app/lgpd", icon: Shield, label: "LGPD", perm: "modulo_admin" },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { to: "/app/pessoas", icon: UserCheck, label: "Pessoas (unificado)", perm: "modulo_gestao" },
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


const getInitials = (email?: string | null) => {
  if (!email) return "?";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name.slice(0, 2).toUpperCase();
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { canAccess, isAdmin, isGestor } = usePermissions();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const sidebarWidth = collapsed ? "w-[64px]" : "w-[260px]";
  const mainMargin = collapsed ? "md:ml-[64px]" : "md:ml-[260px]";

  const visibleGroups = navGroups
    .map(g => ({ ...g, items: g.items.filter(i => i.perm === "always" || !i.perm || canAccess(i.perm)) }))
    .filter(g => g.items.length > 0);

  const roleLabel = isAdmin ? "Administrador" : isGestor ? "Gestor" : "Trabalhador";


  const renderNavItem = (l: NavItem, onClick?: () => void) => {
    const Icon = l.icon;
    const key = l.to || l.href || l.label;
    const inlineStyle: React.CSSProperties = {
      display: "flex",
      flexDirection: "row",
      flexWrap: "nowrap",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: 12,
      padding: collapsed ? "10px 8px" : "8px 12px",
      width: "100%",
      borderRadius: 6,
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 1,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textDecoration: "none",
      transition: "background-color .15s, color .15s",
    };

    const iconEl = (
      <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
    );
    const labelEl = !collapsed && (
      <span
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textAlign: "left",
        }}
      >
        {l.label}
      </span>
    );

    const inactiveClasses = "text-white/75 hover:bg-white/10 hover:text-white";

    const wrapTooltip = (trigger: React.ReactNode) => (
      <Tooltip key={key} delayDuration={collapsed ? 100 : 999999}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        {collapsed && <TooltipContent side="right">{l.label}</TooltipContent>}
      </Tooltip>
    );

    if (l.href) {
      return wrapTooltip(
        <a
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          className={inactiveClasses}
          style={inlineStyle}
        >
          {iconEl}
          {labelEl}
        </a>
      );
    }

    return wrapTooltip(
      <NavLink
        to={l.to!}
        end={l.to === "/app"}
        onClick={onClick}
        style={inlineStyle}
        className={({ isActive }) =>
          isActive
            ? "bg-white/15 text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-[hsl(var(--accent))] relative"
            : `${inactiveClasses} relative`
        }
      >
        {iconEl}
        {labelEl}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - desktop */}
      <aside
        className={`hidden md:flex flex-col ${sidebarWidth} fixed inset-y-0 z-40 transition-all duration-200`}
        style={{ background: "hsl(var(--sidebar-background))" }}
      >
        {/* Logo header */}
        <div className="px-4 py-4 flex items-center gap-3 border-b border-white/10">
          <img src={logoLSL} alt="Lar de Seu Luiz" className="w-10 h-10 rounded-lg shrink-0 object-contain bg-white/10 p-1" />
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="font-bold text-[14px] leading-tight text-white truncate">Lar de Seu Luiz</div>
              <div className="text-[11px] text-white/65 truncate">Sistema de Gestão</div>
            </div>
          )}
        </div>

        {/* User block */}
        <button
          type="button"
          onClick={() => navigate("/app/perfil")}
          className={`w-full px-4 py-3 flex items-center gap-3 border-b border-white/10 text-left hover:bg-white/5 transition-colors ${collapsed ? "justify-center" : ""}`}
          aria-label="Abrir meu perfil"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
            style={{ background: "hsl(var(--accent))", color: "hsl(var(--primary-dark))" }}
          >
            {getInitials(user?.email)}
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <div className="text-[13px] font-medium text-white truncate">{user?.email?.split("@")[0]}</div>
              <div className="text-[11px] text-white/65">{roleLabel} · Ver perfil</div>
            </div>
          )}
        </button>

        {/* Nav groups */}
        <div className="flex-1 overflow-y-auto py-3">
          <nav className="px-2 space-y-5">
            {visibleGroups.map((group) => (
              <div key={group.label || "top"}>
                {!collapsed && group.label && (
                  <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
                    {group.label}
                  </div>
                )}
                <div className="flex flex-col space-y-0.5">
                  {group.items.map((item) => renderNavItem(item))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="px-2 py-3 space-y-1 border-t border-white/10">
          <Tooltip delayDuration={collapsed ? 100 : 999999}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full gap-2 ${collapsed ? "justify-center px-2" : "justify-start"} text-white/85 hover:bg-white/10 hover:text-white`}
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {!collapsed && <span>Sair</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sair</TooltipContent>}
          </Tooltip>

          <Button
            variant="ghost"
            size="sm"
            className={`w-full gap-2 ${collapsed ? "justify-center px-2" : "justify-start"} text-white/70 hover:bg-white/10 hover:text-white`}
            onClick={() => setCollapsed(c => !c)}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4 shrink-0" /> : <><ChevronsLeft className="w-4 h-4 shrink-0" /><span>Recolher</span></>}
          </Button>

          {!collapsed && (
            <div className="pt-2 text-center text-[10px] text-white/55 leading-tight">
              Centro Espiritualista<br />Lar de Seu Luiz · v1.0
            </div>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 h-14 bg-white flex items-center px-4 justify-between" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div className="flex items-center gap-2">
          <img src={logoLSL} alt="Lar de Seu Luiz" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-bold text-sm text-[hsl(var(--primary-dark))]">Lar de Seu Luiz</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div
            className="w-64 h-full p-4 space-y-4 overflow-y-auto"
            style={{ background: "hsl(var(--sidebar-background))" }}
            onClick={e => e.stopPropagation()}
          >
            {visibleGroups.map((group) => (
              <div key={group.label}>
                {group.label && (
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/55">
                    {group.label}
                  </div>
                )}
                <div className="flex flex-col space-y-0.5">
                  {group.items.map((item) => renderNavItem(item, () => setMobileOpen(false)))}
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-white/10">
              <div className="text-xs truncate px-3 mb-2 text-white/60">{user?.email}</div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-white/85 hover:bg-white/10 hover:text-white"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" /> Sair
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className={`flex-1 ${mainMargin} mt-14 md:mt-0 transition-all duration-200`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
