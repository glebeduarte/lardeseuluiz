import { Skeleton } from "@/components/ui/skeleton";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Check, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { CabecalhoPagina } from "@/compartilhado";
import { LinkRota } from "@/components/LinkRota";
import { ConsulenteObservacoes } from "@/components/ConsulenteObservacoes";
import { useConfirm } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/consulentes/$id")({
  component: () => (
    <RequireAuth roles={["dialogador", "admin", "medium"]}>
      <Ficha />
    </RequireAuth>
  ),
});

// ---------------------------------------------------------------------------------------------
// Ficha do consulente. Mostra em que etapa ele está (Diálogo, Maca, Tratamento, Alta), os botões
// do próximo passo para quem pode dar esse passo, tudo o que ele já participou e a ficha do diálogo.
// Os botões chamam atendimento.ficha_acao(), que confere o papel de quem clicou.
// ---------------------------------------------------------------------------------------------

type Maca = { numero: number; nome: string; cor_hex: string; dia: string } | null;

type DesignacaoHist = {
  id: string;
  status: string;
  sessoes_realizadas: number;
  sessoes_totais: number;
  created_at: string;
  closed_at: string | null;
  closure_reason: string | null;
  reactivated_at?: string | null;
  reactivated_by?: string | null;
  maca_id: string;
  dialogador: { nome: string } | null;
  macas: Maca;
};

type ObservacaoHist = { id: string; conteudo: string; created_at: string; autor_nome: string | null };

