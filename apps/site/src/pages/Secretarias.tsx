import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/app/AppLayout";
import { db } from "@/lib/acoes";
import { useMinhasSecretarias, type SecretariaResumo } from "@/lib/secretarias";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, ChevronRight, Users, Circle, Loader, CheckCircle2 } from "lucide-react";

/** Secretarias que a pessoa pode abrir: as suas primeiro; a direção e os admins veem todas. */
export default function Secretarias() {
  const qc = useQueryClient();
  const { data: secretarias = [], isLoading } = useMinhasSecretarias();
  const { data: direcao } = useQuery({ queryKey: ["eh-direcao"], queryFn: async () => !!(await db.rpc("eh_direcao")).data });
  const [dlg, setDlg] = useState(false);
  const [edit, setEdit] = useState<SecretariaResumo | null>(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "📋" });

  const minhas = secretarias.filter((s) => s.sou_membro);
  const outras = secretarias.filter((s) => !s.sou_membro);

  const abrir = (s?: SecretariaResumo) => {
    setEdit(s ?? null);
    setForm({ name: s?.name ?? "", description: s?.description ?? "", icon: s?.icon ?? "📋" });
    setDlg(true);
  };
  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Informe o nome");
      const payload = { name: form.name.trim(), description: form.description.trim() || null, icon: form.icon || "📋" };
      const { error } = edit ? await db.from("secretarias").update(payload).eq("id", edit.id) : await db.from("secretarias").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["minhas-secretarias"] }); setDlg(false); toast.success("Secretaria salva"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">Secretarias</h1>
            <p className="text-sm text-muted-foreground">Responsabilidades, pessoas e tarefas de cada secretaria da Casa.</p>
          </div>
          {direcao && <Button variant="outline" onClick={() => abrir()}><Plus className="w-4 h-4 mr-2" /> Nova secretaria</Button>}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
        ) : secretarias.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
            Você ainda não faz parte de nenhuma secretaria. A coordenação de cada secretaria inclui os seus participantes.
          </CardContent></Card>
        ) : (
          <>
            {minhas.length > 0 && <Grupo titulo="Minhas secretarias" lista={minhas} podeEditar={!!direcao} aoEditar={abrir} />}
            {outras.length > 0 && <Grupo titulo={minhas.length ? "Outras secretarias" : "Todas as secretarias"} lista={outras} podeEditar={!!direcao} aoEditar={abrir} />}
          </>
        )}
      </div>

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{edit ? "Editar secretaria" : "Nova secretaria"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-[72px_1fr] gap-3">
              <div className="grid gap-2"><Label>Ícone</Label><Input className="h-11 text-center text-xl" maxLength={4} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Nome *</Label><Input className="h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(false)}>Cancelar</Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Grupo({ titulo, lista, podeEditar, aoEditar }: { titulo: string; lista: SecretariaResumo[]; podeEditar: boolean; aoEditar: (s: SecretariaResumo) => void }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lista.map((s) => (
          <Card key={s.id} className="relative hover:shadow-md transition-shadow">
            <Link to={`/app/secretarias/${s.id}`} className="block p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: "hsl(var(--primary) / 0.08)" }}>{s.icon || "📋"}</span>
                <div className="min-w-0 flex-1 pr-6">
                  <div className="font-semibold text-foreground text-base">{s.name}</div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {s.sou_coordenador ? <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">Você coordena</Badge>
                      : s.sou_membro ? <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Você participa</Badge> : null}
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Users className="w-3 h-3" /> {s.membros}</span>
                  </div>
                </div>
              </div>
              {s.description && <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-sky-700"><Circle className="w-4 h-4" /> {s.a_fazer}</span>
                  <span className="inline-flex items-center gap-1.5 text-amber-700"><Loader className="w-4 h-4" /> {s.fazendo}</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-700" title="Feitas nos últimos 30 dias"><CheckCircle2 className="w-4 h-4" /> {s.feitas_30d}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
            {podeEditar && (
              <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-8 w-8" aria-label="Editar secretaria" onClick={() => aoEditar(s)}>
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
