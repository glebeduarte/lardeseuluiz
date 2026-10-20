import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, CalendarCheck, Building2, PencilLine, CalendarDays, ChevronRight, type LucideIcon } from "lucide-react";
import { db, dataLongaBR } from "@/lib/acoes";
import { atrasada, dataAmigavel, STATUS_COR, STATUS_ROTULO, type StatusTarefa } from "@/lib/secretarias";

// Início da Governança para o dia a dia: o que pede atenção e atalhos grandes, em palavras simples.

type Tarefa = { id: string; title: string; status: StatusTarefa; due_date: string | null; secretaria_id: string; secretaria: string };
type Escala = { id: string; data: string; hora: string | null; projeto: string; confirmed: boolean; task: string | null };
type Secretaria = { id: string; name: string };

const CORES = {
  azul: "bg-blue-50 text-blue-700",
  laranja: "bg-orange-50 text-orange-700",
  dourado: "bg-amber-50 text-amber-700",
  verde: "bg-emerald-50 text-emerald-700",
} as const;

function Atalho({ to, icone: Icone, titulo, detalhe, cor }: { to: string; icone: LucideIcon; titulo: string; detalhe: string; cor: keyof typeof CORES }) {
  return (
    <Link to={to} className="group flex items-center gap-4 rounded-3xl border bg-card p-4 sm:p-5 min-h-[84px] hover:border-primary/40 hover:bg-muted/40 transition-colors">
      <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${CORES[cor]}`}><Icone className="w-6 h-6" /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-base font-semibold text-foreground">{titulo}</span>
        <span className="block text-sm text-muted-foreground">{detalhe}</span>
      </span>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

export default function ParaVoceAgora() {
  const { data: tarefas = [] } = useQuery({
    queryKey: ["minhas-tarefas"],
    queryFn: async () => ((await db.rpc("minhas_tarefas")).data ?? []) as Tarefa[],
  });
  const { data: acoes } = useQuery({
    queryKey: ["minhas-acoes-resumo"],
    queryFn: async () => ((await db.rpc("minhas_acoes")).data ?? null) as { escalas?: Escala[] } | null,
  });
  const { data: secretarias = [] } = useQuery({
    queryKey: ["minhas-secretarias-resumo"],
    queryFn: async () => ((await db.rpc("minhas_secretarias")).data ?? []) as Secretaria[],
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const escalas = (acoes?.escalas ?? []).filter((e) => e.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));
  const proxima = escalas[0];
  const atrasadas = tarefas.filter((t) => atrasada(t));
  const umaSecretaria = secretarias.length === 1 ? secretarias[0] : null;

  return (
    <section className="space-y-4 mb-10" aria-labelledby="para-voce">
      <h2 id="para-voce" className="font-['Playfair_Display'] text-2xl font-bold">Para você agora</h2>

      {(atrasadas.length > 0 || (proxima && !proxima.confirmed)) && (
        <div className="space-y-2">
          {atrasadas.length > 0 && (
            <Link to={`/app/secretarias/${atrasadas[0].secretaria_id}/tarefas?tarefa=${atrasadas[0].id}`}
              className="flex items-center gap-3 rounded-2xl bg-red-50 text-red-800 px-4 py-3 min-h-[56px]">
              <ListChecks className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-sm sm:text-base">
                {atrasadas.length === 1 ? `A tarefa "${atrasadas[0].title}" passou do prazo.` : `${atrasadas.length} tarefas passaram do prazo.`}
              </span>
              <ChevronRight className="w-5 h-5 shrink-0" />
            </Link>
          )}
          {proxima && !proxima.confirmed && (
            <Link to="/app/perfil?aba=acoes" className="flex items-center gap-3 rounded-2xl bg-amber-50 text-amber-900 px-4 py-3 min-h-[56px]">
              <CalendarCheck className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-sm sm:text-base">Confirme sua presença na {proxima.projeto}, {dataLongaBR(proxima.data).toLowerCase()}.</span>
              <ChevronRight className="w-5 h-5 shrink-0" />
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Atalho to="/app/perfil?aba=tarefas" icone={ListChecks} cor="azul" titulo="Minhas tarefas"
          detalhe={tarefas.length ? `${tarefas.length} em aberto` : "Nenhuma tarefa em aberto"} />
        <Atalho to={umaSecretaria ? `/app/secretarias/${umaSecretaria.id}/tarefas?registrar=1` : "/app/secretarias"} icone={PencilLine} cor="verde"
          titulo="Registrar o que eu fiz" detalhe="Anote uma atividade feita para a casa" />
        <Atalho to="/app/perfil?aba=acoes" icone={CalendarCheck} cor="laranja" titulo="Minhas escalas"
          detalhe={proxima ? `Próxima: ${proxima.projeto}, ${dataAmigavel(proxima.data)}` : "Nenhuma escala marcada"} />
        <Atalho to={umaSecretaria ? `/app/secretarias/${umaSecretaria.id}` : "/app/secretarias"} icone={Building2} cor="dourado"
          titulo={umaSecretaria ? umaSecretaria.name : "Minhas secretarias"}
          detalhe={secretarias.length > 1 ? `${secretarias.length} secretarias` : umaSecretaria ? "Abrir a secretaria" : "Veja as secretarias da casa"} />
      </div>

      {tarefas.length > 0 && (
        <div className="rounded-3xl border bg-card p-2">
          {tarefas.slice(0, 4).map((t) => (
            <Link key={t.id} to={`/app/secretarias/${t.secretaria_id}/tarefas?tarefa=${t.id}`} className="flex items-center gap-3 rounded-2xl px-3 py-3 min-h-[56px] hover:bg-muted/50">
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium truncate">{t.title}</div>
                <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                  <span>{t.secretaria}</span>
                  {t.due_date && <span className={`inline-flex items-center gap-1 ${atrasada(t) ? "text-destructive font-medium" : ""}`}><CalendarDays className="w-3.5 h-3.5" />{dataAmigavel(t.due_date)}</span>}
                </div>
              </div>
              <span className={`text-xs rounded-full border px-2.5 py-1 font-medium shrink-0 ${STATUS_COR[t.status]}`}>{STATUS_ROTULO[t.status]}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
