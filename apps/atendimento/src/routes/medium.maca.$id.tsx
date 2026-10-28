import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getAtendimentoDatesByDia, getUltimaAtendimentoDateByDia, isAtendimentoDateForDia, isDesignacaoArquivada, isDataEsperadaQuinzenal } from "@/lib/atendimento-dates";
import {
  ArrowLeft,
  Check,
  X,
  ShieldCheck,
  Radio,
  Plus,
  Save,
  CalendarIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getOrCreateSessaoForDate } from "@/lib/sessao";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MacaCategoriaTag } from "@/lib/maca-categoria";
import OutrasMacasPainel, { useOutrasMacas } from "@/components/OutrasMacasPainel";
import { CabecalhoPagina } from "@/compartilhado";
import { LinkRota } from "@/components/LinkRota";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/medium/maca/$id")({
  validateSearch: (search: Record<string, unknown>): { data?: string } => ({
    data: typeof search.data === "string" ? search.data : undefined,
  }),
  component: () => (
    <RequireAuth roles={["medium", "admin"]}>
      <MediumMacaPresenca />
    </RequireAuth>
  ),
});

type PresencaStatus = "presente" | "ausente" | "falta_justificada" | "atendimento_distancia";

function MediumMacaPresenca() {
  const { id } = Route.useParams();
  const { data: dataParam } = Route.useSearch();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [dataAtendimento, setDataAtendimento] = useState<Date | undefined>(() => {
    if (dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam)) {
      const [y, m, d] = dataParam.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return undefined;
  });
  const [calendarioAberto, setCalendarioAberto] = useState(false);
  const [filtro, setFiltro] = useState<"faltam" | "lancados" | "todos">("todos");

  const { data: maca } = useQuery({
    queryKey: ["maca", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("macas").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: outrasMacas = [] } = useOutrasMacas(id);

  // Seleciona automaticamente a data mais recente (última terça ou último sábado) conforme o dia da maca
  useEffect(() => {
    if (maca && !dataAtendimento) {
      setDataAtendimento(getUltimaAtendimentoDateByDia(maca.dia));
    }
  }, [maca, dataAtendimento]);


  const isoDate = dataAtendimento ? format(dataAtendimento, "yyyy-MM-dd") : "";

  const { data: sessao } = useQuery({
    queryKey: ["sessao-data", isoDate],
    enabled: !!dataAtendimento,
    queryFn: () => getOrCreateSessaoForDate(dataAtendimento!),
  });

  const { data: lista, refetch } = useQuery({
    queryKey: ["medium-maca-lista", id, sessao?.id, maca?.dia],
    enabled: !!sessao,
    queryFn: async () => {
      const { data: desigsRaw, error } = await supabase
        .from("designacoes")
        .select(
          "id, sessoes_realizadas, sessoes_totais, status, closure_reason, closed_at, consulente_id, dialogador_id, created_at, consulentes(id, nome, telefone, ideias_suicidas, dialogo_pendente, dialogador_id, frequencia)"
        )
        .eq("maca_id", id)
        .in("status", ["ativa", "cancelada"])
        .order("created_at");
      if (error) throw error;
      const desigs = (desigsRaw ?? []).filter(
        (d: any) =>
          (d.status === "ativa" || d.closure_reason !== "transferencia") &&
          !isDesignacaoArquivada(d.status, d.closed_at, maca?.dia)
      );
      const ids = desigs.map((d) => d.id);
      let presencas: Array<{ designacao_id: string; status: string; observacao: string | null; atendido_em_maca_id?: string | null }> = [];
      const totalPresencas = new Map<string, number>();
      const ultimoAtend = new Map<string, string>();
      const datasMap = new Map<string, Array<{ data: string; status: string }>>();
      if (ids.length && sessao) {
        const { data: p } = await supabase
          .from("presencas")
          .select("designacao_id, status, observacao, atendido_em_maca_id")
          .eq("sessao_id", sessao.id)
          .in("designacao_id", ids);
        presencas = (p ?? []) as unknown as typeof presencas;
        const { data: allP } = await supabase
          .from("presencas")
          .select("designacao_id, status, sessoes(data)")
          .in("designacao_id", ids);
        (allP ?? []).forEach((r) => {
          const dt = (r as { sessoes: { data: string } | null }).sessoes?.data;
          const compareceu = r.status === "presente" || r.status === "atendimento_distancia";
          if (compareceu) {
            totalPresencas.set(r.designacao_id, (totalPresencas.get(r.designacao_id) ?? 0) + 1);
          }
          if (dt) {
            const arr = datasMap.get(r.designacao_id) ?? [];
            arr.push({ data: dt, status: r.status });
            datasMap.set(r.designacao_id, arr);
            if (compareceu) {
              const prev = ultimoAtend.get(r.designacao_id);
              if (!prev || dt > prev) ultimoAtend.set(r.designacao_id, dt);
            }
          }
        });
        datasMap.forEach((arr) => arr.sort((a, b) => a.data.localeCompare(b.data)));
      }
      const dialogadorIds = Array.from(
        new Set(
          desigs
            .map((d) => {
              const cons = d.consulentes as { dialogador_id: string | null } | null;
              return cons?.dialogador_id ?? null;
            })
            .filter((x): x is string => !!x)
        )
      );
      const nomeMap = new Map<string, string>();
      if (dialogadorIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nome")
          .in("id", dialogadorIds);
        (profs ?? []).forEach((p) => nomeMap.set(p.id, p.nome));
      }
      const pMap = new Map(presencas.map((p) => [p.designacao_id, p]));
      const mapped = desigs.map((d) => {
        const cons = d.consulentes as (Record<string, unknown> & { dialogador_id: string | null }) | null;
        const did = cons?.dialogador_id ?? null;
        const datas = datasMap.get(d.id) ?? [];
        return {
          ...d,
          consulentes: cons
            ? { ...cons, dialogador: did && nomeMap.has(did) ? { nome: nomeMap.get(did)! } : null }
            : null,

          presenca: pMap.get(d.id)?.status ?? null,
          observacao: pMap.get(d.id)?.observacao ?? "",
          atendido_em_maca_id: pMap.get(d.id)?.atendido_em_maca_id ?? null,
          total_presencas: totalPresencas.get(d.id) ?? d.sessoes_realizadas,
          ultimo_atendimento: ultimoAtend.get(d.id) ?? null,
          datas,
          frequencia: ((cons?.frequencia as string | undefined) ?? "semanal") as "semanal" | "quinzenal",
          base_quinzenal: datas[0]?.data ?? String(d.created_at).slice(0, 10),
        };
      });
      // ativos primeiro, inativos por último
      mapped.sort((a, b) => {
        const aIn = a.status !== "ativa" ? 1 : 0;
        const bIn = b.status !== "ativa" ? 1 : 0;
        return aIn - bIn || a.created_at.localeCompare(b.created_at);
      });
      return mapped;
    },
  });

  useEffect(() => {
    if (!sessao) return;
    const ch = supabase
      .channel(`medium-presencas-${sessao.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "presencas", filter: `sessao_id=eq.${sessao.id}` },
        () => {
          refetch();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessao, refetch]);

  const { data: ultimoSalvamento } = useQuery({
    queryKey: ["maca-ultimo-salvamento", id, sessao?.id, lista?.length],
    enabled: !!sessao && !!lista?.length,
    queryFn: async () => {
      const ids = (lista ?? []).map((d: { id: string }) => d.id);
      if (ids.length === 0) return null;
      const { data } = await supabase
        .from("presencas")
        .select("created_at, updated_at, created_by, updated_by")
        .eq("sessao_id", sessao!.id)
        .in("designacao_id", ids);
      if (!data || data.length === 0) return null;
      const ultimo = data
        .map((r) => ({ quando: r.updated_at ?? r.created_at, quem: r.updated_by ?? r.created_by }))
        .sort((a, b) => (a.quando < b.quando ? 1 : -1))[0];
      let nome = "equipe";
      if (ultimo.quem) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("nome, como_chamar")
          .eq("id", ultimo.quem)
          .maybeSingle();
        nome = prof?.como_chamar || prof?.nome || nome;
      }
      return { quando: ultimo.quando as string, nome };
    },
  });

  const marcarTodosPresentes = async () => {
    if (!sessao || !lista) return;
    const pendentes = lista.filter(
      (d: { status?: string; presenca: string | null; frequencia?: string; base_quinzenal?: string }) =>
        d.status === "ativa" &&
        !d.presenca &&
        !(d.frequencia === "quinzenal" && !isDataEsperadaQuinzenal(isoDate, d.base_quinzenal, maca?.dia))
    );
    if (pendentes.length === 0) return toast.info("Todos os consulentes já têm registro nesta data.");
    if (!(await confirm({
      title: `Marcar ${pendentes.length} consulente${pendentes.length === 1 ? "" : "s"} como presente?`,
      description: "Serão marcados apenas os que ainda não têm registro nesta data. Você pode ajustar individualmente depois.",
      confirmLabel: "Marcar presentes",
    }))) return;
    const { error } = await supabase.from("presencas").upsert(
      pendentes.map((d: { id: string }) => ({ designacao_id: d.id, sessao_id: sessao.id, status: "presente" as const })),
      { onConflict: "designacao_id,sessao_id" }
    );
    if (error) return toast.error(error.message);
    toast.success("Presenças registradas");
    qc.invalidateQueries({ queryKey: ["medium-maca-lista"] });
    qc.invalidateQueries({ queryKey: ["maca-ultimo-salvamento"] });
  };

  const marcar = async (designacao_id: string, status: PresencaStatus) => {
    if (!sessao) return;
    const { error } = await supabase
      .from("presencas")
      .upsert(
        { designacao_id, sessao_id: sessao.id, status },
        { onConflict: "designacao_id,sessao_id" }
      );
    if (error) return toast.error(error.message);
    toast.success("Atendimento registrado");
    qc.invalidateQueries({ queryKey: ["medium-maca-lista"] });
    qc.invalidateQueries({ queryKey: ["maca-ultimo-salvamento"] });
  };

  const salvarObs = async (designacao_id: string, observacao: string) => {
    if (!sessao) return;
    const { data: existing } = await supabase
      .from("presencas")
      .select("id")
      .eq("designacao_id", designacao_id)
      .eq("sessao_id", sessao.id)
      .maybeSingle();
    if (!existing) {
      toast.error("Marque a presença antes de salvar a observação.");
      return;
    }
    const { error } = await supabase
      .from("presencas")
      .update({ observacao })
      .eq("id", existing.id);
    if (error) return toast.error(error.message);
    toast.success("Observação salva");
    qc.invalidateQueries({ queryKey: ["medium-maca-lista"] });
  };

  const prorrogar = async (designacao_id: string, atual: number, qtd: number) => {
    if (!qtd || qtd < 1) return toast.error("Informe um número válido de atendimentos.");
    const { error } = await supabase
      .from("designacoes")
      .update({ sessoes_totais: atual + qtd, status: "ativa", closed_at: null })
      .eq("id", designacao_id);
    if (error) return toast.error(error.message);
    toast.success(`Prorrogado por mais ${qtd} atendimento${qtd === 1 ? "" : "s"}`);
    qc.invalidateQueries({ queryKey: ["medium-maca-lista"] });
  };

  const encaminharDialogo = async (
    designacaoId: string,
    consulenteId: string,
    modo: "encaminhamento" | "alta"
  ) => {
    const titulo = modo === "alta" ? "Encaminhar para Alta?" : "Encaminhar ao diálogo?";
    const msg = modo === "alta"
      ? "O consulente ficará inativo e será encaminhado ao diálogo para orientações e encerramento do tratamento."
      : "O consulente ficará inativo até a realização de um novo diálogo fraterno.";
    if (!(await confirm({
      title: titulo,
      description: msg,
      tone: modo === "alta" ? "success" : "warning",
      confirmLabel: "Encaminhar",
    }))) return;

    const { error: e1 } = await supabase
      .from("consulentes")
      .update({ dialogo_pendente: true })
      .eq("id", consulenteId);
    if (e1) return toast.error(e1.message);

    const { error: e2 } = await supabase
      .from("designacoes")
      .update({
        status: modo === "alta" ? "concluida" : "cancelada",
        closed_at: new Date().toISOString(),
        closure_reason: modo === "alta" ? "alta" : "encaminhamento_dialogo",
      })
      .eq("id", designacaoId);
    if (e2) return toast.error(e2.message);

    // busca lotação atualizada desta maca
    const { data: ativosAtual } = await supabase
      .from("designacoes")
      .select("id, maca_id")
      .eq("maca_id", id)
      .eq("status", "ativa");
    const countAtual = ativosAtual?.length ?? 0;
    const { data: macaInfo } = await supabase.from("macas").select("lotacao_max, nome").eq("id", id).single();
    const ocupacao = `${countAtual}/${macaInfo?.lotacao_max ?? "?"}`;

    toast.success(
      modo === "alta" ? "Encaminhamento para Alta registrado" : "Encaminhamento ao diálogo registrado",
      { description: `Lotação atualizada: ${ocupacao} consulentes` }
    );
    qc.invalidateQueries({ queryKey: ["medium-maca-lista"] });
    refetch();
  };

  if (!maca)
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Carregando maca">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );

  // ---- Organização da lista do dia ----
  type Item = {
    d: NonNullable<typeof lista>[number];
    c: {
      id: string; nome: string; telefone: string; ideias_suicidas: boolean; dialogo_pendente: boolean;
      dialogador: { nome: string } | null;
    } | null;
    realizados: number; total: number; projetado: number; proximoFim: boolean;
    quinzenal: boolean; foraDaSemana: boolean; inativo: boolean;
  };
  const itens: Item[] = (lista ?? []).map((d) => {
    const c = d.consulentes as unknown as Item["c"];
    const realizados = d.total_presencas;
    const total = d.sessoes_totais;
    const projetado = realizados + (d.presenca === "presente" ? 0 : 1);
    const quinzenal = d.frequencia === "quinzenal";
    return {
      d, c, realizados, total, projetado, proximoFim: total - realizados <= 1, quinzenal,
      foraDaSemana: quinzenal && !d.presenca && !isDataEsperadaQuinzenal(isoDate, d.base_quinzenal, maca?.dia),
      inativo: d.status === "cancelada",
    };
  });
  const esperados = itens.filter((x) => !x.inativo && (!x.foraDaSemana || !!x.d.presenca));
  const semAtendimento = itens.filter((x) => !esperados.includes(x));
  const lancados = esperados.filter((x) => !!x.d.presenca);
  const pendentes = esperados.filter((x) => !x.d.presenca);
  const conta = (s: PresencaStatus) => lancados.filter((x) => x.d.presenca === s).length;
  const resumo: { s: PresencaStatus | "pendente"; n: number; rotulo: string; cor: string }[] = [
    { s: "presente", n: conta("presente"), rotulo: conta("presente") === 1 ? "presente" : "presentes", cor: "#157a4a" },
    { s: "ausente", n: conta("ausente"), rotulo: conta("ausente") === 1 ? "falta" : "faltas", cor: "#c0392b" },
    { s: "falta_justificada", n: conta("falta_justificada"), rotulo: conta("falta_justificada") === 1 ? "justificada" : "justificadas", cor: "#e2a92b" },
    { s: "atendimento_distancia", n: conta("atendimento_distancia"), rotulo: "à distância", cor: "#1d8fb3" },
    { s: "pendente", n: pendentes.length, rotulo: "faltam lançar", cor: "#dfe4ea" },
  ];
  const visiveis = filtro === "faltam" ? pendentes : filtro === "lancados" ? lancados : esperados;

  // Faixa de datas: as últimas datas da maca até a escolhida, mais a próxima
  const datasMaca = getAtendimentoDatesByDia(maca.dia);
  const isosMaca = datasMaca.map((x) => format(x, "yyyy-MM-dd"));
  const hojeIso = format(new Date(), "yyyy-MM-dd");
  let posData = isosMaca.indexOf(isoDate);
  if (posData < 0) posData = Math.max(0, isosMaca.filter((x) => x <= hojeIso).length - 1);
  const faixaDatas = datasMaca.slice(Math.max(0, posData - 4), Math.min(datasMaca.length, posData + 2));

  const irParaProximoPendente = () => {
    const alvo = pendentes[0];
    if (!alvo) return;
    if (filtro === "lancados") setFiltro("todos");
    setTimeout(() => document.getElementById(`cartao-${alvo.d.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const cartao = (x: Item) => (
    <ConsulenteCard
      key={x.d.id}
      d={x.d}
      c={x.c}
      realizados={x.realizados}
      total={x.total}
      projetado={x.projetado}
      proximoFim={x.proximoFim}
      quinzenal={x.quinzenal}
      foraDaSemana={x.foraDaSemana}
      dataSelecionada={isoDate}
      atendidoEm={(() => { const m = outrasMacas.find((o) => o.id === (x.d as { atendido_em_maca_id?: string | null }).atendido_em_maca_id); return m ? `Maca ${m.numero} · ${m.nome}` : null; })()}
      onMarcar={marcar}
      onSalvarObs={salvarObs}
      onProrrogar={(qtd) => prorrogar(x.d.id, x.total, qtd)}
      onEncaminharDialogo={(modo) => x.c && encaminharDialogo(x.d.id, x.c.id, modo)}
    />
  );

  return (
    <>
      <CabecalhoPagina
        voltar={{ href: "/medium", rotulo: "Voltar para minhas macas" }}
        Link={LinkRota}
        titulo={
          <span className="inline-flex items-center gap-3 flex-wrap">
            {/* A cor da maca é dado do usuário */}
            <span
              className="rounded-xl h-11 w-11 inline-flex items-center justify-center font-sans font-bold text-xl shrink-0"
              style={{ backgroundColor: maca.cor_hex, color: "#fff" }}
            >
              {maca.numero}
            </span>
            {maca.nome}
            <MacaCategoriaTag numero={maca.numero} categoria={maca.categoria} className="font-sans" />
          </span>
        }
        descricao={dataAtendimento
          ? format(dataAtendimento, "EEEE, d 'de' MMMM", { locale: ptBR }).replace(/^./, (l) => l.toUpperCase())
          : "Selecione a data do atendimento"}
      />

      <div className="space-y-4 pb-24 sm:pb-6">
        {/* Datas da maca: só o número, compactas */}
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-1" style={{ scrollbarWidth: "none" }} aria-label="Data do atendimento">
          {faixaDatas.map((dt) => {
            const iso = format(dt, "yyyy-MM-dd");
            const ativa = iso === isoDate;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setDataAtendimento(dt)}
                aria-pressed={ativa}
                className={cn(
                  "shrink-0 h-9 min-w-[58px] px-2.5 rounded-lg text-[13px] font-semibold tabular-nums transition-colors",
                  ativa ? "bg-[#003c7f] text-white" : "bg-card text-foreground shadow-[inset_0_0_0_1px_#e3e8ef] hover:bg-[#eef4fb]",
                  iso > hojeIso && !ativa && "text-muted-foreground"
                )}
              >
                {format(dt, "dd/MM")}
              </button>
            );
          })}
          <Popover open={calendarioAberto} onOpenChange={setCalendarioAberto}>
            <PopoverTrigger asChild>
              <button type="button" className="shrink-0 h-9 w-10 rounded-lg bg-card shadow-[inset_0_0_0_1px_#e3e8ef] inline-flex items-center justify-center hover:bg-[#eef4fb]" aria-label="Escolher outra data">
                <CalendarIcon className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dataAtendimento}
                onSelect={(dt) => { if (dt) { setDataAtendimento(dt); setCalendarioAberto(false); } }}
                initialFocus
                defaultMonth={dataAtendimento ?? getUltimaAtendimentoDateByDia(maca?.dia)}
                disabled={(date) => !isAtendimentoDateForDia(date, maca?.dia)}
                modifiers={{ atendimento: getAtendimentoDatesByDia(maca?.dia) }}
                modifiersClassNames={{ atendimento: "bg-primary/10 text-primary font-semibold" }}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {!dataAtendimento && (
          <div className="text-center text-muted-foreground py-8">Selecione a data do atendimento para ver os consulentes.</div>
        )}
        {dataAtendimento && lista?.length === 0 && (
          <div className="text-center text-muted-foreground py-8">Nenhum consulente ativo nesta maca.</div>
        )}

        {/* Resumo do dia */}
        {dataAtendimento && esperados.length > 0 && (
          <section className="rounded-2xl bg-card p-4 shadow-[inset_0_0_0_1px_#e3e8ef]" aria-label="Resumo do dia">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <strong className="text-[17px] tabular-nums">{lancados.length} de {esperados.length} lançados</strong>
              <span className="text-xs text-muted-foreground">
                {ultimoSalvamento
                  ? `Salvo às ${format(new Date(ultimoSalvamento.quando), "HH:mm", { locale: ptBR })} por ${ultimoSalvamento.nome}`
                  : "Nada lançado nesta data ainda"}
              </span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-[#eef1f5] gap-0.5 my-3" aria-hidden="true">
              {resumo.filter((r) => r.n > 0).map((r) => <i key={r.s} style={{ flex: r.n, background: r.cor }} />)}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground tabular-nums">
              {resumo.filter((r) => r.n > 0).map((r) => (
                <span key={r.s} className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] inline-block" style={{ background: r.cor }} />{r.n} {r.rotulo}</span>
              ))}
            </div>
            {pendentes.length > 0 && (
              <Button variant="outline" onClick={marcarTodosPresentes} className="mt-3 w-full h-11 gap-2 border-0 bg-[#e4f5ec] text-[#157a4a] hover:bg-[#d3eedf] hover:text-[#157a4a]">
                <Check className="h-4 w-4" /> Marcar {pendentes.length === 1 ? "o que falta" : `os ${pendentes.length} restantes`} como presente
              </Button>
            )}
          </section>
        )}

        {/* Filtro */}
        {dataAtendimento && esperados.length > 0 && (
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#e9edf3] p-1" role="tablist" aria-label="Filtrar consulentes">
            {([["faltam", "Faltam", pendentes.length], ["lancados", "Lançados", lancados.length], ["todos", "Todos", itens.length]] as const).map(([v, r, n]) => (
              <button key={v} type="button" role="tab" aria-selected={filtro === v} onClick={() => setFiltro(v)}
                className={cn("h-10 rounded-lg text-sm font-semibold tabular-nums", filtro === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                {r} {n}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {visiveis.map(cartao)}
          {filtro === "faltam" && pendentes.length === 0 && esperados.length > 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">Tudo lançado nesta data.</p>
          )}
        </div>

        {sessao && dataAtendimento && (
          <OutrasMacasPainel macaOrigem={id} sessaoId={sessao.id} isoDate={isoDate} dia={maca.dia} />
        )}

        {filtro === "todos" && semAtendimento.length > 0 && (
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-muted-foreground px-1 pt-2">Sem atendimento nesta data</p>
            {semAtendimento.map(cartao)}
          </div>
        )}
      </div>

      {/* Celular: quantos faltam e atalho para o próximo */}
      {dataAtendimento && esperados.length > 0 && (
        <div className="maca-barra-fixa sm:hidden fixed inset-x-0 bottom-0 z-40 bg-white shadow-[0_-6px_24px_rgba(15,31,61,.10)] px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <strong className="block text-[15px] tabular-nums">{pendentes.length === 0 ? "Tudo lançado" : `${pendentes.length} ${pendentes.length === 1 ? "falta" : "faltam"} lançar`}</strong>
            <span className="text-xs text-muted-foreground">{format(dataAtendimento, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
          </div>
          {pendentes.length > 0 && <Button className="h-11 px-4" onClick={irParaProximoPendente}>Próximo pendente</Button>}
        </div>
      )}
    </>
  );
}

function ConsulenteCard({
  d,
  c,
  realizados,
  total,
  projetado,
  proximoFim,
  quinzenal,
  foraDaSemana,
  dataSelecionada,
  atendidoEm,
  onMarcar,
  onSalvarObs,
  onProrrogar,
  onEncaminharDialogo,
}: {
  d: {
    id: string;
    presenca: string | null;
    observacao: string;
    status?: string;
    ultimo_atendimento?: string | null;
    datas?: Array<{ data: string; status: string }>;
  };
  c: {
    id: string;
    nome: string;
    telefone: string;
    ideias_suicidas: boolean;
    dialogo_pendente: boolean;
    dialogador: { nome: string } | null;
  } | null;
  realizados: number;
  total: number;
  projetado: number;
  proximoFim: boolean;
  quinzenal?: boolean;
  foraDaSemana?: boolean;
  dataSelecionada: string;
  atendidoEm?: string | null;
  onMarcar: (id: string, s: PresencaStatus) => unknown | Promise<unknown>;
  onSalvarObs: (id: string, obs: string) => unknown | Promise<unknown>;
  onProrrogar: (qtd: number) => unknown | Promise<unknown>;
  onEncaminharDialogo: (modo: "encaminhamento" | "alta") => unknown | Promise<unknown>;
}) {
  const [obs, setObs] = useState(d.observacao);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [confirmNoObsOpen, setConfirmNoObsOpen] = useState(false);
  const [extQtd, setExtQtd] = useState<string>("4");
  const [busy, setBusy] = useState(false);
  const [temRascunho, setTemRascunho] = useState(false);
  const draftKey = `obs-rascunho:${d.id}:${dataSelecionada}`;

  // Restaura rascunho não salvo (ou o texto já gravado no banco)
  useEffect(() => {
    let inicial = d.observacao;
    try {
      const salvo = localStorage.getItem(draftKey);
      if (salvo !== null && salvo !== d.observacao) {
        inicial = salvo;
        setTemRascunho(true);
      } else {
        setTemRascunho(false);
      }
    } catch {
      /* localStorage indisponível */
    }
    setObs(inicial);
  }, [d.observacao, draftKey]);

  // Rascunho automático enquanto digita
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (obs !== d.observacao) {
          localStorage.setItem(draftKey, obs);
          setTemRascunho(true);
        } else {
          localStorage.removeItem(draftKey);
          setTemRascunho(false);
        }
      } catch {
        /* localStorage indisponível */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [obs, d.observacao, draftKey]);

  const limparRascunho = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* localStorage indisponível */
    }
    setTemRascunho(false);
  };

  // (legado: variável removida em favor de inativoReal)
  const inativoReal = d.status === "cancelada";
  const encerrado = !inativoReal && (d.status !== "ativa" || realizados >= total);
  const statusLabel: Record<string, string> = {
    presente: "Presente",
    ausente: "Falta",
    falta_justificada: "Falta justificada",
    atendimento_distancia: "À distância",
  };
  const willCloseOnPresente =
    d.status === "ativa" && d.presenca !== "presente" && realizados + 1 >= total;

  async function finalizarPresenca() {
    setBusy(true);
    try {
      await onMarcar(d.id, "presente");
      if (obs && obs !== d.observacao) {
        await onSalvarObs(d.id, obs);
      }
      limparRascunho();
    } finally {
      setBusy(false);
    }
  }

  function handlePresenteClick() {
    if (d.presenca === "presente") return;
    if (willCloseOnPresente) {
      setConfirmCloseOpen(true);
      return;
    }
    if (!obs.trim()) {
      setConfirmNoObsOpen(true);
      return;
    }
    void finalizarPresenca();
  }

  async function encerrarEContinuar() {
    setConfirmCloseOpen(false);
    if (!obs.trim()) {
      setConfirmNoObsOpen(true);
      return;
    }
    await finalizarPresenca();
  }

  async function prorrogarEContinuar() {
    const n = parseInt(extQtd, 10);
    if (!Number.isFinite(n) || n < 1) {
      toast.error("Informe um número válido de atendimentos.");
      return;
    }
    setBusy(true);
    try {
      await onProrrogar(n);
    } finally {
      setBusy(false);
    }
    setConfirmCloseOpen(false);
    if (!obs.trim()) {
      setConfirmNoObsOpen(true);
      return;
    }
    await finalizarPresenca();
  }

  // Cores por situação do dia: o cartão inteiro toma a cor do que foi lançado
  const TOM: Record<string, { cartao: string; selo: string; botao: string; texto: string }> = {
    presente: { cartao: "bg-[#e9f7ef] shadow-[inset_0_0_0_2px_#9fd8b9]", selo: "bg-[#157a4a] text-white", botao: "bg-[#157a4a] text-white", texto: "text-[#157a4a]" },
    ausente: { cartao: "bg-[#fdeeec] shadow-[inset_0_0_0_2px_#f3b1aa]", selo: "bg-[#b42318] text-white", botao: "bg-[#b42318] text-white", texto: "text-[#b42318]" },
    falta_justificada: { cartao: "bg-[#fff5d9] shadow-[inset_0_0_0_2px_#f0cf7e]", selo: "bg-[#8a5a00] text-white", botao: "bg-[#c98a00] text-white", texto: "text-[#8a5a00]" },
    atendimento_distancia: { cartao: "bg-[#e6f4f9] shadow-[inset_0_0_0_2px_#9cd3e3]", selo: "bg-[#0b6c8c] text-white", botao: "bg-[#0b6c8c] text-white", texto: "text-[#0b6c8c]" },
  };
  const DIA_COR: Record<string, string> = {
    presente: "bg-[#dff3e7] text-[#157a4a]",
    ausente: "bg-[#fbe1de] text-[#b42318]",
    falta_justificada: "bg-[#fdeec4] text-[#8a5a00]",
    atendimento_distancia: "bg-[#d9eef6] text-[#0b6c8c]",
  };
  const tom = d.presenca ? TOM[d.presenca] : null;
  const datas = d.datas ?? [];
  const presencasHist = datas.filter((r) => r.status === "presente" || r.status === "atendimento_distancia").length;
  const faltasHist = datas.filter((r) => r.status === "ausente").length;
  const restantes = Math.max(0, total - realizados);
  const sessaoMostrada = d.presenca ? realizados : Math.min(projetado, total);
  const feitas = `${realizados} ${realizados === 1 ? "feita" : "feitas"}`;
  const fraseSessao = encerrado
    ? `Tratamento concluído · ${realizados} de ${total} sessões`
    : d.presenca === "presente" || d.presenca === "atendimento_distancia"
    ? `${realizados}ª sessão feita hoje · ${restantes} ${restantes === 1 ? "restante" : "restantes"}`
    : d.presenca
    ? `${feitas} · ${restantes} ${restantes === 1 ? "restante" : "restantes"}`
    : projetado >= total
    ? "Hoje é a última sessão do tratamento"
    : `Hoje seria a ${projetado}ª sessão · ${feitas}, ${restantes} ${restantes === 1 ? "restante" : "restantes"}`;
  const pontos = Math.min(total, 16);

  // Cartão compacto: inativo ou quinzenal que não vem nesta data
  if (inativoReal || foraDaSemana) {
    return (
      <Card id={`cartao-${d.id}`} className="scroll-mt-20 rounded-2xl border-0 bg-card px-4 py-3.5 shadow-[inset_0_0_0_1px_#e3e8ef]">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-sans font-semibold text-[15px] text-muted-foreground">{c?.nome}</div>
            <div className="text-[13px] text-muted-foreground tabular-nums">
              {inativoReal
                ? `Aguardando novo diálogo · último atendimento ${d.ultimo_atendimento ? format(new Date(d.ultimo_atendimento + "T00:00:00"), "dd/MM") : "sem registro"}`
                : `Quinzenal · não é esperado nesta data · sessão ${realizados} de ${total}`}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[#eef1f5] px-2.5 py-1 text-xs font-semibold text-muted-foreground">{inativoReal ? "Inativo" : "Não esperado"}</span>
        </div>
        {!inativoReal && (
          <Button size="sm" variant="outline" className="mt-2 h-9" onClick={() => onMarcar(d.id, "presente")} disabled={busy}>
            <Check className="h-4 w-4 mr-1" /> Veio mesmo assim: registrar presença
          </Button>
        )}
      </Card>
    );
  }

  const opcoes: { s: PresencaStatus; rotulo: string; Icone: typeof Check; base: string; largo?: boolean }[] = [
    { s: "presente", rotulo: "Presente", Icone: Check, base: "bg-white text-[#157a4a] shadow-[inset_0_0_0_1.5px_#9fd8b9]", largo: true },
    { s: "ausente", rotulo: "Falta", Icone: X, base: "bg-white text-[#b42318] shadow-[inset_0_0_0_1.5px_#f3b1aa]" },
    { s: "falta_justificada", rotulo: "Justificada", Icone: ShieldCheck, base: "bg-white text-[#8a5a00] shadow-[inset_0_0_0_1.5px_#f0cf7e]" },
    { s: "atendimento_distancia", rotulo: "À distância", Icone: Radio, base: "bg-white text-[#0b6c8c] shadow-[inset_0_0_0_1.5px_#9cd3e3]", largo: true },
  ];

  return (
    <Card
      id={`cartao-${d.id}`}
      className={cn(
        "scroll-mt-20 rounded-2xl border-0 p-4 space-y-3.5 transition-colors",
        tom ? tom.cartao : proximoFim && !encerrado ? "bg-card shadow-[inset_0_0_0_2px_#f0cf7e]" : "bg-card shadow-[inset_0_0_0_1px_#e3e8ef]"
      )}
    >
      {/* Nome e situação de hoje */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-sans text-[17px] font-bold leading-snug">{c?.nome}</h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {quinzenal ? "Quinzenal" : "Semanal"}
            {c?.dialogador?.nome && <> · Dialogador: {c.dialogador.nome}</>}
          </p>
        </div>
        {tom ? (
          <span className={cn("shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tom.selo)}>
            <Check className="h-3.5 w-3.5" />{statusLabel[d.presenca!]}
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#fff3d6] px-2.5 py-1 text-xs font-semibold text-[#8a5a00]">
            <i className="h-2 w-2 rounded-full border-2 border-current" />Falta lançar
          </span>
        )}
      </div>

      {atendidoEm && d.presenca && (
        <p className="rounded-xl bg-white/70 px-3 py-2 text-[13px] text-foreground/80">
          Atendido na <strong>{atendidoEm}</strong> nesta data, porque a maca foi redistribuída.
        </p>
      )}

      {/* Sessão do tratamento */}
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
        <div className="row-span-2 text-[28px] font-bold leading-none tracking-tight tabular-nums">
          {sessaoMostrada}<span className="text-sm font-semibold text-muted-foreground tracking-normal"> /{total}</span>
        </div>
        <div className="text-[13px] text-muted-foreground tabular-nums leading-snug">{fraseSessao}</div>
        {total <= 16 ? (
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: pontos }, (_, i) => {
              const n = i + 1;
              const feito = n <= realizados;
              const hoje = !encerrado && !d.presenca && n === projetado;
              const hojeFeito = (d.presenca === "presente" || d.presenca === "atendimento_distancia") && n === realizados;
              return (
                <i key={n} className={cn("h-2 flex-1 rounded-full",
                  hojeFeito ? (d.presenca === "presente" ? "bg-[#157a4a]" : "bg-[#0b6c8c]") : feito ? "bg-[#0059b1]" : hoje ? "bg-white shadow-[inset_0_0_0_2px_#0059b1]" : "bg-black/10")} />
              );
            })}
          </div>
        ) : (
          <div className="h-2 rounded-full bg-black/10 overflow-hidden" aria-hidden="true">
            <i className="block h-full bg-[#0059b1]" style={{ width: `${Math.min(100, (realizados / total) * 100)}%` }} />
          </div>
        )}
      </div>

      {/* Datas dos atendimentos: pequenas, só o número */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5 tabular-nums">
          <span>Datas</span>
          <span>{presencasHist} {presencasHist === 1 ? "presença" : "presenças"}{faltasHist ? ` · ${faltasHist} ${faltasHist === 1 ? "falta" : "faltas"}` : ""}</span>
        </div>
        {datas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Primeiro atendimento.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {datas.map((r) => (
              <span key={r.data + r.status} title={statusLabel[r.status] ?? r.status}
                className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", DIA_COR[r.status] ?? "bg-muted text-muted-foreground",
                  r.data === dataSelecionada && "ring-2 ring-[#0059b1] ring-offset-1")}>
                {format(new Date(r.data + "T00:00:00"), "dd/MM")}
              </span>
            ))}
          </div>
        )}
      </div>

      {proximoFim && !encerrado && !d.presenca && projetado >= total && (
        <p className="rounded-xl bg-[#fff5d9] px-3 py-2.5 text-[13px] text-[#5c3b00]">
          <strong>Última sessão.</strong> Ao marcar presença, você escolhe entre dar alta ou prorrogar o tratamento.
        </p>
      )}

      {/* Presença: todos os botões à vista */}
      <div className="grid grid-cols-2 gap-2">
        {opcoes.map(({ s, rotulo, Icone, base, largo }) => {
          const ativo = d.presenca === s;
          return (
            <button
              key={s}
              type="button"
              disabled={busy}
              aria-pressed={ativo}
              onClick={() => (s === "presente" ? handlePresenteClick() : onMarcar(d.id, s))}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-[.98] disabled:opacity-60",
                largo ? "col-span-2" : "",
                s === "presente" ? "h-14 text-base" : "h-12 text-[15px]",
                ativo ? TOM[s].botao : base,
                d.presenca && !ativo && "opacity-70"
              )}
            >
              {ativo ? <Check className="h-5 w-5" /> : <Icone className="h-5 w-5" />}
              {rotulo}{ativo && largo ? " · lançado" : ""}
            </button>
          );
        })}
      </div>

      {/* Observação do dia */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label htmlFor={`obs-${d.id}`} className="text-[13px] font-semibold text-muted-foreground">Observação de hoje</label>
          {temRascunho ? (
            <span className="text-xs font-semibold text-[#8a5a00]">Rascunho, ainda não salvo</span>
          ) : d.observacao ? (
            <span className="text-xs font-semibold text-[#157a4a]">Salva</span>
          ) : null}
        </div>
        <Textarea
          id={`obs-${d.id}`}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Como foi o atendimento?"
          rows={2}
          className="bg-white/80 border-0 shadow-[inset_0_0_0_1px_#e3e8ef] text-[15px]"
        />
        {obs !== d.observacao && (
          <Button size="sm" className="mt-2 h-9" onClick={async () => { await onSalvarObs(d.id, obs); limparRascunho(); }}>
            <Save className="h-4 w-4 mr-1" /> Salvar observação
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        {c ? (
          <Link to="/consulentes/$id" params={{ id: c.id }} className="text-sm font-semibold text-primary hover:underline">
            Ver ficha e motivos
          </Link>
        ) : <span />}
        <div className="flex items-center gap-2">
          <ProrrogarPopover onConfirm={onProrrogar} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1 h-9" disabled={busy}>
                <MoreHorizontal className="h-4 w-4" /> Mais
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!c} onClick={() => onEncaminharDialogo("encaminhamento")}>Encaminhar ao diálogo</DropdownMenuItem>
              <DropdownMenuItem disabled={!c} onClick={() => onEncaminharDialogo("alta")}>Encaminhar para alta</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar alta ao consulente?</DialogTitle>
            <DialogDescription>
              Esta é a última sessão prevista ({total}/{total}). O consulente
              receberá alta ou o tratamento será prorrogado por mais alguns atendimentos?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`ext-${d.id}`} className="text-xs text-muted-foreground">
              Quantos atendimentos adicionar (caso prorrogue)?
            </Label>
            <Input
              id={`ext-${d.id}`}
              type="number"
              min={1}
              value={extQtd}
              onChange={(e) => setExtQtd(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmCloseOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={prorrogarEContinuar} disabled={busy}>
              <Plus className="h-4 w-4 mr-1" /> Prorrogar tratamento
            </Button>
            <Button onClick={encerrarEContinuar} disabled={busy}>
              <Check className="h-4 w-4 mr-1" /> Dar alta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmNoObsOpen} onOpenChange={setConfirmNoObsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar sem observação?</AlertDialogTitle>
            <AlertDialogDescription>
              Você não preencheu nenhuma observação para este atendimento.
              Deseja realmente contabilizar a presença sem registrar nada?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Voltar e anotar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={async (e) => {
                e.preventDefault();
                setConfirmNoObsOpen(false);
                await finalizarPresenca();
              }}
            >
              Registrar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ProrrogarPopover({ onConfirm }: { onConfirm: (qtd: number) => void }) {
  const [open, setOpen] = useState(false);
  const [qtd, setQtd] = useState<string>("4");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Prorrogar atendimentos
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2" align="start">
        <label className="text-xs text-muted-foreground">
          Quantos atendimentos adicionar?
        </label>
        <Input
          type="number"
          min={1}
          value={qtd}
          onChange={(e) => setQtd(e.target.value)}
        />
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            const n = parseInt(qtd, 10);
            if (!Number.isFinite(n) || n < 1) return;
            onConfirm(n);
            setOpen(false);
          }}
        >
          Confirmar
        </Button>
      </PopoverContent>
    </Popover>
  );
}