type PresencaHist = {
  id: string;
  status: string;
  observacao: string | null;
  created_at: string;
  designacao_id: string;
  sessoes: { data: string } | null;
  marcador: { nome: string } | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConsulenteFull = any;

type Acao = "dar_alta" | "reabrir" | "dialogo_feito" | "voltar_maca" | "encerrar_sem_alta" | "encaminhar_dialogo" | "encaminhar_alta" | "prorrogar";

async function nomes(ids: (string | null | undefined)[]) {
  const unicos = Array.from(new Set(ids.filter((x): x is string => !!x)));
  const mapa = new Map<string, string>();
  if (unicos.length) {
    const { data } = await supabase.from("profiles").select("id, nome").in("id", unicos);
    (data ?? []).forEach((p) => mapa.set(p.id, p.nome));
  }
  return mapa;
}

const dataBR = (d?: string | null) => (d ? new Date(d.length <= 10 ? `${d}T12:00:00` : d).toLocaleDateString("pt-BR") : "");
const diaLabel = (d?: string) => (d === "sabado" ? "Sábado" : d === "terca" ? "Terça" : "");

/** Como terminou cada passagem por uma maca. */
function resultado(d: DesignacaoHist) {
  if (d.status === "ativa") return { texto: "Em tratamento", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  switch (d.closure_reason) {
    case "alta": return { texto: "Alta", cls: "bg-sky-100 text-sky-800 border-sky-300" };
    case "encaminhamento_dialogo": return { texto: "Encaminhado ao diálogo", cls: "bg-amber-100 text-amber-800 border-amber-300" };
    case "falta": return { texto: "Saiu por faltas", cls: "bg-destructive/10 text-destructive border-destructive/30" };
    case "troca_maca": return { texto: "Trocou de maca", cls: "bg-muted text-muted-foreground border-border" };
    case "transferencia": return { texto: "Transferido", cls: "bg-muted text-muted-foreground border-border" };
    case "encerrado_sem_alta": return { texto: "Encerrado sem alta", cls: "bg-muted text-muted-foreground border-border" };
  }
  return d.status === "concluida"
    ? { texto: "Completou o ciclo", cls: "bg-sky-100 text-sky-800 border-sky-300" }
    : { texto: "Encerrado", cls: "bg-muted text-muted-foreground border-border" };
}

function Ficha() {
  const { id } = Route.useParams();
  const { isAdmin, isDialogador, isMedium } = useAuth();
  const mediumOnly = isMedium && !isDialogador && !isAdmin;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [enviando, setEnviando] = useState<Acao | null>(null);

  const { data: c } = useQuery({
    queryKey: ["consulente-full", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consulentes")
        .select("*, designacoes(id, status, sessoes_realizadas, sessoes_totais, created_at, closed_at, closure_reason, reactivated_at, reactivated_by, maca_id, dialogador_id, macas(numero, nome, cor_hex, dia))")
        .eq("id", id)
        .order("created_at", { foreignTable: "designacoes", ascending: false })
        .single();
      if (error) throw error;
      const cons = data as ConsulenteFull;
      const mapa = await nomes([
        cons.dialogador_id,
        cons.alta_by,
        ...((cons.designacoes ?? []) as Array<{ dialogador_id: string | null }>).map((d) => d.dialogador_id),
      ]);
      cons.dialogador = cons.dialogador_id && mapa.has(cons.dialogador_id) ? { nome: mapa.get(cons.dialogador_id)! } : null;
      cons.alta_por = cons.alta_by ? mapa.get(cons.alta_by) ?? null : null;
      cons.designacoes = (cons.designacoes ?? []).map((d: { dialogador_id: string | null }) => ({
        ...d,
        dialogador: d.dialogador_id && mapa.has(d.dialogador_id) ? { nome: mapa.get(d.dialogador_id)! } : null,
      }));
      return cons;
    },
  });

  const designIds = ((c?.designacoes ?? []) as Array<{ id: string }>).map((d) => d.id);
  const { data: historico } = useQuery({
    queryKey: ["consulente-historico", id, designIds.join(",")],
    enabled: designIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presencas")
        .select("id, status, observacao, created_at, designacao_id, sessoes(data), created_by")
        .in("designacao_id", designIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const mapa = await nomes((data ?? []).map((p) => p.created_by));
      return (data ?? []).map((p) => ({
        ...p,
        marcador: p.created_by && mapa.has(p.created_by) ? { nome: mapa.get(p.created_by)! } : null,
      })) as unknown as PresencaHist[];
    },
  });

  const { data: observacoesHist } = useQuery({
    queryKey: ["consulente-observacoes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consulente_observacoes")
        .select("id, conteudo, created_at, autor_id")
        .eq("consulente_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const mapa = await nomes((data ?? []).map((o) => o.autor_id));
      return (data ?? []).map((o) => ({
        id: o.id, conteudo: o.conteudo, created_at: o.created_at,
        autor_nome: o.autor_id ? mapa.get(o.autor_id) ?? null : null,
      })) as ObservacaoHist[];
    },
  });

  if (!c)
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Carregando ficha do consulente">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );

  const designacoes = (c.designacoes ?? []) as DesignacaoHist[];
  const presencas = historico ?? [];
  const ativa = designacoes.find((d) => d.status === "ativa");
  const ultima = [...designacoes]
    .filter((d) => d.status !== "ativa")
    .sort((a, b) => +new Date(b.closed_at || b.created_at) - +new Date(a.closed_at || a.created_at))[0];
  const dialogadorNome: string | null = c.dialogador?.nome ?? null;

  // Etapa em que o consulente está
  const etapa: "dialogo" | "maca" | "tratamento" | "alta" = c.alta_at
    ? "alta"
    : ativa
    ? "tratamento"
    : c.dialogo_pendente
    ? "dialogo"
    : "maca";

  const atualizar = () => {
    qc.invalidateQueries({ queryKey: ["consulente-full", id] });
    qc.invalidateQueries({ queryKey: ["consulente-historico"] });
    qc.invalidateQueries({ queryKey: ["consulentes"] });
  };

  const executar = async (
    acao: Acao,
    pergunta: { title: string; description: string; confirmLabel: string; tone?: "success" | "warning" | "info" | "danger" } | null,
    qtd?: number,
  ) => {
    if (pergunta && !(await confirm({ tone: "info", ...pergunta }))) return false;
    setEnviando(acao);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("ficha_acao", { p_consulente: id, p_acao: acao, p_qtd: qtd ?? null });
    setEnviando(null);
    if (error) { toast.error(String(error.message).replace(/^.*?ERROR:\s*/, "")); return false; }
    toast.success((data as { mensagem?: string })?.mensagem ?? "Pronto.");
    atualizar();
    if (mediumOnly && (acao === "encaminhar_dialogo" || acao === "encaminhar_alta")) navigate({ to: "/medium" });
    return true;
  };

  const irDesignar = () => navigate({ to: "/dialogo/$consulenteId/designar", params: { consulenteId: id } });
  const irEditar = () => navigate({ to: "/consulentes/$id/editar", params: { id } });

  const darAlta = () => executar("dar_alta", {
    title: "Dar alta ao consulente?",
    description: ativa
      ? "O tratamento na maca termina agora e o consulente passa para Alta. A ficha e o histórico continuam guardados."
      : "O consulente passa para Alta. A ficha e o histórico continuam guardados.",
    confirmLabel: "Dar alta",
    tone: "success",
  });

  // --- Próximo passo: título, explicação e botões de quem pode agir ---
  const passo = (() => {
    const botoes: ReactNode[] = [];
    let titulo = "";
    let texto: ReactNode = null;
    let aviso = false;

    if (etapa === "alta") {
      titulo = "Tratamento concluído com alta";
      texto = <>Alta em {dataBR(c.alta_at)}{c.alta_por ? <> por {c.alta_por}</> : null}.</>;
      if (isDialogador) botoes.push(
        <Button key="reabrir" variant="outline" disabled={!!enviando} onClick={() => executar("reabrir", {
          title: "Reabrir o atendimento?",
          description: "Use quando o consulente voltar e precisar de um novo tratamento. Depois de reabrir, escolha a maca.",
          confirmLabel: "Reabrir",
        })}>Reabrir atendimento</Button>,
      );
    }

    if (etapa === "dialogo") {
      titulo = "Aguardando o diálogo fraterno";
      aviso = true;
      const motivo = ultima?.closure_reason;
      texto = !ultima
        ? "O consulente foi cadastrado sem diálogo fraterno."
        : motivo === "alta"
        ? "O médium encaminhou para alta. Converse com o consulente e dê a alta, ou continue o tratamento."
        : motivo === "encaminhamento_dialogo"
        ? "O médium pediu um novo diálogo fraterno."
        : motivo === "falta"
        ? "Saiu da maca por faltas. Converse antes de ele voltar."
        : ultima.status === "concluida"
        ? `Completou as ${ultima.sessoes_totais || 8} sessões do ciclo. Converse e decida: alta, voltar para a maca ou outra maca.`
        : "Converse com o consulente e decida o próximo passo.";
      if (isDialogador) {
        botoes.push(<Button key="alta" disabled={!!enviando} onClick={darAlta}>Dar alta</Button>);
        if (ultima?.macas) botoes.push(
          <Button key="voltar" variant="outline" disabled={!!enviando} onClick={() => executar("voltar_maca", {
            title: `Voltar para a Maca ${ultima.macas!.numero}?`,
            description: `${c.nome} volta para a Maca ${ultima.macas!.numero} · ${ultima.macas!.nome} e a contagem de sessões recomeça do zero.`,
            confirmLabel: "Voltar para a maca",
          })}>Voltar para a Maca {ultima.macas.numero}</Button>,
        );
        botoes.push(<Button key="outra" variant="outline" disabled={!!enviando} onClick={irDesignar}>{ultima ? "Escolher outra maca" : "Escolher maca"}</Button>);
      } else {
        texto = <>{texto} O dialogador decide o próximo passo.</>;
      }
    }

    if (etapa === "maca") {
      titulo = "Sem maca no momento";
      texto = ultima
        ? `Última passagem: Maca ${ultima.macas?.numero ?? ""}, ${resultado(ultima).texto.toLowerCase()} em ${dataBR(ultima.closed_at)}.`
        : "O diálogo foi feito. Falta escolher a maca.";
      if (isDialogador) {
        botoes.push(<Button key="maca" disabled={!!enviando} onClick={irDesignar}>Escolher maca</Button>);
        botoes.push(<Button key="alta" variant="outline" disabled={!!enviando} onClick={darAlta}>Dar alta</Button>);
      }
    }

    if (etapa === "tratamento" && ativa) {
      const faltam = Math.max((ativa.sessoes_totais || 8) - (ativa.sessoes_realizadas || 0), 0);
      titulo = `Em tratamento na Maca ${ativa.macas?.numero ?? ""}`;
      texto = <>{ativa.macas?.nome} · {diaLabel(ativa.macas?.dia)} · {ativa.sessoes_realizadas} de {ativa.sessoes_totais} sessões{faltam > 0 ? `, faltam ${faltam}` : ""}.</>;
      if (c.dialogo_pendente) {
        aviso = true;
        texto = <>{texto} O diálogo fraterno ainda não foi registrado.</>;
        if (isDialogador) {
          botoes.push(<Button key="reg" disabled={!!enviando} onClick={irEditar}>Preencher o diálogo</Button>);
          botoes.push(<Button key="feito" variant="outline" disabled={!!enviando} onClick={() => executar("dialogo_feito", null)}>Marcar diálogo como feito</Button>);
        }
      }
      if (isDialogador) botoes.push(<Button key="alta" variant={c.dialogo_pendente ? "outline" : "default"} disabled={!!enviando} onClick={darAlta}>Dar alta</Button>);
      if (isMedium) {
        botoes.push(
          <Button key="enc-alta" variant="outline" disabled={!!enviando} onClick={() => executar("encaminhar_alta", {
            title: "Encaminhar para alta?",
            description: "O consulente sai da maca e vai ao diálogo para as orientações finais e a alta.",
            confirmLabel: "Encaminhar", tone: "success",
          })}>Encaminhar para alta</Button>,
          <Button key="enc-dia" variant="outline" disabled={!!enviando} onClick={() => executar("encaminhar_dialogo", {
            title: "Encaminhar ao diálogo?",
            description: "O consulente sai da maca até fazer um novo diálogo fraterno.",
            confirmLabel: "Encaminhar", tone: "warning",
          })}>Encaminhar ao diálogo</Button>,
        );
      }
      if (isMedium || isDialogador) botoes.push(<Prorrogar key="prorrogar" desabilitado={!!enviando} aoConfirmar={(n) => executar("prorrogar", null, n)} />);
      if (isDialogador) botoes.push(
        <Button key="encerrar" variant="ghost" className="text-muted-foreground" disabled={!!enviando} onClick={() => executar("encerrar_sem_alta", {
          title: "Encerrar sem alta?",
          description: "Use quando o tratamento não vai continuar (desistência, mudança ou orientação da equipe). Fica registrado como encerrado sem alta.",
          confirmLabel: "Encerrar sem alta", tone: "warning",
        })}>Encerrar sem alta</Button>,
      );
    }

    return { titulo, texto, botoes, aviso };
  })();

  const alertas = [
    c.ideias_suicidas && "Ideias suicidas",
    c.ideacao_criminosa && "Ideação criminosa",
  ].filter(Boolean) as string[];

  return (
    <>
      <CabecalhoPagina
        voltar={mediumOnly ? { href: "/medium", rotulo: "Voltar" } : { href: "/consulentes", rotulo: "Voltar para a lista" }}
        Link={LinkRota}
        titulo={c.nome}
        descricao={<>
          {c.data_nascimento ? <>Nasc. {dataBR(String(c.data_nascimento).slice(0, 10))}</> : "Nascimento não informado"}
          {!mediumOnly && <> · {c.telefone || "telefone não informado"}</>}
          {dialogadorNome && <> · Diálogo com {dialogadorNome}</>}
        </>}
        acoes={isDialogador ? <Button variant="outline" onClick={irEditar}>Editar ficha</Button> : undefined}
      />

      <div className="space-y-5 max-w-3xl">
        {alertas.length > 0 && !mediumOnly && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm"><strong>Atenção:</strong> {alertas.join(" e ")}. Acolha com cuidado e avise a coordenação.</div>
          </div>
        )}

        {/* Etapa e próximo passo */}
        <Card className={cn(passo.aviso ? "border-amber-300" : "border-primary/30")}>
          <CardContent className="pt-6 space-y-5">
            <Etapas atual={etapa} />
            <div>
              <h2 className="font-['Playfair_Display'] text-xl font-semibold leading-tight">{passo.titulo}</h2>
              {passo.texto && <p className="mt-1 text-sm text-muted-foreground">{passo.texto}</p>}
              {ativa && (
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar"
                  aria-valuemin={0} aria-valuemax={ativa.sessoes_totais || 8} aria-valuenow={ativa.sessoes_realizadas}>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.round(((ativa.sessoes_realizadas || 0) / (ativa.sessoes_totais || 8)) * 100))}%` }} />
                </div>
              )}
            </div>
            {passo.botoes.length > 0 && <div className="flex flex-wrap gap-2">{passo.botoes}</div>}
            <div className="flex flex-wrap gap-1.5 empty:hidden">
              {c.trabalhador && <Badge variant="outline">Trabalhador da casa</Badge>}
              {c.tratamento_distancia && <Badge variant="outline">Tratamento à distância</Badge>}
              {c.frequencia === "quinzenal" && <Badge variant="outline">Quinzenal</Badge>}
            </div>
          </CardContent>
        </Card>

        <Participacoes designacoes={designacoes} presencas={presencas} altaEm={c.alta_at} />

        <FichaDialogo c={c} completo={!mediumOnly} />

        <ConsulenteObservacoes consulenteId={id} />

        <Recolhivel titulo="Linha do tempo completa">
          <HistoricoLista
            createdAt={c.data_dialogo || c.created_at}
            dialogadorNome={dialogadorNome}
            designacoes={designacoes}
            presencas={presencas}
            observacoes={observacoesHist ?? []}
            alta={c.alta_at ? { at: c.alta_at, por: c.alta_por } : null}
          />
        </Recolhivel>

        {isAdmin && <AjustesAdmin c={c} designacoes={designacoes} ativaId={ativa?.id} aoMudar={atualizar} />}
      </div>
    </>
  );
}

// --- Barra das 4 etapas -----------------------------------------------------------------------
const ETAPAS = [
  { id: "dialogo", nome: "Diálogo" },
  { id: "maca", nome: "Maca" },
  { id: "tratamento", nome: "Tratamento" },
  { id: "alta", nome: "Alta" },
] as const;

function Etapas({ atual }: { atual: (typeof ETAPAS)[number]["id"] }) {
  const idx = ETAPAS.findIndex((e) => e.id === atual);
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Etapas do atendimento">
      {ETAPAS.map((e, i) => {
        const feito = i < idx || atual === "alta";
        const agora = i === idx && atual !== "alta";
        return (
          <li key={e.id} className="flex flex-col items-center gap-1.5 text-center" aria-current={agora ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : i <= idx ? "bg-primary" : "bg-border")} />
              <span className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                feito && "border-primary bg-primary text-primary-foreground",
                agora && "border-amber-400 bg-amber-50 text-amber-900 ring-4 ring-amber-100",
                !feito && !agora && "border-border bg-background text-muted-foreground",
              )}>
                {feito ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn("h-0.5 flex-1", i === ETAPAS.length - 1 ? "bg-transparent" : i < idx ? "bg-primary" : "bg-border")} />
            </div>
            <span className={cn("text-xs", agora ? "font-semibold text-foreground" : "text-muted-foreground")}>{e.nome}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Prorrogar({ desabilitado, aoConfirmar }: { desabilitado: boolean; aoConfirmar: (n: number) => Promise<boolean> }) {
  const [aberto, setAberto] = useState(false);
  const [qtd, setQtd] = useState("4");
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={desabilitado}>Prorrogar</Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Quantos atendimentos a mais?
          <Input type="number" min={1} max={30} inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} />
        </label>
        <Button className="w-full" onClick={async () => {
          const n = parseInt(qtd, 10);
          if (!Number.isFinite(n) || n < 1) return toast.error("Informe um número de atendimentos.");
          if (await aoConfirmar(n)) setAberto(false);
        }}>Confirmar</Button>
      </PopoverContent>
    </Popover>
  );
}

function Recolhivel({ titulo, aberto = false, children }: { titulo: string; aberto?: boolean; children: ReactNode }) {
  return (
    <details open={aberto} className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-['Playfair_Display'] text-lg font-semibold [&::-webkit-details-marker]:hidden">
        {titulo}
        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

// --- Tudo o que ele já participou ---------------------------------------------------------------
const PRESENCA_STYLE: Record<string, { label: string; short: string; cls: string; dot: string }> = {
  presente: { label: "Presença", short: "P", cls: "border-emerald-300 bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  atendimento_distancia: { label: "Atendimento à distância", short: "D", cls: "border-sky-300 bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  falta_justificada: { label: "Falta justificada", short: "J", cls: "border-amber-300 bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  ausente: { label: "Falta", short: "F", cls: "border-destructive/40 bg-destructive/10 text-destructive", dot: "bg-destructive" },
  emergencia: { label: "Emergência", short: "E", cls: "border-purple-300 bg-purple-100 text-purple-800", dot: "bg-purple-500" },
};
const styleFor = (s: string) =>
  PRESENCA_STYLE[s] ?? { label: s, short: "?", cls: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
const CONTA_SESSAO = new Set(["presente", "atendimento_distancia"]);
const dataDe = (p: PresencaHist) => p.sessoes?.data ?? p.created_at;
const chipData = (d: string) =>
  new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

function Participacoes({ designacoes, presencas, altaEm }: { designacoes: DesignacaoHist[]; presencas: PresencaHist[]; altaEm: string | null }) {
  const vindas = presencas.filter((p) => CONTA_SESSAO.has(p.status)).length;
  const faltas = presencas.filter((p) => p.status === "ausente").length;
  const ordenadas = [...designacoes].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-['Playfair_Display'] text-lg">Tudo o que já participou</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Numero valor={designacoes.length} rotulo={designacoes.length === 1 ? "passagem por maca" : "passagens por maca"} />
          <Numero valor={vindas} rotulo={vindas === 1 ? "atendimento recebido" : "atendimentos recebidos"} />
          <Numero valor={faltas} rotulo={faltas === 1 ? "falta" : "faltas"} />
        </div>

        {ordenadas.length === 0 && <p className="text-sm text-muted-foreground">Ainda não passou por nenhuma maca.</p>}

        <ol className="space-y-3">
          {ordenadas.map((d) => {
            const r = resultado(d);
            const daqui = presencas.filter((p) => p.designacao_id === d.id).sort((a, b) => (dataDe(a) < dataDe(b) ? -1 : 1));
            const recebeu = daqui.filter((p) => CONTA_SESSAO.has(p.status)).length;
            return (
              <li key={d.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {d.macas && (
                    <span className="rounded px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: d.macas.cor_hex }}>
                      Maca {d.macas.numero}
                    </span>
                  )}
                  <span className="text-sm font-medium">{d.macas?.nome}</span>
                  {d.macas?.dia && <span className="text-xs text-muted-foreground">{diaLabel(d.macas.dia)}</span>}
                  <Badge variant="outline" className={cn("ml-auto", r.cls)}>{r.texto}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {dataBR(d.created_at)}{d.closed_at ? ` a ${dataBR(d.closed_at)}` : " até hoje"} · {recebeu} de {d.sessoes_totais || 8} sessões
                  {d.reactivated_at ? ` · voltou em ${dataBR(d.reactivated_at)}` : ""}
                </div>
                {daqui.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {daqui.map((p) => {
                      const st = styleFor(p.status);
                      return (
                        <span key={p.id} title={`${st.label}${p.observacao ? `: ${p.observacao}` : ""}`}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>
                          {chipData(dataDe(p))} {st.short}
                        </span>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        {(presencas.length > 0 || altaEm) && (
          <p className="text-[11px] text-muted-foreground">P presença · D à distância · J falta justificada · F falta · E emergência. Toque na data para ver a observação.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-3">
      <div className="text-2xl font-bold leading-none text-primary">{valor}</div>
      <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{rotulo}</div>
    </div>
  );
}

// --- Ficha do diálogo: só o que foi marcado ---------------------------------------------------
function FichaDialogo({ c, completo }: { c: ConsulenteFull; completo: boolean }) {
  const junta = (...p: (string | null | undefined)[]) => p.filter(Boolean).join(" · ");
  const motivos: [string, string][] = [];
  if (c.motivo_saude_fisica) motivos.push(["Saúde física", junta(
    c.motivo_saude_fisica_especificacao,
    c.motivo_saude_fisica_diagnostico && `diagnóstico: ${c.motivo_saude_fisica_diagnostico_obs || "sim"}`,
    c.motivo_saude_fisica_tratamento && `em tratamento: ${c.motivo_saude_fisica_tratamento_obs || "sim"}`,
  )]);
  if (c.motivo_saude_mental) motivos.push(["Saúde mental", junta(
    c.motivo_saude_mental_especificacao,
    c.motivo_saude_mental_diagnostico && `diagnóstico: ${c.motivo_saude_mental_diagnostico_obs || "sim"}`,
    c.motivo_saude_mental_tratamento && `em tratamento: ${c.motivo_saude_mental_tratamento_obs || "sim"}`,
  )]);
  if (c.motivo_saude_espiritual) motivos.push(["Saúde espiritual", c.motivo_saude_espiritual_especificacao ?? ""]);
  if (c.motivo_conflitos_familiares) motivos.push(["Conflitos familiares ou pessoais", ""]);

  const atencao = [
    c.ideias_suicidas && "Ideias suicidas",
    c.ideacao_criminosa && "Ideação criminosa",
    c.uso_drogas && "Drogas ilícitas",
    c.uso_alcool && "Bebida alcoólica",
    c.uso_cigarro && "Cigarro ou eletrônico",
    c.uso_medicacoes && `Medicações${c.uso_medicacoes_especificacao ? `: ${c.uso_medicacoes_especificacao}` : ""}`,
    c.conflito_genero && "Conflito de gênero",
  ].filter(Boolean) as string[];

  const religiao = [
    c.conhece_doutrina && "Conhece a Doutrina Espírita",
    c.evangelho_no_lar && "Pratica o Evangelho no Lar",
    c.pratica_religiosa && `Prática religiosa${c.pratica_religiosa_descricao ? `: ${c.pratica_religiosa_descricao}` : ""}`,
  ].filter(Boolean) as string[];

  const encaminhamento = [
    c.encaminhamento_passes && `Passe${c.encaminhamento_passes_qtd ? ` (${c.encaminhamento_passes_qtd})` : ""}`,
    c.encaminhamento_maca && `Maca ${c.encaminhamento_maca_categoria === "externa" ? "Externa" : c.encaminhamento_maca_categoria === "interna" ? "Interna (saúde)" : ""}`.trim(),
  ].filter(Boolean) as string[];

  return (
    <Recolhivel titulo="Ficha do diálogo fraterno" aberto>
      <dl className="space-y-4 text-sm">
        <Bloco rotulo="Motivos do atendimento">
          {motivos.length === 0 ? <Vazio /> : (
            <ul className="space-y-1">
              {motivos.map(([t, d]) => <li key={t}><strong className="font-medium">{t}</strong>{d && <span className="text-muted-foreground">: {d}</span>}</li>)}
            </ul>
          )}
        </Bloco>
        {completo && (
          <Bloco rotulo="Dados de atenção">
            {atencao.length === 0 ? <Vazio /> : <Chips itens={atencao} />}
          </Bloco>
        )}
        <Bloco rotulo="Encaminhamento do diálogo">{encaminhamento.length === 0 ? <Vazio /> : <Chips itens={encaminhamento} />}</Bloco>
        {completo && <Bloco rotulo="Vida religiosa">{religiao.length === 0 ? <Vazio /> : <Chips itens={religiao} />}</Bloco>}
        {completo && c.outras_informacoes && <Bloco rotulo="Outras informações"><p className="whitespace-pre-line">{c.outras_informacoes}</p></Bloco>}
      </dl>
    </Recolhivel>
  );
}

function Bloco({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}
const Vazio = () => <span className="text-muted-foreground">Nada marcado.</span>;
const Chips = ({ itens }: { itens: string[] }) => (
  <div className="flex flex-wrap gap-1.5">{itens.map((i) => <span key={i} className="rounded-full bg-muted px-2.5 py-1 text-xs">{i}</span>)}</div>
);

// --- Linha do tempo ---------------------------------------------------------------------------
function HistoricoLista({
  createdAt, dialogadorNome, designacoes, presencas, observacoes, alta,
}: {
  createdAt: string; dialogadorNome: string | null; designacoes: DesignacaoHist[]; presencas: PresencaHist[];
  observacoes: ObservacaoHist[]; alta: { at: string; por: string | null } | null;
}) {
  const macaById = new Map(designacoes.map((d) => [d.id, d.macas]));
  type Evt = { sortAt: string; at: string; titulo: string; detalhe?: string; autor?: string | null; cor?: string };
  const eventos: Evt[] = [{ sortAt: createdAt, at: dataBR(createdAt), titulo: "Diálogo fraterno", detalhe: "Cadastro do consulente", autor: dialogadorNome }];
  designacoes.forEach((d) => {
    const macaTxt = d.macas ? `Maca ${d.macas.numero} · ${d.macas.nome}` : "Maca";
    eventos.push({ sortAt: d.created_at, at: dataBR(d.created_at), titulo: "Entrou na maca", detalhe: macaTxt, autor: d.dialogador?.nome ?? null });
    if (d.closed_at) eventos.push({ sortAt: d.closed_at, at: dataBR(d.closed_at), titulo: resultado(d).texto, detalhe: macaTxt });
    if (d.reactivated_at) eventos.push({ sortAt: d.reactivated_at, at: dataBR(d.reactivated_at), titulo: "Voltou para a maca", detalhe: macaTxt });
  });
  presencas.forEach((p) => {
    const m = macaById.get(p.designacao_id);
    eventos.push({
      sortAt: dataDe(p), at: dataBR(String(dataDe(p)).slice(0, 10)), titulo: styleFor(p.status).label,
      detalhe: [m ? `Maca ${m.numero}` : null, p.observacao || null].filter(Boolean).join(" · ") || undefined,
      autor: p.marcador?.nome ?? null, cor: styleFor(p.status).dot,
    });
  });
  observacoes.forEach((o) => eventos.push({ sortAt: o.created_at, at: dataBR(o.created_at), titulo: "Observação", detalhe: o.conteudo, autor: o.autor_nome, cor: "bg-primary" }));
  if (alta) eventos.push({ sortAt: alta.at, at: dataBR(alta.at), titulo: "Alta concedida", autor: alta.por, cor: "bg-sky-500" });
  eventos.sort((a, b) => (a.sortAt < b.sortAt ? 1 : -1));

  return (
    <ol className="relative ml-2 space-y-3 border-l-2 border-border">
      {eventos.map((e, i) => (
        <li key={i} className="relative pl-5 text-sm">
          <span className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ring-2 ring-background ${e.cor ?? "bg-primary/50"}`} />
          <div className="text-[11px] text-muted-foreground">{e.at}</div>
          <div className="font-medium">{e.titulo}</div>
          {e.detalhe && <div className="text-xs text-muted-foreground">{e.detalhe}</div>}
          {e.autor && <div className="text-xs text-muted-foreground">por {e.autor}</div>}
        </li>
      ))}
    </ol>
  );
}

