import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Trash2, Send, Lock, Ban, RotateCcw } from "lucide-react";
import { db } from "@/lib/acoes";
import { STATUS, dataAmigavel, tempoAtras, type Atualizacao, type PessoaSecretaria, type Tarefa } from "@/lib/secretarias";
import { Avatar } from "./TarefaCartao";

/** Detalhe da tarefa: sobe de baixo no celular e abre de lado no computador. */
export default function TarefaGaveta({ tarefa, aoFechar, pessoas, eu, souCoordenador }: {
  tarefa: Tarefa | null; aoFechar: () => void; pessoas: PessoaSecretaria[]; eu: string | null; souCoordenador: boolean;
}) {
  const mobile = useIsMobile();
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", description: "", due_date: "" });
  const [comentario, setComentario] = useState("");
  const [apagar, setApagar] = useState(false);
  useEffect(() => { if (tarefa) setF({ title: tarefa.title, description: tarefa.description ?? "", due_date: tarefa.due_date ?? "" }); }, [tarefa]);

  const podeEditar = !!tarefa && (tarefa.created_by === eu || souCoordenador);
  const responsaveis = new Set((tarefa?.secretaria_task_assignees ?? []).map((a) => a.person_id));
  const nome = (id: string | null) => pessoas.find((p) => p.person_id === id)?.full_name ?? "Alguém";
  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["secretaria-tarefas", tarefa?.secretaria_id] });
    qc.invalidateQueries({ queryKey: ["tarefa-atualizacoes", tarefa?.id] });
    qc.invalidateQueries({ queryKey: ["minhas-secretarias"] });
    qc.invalidateQueries({ queryKey: ["minhas-tarefas"] });
  };

  const { data: atualizacoes = [] } = useQuery({
    queryKey: ["tarefa-atualizacoes", tarefa?.id],
    enabled: !!tarefa,
    queryFn: async () => ((await db.from("secretaria_task_updates").select("*").eq("task_id", tarefa!.id).order("created_at", { ascending: false })).data ?? []) as Atualizacao[],
  });

  const alterar = useMutation({
    mutationFn: async (campos: Partial<Tarefa>) => {
      const { error } = await db.from("secretaria_tasks").update(campos).eq("id", tarefa!.id);
      if (error) throw error;
    },
    onSuccess: recarregar,
    onError: (e: Error) => toast.error(e.message),
  });
  const responsavel = useMutation({
    mutationFn: async (pessoa: string) => {
      const q = responsaveis.has(pessoa)
        ? db.from("secretaria_task_assignees").delete().eq("task_id", tarefa!.id).eq("person_id", pessoa)
        : db.from("secretaria_task_assignees").insert({ task_id: tarefa!.id, person_id: pessoa });
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: recarregar,
    onError: (e: Error) => toast.error(e.message),
  });
  const comentar = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("secretaria_task_updates").insert({ task_id: tarefa!.id, person_id: eu, kind: "comentario", body: comentario.trim() });
      if (error) throw error;
    },
    onSuccess: () => { setComentario(""); recarregar(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remover = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("secretaria_tasks").delete().eq("id", tarefa!.id);
      if (error) throw error;
    },
    onSuccess: () => { recarregar(); setApagar(false); aoFechar(); toast.success("Tarefa apagada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const mudou = !!tarefa && (f.title !== tarefa.title || f.description !== (tarefa.description ?? "") || f.due_date !== (tarefa.due_date ?? ""));

  return (
    <>
      <Sheet open={!!tarefa} onOpenChange={(v) => { if (!v) aoFechar(); }}>
        <SheetContent side={mobile ? "bottom" : "right"}
          className={mobile ? "h-[92vh] rounded-t-2xl p-0 flex flex-col" : "w-full sm:max-w-lg p-0 flex flex-col"}>
          {tarefa && (
            <>
              <SheetHeader className="px-5 pt-5 pb-3 text-left border-b">
                {mobile && <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted" />}
                <SheetTitle className="font-['Playfair_Display'] text-xl pr-8 leading-snug">{tarefa.title}</SheetTitle>
                <SheetDescription>
                  Criada por {nome(tarefa.created_by)} · {tempoAtras(tarefa.created_at)}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                {/* Situação: qualquer membro muda */}
                <div className="space-y-2">
                  <Label className="text-sm">Situação</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {STATUS.map((s) => (
                      <button key={s.valor} type="button" disabled={alterar.isPending}
                        onClick={() => s.valor !== tarefa.status && alterar.mutate({ status: s.valor })}
                        className={`h-12 rounded-xl border text-sm font-semibold transition-colors ${tarefa.status === s.valor ? s.cor : "bg-card hover:bg-muted text-muted-foreground"}`}>
                        {s.rotulo}
                      </button>
                    ))}
                  </div>
                  {tarefa.status === "feita" && tarefa.done_at && <p className="text-xs text-muted-foreground">Feita {dataAmigavel(tarefa.done_at)}.</p>}
                </div>

                {/* Conteúdo: quem criou ou a coordenação edita */}
                {podeEditar ? (
                  <div className="space-y-4">
                    <div className="grid gap-2"><Label className="text-sm">Título</Label>
                      <Input className="h-12 text-base" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
                    <div className="grid gap-2"><Label className="text-sm">Detalhes</Label>
                      <Textarea rows={4} className="text-base" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
                    <div className="grid gap-2 w-52"><Label className="text-sm">Prazo</Label>
                      <Input type="date" className="h-12 text-base" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></div>
                    {mudou && (
                      <Button className="h-11 w-full sm:w-auto" disabled={!f.title.trim() || alterar.isPending}
                        onClick={() => alterar.mutate({ title: f.title.trim(), description: f.description.trim() || null, due_date: f.due_date || null })}>
                        Salvar alterações
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tarefa.description ? <p className="text-[15px] whitespace-pre-line leading-relaxed">{tarefa.description}</p>
                      : <p className="text-sm text-muted-foreground">Sem detalhes.</p>}
                    {tarefa.due_date && <p className="text-sm"><span className="text-muted-foreground">Prazo:</span> {dataAmigavel(tarefa.due_date)}</p>}
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Só {nome(tarefa.created_by).split(" ")[0]} e a coordenação editam o conteúdo.</p>
                  </div>
                )}

                {/* Responsáveis */}
                <div className="space-y-2">
                  <Label className="text-sm">Responsáveis</Label>
                  <div className="flex flex-wrap gap-2">
                    {pessoas.filter((p) => podeEditar || responsaveis.has(p.person_id) || p.person_id === eu).map((p) => {
                      const sel = responsaveis.has(p.person_id);
                      const pode = podeEditar || p.person_id === eu;
                      return (
                        <button key={p.person_id} type="button" disabled={!pode || responsavel.isPending} onClick={() => responsavel.mutate(p.person_id)}
                          className={`inline-flex items-center gap-2 rounded-full border pl-1 pr-3 h-10 text-sm transition-colors disabled:cursor-default ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}>
                          <Avatar pessoa={p} tamanho={30} />
                          {p.full_name.split(" ")[0]}{p.person_id === eu ? (sel ? " (eu)" : " · assumir") : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comentários e histórico */}
                <div className="space-y-3">
                  <Label className="text-sm">Atualizações</Label>
                  <div className="flex gap-2">
                    <Input className="h-11 text-base" placeholder="Escreva uma atualização" value={comentario}
                      onChange={(e) => setComentario(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && comentario.trim()) comentar.mutate(); }} />
                    <Button size="icon" className="h-11 w-11 shrink-0" aria-label="Enviar" disabled={!comentario.trim() || comentar.isPending} onClick={() => comentar.mutate()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <ul className="space-y-3">
                    {atualizacoes.map((a) => (
                      <li key={a.id} className="flex gap-3">
                        <Avatar pessoa={pessoas.find((p) => p.person_id === a.person_id) ?? { full_name: nome(a.person_id), photo_url: null }} tamanho={30} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{nome(a.person_id).split(" ")[0]}</span> · {tempoAtras(a.created_at)}</div>
                          <div className={`text-sm mt-0.5 ${a.kind === "comentario" ? "rounded-lg bg-muted px-3 py-2" : "text-muted-foreground"}`}>{a.body}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t px-5 py-3 flex flex-wrap gap-2 justify-between">
                {podeEditar ? (
                  tarefa.status !== "cancelada" ? (
                    <Button variant="ghost" className="h-10 text-muted-foreground" onClick={() => alterar.mutate({ status: "cancelada" })}><Ban className="w-4 h-4 mr-2" /> Cancelar tarefa</Button>
                  ) : (
                    <Button variant="ghost" className="h-10" onClick={() => alterar.mutate({ status: "a_fazer" })}><RotateCcw className="w-4 h-4 mr-2" /> Reabrir</Button>
                  )
                ) : <span />}
                {podeEditar && <Button variant="ghost" className="h-10 text-destructive hover:text-destructive" onClick={() => setApagar(true)}><Trash2 className="w-4 h-4 mr-2" /> Apagar</Button>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={apagar} onOpenChange={setApagar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esta tarefa?</AlertDialogTitle>
            <AlertDialogDescription>A tarefa, os responsáveis e as atualizações saem do registro da secretaria. Se ela só não vai mais acontecer, prefira "Cancelar tarefa".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => remover.mutate()}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

