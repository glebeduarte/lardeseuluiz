import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, X, KeyRound, Briefcase } from "lucide-react";

type PersonRoleKey = "trabalhador" | "frequentador" | "beneficiario_social" | "doador";
type Category = "fundador" | "efetivo" | "colaborador";
type Status = "ativo" | "inadimplente" | "afastado" | "desligado";

const ROLE_LABELS: Record<PersonRoleKey, string> = {
  trabalhador: "Trabalhador",
  frequentador: "Frequentador",
  beneficiario_social: "Beneficiário Social",
  doador: "Doador",
};

const ROLE_COLORS: Record<PersonRoleKey, string> = {
  trabalhador: "bg-primary/10 text-primary border-primary/30",
  frequentador: "bg-secondary/10 text-secondary border-secondary/30",
  beneficiario_social: "bg-amber-100 text-amber-800 border-amber-300",
  doador: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const CATEGORY_LABELS: Record<Category, string> = {
  fundador: "Fundador", efetivo: "Efetivo", colaborador: "Colaborador",
};
const STATUS_LABELS: Record<Status, string> = {
  ativo: "Ativo", inadimplente: "Inadimplente", afastado: "Afastado", desligado: "Desligado",
};

interface PersonRow {
  id: string;
  full_name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  user_id: string | null;
  notes: string | null;
  person_roles: { role: PersonRoleKey; ended_at: string | null }[];
  associate_memberships: { category: Category; status: Status; admission_date: string; exit_date: string | null }[];

}

interface FormState {
  full_name: string;
  cpf: string;
  email: string;
  phone: string;
  birth_date: string;
  notes: string;
  roles: Record<PersonRoleKey, boolean>;
  has_membership: boolean;
  membership_category: Category;
  membership_status: Status;
  admission_date: string;

}

const emptyForm = (): FormState => ({
  full_name: "", cpf: "", email: "", phone: "", birth_date: "", notes: "",
  roles: { trabalhador: false, frequentador: false, beneficiario_social: false, doador: false },
  has_membership: false,
  membership_category: "colaborador",
  membership_status: "ativo",
  admission_date: new Date().toISOString().slice(0, 10),
});

export default function Pessoas() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PersonRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePerson, setInvitePerson] = useState<PersonRow | null>(null);
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState("trabalhador");

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["people-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select(`
          id, full_name, cpf, email, phone, birth_date, user_id, notes,
          person_roles ( role, ended_at ),
          associate_memberships ( category, status, admission_date, exit_date )
        `)
        .order("full_name");
      if (error) throw error;
      return (data as any[]) as PersonRow[];
    },
  });

  const filtered = useMemo(() => {
    let r = people;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(p =>
        p.full_name.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.cpf && p.cpf.includes(q.replace(/\D/g, ""))) ||
        (p.phone && p.phone.includes(q))
      );
    }
    if (filterRole !== "all") {
      r = r.filter(p => p.person_roles.some(pr => pr.role === filterRole && !pr.ended_at));
    }
    return r;
  }, [people, search, filterRole]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true); };

  const openEdit = (p: PersonRow) => {
    setEditing(p);
    const activeMembership = p.associate_memberships.find(m => !m.exit_date);
    const f = emptyForm();
    f.full_name = p.full_name;
    f.cpf = p.cpf || "";
    f.email = p.email || "";
    f.phone = p.phone || "";
    f.birth_date = p.birth_date || "";
    f.notes = p.notes || "";
    p.person_roles.filter(pr => !pr.ended_at).forEach(pr => { f.roles[pr.role] = true; });
    if (activeMembership) {
      f.has_membership = true;
      f.membership_category = activeMembership.category;
      f.membership_status = activeMembership.status;
      f.admission_date = activeMembership.admission_date;
    }

    setForm(f);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Nome é obrigatório");
      const cpfNorm = form.cpf.replace(/\D/g, "") || null;
      const needsCpf = form.roles.trabalhador || form.has_membership;
      if (needsCpf && (!cpfNorm || cpfNorm.length < 11)) {
        throw new Error("CPF é obrigatório para trabalhador ou vínculo associativo");
      }

      const payload = {
        full_name: form.full_name.trim(),
        cpf: cpfNorm,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        birth_date: form.birth_date || null,
        notes: form.notes.trim() || null,
      };

      let personId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("people").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("people").insert(payload).select("id").single();
        if (error) throw error;
        personId = data.id;
      }
      if (!personId) throw new Error("Falha ao salvar pessoa");

      // Sync person_roles (active ones)
      const currentRoles = new Set((editing?.person_roles || []).filter(pr => !pr.ended_at).map(pr => pr.role));
      const desiredRoles = new Set(
        (Object.entries(form.roles) as [PersonRoleKey, boolean][])
          .filter(([, v]) => v).map(([k]) => k)
      );
      const toAdd = [...desiredRoles].filter(r => !currentRoles.has(r));
      const toRemove = [...currentRoles].filter(r => !desiredRoles.has(r));
      for (const role of toAdd) {
        await supabase.from("person_roles").insert({ person_id: personId, role });
      }
      for (const role of toRemove) {
        await supabase.from("person_roles")
          .update({ ended_at: new Date().toISOString().slice(0, 10) })
          .eq("person_id", personId).eq("role", role).is("ended_at", null);
      }

      // Sync active membership
      const activeMembership = (editing?.associate_memberships || []).find(m => !m.exit_date);
      if (form.has_membership) {
        if (activeMembership) {
          await supabase.from("associate_memberships").update({
            category: form.membership_category,
            status: form.membership_status,
            admission_date: form.admission_date,
          }).eq("person_id", personId).is("exit_date", null);
        } else {
          await supabase.from("associate_memberships").insert({
            person_id: personId,
            category: form.membership_category,
            status: form.membership_status,
            admission_date: form.admission_date,
          });
        }
      } else if (activeMembership) {
        await supabase.from("associate_memberships")
          .update({ exit_date: new Date().toISOString().slice(0, 10) })
          .eq("person_id", personId).is("exit_date", null);
      }

    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people-full"] });
      toast.success(editing ? "Pessoa atualizada!" : "Pessoa cadastrada!");
      setDialogOpen(false); setEditing(null); setForm(emptyForm());
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("people").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people-full"] });
      toast.success("Pessoa removida!");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!invitePerson) throw new Error("Pessoa inválida");
      if (!invitePerson.email) throw new Error("Pessoa precisa ter email cadastrado");
      if (invitePassword.length < 6) throw new Error("Senha precisa ter pelo menos 6 caracteres");
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: invitePerson.email,
          password: invitePassword,
          full_name: invitePerson.full_name,
          role: inviteRole,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // user_id will be linked by handle_new_user via email match
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people-full"] });
      toast.success("Acesso criado! A pessoa já pode fazer login.");
      setInviteOpen(false); setInvitePassword(""); setInvitePerson(null);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar acesso"),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">Pessoas</h1>
            <p className="text-sm text-muted-foreground">
              Cadastro unificado · {filtered.length} de {people.length} pessoa{people.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Nova Pessoa</Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF, email ou telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Papel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os papéis</SelectItem>
              {(Object.entries(ROLE_LABELS) as [PersonRoleKey, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Papéis</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Login</TableHead>
                <TableHead className="w-[140px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma pessoa encontrada</TableCell></TableRow>
              ) : filtered.map(p => {
                const activeRoles = p.person_roles.filter(pr => !pr.ended_at);
                const activeMembership = p.associate_memberships.find(m => !m.exit_date);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.full_name}</div>
                      {p.cpf && <div className="text-xs text-muted-foreground">CPF {p.cpf}</div>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.email && <div className="text-muted-foreground">{p.email}</div>}
                      {p.phone && <div className="text-muted-foreground">{p.phone}</div>}
                      {!p.email && !p.phone && <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {activeRoles.length === 0 ? <span className="text-xs text-muted-foreground">—</span> :
                          activeRoles.map(pr => (
                            <Badge key={pr.role} variant="outline" className={`text-xs ${ROLE_COLORS[pr.role]}`}>
                              {ROLE_LABELS[pr.role]}
                            </Badge>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {activeMembership ? (
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[activeMembership.category]} · {STATUS_LABELS[activeMembership.status]}
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {p.user_id ? (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">Ativo</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem login</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button asChild variant="ghost" size="icon" title="Perfil e funções">
                          <Link to={`/app/pessoas/${p.id}`}><Briefcase className="w-4 h-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {!p.user_id && p.email && (
                          <Button variant="ghost" size="icon" onClick={() => { setInvitePerson(p); setInviteOpen(true); }} title="Criar acesso">
                            <KeyRound className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)} title="Remover">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); setEditing(null); setForm(emptyForm()); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Pessoa" : "Nova Pessoa"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados pessoais</h3>
              <div className="grid gap-2">
                <Label>Nome completo *</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>CPF {(form.roles.trabalhador || form.has_membership) && "*"}</Label>
                  <Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
                </div>
                <div className="grid gap-2">
                  <Label>Data de nascimento</Label>
                  <Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Papéis na casa</h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(ROLE_LABELS) as [PersonRoleKey, string][]).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.roles[k]}
                      onCheckedChange={(c) => setForm(f => ({ ...f, roles: { ...f.roles, [k]: !!c } }))}
                    />
                    {v}
                  </label>
                ))}
              </div>
            </section>

            {form.roles.trabalhador && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Funções do trabalhador</h3>
                <p className="text-xs text-muted-foreground">
                  As funções específicas (Passista, Recepção, etc.) agora são atribuídas na tela de gestão de funções, com contexto (casa, secretaria, projeto) e histórico.
                </p>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vínculo associativo (Estatuto)</h3>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={form.has_membership}
                  onCheckedChange={(c) => setForm(f => ({ ...f, has_membership: !!c }))}
                />
                Pessoa é associada formalmente
              </label>
              {form.has_membership && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-2">
                    <Label>Categoria</Label>
                    <Select value={form.membership_category} onValueChange={v => setForm(f => ({ ...f, membership_category: v as Category }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Situação</Label>
                    <Select value={form.membership_status} onValueChange={v => setForm(f => ({ ...f, membership_status: v as Status }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Admissão</Label>
                    <Input type="date" value={form.admission_date} onChange={e => setForm(f => ({ ...f, admission_date: e.target.value }))} />
                  </div>
                </div>
              )}
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditing(null); setForm(emptyForm()); }}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : (editing ? "Salvar" : "Cadastrar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite (create login) dialog */}
      <Dialog open={inviteOpen} onOpenChange={v => { if (!v) { setInviteOpen(false); setInvitePassword(""); setInvitePerson(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar acesso ao sistema</DialogTitle>
          </DialogHeader>
          {invitePerson && (
            <div className="space-y-4">
              <div className="text-sm">
                <div><span className="text-muted-foreground">Pessoa:</span> <strong>{invitePerson.full_name}</strong></div>
                <div><span className="text-muted-foreground">Email:</span> {invitePerson.email}</div>
              </div>
              <div className="grid gap-2">
                <Label>Senha inicial *</Label>
                <Input type="password" minLength={6} value={invitePassword} onChange={e => setInvitePassword(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Papel de acesso</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aluno">Aluno</SelectItem>
                    <SelectItem value="trabalhador">Trabalhador</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setInviteOpen(false); setInvitePassword(""); setInvitePerson(null); }}>
              Cancelar
            </Button>
            <Button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Criando..." : "Criar acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover pessoa</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a pessoa e todos os papéis, vínculos e funções associados. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
