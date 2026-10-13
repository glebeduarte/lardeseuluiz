import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarDays, Megaphone, GraduationCap, Heart, Mic } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type EventType = "palestra" | "evento" | "acao_social" | "curso" | "outro";

interface SiteEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  speaker: string | null;
  is_published: boolean;
  created_at: string;
}

const typeLabels: Record<EventType, string> = {
  palestra: "Palestra",
  evento: "Evento",
  acao_social: "Ação Social",
  curso: "Curso / Formação",
  outro: "Outro",
};

const typeIcons: Record<EventType, any> = {
  palestra: Mic,
  evento: CalendarDays,
  acao_social: Heart,
  curso: GraduationCap,
  outro: Megaphone,
};

const typeColors: Record<EventType, string> = {
  palestra: "bg-[hsl(var(--primary-muted))] text-[hsl(var(--primary))]",
  evento: "bg-[hsl(var(--secondary-muted))] text-[hsl(var(--secondary))]",
  acao_social: "bg-[hsl(var(--accent-muted))] text-[hsl(var(--accent-dark))]",
  curso: "bg-amber-100 text-amber-700",
  outro: "bg-gray-100 text-gray-600",
};

const emptyForm = {
  title: "",
  description: "",
  event_type: "evento" as EventType,
  event_date: "",
  start_time: "",
  end_time: "",
  location: "",
  speaker: "",
  is_published: false,
};

export default function Eventos() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SiteEvent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterType, setFilterType] = useState<string>("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["site_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as SiteEvent[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        event_type: values.event_type,
        event_date: values.event_date,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
        location: values.location || null,
        speaker: values.speaker || null,
        is_published: values.is_published,
      };
      if (values.id) {
        const { error } = await supabase.from("site_events").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site_events"] });
      toast.success(editing ? "Evento atualizado!" : "Evento criado!");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site_events"] });
      toast.success("Evento excluído.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (ev: SiteEvent) => {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description || "",
      event_type: ev.event_type,
      event_date: ev.event_date,
      start_time: ev.start_time || "",
      end_time: ev.end_time || "",
      location: ev.location || "",
      speaker: ev.speaker || "",
      is_published: ev.is_published,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.event_date) {
      toast.error("Preencha título e data.");
      return;
    }
    saveMutation.mutate(editing ? { ...form, id: editing.id } : form);
  };

  const filtered = filterType === "all" ? events : events.filter((e) => e.event_type === filterType);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">Eventos e Ações</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie palestras, eventos e ações sociais visíveis no site.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Evento
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Button variant={filterType === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterType("all")}>
            Todos
          </Button>
          {(Object.keys(typeLabels) as EventType[]).map((t) => (
            <Button key={t} variant={filterType === t ? "default" : "outline"} size="sm" onClick={() => setFilterType(t)}>
              {typeLabels[t]}
            </Button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum evento encontrado.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-semibold">Evento</th>
                    <th className="text-left px-4 py-3 font-semibold">Tipo</th>
                    <th className="text-left px-4 py-3 font-semibold">Data</th>
                    <th className="text-left px-4 py-3 font-semibold">Horário</th>
                    <th className="text-center px-4 py-3 font-semibold">Publicado</th>
                    <th className="text-right px-4 py-3 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ev) => {
                    const Icon = typeIcons[ev.event_type];
                    return (
                      <tr key={ev.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{ev.title}</div>
                          {ev.speaker && <div className="text-xs text-muted-foreground mt-0.5">{ev.speaker}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={`gap-1 ${typeColors[ev.event_type]}`}>
                            <Icon className="w-3 h-3" />
                            {typeLabels[ev.event_type]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(ev.event_date + "T12:00:00"), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {ev.start_time || "—"}{ev.end_time ? ` – ${ev.end_time}` : ""}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={ev.is_published ? "default" : "outline"} className="text-xs">
                            {ev.is_published ? "Sim" : "Não"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(ev)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("Excluir este evento?")) deleteMutation.mutate(ev.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Evento" : "Novo Evento"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nome do evento" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo *</Label>
                  <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v as EventType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(typeLabels) as EventType[]).map((t) => (
                        <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Horário Início</Label>
                  <Input value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} placeholder="Ex: 15h" />
                </div>
                <div>
                  <Label>Horário Término</Label>
                  <Input value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} placeholder="Ex: 18h" />
                </div>
              </div>

              <div>
                <Label>Palestrante / Responsável</Label>
                <Input value={form.speaker} onChange={(e) => setForm({ ...form, speaker: e.target.value })} placeholder="Nome" />
              </div>

              <div>
                <Label>Local</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: Sede da casa" />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Detalhes do evento..." />
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                <Label>Publicar no site</Label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando..." : editing ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
