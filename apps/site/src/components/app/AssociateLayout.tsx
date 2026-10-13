import { ReactNode, useState } from "react";
import logoLSL from "@/assets/logo-lsl-new.png";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard, DollarSign, Vote, Shield, Menu, X, LogOut
} from "lucide-react";

const navItems = [
  { to: "/meu-painel", icon: LayoutDashboard, label: "Meu Painel" },
  { to: "/meu-painel/contribuicoes", icon: DollarSign, label: "Contribuições" },
  { to: "/meu-painel/assembleias", icon: Vote, label: "Assembleias" },
  { to: "/meu-painel/meus-dados", icon: Shield, label: "Meus Dados" },
];

export default function AssociateLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const renderNavItem = (l: typeof navItems[0], onClick?: () => void) => (
    <NavLink
      key={l.to}
      to={l.to}
      end={l.to === "/meu-painel"}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg text-[13px] font-medium px-3 py-2 transition-colors ${
          isActive
            ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]"
            : "text-[hsl(var(--sidebar-foreground)/0.7)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]"
        }`
      }
    >
      <span className="truncate">{l.label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - desktop */}
      <aside
        className="hidden md:flex flex-col w-60 fixed inset-y-0 z-40 transition-all duration-200"
        style={{ background: "hsl(var(--sidebar-background))", borderRight: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div className="p-3 flex items-center gap-3" style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}>
            <img src={logoLSL} alt="Lar de Seu Luiz" className="w-9 h-9 rounded-lg shrink-0 object-contain" />
          <div className="overflow-hidden">
            <div className="font-['Playfair_Display'] font-bold text-sm leading-tight" style={{ color: "hsl(var(--sidebar-accent-foreground))" }}>
              Lar de Seu Luiz
            </div>
            <div className="text-[10px]" style={{ color: "hsl(var(--sidebar-foreground)/0.4)" }}>Portal do Associado</div>
          </div>
        </div>

        <ScrollArea className="flex-1 py-3">
          <nav className="px-2 space-y-0.5">
            {navItems.map((item) => renderNavItem(item))}
          </nav>
        </ScrollArea>

        <div className="px-2 py-3 space-y-1" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
          <div className="text-xs truncate px-3 mb-1" style={{ color: "hsl(var(--sidebar-foreground)/0.4)" }}>
            {user?.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 hover:bg-[hsl(var(--sidebar-accent))]"
            style={{ color: "hsl(var(--sidebar-foreground))" }}
            onClick={handleSignOut}
          >
            <span>Sair</span>
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 h-14 bg-card/95 backdrop-blur flex items-center px-4 justify-between" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="flex items-center gap-2">
          <img src={logoLSL} alt="Lar de Seu Luiz" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-['Playfair_Display'] font-bold text-sm">Portal do Associado</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div
            className="w-64 h-full p-4 space-y-1 overflow-y-auto"
            style={{ background: "hsl(var(--sidebar-background))" }}
            onClick={e => e.stopPropagation()}
          >
            {navItems.map((item) => renderNavItem(item, () => setMobileOpen(false)))}
            <div className="pt-4 mt-4" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
              <div className="text-xs truncate px-3 mb-2" style={{ color: "hsl(var(--sidebar-foreground)/0.4)" }}>{user?.email}</div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 hover:bg-[hsl(var(--sidebar-accent))]"
                style={{ color: "hsl(var(--sidebar-foreground))" }}
                onClick={handleSignOut}
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-60 mt-14 md:mt-0 transition-all duration-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
