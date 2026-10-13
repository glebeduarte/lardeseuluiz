import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Bed,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Headset,
  MessageSquare,
  MessagesSquare,
  Sparkles,
  Stethoscope,
  TimerReset,
  Users,
  UserCog,
  UserPlus,
  XCircle,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { diaFromDate, diaLabel } from "@/lib/sessao";
import { formatDataExtenso, isDiaDeAtendimento } from "@/lib/atendimento-dates";

// Cores dos gráficos a partir dos tokens do padrão único (azul institucional, dourado e vermelho)
const C = {
  primary: "var(--primary)",
  primaryLight: "var(--brand-blue-light)",
  gold: "var(--accent)",
  red: "var(--destructive)",
  text: "var(--foreground)",
  muted: "var(--muted-foreground)",
  border: "var(--border)",
  mutedBg: "var(--muted)",
};

type Tone = "neutral" | "positive" | "warning" | "alert" | "accent";
// Cor do número por intenção (paleta de situação do guia)
const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-foreground",
  positive: "text-emerald-800",
  warning: "text-amber-800",
  alert: "text-destructive",
  accent: "text-primary",
};
// Ícone e fundo por intenção
const TONE_ICON_BG: Record<Tone, string> = {
  neutral: "bg-primary/10 text-primary",
  positive: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  alert: "bg-destructive/10 text-destructive",
  accent: "bg-primary/10 text-primary",
};

const QUICK_ACTIONS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/recepcao/imprimir", label: "Imprimir lista", icon: ClipboardList },
  { to: "/medium", label: "Lançar sessão", icon: Sparkles },
  { to: "/dialogo/novo", label: "Novo diálogo", icon: MessageSquare },
];


