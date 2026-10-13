import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Search, Plus, RotateCcw, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { TrabalhadorTratamentoDialog } from "@/components/TrabalhadorTratamentoDialog";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/consulentes/")({
  component: () => (
    <RequireAuth roles={["dialogador", "admin"]}>
      <ConsulentesList />
    </RequireAuth>
  ),
});

type SortCol = "nome" | "telefone" | "status" | "atendimentos" | "maca";
type SortDir = "asc" | "desc";

function ConsulentesList() {
  const [q, setQ] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [fNome, setFNome] = useState("");
  const [fTelefone, setFTelefone] = useState("");
  const [fStatus, setFStatus] = useState<"todos" | "ativo" | "inativo" | "alta">("todos");
  const [fMaca, setFMaca] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const resetPage = () => setPage(1);
  const { isAdmin, isDialogador, user } = useAuth();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["consulentes", q],
    queryFn: async () => {
      let req = supabase.from("consulentes")
        .select("id, nome, telefone, created_at, ideias_suicidas, dialogo_pendente, dialogador_id, alta_at, trabalhador, tratamento_distancia, designacoes(id, status, sessoes_realizadas, sessoes_totais, maca_id, created_at, closed_at, closure_reason, macas(numero, nome, cor_hex, dia))")
        .order("nome", { ascending: true })
        .limit(500);
      if (q) req = req.or(`nome.ilike.%${q}%,telefone.ilike.%${q}%`);
      const { data, error } = await req;
      if (error) throw error;
      return data;
    },
  });

  const reativar = async (consulenteId: string) => {
    const c = data?.find((x) => x.id === consulenteId);
    const designacoes = (c?.designacoes ?? []) as Array<{ id: string; status: string; closed_at: string | null }>;
    const ultimaCanc = designacoes
      .filter((d) => d.status === "cancelada")
      .sort((a, b) => +new Date(b.closed_at || 0) - +new Date(a.closed_at || 0))[0];
    if (!ultimaCanc) {
      toast.error("Nenhuma designação inativa para reativar.");
      return;
    }
    if (!(await confirm({
      title: "Reativar consulente?",
      description: "O consulente será reativado na mesma maca em que era atendido anteriormente.",
      tone: "info",
      confirmLabel: "Reativar",
    }))) return;
    const { error } = await supabase
      .from("designacoes")
      .update({
        status: "ativa",
        closed_at: null,
        sessoes_realizadas: 0,
        reactivated_at: new Date().toISOString(),
        reactivated_by: user?.id ?? null,
      })
      .eq("id", ultimaCanc.id);
    if (error) return toast.error(error.message);
    await supabase.from("consulentes").update({ dialogo_pendente: false }).eq("id", consulenteId);
    toast.success("Consulente reativado");
    qc.invalidateQueries({ queryKey: ["consulentes"] });
  };

  const sorted = useMemo(() => {
    if (!data) return data;
    let list = [...data];
    // Consulentes com alta ficam arquivados: saem da listagem padrão e só
    // aparecem em busca direta pelo nome ou no filtro de status "Alta".
    const temAlta = (c: typeof list[number]) => !!(c as { alta_at?: string | null }).alta_at;
    // Alta registrada: campo alta_at OU designação encerrada com motivo "alta"
    // (encaminhamento de alta feito pelo médium ainda aguarda confirmação do diálogo,
    // mas o status exibido já é "Alta").
    const temAltaStatus = (c: typeof list[number]) => {
      if (temAlta(c)) return true;
      const ds = (c.designacoes as Array<{ status: string; closed_at: string | null; closure_reason: string | null }> | null) ?? [];
      if (ds.some((d) => d.status === "ativa")) return false;
      const ultimaFechada = ds
        .filter((d) => d.status !== "ativa")
        .sort((a, b) => +new Date(b.closed_at || 0) - +new Date(a.closed_at || 0))[0];
      return ultimaFechada?.closure_reason === "alta";
    };
    const buscaNome = q.trim().toLowerCase();
    if (fStatus !== "alta") {
      list = list.filter((c) => !temAlta(c) || (buscaNome !== "" && c.nome?.toLowerCase().includes(buscaNome)));
    }
    const macaNum = (c: typeof list[number]) => {
      const ds = (c.designacoes as Array<{ status: string; macas: { numero: number } | null }> | null) ?? [];
      const ativa = ds.find((d) => d.status === "ativa");
      return ativa?.macas?.numero ?? Number.POSITIVE_INFINITY;
    };
    const isAtiva = (c: typeof list[number]) => {
      const ds = (c.designacoes as Array<{ status: string }> | null) ?? [];
      return ds.some((d) => d.status === "ativa");
    };
    const atendimentosDe = (c: typeof list[number]) => {
      const ds = (c.designacoes as Array<{ status: string; sessoes_realizadas: number; created_at: string }> | null) ?? [];
      const ativa = ds.find((d) => d.status === "ativa");
      const ultima = ativa ?? [...ds].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
      return ultima?.sessoes_realizadas ?? 0;
    };
    const cmpNome = (a: typeof list[number], b: typeof list[number]) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
    const isMeu = (c: typeof list[number]) =>
      !!user?.id && (c as { dialogador_id?: string | null }).dialogador_id === user.id;
    const prioridade = (c: typeof list[number]) => {
      const ds = (c.designacoes as Array<{ status: string }> | null) ?? [];
      const temAtiva = ds.some((d) => d.status === "ativa");
      const temCanc = ds.some((d) => d.status === "cancelada");
      const precisaAtencao = c.dialogo_pendente || (!temAtiva && temCanc);
      if (precisaAtencao && isMeu(c)) return 0;
      if (c.dialogo_pendente) return 1;
      if (!temAtiva && temCanc) return 2;
      return 3;
    };

    // filtros por coluna
    if (fNome) list = list.filter((c) => c.nome?.toLowerCase().includes(fNome.toLowerCase()));
    if (fTelefone) list = list.filter((c) => (c.telefone ?? "").toLowerCase().includes(fTelefone.toLowerCase()));
    if (fStatus !== "todos") {
      if (fStatus === "alta") list = list.filter((c) => temAltaStatus(c));
      else if (fStatus === "ativo") list = list.filter((c) => isAtiva(c) && !temAltaStatus(c));
      else list = list.filter((c) => !isAtiva(c) && !temAltaStatus(c));
    }
    if (fMaca) {
      const q = fMaca.toLowerCase();
      list = list.filter((c) => {
        const ds = (c.designacoes as Array<{ status: string; macas: { numero: number; nome: string } | null }> | null) ?? [];
        const d = ds.find((x) => x.status === "ativa") ?? ds.find((x) => x.status === "cancelada");
        const m = d?.macas;
        if (!m) return false;
        return String(m.numero).includes(q) || m.nome.toLowerCase().includes(q);
      });
    }

    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortCol) {
      case "nome": list.sort((a, b) => cmpNome(a, b) * dir); break;
      case "telefone": list.sort((a, b) => (a.telefone ?? "").localeCompare(b.telefone ?? "", "pt-BR") * dir); break;
      case "status": list.sort((a, b) => ((isAtiva(a) ? 0 : temAltaStatus(a) ? 1 : 2) - (isAtiva(b) ? 0 : temAltaStatus(b) ? 1 : 2)) * dir || cmpNome(a, b)); break;
      case "atendimentos": list.sort((a, b) => (atendimentosDe(a) - atendimentosDe(b)) * dir || cmpNome(a, b)); break;
      case "maca": list.sort((a, b) => (macaNum(a) - macaNum(b)) * dir || cmpNome(a, b)); break;
    }
    // sempre aplica prioridade no topo
    list.sort((a, b) => prioridade(a) - prioridade(b));
    return list;
  }, [data, sortCol, sortDir, fNome, fTelefone, fStatus, fMaca, user?.id, q]);

  const total = sorted?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginados = (sorted ?? []).slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const meuAtencaoCount = useMemo(() => {
    if (!sorted || !user?.id) return 0;
    return sorted.filter((c) => {
      const ds = (c.designacoes as Array<{ status: string }> | null) ?? [];
      const temAtiva = ds.some((d) => d.status === "ativa");
      const temCanc = ds.some((d) => d.status === "cancelada");
      const precisaAtencao = c.dialogo_pendente || (!temAtiva && temCanc);
      return precisaAtencao && (c as { dialogador_id?: string | null }).dialogador_id === user.id;
    }).length;
  }, [sorted, user?.id]);


  const atencaoCount = useMemo(() => {
    if (!sorted) return 0;
    return sorted.filter((c) => {
      const ds = (c.designacoes as Array<{ status: string }> | null) ?? [];
      const temAtiva = ds.some((d) => d.status === "ativa");
      const temCanc = ds.some((d) => d.status === "cancelada");
      return c.dialogo_pendente || (!temAtiva && temCanc);
    }).length;
  }, [sorted]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Consulentes</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {(isAdmin || isDialogador) && <TrabalhadorTratamentoDialog />}
          <Link to="/dialogo/novo">
            <Button size="sm" className="shadow-sm hover:shadow-md transition-shadow">
              <Plus className="h-4 w-4 mr-1.5" /> Novo consulente
            </Button>
          </Link>
        </div>
      </div>


      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou telefone" value={q} onChange={(e) => { setQ(e.target.value); resetPage(); }} />
        </div>
      </div>

      {meuAtencaoCount > 0 && (
        <div className="text-xs text-rose-900 bg-rose-50 border-l-4 border-rose-400 rounded-md px-3 py-2 font-medium">
          {meuAtencaoCount} encaminhado{meuAtencaoCount === 1 ? "" : "s"} para você (retorno ao diálogo ou alta) — destacado{meuAtencaoCount === 1 ? "" : "s"} no topo.
        </div>
      )}
      {atencaoCount > 0 && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {atencaoCount} consulente{atencaoCount === 1 ? "" : "s"} requer{atencaoCount === 1 ? "" : "em"} atenção do diálogo (pendentes ou inativos) — listados no topo.
        </div>
      )}


      <Card className="overflow-hidden hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Nome" col="nome" sortCol={sortCol} sortDir={sortDir} onToggle={toggleSort} />
              <SortableHead label="Telefone" col="telefone" sortCol={sortCol} sortDir={sortDir} onToggle={toggleSort} />
              <SortableHead label="Status" col="status" sortCol={sortCol} sortDir={sortDir} onToggle={toggleSort} />
              <SortableHead label="Atendimentos" col="atendimentos" sortCol={sortCol} sortDir={sortDir} onToggle={toggleSort} align="center" />
              <SortableHead label="Maca atual" col="maca" sortCol={sortCol} sortDir={sortDir} onToggle={toggleSort} />
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-2">
                <Input value={fNome} onChange={(e) => { setFNome(e.target.value); resetPage(); }} placeholder="Filtrar nome" className="h-7 text-xs" />
              </TableHead>
              <TableHead className="py-2">
                <Input value={fTelefone} onChange={(e) => { setFTelefone(e.target.value); resetPage(); }} placeholder="Filtrar telefone" className="h-7 text-xs" />
              </TableHead>
              <TableHead className="py-2">
                <Select value={fStatus} onValueChange={(v) => { setFStatus(v as typeof fStatus); resetPage(); }}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </TableHead>
              <TableHead className="py-2" />
              <TableHead className="py-2">
                <Input value={fMaca} onChange={(e) => { setFMaca(e.target.value); resetPage(); }} placeholder="Filtrar maca" className="h-7 text-xs" />
              </TableHead>
              <TableHead className="py-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginados.map((c) => {
              const designacoes = (c.designacoes as Array<{ id: string; status: string; sessoes_realizadas: number; sessoes_totais: number; created_at: string; closed_at: string | null; closure_reason: string | null; macas: { numero: number; nome: string; cor_hex: string; dia: string | null } | null }> | null) ?? [];
              const ativas = designacoes.filter((d) => d.status === "ativa");
              const ativa = ativas[0];
              const ultima = ativa ?? [...designacoes].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
              const ultimaCanc = !ativa
                ? designacoes
                    .filter((d) => d.status === "cancelada")
                    .sort((a, b) => +new Date(b.closed_at || 0) - +new Date(a.closed_at || 0))[0]
                : undefined;
              const ultimaConcluida = !ativa && !ultimaCanc
                ? designacoes
                    .filter((d) => d.status === "concluida")
                    .sort((a, b) => +new Date(b.closed_at || 0) - +new Date(a.closed_at || 0))[0]
                : undefined;
              const ultimaFechada = !ativa
                ? designacoes
                    .filter((d) => d.status !== "ativa")
                    .sort((a, b) => +new Date(b.closed_at || 0) - +new Date(a.closed_at || 0))[0]
                : undefined;
              const inativoComMaca = !ativa && !!ultimaCanc;
              const encerrado = !ativa && !ultimaCanc && designacoes.some((d) => d.status === "concluida");
              const proximoFim = ativa ? (ativa.sessoes_totais - ativa.sessoes_realizadas <= 1 && ativa.sessoes_realizadas < ativa.sessoes_totais) : false;
              const isAlta = !!(c as { alta_at?: string | null }).alta_at;
              // Status "Alta": alta concedida OU designação encerrada com motivo "alta"
              const isAltaStatus = isAlta || (!ativa && ultimaFechada?.closure_reason === "alta");
              // Distinção dos tipos de pendência:
              const isDialogoAlta = !isAlta && c.dialogo_pendente && (ultimaConcluida?.closure_reason === "alta" || (encerrado && !inativoComMaca));
              const isEncaminhadoDialogo = !isAlta && inativoComMaca && ultimaCanc?.closure_reason === "encaminhamento_dialogo";
              const isInativoFalta = !isAlta && inativoComMaca && ultimaCanc?.closure_reason !== "encaminhamento_dialogo";
              const meuEncaminhamento = !isAlta && !!user?.id && (c as { dialogador_id?: string | null }).dialogador_id === user.id && (isEncaminhadoDialogo || isDialogoAlta);
              const rowTone = isAlta
                ? "bg-emerald-50 hover:bg-emerald-100"
                : meuEncaminhamento
                  ? "bg-rose-100 hover:bg-rose-200 ring-2 ring-inset ring-rose-300"
                  : isDialogoAlta
                    ? "bg-brand-teal-muted/60 hover:bg-brand-teal-muted"
                    : isEncaminhadoDialogo
                      ? "bg-amber-50 hover:bg-amber-100"
                      : isInativoFalta
                        ? "bg-rose-50 hover:bg-rose-100"
                        : c.dialogo_pendente
                          ? "bg-amber-50 hover:bg-amber-100"
                          : encerrado
                            ? "bg-brand-teal-muted/60 hover:bg-brand-teal-muted"
                            : proximoFim
                              ? "bg-brand-gold-muted/60 hover:bg-brand-gold-muted"
                              : "hover:bg-muted/40";
              const totalLifetime = designacoes.reduce((acc, d) => acc + (d.sessoes_realizadas ?? 0), 0);
              const ciclos = designacoes.length;
              const atendimentos = ultima?.sessoes_realizadas ?? 0;
              const total = ultima?.sessoes_totais ?? 8;
              const macasAtivas = ativas
                .map((d) => d.macas)
                .filter((m): m is NonNullable<typeof m> => !!m)
                .sort((a, b) => (a.dia === "terca" ? 0 : 1) - (b.dia === "terca" ? 0 : 1));
              const macaFallback = ultimaCanc?.macas ?? null;
              return (
                <TableRow key={c.id} className={cn("transition-colors", rowTone)}>
                  <TableCell className="p-0">
                    <Link to="/consulentes/$id" params={{ id: c.id }} className="block px-4 py-3">
                      <div className="font-medium flex items-center gap-2 flex-wrap">
                        {meuEncaminhamento && (
                          <Badge className="text-[10px] bg-rose-600 hover:bg-rose-600 text-white">
                            Para você
                          </Badge>
                        )}
                        {c.nome}
                        {(c as { trabalhador?: boolean }).trabalhador && (
                          <Badge className="text-[10px] bg-brand-blue hover:bg-brand-blue text-white uppercase">
                            Trab
                          </Badge>
                        )}
                        {(c as { tratamento_distancia?: boolean }).tratamento_distancia && (
                          <Badge className="text-[10px] bg-brand-teal hover:bg-brand-teal text-white uppercase">
                            Dist
                          </Badge>
                        )}

                        {c.ideias_suicidas && !isAlta && (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" />Alerta
                          </Badge>
                        )}
                        {isDialogoAlta && (
                          <Badge variant="outline" className="text-xs border-emerald-400 text-emerald-800 bg-emerald-100">
                            Encaminhado para Alta
                          </Badge>
                        )}
                        {isEncaminhadoDialogo && (
                          <Badge variant="outline" className="text-xs border-orange-400 text-orange-800 bg-orange-100">
                            Encaminhado para diálogo
                          </Badge>
                        )}
                        {isInativoFalta && (
                          <Badge variant="outline" className="text-xs border-gray-300 text-gray-700 bg-gray-100">
                            Ausente - precisa diálogo
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.telefone || "—"}</TableCell>
                  <TableCell>
                    {isAltaStatus ? (
                      <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600 text-white">Alta</Badge>
                    ) : ativa ? (
                      <Badge variant="outline" className="text-xs border-brand-teal text-brand-teal-dark bg-brand-teal-muted">Ativo</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums">
                    <div className="font-medium">{atendimentos}</div>
                    {proximoFim && (
                      <div className="text-[11px] text-brand-gold-dark font-medium">próximo de encerrar o ciclo</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {macasAtivas.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {macasAtivas.map((m) => (
                          <span
                            key={m.numero}
                            className="inline-block px-2 py-1 rounded-lg text-xs font-medium text-white shadow-sm"
                            style={{ backgroundColor: m.cor_hex }}
                          >
                            Maca {m.numero} · {m.nome}
                            {m.dia && (
                              <span className="ml-1 opacity-90">({m.dia === "terca" ? "terça" : "sábado"})</span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : macaFallback ? (
                      <span
                        className="inline-block px-2 py-1 rounded-lg text-xs font-medium text-white shadow-sm opacity-60"
                        style={{ backgroundColor: macaFallback.cor_hex }}
                      >
                        Maca {macaFallback.numero} · {macaFallback.nome}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {inativoComMaca && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-2"
                        onClick={() => reativar(c.id)}
                      >
                        <RotateCcw className="h-3 w-3" /> Reativar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {total === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum consulente encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Lista mobile em cartões */}
      <div className="md:hidden space-y-3">
        {paginados.map((c) => {
          const ds = (c.designacoes as Array<{ status: string; sessoes_realizadas: number; sessoes_totais: number; created_at: string; closed_at: string | null; closure_reason: string | null; macas: { numero: number; nome: string; cor_hex: string; dia: string | null } | null }> | null) ?? [];
          const ativas = ds.filter((d) => d.status === "ativa");
          const ativa = ativas[0];
          const isAlta = !!(c as { alta_at?: string | null }).alta_at;
          const atendimentos = ativa?.sessoes_realizadas ?? ds.reduce((a, d) => Math.max(a, d.sessoes_realizadas ?? 0), 0);
          const ultimaCanc = !ativa
            ? ds
                .filter((d) => d.status === "cancelada")
                .sort((a, b) => +new Date(b.closed_at || 0) - +new Date(a.closed_at || 0))[0]
            : undefined;
          const ultimaConcluida = !ativa && !ultimaCanc
            ? ds
                .filter((d) => d.status === "concluida")
                .sort((a, b) => +new Date(b.closed_at || 0) - +new Date(a.closed_at || 0))[0]
            : undefined;
          const ultimaFechada = !ativa
            ? ds
                .filter((d) => d.status !== "ativa")
                .sort((a, b) => +new Date(b.closed_at || 0) - +new Date(a.closed_at || 0))[0]
            : undefined;
          const inativoComMaca = !ativa && !!ultimaCanc;
          const encerrado = !ativa && !ultimaCanc && ds.some((d) => d.status === "concluida");
          const isDialogoAlta = !isAlta && c.dialogo_pendente && (ultimaConcluida?.closure_reason === "alta" || (encerrado && !inativoComMaca));
          const isEncaminhadoDialogo = !isAlta && inativoComMaca && ultimaCanc?.closure_reason === "encaminhamento_dialogo";
          const isInativoFalta = !isAlta && inativoComMaca && ultimaCanc?.closure_reason !== "encaminhamento_dialogo";
          const meuEncaminhamento = !isAlta && !!user?.id && (c as { dialogador_id?: string | null }).dialogador_id === user.id && (isEncaminhadoDialogo || isDialogoAlta);
          const proximoFim = ativa ? (ativa.sessoes_totais - ativa.sessoes_realizadas <= 1 && ativa.sessoes_realizadas < ativa.sessoes_totais) : false;
          // Status "Alta": alta concedida OU designação encerrada com motivo "alta"
          const isAltaStatus = isAlta || (!ativa && ultimaFechada?.closure_reason === "alta");

          const statusConfig = isAltaStatus
            ? { label: "Alta", bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", muted: false }
            : ativas.length > 0
              ? { label: "Ativo", bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", muted: false }
              : { label: "Inativo", bar: "bg-slate-300", badge: "bg-slate-200 text-slate-500", muted: true };

          return (
            <Link key={c.id} to="/consulentes/$id" params={{ id: c.id }} className="block">
              <Card className={cn(
                "rounded-xl shadow-sm border overflow-hidden active:bg-muted/50 transition-colors",
                statusConfig.muted ? "bg-slate-50/80 border-slate-200" : "bg-white border-slate-100"
              )}>
                <div className="flex">
                  <div className={cn("w-1.5 shrink-0", statusConfig.bar)} />
                  <div className="p-4 w-full min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className={cn("text-base font-semibold leading-tight", statusConfig.muted ? "text-slate-600" : "text-slate-900")}>
                          {c.nome}
                        </h3>
                        <p className={cn("text-sm font-medium mt-0.5", statusConfig.muted ? "text-slate-400" : "text-slate-500")}>
                          {c.telefone || "Sem telefone"}
                        </p>
                      </div>
                      <span className={cn("shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", statusConfig.badge)}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-tight">Maca</span>
                        {ativa?.macas ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 truncate">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: ativa.macas.cor_hex }}
                            />
                            <span className="truncate">Maca {ativa.macas.numero} · {ativa.macas.nome}</span>
                          </span>
                        ) : ultimaCanc?.macas ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 truncate">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full shrink-0 opacity-60"
                              style={{ backgroundColor: ultimaCanc.macas.cor_hex }}
                            />
                            <span className="truncate">Maca {ultimaCanc.macas.numero} · {ultimaCanc.macas.nome}</span>
                          </span>
                        ) : (
                          <span className={cn("text-sm italic", statusConfig.muted ? "text-slate-400" : "text-slate-400")}>Nenhuma</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-tight">Atendimentos</span>
                        <span className={cn("text-sm font-semibold tabular-nums", statusConfig.muted ? "text-slate-500" : "text-slate-700")}>
                          {atendimentos} {atendimentos === 1 ? "sessão" : "sessões"}
                        </span>
                        {proximoFim && (
                          <span className="text-[10px] font-medium text-amber-600">Próximo do fim</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {meuEncaminhamento && (
                        <Badge className="text-[10px] bg-rose-600 text-white hover:bg-rose-600">
                          Para você
                        </Badge>
                      )}
                      {isDialogoAlta && (
                        <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-800 bg-emerald-100">
                          Encaminhado para Alta
                        </Badge>
                      )}
                      {isEncaminhadoDialogo && (
                        <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-800 bg-amber-100">
                          Encaminhado para diálogo
                        </Badge>
                      )}
                      {isInativoFalta && (
                        <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-700 bg-slate-100">
                          Ausente - precisa diálogo
                        </Badge>
                      )}
                      {(c as { trabalhador?: boolean }).trabalhador && (
                        <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-50">
                          Trabalhador
                        </Badge>
                      )}
                      {(c as { tratamento_distancia?: boolean }).tratamento_distancia && (
                        <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-50">
                          Tratamento à distância
                        </Badge>
                      )}
                      {c.ideias_suicidas && !isAlta && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertTriangle className="h-3 w-3" /> Alerta
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
        {total === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground rounded-xl">Nenhum consulente encontrado.</Card>
        )}
      </div>

      {fStatus !== "alta" && !q.trim() && (
        <p className="text-xs text-muted-foreground">
          Exibindo apenas consulentes em atendimento (sem alta). Consulentes que receberam alta ficam arquivados — use a busca pelo nome ou o filtro de status “Alta” para localizá-los.
        </p>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
          <span className="text-muted-foreground">
            Mostrando {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, total)} de {total} consulentes
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={pageSafe <= 1} onClick={() => setPage(pageSafe - 1)}>
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">Página {pageSafe} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={pageSafe >= totalPages} onClick={() => setPage(pageSafe + 1)}>
                Próxima
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SortableHead({ label, col, sortCol, sortDir, onToggle, align }: {
  label: string;
  col: SortCol;
  sortCol: SortCol;
  sortDir: SortDir;
  onToggle: (c: SortCol) => void;
  align?: "left" | "center" | "right";
}) {
  const active = sortCol === col;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return (
    <TableHead className={align === "center" ? "text-center" : align === "right" ? "text-right" : ""}>
      <button
        type="button"
        onClick={() => onToggle(col)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          active ? "text-foreground font-semibold" : "text-muted-foreground"
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}
