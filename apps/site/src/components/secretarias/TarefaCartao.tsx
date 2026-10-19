import { CalendarDays, Check, MessageSquare } from "lucide-react";
import { iniciaisLsl } from "@/compartilhado";
import { atrasada, dataAmigavel, STATUS_COR, STATUS_ROTULO, type PessoaSecretaria, type Tarefa } from "@/lib/secretarias";

export function Avatar({ pessoa, tamanho = 28 }: { pessoa?: Pick<PessoaSecretaria, "full_name" | "photo_url"> | null; tamanho?: number }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 font-bold border-2 border-card"
      style={{ width: tamanho, height: tamanho, fontSize: Math.max(10, tamanho * 0.38), background: "hsl(var(--accent))", color: "hsl(var(--primary-dark))" }}
      title={pessoa?.full_name}>
      {pessoa?.photo_url ? <img src={pessoa.photo_url} alt="" className="w-full h-full object-cover" /> : iniciaisLsl(pessoa?.full_name)}
    </span>
  );
}

/** Cartão de tarefa: grande, fácil de tocar, usado na lista, no kanban e nas tarefas recentes. */
export default function TarefaCartao({ tarefa, pessoas, aoAbrir, aoConcluir, mostrarStatus = true, arrastavel, comentarios }: {
  tarefa: Tarefa; pessoas: PessoaSecretaria[]; aoAbrir: () => void; aoConcluir?: () => void; mostrarStatus?: boolean;
  arrastavel?: boolean; comentarios?: number;
}) {
  const responsaveis = (tarefa.secretaria_task_assignees ?? []).map((a) => pessoas.find((p) => p.person_id === a.person_id)).filter(Boolean) as PessoaSecretaria[];
  const feita = tarefa.status === "feita";
  const venceu = atrasada(tarefa);
  return (
    <div
      role="button" tabIndex={0} onClick={aoAbrir} onKeyDown={(e) => { if (e.key === "Enter") aoAbrir(); }}
      draggable={arrastavel}
      onDragStart={(e) => { e.dataTransfer.setData("text/tarefa", tarefa.id); e.dataTransfer.effectAllowed = "move"; }}
      className={`group w-full text-left rounded-xl border bg-card p-4 flex gap-3 items-start cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${arrastavel ? "active:cursor-grabbing" : ""}`}
    >
      {aoConcluir && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); aoConcluir(); }}
          aria-label={feita ? "Marcar como não feita" : "Marcar como feita"}
          className={`mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${feita ? "bg-emerald-500 border-emerald-500 text-white" : "border-border hover:border-emerald-500 text-transparent hover:text-emerald-500"}`}
        >
          <Check className="w-4 h-4" strokeWidth={3} />
        </button>
      )}
      <div className="flex-1 min-w-0 space-y-2">
        <div className={`text-[15px] font-medium leading-snug ${feita ? "line-through text-muted-foreground" : "text-foreground"}`}>{tarefa.title}</div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {mostrarStatus && (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${STATUS_COR[tarefa.status]}`}>{STATUS_ROTULO[tarefa.status]}</span>
          )}
          {feita && tarefa.done_at ? (
            <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> feita {dataAmigavel(tarefa.done_at)}</span>
          ) : tarefa.due_date ? (
            <span className={`inline-flex items-center gap-1 ${venceu ? "text-destructive font-medium" : ""}`}>
              <CalendarDays className="w-3.5 h-3.5" /> {venceu ? "atrasada · " : ""}{dataAmigavel(tarefa.due_date)}
            </span>
          ) : null}
          {!!comentarios && <span className="inline-flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {comentarios}</span>}
        </div>
      </div>
      {responsaveis.length > 0 && (
        <div className="flex -space-x-2 shrink-0">
          {responsaveis.slice(0, 3).map((p) => <Avatar key={p.person_id} pessoa={p} />)}
          {responsaveis.length > 3 && <span className="w-7 h-7 rounded-full bg-muted text-[10px] font-bold flex items-center justify-center border-2 border-card">+{responsaveis.length - 3}</span>}
        </div>
      )}
    </div>
  );
}
