import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { diaLabel, type DiaTrabalho } from "@/lib/sessao";
import { Sparkles, X, UserPlus } from "lucide-react";
import { CabecalhoPagina } from "@/compartilhado";
import { criarUsuarioMedium } from "@/lib/macas.functions";
import { MacaCategoriaTag, type MacaCategoria } from "@/lib/maca-categoria";
import { useServerFn } from "@/lib/server-fn";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/admin/macas")({
  component: () => (
    <RequireAuth roles={["admin"]}>
      <MacasAdmin />
    </RequireAuth>
  ),
});

type MediumUser = { id: string; nome: string; email: string; como_chamar: string | null };
type MacaRow = {
  id: string;
  numero: number;
  nome: string;
  cor_hex: string;
  dia: DiaTrabalho;
  ativa: boolean;
  lotacao_max: number;
  categoria: MacaCategoria;
  finalidade?: string | null;
};

function MacasAdmin() {
  const qc = useQueryClient();

  const { data: macas } = useQuery({
    queryKey: ["admin-macas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("macas").select("*").order("numero");
      if (error) throw error;
      return data as MacaRow[];
    },
  });

  // Todos os usuários com papel "medium"
  const { data: mediumUsers } = useQuery({
    queryKey: ["medium-users"],
    queryFn: async () => {
      const { data: roleRows, error } = await supabase
        .from("user_roles").select("user_id").eq("role", "medium");
      if (error) throw error;
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (!ids.length) return [] as MediumUser[];
      const { data: profs } = await supabase
        .from("profiles").select("id, nome, email, como_chamar").in("id", ids).order("nome");
      return (profs ?? []) as MediumUser[];
    },
  });

  // Atribuições maca → médiuns
  const { data: assignments } = useQuery({
    queryKey: ["maca-mediuns-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("maca_mediuns").select("maca_id, user_id");
      if (error) throw error;
      const map = new Map<string, string[]>();
      (data ?? []).forEach((r) => {
        const arr = map.get(r.maca_id) ?? [];
        arr.push(r.user_id);
        map.set(r.maca_id, arr);
      });
      return map;
    },
  });

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "sem-medium" | "inativas">("todas");

  const reload = () => {
    qc.invalidateQueries({ queryKey: ["admin-macas"] });
    qc.invalidateQueries({ queryKey: ["maca-mediuns-all"] });
  };

  const termo = busca.trim().toLowerCase();
  const filtradas = (macas ?? []).filter((m) => {
    if (termo && !`${m.numero} ${m.nome}`.toLowerCase().includes(termo)) return false;
    if (filtro === "sem-medium" && (assignments?.get(m.id)?.length ?? 0) > 0) return false;
    if (filtro === "inativas" && m.ativa) return false;
    return true;
  });

  const semMedium = (macas ?? []).filter((m) => m.ativa && (assignments?.get(m.id)?.length ?? 0) === 0);

  const grupos: { dia: DiaTrabalho; itens: MacaRow[] }[] = [
    { dia: "terca", itens: filtradas.filter((m) => m.dia === "terca") },
    { dia: "sabado", itens: filtradas.filter((m) => m.dia === "sabado") },
  ];

  return (
    <>
      <CabecalhoPagina
        titulo="Gestão de Macas"
        descricao="Configurar cores, nomes e médiuns responsáveis"
        acoes={<NovaMacaButton onCreated={reload} proximoNumero={(macas?.reduce((max, m) => Math.max(max, m.numero), 0) ?? 0) + 1} />}
      />
      <div className="space-y-6">

      {semMedium.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-100 p-3 text-sm text-amber-800">
          <strong>{semMedium.length} maca{semMedium.length === 1 ? "" : "s"} sem médium atribuído:</strong>{" "}
          {semMedium.map((m) => `${m.numero} · ${m.nome}`).join(" — ")}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar maca por número ou nome"
          aria-label="Buscar maca"
          className="sm:max-w-xs"
        />
        <div className="flex gap-1">
          {([
            ["todas", "Todas"],
            ["sem-medium", "Sem médium"],
            ["inativas", "Inativas"],
          ] as const).map(([v, label]) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={filtro === v ? "default" : "outline"}
              onClick={() => setFiltro(v)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>




      {grupos.map((g) => (
        <section key={g.dia} className="space-y-2">
          <h2 className="text-lg font-semibold font-['Playfair_Display'] text-foreground">
            {diaLabel(g.dia)}{" "}
            <span className="text-sm text-muted-foreground font-normal">
              ({g.itens.length} maca{g.itens.length === 1 ? "" : "s"})
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {g.itens.map((m) => (
              <MacaCard
                key={m.id}
                maca={m}
                onChanged={reload}
                mediumUsers={mediumUsers ?? []}
                assignedIds={assignments?.get(m.id) ?? []}
              />
            ))}
            {g.itens.length === 0 && (
              <Card className="p-4 text-sm text-muted-foreground">
                Nenhuma maca para {diaLabel(g.dia).toLowerCase()}.
              </Card>
            )}
          </div>
        </section>
      ))}
      </div>
    </>
  );
}

const CORES_MACA = [
  { nome: "Azul", hex: "#3B82F6" },
  { nome: "Turquesa", hex: "#14B8A6" },
  { nome: "Verde", hex: "#22C55E" },
  { nome: "Amarela", hex: "#FACC15" },
  { nome: "Laranja", hex: "#F97316" },
  { nome: "Vermelha", hex: "#EF4444" },
  { nome: "Rosa", hex: "#EC4899" },
  { nome: "Roxa", hex: "#8B5CF6" },
  { nome: "Marrom", hex: "#92400E" },
  { nome: "Cinza", hex: "#64748B" },
  { nome: "Branca", hex: "#F1F5F9" },
  { nome: "Preta", hex: "#1E293B" },
];

function MacaCard({
  maca, onChanged, mediumUsers, assignedIds,
}: {
  maca: MacaRow;
  onChanged: () => void;
  mediumUsers: MediumUser[];
  assignedIds: string[];
}) {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(maca.nome);
  const [cor, setCor] = useState(maca.cor_hex);
  const [lotacao, setLotacao] = useState(String(maca.lotacao_max));
  const [ativa, setAtiva] = useState(maca.ativa);
  const [dia, setDia] = useState<DiaTrabalho>(maca.dia);
  const [categoria, setCategoria] = useState<MacaCategoria>(maca.categoria ?? "interna");
  const [finalidade, setFinalidade] = useState(maca.finalidade ?? "");
  const [selectedMediums, setSelectedMediums] = useState<string[]>(assignedIds);

  const [showNovoMedium, setShowNovoMedium] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [criando, setCriando] = useState(false);

  const createMedium = useServerFn(criarUsuarioMedium);

  const assignedNames = mediumUsers
    .filter((u) => assignedIds.includes(u.id))
    .map((u) => u.como_chamar || u.nome || u.email);

  const toggleMedium = (id: string) => {
    setSelectedMediums((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  };

  const save = async () => {
    const novaLotacao = parseInt(lotacao) || 15;
    const { error: e1 } = await supabase.from("macas").update({
      nome, cor_hex: cor,
      lotacao_max: novaLotacao,
      ativa,
      dia,
      categoria,
      finalidade: finalidade.trim() || null,
    }).eq("id", maca.id);
    if (e1) return toast.error(e1.message);

    // sync maca_mediuns
    const toAdd = selectedMediums.filter((id) => !assignedIds.includes(id));
    const toRemove = assignedIds.filter((id) => !selectedMediums.includes(id));

    if (toRemove.length) {
      const { error } = await supabase
        .from("maca_mediuns").delete()
        .eq("maca_id", maca.id).in("user_id", toRemove);
      if (error) return toast.error(error.message);
    }
    if (toAdd.length) {
      const { error } = await supabase
        .from("maca_mediuns").insert(toAdd.map((user_id) => ({ maca_id: maca.id, user_id })));
      if (error) return toast.error(error.message);
    }

    // busca lotação atualizada da maca
    const { data: ativosAtual } = await supabase
      .from("designacoes")
      .select("id")
      .eq("maca_id", maca.id)
      .eq("status", "ativa");
    const countAtual = ativosAtual?.length ?? 0;

    toast.success(`Maca ${nome} atualizada`, {
      description: `Lotação atual: ${countAtual}/${novaLotacao} consulentes`,
    });
    setOpen(false);
    onChanged();
  };

  const handleCriarMedium = async () => {
    if (!novoNome.trim() || !novoEmail.trim() || !novaSenha.trim()) {
      return toast.error("Preencha nome, email e senha.");
    }
    setCriando(true);
    try {
      const novo = await createMedium({ data: {
        maca_id: maca.id,
        nome: novoNome.trim(),
        email: novoEmail.trim(),
        senha: novaSenha,
      }});
      toast.success(`Médium ${novo.nome} criado e vinculado`);
      setNovoNome("");
      setNovoEmail("");
      setNovaSenha("");
      setShowNovoMedium(false);
      onChanged();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar médium");
    } finally {
      setCriando(false);
    }
  };

  return (
    <Card className="p-4 border-2" style={{ borderColor: maca.cor_hex }}>
      <div
        className="rounded h-14 mb-2 flex items-center justify-center text-xl font-bold"
        style={{
          backgroundColor: maca.numero === 14 ? "#f5f5f5" : maca.cor_hex,
          color: maca.numero === 14 ? "#cccccc" : "#ffffff",
        }}
      >
        {maca.numero}
      </div>
      <div className="font-medium flex items-center gap-2 flex-wrap">
        <span>{maca.nome}</span>
        <MacaCategoriaTag numero={maca.numero} categoria={maca.categoria} />
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {diaLabel(maca.dia)} · lotação {maca.lotacao_max}
        {!maca.ativa && " · inativa"}
      </div>
      {maca.finalidade && (
        <div className="text-xs text-primary mt-0.5">Finalidade: {maca.finalidade}</div>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {assignedNames.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">Sem médium atribuído</span>
        ) : (
          assignedNames.map((n) => (
            <Badge key={n} variant="outline" className="text-xs gap-1 bg-muted text-foreground border-border">
              <Sparkles className="h-3 w-3" /> {n}
            </Badge>
          ))
        )}
      </div>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { setSelectedMediums(assignedIds); setShowNovoMedium(false); } }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="mt-3 w-full">
            Editar maca
          </Button>
        </DialogTrigger>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Editar maca {maca.numero}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
            <div className="space-y-1"><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div className="space-y-1">
              <Label>Cor da maca</Label>
              <div className="flex flex-wrap gap-2">
                {CORES_MACA.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.nome}
                    aria-label={`Cor ${c.nome}`}
                    onClick={() => setCor(c.hex)}
                    className={`h-8 w-8 rounded-full border-2 transition ${cor.toLowerCase() === c.hex.toLowerCase() ? "border-primary ring-2 ring-primary/40" : "border-transparent"}`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Input type="color" className="w-14 p-1 h-9" value={cor} onChange={(e) => setCor(e.target.value)} aria-label="Cor personalizada" />
                <span className="text-xs text-muted-foreground">
                  {CORES_MACA.find((c) => c.hex.toLowerCase() === cor.toLowerCase())?.nome ?? "Cor personalizada"} · {cor}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Dia do trabalho</Label>
              <Select value={dia} onValueChange={(v) => setDia(v as DiaTrabalho)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="terca">{diaLabel("terca")}</SelectItem>
                  <SelectItem value="sabado">{diaLabel("sabado")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as MacaCategoria)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interna">Interna</SelectItem>
                  <SelectItem value="externa">Externa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Finalidade (público atendido)</Label>
              <Input
                value={finalidade}
                onChange={(e) => setFinalidade(e.target.value)}
                placeholder="Ex.: Gestantes, saúde mental, primeira vez"
              />
              <p className="text-xs text-muted-foreground">Aparece como orientação na designação e nas listas.</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Médiuns responsáveis</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setShowNovoMedium((v) => !v)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {showNovoMedium ? "Cancelar" : "Novo médium"}
                </Button>
              </div>

              {showNovoMedium && (
                <div className="border rounded-md p-3 space-y-2 bg-muted">
                  <div className="text-sm font-medium">Criar novo médium</div>
                  <div className="space-y-1"><Label className="text-xs">Nome</Label><Input size={1} value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome completo" /></div>
                  <div className="space-y-1"><Label className="text-xs">Email</Label><Input size={1} type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="email@exemplo.com" /></div>
                  <div className="space-y-1"><Label className="text-xs">Senha</Label><Input size={1} type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={handleCriarMedium}
                    disabled={criando}
                  >
                    {criando ? "Criando..." : "Criar e vincular à maca"}
                  </Button>
                </div>
              )}

              {mediumUsers.length === 0 && !showNovoMedium ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum usuário com papel <strong>Médium</strong>. Cadastre acima.
                </p>
              ) : (
                <div className="border rounded-md max-h-48 overflow-y-auto overscroll-contain touch-pan-y divide-y">
                  {mediumUsers.map((u) => {
                    const checked = selectedMediums.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMedium(u.id)}
                        />
                        <div className="flex-1 min-w-1">
                          <div className="truncate">{u.como_chamar || u.nome || "—"}</div>
                          {u.como_chamar && <div className="text-xs text-muted-foreground truncate">{u.nome}</div>}
                          <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedMediums.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedMediums.map((id) => {
                    const u = mediumUsers.find((x) => x.id === id);
                    if (!u) return null;
                    return (
                    <Badge key={id} variant="outline" className="gap-1 text-xs bg-muted text-foreground border-border">
                        {u.como_chamar || u.nome || u.email}
                        <button type="button" onClick={() => toggleMedium(id)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-1"><Label>Lotação máxima</Label><Input type="number" value={lotacao} onChange={(e) => setLotacao(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
              Ativa
            </label>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-semibold text-destructive">Zona de risco</p>
              <p className="mb-2 text-xs text-muted-foreground">
                Remover a maca apaga o vínculo com os médiuns e não pode ser desfeito.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={async () => {
                if (!(await confirm({
                  title: "Remover esta maca?",
                  description: `A maca ${maca.numero} — ${maca.nome} será removida permanentemente. Esta ação não pode ser desfeita.`,
                  tone: "danger",
                  confirmLabel: "Remover",
                }))) return;
                const { error: eMm } = await supabase.from("maca_mediuns").delete().eq("maca_id", maca.id);
                if (eMm) return toast.error(eMm.message);
                const { error } = await supabase.from("macas").delete().eq("id", maca.id);
                if (error) return toast.error(error.message);
                toast.success("Maca removida");
                setOpen(false);
                onChanged();
              }}
              >
                Remover maca
              </Button>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function NovaMacaButton({ onCreated, proximoNumero }: { onCreated: () => void; proximoNumero: number }) {
  const [open, setOpen] = useState(false);
  const [numero, setNumero] = useState(String(proximoNumero));
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#3b82f6");
  const [dia, setDia] = useState<DiaTrabalho>("terca");
  const [lotacao, setLotacao] = useState("10");
  const [categoria, setCategoria] = useState<MacaCategoria>("interna");
  const [salvando, setSalvando] = useState(false);

  const reset = () => {
    setNumero(String(proximoNumero));
    setNome("");
    setCor("#3b82f6");
    setDia("terca");
    setLotacao("10");
    setCategoria("interna");
  };

  const criar = async () => {
    const n = parseInt(numero);
    if (!n || n < 1) return toast.error("Número inválido");
    if (!nome.trim()) return toast.error("Informe um nome");
    setSalvando(true);
    const { error } = await supabase.from("macas").insert({
      numero: n,
      nome: nome.trim(),
      cor_hex: cor,
      dia,
      lotacao_max: parseInt(lotacao) || 10,
      ativa: true,
      categoria,
    });
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Maca criada");
    setOpen(false);
    reset();
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) reset(); }}>
      <DialogTrigger asChild>
        <Button>+ Nova maca</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Criar nova maca</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Número</Label><Input type="number" value={numero} onChange={(e) => setNumero(e.target.value)} /></div>
          <div className="space-y-1"><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maca Azul" /></div>
          <div className="space-y-1"><Label>Cor</Label>
            <div className="flex gap-2 items-center">
              <Input type="color" className="w-16 p-1 h-10" value={cor} onChange={(e) => setCor(e.target.value)} />
              <Input value={cor} onChange={(e) => setCor(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Dia do trabalho</Label>
            <Select value={dia} onValueChange={(v) => setDia(v as DiaTrabalho)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="terca">{diaLabel("terca")}</SelectItem>
                <SelectItem value="sabado">{diaLabel("sabado")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={(v) => setCategoria(v as MacaCategoria)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="interna">Interna</SelectItem>
                <SelectItem value="externa">Externa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Lotação máxima</Label><Input type="number" value={lotacao} onChange={(e) => setLotacao(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={criar} disabled={salvando}>
            {salvando ? "Criando..." : "Criar maca"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

