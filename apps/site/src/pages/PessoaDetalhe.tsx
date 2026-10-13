import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, X } from "lucide-react";

type ContextType = "casa" | "secretaria" | "projeto";
type Permission = string;

const CONTEXT_LABELS: Record<ContextType, string> = {
  casa: "Casa", secretaria: "Secretaria", projeto: "Projeto",
};

const PERMISSION_LABELS: Record<string, string> = {
  modulo_macas: "Macas", modulo_passes: "Passes", modulo_dialogo: "Diálogo",
  modulo_recepcao: "Recepção", modulo_formacao: "Formação",
  modulo_secretaria: "Secretaria", modulo_projetos: "Projetos",
  modulo_gestao: "Gestão", modulo_financeiro: "Financeiro", modulo_admin: "Admin",
};

interface Person {
  id: string; full_name: string; cpf: string | null; email: string | null;
  phone: string | null; birth_date: string | null; user_id: string | null; notes: string | null;
}

interface Assignment {
  id: string;
  function_id: string;
  context_type: ContextType;
  context_id: string | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  function: { name: string; category: string; is_active: boolean };
}

interface FunctionOpt { id: string; name: string; category: string; }
interface ContextOpt { id: string; name: string; }

interface AssignForm {
  function_id: string;
  context_type: ContextType;
  context_id: string;
  started_at: string;
  notes: string;
}

const emptyAssign = (): AssignForm => ({
  function_id: "", context_type: "casa", context_id: "",
  started_at: new Date().toISOString().slice(0, 10), notes: "",
});

