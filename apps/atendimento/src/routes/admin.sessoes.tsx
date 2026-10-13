import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Sparkles, Pencil, Save, X, Trash2, ShieldAlert } from "lucide-react";
import { CabecalhoPagina } from "@/compartilhado";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { MacaCategoriaTag } from "@/lib/maca-categoria";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  getAtendimentoDatesIsoAteHoje,
  formatDataExtenso,
  diaLabelFromIso,
  ATENDIMENTO_DATES_ISO,
} from "@/lib/atendimento-dates";

export const Route = createFileRoute("/admin/sessoes")({
  component: () => (
    <RequireAuth roles={["admin", "medium"]}>
      <Sessoes />
    </RequireAuth>
  ),
});

function Sessoes() {
  const { isAdmin, isMedium } = useAuth();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [openId, setOpenId] = useState<string | null>(null);
  const [diaFiltro, setDiaFiltro] = useState<"todos" | "terca" | "sabado">("todos");
  const [buscaData, setBuscaData] = useState("");

  const excluir = async (sessaoId: string, dataFmt: string) => {
    const ok = await confirm({
      title: "Excluir atendimento?",
      description: `Esta ação removerá o atendimento de ${dataFmt} e todas as presenças registradas nele. Não pode ser desfeita.`,
      tone: "danger",
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    const { error } = await supabase.from("sessoes").delete().eq("id", sessaoId);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Atendimento excluído");
    qc.invalidateQueries({ queryKey: ["admin-sessoes"] });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-sessoes"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessoes")
        .select("id, data, tipo, presencas(status)")
        .order("data", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data;
    },
  });

  const listaFiltrada = (data ?? []).filter((s) => {
    if (diaFiltro !== "todos") {
      const dow = new Date(s.data + "T00:00:00").getDay();
      if (diaFiltro === "terca" && dow !== 2) return false;
      if (diaFiltro === "sabado" && dow !== 6) return false;
    }
    if (buscaData.trim()) {
      const termo = buscaData.trim().toLowerCase();
      const br = new Date(s.data + "T00:00:00").toLocaleDateString("pt-BR");
      const extenso = formatDataExtenso(s.data).toLowerCase();
      if (!s.data.includes(termo) && !br.includes(termo) && !extenso.includes(termo)) return false;
    }
    return true;
  });

  const grouped = groupByMesAno(listaFiltrada);

  // Fila real de trabalho: datas válidas até hoje sem nenhum lançamento.
  const pendentes = (() => {
    const porData = new Map<string, number>();
    for (const s of data ?? []) {
      porData.set(s.data, (s.presencas ?? []).length);
    }
    return getAtendimentoDatesIsoAteHoje()
      .filter((iso) => (porData.get(iso) ?? 0) === 0)
      .sort()
      .reverse();
  })();

  return (
    <>
      <CabecalhoPagina
        titulo="Atendimentos realizados"
        acoes={(isMedium || isAdmin) ? <NovoAtendimentoButton /> : undefined}
      />
      <div className="space-y-6">

      {isAdmin && (
        <Card className="p-3 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Dia</span>
          <div className="flex gap-1">
            {([["todos", "Todos"], ["terca", "Terça"], ["sabado", "Sábado"]] as const).map(([v, label]) => (
              <Button
                key={v}
                size="sm"
                variant={diaFiltro === v ? "default" : "outline"}
                onClick={() => setDiaFiltro(v)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex-1 min-w-[200px]">
            <Input
              value={buscaData}
              onChange={(e) => setBuscaData(e.target.value)}
              placeholder="Buscar data (ex.: 11/07/2026, 2026-07-11 ou julho)"
              aria-label="Buscar atendimento por data"
            />
          </div>
          {(diaFiltro !== "todos" || buscaData) && (
            <Button size="sm" variant="ghost" onClick={() => { setDiaFiltro("todos"); setBuscaData(""); }}>
              Limpar
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {listaFiltrada.length} atendimento{listaFiltrada.length === 1 ? "" : "s"}
          </span>
        </Card>
      )}

      {isAdmin && isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Carregando atendimentos">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isAdmin && !isLoading && listaFiltrada.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          Nenhum atendimento encontrado para este filtro.
        </Card>
      )}

      {!isAdmin && (
        <Card className="p-4 text-sm text-muted-foreground">
          Use "Novo atendimento" para abrir o registro de presenças de uma das suas macas.
        </Card>
      )}

      {isAdmin && pendentes.length > 0 && (
        <Card className="p-4 space-y-3 border-amber-300 bg-amber-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-800" />
            <h2 className="text-lg font-semibold font-['Playfair_Display'] text-amber-800">
              Pendentes de lançamento ({pendentes.length})
            </h2>
          </div>
          <p className="text-xs text-amber-800">
            Dias válidos de atendimento que já aconteceram e ainda não têm nenhuma presença lançada.
          </p>
          <div className="flex flex-wrap gap-2">
            {pendentes.map((iso) => (
              <Badge key={iso} variant="outline" className="bg-card border-amber-300 text-amber-800">
                {formatDataExtenso(iso)}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-8">
        {grouped.map(({ chave, label, sessoes }) => (
          <div key={chave} className="space-y-3">
            <h2 className="text-lg font-semibold font-['Playfair_Display'] text-foreground">
              {label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessoes.map((s) => {
                const presencas = (s.presencas ?? []) as { status: string }[];
                const total = presencas.length;
                const presentes = presencas.filter((p) => p.status === "presente").length;
                const faltas = presencas.filter((p) => p.status === "ausente").length;
                const justificadas = presencas.filter((p) => p.status === "falta_justificada").length;
                const emerg = presencas.filter((p) => p.status === "emergencia").length;
                const distancia = presencas.filter((p) => p.status === "atendimento_distancia").length;
                const dataObj = new Date(s.data + "T00:00:00");
                const diaSemana = dataObj.toLocaleDateString("pt-BR", { weekday: "long" });
                const dataFmt = dataObj.toLocaleDateString("pt-BR");
                return (
                  <Card
                    key={s.id}
                    onClick={() => setOpenId(s.id)}
                    className="p-0 overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/30 transition-shadow"
                  >
                    <div className="border-b bg-muted px-4 py-3 flex items-start justify-between gap-2">
                      <div>
                        <div className="font-['Playfair_Display'] text-foreground font-semibold text-lg">{dataFmt}</div>
                        <div className="text-muted-foreground text-xs capitalize">{diaSemana}</div>
                      </div>
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); void excluir(s.id, dataFmt); }}
                          title="Excluir atendimento"
                          aria-label="Excluir atendimento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          {diaLabelFromIso(s.data)}
                        </Badge>
                        {!ATENDIMENTO_DATES_ISO.includes(s.data) && (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/40 text-[10px] gap-1">
                            <ShieldAlert className="h-3 w-3" /> Fora do calendário
                          </Badge>
                        )}
                        {total === 0 && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                            Pendente de lançamento
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-emerald-100 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold text-emerald-800">{presentes}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">Presentes</div>
                        </div>
                        <div className="bg-primary/10 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold text-primary">{total}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">Total</div>
                        </div>
                        {faltas > 2 && (
                          <div className="bg-destructive/10 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-destructive">{faltas}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">Faltas</div>
                          </div>
                        )}
                        {justificadas > 2 && (
                          <div className="bg-amber-100 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-amber-800">{justificadas}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">Justificadas</div>
                          </div>
                        )}
                        {distancia > 2 && (
                          <div className="bg-sky-100 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-sky-800">{distancia}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">À distância</div>
                          </div>
                        )}
                        {emerg > 2 && (
                          <div className="bg-destructive/10 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-destructive">{emerg}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">Emergência</div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground text-center pt-1">
                        Clique para ver detalhes
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
        {isAdmin && data?.length === 1 && (
          <p className="text-sm text-muted-foreground">Nenhum atendimento registrado.</p>
        )}
      </div>

      <SessaoDetalheDialog
        sessaoId={openId}
        onClose={() => setOpenId(null)}
      />
      </div>
    </>
  );
}

function groupByMesAno(
  sessoes: { data: string; [k: string]: any }[]
): { chave: string; label: string; sessoes: typeof sessoes }[] {
  const map = new Map<string, typeof sessoes>();
  for (const s of sessoes) {
    const d = new Date(s.data + "T00:00:00");
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(chave)) map.set(chave, []);
    map.get(chave)!.push(s);
  }
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const sorted = Array.from(map.entries()).sort((a, b) => (a[1] < b[1] ? 1 : -1));
  return sorted.map(([chave, sessoes]) => {
    const [ano, mes] = chave.split("-");
    return { chave, label: `${meses[parseInt(mes, 10) - 1]} de ${ano}`, sessoes };
  });
}

const STATUS_LABEL: Record<string, string> = {
  presente: "Presente",
  ausente: "Falta",
  falta_justificada: "Falta justificada",
  emergencia: "Emergência",
  atendimento_distancia: "Atendimento à distância",
};

function fmtDateTime(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR");
}

function SessaoDetalheDialog({
  sessaoId,
  onClose,
}: {
  sessaoId: string | null;
  onClose: () => void;
}) {
  const { isAdmin, isDialogador } = useAuth();
  const canEdit = isAdmin || isDialogador;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["sessao-detalhe", sessaoId],
    enabled: !!sessaoId,
    queryFn: async () => {
      const { data: sessao, error: e1 } = await supabase
        .from("sessoes")
        .select("id, data, tipo, admin_editado, updated_at, updated_by")
        .eq("id", sessaoId!)
        .maybeSingle();
      if (e1) throw e1;

      const { data: presencas, error: e2 } = await supabase
        .from("presencas")
        .select(
          "id, status, observacao, admin_editado, created_at, created_by, updated_at, updated_by, designacao_id, designacoes(consulente_id, maca_id, consulentes(nome), macas(numero, nome, cor_hex, categoria))",
        )
        .eq("sessao_id", sessaoId!);
      if (e2) throw e2;

      // Carrega perfis dos editores/criadores
      const userIds = Array.from(
        new Set(
          [
            ...(presencas ?? []).flatMap((p: any) => [p.created_by, p.updated_by]),
            sessao?.updated_by,
          ].filter(Boolean),
        ),
      );
      let profilesById: Record<string, { nome: string; email: string; como_chamar: string | null }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nome, email, como_chamar")
          .in("id", userIds);
        profilesById = Object.fromEntries(
          (profs ?? []).map((p) => [p.id, { nome: p.nome, email: p.email, como_chamar: p.como_chamar }]),
        );
      }
      return { sessao, presencas: presencas ?? [], profilesById };
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editObs, setEditObs] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Edição da própria sessão (data/tipo) — admin only
  const [editSessao, setEditSessao] = useState(false);
  const [sData, setSData] = useState<string>("");
  const [sTipo, setSTipo] = useState<string>("");
  const [savingSessao, setSavingSessao] = useState(false);

  useEffect(() => {
    if (data?.sessao) {
      setSData(data.sessao.data);
      setSTipo(data.sessao.tipo);
    }
  }, [data?.sessao]);

  useEffect(() => {
    if (!sessaoId) {
      setEditingId(null);
    }
  }, [sessaoId]);

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditStatus(p.status);
    setEditObs(p.observacao ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const salvar = async (presencaId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("presencas")
      .update({ status: editStatus as any, observacao: editObs || null })
      .eq("id", presencaId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Registro atualizado");
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["sessao-detalhe", sessaoId] });
    qc.invalidateQueries({ queryKey: ["admin-sessoes"] });
  };

  const salvarSessao = async () => {
    if (!data?.sessao) return;
    setSavingSessao(true);
    const { error } = await supabase
      .from("sessoes")
      .update({ data: sData, tipo: sTipo as any })
      .eq("id", data.sessao.id);
    setSavingSessao(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Atendimento atualizado");
    setEditSessao(false);
    qc.invalidateQueries({ queryKey: ["sessao-detalhe", sessaoId] });
    qc.invalidateQueries({ queryKey: ["admin-sessoes"] });
  };

  const sessaoEditor = data?.sessao?.updated_by
    ? data.profilesById[data.sessao.updated_by]?.como_chamar ||
      data.profilesById[data.sessao.updated_by]?.nome ||
      "—"
    : null;

  return (
    <Dialog open={!!sessaoId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>
              Atendimento de{" "}
              {data?.sessao
                ? new Date(data.sessao.data + "T00:00:00").toLocaleDateString("pt-BR")
                : "—"}
            </span>
            {data?.sessao?.admin_editado && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 gap-1">
                <ShieldAlert className="h-3 w-3" /> Editado pelo administrador
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {data?.sessao ? formatDataExtenso(data.sessao.data) : ""}
          </DialogDescription>
        </DialogHeader>

        {isAdmin && data?.sessao && (
          <Card className="p-3 space-y-2 border-amber-300 bg-amber-50">
            {!editSessao ? (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs text-muted-foreground">
                  Acesso irrestrito de administrador. Corrija a data ou o tipo caso o atendimento tenha sido registrado errado.
                  {sessaoEditor && (
                    <div className="mt-1">
                      Última edição por <b>{sessaoEditor}</b> em {fmtDateTime(data.sessao.updated_at)}
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditSessao(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar data / tipo
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium">Data</label>
                    <Input type="date" value={sData} onChange={(e) => setSData(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Tipo</label>
                    <Select value={sTipo} onValueChange={setSTipo}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="terca">Terça</SelectItem>
                        <SelectItem value="sabado">Sábado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditSessao(false)} disabled={savingSessao} className="gap-1">
                    <X className="h-3.5 w-3.5" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={salvarSessao} disabled={savingSessao} className="gap-1">
                    <Save className="h-3.5 w-3.5" /> {savingSessao ? "Salvando…" : "Salvar"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

        {!isLoading && data?.presencas?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma presença registrada neste atendimento.
          </p>
        )}

        <div className="space-y-2">
          {data?.presencas?.map((p: any) => {
            const consulNome = p.designacoes?.consulentes?.nome ?? "—";
            const maca = p.designacoes?.macas;
            const criador = data.profilesById[p.created_by]?.como_chamar || data.profilesById[p.created_by]?.nome || "—";
            const editor = p.updated_by
              ? data.profilesById[p.updated_by]?.como_chamar || data.profilesById[p.updated_by]?.nome || "—"
              : null;
            const isEditing = editingId === p.id;
            return (
              <Card key={p.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm">{consulNome}</div>
                    {maca && (
                      <div
                        className="inline-flex items-center gap-1.5 text-[11px] rounded px-1.5 py-0.5"
                        style={{
                          backgroundColor: maca.cor_hex + "22",
                          color: maca.cor_hex,
                        }}
                      >
                        <span className="font-bold">Maca {maca.numero}</span>
                        <span>· {maca.nome}</span>
                        <MacaCategoriaTag numero={maca.numero} categoria={maca.categoria} className="ml-1" />
                      </div>
                    )}
                  </div>
                  {canEdit && !isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => startEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                  )}
                </div>

                {!isEditing ? (
                  <>
                    <div className="text-xs">
                      <span className="font-medium">Status:</span>{" "}
                      {STATUS_LABEL[p.status] ?? p.status}
                    </div>
                    {p.observacao && (
                      <div className="text-xs whitespace-pre-wrap">
                        <span className="font-medium">Observação:</span> {p.observacao}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium">Status</label>
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABEL).map(([v, l]) => (
                            <SelectItem key={v} value={v}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Observação</label>
                      <Textarea
                        value={editObs}
                        onChange={(e) => setEditObs(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="gap-1"
                      >
                        <X className="h-3.5 w-3.5" /> Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => salvar(p.id)}
                        disabled={saving}
                        className="gap-1"
                      >
                        <Save className="h-3.5 w-3.5" />{" "}
                        {saving ? "Salvando…" : "Salvar"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground border-t pt-1.5 space-y-0.5">
                  <div>
                    Registrado por <b>{criador}</b> em {fmtDateTime(p.created_at)}
                  </div>
                  {editor && (
                    <div>
                      Editado por <b>{editor}</b> em {fmtDateTime(p.updated_at)}
                    </div>
                  )}
                  {p.admin_editado && (
                    <div className="inline-flex items-center gap-1 text-amber-800 font-medium">
                      <ShieldAlert className="h-3 w-3" /> Editado pelo administrador
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NovoAtendimentoButton() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: macas, isLoading } = useQuery({
    queryKey: ["novo-atendimento-macas", user?.id, isAdmin, open],
    enabled: !!user && open,
    queryFn: async () => {
      const { data: assigned } = await supabase
        .from("maca_mediuns")
        .select("maca_id")
        .eq("user_id", user!.id);
      const ids = (assigned ?? []).map((r) => r.maca_id);

      let query = supabase
        .from("macas")
        .select("id, numero, nome, cor_hex, dia, categoria")
        .eq("ativa", true)
        .order("dia")
        .order("numero");

      if (!isAdmin) {
        if (!ids.length) return [];
        query = query.in("id", ids);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Novo atendimento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Novo atendimento
          </DialogTitle>
          <DialogDescription>
            Escolha a maca para abrir o registro de presenças.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando macas…</p>}
        {!isLoading && macas && macas.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Você não está atribuído a nenhuma maca.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
          {macas?.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setOpen(false);
                navigate({ to: "/medium/maca/$id", params: { id: m.id } });
              }}
              className="text-left rounded-lg border-2 p-3 hover:shadow-md transition-shadow"
              style={{ borderColor: m.cor_hex, backgroundColor: m.cor_hex + "18" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="rounded h-9 w-9 flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: m.cor_hex, color: "#fff" }}
                >
                  {m.numero}
                </div>
                <div>
                  <div className="text-sm font-medium leading-tight flex items-center gap-2 flex-wrap">
                    <span>{m.nome}</span>
                    <MacaCategoriaTag numero={m.numero} categoria={m.categoria} />
                  </div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {m.dia === "terca" ? "Terça-feira" : "Sábado"}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
