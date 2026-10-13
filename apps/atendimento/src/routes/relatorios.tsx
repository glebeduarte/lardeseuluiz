import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { AlertTriangle, Users, Layers, HeartHandshake, Wifi, ShieldAlert, FileWarning, CalendarCheck, CalendarX } from "lucide-react";
import { CabecalhoPagina } from "@/compartilhado";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportRelatorioButton, type ExportColumn } from "@/components/ExportRelatorioButton";
import { getAtendimentoDatesIsoByDia } from "@/lib/atendimento-dates";

function fmtDia(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}





const ABAS = [
  "incompletos",
  "ativos",
  "registros",
  "mais-de-uma",
  "trabalhadores",
  "distancia",
  "lotacao",
  "alertas",
] as const;
type Aba = (typeof ABAS)[number];

export const Route = createFileRoute("/relatorios")({
  validateSearch: (search: Record<string, unknown>): { aba: Aba } => {
    const aba = String(search.aba ?? "");
    return { aba: (ABAS as readonly string[]).includes(aba) ? (aba as Aba) : "incompletos" };
  },
  head: () => ({
    meta: [
      { title: "Relatórios de consulentes — Sistema de Macas" },
      { name: "description", content: "Relatórios operacionais sobre consulentes: cadastros incompletos, distribuição por maca, trabalhadores, tratamento à distância e alertas sensíveis." },
    ],
  }),
  component: () => (
    <RequireAuth roles={["admin", "dialogador"]}>
      <RelatoriosPage />
    </RequireAuth>
  ),
});

type Maca = { id: string; numero: number; nome: string; dia: string; categoria: string; cor_hex: string; lotacao_max: number };
type Consulente = {
  id: string;
  nome: string;
  telefone: string | null;
  data_nascimento: string | null;
  dialogador_id: string | null;
  conhece_doutrina: boolean | null;
  evangelho_no_lar: boolean | null;
  trabalhador: boolean;
  tratamento_distancia: boolean;
  ideias_suicidas: boolean;
  ideacao_criminosa: boolean;
  uso_drogas: boolean;
  uso_alcool: boolean;
  uso_medicacoes: boolean;
};
type Designacao = { id: string; consulente_id: string; maca_id: string; status: string };

