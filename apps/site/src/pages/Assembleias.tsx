import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Users, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";

const statusLabels: Record<string, { label: string; class: string }> = {
  convocada: { label: "Convocada", class: "badge-blue" },
  em_andamento: { label: "Em andamento", class: "badge-gold" },
  encerrada: { label: "Encerrada", class: "badge-teal" },
  cancelada: { label: "Cancelada", class: "badge-red" },
};
const typeLabels: Record<string, string> = { ordinaria: "Ordinária", extraordinaria: "Extraordinária" };

const Assembleias = () => {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", assembly_type: "ordinaria", scheduled_date: "", location: "",
    description: "", quorum_required: "50", convocation_text: "",
  });

  const isAdmin = roles.includes("admin") || roles.includes("gestor");

  const fetchAssemblies = async () => {
    setLoading(true);
    const { data } = await supabase.from("assemblies").select("*, assembly_attendees(id)").order("scheduled_date", { ascending: false });
    setAssemblies(data || []);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchAssemblies(); }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("assemblies").insert({
      title: form.title,
      assembly_type: form.assembly_type as any,
      scheduled_date: new Date(form.scheduled_date).toISOString(),
      location: form.location || null,
      description: form.description || null,
      quorum_required: parseInt(form.quorum_required),
      convocation_text: form.convocation_text || null,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Assembleia convocada!");
    setDialogOpen(false);
    setForm({ title: "", assembly_type: "ordinaria", scheduled_date: "", location: "", description: "", quorum_required: "50", convocation_text: "" });
    fetchAssemblies();
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Playfair_Display'] text-2xl font-bold">Assembleias</h1>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button>+ Convocar assembleia</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Convocar Assembleia</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2"><Label>Título *</Label><Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Assembleia Geral Ordinária 2026" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.assembly_type} onChange={e => setForm(f => ({ ...f, assembly_type: e.target.value }))}>
                      <option value="ordinaria">Ordinária</option>
                      <option value="extraordinaria">Extraordinária</option>
                    </select>
                  </div>
                  <div className="space-y-2"><Label>Quórum mínimo (%)</Label><Input type="number" min="1" max="100" value={form.quorum_required} onChange={e => setForm(f => ({ ...f, quorum_required: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Data e hora *</Label><Input type="datetime-local" required value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Local</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Sede do Lar" /></div>
                </div>
                <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Texto de convocação</Label><textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.convocation_text} onChange={e => setForm(f => ({ ...f, convocation_text: e.target.value }))} placeholder="Convocamos todos os associados..." /></div>
                <Button type="submit" className="w-full">Convocar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {assemblies.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma assembleia registrada ainda.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {assemblies.map(a => {
            const st = statusLabels[a.status] || { label: a.status, class: "badge-grey" };
            const attendeeCount = a.assembly_attendees?.length || 0;
            const dateStr = new Date(a.scheduled_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
            return (
              <Card key={a.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/app/assembleias/${a.id}`)}>
                <CardContent className="py-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: a.status === "encerrada" ? "hsl(var(--secondary-muted))" : "hsl(var(--primary-muted))" }}>
                    {a.status === "encerrada" ? <CheckCircle className="w-5 h-5" style={{ color: "hsl(var(--secondary))" }} /> : <Calendar className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{a.title}</span>
                      <span className={`badge ${st.class}`}>{st.label}</span>
                      <span className="badge badge-grey">{typeLabels[a.assembly_type]}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {dateStr}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {attendeeCount} presentes</span>
                      {a.location && <span>📍 {a.location}</span>}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground hidden sm:block">Quórum: {a.quorum_required}%</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default Assembleias;