// --- Só o administrador -----------------------------------------------------------------------
function AjustesAdmin({ c, designacoes, ativaId, aoMudar }: { c: ConsulenteFull; designacoes: DesignacaoHist[]; ativaId?: string; aoMudar: () => void }) {
  const confirm = useConfirm();
  const navigate = useNavigate();

  const alterarStatus = async (designacaoId: string, novo: "ativa" | "concluida" | "cancelada") => {
    if (novo === "ativa" && ativaId && ativaId !== designacaoId) return toast.error("Já existe uma maca ativa. Encerre-a antes de reativar outra.");
    const { error } = await supabase.from("designacoes")
      .update({ status: novo, closed_at: novo === "ativa" ? null : new Date().toISOString() })
      .eq("id", designacaoId);
    if (error) return toast.error(error.message);
    toast.success("Situação corrigida");
    aoMudar();
  };

  return (
    <Recolhivel titulo="Ajustes do administrador">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Corrija a situação de uma passagem por maca só quando algo foi lançado errado.</p>
          {designacoes.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
              <span>Maca {d.macas?.numero} · {dataBR(d.created_at)}</span>
              <Select value={d.status} onValueChange={(v) => alterarStatus(d.id, v as "ativa" | "concluida" | "cancelada")}>
                <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Em tratamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Encerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Excluir apaga {c.nome} e todo o histórico (macas, presenças e observações). Prefira dar alta ou encerrar.
          </p>
          <Button variant="destructive" onClick={async () => {
            if (!(await confirm({
              title: "Excluir cadastro do consulente?",
              description: `Esta ação apaga ${c.nome} e todo o histórico. Não é possível desfazer.`,
              tone: "danger", confirmLabel: "Excluir definitivamente", requireText: c.nome,
            }))) return;
            const { error } = await supabase.from("consulentes").delete().eq("id", c.id);
            if (error) return toast.error(error.message);
            toast.success("Cadastro excluído.");
            navigate({ to: "/consulentes" });
          }}>Excluir cadastro</Button>
        </div>
      </div>
    </Recolhivel>
  );
}
