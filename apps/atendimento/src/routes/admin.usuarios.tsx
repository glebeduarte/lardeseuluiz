import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { registrarAuditoria } from "@/lib/auditoria";
import { Plus, Upload, Download, Loader2, Trash2, KeyRound } from "lucide-react";
import { criarUsuario, importarUsuarios, atualizarTelefone, definirAtivoUsuario, removerUsuario, resetarSenhaUsuario } from "@/lib/usuarios.functions";

const DEFAULT_PASSWORD = "uma senha provisória nova (gerada na hora e mostrada a você)";
import { maskPhone } from "@/lib/masks";
import { useAuth } from "@/lib/auth";

type Role = "admin" | "dialogador" | "recepcao" | "medium";

const ALL_ROLES: { value: Role; label: string }[] = [
  { value: "recepcao", label: "Acolhimento" },
  { value: "dialogador", label: "Dialogador" },
  { value: "medium", label: "Médium" },
  { value: "admin", label: "Admin" },
];

const ROLE_KEYS = ALL_ROLES.map((r) => r.value);

export const Route = createFileRoute("/admin/usuarios")({
  component: () => (
    <RequireAuth roles={["admin"]}>
      <Usuarios />
    </RequireAuth>
  ),
});

function Usuarios() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const [openNovo, setOpenNovo] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resetting, setResetting] = useState(false);
  const resetSenha = useServerFn(resetarSenhaUsuario);

  const toggleSel = (id: string, on: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(id); else n.delete(id);
      return n;
    });
  };

  const resetSelecionados = async (ids: string[]) => {
    if (ids.length === 0) return;
    setResetting(true);
    try {
      const res = await resetSenha({ data: { user_ids: ids } });
      if (res.erros.length === 0) {
        toast.success(`Senha redefinida para ${res.sucesso.length} usuário(s). Senhas provisórias (anote e entregue a cada pessoa): ${Object.entries(res.senhas ?? {}).map(([email, senha]) => `${email}: ${senha}`).join(" · ")}`, { duration: 60000 });
      } else {
        toast.warning(`${res.sucesso.length} ok, ${res.erros.length} com erro: ${res.erros.map((e) => e.erro).join("; ")}`);
      }
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao resetar senhas");
    } finally {
      setResetting(false);
    }
  };


  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, nome, email, telefone, data_nascimento, como_chamar, ativo, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const map = new Map<string, Role[]>();
      roles?.forEach((r) => {
        const arr = map.get(r.user_id) ?? [];
        arr.push(r.role as Role);
        map.set(r.user_id, arr);
      });
      return profiles.map((p) => ({ ...p, roles: map.get(p.id) ?? [] }));
    },
  });

  const aplicarRole = async (user_id: string, role: Role, checked: boolean) => {
    if (checked) {
      const { error } = await supabase.from("user_roles").insert({ user_id, role });
      if (error) { toast.error(error.message); return false; }
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
      if (error) { toast.error(error.message); return false; }
    }
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    return true;
  };

  const toggleRole = async (user_id: string, role: Role, checked: boolean) => {
    const usuario = data?.find((u) => u.id === user_id);
    const nome = usuario?.nome || usuario?.email || "este usuário";
    const ok = await confirm({
      title: checked ? `Conceder o papel "${role}"?` : `Remover o papel "${role}"?`,
      description: checked
        ? `${nome} passará a ter acesso às telas e ações do papel ${role}.`
        : `${nome} perderá o acesso às telas e ações do papel ${role}.`,
      tone: checked ? "default" : "warning",
      confirmLabel: checked ? "Conceder" : "Remover",
    });
    if (!ok) return;
    if (!(await aplicarRole(user_id, role, checked))) return;
    await registrarAuditoria({
      acao: checked ? "papel_concedido" : "papel_removido",
      alvo: nome,
      detalhe: { user_id, role },
    });
    toast.success(checked ? `Papel ${role} concedido a ${nome}` : `Papel ${role} removido de ${nome}`, {
      description: "Você pode desfazer esta mudança.",
      duration: 10000,
      action: {
        label: "Desfazer",
        onClick: async () => {
          if (await aplicarRole(user_id, role, !checked)) {
            await registrarAuditoria({
              acao: "papel_desfeito",
              alvo: nome,
              detalhe: { user_id, role, revertido_para: checked ? "sem_papel" : "com_papel" },
            });
            toast.success("Mudança desfeita");
          }
        },
      },
    });
  };

  const baixarModelo = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["nome", "email", "telefone", "data_nascimento", "como_chamar", "senha", "roles"],
      ["Maria Silva", "maria@exemplo.com", "(11) 90000-0000", "1990-05-15", "Mariazinha", "senha123", "medium"],
      ["João Souza", "joao@exemplo.com", "(11) 90000-0001", "1985-03-22", "Joãozinho", "senha123", "dialogador,medium"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuários");
    XLSX.writeFile(wb, "modelo-usuarios.xlsx");
  };

  const [filtroRole, setFiltroRole] = useState<Role | "todos" | "sem">("todos");
  const [busca, setBusca] = useState("");
  const [sortKey, setSortKey] = useState<"nome" | "email" | "ativo" | Role>("nome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const termo = busca.trim().toLowerCase();
  const filtered = (data ?? []).filter((u) => {
    if (termo) {
      const alvo = [u.nome, u.como_chamar, u.email, u.telefone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!alvo.includes(termo)) return false;
    }
    if (filtroRole === "todos") return true;
    if (filtroRole === "sem") return u.roles.length === 0;
    return u.roles.includes(filtroRole);
  });


  const sorted = [...filtered].sort((a, b) => {
    let av: any, bv: any;
    if (sortKey === "nome") { av = (a.como_chamar || a.nome || "").toLowerCase(); bv = (b.como_chamar || b.nome || "").toLowerCase(); }
    else if (sortKey === "email") { av = a.email.toLowerCase(); bv = b.email.toLowerCase(); }
    else if (sortKey === "ativo") { av = a.ativo ? 1 : 0; bv = b.ativo ? 1 : 0; }
    else { av = a.roles.includes(sortKey) ? 1 : 0; bv = b.roles.includes(sortKey) ? 1 : 0; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const SortBtn = ({ k, children }: { k: typeof sortKey; children: React.ReactNode }) => (
    <button onClick={() => handleSort(k)} className="inline-flex items-center gap-1 hover:text-primary font-medium">
      {children}
      <span className="text-[10px] opacity-60">{sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Cadastre usuários individualmente ou importe via Excel. Papéis são cumulativos." : "Cadastre novos trabalhadores no sistema."}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && selected.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={resetting} className="border-2 border-amber-500 text-amber-700 hover:bg-amber-50">
                  {resetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                  Resetar senha ({selected.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resetar senha dos usuários selecionados?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A senha de {selected.size} usuário(s) será redefinida para <b>{DEFAULT_PASSWORD}</b> e eles serão obrigados a criar uma nova senha no próximo acesso.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => resetSelecionados(Array.from(selected))}>
                    Resetar senha
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={baixarModelo} className="border-2">
                <Download className="w-4 h-4 mr-2" /> Modelo Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpenImport(true)} className="border-2">
                <Upload className="w-4 h-4 mr-2" /> Importar XLSX
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setOpenNovo(true)} className="bg-brand-blue hover:bg-brand-blue/90 text-white shadow-md">
            <Plus className="w-4 h-4 mr-2" /> Novo usuário
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone"
          aria-label="Buscar usuário"
        />
        {busca && (
          <Button variant="ghost" size="sm" onClick={() => setBusca("")}>Limpar</Button>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap text-sm">

        <span className="text-muted-foreground mr-1">Filtrar:</span>
        {([
          { v: "todos" as const, label: `Todos (${data?.length ?? 0})` },
          ...ALL_ROLES.map((r) => ({ v: r.value, label: `${r.label} (${data?.filter((u) => u.roles.includes(r.value)).length ?? 0})` })),
          { v: "sem" as const, label: `Sem papel (${data?.filter((u) => u.roles.length === 0).length ?? 0})` },
        ]).map((opt) => (
          <button
            key={opt.v}
            onClick={() => setFiltroRole(opt.v as any)}
            className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${filtroRole === opt.v ? "bg-brand-blue text-white border-brand-blue" : "bg-background hover:bg-muted"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Mostrando {sorted.length} de {data?.length ?? 0} usuários. Os papéis são cumulativos: marque quantos forem necessários.
      </p>

      <Card className="overflow-hidden hidden md:block">

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 border-b">
              <tr>
                {isAdmin && (
                  <th className="text-center px-2 py-2 w-10">
                    <Checkbox
                      checked={sorted.length > 0 && sorted.every((u) => selected.has(u.id))}
                      onCheckedChange={(v) => {
                        if (v) setSelected(new Set(sorted.map((u) => u.id)));
                        else setSelected(new Set());
                      }}
                    />
                  </th>
                )}
                <th className="text-left px-3 py-2"><SortBtn k="nome">Nome / cadastro</SortBtn></th>
                {ALL_ROLES.map((r) => (
                  <th key={r.value} className="text-center px-2 py-2 whitespace-nowrap"><SortBtn k={r.value}>{r.label}</SortBtn></th>
                ))}
                {isAdmin && <th className="text-center px-2 py-2"><SortBtn k="ativo">Ativo</SortBtn></th>}
                {isAdmin && <th className="text-center px-2 py-2 w-24">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((u, idx) => (
                <UserRow
                  key={u.id}
                  user={u}
                  onToggle={toggleRole}
                  zebra={idx % 2 === 1}
                  selected={selected.has(u.id)}
                  onSelect={(v) => toggleSel(u.id, v)}
                  onResetSenha={() => resetSelecionados([u.id])}
                  isAdmin={isAdmin}
                />
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={isAdmin ? ALL_ROLES.length + 4 : ALL_ROLES.length + 1} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Versão mobile: cartões no lugar da tabela */}
      <div className="md:hidden space-y-2">
        {sorted.map((u) => (
          <UserMobileCard
            key={u.id}
            user={u}
            onToggle={toggleRole}
            selected={selected.has(u.id)}
            onSelect={(v) => toggleSel(u.id, v)}
            onResetSenha={() => resetSelecionados([u.id])}
            isAdmin={isAdmin}
          />
        ))}
        {sorted.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhum usuário encontrado.
          </Card>
        )}
      </div>

      <NovoUsuarioDialog open={openNovo} onOpenChange={setOpenNovo} />
      <ImportarDialog open={openImport} onOpenChange={setOpenImport} />
    </div>
  );
}

function UserRow({ user: u, onToggle, zebra, selected, onSelect, onResetSenha, isAdmin }: { user: { id: string; nome: string | null; email: string; telefone: string | null; data_nascimento: string | null; como_chamar: string | null; ativo: boolean; roles: Role[] }; onToggle: (id: string, role: Role, checked: boolean) => void; zebra: boolean; selected: boolean; onSelect: (v: boolean) => void; onResetSenha: () => void | Promise<void>; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const setAtivo = useServerFn(definirAtivoUsuario);
  const remover = useServerFn(removerUsuario);
  const [busy, setBusy] = useState(false);
  const isSelf = currentUser?.id === u.id;
  const dn = u.data_nascimento ? new Date(u.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR") : null;

  const handleAtivo = async (checked: boolean) => {
    setBusy(true);
    try {
      await setAtivo({ data: { user_id: u.id, ativo: checked } });
      toast.success(checked ? "Usuário ativado" : "Usuário inativado (acesso bloqueado)");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) { toast.error(e.message ?? "Erro"); } finally { setBusy(false); }
  };

  const handleRemover = async () => {
    setBusy(true);
    try {
      await remover({ data: { user_id: u.id } });
      toast.success("Usuário removido");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) { toast.error(e.message ?? "Erro ao remover"); } finally { setBusy(false); }
  };

  return (
    <tr className={`border-b last:border-0 ${zebra ? "bg-muted/30" : "bg-background"} ${!u.ativo ? "opacity-60" : ""}`}>
      {isAdmin && (
        <td className="text-center px-2 py-2 align-top">
          <Checkbox checked={selected} onCheckedChange={(v) => onSelect(!!v)} />
        </td>
      )}
      <td className="px-3 py-2 align-top">
        <div className="font-medium flex items-center gap-2">
          {u.como_chamar || u.nome || "—"}
          {!u.ativo && <span className="text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">Inativo</span>}
        </div>
        {u.como_chamar && u.nome && <div className="text-xs text-muted-foreground">{u.nome}</div>}
        <div className="text-xs text-muted-foreground">✉ {u.email}</div>
        {dn && <div className="text-xs text-muted-foreground">🎂 {dn}</div>}
        <TelefoneEditavel userId={u.id} telefone={u.telefone} />
      </td>
      {ALL_ROLES.map((r) => {
        const checked = u.roles.includes(r.value);
        return (
          <td key={r.value} className="text-center px-2 py-2 align-top">
            <Checkbox checked={checked} disabled={!isAdmin || !u.ativo} onCheckedChange={(v) => onToggle(u.id, r.value, !!v)} />
          </td>
        );
      })}
      {isAdmin && (
        <td className="text-center px-2 py-2 align-top">
          <Switch checked={u.ativo} disabled={busy || isSelf} onCheckedChange={handleAtivo} />
        </td>
      )}
      {isAdmin && (
        <td className="text-center px-2 py-2 align-top">
          <div className="inline-flex items-center gap-1">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" disabled={busy} title="Resetar senha" aria-label="Resetar senha" className="text-amber-700 hover:text-amber-700 hover:bg-amber-50 h-8 w-8">
                <KeyRound className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resetar senha?</AlertDialogTitle>
                <AlertDialogDescription>
                  A senha de <b>{u.nome || u.email}</b> será redefinida para <b>{DEFAULT_PASSWORD}</b> e o usuário terá que criar uma nova senha no próximo acesso.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onResetSenha()}>Resetar senha</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" disabled={busy || isSelf} title="Remover usuário" aria-label="Remover usuário" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é permanente. O usuário <b>{u.nome || u.email}</b> e todos os seus papéis serão excluídos. Para apenas bloquear o acesso temporariamente, use o botão <b>Ativo</b>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemover} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Remover definitivamente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </td>
      )}
    </tr>
  );
}

function UserMobileCard({ user: u, onToggle, selected, onSelect, onResetSenha, isAdmin }: { user: { id: string; nome: string | null; email: string; telefone: string | null; data_nascimento: string | null; como_chamar: string | null; ativo: boolean; roles: Role[] }; onToggle: (id: string, role: Role, checked: boolean) => void; selected: boolean; onSelect: (v: boolean) => void; onResetSenha: () => void | Promise<void>; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const setAtivo = useServerFn(definirAtivoUsuario);
  const remover = useServerFn(removerUsuario);
  const [busy, setBusy] = useState(false);
  const isSelf = currentUser?.id === u.id;
  const dn = u.data_nascimento ? new Date(u.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR") : null;

  const handleAtivo = async (checked: boolean) => {
    setBusy(true);
    try {
      await setAtivo({ data: { user_id: u.id, ativo: checked } });
      toast.success(checked ? "Usuário ativado" : "Usuário inativado (acesso bloqueado)");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) { toast.error(e.message ?? "Erro"); } finally { setBusy(false); }
  };

  const handleRemover = async () => {
    setBusy(true);
    try {
      await remover({ data: { user_id: u.id } });
      toast.success("Usuário removido");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) { toast.error(e.message ?? "Erro ao remover"); } finally { setBusy(false); }
  };

  return (
    <Card className={`p-3 space-y-3 ${!u.ativo ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {isAdmin && (
            <Checkbox className="mt-1" checked={selected} onCheckedChange={(v: boolean) => onSelect(!!v)} />
          )}
          <div className="min-w-0">
            <div className="font-medium flex items-center gap-2 flex-wrap">
              {u.como_chamar || u.nome || "—"}
              {!u.ativo && <span className="text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">Inativo</span>}
            </div>
            {u.como_chamar && u.nome && <div className="text-xs text-muted-foreground">{u.nome}</div>}
            <div className="text-xs text-muted-foreground break-all">✉ {u.email}</div>
            {dn && <div className="text-xs text-muted-foreground">🎂 {dn}</div>}
            <TelefoneEditavel userId={u.id} telefone={u.telefone} />
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" disabled={busy} title="Resetar senha" aria-label="Resetar senha" className="text-amber-700 hover:bg-amber-50 h-8 w-8">
                  <KeyRound className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resetar senha?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A senha de <b>{u.nome || u.email}</b> será redefinida para <b>{DEFAULT_PASSWORD}</b> e o usuário terá que criar uma nova senha no próximo acesso.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onResetSenha()}>Resetar senha</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" disabled={busy || isSelf} title="Remover usuário" aria-label="Remover usuário" className="text-destructive hover:bg-destructive/10 h-8 w-8">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é permanente. O usuário <b>{u.nome || u.email}</b> e todos os seus papéis serão excluídos. Para apenas bloquear o acesso, use a chave <b>Ativo</b>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemover} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Remover definitivamente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {ALL_ROLES.map((r) => {
          const checked = u.roles.includes(r.value);
          return (
            <label key={r.value} className="flex items-center gap-2 text-sm">
              <Checkbox checked={checked} disabled={!isAdmin || !u.ativo} onCheckedChange={(v) => onToggle(u.id, r.value, !!v)} />
              {r.label}
            </label>
          );
        })}
      </div>

      {isAdmin && (
        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-xs text-muted-foreground">Acesso ativo</span>
          <Switch checked={u.ativo} disabled={busy || isSelf} onCheckedChange={handleAtivo} />
        </div>
      )}
    </Card>
  );
}

function TelefoneEditavel({ userId, telefone }: { userId: string; telefone: string | null }) {
  const qc = useQueryClient();
  const atualizar = useServerFn(atualizarTelefone);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(maskPhone(telefone ?? ""));

  const salvar = async () => {
    try {
      const formatted = value.trim() ? maskPhone(value) : "";
      await atualizar({ data: { user_id: userId, telefone: formatted } });
      toast.success("Telefone atualizado");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    }
  };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-xs text-muted-foreground hover:text-primary mt-0.5">
        📞 {telefone ? maskPhone(telefone) : "adicionar telefone"}
      </button>
    );
  }
  return (
    <div className="flex gap-1 mt-1">
      <Input value={value} onChange={(e) => setValue(maskPhone(e.target.value))} className="h-7 text-xs w-40" autoFocus placeholder="(11) 90000-0000" inputMode="numeric" />
      <Button size="sm" className="h-7" onClick={salvar}>OK</Button>
      <Button size="sm" variant="ghost" className="h-7" onClick={() => { setEditing(false); setValue(maskPhone(telefone ?? "")); }}>X</Button>
    </div>
  );
}

function NovoUsuarioDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const criar = useServerFn(criarUsuario);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", data_nascimento: "", como_chamar: "", senha: "" });
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  const reset = () => { setForm({ nome: "", email: "", telefone: "", data_nascimento: "", como_chamar: "", senha: "" }); setRoles([]); };

  const submit = async () => {
    if (!form.nome || !form.email || !form.telefone || !form.data_nascimento || !form.senha || roles.length === 0) {
      return toast.error("Preencha nome, email, telefone, data de nascimento, senha e ao menos um papel");
    }
    setLoading(true);
    try {
      await criar({ data: { ...form, roles } });
      toast.success("Usuário criado");
      reset();
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>O usuário receberá acesso imediato com a senha informada.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome *</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label>Email *</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Telefone *</Label><Input required value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })} placeholder="(11) 90000-0000" /></div>
          <div><Label>Data de nascimento *</Label><Input type="date" required value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} /></div>
          <div><Label>Como quer ser chamado(a)? <span className="text-muted-foreground font-normal">(opcional)</span></Label><Input value={form.como_chamar} onChange={(e) => setForm({ ...form, como_chamar: e.target.value })} placeholder="Ex: João, Maria" maxLength={100} /></div>
          <div><Label>Senha provisória *</Label><Input type="text" required value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} /></div>
          <div>
            <Label>Papéis *</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {ALL_ROLES.map((r) => {
                const checked = roles.includes(r.value);
                return (
                  <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => setRoles(v ? [...roles, r.value] : roles.filter((x) => x !== r.value))}
                    />
                    <span className="text-sm">{r.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading} className="bg-brand-blue hover:bg-brand-blue/90 text-white">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ParsedRow = { nome: string; email: string; telefone: string; data_nascimento: string; como_chamar: string; senha: string; roles: Role[] };

function ImportarDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const importar = useServerFn(importarUsuarios);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const onFile = async (file: File) => {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
    const localErros: string[] = [];
    const parsed: ParsedRow[] = [];
    json.forEach((r, i) => {
      const nome = String(r.nome ?? r.Nome ?? "").trim();
      const email = String(r.email ?? r.Email ?? "").trim().toLowerCase();
      const telefone = String(r.telefone ?? r.Telefone ?? "").trim();
      const data_nascimento = String(r.data_nascimento ?? r.Data_Nascimento ?? r["Data de nascimento"] ?? "").trim();
      const como_chamar = String(r.como_chamar ?? r.Como_Chamar ?? r["Como quer ser chamado"] ?? "").trim();
      const senha = String(r.senha ?? r.Senha ?? "").trim() || "lardeseuluiz";
      const rolesRaw = String(r.roles ?? r.Roles ?? r.papel ?? r.papeis ?? "").trim();
      const rolesArr = rolesRaw.split(/[,;|]/).map((s) => s.trim().toLowerCase()).filter(Boolean) as Role[];
      const rolesValid = rolesArr.filter((x) => ROLE_KEYS.includes(x));
      if (!nome || !email) { localErros.push(`Linha ${i + 2}: nome/email faltando`); return; }
      if (!data_nascimento) { localErros.push(`Linha ${i + 2}: data de nascimento faltando`); return; }
      if (rolesValid.length === 0) { localErros.push(`Linha ${i + 2}: nenhum papel válido`); return; }
      parsed.push({ nome, email, telefone, data_nascimento, como_chamar, senha, roles: rolesValid });
    });
    setRows(parsed);
    setErros(localErros);
  };

  const enviar = async () => {
    setLoading(true);
    try {
      const res = await importar({ data: { usuarios: rows } });
      toast.success(`${res.sucesso.length} criados • ${res.erros.length} falharam`);
      if (res.erros.length) setErros(res.erros.map((e) => `${e.email}: ${e.erro}`));
      else { setRows([]); onOpenChange(false); }
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao importar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar usuários (XLSX)</DialogTitle>
          <DialogDescription>
            Colunas esperadas: <b>nome, email, telefone, data_nascimento, como_chamar, senha, roles</b>. Roles separados por vírgula (ex: <code>medium,dialogador</code>).
            Valores aceitos: admin, dialogador, recepcao, medium.
          </DialogDescription>
        </DialogHeader>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
          className="block w-full text-sm"
        />
        {rows.length > 0 && (
          <div className="border rounded max-h-64 overflow-auto text-xs">
            <table className="w-full">
              <thead className="bg-muted sticky top-0">
                <tr><th className="text-left p-2">Nome</th><th className="text-left p-2">Email</th><th className="text-left p-2">Tel</th><th className="text-left p-2">Nascimento</th><th className="text-left p-2">Como chamar</th><th className="text-left p-2">Papéis</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.nome}</td><td className="p-2">{r.email}</td><td className="p-2">{r.telefone}</td><td className="p-2">{r.data_nascimento}</td><td className="p-2">{r.como_chamar || "—"}</td><td className="p-2">{r.roles.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {erros.length > 0 && (
          <div className="text-xs text-destructive max-h-32 overflow-auto border border-destructive/30 rounded p-2 bg-destructive/5">
            {erros.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setRows([]); setErros([]); onOpenChange(false); }}>Fechar</Button>
          <Button onClick={enviar} disabled={loading || rows.length === 0} className="bg-brand-blue hover:bg-brand-blue/90 text-white">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Importar {rows.length} usuário(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
