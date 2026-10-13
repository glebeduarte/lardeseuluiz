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

  const { data: maca } = useQuery({
    queryKey: ["maca", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("macas").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

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
      let presencas: Array<{ designacao_id: string; status: string; observacao: string | null }> = [];
      const totalPresencas = new Map<string, number>();
      const ultimoAtend = new Map<string, string>();
      const datasMap = new Map<string, Array<{ data: string; status: string }>>();
      if (ids.length && sessao) {
        const { data: p } = await supabase
          .from("presencas")
          .select("designacao_id, status, observacao")
          .eq("sessao_id", sessao.id)
          .in("designacao_id", ids);
        presencas = p ?? [];
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

  return (
    <>
      <CabecalhoPagina
        voltar={{ href: "/medium", rotulo: "Voltar para minhas macas" }}
        Link={LinkRota}
        titulo={
          <span className="inline-flex items-center gap-3 flex-wrap">
            {/* A cor da maca é dado do usuário */}
            <span
              className="rounded-lg h-11 w-11 inline-flex items-center justify-center font-sans font-bold text-xl shrink-0"
              style={{ backgroundColor: maca.cor_hex, color: "#fff" }}
            >
              {maca.numero}
            </span>
            {maca.nome}
            <MacaCategoriaTag numero={maca.numero} categoria={maca.categoria} className="font-sans" />
          </span>
        }
        descricao={<>
              Lançar sessão
              {dataAtendimento
                ? ` — ${format(dataAtendimento, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}`
                : " — selecione a data"}
        </>}
        acoes={
          <Popover open={calendarioAberto} onOpenChange={setCalendarioAberto}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {dataAtendimento
                  ? format(dataAtendimento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dataAtendimento}
                onSelect={(d) => d && setDataAtendimento(d)}
                initialFocus
                defaultMonth={dataAtendimento ?? getUltimaAtendimentoDateByDia(maca?.dia)}
                disabled={(date) => !isAtendimentoDateForDia(date, maca?.dia)}
                modifiers={{ atendimento: getAtendimentoDatesByDia(maca?.dia) }}
                modifiersClassNames={{ atendimento: "bg-primary/10 text-primary font-semibold" }}
                className={cn("p-3 pointer-events-auto")}
              />
              <div className="flex items-center justify-between gap-2 border-t p-3">
                <span className="text-xs text-muted-foreground">
                  {dataAtendimento
                    ? format(dataAtendimento, "dd/MM/yyyy", { locale: ptBR })
                    : "Nenhuma data selecionada"}
                </span>
                <Button
                  size="sm"
                  disabled={!dataAtendimento}
                  onClick={() => setCalendarioAberto(false)}
                >
                  OK
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        }
      />
      <div className="space-y-6">

      {dataAtendimento && !!lista?.length && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {ultimoSalvamento
              ? `Último salvamento por ${ultimoSalvamento.nome} às ${format(new Date(ultimoSalvamento.quando), "HH:mm 'de' dd/MM", { locale: ptBR })}`
              : "Nenhum registro salvo nesta data ainda"}
          </span>
          <Button size="sm" variant="outline" onClick={marcarTodosPresentes} className="gap-2">
            <Check className="h-4 w-4" /> Marcar todos como presente
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {!dataAtendimento && (
          <div className="text-center text-muted-foreground py-8">
            Selecione a data do atendimento para visualizar os consulentes.
          </div>
        )}
        {dataAtendimento && lista?.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Nenhum consulente ativo nesta maca.
          </div>
        )}
        {lista?.map((d) => {
          const c = d.consulentes as unknown as {
            id: string;
            nome: string;
            telefone: string;
            ideias_suicidas: boolean;
            dialogo_pendente: boolean;
            dialogador: { nome: string } | null;
          } | null;
          const realizados = d.total_presencas;
          const total = d.sessoes_totais;
          const projetado = realizados + (d.presenca === "presente" ? 0 : 1);
          const restantes = total - realizados;
          const proximoFim = restantes <= 1;
          const quinzenal = d.frequencia === "quinzenal";
          const foraDaSemana =
            quinzenal && !d.presenca && !isDataEsperadaQuinzenal(isoDate, d.base_quinzenal, maca?.dia);
          return (
            <ConsulenteCard
              key={d.id}
              d={d}
              c={c}
              realizados={realizados}
              total={total}
              projetado={projetado}
              proximoFim={proximoFim}
              quinzenal={quinzenal}
              foraDaSemana={foraDaSemana}
              dataSelecionada={isoDate}
              onMarcar={marcar}
              onSalvarObs={salvarObs}
              onProrrogar={(qtd) => prorrogar(d.id, total, qtd)}
              onEncaminharDialogo={(modo) => c && encaminharDialogo(d.id, c.id, modo)}
            />
          );
        })}
      </div>
      </div>
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
  const cardBorder = inativoReal
    ? "border-muted-foreground/30"
    : encerrado
    ? "border-sky-300"
    : proximoFim
    ? "border-amber-300"
    : "";
  const cardBg = inativoReal
    ? "bg-muted/40"
    : encerrado
    ? "bg-sky-50"
    : proximoFim
    ? "bg-amber-50"
    : "";

  const registradoHoje = !!d.presenca;
  const statusLabel: Record<string, string> = {
    presente: "Presente",
    ausente: "Falta",
    falta_justificada: "Falta justificada",
    atendimento_distancia: "À distância",
  };
  const chipClass = (status: string, ativo: boolean) =>
    cn(
      "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
      status === "presente" && "border-emerald-300 bg-emerald-100 text-emerald-800",
      status === "atendimento_distancia" && "border-sky-300 bg-sky-100 text-sky-800",
      status === "ausente" && "border-destructive/40 bg-destructive/10 text-destructive",
      status === "falta_justificada" && "border-amber-300 bg-amber-100 text-amber-800",
      ativo && "ring-2 ring-offset-1 ring-primary"
    );

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

  return (
    <Card
      className={cn(
        "p-4 space-y-3 transition-colors",
        cardBorder,
        cardBg,
        registradoHoje && !inativoReal && "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-300/60"
      )}
    >
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex-1 min-w-[200px]">
          <div className="font-medium flex items-center gap-2 flex-wrap">
            {inativoReal && <span className="text-muted-foreground">[inativo]</span>}
            {c?.nome}
            {inativoReal && (
              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                Inativo
              </Badge>
            )}
            {inativoReal && (
              <span className="text-xs text-muted-foreground">
                Último atendimento:{" "}
                {d.ultimo_atendimento
                  ? format(new Date(d.ultimo_atendimento + "T00:00:00"), "dd/MM/yyyy")
                  : "sem registro"}
              </span>
            )}
            {!inativoReal && encerrado && (
              <Badge
                variant="outline"
                className="text-xs bg-sky-100 text-sky-800 border-sky-300"
              >
                Encerrado
              </Badge>
            )}
            {!inativoReal && !encerrado && proximoFim && (
              <Badge
                variant="outline"
                className="text-xs bg-amber-100 text-amber-800 border-amber-300"
              >
                Próximo do término
              </Badge>
            )}
            {quinzenal && (
              <Badge variant="outline" className="text-xs bg-sky-100 text-sky-800 border-sky-300">
                Quinzenal
              </Badge>
            )}
            {!inativoReal && foraDaSemana && (
              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                Sem atendimento nesta data
              </Badge>
            )}
            {!inativoReal && registradoHoje && (
              <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-800 border-emerald-300">
                {statusLabel[d.presenca!] ?? "Registrado"} nesta data
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <span>
              {projetado}ª de {total} sessões do ciclo
            </span>
            <span>·</span>
            <span>
              {realizados} presença{realizados === 1 ? "" : "s"} registrada
              {realizados === 1 ? "" : "s"}
            </span>
            {c?.dialogador?.nome && (
              <>
                <span>·</span>
                <span>Dialogador: <span className="font-medium text-foreground">{c.dialogador.nome}</span></span>
              </>
            )}
            {c && (
              <>
                <span>·</span>
                <Link
                  to="/consulentes/$id"
                  params={{ id: c.id }}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Ver motivos e observações registradas
                </Link>
              </>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="shrink-0 text-xs text-muted-foreground">Datas:</span>
            {(d.datas ?? []).length === 0 && (
              <span className="text-xs text-muted-foreground italic">nenhum registro ainda</span>
            )}
            {(d.datas ?? []).map((r) => (
              <span
                key={r.data + r.status}
                className={chipClass(r.status, r.data === dataSelecionada)}
                title={statusLabel[r.status] ?? r.status}
              >
                {format(new Date(r.data + "T00:00:00"), "dd/MM")}
              </span>
            ))}
          </div>
        </div>
        {inativoReal && (
          <p className="max-w-xs text-xs text-muted-foreground">
            Consulente inativo: o registro de presença fica bloqueado até que um novo diálogo fraterno
            seja realizado e ele volte a ser designado para esta maca.
          </p>
        )}
        {!inativoReal && foraDaSemana && (
          <p className="max-w-xs text-xs text-muted-foreground">
            Atendimento quinzenal: nesta data ele não é esperado, por isso não há registro de falta.
            Se ele comparecer, use "Registrar mesmo assim".
          </p>
        )}
        {!inativoReal && foraDaSemana && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onMarcar(d.id, "presente")}
            disabled={busy}
          >
            <Check className="h-4 w-4 mr-1" /> Registrar mesmo assim
          </Button>
        )}
        {!inativoReal && !foraDaSemana && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            className={
              d.presenca === "presente"
                ? ""
                : "text-primary hover:text-primary"
            }
            variant={d.presenca === "presente" ? undefined : "outline"}
            onClick={handlePresenteClick}
            disabled={busy}
          >
            <Check className="h-4 w-4 mr-1" /> Presente
          </Button>
          <Button
            size="sm"
            className={
              d.presenca === "ausente"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "text-destructive hover:text-destructive"
            }
            variant={d.presenca === "ausente" ? undefined : "outline"}
            onClick={() => onMarcar(d.id, "ausente")}
          >
            <X className="h-4 w-4 mr-1" /> Falta
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1" disabled={busy}>
                <MoreHorizontal className="h-4 w-4" /> Mais ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onMarcar(d.id, "falta_justificada")}>
                <ShieldCheck className="h-4 w-4 mr-2" /> Falta justificada
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMarcar(d.id, "atendimento_distancia")}>
                <Radio className="h-4 w-4 mr-2" /> Atendimento à distância
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!c} onClick={() => onEncaminharDialogo("encaminhamento")}>
                Encaminhar ao diálogo
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!c} onClick={() => onEncaminharDialogo("alta")}>
                Encaminhar para alta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        )}
      </div>

      {!inativoReal && (
      <div>
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-muted-foreground">
            Observações deste atendimento
          </label>
          {temRascunho && (
            <span className="text-[11px] font-medium text-amber-800">
              Rascunho salvo — ainda não gravado
            </span>
          )}
        </div>
        <Textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Anote observações deste atendimento..."
          rows={2}
          className="mt-1"
        />
        <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
          <ProrrogarPopover onConfirm={onProrrogar} />
          <Button
            size="sm"
            onClick={async () => {
              await onSalvarObs(d.id, obs);
              limparRascunho();
            }}
            disabled={obs === d.observacao}
          >
            <Save className="h-4 w-4 mr-1" /> Salvar observação
          </Button>
        </div>
      </div>
      )}

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
