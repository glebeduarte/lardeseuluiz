import { useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

type Category = "atendimento_espiritual" | "apoio_operacional" | "estrutura_organizacional";
type Permission =
  | "modulo_macas" | "modulo_passes" | "modulo_dialogo" | "modulo_recepcao"
  | "modulo_formacao" | "modulo_secretaria" | "modulo_projetos"
  | "modulo_gestao" | "modulo_financeiro" | "modulo_admin";

const CATEGORY_LABELS: Record<Category, string> = {
  atendimento_espiritual: "Atendimento espiritual",
  apoio_operacional: "Apoio operacional",
  estrutura_organizacional: "Estrutura organizacional",
};

const PERMISSION_LABELS: Record<Permission, string> = {
  modulo_macas: "Macas",
  modulo_passes: "Passes",
  modulo_dialogo: "Diálogo fraterno",
  modulo_recepcao: "Recepção",
  modulo_formacao: "Formação",
  modulo_secretaria: "Secretaria",
  modulo_projetos: "Projetos",
  modulo_gestao: "Gestão",
  modulo_financeiro: "Financeiro",
  modulo_admin: "Administração",
};

interface FunctionRow {
  id: string;
  name: string;
  description: string | null;
  category: Category;
  is_active: boolean;
  function_permissions: { permission: Permission }[];
}

interface FormState {
  name: string;
  description: string;
  category: Category;
  is_active: boolean;
  permissions: Record<Permission, boolean>;
}

const emptyPerms = (): Record<Permission, boolean> =>
  Object.keys(PERMISSION_LABELS).reduce((acc, k) => ({ ...acc, [k]: false }), {} as Record<Permission, boolean>);

const emptyForm = (): FormState => ({
  name: "", description: "", category: "apoio_operacional", is_active: true, permissions: emptyPerms(),
});

export default function Funcoes() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FunctionRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const { data: functions = [], isLoading } = useQuery({
    queryKey: ["functions-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("functions")
        .select("id, name, description, category, is_active, function_permissions ( permission )")
        .order("category").order("name");
      if (error) throw error;
      return data as unknown as FunctionRow[];
    },
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (f: FunctionRow) => {
    setEditing(f);
    const perms = emptyPerms();
    f.function_permissions.forEach(p => { perms[p.permission] = true; });
    setForm({
      name: f.name,
      description: f.description || "",
      category: f.category,
      is_active: f.is_active,
      permissions: perms,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome é obrigatório");
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        is_active: form.is_active,
      };

      let functionId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("functions").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("functions").insert(payload).select("id").single();
        if (error) throw error;
        functionId = data.id;
      }
      if (!functionId) throw new Error("Falha ao salvar função");

      // sync permissions: delete all + insert desired
      const desired = (Object.entries(form.permissions) as [Permission, boolean][])
        .filter(([, v]) => v).map(([k]) => k);
      const { error: delErr } = await supabase.from("function_permissions").delete().eq("function_id", functionId);
      if (delErr) throw delErr;
      if (desired.length) {
        const { error: insErr } = await supabase.from("function_permissions").insert(
          desired.map(p => ({ function_id: functionId!, permission: p }))
        );
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["functions-full"] });
      toast.success(editing ? "Função atualizada!" : "Função criada!");
      setDialogOpen(false); setEditing(null); setForm(emptyForm());
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const toggleActive = useMutation({
    mutationFn: async (f: FunctionRow) => {
      const { error } = await supabase.from("functions").update({ is_active: !f.is_active }).eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["functions-full"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const grouped = functions.reduce((acc, f) => {
    (acc[f.category] = acc[f.category] || []).push(f);
    return acc;
  }, {} as Record<Category, FunctionRow[]>);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">Funções</h1>
            <p className="text-sm text-muted-foreground">
              Cadastro das funções exercidas na casa e os módulos do sistema que cada uma libera.
            </p>
          </div>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Nova função</Button>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Carregando...</div>
        ) : functions.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Nenhuma função cadastrada.</div>
        ) : (
          (Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([cat, label]) => {
            const items = grouped[cat] || [];
            if (!items.length) return null;
            return (
              <section key={cat} className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</h2>
                <div className="rounded-lg border bg-card overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Permissões concedidas</TableHead>
                        <TableHead className="w-[120px]">Ativa</TableHead>
                        <TableHead className="w-[80px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(f => (
                        <TableRow key={f.id}>
                          <TableCell>
                            <div className="font-medium">{f.name}</div>
                            {f.description && <div className="text-xs text-muted-foreground">{f.description}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {f.function_permissions.length === 0
                                ? <span className="text-xs text-muted-foreground">Nenhuma</span>
                                : f.function_permissions.map(p => (
                                  <Badge key={p.permission} variant="outline" className="text-xs">
                                    {PERMISSION_LABELS[p.permission]}
                                  </Badge>
                                ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch checked={f.is_active} onCheckedChange={() => toggleActive.mutate(f)} />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(f)} title="Editar">
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); setEditing(null); setForm(emptyForm()); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar função" : "Nova função"}</DialogTitle>
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
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as Category }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form.is_active} onCheckedChange={c => setForm(f => ({ ...f, is_active: c }))} />
              Função ativa (disponível para novas atribuições)
            </label>

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Módulos liberados</h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(PERMISSION_LABELS) as [Permission, string][]).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.permissions[k]}
                      onCheckedChange={c => setForm(f => ({ ...f, permissions: { ...f.permissions, [k]: !!c } }))}
                    />
                    {v}
                  </label>
                ))}
              </div>
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
    </AppLayout>
  );
}
