import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, ArrowUpDown, Download, Pencil, Trash2, Search, X, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

type Row = {
  role_id: string;
  person_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  started_at: string | null;
  ended_at: string | null;
};

type SortField = "full_name" | "email" | "phone" | "started_at";
type SortDir = "asc" | "desc";

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  cpf: "",
  birth_date: null as string | null,
  notes: "",
  started_at: new Date().toISOString().slice(0, 10),
};

export default function Frequentadores() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("full_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["frequentadores_v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("person_roles")
        .select("id, person_id, started_at, ended_at, people:person_id(full_name, email, phone)")
        .eq("role", "frequentador" as any)
        .is("ended_at", null);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        role_id: r.id,
        person_id: r.person_id,
        full_name: r.people?.full_name || "—",
        email: r.people?.email || null,
        phone: r.people?.phone || null,
        started_at: r.started_at,
        ended_at: r.ended_at,
      })) as Row[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof emptyForm) => {
      if (!values.full_name.trim()) throw new Error("Nome é obrigatório");
      const { data: person, error: pErr } = await supabase
        .from("people")
        .insert({
          full_name: values.full_name,
          email: values.email || null,
          phone: values.phone || null,
          cpf: values.cpf || null,
          birth_date: values.birth_date,
          notes: values.notes || null,
        })
        .select("id")
        .single();
      if (pErr) throw pErr;
      const { error: rErr } = await supabase.from("person_roles").insert({
        person_id: person.id,
        role: "frequentador" as any,
        started_at: values.started_at,
      });
      if (rErr) throw rErr;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["frequentadores_v2"] }); toast.success("Frequentador cadastrado!"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ person_id, ...values }: typeof emptyForm & { person_id: string; role_id: string }) => {
      const { error } = await supabase.from("people").update({
        full_name: values.full_name,
        email: values.email || null,
        phone: values.phone || null,
        cpf: values.cpf || null,
        birth_date: values.birth_date,
        notes: values.notes || null,
      }).eq("id", person_id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["frequentadores_v2"] }); toast.success("Atualizado!"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("person_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["frequentadores_v2"] }); toast.success("Removido!"); setDeleteRoleId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm({ ...emptyForm }); };
  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setDialogOpen(true); };

  const openEdit = async (r: Row) => {
    const { data: p } = await supabase.from("people").select("*").eq("id", r.person_id).single();
    setEditing(r);
    setForm({
      full_name: p?.full_name || "",
      email: p?.email || "",
      phone: p?.phone || "",
      cpf: p?.cpf || "",
      birth_date: p?.birth_date || null,
      notes: p?.notes || "",
      started_at: r.started_at || new Date().toISOString().slice(0, 10),
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editing) updateMutation.mutate({ ...form, person_id: editing.person_id, role_id: editing.role_id });
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
    result = [...result].sort((a, b) => {
      const av = (a[sortField] ?? "") as string;
      const bv = (b[sortField] ?? "") as string;
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return result;
  }, [rows, search, sortField, sortDir]);

  const exportData = (fmt: "csv" | "xlsx" | "txt") => {
    const data = filtered.map(a => ({
      Nome: a.full_name, Email: a.email || "", Telefone: a.phone || "", "Início": a.started_at || "",
    }));
    if (fmt === "xlsx") {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Frequentadores");
      XLSX.writeFile(wb, "frequentadores.xlsx");
    } else if (fmt === "csv") {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Frequentadores");
      XLSX.writeFile(wb, "frequentadores.csv", { bookType: "csv" });
    } else {
      const text = data.map(r => Object.values(r).join("\t")).join("\n");
      const blob = new Blob([text], { type: "text/plain" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "frequentadores.txt"; a.click();
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
            <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">Frequentadores</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} registro{filtered.length !== 1 ? "s" : ""} · dados em <Link to="/app/pessoas" className="underline">Pessoas</Link></p>
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
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Novo Frequentador</Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, email ou telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
          </div>
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="full_name">Nome</SortHeader>
                <SortHeader field="email">Email</SortHeader>
                <SortHeader field="phone">Telefone</SortHeader>
                <SortHeader field="started_at">Início</SortHeader>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum frequentador encontrado</TableCell></TableRow>
              ) : filtered.map(a => (
                <TableRow key={a.role_id}>
                  <TableCell className="font-medium">{a.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{a.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.started_at ? format(new Date(a.started_at + "T12:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteRoleId(a.role_id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
            <DialogTitle>{editing ? "Editar Frequentador" : "Novo Frequentador"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nome completo *</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>CPF</Label>
                <Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Data de nascimento</Label>
                <Input type="date" value={form.birth_date || ""} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value || null }))} />
              </div>
            </div>
            {!editing && (
              <div className="grid gap-2">
                <Label>Início como frequentador</Label>
                <Input type="date" value={form.started_at} onChange={e => setForm(f => ({ ...f, started_at: e.target.value }))} />
              </div>
            )}
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

      <AlertDialog open={!!deleteRoleId} onOpenChange={v => { if (!v) setDeleteRoleId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover papel de frequentador</AlertDialogTitle>
            <AlertDialogDescription>A pessoa permanecerá cadastrada em Pessoas, mas perderá o papel de frequentador.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteRoleId && deleteMutation.mutate(deleteRoleId)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
