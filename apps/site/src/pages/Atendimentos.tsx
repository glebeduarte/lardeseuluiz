import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/app/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Heart, Plus, Calendar, User, Eye } from "lucide-react";

const sessionTypeLabels: Record<string, string> = {
  passe: "Passe", orientacao: "Orientação", desobsessao: "Desobsessão", estudo: "Estudo", outro: "Outro",
};
const sessionStatusLabels: Record<string, string> = {
  agendada: "Agendada", realizada: "Realizada", cancelada: "Cancelada",
};

interface SpiritualSession {
  id: string;
  person_id: string | null;
  associate_id: string | null;
  session_type: string;
  session_status: string;
  scheduled_date: string;
  notes: string | null;
  attendant_name: string | null;
  is_anonymous: boolean;
  anonymous_name: string | null;
  created_at: string;
}

interface Person {
  id: string;
  full_name: string;
}

const Atendimentos = () => {
  const { user, loading: authLoading, roles } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SpiritualSession[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailSession, setDetailSession] = useState<SpiritualSession | null>(null);
  const [form, setForm] = useState({
    person_id: "", session_type: "passe", scheduled_date: "",
    notes: "", attendant_name: "", is_anonymous: false, anonymous_name: "",
  });

  const isAdmin = roles.includes("admin") || roles.includes("gestor");

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    const [sessRes, peopleRes] = await Promise.all([
      supabase.from("spiritual_sessions").select("*").order("scheduled_date", { ascending: false }),
      supabase.from("people").select("id, full_name").order("full_name"),
    ]);
    setSessions((sessRes.data || []) as SpiritualSession[]);
    setPeople((peopleRes.data || []) as Person[]);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      session_type: form.session_type as any,
      scheduled_date: form.scheduled_date,
      notes: form.notes || null,
      attendant_name: form.attendant_name || null,
      is_anonymous: form.is_anonymous,
      anonymous_name: form.is_anonymous ? (form.anonymous_name || null) : null,
      person_id: form.is_anonymous ? null : (form.person_id || null),
      created_by: user?.id,
    };
    const { error } = await supabase.from("spiritual_sessions").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Atendimento registrado!");
    setDialogOpen(false);
    setForm({ person_id: "", session_type: "passe", scheduled_date: "", notes: "", attendant_name: "", is_anonymous: false, anonymous_name: "" });
    fetchData();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("spiritual_sessions").update({ session_status: newStatus as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status atualizado!");
    fetchData();
  };

  const getPersonName = (session: SpiritualSession) => {
    const id = session.person_id || session.associate_id;
    if (!id) return "—";
    return people.find(a => a.id === id)?.full_name || "—";
  };

  const stats = {
    total: sessions.length,
    agendadas: sessions.filter(s => s.session_status === "agendada").length,
    realizadas: sessions.filter(s => s.session_status === "realizada").length,
    anonimos: sessions.filter(s => s.is_anonymous).length,
  };

  if (authLoading || loading) return (
    <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AppLayout>
  );

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Playfair_Display'] text-2xl font-bold flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary" /> Assistência Espiritual
        </h1>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Novo Atendimento</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Registrar Atendimento</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="is_anonymous" checked={form.is_anonymous}
                    onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked }))}
                    className="rounded border-input" />
                  <Label htmlFor="is_anonymous">Atendimento anônimo</Label>
                </div>
                {form.is_anonymous ? (
                  <div className="space-y-2">
                    <Label>Nome fictício (opcional)</Label>
                    <Input value={form.anonymous_name} onChange={e => setForm(f => ({ ...f, anonymous_name: e.target.value }))} placeholder="Ex: Participante A" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Pessoa</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.person_id} onChange={e => setForm(f => ({ ...f, person_id: e.target.value }))}>
                      <option value="">Selecione...</option>
                      {people.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.session_type} onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))}>
                      {Object.entries(sessionTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data/Hora *</Label>
                    <Input type="datetime-local" required value={form.scheduled_date}
                      onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Atendente</Label>
                  <Input value={form.attendant_name} onChange={e => setForm(f => ({ ...f, attendant_name: e.target.value }))} placeholder="Nome do atendente" />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas internas (confidencial)" rows={3} />
                </div>
                <Button type="submit" className="w-full">Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", value: stats.total, icon: "📋", color: "primary" },
          { label: "Agendadas", value: stats.agendadas, icon: "📅", color: "accent" },
          { label: "Realizadas", value: stats.realizadas, icon: "✅", color: "secondary" },
          { label: "Anônimos", value: stats.anonimos, icon: "🔒", color: "muted-foreground" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
              <div className="text-lg mt-1">{s.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="font-['Playfair_Display']">Atendimentos</CardTitle></CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum atendimento registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Assistido</TableHead>
                    <TableHead>Atendente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {new Date(s.scheduled_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(s.scheduled_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {sessionTypeLabels[s.session_type] || s.session_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.is_anonymous ? (
                          <span className="text-muted-foreground italic flex items-center gap-1">
                            <User className="w-3.5 h-3.5" /> {s.anonymous_name || "Anônimo"}
                          </span>
                        ) : getPersonName(s)}
                      </TableCell>
                      <TableCell className="text-sm">{s.attendant_name || "—"}</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <select className="text-xs border border-input rounded px-2 py-1 bg-background"
                            value={s.session_status}
                            onChange={e => handleStatusChange(s.id, e.target.value)}>
                            {Object.entries(sessionStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs">{sessionStatusLabels[s.session_status]}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setDetailSession(s)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailSession} onOpenChange={() => setDetailSession(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes do Atendimento</DialogTitle></DialogHeader>
          {detailSession && (
            <div className="space-y-3 text-sm">
              <div><span className="font-medium">Data:</span> {new Date(detailSession.scheduled_date).toLocaleString("pt-BR")}</div>
              <div><span className="font-medium">Tipo:</span> {sessionTypeLabels[detailSession.session_type]}</div>
              <div><span className="font-medium">Assistido:</span> {detailSession.is_anonymous ? (detailSession.anonymous_name || "Anônimo") : getPersonName(detailSession)}</div>
              <div><span className="font-medium">Atendente:</span> {detailSession.attendant_name || "—"}</div>
              <div><span className="font-medium">Status:</span> {sessionStatusLabels[detailSession.session_status]}</div>
              {detailSession.notes && <div><span className="font-medium">Observações:</span><p className="mt-1 text-muted-foreground whitespace-pre-wrap">{detailSession.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Atendimentos;