export default function PessoaDetalhe() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [form, setForm] = useState<AssignForm>(emptyAssign());

  const { data: person, isLoading } = useQuery({
    queryKey: ["person", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("id, full_name, cpf, email, phone, birth_date, user_id, notes")
        .eq("id", id).single();
      if (error) throw error;
      return data as Person;
    },
    enabled: !!id,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["person-assignments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_assignments")
        .select("id, function_id, context_type, context_id, started_at, ended_at, notes, function:functions ( name, category, is_active )")
        .eq("person_id", id)
        .order("ended_at", { ascending: true, nullsFirst: true })
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Assignment[];
    },
    enabled: !!id,
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["person-permissions", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_person_permissions", { _person_id: id });
      if (error) throw error;
      return (data as { get_person_permissions: string }[] | string[]).map((r: any) =>
        typeof r === "string" ? r : r.get_person_permissions
      ) as Permission[];
    },
    enabled: !!id,
  });

  const { data: fnOpts = [] } = useQuery({
    queryKey: ["fn-opts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("functions").select("id, name, category").eq("is_active", true).order("category").order("name");
      if (error) throw error;
      return data as FunctionOpt[];
    },
  });

  const { data: secOpts = [] } = useQuery({
    queryKey: ["sec-opts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("secretarias").select("id, name").order("name");
      if (error) throw error;
      return data as ContextOpt[];
    },
  });

  const { data: projOpts = [] } = useQuery({
    queryKey: ["proj-opts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").order("name");
      if (error) throw error;
      return data as ContextOpt[];
    },
  });

  const assignMut = useMutation({
    mutationFn: async () => {
      if (!form.function_id) throw new Error("Selecione uma função");
      if (form.context_type !== "casa" && !form.context_id) {
        throw new Error("Selecione o contexto (secretaria ou projeto)");
      }
      const { error } = await supabase.from("worker_assignments").insert({
        person_id: id,
        function_id: form.function_id,
        context_type: form.context_type,
        context_id: form.context_type === "casa" ? null : form.context_id,
        started_at: form.started_at,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["person-assignments", id] });
      qc.invalidateQueries({ queryKey: ["person-permissions", id] });
      toast.success("Função atribuída!");
      setAssignOpen(false); setForm(emptyAssign());
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atribuir"),
  });

  const endMut = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("worker_assignments")
        .update({ ended_at: new Date().toISOString().slice(0, 10) })
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["person-assignments", id] });
      qc.invalidateQueries({ queryKey: ["person-permissions", id] });
      toast.success("Função encerrada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const contextLabel = (a: Assignment) => {
    if (a.context_type === "casa") return "Casa";
    if (a.context_type === "secretaria") {
      return secOpts.find(s => s.id === a.context_id)?.name || "Secretaria";
    }
    return projOpts.find(p => p.id === a.context_id)?.name || "Projeto";
  };

  const active = assignments.filter(a => !a.ended_at);
  const history = assignments.filter(a => a.ended_at);

  if (isLoading) return <AppLayout><div className="text-center py-12 text-muted-foreground">Carregando...</div></AppLayout>;
  if (!person) return <AppLayout><div className="text-center py-12 text-muted-foreground">Pessoa não encontrada</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link to="/app/pessoas" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Pessoas
          </Link>
          <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">{person.full_name}</h1>
          <div className="text-sm text-muted-foreground space-x-3">
            {person.cpf && <span>CPF {person.cpf}</span>}
            {person.email && <span>{person.email}</span>}
            {person.phone && <span>{person.phone}</span>}
          </div>
        </div>

        {/* Permissões ativas */}
        <section className="rounded-lg border bg-card p-4 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Módulos acessíveis ({permissions.length})
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {permissions.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                Sem acesso a módulos do sistema. Atribua funções para liberar acesso.
              </span>
            ) : (
              permissions.map(p => (
                <Badge key={p} variant="secondary" className="text-xs">
                  {PERMISSION_LABELS[p] || p}
                </Badge>
              ))
            )}
          </div>
        </section>

        <Tabs defaultValue="ativas">
          <div className="flex items-center justify-between gap-4 mb-3">
            <TabsList>
              <TabsTrigger value="ativas">Funções ativas ({active.length})</TabsTrigger>
              <TabsTrigger value="historico">Histórico ({history.length})</TabsTrigger>
            </TabsList>
            <Button onClick={() => { setForm(emptyAssign()); setAssignOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar função
            </Button>
          </div>

          <TabsContent value="ativas">
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Função</TableHead>
                    <TableHead>Contexto</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma função ativa.</TableCell></TableRow>
                  ) : active.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.function.name}
                        {!a.function.is_active && <Badge variant="outline" className="ml-2 text-xs">Função desativada</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="outline" className="text-xs">{CONTEXT_LABELS[a.context_type]}</Badge>
                        {a.context_type !== "casa" && (
                          <span className="ml-2 text-muted-foreground">{contextLabel(a)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(a.started_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.notes || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => endMut.mutate(a.id)}>
                          <X className="w-4 h-4 mr-1" /> Encerrar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Função</TableHead>
                    <TableHead>Contexto</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma função no histórico.</TableCell></TableRow>
                  ) : history.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.function.name}</TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="outline" className="text-xs">{CONTEXT_LABELS[a.context_type]}</Badge>
                        {a.context_type !== "casa" && (
                          <span className="ml-2 text-muted-foreground">{contextLabel(a)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(a.started_at).toLocaleDateString("pt-BR")} → {a.ended_at ? new Date(a.ended_at).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={assignOpen} onOpenChange={v => { if (!v) { setAssignOpen(false); setForm(emptyAssign()); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar função</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Função *</Label>
              <Select value={form.function_id} onValueChange={v => setForm(f => ({ ...f, function_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar função" /></SelectTrigger>
                <SelectContent>
                  {fnOpts.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Contexto *</Label>
                <Select
                  value={form.context_type}
                  onValueChange={v => setForm(f => ({ ...f, context_type: v as ContextType, context_id: "" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="secretaria">Secretaria</SelectItem>
                    <SelectItem value="projeto">Projeto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.context_type !== "casa" && (
                <div className="grid gap-2">
                  <Label>{form.context_type === "secretaria" ? "Secretaria *" : "Projeto *"}</Label>
                  <Select value={form.context_id} onValueChange={v => setForm(f => ({ ...f, context_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {(form.context_type === "secretaria" ? secOpts : projOpts).map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Início *</Label>
              <Input type="date" value={form.started_at} onChange={e => setForm(f => ({ ...f, started_at: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignOpen(false); setForm(emptyAssign()); }}>Cancelar</Button>
            <Button onClick={() => assignMut.mutate()} disabled={assignMut.isPending}>
              {assignMut.isPending ? "Atribuindo..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
