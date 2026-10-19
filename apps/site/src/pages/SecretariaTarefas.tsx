import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/app/AppLayout";
import TarefaCartao from "@/components/secretarias/TarefaCartao";
import TarefaGaveta from "@/components/secretarias/TarefaGaveta";
import NovaTarefa from "@/components/secretarias/NovaTarefa";
import { useAuth } from "@/hooks/useAuth";
import { db, useMinhaPessoa } from "@/lib/acoes";
import { STATUS, useSecretaria, useTarefas, type StatusTarefa, type Tarefa } from "@/lib/secretarias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Plus, ClipboardCheck, LayoutList, Columns3, Search, Lock } from "lucide-react";

const CHAVE_VISTA = "lsl:tarefas-vista";

/** Painel de tarefas da secretaria: lista ou kanban, à escolha de cada pessoa. */
export default function SecretariaTarefas() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const { user, simulacao } = useAuth();
  const { data: eu } = useMinhaPessoa(user?.id, simulacao?.personId);
  const { sec, carregando, semAcesso, pessoas, souCoordenador } = useSecretaria(id);
  const { data: tarefas = [], isLoading } = useTarefas(sec ? id : undefined);

  const [vista, setVistaEstado] = useState<"lista" | "kanban">(() => {
    try { return (localStorage.getItem(CHAVE_VISTA) as "lista" | "kanban") || "lista"; } catch { return "lista"; }
  });
  const setVista = (v: "lista" | "kanban") => { setVistaEstado(v); try { localStorage.setItem(CHAVE_VISTA, v); } catch { /* sem armazenamento */ } };
  const [aba, setAba] = useState<StatusTarefa>("a_fazer");
  const [minhas, setMinhas] = useState(false);
  const [busca, setBusca] = useState("");
  const [nova, setNova] = useState<null | { modo: "nova" | "registrar"; status?: StatusTarefa }>(null);
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [alvo, setAlvo] = useState<StatusTarefa | null>(null);

  const tarefaId = params.get("tarefa");
  const aberta = tarefas.find((t) => t.id === tarefaId) ?? null;
  const abrir = (t: Tarefa) => setParams((p) => { p.set("tarefa", t.id); return p; }, { replace: true });
  const fechar = () => setParams((p) => { p.delete("tarefa"); return p; }, { replace: true });

  if (carregando) return <AppLayout><p className="text-sm text-muted-foreground text-center py-16">Carregando...</p></AppLayout>;
  if (semAcesso || !sec) {
    return <AppLayout><div className="text-center py-16 space-y-3"><Lock className="w-8 h-8 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground">Só os membros da secretaria, a Direção e os administradores acessam estas tarefas.</p></div></AppLayout>;
  }

  const filtradas = tarefas.filter((t) =>
    (!minhas || (t.secretaria_task_assignees ?? []).some((a) => a.person_id === eu?.id) || t.created_by === eu?.id) &&
    (!busca.trim() || `${t.title} ${t.description ?? ""}`.toLowerCase().includes(busca.trim().toLowerCase())));
  const doStatus = (s: StatusTarefa) => filtradas.filter((t) => t.status === s)
    .sort((a, b) => (s === "feita" ? (b.done_at ?? "").localeCompare(a.done_at ?? "") || b.updated_at.localeCompare(a.updated_at) : b.position - a.position));
  const canceladas = filtradas.filter((t) => t.status === "cancelada");

  const mover = async (tid: string, status: StatusTarefa) => {
    const t = tarefas.find((x) => x.id === tid);
    if (!t || t.status === status) return;
    // Otimista: o cartão muda de coluna na hora
    qc.setQueryData<Tarefa[]>(["secretaria-tarefas", id], (velhas) => (velhas ?? []).map((x) => (x.id === tid ? { ...x, status, position: Date.now() / 1000 } : x)));
    const { error } = await db.from("secretaria_tasks").update({ status, position: Date.now() / 1000 }).eq("id", tid);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["secretaria-tarefas", id] });
    qc.invalidateQueries({ queryKey: ["minhas-secretarias"] });
    qc.invalidateQueries({ queryKey: ["minhas-tarefas"] });
  };
  const alternarFeita = (t: Tarefa) => mover(t.id, t.status === "feita" ? "a_fazer" : "feita");

  return (
    <AppLayout>
      <div className="space-y-5 pb-20 md:pb-0">
        <div>
          <Link to={`/app/secretarias/${id}`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> {sec.name}</Link>
          <div className="mt-2 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">Tarefas</h1>
              <p className="text-sm text-muted-foreground">{sec.icon} {sec.name}</p>
            </div>
            <div className="hidden md:flex gap-2">
              <Button variant="outline" className="h-11" onClick={() => setNova({ modo: "registrar" })}><ClipboardCheck className="w-4 h-4 mr-2" /> Registrar o que fiz</Button>
              <Button className="h-11" onClick={() => setNova({ modo: "nova" })}><Plus className="w-4 h-4 mr-2" /> Nova tarefa</Button>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 h-11" placeholder="Buscar tarefa" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <div className="inline-flex rounded-lg border bg-card p-1 flex-1 sm:flex-none">
              <button type="button" onClick={() => setMinhas(false)} className={`h-9 px-3 rounded-md text-sm font-medium flex-1 ${!minhas ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Todas</button>
              <button type="button" onClick={() => setMinhas(true)} className={`h-9 px-3 rounded-md text-sm font-medium flex-1 ${minhas ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Minhas</button>
            </div>
            <div className="inline-flex rounded-lg border bg-card p-1" role="group" aria-label="Forma de ver">
              <button type="button" onClick={() => setVista("lista")} aria-pressed={vista === "lista"} title="Lista"
                className={`h-9 px-3 rounded-md text-sm font-medium inline-flex items-center gap-1.5 ${vista === "lista" ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
                <LayoutList className="w-4 h-4" /> <span className="hidden sm:inline">Lista</span>
              </button>
              <button type="button" onClick={() => setVista("kanban")} aria-pressed={vista === "kanban"} title="Kanban"
                className={`h-9 px-3 rounded-md text-sm font-medium inline-flex items-center gap-1.5 ${vista === "kanban" ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
                <Columns3 className="w-4 h-4" /> <span className="hidden sm:inline">Kanban</span>
              </button>
            </div>
          </div>
        </div>

        {isLoading ? <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p> : vista === "lista" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {STATUS.map((s) => (
                <button key={s.valor} type="button" onClick={() => setAba(s.valor)}
                  className={`h-14 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-colors ${aba === s.valor ? s.cor + " border-2" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                  <span className="text-sm font-semibold">{s.rotulo}</span>
                  <span className="text-xs">{doStatus(s.valor).length}</span>
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {doStatus(aba).length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">{aba === "feita" ? "Nenhuma tarefa feita ainda." : "Nada por aqui."}</p>
                  {aba !== "feita" ? (
                    <Button variant="outline" onClick={() => setNova({ modo: "nova", status: aba })}><Plus className="w-4 h-4 mr-2" /> Nova tarefa</Button>
                  ) : (
                    <Button variant="outline" onClick={() => setNova({ modo: "registrar" })}><ClipboardCheck className="w-4 h-4 mr-2" /> Registrar o que fiz</Button>
                  )}
                </div>
              ) : doStatus(aba).map((t) => (
                <TarefaCartao key={t.id} tarefa={t} pessoas={pessoas} mostrarStatus={false} aoAbrir={() => abrir(t)} aoConcluir={() => alternarFeita(t)} />
              ))}
            </div>
            {canceladas.length > 0 && (
              <div className="pt-2">
                <button type="button" className="text-sm text-muted-foreground hover:underline" onClick={() => setVerCanceladas((v) => !v)}>
                  {verCanceladas ? "Esconder" : "Ver"} canceladas ({canceladas.length})
                </button>
                {verCanceladas && <div className="space-y-3 mt-3 opacity-70">{canceladas.map((t) => <TarefaCartao key={t.id} tarefa={t} pessoas={pessoas} aoAbrir={() => abrir(t)} />)}</div>}
              </div>
            )}
          </div>
        ) : (
          /* Kanban: colunas lado a lado; no celular rolam na horizontal. No computador dá para arrastar. */
          <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto snap-x snap-mandatory md:snap-none">
            <div className="grid grid-flow-col auto-cols-[85%] sm:auto-cols-[46%] md:grid-flow-row md:grid-cols-3 gap-4 pb-2">
              {STATUS.map((s) => {
                const lista = doStatus(s.valor);
                return (
                  <section key={s.valor}
                    onDragOver={(e) => { e.preventDefault(); setAlvo(s.valor); }}
                    onDragLeave={() => setAlvo((a) => (a === s.valor ? null : a))}
                    onDrop={(e) => { e.preventDefault(); setAlvo(null); const tid = e.dataTransfer.getData("text/tarefa"); if (tid) mover(tid, s.valor); }}
                    className={`snap-start rounded-2xl border p-3 flex flex-col gap-3 min-h-[320px] transition-colors ${alvo === s.valor ? "bg-primary/5 border-primary/40" : "bg-muted/40"}`}>
                    <header className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${s.ponto}`} />
                        <h2 className="text-sm font-semibold">{s.rotulo}</h2>
                        <span className="text-xs text-muted-foreground">{lista.length}</span>
                      </div>
                      {s.valor !== "feita" ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Nova tarefa em ${s.rotulo}`} onClick={() => setNova({ modo: "nova", status: s.valor })}><Plus className="w-4 h-4" /></Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Registrar o que fiz" onClick={() => setNova({ modo: "registrar" })}><ClipboardCheck className="w-4 h-4" /></Button>
                      )}
                    </header>
                    {lista.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">{alvo === s.valor ? "Solte aqui" : "Vazio"}</p>}
                    {lista.map((t) => (
                      <div key={t.id} className="space-y-1.5">
                        <TarefaCartao tarefa={t} pessoas={pessoas} mostrarStatus={false} arrastavel aoAbrir={() => abrir(t)} />
                        {/* No celular: mover sem arrastar */}
                        <div className="flex gap-1.5 md:hidden px-1">
                          {STATUS.filter((o) => o.valor !== s.valor).map((o) => (
                            <button key={o.valor} type="button" onClick={() => mover(t.id, o.valor)}
                              className="text-[11px] font-medium rounded-full border bg-card px-2.5 h-7 text-muted-foreground">→ {o.rotulo}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Botão fixo no celular */}
      <div className="md:hidden fixed bottom-4 inset-x-4 z-30 grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12 bg-card shadow-lg" onClick={() => setNova({ modo: "registrar" })}><ClipboardCheck className="w-4 h-4 mr-2" /> Registrar</Button>
        <Button className="h-12 shadow-lg" onClick={() => setNova({ modo: "nova", status: vista === "lista" && aba !== "feita" ? aba : "a_fazer" })}><Plus className="w-4 h-4 mr-2" /> Nova tarefa</Button>
      </div>

      {id && <NovaTarefa aberto={!!nova} modo={nova?.modo ?? "nova"} statusInicial={nova?.status ?? "a_fazer"} aoFechar={() => setNova(null)} secretariaId={id} pessoas={pessoas} eu={eu?.id ?? null} />}
      <TarefaGaveta tarefa={aberta} aoFechar={fechar} pessoas={pessoas} eu={eu?.id ?? null} souCoordenador={souCoordenador} />
    </AppLayout>
  );
}
