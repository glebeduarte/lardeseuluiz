import { Monitor } from "lucide-react";
import { hora, nomeDia, useAtividades } from "@/lib/site";
import { cn } from "@/lib/utils";

const COR_BLOCO: Record<string, string> = {
  dialogo: "bg-lsl-azul/15 text-primary border-lsl-azul/30",
  palestra: "bg-lsl-dourado/20 text-accent-foreground border-lsl-dourado/40",
  evangelho: "bg-lsl-dourado/20 text-accent-foreground border-lsl-dourado/40",
  macas: "bg-lsl-teal/15 text-secondary border-lsl-teal/30",
  passes: "bg-lsl-teal/15 text-secondary border-lsl-teal/30",
  desobsessao: "bg-lsl-teal/15 text-secondary border-lsl-teal/30",
  estudo: "bg-muted text-muted-foreground border-border",
  outro: "bg-muted text-muted-foreground border-border",
};

/** Cartões da programação semanal, cada um com a sequência do dia. */
export function Programacao() {
  const { data, isLoading } = useAtividades();
  if (isLoading) return <p className="text-muted-foreground">Carregando horários…</p>;
  if (!data?.length) return <p className="text-muted-foreground">Programação em atualização.</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.map((a) => (
        <article key={a.id} className="rounded-lg border bg-card p-5 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">{nomeDia(a)}</span>
            <span className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">{hora(a.inicio)} às {hora(a.fim)}</span>
          </div>
          <h3 className="text-xl font-semibold leading-snug">{a.titulo}</h3>
          {a.descricao && <p className="text-sm text-muted-foreground">{a.descricao}</p>}
          {a.online && (
            <span className="flex items-center gap-1.5 text-sm text-primary"><Monitor className="h-4 w-4" aria-hidden /> Online, pelo Google Meet</span>
          )}
          {a.atividade_blocos.length > 0 && (
            <ol className="flex flex-col gap-1.5 pt-1">
              {a.atividade_blocos.map((b) => (
                <li key={b.id} className={cn("flex items-center justify-between gap-3 rounded-md border px-3 py-1.5 text-sm", COR_BLOCO[b.categoria])}>
                  <span>{b.titulo}</span>
                  <span className="tabular-nums whitespace-nowrap">{hora(b.inicio)}–{hora(b.fim)}</span>
                </li>
              ))}
            </ol>
          )}
        </article>
      ))}
    </div>
  );
}
