import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
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
import { Plus, ArrowUpDown, Download, Pencil, Trash2, Search, X, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

type Row = {
  id: string;
  person_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  category: string;
  status: string;
  admission_date: string;
  exit_date: string | null;
  notes: string | null;
};

type SortField = "full_name" | "email" | "phone" | "status" | "category" | "admission_date";
type SortDir = "asc" | "desc";

const statusLabels: Record<string, string> = {
  ativo: "Ativo", inadimplente: "Inadimplente", afastado: "Afastado", desligado: "Desligado",
};
const categoryLabels: Record<string, string> = {
  fundador: "Fundador", efetivo: "Efetivo", colaborador: "Colaborador", frequentador: "Frequentador",
};
const statusColors: Record<string, string> = {
  ativo: "bg-green-100 text-green-800", inadimplente: "bg-yellow-100 text-yellow-800",
  afastado: "bg-gray-100 text-gray-600", desligado: "bg-red-100 text-red-700",
};

const emptyForm = {
  person_id: "" as string,
  category: "efetivo" as string,
  status: "ativo" as string,
  admission_date: new Date().toISOString().slice(0, 10),
  exit_date: null as string | null,
  notes: "" as string,
};

export default function Associados() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("full_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["associate_memberships_full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("associate_memberships")
        .select("id, person_id, category, status, admission_date, exit_date, notes, people:person_id(full_name, email, phone, cpf)")
        .is("exit_date", null);
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.id,
        person_id: m.person_id,
        full_name: m.people?.full_name || "—",
        email: m.people?.email || null,
        phone: m.people?.phone || null,
        cpf: m.people?.cpf || null,
        category: m.category,
        status: m.status,
        admission_date: m.admission_date,
        exit_date: m.exit_date,
        notes: m.notes,
      })) as Row[];
    },
  });

  const { data: peopleOptions = [] } = useQuery({
    queryKey: ["people_options_for_memberships"],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("id, full_name, cpf, email").order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof emptyForm) => {
      if (!values.person_id) throw new Error("Selecione uma pessoa");
      const { error } = await supabase.from("associate_memberships").insert({
        person_id: values.person_id,
        category: values.category as any,
        status: values.status as any,
        admission_date: values.admission_date,
        exit_date: values.exit_date,
        notes: values.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["associate_memberships_full"] }); toast.success("Vínculo criado!"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: typeof emptyForm & { id: string }) => {
      const { error } = await supabase.from("associate_memberships").update({
        category: values.category as any,
        status: values.status as any,
        admission_date: values.admission_date,
        exit_date: values.exit_date,
        notes: values.notes || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["associate_memberships_full"] }); toast.success("Vínculo atualizado!"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("associate_memberships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["associate_memberships_full"] }); toast.success("Vínculo removido!"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm({ ...emptyForm }); };
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      person_id: r.person_id,
      category: r.category,
      status: r.status,
      admission_date: r.admission_date,
      exit_date: r.exit_date,
      notes: r.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editing) updateMutation.mutate({ id: editing.id, ...form });
    else createMutation.mutate(form);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let result = rows;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.full_name.toLowerCase().includes(q) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.phone && a.phone.toLowerCase().includes(q))
      );
    }
    if (filterStatus !== "all") result = result.filter(a => a.status === filterStatus);
    if (filterCategory !== "all") result = result.filter(a => a.category === filterCategory);
    result = [...result].sort((a, b) => {
      const av = (a[sortField] ?? "") as string;
      const bv = (b[sortField] ?? "") as string;
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return result;
  }, [rows, search, filterStatus, filterCategory, sortField, sortDir]);

  const exportData = (fmt: "csv" | "xlsx" | "txt") => {
    const data = filtered.map(a => ({
      Nome: a.full_name, Email: a.email || "", Telefone: a.phone || "", CPF: a.cpf || "",
      Categoria: categoryLabels[a.category] || a.category, Situação: statusLabels[a.status] || a.status,
      "Data Ingresso": a.admission_date,
    }));
    if (fmt === "xlsx") {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Associados");
      XLSX.writeFile(wb, "associados.xlsx");
    } else if (fmt === "csv") {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Associados");
      XLSX.writeFile(wb, "associados.csv", { bookType: "csv" });
    } else {
      const text = data.map(r => Object.values(r).join("\t")).join("\n");
      const blob = new Blob([text], { type: "text/plain" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "associados.txt"; a.click();
    }
    toast.success("Exportação concluída!");
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? "opacity-100" : "opacity-30"}`} />
      </div>
    </TableHead>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">Associados</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} vínculo{filtered.length !== 1 ? "s" : ""} ativo{filtered.length !== 1 ? "s" : ""} · dados em <Link to="/app/pessoas" className="underline">Pessoas</Link></p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline"><Link to="/app/pessoas"><ExternalLink className="w-4 h-4 mr-2" /> Ir para Pessoas</Link></Button>
            <Select onValueChange={(v) => exportData(v as any)}>
              <SelectTrigger className="w-[140px]"><Download className="w-4 h-4 mr-2" /><span>Exportar</span></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
                <SelectItem value="txt">TXT</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Novo Vínculo</Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, email ou telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Situação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas situações</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="full_name">Nome</SortHeader>
                <SortHeader field="email">Email</SortHeader>
                <SortHeader field="phone">Telefone</SortHeader>
                <SortHeader field="category">Categoria</SortHeader>
                <SortHeader field="status">Situação</SortHeader>
                <SortHeader field="admission_date">Ingresso</SortHeader>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum vínculo encontrado</TableCell></TableRow>
              ) : filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{a.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.phone || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{categoryLabels[a.category] || a.category}</Badge></TableCell>
                  <TableCell><Badge className={statusColors[a.status]}>{statusLabels[a.status] || a.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{a.admission_date ? format(new Date(a.admission_date + "T12:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Vínculo" : "Novo Vínculo Associativo"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!editing && (
              <div className="grid gap-2">
                <Label>Pessoa *</Label>
                <Select value={form.person_id} onValueChange={v => setForm(f => ({ ...f, person_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma pessoa cadastrada" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {peopleOptions.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name} {p.cpf ? `· ${p.cpf}` : p.email ? `· ${p.email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Cadastre pessoas em <Link to="/app/pessoas" className="underline">Pessoas</Link>. CPF é obrigatório.</p>
              </div>
            )}
            {editing && (
              <div className="rounded border bg-muted/40 p-3 text-sm">
                <div className="font-medium">{editing.full_name}</div>
                <div className="text-xs text-muted-foreground">{editing.email || "—"} · {editing.cpf || "—"}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Situação</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data de ingresso</Label>
                <Input type="date" value={form.admission_date} onChange={e => setForm(f => ({ ...f, admission_date: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Data de saída</Label>
                <Input type="date" value={form.exit_date || ""} onChange={e => setForm(f => ({ ...f, exit_date: e.target.value || null }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vínculo</AlertDialogTitle>
            <AlertDialogDescription>A pessoa permanecerá cadastrada em Pessoas, mas perderá o vínculo associativo. Continuar?</AlertDialogDescription>
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
