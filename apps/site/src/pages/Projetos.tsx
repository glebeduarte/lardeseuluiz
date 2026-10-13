import { useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Status = "planejamento" | "ativo" | "encerrado";

const STATUS_LABELS: Record<Status, string> = {
  planejamento: "Planejamento",
  ativo: "Ativo",
  encerrado: "Encerrado",
};
const STATUS_COLORS: Record<Status, string> = {
  planejamento: "bg-amber-100 text-amber-800 border-amber-300",
  ativo: "bg-emerald-100 text-emerald-800 border-emerald-300",
  encerrado: "bg-muted text-muted-foreground border-border",
};

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: Status;
  started_at: string | null;
  ended_at: string | null;
  coordinator_id: string | null;
  coordinator: { full_name: string } | null;
}

interface PersonOpt { id: string; full_name: string; }

interface FormState {
  name: string;
  description: string;
  status: Status;
  started_at: string;
  ended_at: string;
  coordinator_id: string;
}

const emptyForm = (): FormState => ({
  name: "", description: "", status: "planejamento",
  started_at: "", ended_at: "", coordinator_id: "",
});

export default function Projetos() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, status, started_at, ended_at, coordinator_id, coordinator:people!coordinator_id ( full_name )")
        .order("name");
      if (error) throw error;
      return data as unknown as ProjectRow[];
    },
  });

  const { data: peopleOpts = [] } = useQuery({
    queryKey: ["people-opts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people").select("id, full_name").order("full_name").limit(500);
      if (error) throw error;
      return data as PersonOpt[];
    },
  });

  const filtered = filterStatus === "all" ? projects : projects.filter(p => p.status === filterStatus);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (p: ProjectRow) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || "",
      status: p.status,
      started_at: p.started_at || "",
      ended_at: p.ended_at || "",
      coordinator_id: p.coordinator_id || "",
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome é obrigatório");
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        started_at: form.started_at || null,
        ended_at: form.ended_at || null,
        coordinator_id: form.coordinator_id || null,
      };
      if (editing) {
        const { error } = await supabase.from("projects").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projects").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects-full"] });
      toast.success(editing ? "Projeto atualizado!" : "Projeto criado!");
      setDialogOpen(false); setEditing(null); setForm(emptyForm());
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects-full"] });
      toast.success("Projeto removido!");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">Projetos Sociais</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} de {projects.length} projeto{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Novo projeto</Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Coordenação</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum projeto encontrado</TableCell></TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.description && <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.coordinator?.full_name || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.started_at ? new Date(p.started_at).toLocaleDateString("pt-BR") : "—"}
                    {" → "}
                    {p.ended_at ? new Date(p.ended_at).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)} title="Remover">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); setEditing(null); setForm(emptyForm()); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar projeto" : "Novo projeto"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Coordenação</Label>
                <Select
                  value={form.coordinator_id || "none"}
                  onValueChange={v => setForm(f => ({ ...f, coordinator_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem coordenação</SelectItem>
                    {peopleOpts.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Início</Label>
                <Input type="date" value={form.started_at} onChange={e => setForm(f => ({ ...f, started_at: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Encerramento</Label>
                <Input type="date" value={form.ended_at} onChange={e => setForm(f => ({ ...f, ended_at: e.target.value }))} />
              </div>
            </div>
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

      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Projetos com atribuições de trabalhadores podem não ser removíveis.
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
