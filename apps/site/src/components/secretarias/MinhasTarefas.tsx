import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, ChevronRight, CalendarDays } from "lucide-react";
import { db } from "@/lib/acoes";
import { atrasada, dataAmigavel, STATUS_COR, STATUS_ROTULO, type StatusTarefa } from "@/lib/secretarias";

type Minha = { id: string; title: string; status: StatusTarefa; due_date: string | null; secretaria_id: string; secretaria: string };

/** Tarefas atribuídas à pessoa em todas as secretarias (perfil único). */
export default function MinhasTarefas({ desativado }: { desativado?: boolean }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["minhas-tarefas"],
    enabled: !desativado,
    queryFn: async () => ((await db.rpc("minhas_tarefas")).data ?? []) as Minha[],
  });
  if (desativado || isLoading || data.length === 0) return null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
          <ListChecks className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <CardTitle className="font-['Playfair_Display'] text-lg">Minhas tarefas</CardTitle>
          <CardDescription>{data.length} em aberto nas secretarias</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.slice(0, 5).map((t) => (
          <Link key={t.id} to={`/app/secretarias/${t.secretaria_id}/tarefas?tarefa=${t.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{t.title}</div>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                <span>{t.secretaria}</span>
                {t.due_date && <span className={`inline-flex items-center gap-1 ${atrasada(t) ? "text-destructive font-medium" : ""}`}><CalendarDays className="w-3 h-3" />{dataAmigavel(t.due_date)}</span>}
              </div>
            </div>
            <span className={`text-[10px] rounded-full border px-2 py-0.5 font-medium shrink-0 ${STATUS_COR[t.status]}`}>{STATUS_ROTULO[t.status]}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        ))}
        <Button variant="ghost" size="sm" asChild><Link to="/app/secretarias">Ver secretarias <ChevronRight className="w-4 h-4 ml-1" /></Link></Button>
      </CardContent>
    </Card>
  );
}
