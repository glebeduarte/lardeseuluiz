import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/app/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronRight, Users } from "lucide-react";

interface Secretaria {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  created_at: string;
  member_count?: number;
}

const Secretarias = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "📋" });

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    const { data: secs } = await supabase.from("secretarias").select("*").order("name");
    const { data: members } = await supabase.from("secretaria_members").select("secretaria_id");

    const countMap: Record<string, number> = {};
    (members || []).forEach((m: any) => { countMap[m.secretaria_id] = (countMap[m.secretaria_id] || 0) + 1; });

    setSecretarias((secs || []).map((s: any) => ({ ...s, member_count: countMap[s.id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const openCreate = () => { setEditId(null); setForm({ name: "", description: "", icon: "📋" }); setDialogOpen(true); };
  const openEdit = (s: Secretaria) => { setEditId(s.id); setForm({ name: s.name, description: s.description || "", icon: s.icon }); setDialogOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, description: form.description || null, icon: form.icon };
    if (editId) {
      const { error } = await supabase.from("secretarias").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Secretaria atualizada!");
    } else {
      const { error } = await supabase.from("secretarias").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Secretaria criada!");
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("secretarias").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Secretaria removida!");
    fetchData();
  };

  if (authLoading || loading) return (
    <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AppLayout>
  );

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Playfair_Display'] text-2xl font-bold">Secretarias</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Nova Secretaria</Button>
      </div>

      {secretarias.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma secretaria cadastrada.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {secretarias.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <h3 className="font-semibold text-foreground">{s.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Users className="w-3 h-3" /> {s.member_count} membro{s.member_count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir secretaria?</AlertDialogTitle>
                          <AlertDialogDescription>Excluir <strong>{s.name}</strong> removerá todos os membros, responsabilidades e ações associadas.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {s.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{s.description}</p>}
                <Link to={`/app/secretarias/${s.id}`}>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    Acessar <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar" : "Nova"} Secretaria</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-[60px_1fr] gap-4">
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="text-center text-xl" maxLength={4} />
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Direção Geral" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Atribuições e escopo da secretaria..." rows={3} />
            </div>
            <Button type="submit" className="w-full">{editId ? "Atualizar" : "Criar Secretaria"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Secretarias;
