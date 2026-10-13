import { Skeleton } from "@/components/ui/skeleton";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, AlertTriangle, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ConsulenteObservacoes } from "@/components/ConsulenteObservacoes";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/consulentes/$id")({
  component: () => (
    <RequireAuth roles={["dialogador", "admin", "medium"]}>
      <Ficha />
    </RequireAuth>
  ),
});

function Ficha() {
  const { id } = Route.useParams();
  const { isAdmin, isRecepcao, isDialogador, isMedium, user } = useAuth();
  const mediumOnly = isMedium && !isDialogador && !isAdmin;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirm = useConfirm();

  const { data: c } = useQuery({
    queryKey: ["consulente-full", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consulentes")
        .select("*, designacoes(id, status, sessoes_realizadas, sessoes_totais, created_at, closed_at, reactivated_at, reactivated_by, maca_id, dialogador_id, macas(numero, nome, cor_hex, dia))")
        .eq("id", id)
        .order("created_at", { foreignTable: "designacoes", ascending: false })
        .single();
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cons = data as any;
      const ids = Array.from(new Set([
        cons.dialogador_id,
        ...((cons.designacoes ?? []) as Array<{ dialogador_id: string | null }>).map((d) => d.dialogador_id),
      ].filter((x): x is string => !!x)));
      const nomeMap = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, nome").in("id", ids);
        (profs ?? []).forEach((p) => nomeMap.set(p.id, p.nome));
      }
      cons.dialogador = cons.dialogador_id && nomeMap.has(cons.dialogador_id)
        ? { nome: nomeMap.get(cons.dialogador_id)! }
        : null;
      cons.designacoes = (cons.designacoes ?? []).map((d: { dialogador_id: string | null }) => ({
        ...d,
        dialogador: d.dialogador_id && nomeMap.has(d.dialogador_id) ? { nome: nomeMap.get(d.dialogador_id)! } : null,
      }));
      return cons as ConsulenteFull;
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
      const ids = Array.from(new Set((data ?? []).map((p) => p.created_by).filter((x): x is string => !!x)));
      const nomeMap = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, nome").in("id", ids);
        (profs ?? []).forEach((p) => nomeMap.set(p.id, p.nome));
      }
      return (data ?? []).map((p) => ({
        ...p,
        marcador: p.created_by && nomeMap.has(p.created_by) ? { nome: nomeMap.get(p.created_by)! } : null,
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
      const ids = Array.from(
        new Set((data ?? []).map((o) => o.autor_id).filter((x): x is string => !!x))
      );
      const nomeMap = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, nome").in("id", ids);
        (profs ?? []).forEach((p) => nomeMap.set(p.id, p.nome));
      }
      return (data ?? []).map((o) => ({
        id: o.id,
        conteudo: o.conteudo,
        created_at: o.created_at,
        autor_nome: o.autor_id ? nomeMap.get(o.autor_id) ?? null : null,
      })) as ObservacaoHist[];
    },
  });

  if (!c)
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Carregando ficha do consulente">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );

  const dialogadorNome = c.dialogador?.nome ?? null;
  const presencasHist = historico ?? [];
  const obsHist = observacoesHist ?? [];



  if (mediumOnly) {
    const desigsM = (c.designacoes ?? []) as Array<{ id: string; status: string }>;
    const ativaM = desigsM.find((d) => d.status === "ativa");

    const encaminharDialogo = async (modo: "encaminhamento" | "alta") => {
      if (!ativaM) {
        toast.error("Não há designação ativa para este consulente.");
        return;
      }
      const msg = modo === "alta"
        ? "O consulente ficará inativo e será encaminhado ao diálogo para orientações e encerramento do tratamento."
        : "O consulente ficará inativo até a realização de um novo diálogo fraterno.";
      if (!(await confirm({
        title: modo === "alta" ? "Encaminhar para Alta?" : "Encaminhar ao diálogo?",
        description: msg,
        tone: modo === "alta" ? "success" : "warning",
        confirmLabel: "Encaminhar",
      }))) return;

      const { error: e1 } = await supabase
        .from("consulentes")
        .update({ dialogo_pendente: true })
        .eq("id", id);
      if (e1) return toast.error(e1.message);

      const { error: e2 } = await supabase
        .from("designacoes")
        .update({
          status: modo === "alta" ? "concluida" : "cancelada",
          closed_at: new Date().toISOString(),
          closure_reason: modo === "alta" ? "alta" : "encaminhamento_dialogo",
        })
        .eq("id", ativaM.id);
      if (e2) return toast.error(e2.message);

      toast.success(modo === "alta" ? "Encaminhamento para Alta registrado." : "Encaminhamento ao diálogo registrado.");
      qc.invalidateQueries({ queryKey: ["consulente-full", id] });
      navigate({ to: "/medium" });
    };

    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Link to="/medium" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-semibold">{c.nome}</h1>
          {ativaM && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => encaminharDialogo("encaminhamento")}
                className="border-2 hover:bg-secondary"
              >
                Encaminhar ao diálogo
              </Button>
              <Button
                onClick={() => encaminharDialogo("alta")}
                className="bg-brand-teal text-white hover:bg-brand-teal/90"
              >
                Encaminhar para Alta
              </Button>
            </div>
          )}
        </div>
        {dialogadorNome && (
          <p className="text-sm text-muted-foreground">
            Diálogo fraterno realizado por <span className="font-medium text-foreground">{dialogadorNome}</span>
          </p>
        )}
        <Card>
          <CardHeader><CardTitle>Motivos do atendimento</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-2 text-sm">
            <Info label="Saúde física" v={c.motivo_saude_fisica} extra={c.motivo_saude_fisica_especificacao} />
            {c.motivo_saude_fisica && (
              <>
                <Info label="— Diagnóstico médico (física)" v={c.motivo_saude_fisica_diagnostico} extra={c.motivo_saude_fisica_diagnostico_obs} />
                <Info label="— Em tratamento (física)" v={c.motivo_saude_fisica_tratamento} extra={c.motivo_saude_fisica_tratamento_obs} />
              </>
            )}
            <Info label="Saúde mental" v={c.motivo_saude_mental} extra={c.motivo_saude_mental_especificacao} />
            {c.motivo_saude_mental && (
              <>
                <Info label="— Diagnóstico médico (mental)" v={c.motivo_saude_mental_diagnostico} extra={c.motivo_saude_mental_diagnostico_obs} />
                <Info label="— Em tratamento (mental)" v={c.motivo_saude_mental_tratamento} extra={c.motivo_saude_mental_tratamento_obs} />
              </>
            )}
            <Info label="Saúde espiritual" v={c.motivo_saude_espiritual} extra={c.motivo_saude_espiritual_especificacao} />
            <Info label="Conflitos familiares/pessoais" v={c.motivo_conflitos_familiares} />
          </CardContent>
        </Card>
        <CicloResumo
          designacoes={(c.designacoes ?? []) as DesignacaoHist[]}
          presencas={presencasHist}
        />
        <ConsulenteObservacoes consulenteId={id} />
        <HistoricoCard
          createdAt={c.created_at}
          dialogadorNome={dialogadorNome}
          designacoes={(c.designacoes ?? []) as DesignacaoHist[]}
          presencas={presencasHist}
          observacoes={obsHist}
        />
      </div>
    );
  }



  const designacoes = (c.designacoes ?? []) as Array<{
    id: string; status: string; sessoes_realizadas: number; sessoes_totais: number;
    created_at: string; closed_at: string | null;
    macas: { numero: number; nome: string; cor_hex: string; dia: string } | null;
  }>;
  const ativa = designacoes.find((d) => d.status === "ativa");
  const altas = designacoes.filter((d) => d.status === "concluida");
  const diaLabel = (d?: string) => (d === "sabado" ? "Sábado" : d === "terca" ? "Terça-feira" : "");
  const ultimaConcluida = !ativa
    ? [...designacoes]
        .filter((d) => d.status === "concluida")
        .sort((a, b) => +new Date(b.closed_at || 0) - +new Date(a.closed_at || 0))[0]
    : undefined;
  const cAny = c as unknown as { alta_at?: string | null; dialogo_pendente?: boolean };
  const isAltaConcedida = !!cAny.alta_at;
  const encaminhadoParaAlta = !isAltaConcedida && !!cAny.dialogo_pendente && ((ultimaConcluida as { closure_reason?: string | null } | undefined)?.closure_reason === "alta");

  const confirmarAlta = async () => {
    if (!(await confirm({
      title: "Conceder Alta ao consulente?",
      description: "O tratamento será encerrado e o consulente passará para o status de Alta.",
      tone: "success",
      confirmLabel: "Conceder Alta",
    }))) return;
    const { error } = await supabase
      .from("consulentes")
      .update({ alta_at: new Date().toISOString(), alta_by: user?.id ?? null, dialogo_pendente: false } as never)
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Alta concedida.");
    qc.invalidateQueries({ queryKey: ["consulente-full", id] });
    qc.invalidateQueries({ queryKey: ["consulentes"] });
  };

  const encerrarCiclo = async () => {
    if (!ativa) return;
    if (!(await confirm({
      title: "Encerrar acompanhamento (sem alta)?",
      description:
        "A designação atual será encerrada sem registro de alta. Use esta opção quando o acompanhamento não será concluído pelo ciclo normal (desistência, mudança de maca ou orientação da equipe).",
      tone: "warning",
      confirmLabel: "Encerrar acompanhamento",
    }))) return;
    const { error } = await supabase
      .from("designacoes")
      .update({ status: "concluida", closed_at: new Date().toISOString() })
      .eq("id", ativa.id);
    if (error) return toast.error(error.message);
    toast.success("Acompanhamento encerrado (sem alta).");
    qc.invalidateQueries({ queryKey: ["consulente-full", id] });
  };

  const encaminharAoDialogo = async (modo: "encaminhamento" | "alta") => {
    if (!ativa) {
      toast.error("Não há designação ativa para este consulente.");
      return;
    }
    const msg = modo === "alta"
      ? "O consulente ficará inativo e será encaminhado ao diálogo para orientações e encerramento do tratamento."
      : "O consulente ficará inativo até a realização de um novo diálogo fraterno.";
    if (!(await confirm({
      title: modo === "alta" ? "Encaminhar para Alta?" : "Encaminhar ao diálogo?",
      description: msg,
      tone: modo === "alta" ? "success" : "warning",
      confirmLabel: "Encaminhar",
    }))) return;

    const { error: e1 } = await supabase
      .from("consulentes")
      .update({ dialogo_pendente: true })
      .eq("id", id);
    if (e1) return toast.error(e1.message);

    const { error: e2 } = await supabase
      .from("designacoes")
      .update({
        status: modo === "alta" ? "concluida" : "cancelada",
        closed_at: new Date().toISOString(),
        closure_reason: modo === "alta" ? "alta" : "encaminhamento_dialogo",
      })
      .eq("id", ativa.id);
    if (e2) return toast.error(e2.message);

    toast.success(modo === "alta" ? "Encaminhamento para Alta registrado." : "Encaminhamento ao diálogo registrado.");
    qc.invalidateQueries({ queryKey: ["consulente-full", id] });
    if (mediumOnly) navigate({ to: "/medium" });
  };

  const alterarStatus = async (designacaoId: string, novoStatus: "ativa" | "concluida" | "cancelada") => {
    if (novoStatus === "ativa" && ativa && ativa.id !== designacaoId) {
      toast.error("Já existe uma designação ativa. Encerre-a antes de reativar outra.");
      return;
    }
    const patch: { status: typeof novoStatus; closed_at: string | null } = {
      status: novoStatus,
      closed_at: novoStatus === "ativa" ? null : new Date().toISOString(),
    };
    const { error } = await supabase.from("designacoes").update(patch).eq("id", designacaoId);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    qc.invalidateQueries({ queryKey: ["consulente-full", id] });
  };

  const reativar = async (designacaoId: string) => {
    if (ativa) {
      toast.error("Já existe uma designação ativa. Encerre-a antes de reativar outra.");
      return;
    }
    if (!(await confirm({
      title: "Reativar esta designação?",
      description:
        "O consulente volta para a lista de atendimentos desta maca e o médium poderá registrar presença novamente. Reative apenas após um novo diálogo fraterno.",
      tone: "info",
      confirmLabel: "Reativar nesta maca",
    }))) return;
    await alterarStatus(designacaoId, "ativa");
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link to="/consulentes" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para lista
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {c.nome}
            {c.ideias_suicidas && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> Alerta — ideias suicidas
              </Badge>
            )}
            {c.ideacao_criminosa && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> Alerta — ideação criminosa
              </Badge>
            )}
            {isAltaConcedida && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Alta</Badge>
            )}
            {!isAltaConcedida && encaminhadoParaAlta && (
              <Badge variant="outline" className="border-emerald-400 text-emerald-800 bg-emerald-100">
                Encaminhado para Alta
              </Badge>
            )}
            {!isAltaConcedida && !encaminhadoParaAlta && c.dialogo_pendente && (
              <Badge variant="outline">Diálogo fraterno pendente</Badge>
            )}
            {c.trabalhador && (
              <Badge variant="outline" className="border-brand-blue/50 text-brand-blue-dark bg-brand-blue-muted/40">
                Trab
              </Badge>
            )}
            {c.tratamento_distancia && (
              <Badge variant="outline" className="border-brand-teal/50 text-brand-teal-dark bg-brand-teal-muted">
                Dist
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Nasc.: {c.data_nascimento ? new Date(`${String(c.data_nascimento).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "não informado"}
            {" · "}Tel.: {c.telefone || "não informado"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(isAdmin || isDialogador) && (
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/consulentes/$id/editar", params: { id } })}
              className="border-2 hover:bg-secondary"
            >
              Editar dados
            </Button>
          )}
          {!ativa && (isRecepcao || isAdmin) && (
            <Button
              onClick={() => navigate({ to: "/dialogo/$consulenteId/designar", params: { consulenteId: id } })}
              className="shadow-sm hover:shadow-md transition-shadow bg-brand-blue text-white hover:bg-brand-blue-dark"
            >
              Designar maca
            </Button>
          )}
          {ativa && isMedium && (
            <>
              <Button
                variant="outline"
                onClick={() => encaminharAoDialogo("encaminhamento")}
                className="border-2 hover:bg-secondary"
              >
                Encaminhar ao diálogo
              </Button>
              <Button
                onClick={() => encaminharAoDialogo("alta")}
                className="bg-brand-teal text-white hover:bg-brand-teal/90"
              >
                Encaminhar para Alta
              </Button>
            </>
          )}
          {encaminhadoParaAlta && (isDialogador || isAdmin) && (
            <Button
              onClick={confirmarAlta}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Dar Alta
            </Button>
          )}
          {ativa && isAdmin && (
            <Button variant="outline" onClick={encerrarCiclo} className="border-2 hover:bg-secondary">
              Encerrar acompanhamento (sem alta)
            </Button>
          )}
        </div>
      </div>

      <CicloResumo
        designacoes={(c.designacoes ?? []) as DesignacaoHist[]}
        presencas={presencasHist}
      />

      <Card>
        <CardHeader><CardTitle>Situação atual</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {ativa && ativa.macas ? (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-muted-foreground">Maca atribuída:</span>
              <span
                className="px-2 py-1 rounded text-xs font-medium text-white"
                style={{ backgroundColor: ativa.macas.cor_hex }}
              >
                Maca {ativa.macas.numero} — {ativa.macas.nome}
              </span>
              <Badge variant="outline">{diaLabel(ativa.macas.dia)}</Badge>
              <span className="text-muted-foreground text-xs">
                {ativa.sessoes_realizadas}/{ativa.sessoes_totais} atendimentos
              </span>
              {ativa.sessoes_totais - ativa.sessoes_realizadas <= 1 && (
                <Badge variant="outline" className="text-amber-700 border-amber-400 bg-amber-50">
                  Próximo do término
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Sem maca ativa no momento.</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">Altas recebidas:</span>
            <Badge variant="secondary">{altas.length}</Badge>
            {altas.map((d) =>
              d.macas ? (
                <span
                  key={d.id}
                  className="px-2 py-0.5 rounded text-[11px] font-medium text-white"
                  style={{ backgroundColor: d.macas.cor_hex }}
                  title={d.closed_at ? new Date(d.closed_at).toLocaleDateString("pt-BR") : ""}
                >
                  Maca {d.macas.numero}
                </span>
              ) : null
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ficha</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2 text-sm">
          <Info label="Conhece a Doutrina" v={c.conhece_doutrina} />
          <Info label="Evangelho no Lar" v={c.evangelho_no_lar} />
          <Info label="Prática religiosa" v={c.pratica_religiosa} extra={c.pratica_religiosa_descricao} />
          <Info label="Motivo: Saúde física" v={c.motivo_saude_fisica} extra={c.motivo_saude_fisica_especificacao} />
          {c.motivo_saude_fisica && (
            <>
              <Info label="— Diagnóstico médico (física)" v={c.motivo_saude_fisica_diagnostico} extra={c.motivo_saude_fisica_diagnostico_obs} />
              <Info label="— Em tratamento (física)" v={c.motivo_saude_fisica_tratamento} extra={c.motivo_saude_fisica_tratamento_obs} />
            </>
          )}
          <Info label="Motivo: Saúde mental" v={c.motivo_saude_mental} extra={c.motivo_saude_mental_especificacao} />
          {c.motivo_saude_mental && (
            <>
              <Info label="— Diagnóstico médico (mental)" v={c.motivo_saude_mental_diagnostico} extra={c.motivo_saude_mental_diagnostico_obs} />
              <Info label="— Em tratamento (mental)" v={c.motivo_saude_mental_tratamento} extra={c.motivo_saude_mental_tratamento_obs} />
            </>
          )}
          <Info label="Motivo: Saúde espiritual" v={c.motivo_saude_espiritual} extra={c.motivo_saude_espiritual_especificacao} />
          <Info label="Conflitos familiares/pessoais" v={c.motivo_conflitos_familiares} />

          <Info label="Drogas ilícitas" v={c.uso_drogas} />
          <Info label="Álcool" v={c.uso_alcool} />
          <Info label="Cigarro" v={c.uso_cigarro} />
          <Info label="Conflito de gênero" v={c.conflito_genero} />
          <Info label="⚠ Ideias suicidas" v={c.ideias_suicidas} />
          <Info label="⚠ Ideação criminosa" v={c.ideacao_criminosa} />
          <Info label="Encaminhamento: Passes" v={c.encaminhamento_passes} extra={c.encaminhamento_passes_qtd?.toString()} />
          <Info label="Encaminhamento: Maca" v={c.encaminhamento_maca} extra={c.encaminhamento_maca_categoria} />
          {c.outras_informacoes && (
            <div className="sm:col-span-2">
              <div className="text-muted-foreground text-xs">Outras informações</div>
              <div>{c.outras_informacoes}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico de designações</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {designacoes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma designação.</p>}
          {designacoes.map((d) => (
            <div key={d.id} className="flex items-center justify-between border rounded p-2 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {d.macas && (
                  <span
                    className="px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: d.macas.cor_hex }}
                  >
                    Maca {d.macas.numero}
                  </span>
                )}
                <span className="text-sm">{d.macas?.nome}</span>
                {d.macas?.dia && <Badge variant="outline" className="text-[10px]">{diaLabel(d.macas.dia)}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>{d.sessoes_realizadas}/{d.sessoes_totais} atendimentos</span>
                {d.status === "concluida" ? (
                  <Badge className="bg-brand-teal text-white hover:bg-brand-teal">
                    Alta {d.closed_at ? `· ${new Date(d.closed_at).toLocaleDateString("pt-BR")}` : ""}
                  </Badge>
                ) : (
                  <Badge variant={d.status === "ativa" ? "default" : "secondary"}>
                    {d.status === "ativa" ? "Em atendimento" : "Encerrada"}
                  </Badge>
                )}
                {isAdmin && (
                  <>
                    <Select
                      value={d.status}
                      onValueChange={(v) => alterarStatus(d.id, v as "ativa" | "concluida" | "cancelada")}
                    >
                      <SelectTrigger className="h-7 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativa">Ativa</SelectItem>
                        <SelectItem value="concluida">Alta (concluída)</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    {d.status !== "ativa" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-2"
                        onClick={() => reativar(d.id)}
                      >
                        <RotateCcw className="h-3 w-3" /> Reativar
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConsulenteObservacoes consulenteId={id} />

      <HistoricoCard
        createdAt={c.created_at}
        dialogadorNome={dialogadorNome}
        designacoes={(c.designacoes ?? []) as DesignacaoHist[]}
        presencas={presencasHist}
        observacoes={obsHist}
      />

      {isAdmin && (
        <Card className="border-2 border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive text-base">Zona de risco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Excluir o cadastro remove permanentemente {c.nome} e todo o histórico (designações,
              presenças e observações). Prefira encerrar o acompanhamento sempre que possível.
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                if (!(await confirm({
                  title: "Excluir cadastro do consulente?",
                  description: `Esta ação removerá permanentemente ${c.nome} e todo o histórico (designações, presenças e observações). Não é possível desfazer.`,
                  tone: "danger",
                  confirmLabel: "Excluir definitivamente",
                  requireText: c.nome,
                }))) return;
                const { error } = await supabase.from("consulentes").delete().eq("id", id);
                if (error) return toast.error(error.message);
                toast.success("Cadastro excluído.");
                qc.invalidateQueries({ queryKey: ["consulentes"] });
                navigate({ to: "/consulentes" });
              }}
              className="border-2 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              Excluir cadastro
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Info({ label, v, extra }: { label: string; v: boolean | null | undefined; extra?: string | null }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div>{v ? "Sim" : "Não"}{extra ? ` — ${extra}` : ""}</div>
    </div>
  );
}

type DesignacaoHist = {
  id: string;
  status: string;
  sessoes_realizadas: number;
  sessoes_totais: number;
  created_at: string;
  closed_at: string | null;
  reactivated_at?: string | null;
  reactivated_by?: string | null;
  maca_id: string;
  dialogador: { nome: string } | null;
  macas: { numero: number; nome: string; cor_hex: string; dia: string } | null;
};

type ObservacaoHist = {
  id: string;
  conteudo: string;
  created_at: string;
  autor_nome: string | null;
};

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

const PRESENCA_STYLE: Record<string, { label: string; short: string; cls: string; dot: string }> = {
  presente: {
    label: "Presença",
    short: "P",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
  },
  atendimento_distancia: {
    label: "Atendimento à distância",
    short: "D",
    cls: "border-brand-teal/40 bg-brand-teal-muted text-brand-teal-dark",
    dot: "bg-brand-teal",
  },
  falta_justificada: {
    label: "Falta justificada",
    short: "J",
    cls: "border-amber-300 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
  ausente: {
    label: "Falta",
    short: "F",
    cls: "border-red-300 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

const styleFor = (s: string) =>
  PRESENCA_STYLE[s] ?? { label: s, short: "?", cls: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" };

const CONTA_SESSAO = new Set(["presente", "atendimento_distancia"]);

function ordinal(n: number) {
  return `${n}ª`;
}

export function CicloResumo({
  designacoes,
  presencas,
}: {
  designacoes: DesignacaoHist[];
  presencas: PresencaHist[];
}) {
  const ativa = designacoes.find((d) => d.status === "ativa");
  const alvo =
    ativa ??
    [...designacoes].sort(
      (a, b) => +new Date(b.closed_at || b.created_at) - +new Date(a.closed_at || a.created_at)
    )[0];
  if (!alvo) return null;

  const doCiclo = presencas
    .filter((p) => p.designacao_id === alvo.id)
    .sort((a, b) => {
      const da = a.sessoes?.data ?? a.created_at;
      const db = b.sessoes?.data ?? b.created_at;
      return da < db ? -1 : da > db ? 1 : 0;
    });

  const realizadas = doCiclo.filter((p) => CONTA_SESSAO.has(p.status)).length;
  const total = alvo.sessoes_totais || 8;
  const atual = Math.min(realizadas, total);
  const restantes = Math.max(total - realizadas, 0);
  const pct = total > 0 ? Math.min(100, Math.round((realizadas / total) * 100)) : 0;
  const fmtChip = (d: string) =>
    new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

  let contador = 0;

  return (
    <Card className="border-2 border-brand-teal/30 bg-brand-teal-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Ciclo de atendimentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-2xl font-semibold text-brand-teal-dark leading-tight">
              {realizadas === 0
                ? `Ciclo iniciando — 0 de ${total} sessões`
                : `${ordinal(atual)} de ${total} sessões do ciclo`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {alvo.macas ? `Maca ${alvo.macas.numero} — ${alvo.macas.nome}` : "Maca"}
              {alvo.status === "ativa"
                ? restantes === 0
                  ? " · ciclo completo"
                  : ` · faltam ${restantes} ${restantes === 1 ? "sessão" : "sessões"}`
                : " · ciclo encerrado"}
            </p>
          </div>
          {alvo.status === "ativa" && restantes <= 1 && (
            <Badge variant="outline" className="text-amber-700 border-amber-400 bg-amber-50">
              {restantes === 0 ? "Ciclo completo" : "Próximo do término"}
            </Badge>
          )}
        </div>

        <div className="h-2 w-full rounded-full bg-white/70 overflow-hidden">
          <div className="h-full rounded-full bg-brand-teal transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-2">Sessões registradas</div>
          <div className="flex flex-wrap gap-1.5">
            {doCiclo.length === 0 && (
              <span className="text-xs text-muted-foreground">Nenhum registro neste ciclo ainda.</span>
            )}
            {doCiclo.map((p) => {
              const st = styleFor(p.status);
              const conta = CONTA_SESSAO.has(p.status);
              if (conta) contador += 1;
              const data = p.sessoes?.data ?? p.created_at;
              return (
                <span
                  key={p.id}
                  title={`${st.label}${p.observacao ? ` — ${p.observacao}` : ""}`}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.cls}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                  {fmtChip(data)}
                  {conta && <span className="opacity-70">· {contador}ª</span>}
                </span>
              );
            })}
            {Array.from({ length: restantes }).map((_, i) => (
              <span
                key={`pend-${i}`}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-border" />
                {realizadas + i + 1}ª
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoricoCard({
  createdAt,
  dialogadorNome,
  designacoes,
  presencas,
  observacoes = [],
}: {
  createdAt: string;
  dialogadorNome: string | null;
  designacoes: DesignacaoHist[];
  presencas: PresencaHist[];
  observacoes?: ObservacaoHist[];
}) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR");
  const fmtDt = (d: string) => new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const macaById = new Map(designacoes.map((d) => [d.id, d.macas]));

  type Evt = { at: string; sortAt: string; titulo: string; detalhe?: string; autor?: string | null; cor?: string };
  const eventos: Evt[] = [];
  eventos.push({
    at: fmt(createdAt),
    sortAt: createdAt,
    titulo: "Diálogo fraterno",
    detalhe: "Cadastro do consulente",
    autor: dialogadorNome,
  });
  designacoes.forEach((d) => {
    const macaTxt = d.macas ? `Maca ${d.macas.numero} — ${d.macas.nome}` : "Maca";
    eventos.push({
      at: fmt(d.created_at),
      sortAt: d.created_at,
      titulo: "Designação criada",
      detalhe: macaTxt,
      autor: d.dialogador?.nome ?? null,
    });
    if (d.closed_at) {
      eventos.push({
        at: fmt(d.closed_at),
        sortAt: d.closed_at,
        titulo: d.status === "concluida" ? "Alta (ciclo encerrado)" : `Designação ${d.status}`,
        detalhe: macaTxt,
      });
    }
    if (d.reactivated_at) {
      eventos.push({
        at: fmt(d.reactivated_at),
        sortAt: d.reactivated_at,
        titulo: "Reativado",
        detalhe: `${macaTxt} — voltou aos atendimentos`,
      });
    }
  });
  presencas.forEach((p) => {
    const m = macaById.get(p.designacao_id);
    const dataSessao = p.sessoes?.data ? fmt(p.sessoes.data) : fmtDt(p.created_at);
    eventos.push({
      at: dataSessao,
      sortAt: p.sessoes?.data ?? p.created_at,
      titulo: styleFor(p.status).label,
      detalhe: [m ? `Maca ${m.numero}` : null, p.observacao || null].filter(Boolean).join(" · ") || undefined,
      autor: p.marcador?.nome ?? null,
      cor: styleFor(p.status).dot,
    });
  });
  observacoes.forEach((o) => {
    eventos.push({
      at: fmtDt(o.created_at),
      sortAt: o.created_at,
      titulo: "Observação registrada",
      detalhe: o.conteudo,
      autor: o.autor_nome,
      cor: "bg-brand-blue",
    });
  });
  eventos.sort((a, b) => (a.sortAt < b.sortAt ? 1 : -1));

  return (
    <Card>
      <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
      <CardContent>
        {eventos.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem registros.</p>
        )}
        <ol className="relative ml-2 border-l-2 border-border space-y-3">
          {eventos.map((e, i) => (
            <li key={i} className="relative pl-5 text-sm">
              <span
                className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ring-2 ring-background ${e.cor ?? "bg-primary/50"}`}
              />
              <div className="text-[11px] text-muted-foreground">{e.at}</div>
              <div className="font-medium">{e.titulo}</div>
              {e.detalhe && <div className="text-xs text-muted-foreground">{e.detalhe}</div>}
              {e.autor && <div className="text-xs text-muted-foreground">por {e.autor}</div>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

