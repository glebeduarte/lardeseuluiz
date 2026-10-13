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
import { Badge } from "@/components/ui/badge";
import { CabecalhoPagina } from "@/compartilhado";
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

// Ícones dos atalhos seguem o cartão de indicador do guia (azul institucional em fundo suave)
const ACCENT_ICON_BG: Record<Accent, string> = {
  blue: "bg-primary/10 text-primary",
  teal: "bg-primary/10 text-primary",
  gold: "bg-primary/10 text-primary",
  red: "bg-primary/10 text-primary",
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
    <>
      <CabecalhoPagina
        titulo={`${greeting}, ${displayName}`}
        descricao={rolesLabel || "Sem perfil"}
        acoes={
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">
                {diaSemana}, {diaNum} de {MESES[now.getMonth()].toLowerCase()}
              </div>
              <div className="text-xs text-muted-foreground">{now.getFullYear()}</div>
            </div>
            {emSessao ? (
              <Badge variant="outline" className="gap-1.5 bg-emerald-100 text-emerald-800 border-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                Sessão em andamento
              </Badge>
            ) : (
              <Badge variant="outline" className="flex-col items-end bg-muted text-muted-foreground border-border">
                <span>Sem atendimento hoje</span>
                {proximaIso && <span className="font-normal">Próxima sessão: {formatDataCurta(proximaIso)}</span>}
              </Badge>
            )}
          </div>
        }
      />
      <div className="space-y-6">
      {/* Admin: dashboard completo */}
      {isAdminView && <AdminDashboard />}

      {/* Quick actions — somente quando NÃO é admin (admin tem ações compactas no AdminDashboard) */}
      {!isAdminView && visibleTiles.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold font-['Playfair_Display'] text-foreground mb-4">Ações rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTiles.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="group flex flex-col gap-2.5 rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center", ACCENT_ICON_BG[t.accent])}>
                  <t.icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm text-foreground">{t.title}</div>
                <div className="text-[12.5px] text-muted-foreground leading-snug">{t.desc}</div>
                <div className="mt-auto flex items-center gap-1 pt-1 text-[13px] font-semibold text-primary">
                  Acessar
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      </div>
    </>
  );
}

