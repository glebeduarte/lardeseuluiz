import { TIPO_EVENTO, diaDoMes, diaSemana, hora, mesCurto, type Evento } from "@/lib/site";

export function ListaEventos({ eventos, vazio = "Nenhuma data programada no momento." }: { eventos: Evento[] | undefined; vazio?: string }) {
  if (!eventos) return <p className="text-muted-foreground">Carregando agenda…</p>;
  if (!eventos.length) return <p className="text-muted-foreground">{vazio}</p>;
  return (
    <ol className="flex flex-col divide-y rounded-lg border bg-card">
      {eventos.map((e) => (
        <li key={e.id} className="flex gap-4 p-4">
          <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-primary/10 py-2 text-primary">
            <span className="font-display text-2xl font-semibold leading-none tabular-nums">{diaDoMes(e.data)}</span>
            <span className="text-xs uppercase tracking-wide">{mesCurto(e.data)}</span>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
              {TIPO_EVENTO[e.tipo]} · {diaSemana(e.data)}{e.inicio ? `, ${hora(e.inicio)}` : ""}
            </span>
            <span className="font-medium leading-snug">{e.titulo}</span>
            {e.palestrante && <span className="text-sm text-muted-foreground">{e.palestrante}</span>}
            {e.descricao && <span className="text-sm text-muted-foreground">{e.descricao}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}