function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function AdminDashboard() {
  const { data: s, isLoading } = useQuery({
    queryKey: ["admin-dashboard-full"],
    queryFn: fetchAdminStats,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <QuickActions />

      {isLoading && <DashboardSkeleton />}

      {s && (
        <>
          <ModoBanner sessaoRef={s.sessaoRef} esperados={s.esperadosHoje} registrados={s.presencasHoje.total} />

          {/* ===== Operação do dia ===== */}
          <SectionTitle>
            {s.sessaoRef.isToday
              ? "Operação do dia"
              : s.sessaoRef.isPast
                ? `Última sessão (${s.sessaoRef.label})`
                : `Próxima sessão (${s.sessaoRef.label})`}
          </SectionTitle>
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Metric label="Esperados" value={s.esperadosHoje} icon={Users} tone="neutral" />
              <Metric label="Presentes" value={s.presencasHoje.presente} icon={CheckCircle2} tone="positive" />
              <Metric
                label="Aguardando"
                value={Math.max(s.esperadosHoje - s.presencasHoje.total, 0)}
                icon={Clock}
                tone="warning"
              />
              <Metric
                label="Faltas"
                value={s.presencasHoje.ausente + s.presencasHoje.falta_justificada}
                icon={XCircle}
                tone="alert"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Metric
                label={`Vagas livres (${s.macas.diaLabel.toLowerCase()})`}
                value={s.macas.vagasHoje}
                icon={Bed}
                tone="accent"
                hint={`de ${s.macas.capacidadeDia} lugares`}
              />
              <Metric label="À distância" value={s.presencasHoje.atendimento_distancia} icon={Sparkles} tone="neutral" />
              <Metric label="Emergências" value={s.presencasHoje.emergencia} icon={Zap} tone="alert" />
              <Metric label="Diálogo pendente" value={s.dialogoPendente} icon={MessagesSquare} tone="warning" />
            </div>

            <OcupacaoBar
              ocupados={s.macas.ocupadosDia}
              capacidade={s.macas.capacidadeDia}
              diaLabel={s.macas.diaLabel}
            />

            {s.alertasAtivos > 0 && (
              <div className="mt-5 flex items-center gap-3 rounded-lg border border-destructive/30 border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>
                  <strong>Alertas sensíveis:</strong> {s.alertasAtivos} em tratamento ativo
                </span>
              </div>
            )}
          </Card>

          {/* ===== Presença ===== */}
          <SectionTitle>
            {s.sessaoRef.isToday
              ? "Presença de hoje"
              : s.sessaoRef.isPast
                ? `Presença — ${s.sessaoRef.label}`
                : `Presença prevista — ${s.sessaoRef.label}`}
          </SectionTitle>
          <Card>
            <PresencaDonut data={s.presencasHoje} />
          </Card>


          {/* ===== Consulentes ===== */}
          <SectionTitle>Consulentes</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="md:col-span-2">
              <div className="grid grid-cols-2 gap-3">
                <KpiMini label="Total cadastrados" value={s.consulentes.total} />
                <KpiMini label="Em tratamento" value={s.consulentes.emTratamento} tone="accent" />
                <KpiMini label="Novos (7 dias)" value={s.consulentes.novos7} />
                <KpiMini label="Novos (30 dias)" value={s.consulentes.novos30} />
                <KpiMini label="Próximos do término" value={s.consulentes.proximosFim} tone="warning" />
                <KpiMini label="Cancelados no mês" value={s.consulentes.canceladosMes} tone="alert" />
              </div>
            </Card>
            <Card className="md:col-span-3">
              <CardTitle>Novos cadastros — últimos 30 dias</CardTitle>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={s.cadastros30} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.primary} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: C.muted }} interval={4} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.muted }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="qtd" stroke={C.primary} strokeWidth={2} fill="url(#gradTeal)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card>
            <CardTitle>Motivos do diálogo</CardTitle>
            {s.motivos.length === 0 ? (
              <Empty text="Sem motivos registrados." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, s.motivos.length * 44)}>
                <BarChart data={s.motivos} layout="vertical" margin={{ left: 16, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: C.muted }} />
                  <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 12, fill: C.text }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="qtd" fill={C.primary} radius={[8, 8, 8, 8]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* ===== Macas ===== */}
          <SectionTitle>Macas</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <Card className="md:col-span-4">
              <CardTitle>Ocupação média</CardTitle>
              <OcupacaoGauge pct={s.macas.ocupacaoMediaPct} />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Chip label="Ativas" value={s.macas.ativas} tone="accent" />
                <Chip label="Inativas" value={s.macas.inativas} tone="alert" />
                <Chip label="Vagas hoje" value={s.macas.vagasHoje} tone="positive" />
              </div>
            </Card>
            <Card className="md:col-span-8">
              <CardTitle>Ocupação por maca — hoje</CardTitle>
              {s.macas.ocupacao.length === 0 ? (
                <Empty text={`Nenhuma maca configurada para ${diaLabel(s.diaAtual).toLowerCase()}.`} />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, s.macas.ocupacao.length * 26)}>
                  <BarChart data={s.macas.ocupacao} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      domain={[0, s.macas.limiteMax]}
                      ticks={Array.from({ length: s.macas.limiteMax + 1 }, (_, i) => i)}
                      tick={{ fontSize: 11, fill: C.muted }}
                    />
                    <YAxis type="category" dataKey="nome" width={42} tick={{ fontSize: 11, fill: C.text }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <ReferenceLine
                      x={s.macas.limiteMax}
                      stroke={C.red}
                      strokeDasharray="4 4"
                      label={{ value: `limite ${s.macas.limiteMax}`, position: "top", fontSize: 10, fill: C.red }}
                    />
                    <Bar dataKey="ocupados" radius={[6, 6, 6, 6]} barSize={14}>
                      {s.macas.ocupacao.map((m, i) => (
                        <Cell key={i} fill={m.ocupados > 0 ? C.primary : C.mutedBg} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* ===== Equipe ===== */}
          <SectionTitle>Equipe</SectionTitle>
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Pill
                icon={Sparkles}
                label="Médiuns"
                value={s.equipe.mediuns}
                hint={s.equipe.mediunsSemMaca > 0 ? `${s.equipe.mediunsSemMaca} sem maca` : undefined}
                hintTone="warning"
              />
              <Pill icon={MessagesSquare} label="Dialogadores" value={s.equipe.dialogadores} />
              <Pill icon={Headset} label="Acolhimento" value={s.equipe.acolhimento} />
              <Pill icon={UserCog} label="Admins" value={s.equipe.admins} />
              <Pill icon={MessageSquare} label="Diálogos (mês)" value={s.equipe.dialogosMes} />
            </div>
          </Card>

          {/* ===== Histórico e tendências ===== */}
          <SectionTitle>Histórico e tendências</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <KpiBig label="Sessões no mês" value={s.historico.sessoesMes} icon={CalendarDays} />
            </Card>
            <Card>
              <KpiBig
                label="Conclusão de ciclo"
                value={`${s.historico.taxaConclusaoPct}%`}
                icon={CheckCircle2}
                tone="accent"
              />
            </Card>
            <Card>
              <KpiBig
                label="Presença média"
                value={`${s.historico.presencaMediaPct}%`}
                icon={Stethoscope}
                tone="positive"
                hint="Últimas 8 sessões"
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardTitle>Presença vs. faltas — últimas 8 sessões</CardTitle>
              {s.historico.sessoes8.length === 0 ? (
                <Empty text="Sem sessões registradas ainda." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={s.historico.sessoes8} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.muted }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="presentes"
                      stackId="1"
                      stroke={C.primary}
                      fill={C.primary}
                      fillOpacity={0.55}
                      name="Presentes"
                    />
                    <Area
                      type="monotone"
                      dataKey="faltas"
                      stackId="1"
                      stroke={C.gold}
                      fill={C.gold}
                      fillOpacity={0.55}
                      name="Faltas"
                    />
                    <Area
                      type="monotone"
                      dataKey="emergencia"
                      stackId="1"
                      stroke={C.red}
                      fill={C.red}
                      fillOpacity={0.55}
                      name="Emergência"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ============ Small UI pieces ============

const tooltipStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  fontSize: 12,
  background: "var(--card)",
  color: "var(--foreground)",
  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-1 text-lg font-semibold font-['Playfair_Display'] text-foreground">{children}</h2>;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm p-6", className)}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 font-['Playfair_Display'] text-lg font-semibold text-foreground">{children}</h3>;
}

function Empty({ text }: { text: string }) {
  return <div className="h-[200px] grid place-items-center text-sm text-muted-foreground">{text}</div>;
}

function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ACTIONS.map((a) => (
        <Link
          key={a.to}
          to={a.to}
          title={a.label}
          aria-label={a.label}
          className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <a.icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
          <span>{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: Tone;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0", TONE_ICON_BG[tone])}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className={cn("text-2xl font-bold leading-tight", TONE_TEXT[tone])}>{value}</div>
        <div className="text-xs text-muted-foreground leading-tight">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground leading-tight">{hint}</div>}
      </div>
    </div>
  );
}


function KpiMini({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-lg bg-muted px-3 py-3">
      <div className="text-xs text-muted-foreground leading-tight">{label}</div>
      <div className={cn("text-xl font-bold mt-1", TONE_TEXT[tone])}>{value}</div>
    </div>
  );
}

function KpiBig({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0", TONE_ICON_BG[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className={cn("text-2xl font-bold leading-tight", TONE_TEXT[tone])}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

function Chip({ label, value, tone }: { label: string; value: number | string; tone: Tone }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2 text-center">
      <div className={cn("text-lg font-bold leading-tight", TONE_TEXT[tone])}>{value}</div>
      <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</div>
    </div>
  );
}

function Pill({
  icon: Icon,
  label,
  value,
  hint,
  hintTone,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  hintTone?: Tone;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-3">
      <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-tight text-foreground">{value}</div>
        <div className="text-xs leading-tight text-muted-foreground">{label}</div>
        {hint && (
          <div className={cn("text-[11px] mt-0.5 flex items-center gap-1", hintTone === "warning" ? "text-amber-800" : "text-muted-foreground")}>
            <AlertTriangle className="h-3 w-3" /> {hint}
          </div>
        )}
      </div>
    </div>
  );
}

function PresencaDonut({ data }: { data: { presente: number; ausente: number; falta_justificada: number; emergencia: number; atendimento_distancia: number; total: number } }) {
  const items = [
    { name: "Presentes", value: data.presente, fill: C.primary },
    { name: "Aguardando", value: Math.max(data.total === 0 ? 0 : 0, 0), fill: C.primaryLight },
    { name: "Faltas", value: data.ausente + data.falta_justificada, fill: C.gold },
    { name: "À distância", value: data.atendimento_distancia, fill: C.muted },
  ];
  const total = items.reduce((a, b) => a + b.value, 0);

  if (total === 0) {
    return <Empty text="Sem registros de presença ainda hoje." />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
      <div className="relative h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={items} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={2} stroke="none">
              {items.map((it, i) => (
                <Cell key={i} fill={it.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-3xl font-bold text-foreground">{total}</div>
          <div className="text-xs text-muted-foreground">total</div>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.name} className="flex items-center gap-3 text-sm">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: it.fill }} />
            <span className="flex-1 text-muted-foreground">{it.name}</span>
            <span className="font-semibold text-foreground">{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OcupacaoGauge({ pct }: { pct: number }) {
  const data = [{ name: "Ocupação", value: pct, fill: C.primary }];
  return (
    <div className="relative h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={210}
          endAngle={-30}
          barSize={16}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: C.mutedBg }} dataKey="value" cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-3xl font-bold text-foreground">{pct}%</div>
        <div className="text-xs text-muted-foreground">ocupação média</div>
      </div>
    </div>
  );
}

// ----------------- Data fetching & aggregation -----------------

async function fetchAdminStats() {
  const today = new Date();
  const diaAtual = diaFromDate(today);
  const todayIso = toIso(today);
  const d7Iso = toIso(daysAgo(7));
  const d30Iso = toIso(daysAgo(30));
  const monthStartIso = toIso(startOfMonth(today));

  const [
    consulentesRes,
    designacoesRes,
    macasRes,
    sessoesRes,
    sessaoHojeRes,
    userRolesRes,
    macaMediunsRes,
  ] = await Promise.all([
    supabase
      .from("consulentes")
      .select(
        "id, created_at, ideias_suicidas, dialogo_pendente, motivo_saude_fisica, motivo_saude_mental, motivo_saude_espiritual, motivo_conflitos_familiares, indicacao_saude, indicacao_chakras, indicacao_harmonizacao, indicacao_mediunidade, indicacao_desobsessao_leve, indicacao_desobsessao, encaminhamento_passes",
      )
      .limit(5000),
    supabase
      .from("designacoes")
      .select("id, status, sessoes_realizadas, sessoes_totais, created_at, closed_at, maca_id, consulente_id")
      .limit(5000),
    supabase.from("macas").select("id, numero, nome, cor_hex, ativa, dia, lotacao_max"),
    supabase
      .from("sessoes")
      .select("id, data, tipo")
      .order("data", { ascending: false }),
    supabase.from("sessoes").select("id, data, tipo").eq("data", todayIso).maybeSingle(),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("maca_mediuns").select("user_id, maca_id"),
  ]);

  const consulentes = consulentesRes.data ?? [];
  const designacoes = designacoesRes.data ?? [];
  const macas = macasRes.data ?? [];
  const sessoes = sessoesRes.data ?? [];
  const sessaoHoje = sessaoHojeRes.data ?? null;
  const userRoles = userRolesRes.data ?? [];
  const macaMediuns = macaMediunsRes.data ?? [];

  // sessões passadas/hoje em ordem decrescente
  const sessoesPast = sessoes.filter((s) => s.data <= todayIso);
  const sessoesFuture = sessoes.filter((s) => s.data > todayIso).sort((a, b) => (a.data < b.data ? -1 : 1));

  // Sessão de referência: hoje > próxima futura > última passada
  const sessaoRefRow =
    sessaoHoje ?? sessoesFuture[0] ?? sessoesPast[0] ?? null;
  const sessaoRefIso = sessaoRefRow?.data ?? todayIso;
  const sessaoRefDate = new Date(sessaoRefIso + "T12:00:00");
  const sessaoRef = {
    iso: sessaoRefIso,
    label: sessaoRefDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    isToday: sessaoRefIso === todayIso,
    isPast: sessaoRefIso < todayIso,
    extenso: formatDataExtenso(sessaoRefIso),
    ehDiaDeAtendimento: isDiaDeAtendimento(today),
  };
  const diaReferencia: ReturnType<typeof diaFromDate> = sessaoRefRow
    ? (sessaoRefRow.tipo as ReturnType<typeof diaFromDate>)
    : diaAtual;

  const last8 = sessoesPast.slice(0, 8);
  const idsRelevantes = Array.from(
    new Set([sessaoRefRow?.id, ...last8.map((x) => x.id)].filter(Boolean) as string[]),
  );
  const presencasRes = idsRelevantes.length
    ? await supabase.from("presencas").select("sessao_id, status").in("sessao_id", idsRelevantes)
    : { data: [] as Array<{ sessao_id: string; status: string }> };
  const presencas = presencasRes.data ?? [];


  const macasDoDia = macas.filter((m) => m.ativa && m.dia === diaReferencia);
  const macasDoDiaIds = new Set(macasDoDia.map((m) => m.id));
  const designacoesAtivasDia = designacoes.filter(
    (d) => d.status === "ativa" && macasDoDiaIds.has(d.maca_id),
  );
  const ocupacaoPorMaca = new Map<string, number>();
  designacoesAtivasDia.forEach((d) => {
    ocupacaoPorMaca.set(d.maca_id, (ocupacaoPorMaca.get(d.maca_id) ?? 0) + 1);
  });

  const presencasRefArr = presencas.filter((p) => p.sessao_id === sessaoRefRow?.id);
  const presencasHoje = {
    presente: presencasRefArr.filter((p) => p.status === "presente").length,
    ausente: presencasRefArr.filter((p) => p.status === "ausente").length,
    falta_justificada: presencasRefArr.filter((p) => p.status === "falta_justificada").length,
    emergencia: presencasRefArr.filter((p) => p.status === "emergencia").length,
    atendimento_distancia: presencasRefArr.filter((p) => p.status === "atendimento_distancia").length,
    total: presencasRefArr.length,
  };


  const macasNoDiaLotadas = macasDoDia.filter(
    (m) => (ocupacaoPorMaca.get(m.id) ?? 0) >= (m.lotacao_max ?? 10),
  ).length;

  const consulentesEmTratamentoIds = new Set(
    designacoes.filter((d) => d.status === "ativa").map((d) => d.consulente_id),
  );
  const consulentesAlertaAtivos = consulentes.filter(
    (c) => c.ideias_suicidas && consulentesEmTratamentoIds.has(c.id),
  ).length;

  const novos7 = consulentes.filter((c) => c.created_at >= d7Iso).length;
  const novos30 = consulentes.filter((c) => c.created_at >= d30Iso).length;

  const proximosFim = designacoes.filter(
    (d) => d.status === "ativa" && (d.sessoes_totais ?? 0) - (d.sessoes_realizadas ?? 0) <= 1,
  ).length;

  const encerradosMes = designacoes.filter(
    (d) => d.status === "concluida" && d.closed_at && d.closed_at >= monthStartIso,
  ).length;
  const canceladosMes = designacoes.filter(
    (d) => d.status === "cancelada" && d.closed_at && d.closed_at >= monthStartIso,
  ).length;

  const concluidasComDuracao = designacoes.filter(
    (d) => d.status === "concluida" && d.closed_at && d.created_at,
  );
  const duracaoMediaDias =
    concluidasComDuracao.length === 0
      ? null
      : Math.round(
          concluidasComDuracao.reduce(
            (acc, d) =>
              acc +
              (new Date(d.closed_at!).getTime() - new Date(d.created_at).getTime()) /
                (1000 * 60 * 60 * 24),
            0,
          ) / concluidasComDuracao.length,
        );

  const cadastros30 = build30dSeries(consulentes.map((c) => c.created_at));

  const motivos = [
    { nome: "Saúde física", qtd: consulentes.filter((c) => c.motivo_saude_fisica).length },
    { nome: "Saúde mental", qtd: consulentes.filter((c) => c.motivo_saude_mental).length },
    { nome: "Saúde espiritual", qtd: consulentes.filter((c) => c.motivo_saude_espiritual).length },
    { nome: "Conflitos familiares", qtd: consulentes.filter((c) => c.motivo_conflitos_familiares).length },
  ]
    .filter((m) => m.qtd > 0)
    .sort((a, b) => b.qtd - a.qtd);

  const encaminhamentos = [
    { nome: "Passes", qtd: consulentes.filter((c) => c.encaminhamento_passes).length },
    { nome: "Saúde", qtd: consulentes.filter((c) => c.indicacao_saude).length },
    { nome: "Chakras", qtd: consulentes.filter((c) => c.indicacao_chakras).length },
    { nome: "Harmonização", qtd: consulentes.filter((c) => c.indicacao_harmonizacao).length },
    { nome: "Mediunidade", qtd: consulentes.filter((c) => c.indicacao_mediunidade).length },
    { nome: "Desobs. leve", qtd: consulentes.filter((c) => c.indicacao_desobsessao_leve).length },
    { nome: "Desobsessão", qtd: consulentes.filter((c) => c.indicacao_desobsessao).length },
  ]
    .filter((e) => e.qtd > 0)
    .sort((a, b) => b.qtd - a.qtd);

  const macasAtivas = macas.filter((m) => m.ativa).length;
  const macasInativas = macas.length - macasAtivas;
  const vagasHoje = macasDoDia.reduce(
    (acc, m) => acc + Math.max((m.lotacao_max ?? 10) - (ocupacaoPorMaca.get(m.id) ?? 0), 0),
    0,
  );
  const capacidadeDia = macasDoDia.reduce((acc, m) => acc + (m.lotacao_max ?? 10), 0);
  const ocupadosDia = macasDoDia.reduce((acc, m) => acc + (ocupacaoPorMaca.get(m.id) ?? 0), 0);
  const ocupacaoMediaPct = capacidadeDia === 0 ? 0 : Math.round((ocupadosDia / capacidadeDia) * 100);
  const ocupacao = macasDoDia
    .slice()
    .sort((a, b) => a.numero - b.numero)
    .map((m) => ({
      nome: `M${m.numero}`,
      ocupados: ocupacaoPorMaca.get(m.id) ?? 0,
      cor: m.cor_hex,
    }));

  const rolesByUser = new Map<string, Set<string>>();
  userRoles.forEach((r) => {
    if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, new Set());
    rolesByUser.get(r.user_id)!.add(r.role);
  });
  const mediuns = [...rolesByUser.values()].filter((s) => s.has("medium")).length;
  const dialogadores = [...rolesByUser.values()].filter((s) => s.has("dialogador")).length;
  const acolhimento = [...rolesByUser.values()].filter((s) => s.has("recepcao")).length;
  const admins = [...rolesByUser.values()].filter((s) => s.has("admin")).length;
  const mediunsComMaca = new Set(macaMediuns.map((m) => m.user_id));
  const mediunsSemMaca = [...rolesByUser.entries()].filter(
    ([uid, set]) => set.has("medium") && !mediunsComMaca.has(uid),
  ).length;

  const dialogos7 = consulentes.filter((c) => c.created_at >= d7Iso).length;
  const dialogosMes = consulentes.filter((c) => c.created_at >= monthStartIso).length;

  const sessoesMes = sessoes.filter((s) => s.data >= monthStartIso && s.data <= todayIso).length;
  const encerradasMes = designacoes.filter(
    (d) => (d.status === "concluida" || d.status === "cancelada") && d.closed_at && d.closed_at >= monthStartIso,
  ).length;
  const taxaConclusaoPct =
    encerradasMes === 0 ? 0 : Math.round((encerradosMes / encerradasMes) * 100);

  const sessoes8 = last8
    .slice()
    .reverse()
    .map((s) => {
      const ps = presencas.filter((p) => p.sessao_id === s.id);
      return {
        label: new Date(s.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        presentes: ps.filter((p) => p.status === "presente" || p.status === "atendimento_distancia").length,
        faltas: ps.filter((p) => p.status === "ausente" || p.status === "falta_justificada").length,
        emergencia: ps.filter((p) => p.status === "emergencia").length,
      };
    });
  const totalPres = sessoes8.reduce((a, x) => a + x.presentes + x.faltas + x.emergencia, 0);
  const totalPresent = sessoes8.reduce((a, x) => a + x.presentes, 0);
  const presencaMediaPct = totalPres === 0 ? 0 : Math.round((totalPresent / totalPres) * 100);

  return {
    diaAtual: diaReferencia,
    sessaoStatus: sessaoHoje ? "aberta" : "não aberta",
    sessaoAberta: !!sessaoHoje,
    sessaoRef,
    esperadosHoje: designacoesAtivasDia.length,

    presencasHoje,
    macasNoDia: macasDoDia.length,
    macasNoDiaLotadas,
    dialogoPendente: consulentes.filter((c) => c.dialogo_pendente).length,
    alertasAtivos: consulentesAlertaAtivos,
    consulentes: {
      total: consulentes.length,
      novos7,
      novos30,
      emTratamento: consulentesEmTratamentoIds.size,
      proximosFim,
      encerradosMes,
      canceladosMes,
      duracaoMediaDias,
    },
    cadastros30,
    motivos,
    macas: {
      ativas: macasAtivas,
      inativas: macasInativas,
      vagasHoje,
      capacidadeDia,
      ocupadosDia,
      limiteMax: Math.max(10, ...macasDoDia.map((m) => m.lotacao_max ?? 10)),
      diaLabel: diaLabel(diaReferencia),
      ocupacaoMediaPct,
      ocupacao,
    },
    equipe: {
      mediuns,
      mediunsSemMaca,
      dialogadores,
      acolhimento,
      admins,
      dialogos7,
      dialogosMes,
    },
    historico: {
      sessoesMes,
      taxaConclusaoPct,
      presencaMediaPct,
      sessoes8,
      encaminhamentos,
    },
  };
}

function build30dSeries(timestamps: string[]) {
  const buckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.set(toIso(d), 0);
  }
  timestamps.forEach((ts) => {
    const key = ts.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });
  return [...buckets.entries()].map(([d, qtd]) => ({
    dia: new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    qtd,
  }));
}


function ModoBanner({
  sessaoRef,
  esperados,
  registrados,
}: {
  sessaoRef: { extenso: string; isToday: boolean; isPast: boolean; ehDiaDeAtendimento: boolean };
  esperados: number;
  registrados: number;
}) {
  const emSessao = sessaoRef.ehDiaDeAtendimento && sessaoRef.isToday;
  return (
    <div className={cn("rounded-xl border border-l-4 bg-card p-5 shadow-sm", emSessao ? "border-l-emerald-500" : "border-l-primary")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className={cn("text-xs font-semibold uppercase tracking-wide", emSessao ? "text-emerald-800" : "text-primary")}>
            {emSessao ? "Modo sessão — hoje tem atendimento" : "Modo espera — fora de dia de atendimento"}
          </div>
          <div className="mt-1 text-lg font-semibold font-['Playfair_Display'] text-foreground">
            {emSessao ? "Sessão de hoje" : sessaoRef.isPast ? "Última sessão" : "Próxima sessão"}: {sessaoRef.extenso}
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            {esperados} consulentes esperados · {registrados} registros lançados
          </div>
        </div>
        <Link
          to="/medium"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <TimerReset className="h-4 w-4" />
          {emSessao ? "Lançar sessão" : "Ver macas"}
        </Link>
      </div>
    </div>
  );
}

function OcupacaoBar({
  ocupados,
  capacidade,
  diaLabel: dia,
}: {
  ocupados: number;
  capacidade: number;
  diaLabel: string;
}) {
  const livres = Math.max(capacidade - ocupados, 0);
  const pct = capacidade === 0 ? 0 : Math.round((ocupados / capacidade) * 100);
  return (
    <div className="mt-5 rounded-lg bg-muted p-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-foreground">
          Vagas livres na {dia.toLowerCase()}: <strong>{livres}</strong> de {capacidade}
        </span>
        <span className="text-muted-foreground">{pct}% ocupado</span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-primary")}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando indicadores">
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
