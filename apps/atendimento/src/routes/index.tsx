import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { UserCog } from "lucide-react";
import { AdminDashboard } from "@/components/AdminDashboard";
import {
  Users,
  ClipboardList,
  Settings,
  UserPlus,
  Bed,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isDiaDeAtendimento, getProximaAtendimentoDateIso, formatDataCurta } from "@/lib/atendimento-dates";



export const Route = createFileRoute("/")({
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

const DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

type Accent = "blue" | "teal" | "gold" | "red";

const ACCENT_ICON_BG: Record<Accent, string> = {
  blue: "bg-brand-blue-muted text-brand-blue",
  teal: "bg-brand-teal-muted text-brand-teal-dark",
  gold: "bg-brand-gold-muted text-brand-gold-dark",
  red: "bg-brand-red-muted text-brand-red",
};

function Dashboard() {
  const { user, roles, isAdmin, isDialogador, isRecepcao, isMedium, effectiveRoles, comoChamar } = useAuth();
  const isViewingAsMedium = effectiveRoles.includes("medium") && !effectiveRoles.includes("admin");

  const displayName = comoChamar || (user?.user_metadata?.name as string | undefined) || user?.email?.split("@")[0] || "";

  const now = new Date();
  const diaSemana = DIAS[now.getDay()];
  const diaNum = now.getDate();
  const emSessao = isDiaDeAtendimento(now);
  const proximaIso = getProximaAtendimentoDateIso(now);


  const tiles: { to: string; title: string; desc: string; icon: typeof Bed; accent: Accent; show: boolean }[] = [
    {
      to: "/medium",
      title: "Lançar sessão",
      desc: "Escolha a sessão (terça ou sábado) e lance a presença da sua maca",

      icon: Sparkles,
      accent: "blue",
      show: isMedium || isAdmin,
    },
    {
      to: "/recepcao",
      title: "Acolhimento",
      desc: "Lista de presença por maca",
      icon: ClipboardList,
      accent: "teal",
      show: !isViewingAsMedium && (isRecepcao || isDialogador || isAdmin),
    },
    {
      to: "/dialogo/novo",
      title: "Novo diálogo",
      desc: "Cadastrar consulente via diálogo fraterno",
      icon: UserPlus,
      accent: "gold",
      show: isDialogador,
    },
    {
      to: "/consulentes",
      title: "Consulentes",
      desc: "Buscar fichas e histórico de atendimentos",
      icon: Users,
      accent: "teal",
      show: isDialogador,
    },
    {
      to: "/admin/macas",
      title: "Gestão de Macas",
      desc: "Configurar cores, nomes e médiuns responsáveis",
      icon: Settings,
      accent: "red",
      show: isAdmin,
    },
  ];

  const visibleTiles = tiles.filter((t) => t.show);

  const isAdminView = isAdmin && !isViewingAsMedium;

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const rolesLabel = roles
    .map((r) =>
      r === "admin" ? "Administrador" : r === "dialogador" ? "Dialogador" : r === "recepcao" ? "Acolhimento" : "Médium",
    )
    .join(" · ");

  return (
    <div className="space-y-6 max-w-[1280px] mx-auto w-full">
      {/* Welcome banner — rich gradient */}
      <header
        className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl px-5 py-5 shadow-sm"
        style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0EA5A0 100%)" }}
      >
        {/* Geometric pattern overlay */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden
          style={{ opacity: 0.08 }}
        >
          <defs>
            <pattern id="welcome-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M48 0H0V48" fill="none" stroke="white" strokeWidth="1" />
              <circle cx="0" cy="0" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#welcome-grid)" />
        </svg>
        <div className="min-w-0 relative">
          <h1 className="text-lg sm:text-xl font-bold text-white truncate">
            {greeting}, {displayName}
          </h1>
          <p className="text-xs sm:text-sm truncate" style={{ color: "rgba(255,255,255,0.75)" }}>
            {rolesLabel || "Sem perfil"}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 relative">
          <div className="text-right">
            <div className="text-sm font-medium text-white">
              {diaSemana}, {diaNum} de {MESES[now.getMonth()].toLowerCase()}
            </div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>{now.getFullYear()}</div>
          </div>
          {emSessao ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium" style={{ color: "#0EA5A0" }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#0EA5A0" }} />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "#0EA5A0" }} />
              </span>
              Sessão em andamento
            </span>
          ) : (
            <span className="inline-flex flex-col items-end rounded-full bg-white/15 border border-white/25 px-3 py-1 text-xs font-medium text-white">
              <span>Sem atendimento hoje</span>
              {proximaIso && (
                <span style={{ color: "rgba(255,255,255,0.8)" }}>
                  Próxima sessão: {formatDataCurta(proximaIso)}
                </span>
              )}
            </span>
          )}
        </div>

      </header>

      {/* Admin: dashboard completo */}
      {isAdminView && <AdminDashboard />}

      {/* Quick actions — somente quando NÃO é admin (admin tem ações compactas no AdminDashboard) */}
      {!isAdminView && visibleTiles.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="block w-1 h-5 rounded bg-teal-500" />
            <h2 className="text-lg font-semibold text-slate-800">Ações rápidas</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTiles.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="group flex flex-col gap-2.5 rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className={cn("w-11 h-11 rounded-md flex items-center justify-center", ACCENT_ICON_BG[t.accent])}>
                  <t.icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm text-foreground">{t.title}</div>
                <div className="text-[12.5px] text-muted-foreground leading-snug">{t.desc}</div>
                <div className="mt-auto flex items-center gap-1 pt-1 text-[13px] font-semibold text-teal-600">
                  Acessar
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

