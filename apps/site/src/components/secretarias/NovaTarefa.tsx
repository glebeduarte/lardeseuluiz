import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { db } from "@/lib/acoes";
import { hoje, STATUS, type PessoaSecretaria, type StatusTarefa } from "@/lib/secretarias";
import { Avatar } from "./TarefaCartao";

/**
 * Nova tarefa ou "Registrar o que fiz" (entra direto como Feita).
 * Poucos campos, botões grandes e bem espaçados para o celular.
 */
export default function NovaTarefa({ aberto, aoFechar, secretariaId, pessoas, eu, modo = "nova", statusInicial = "a_fazer" }: {
  aberto: boolean; aoFechar: () => void; secretariaId: string; pessoas: PessoaSecretaria[]; eu: string | null;
  modo?: "nova" | "registrar"; statusInicial?: StatusTarefa;
}) {
  const qc = useQueryClient();
  const registrar = modo === "registrar";
  const vazio = () => ({ title: "", description: "", due_date: "", done_at: hoje(), status: (registrar ? "feita" : statusInicial) as StatusTarefa, responsaveis: eu ? [eu] : [] as string[] });
  const [f, setF] = useState(vazio());
  useEffect(() => { if (aberto) setF(vazio()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [aberto, modo, statusInicial]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (!f.title.trim()) throw new Error(registrar ? "Conte o que você fez" : "Dê um título para a tarefa");
      const { data, error } = await db.from("secretaria_tasks").insert({
        secretaria_id: secretariaId, title: f.title.trim(), description: f.description.trim() || null,
        status: f.status, due_date: registrar ? null : f.due_date || null, done_at: f.status === "feita" ? f.done_at || hoje() : null,
        created_by: eu,
      }).select("id").single();
      if (error) throw error;
      if (f.responsaveis.length) {
        const { error: e2 } = await db.from("secretaria_task_assignees").insert(f.responsaveis.map((p) => ({ task_id: data.id, person_id: p })));
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["secretaria-tarefas", secretariaId] });
      qc.invalidateQueries({ queryKey: ["minhas-secretarias"] });
      qc.invalidateQueries({ queryKey: ["minhas-tarefas"] });
      toast.success(registrar ? "Atividade registrada. Obrigado!" : "Tarefa criada");
      aoFechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternar = (id: string) => setF((x) => ({ ...x, responsaveis: x.responsaveis.includes(id) ? x.responsaveis.filter((r) => r !== id) : [...x.responsaveis, id] }));

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) aoFechar(); }}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-['Playfair_Display'] text-xl">{registrar ? "Registrar o que fiz" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>{registrar ? "Anote uma atividade que você já realizou pela secretaria." : "O que precisa ser feito?"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-1">
          <div className="grid gap-2">
            <Label className="text-sm">{registrar ? "O que você fez? *" : "Título *"}</Label>
            <Input autoFocus className="h-12 text-base" placeholder={registrar ? "Ex.: Organizei a sala de passes" : "Ex.: Preparar o mural de avisos"}
              value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter" && f.title.trim()) salvar.mutate(); }} />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm">Detalhes</Label>
            <Textarea rows={3} className="text-base" placeholder="Opcional" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>

          {registrar ? (
            <div className="grid gap-2 sm:w-52">
              <Label className="text-sm">Quando</Label>
              <Input type="date" className="h-12 text-base" value={f.done_at} max={hoje()} onChange={(e) => setF({ ...f, done_at: e.target.value })} />
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label className="text-sm">Situação</Label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS.map((s) => (
                    <button key={s.valor} type="button" onClick={() => setF({ ...f, status: s.valor })}
                      className={`h-11 rounded-lg border text-sm font-medium transition-colors ${f.status === s.valor ? s.cor + " ring-2 ring-offset-1 ring-current/30" : "bg-card hover:bg-muted"}`}>
                      {s.rotulo}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 sm:w-52">
                <Label className="text-sm">Prazo</Label>
                <Input type="date" className="h-12 text-base" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
              </div>
            </>
          )}

          {pessoas.length > 0 && (
            <div className="grid gap-2">
              <Label className="text-sm">{registrar ? "Quem participou" : "Responsáveis"}</Label>
              <div className="flex flex-wrap gap-2">
                {pessoas.map((p) => {
                  const sel = f.responsaveis.includes(p.person_id);
                  return (
                    <button key={p.person_id} type="button" onClick={() => alternar(p.person_id)}
                      className={`inline-flex items-center gap-2 rounded-full border pl-1 pr-3 h-10 text-sm transition-colors ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}>
                      <Avatar pessoa={p} tamanho={30} />
                      {p.full_name.split(" ")[0]}{p.person_id === eu ? " (eu)" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="h-11" onClick={aoFechar}>Cancelar</Button>
          <Button className="h-11" onClick={() => salvar.mutate()} disabled={salvar.isPending}>{salvar.isPending ? "Salvando..." : registrar ? "Registrar" : "Criar tarefa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