function RelatoriosPage() {
  const { aba } = Route.useSearch();
  const navigate = Route.useNavigate();
  const irParaAba = (a: Aba) => navigate({ search: { aba: a }, replace: true });
  const [periodo, setPeriodo] = useState<"30" | "60" | "90" | "tudo">("tudo");
  const { data, isLoading } = useQuery({
    queryKey: ["relatorios-consulentes"],
    queryFn: async () => {
      const [mRes, cRes, dRes] = await Promise.all([
        supabase.from("macas").select("id, numero, nome, dia, categoria, cor_hex, lotacao_max").eq("ativa", true).order("numero"),
        supabase.from("consulentes").select("id, nome, telefone, data_nascimento, dialogador_id, conhece_doutrina, evangelho_no_lar, trabalhador, tratamento_distancia, ideias_suicidas, ideacao_criminosa, uso_drogas, uso_alcool, uso_medicacoes"),
        supabase.from("designacoes").select("id, consulente_id, maca_id, status").eq("status", "ativa"),
      ]);
      if (mRes.error) throw mRes.error;
      if (cRes.error) throw cRes.error;
      if (dRes.error) throw dRes.error;
      return {
        macas: (mRes.data ?? []) as Maca[],
        consulentes: (cRes.data ?? []) as Consulente[],
        designacoes: (dRes.data ?? []) as Designacao[],
      };
    },
  });

  const { data: regData } = useQuery({
    queryKey: ["relatorios-registros-macas"],
    queryFn: async () => {
      const [sRes, pRes, dRes] = await Promise.all([
        supabase.from("sessoes").select("id, data, tipo"),
        supabase.from("presencas").select("designacao_id, sessao_id, status"),
        supabase.from("designacoes").select("id, maca_id"),
      ]);
      if (sRes.error) throw sRes.error;
      if (pRes.error) throw pRes.error;
      if (dRes.error) throw dRes.error;
      return {
        sessoes: (sRes.data ?? []) as { id: string; data: string; tipo: string }[],
        presencas: (pRes.data ?? []) as { designacao_id: string; sessao_id: string; status: string }[],
        desigs: (dRes.data ?? []) as { id: string; maca_id: string }[],
      };
    },
  });

  const registros = useMemo(() => {
    if (!data || !regData) return null;
    const hoje = new Date();
    const corte = (() => {
      if (periodo === "tudo") return "0000-01-01";
      const d = new Date();
      d.setDate(d.getDate() - Number(periodo));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const sessaoById = new Map(regData.sessoes.map((s) => [s.id, s]));
    const macaByDesig = new Map(regData.desigs.map((d) => [d.id, d.maca_id]));

    // maca -> data -> contagens
    const porMaca = new Map<string, Map<string, { presente: number; distancia: number; ausente: number; justificada: number; emergencia: number }>>();
    for (const p of regData.presencas) {
      const macaId = macaByDesig.get(p.designacao_id);
      const sess = sessaoById.get(p.sessao_id);
      if (!macaId || !sess) continue;
      const byDate = porMaca.get(macaId) ?? new Map();
      const cur = byDate.get(sess.data) ?? { presente: 0, distancia: 0, ausente: 0, justificada: 0, emergencia: 0 };
      if (p.status === "presente") cur.presente++;
      else if (p.status === "atendimento_distancia") cur.distancia++;
      else if (p.status === "ausente") cur.ausente++;
      else if (p.status === "falta_justificada") cur.justificada++;
      else cur.emergencia++;
      byDate.set(sess.data, cur);
      porMaca.set(macaId, byDate);
    }

    const linhas = data.macas.map((m) => {
      const esperadas = getAtendimentoDatesIsoByDia(m.dia).filter((iso) => iso <= hojeIso && iso >= corte);
      const byDate = porMaca.get(m.id) ?? new Map();
      const registradas = esperadas.filter((iso) => byDate.has(iso));
      const faltantes = esperadas.filter((iso) => !byDate.has(iso));
      let presente = 0, distancia = 0, ausente = 0, justificada = 0, emergencia = 0;
      for (const iso of registradas) {
        const c = byDate.get(iso)!;
        presente += c.presente; distancia += c.distancia; ausente += c.ausente;
        justificada += c.justificada; emergencia += c.emergencia;
      }
      const totalFaltas = ausente + justificada;
      const totalPresencas = presente + distancia;
      const total = totalPresencas + totalFaltas + emergencia;
      return {
        maca: m,
        esperadas,
        registradas,
        faltantes,
        presente,
        distancia,
        ausente,
        justificada,
        emergencia,
        totalPresencas,
        totalFaltas,
        taxa: total > 0 ? Math.round((totalPresencas / total) * 100) : 0,
        ultimaRegistrada: registradas.length ? registradas[registradas.length - 1] : null,
      };
    });

    const semRegistro = linhas.filter((l) => l.registradas.length === 0);
    const comRegistro = linhas.filter((l) => l.registradas.length > 0);
    const pendentes = linhas.filter((l) => l.faltantes.length > 0);
    return { linhas, semRegistro, comRegistro, pendentes };
  }, [data, regData, periodo]);



  const rel = useMemo(() => {
    if (!data) return null;
    const { macas, consulentes, designacoes } = data;
    const consById = new Map(consulentes.map((c) => [c.id, c]));
    const macaById = new Map(macas.map((m) => [m.id, m]));

    // designações ativas por consulente (para "em mais de uma maca")
    const desigsPorCons = new Map<string, Designacao[]>();
    for (const d of designacoes) {
      if (!consById.has(d.consulente_id) || !macaById.has(d.maca_id)) continue;
      const arr = desigsPorCons.get(d.consulente_id) ?? [];
      arr.push(d);
      desigsPorCons.set(d.consulente_id, arr);
    }

    // consulentes ativos (com pelo menos 1 designação ativa)
    const ativosIds = new Set(desigsPorCons.keys());

    // cadastros incompletos (só entre ativos)
    const incompletos = [...ativosIds]
      .map((id) => consById.get(id))
      .filter((c): c is Consulente => !!c)
      .map((c) => {
        const faltando: string[] = [];
        if (!c.telefone) faltando.push("telefone");
        if (!c.data_nascimento) faltando.push("data de nascimento");
        return { c, faltando };
      })
      .filter((x) => x.faltando.length > 0);

    // agrupar por maca (usa a primeira designação ativa)
    const incompletosPorMaca = new Map<string, { c: Consulente; faltando: string[] }[]>();
    for (const item of incompletos) {
      const d = desigsPorCons.get(item.c.id)?.[0];
      if (!d) continue;
      const arr = incompletosPorMaca.get(d.maca_id) ?? [];
      arr.push(item);
      incompletosPorMaca.set(d.maca_id, arr);
    }

    const ativosPorMaca = new Map<string, Consulente[]>();
    for (const d of designacoes) {
      const c = consById.get(d.consulente_id);
      if (!c) continue;
      const arr = ativosPorMaca.get(d.maca_id) ?? [];
      arr.push(c);
      ativosPorMaca.set(d.maca_id, arr);
    }

    const emMaisDeUma = [...desigsPorCons.entries()]
      .filter(([, ds]) => ds.length > 1)
      .map(([cid, ds]) => ({
        c: consById.get(cid)!,
        macas: ds.map((d) => macaById.get(d.maca_id)!).filter(Boolean),
      }))
      .filter((x) => x.c);

    const trabalhadores = consulentes
      .filter((c) => c.trabalhador && ativosIds.has(c.id))
      .map((c) => ({ c, macas: (desigsPorCons.get(c.id) ?? []).map((d) => macaById.get(d.maca_id)!).filter(Boolean) }));

    const distancia = consulentes
      .filter((c) => c.tratamento_distancia && ativosIds.has(c.id))
      .map((c) => ({ c, macas: (desigsPorCons.get(c.id) ?? []).map((d) => macaById.get(d.maca_id)!).filter(Boolean) }));

    const alertas = consulentes
      .filter((c) => ativosIds.has(c.id) && (c.ideias_suicidas || c.ideacao_criminosa || c.uso_drogas || c.uso_alcool))
      .map((c) => ({ c, macas: (desigsPorCons.get(c.id) ?? []).map((d) => macaById.get(d.maca_id)!).filter(Boolean) }));

    return { macas, incompletosPorMaca, ativosPorMaca, emMaisDeUma, trabalhadores, distancia, alertas, totalIncompletos: incompletos.length };
  }, [data]);

  if (isLoading || !rel) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Carregando relatórios">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const macasComIncompletos = rel.macas.filter((m) => (rel.incompletosPorMaca.get(m.id)?.length ?? 0) > 0);

  const sim = (b: boolean | null) => (b === null ? "" : b ? "Sim" : "Não");
  const macasStr = (ms: Maca[]) => ms.map((m) => `${m.nome} (${m.dia})`).join(" · ");

  // Rows para exportação
  const rowsIncompletos = macasComIncompletos.flatMap((m) =>
    (rel.incompletosPorMaca.get(m.id) ?? []).map(({ c, faltando }) => ({ maca: m, c, faltando }))
  );
  const rowsAtivos = rel.macas.flatMap((m) =>
    (rel.ativosPorMaca.get(m.id) ?? []).map((c) => ({ maca: m, c }))
  );

  const colsCons = <T extends { c: Consulente }>(): ExportColumn<T>[] => [
    { key: "nome", label: "Nome", getValue: (r) => r.c.nome },
    { key: "telefone", label: "Telefone", getValue: (r) => r.c.telefone ?? "" },
    { key: "nascimento", label: "Data de nascimento", getValue: (r) => r.c.data_nascimento ?? "" },
    { key: "trabalhador", label: "Trabalhador", defaultOn: false, getValue: (r) => (r.c.trabalhador ? "Sim" : "Não") },
    { key: "distancia", label: "Tratamento à distância", defaultOn: false, getValue: (r) => (r.c.tratamento_distancia ? "Sim" : "Não") },
    { key: "conhece", label: "Conhece doutrina", defaultOn: false, getValue: (r) => sim(r.c.conhece_doutrina) },
    { key: "evangelho", label: "Evangelho no lar", defaultOn: false, getValue: (r) => sim(r.c.evangelho_no_lar) },
  ];

  const colsIncompletos: ExportColumn<(typeof rowsIncompletos)[number]>[] = [
    { key: "maca", label: "Maca", getValue: (r) => r.maca.nome },
    { key: "dia", label: "Dia", getValue: (r) => r.maca.dia },
    { key: "categoria", label: "Categoria", defaultOn: false, getValue: (r) => r.maca.categoria },
    ...colsCons<(typeof rowsIncompletos)[number]>(),
    { key: "faltando", label: "Campos faltando", getValue: (r) => r.faltando.join(", ") },
  ];

  const colsAtivos: ExportColumn<(typeof rowsAtivos)[number]>[] = [
    { key: "maca", label: "Maca", getValue: (r) => r.maca.nome },
    { key: "dia", label: "Dia", getValue: (r) => r.maca.dia },
    { key: "categoria", label: "Categoria", defaultOn: false, getValue: (r) => r.maca.categoria },
    ...colsCons<(typeof rowsAtivos)[number]>(),
  ];

  type ComMacas = { c: Consulente; macas: Maca[] };
  const colsComMacas: ExportColumn<ComMacas>[] = [
    ...colsCons<ComMacas>(),
    { key: "macas", label: "Macas", getValue: (r) => macasStr(r.macas) },
  ];

  const colsAlertas: ExportColumn<ComMacas>[] = [
    ...colsCons<ComMacas>(),
    { key: "macas", label: "Macas", getValue: (r) => macasStr(r.macas) },
    { key: "suicidas", label: "Ideias suicidas", getValue: (r) => (r.c.ideias_suicidas ? "Sim" : "Não") },
    { key: "criminosa", label: "Ideação criminosa", getValue: (r) => (r.c.ideacao_criminosa ? "Sim" : "Não") },
    { key: "drogas", label: "Uso de drogas", getValue: (r) => (r.c.uso_drogas ? "Sim" : "Não") },
    { key: "alcool", label: "Uso de álcool", getValue: (r) => (r.c.uso_alcool ? "Sim" : "Não") },
    { key: "medicacoes", label: "Uso de medicações", defaultOn: false, getValue: (r) => (r.c.uso_medicacoes ? "Sim" : "Não") },
  ];

  type LinhaRegistro = NonNullable<typeof registros>["linhas"][number];
  const colsRegistros: ExportColumn<LinhaRegistro>[] = [
    { key: "maca", label: "Maca", getValue: (r) => r.maca.nome },
    { key: "dia", label: "Dia", getValue: (r) => r.maca.dia },
    { key: "categoria", label: "Categoria", defaultOn: false, getValue: (r) => r.maca.categoria },
    { key: "esperadas", label: "Datas previstas até hoje", getValue: (r) => r.esperadas.length },
    { key: "registradas", label: "Datas registradas", getValue: (r) => r.registradas.length },
    { key: "pendentes", label: "Datas pendentes", getValue: (r) => r.faltantes.map(fmtDia).join(", ") },
    { key: "presencas", label: "Presenças", getValue: (r) => r.totalPresencas },
    { key: "presente", label: "Presente", defaultOn: false, getValue: (r) => r.presente },
    { key: "distancia", label: "À distância", defaultOn: false, getValue: (r) => r.distancia },
    { key: "faltas", label: "Faltas", getValue: (r) => r.totalFaltas },
    { key: "ausente", label: "Ausente", defaultOn: false, getValue: (r) => r.ausente },
    { key: "justificada", label: "Falta justificada", defaultOn: false, getValue: (r) => r.justificada },
    { key: "taxa", label: "Taxa de presença (%)", getValue: (r) => r.taxa },
    { key: "ultima", label: "Último registro", getValue: (r) => (r.ultimaRegistrada ? fmtDia(r.ultimaRegistrada) : "") },
  ];


  const linhasLotacao = rel.macas
    .map((m) => {
      const ocupacao = rel.ativosPorMaca.get(m.id)?.length ?? 0;
      const max = m.lotacao_max || 1;
      return { maca: m, ocupacao, vagas: Math.max(0, m.lotacao_max - ocupacao), pct: Math.round((ocupacao / max) * 100) };
    })
    .sort((a, b) => b.pct - a.pct);

  const colsLotacao: ExportColumn<(typeof linhasLotacao)[number]>[] = [
    { key: "maca", label: "Maca", getValue: (r) => r.maca.nome },
    { key: "dia", label: "Dia", getValue: (r) => r.maca.dia },
    { key: "categoria", label: "Categoria", getValue: (r) => r.maca.categoria },
    { key: "ocupacao", label: "Ocupação", getValue: (r) => r.ocupacao },
    { key: "max", label: "Lotação máxima", getValue: (r) => r.maca.lotacao_max },
    { key: "vagas", label: "Vagas", getValue: (r) => r.vagas },
    { key: "pct", label: "Ocupação (%)", getValue: (r) => r.pct },
  ];

  return (
    <>
      <CabecalhoPagina
        titulo="Relatórios de consulentes"
        descricao="Consulentes considerados são os que possuem designação ativa em uma maca."
      />
      <div className="space-y-6">
      <p className="text-xs text-muted-foreground">Clique em um indicador para abrir o relatório correspondente.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiCard icon={FileWarning} onClick={() => irParaAba("incompletos")} label="Cadastros incompletos" value={rel.totalIncompletos} tone="amber" />
        <KpiCard icon={Layers} onClick={() => irParaAba("mais-de-uma")} label="Em +1 maca" value={rel.emMaisDeUma.length} tone="teal" />
        <KpiCard icon={HeartHandshake} onClick={() => irParaAba("trabalhadores")} label="Trabalhadores" value={rel.trabalhadores.length} tone="blue" />
        <KpiCard icon={Wifi} onClick={() => irParaAba("distancia")} label="À distância" value={rel.distancia.length} tone="teal" />
        <KpiCard icon={ShieldAlert} onClick={() => irParaAba("alertas")} label="Alertas sensíveis" value={rel.alertas.length} tone="red" />
        <KpiCard icon={CalendarX} onClick={() => irParaAba("registros")} label="Macas sem registro" value={registros?.semRegistro.length ?? 0} tone="red" />
        <KpiCard icon={Layers} onClick={() => irParaAba("lotacao")} label="Macas próximas do limite" value={linhasLotacao.filter((l) => l.pct >= 90).length} tone="amber" />
        <KpiCard icon={CalendarCheck} onClick={() => irParaAba("registros")} label="Macas com pendências" value={registros?.pendentes.length ?? 0} tone="amber" />
      </div>

      <Tabs value={aba} onValueChange={(v) => navigate({ search: { aba: v as Aba }, replace: true })} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto justify-start gap-1 p-1">
          <TabsTrigger value="incompletos">Incompletos por maca</TabsTrigger>
          <TabsTrigger value="ativos">Ativos por maca</TabsTrigger>
          <TabsTrigger value="registros">Registros por maca</TabsTrigger>
          <TabsTrigger value="mais-de-uma">Em mais de uma maca</TabsTrigger>
          <TabsTrigger value="trabalhadores">Trabalhadores</TabsTrigger>
          <TabsTrigger value="distancia">À distância</TabsTrigger>
          <TabsTrigger value="lotacao">Macas próximas do limite</TabsTrigger>
          <TabsTrigger value="alertas">Alertas sensíveis</TabsTrigger>
        </TabsList>

        <TabsContent value="registros" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2 text-sm">
            <span className="text-muted-foreground">Período analisado:</span>
            {([["30", "Últimos 30 dias"], ["60", "Últimos 60 dias"], ["90", "Últimos 90 dias"], ["tudo", "Todo o histórico"]] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setPeriodo(v)}
                className={`rounded-full border px-3 py-1 text-xs transition ${periodo === v ? "border-transparent bg-primary text-primary-foreground font-medium" : "bg-card hover:bg-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <SectionHeader
            title="Registros de atendimento por maca"
            desc="Datas de atendimento previstas até hoje, quais já foram registradas e o resumo de presenças e faltas."
            action={
              <ExportRelatorioButton
                filename="registros-por-maca"
                columns={colsRegistros}
                rows={registros?.linhas ?? []}
                disabled={!registros}
              />
            }
          />

          {!registros ? (
            <EmptyMsg text="Carregando registros..." />
          ) : (
            <>
              <div className="rounded-lg border bg-card overflow-x-auto">
                <div className="px-4 py-2 border-b bg-destructive/10 text-sm font-semibold text-destructive">
                  Macas sem nenhum registro até hoje ({registros.semRegistro.length})
                </div>
                {registros.semRegistro.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Todas as macas já registraram ao menos um atendimento.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Maca</TableHead>
                        <TableHead>Dia</TableHead>
                        <TableHead>Datas previstas até hoje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registros.semRegistro.map((l) => (
                        <TableRow key={l.maca.id}>
                          <TableCell className="font-medium text-foreground">{l.maca.nome}</TableCell>
                          <TableCell className="text-muted-foreground">{l.maca.dia}</TableCell>
                          <TableCell>{l.esperadas.length}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="rounded-lg border bg-card overflow-x-auto">
                <div className="px-4 py-2 border-b bg-muted text-sm font-semibold text-foreground">
                  Macas com registros ({registros.comRegistro.length})
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Maca</TableHead>
                      <TableHead>Registradas</TableHead>
                      <TableHead>Pendentes</TableHead>
                      <TableHead>Presenças</TableHead>
                      <TableHead>Faltas</TableHead>
                      <TableHead>Taxa</TableHead>
                      <TableHead>Último registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registros.comRegistro.map((l) => (
                      <TableRow key={l.maca.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-3 w-3 rounded-full" style={{ background: l.maca.cor_hex }} />
                            <span className="font-medium text-foreground">{l.maca.nome}</span>
                            <span className="text-xs text-muted-foreground">({l.maca.dia})</span>
                          </div>
                        </TableCell>
                        <TableCell>{l.registradas.length}/{l.esperadas.length}</TableCell>
                        <TableCell>
                          {l.faltantes.length === 0 ? (
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Em dia</Badge>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {l.faltantes.map((iso) => (
                                <Badge key={iso} variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                                  {fmtDia(iso)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-emerald-800 font-medium">{l.totalPresencas}</TableCell>
                        <TableCell className="text-destructive font-medium">{l.totalFaltas}</TableCell>
                        <TableCell>{l.taxa}%</TableCell>
                        <TableCell className="text-muted-foreground">{l.ultimaRegistrada ? fmtDia(l.ultimaRegistrada) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>


        <TabsContent value="incompletos" className="mt-4 space-y-4">
          <SectionHeader
            title="Cadastros incompletos por maca"
            desc="Consulentes ativos com dados essenciais faltando. Complete a ficha para melhorar a comunicação e o acompanhamento."
            action={<ExportRelatorioButton filename="cadastros-incompletos" columns={colsIncompletos} rows={rowsIncompletos} />}
          />

          {macasComIncompletos.length === 0 ? (
            <EmptyMsg text="Nenhum cadastro incompleto entre os consulentes ativos." />
          ) : (
            macasComIncompletos.map((m) => {
              const items = rel.incompletosPorMaca.get(m.id) ?? [];
              return (
                <div key={m.id} className="rounded-lg border bg-card overflow-x-auto">
                  <MacaHeader maca={m} count={items.length} />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Faltando</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(({ c, faltando }) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Link to="/consulentes/$id" params={{ id: c.id }} className="font-medium text-primary hover:underline">
                              {c.nome}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{c.telefone ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {faltando.map((f) => (
                                <Badge key={f} variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">{f}</Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="ativos" className="mt-4 space-y-4">
          <SectionHeader title="Consulentes ativos por maca" desc="Snapshot atual da distribuição em macas." action={<ExportRelatorioButton filename="ativos-por-maca" columns={colsAtivos} rows={rowsAtivos} />} />
          {rel.macas.map((m) => {
            const items = rel.ativosPorMaca.get(m.id) ?? [];
            if (items.length === 0) return null;
            return (
              <div key={m.id} className="rounded-lg border bg-card overflow-x-auto">
                <MacaHeader maca={m} count={items.length} />
                <ul className="divide-y">
                  {items.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((c) => (
                    <li key={c.id} className="px-4 py-2 flex items-center gap-2 flex-wrap">
                      <Link to="/consulentes/$id" params={{ id: c.id }} className="font-medium text-primary hover:underline">
                        {c.nome}
                      </Link>
                      {c.trabalhador && <Badge variant="outline" className="text-[10px] bg-sky-100 text-sky-800 border-sky-300">Trab</Badge>}
                      {c.tratamento_distancia && <Badge variant="outline" className="text-[10px] bg-accent/20 text-accent-foreground border-accent">Dist</Badge>}
                      {c.telefone && <span className="text-xs text-muted-foreground ml-auto">{c.telefone}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="mais-de-uma" className="mt-4 space-y-3">
          <SectionHeader title="Consulentes em mais de uma maca" desc="Participação em macas de dias diferentes." action={<ExportRelatorioButton filename="em-mais-de-uma-maca" columns={colsComMacas} rows={rel.emMaisDeUma} />} />
          {rel.emMaisDeUma.length === 0 ? (
            <EmptyMsg text="Nenhum consulente ativo em mais de uma maca." />
          ) : (
            <SimpleTable rows={rel.emMaisDeUma.map(({ c, macas }) => ({ c, extra: macas.map((m) => `${m.nome} (${m.dia})`).join(" · ") }))} extraLabel="Macas" />
          )}
        </TabsContent>

        <TabsContent value="trabalhadores" className="mt-4 space-y-3">
          <SectionHeader title="Trabalhadores em tratamento" desc="Consulentes marcados como trabalhadores da casa." action={<ExportRelatorioButton filename="trabalhadores" columns={colsComMacas} rows={rel.trabalhadores} />} />
          {rel.trabalhadores.length === 0 ? (
            <EmptyMsg text="Nenhum trabalhador em tratamento no momento." />
          ) : (
            <SimpleTable rows={rel.trabalhadores.map(({ c, macas }) => ({ c, extra: macas.map((m) => m.nome).join(" · ") }))} extraLabel="Maca" />
          )}
        </TabsContent>

        <TabsContent value="distancia" className="mt-4 space-y-3">
          <SectionHeader title="Tratamento à distância" desc="Consulentes ativos com atendimento à distância." action={<ExportRelatorioButton filename="tratamento-distancia" columns={colsComMacas} rows={rel.distancia} />} />
          {rel.distancia.length === 0 ? (
            <EmptyMsg text="Ninguém em tratamento à distância." />
          ) : (
            <SimpleTable rows={rel.distancia.map(({ c, macas }) => ({ c, extra: macas.map((m) => m.nome).join(" · ") }))} extraLabel="Maca" />
          )}
        </TabsContent>

        <TabsContent value="lotacao" className="mt-4 space-y-4">
          <SectionHeader
            title="Macas próximas do limite"
            desc="Ocupação atual de cada maca (designações ativas) frente à lotação máxima. Amarelo a partir de 90% e vermelho quando lotada."
            action={<ExportRelatorioButton filename="ocupacao-macas" columns={colsLotacao} rows={linhasLotacao} />}
          />
          <div className="rounded-lg border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Maca</TableHead>
                  <TableHead>Dia</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Ocupação</TableHead>
                  <TableHead>Vagas</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasLotacao.map((l) => (
                  <TableRow key={l.maca.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ background: l.maca.cor_hex }} />
                        <span className="font-medium text-foreground">{l.maca.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.maca.dia}</TableCell>
                    <TableCell className="text-muted-foreground">{l.maca.categoria}</TableCell>
                    <TableCell>{l.ocupacao} de {l.maca.lotacao_max}</TableCell>
                    <TableCell>{l.vagas}</TableCell>
                    <TableCell>
                      {l.vagas <= 0 ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/40">Lotada</Badge>
                      ) : l.pct >= 90 ? (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Próxima do limite</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Com vagas</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="alertas" className="mt-4 space-y-3">
          <SectionHeader title="Alertas sensíveis" desc="Ideias suicidas, ideação criminosa, uso de drogas ou álcool. Acesso restrito." action={<ExportRelatorioButton filename="alertas-sensiveis" columns={colsAlertas} rows={rel.alertas} sensivel auditLabel="Alertas sensíveis de consulentes" />} />
          {rel.alertas.length === 0 ? (
            <EmptyMsg text="Nenhum alerta registrado entre os consulentes ativos." />
          ) : (
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Maca</TableHead>
                    <TableHead>Alertas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rel.alertas.map(({ c, macas }) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link to="/consulentes/$id" params={{ id: c.id }} className="font-medium text-primary hover:underline">
                          {c.nome}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{macas.map((m) => m.nome).join(" · ") || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.ideias_suicidas && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/40"><AlertTriangle className="h-3 w-3 mr-1" />Ideias suicidas</Badge>}
                          {c.ideacao_criminosa && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/40">Ideação criminosa</Badge>}
                          {c.uso_drogas && <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Drogas</Badge>}
                          {c.uso_alcool && <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Álcool</Badge>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}

function KpiCard({ icon: Icon, label, value, tone, onClick }: { icon: typeof Users; label: string; value: number; tone: "amber" | "teal" | "blue" | "red"; onClick?: () => void }) {
  // Cartão de indicador do guia: ícone em quadrado de 44px, número grande e rótulo pequeno
  const styles: Record<string, string> = {
    amber: "bg-amber-100 text-amber-800",
    teal: "bg-primary/10 text-primary",
    blue: "bg-primary/10 text-primary",
    red: "bg-destructive/10 text-destructive",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={onClick ? `Ver detalhes: ${label}` : label}
      className={`rounded-xl border bg-card p-4 text-left shadow-sm transition ${onClick ? "cursor-pointer hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "cursor-default"}`}
    >
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${styles[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold text-foreground mt-2">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </button>
  );
}

function SectionHeader({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex-1">
        <h2 className="text-lg font-semibold font-['Playfair_Display'] text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {action}
    </div>
  );
}


function MacaHeader({ maca, count }: { maca: Maca; count: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ background: maca.cor_hex + "22" }}>
      <span className="inline-block h-3 w-3 rounded-full" style={{ background: maca.cor_hex }} />
      <span className="font-semibold text-sm text-foreground">{maca.nome}</span>
      <span className="text-xs text-muted-foreground">
        {maca.dia} · {maca.categoria}
      </span>
      <Badge variant="outline" className="ml-auto bg-card text-muted-foreground border-border">{count}</Badge>
    </div>
  );
}

function SimpleTable({ rows, extraLabel }: { rows: { c: Consulente; extra: string }[]; extraLabel: string }) {
  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>{extraLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.sort((a, b) => a.c.nome.localeCompare(b.c.nome, "pt-BR")).map(({ c, extra }) => (
            <TableRow key={c.id}>
              <TableCell>
                <Link to="/consulentes/$id" params={{ id: c.id }} className="font-medium text-primary hover:underline">
                  {c.nome}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{c.telefone ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{extra || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed bg-card py-8 text-center text-sm text-muted-foreground">{text}</div>;
}
