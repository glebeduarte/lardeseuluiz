import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/app/AppLayout";
import BuscaPessoa from "@/components/acoes/BuscaPessoa";
import { supabase } from "@/integrations/supabase/client";
import { db, useNomesPessoas, type PessoaBasica } from "@/lib/acoes";
import {
  AREAS_INTERESSE, ETAPA_COR, ETAPA_LABEL, ETAPAS_ABERTAS, ETAPAS_JORNADA, ORIGEM_LABEL, dataCurta, datasDoCiclo, diasDesde,
  type Candidato, type Ciclo,
} from "@/lib/chamamento";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CalendarRange, UserPlus, Inbox, ArrowRight, Users, GraduationCap, Footprints, ClipboardCheck, Sparkles, Pencil } from "lucide-react";

type Interesse = { id: string; name: string; email: string | null; phone: string | null; interest_area: string | null; message: string | null; created_at: string; project_id: string | null };

const cicloVazio = () => {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const s = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}-01`;
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
  return { id: "", name: `Ciclo ${meses[inicio.getMonth()]}/${meses[fim.getMonth()]} ${fim.getFullYear()}`, starts_on: s, ...datasDoCiclo(s), course_id: "", status: "planejado", notes: "" };
};

export default function Chamamento() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const { data: ciclos = [] } = useQuery({
    queryKey: ["chamamento-ciclos"],
    queryFn: async () => {
      const { data, error } = await db.from("volunteer_cycles").select("*").order("starts_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Ciclo[];
    },
  });
  const cicloAtual = useMemo(() => ciclos.find((c) => c.status === "em_andamento") ?? ciclos.find((c) => c.status === "planejado") ?? ciclos[0], [ciclos]);
  const cicloId = params.get("ciclo") || cicloAtual?.id || "todos";
  const ciclo = ciclos.find((c) => c.id === cicloId);

  const { data: candidatos = [], isLoading } = useQuery({
    queryKey: ["chamamento-candidatos"],
    queryFn: async () => {
      const { data, error } = await db.from("volunteer_candidates").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as Candidato[];
    },
  });
  const { data: interesses = [] } = useQuery({
    queryKey: ["chamamento-interesses"],
    queryFn: async () => {
      const { data } = await db.from("volunteer_submissions").select("*").order("created_at", { ascending: false }).limit(200);
      return (data ?? []) as Interesse[];
    },
  });
  const { data: nomes = {} } = useNomesPessoas(candidatos.flatMap((c) => [c.person_id, c.tutor_id]));

  const doCiclo = candidatos.filter((c) => cicloId === "todos" || c.cycle_id === cicloId || (!c.cycle_id && ETAPAS_ABERTAS.includes(c.etapa)));
  const convertidos = new Set(candidatos.map((c) => c.submission_id).filter(Boolean));
  const pendentesSite = interesses.filter((i) => !convertidos.has(i.id));
  const saidas = doCiclo.filter((c) => ["colaborador", "pausado", "desligado"].includes(c.etapa));

  // ---------- Ciclo ----------
  const [dlgCiclo, setDlgCiclo] = useState(false);
  const [fc, setFc] = useState(cicloVazio());
  const { data: cursos = [] } = useQuery({
    queryKey: ["chamamento-cursos"],
    enabled: dlgCiclo,
    queryFn: async () => {
      const { data } = await supabase.schema("formacao" as never).from("courses" as never).select("id, title").order("title");
      return (data ?? []) as unknown as { id: string; title: string }[];
    },
  });
  useEffect(() => {
    if (dlgCiclo && !fc.id && !fc.course_id && cursos.length) {
      const padrao = cursos.find((c) => /volunt/i.test(c.title));
      if (padrao) setFc((f) => ({ ...f, course_id: padrao.id }));
    }
  }, [dlgCiclo, cursos, fc.id, fc.course_id]);

  const abrirCiclo = (c?: Ciclo) => {
    setFc(c ? {
      id: c.id, name: c.name, starts_on: c.starts_on, interviews_until: c.interviews_until ?? "", course_on: c.course_on ?? "",
      internship_starts_on: c.internship_starts_on ?? "", internship_ends_on: c.internship_ends_on ?? "", evaluation_on: c.evaluation_on ?? "",
      integration_on: c.integration_on ?? "", course_id: c.course_id ?? "", status: c.status, notes: c.notes ?? "",
    } : cicloVazio());
    setDlgCiclo(true);
  };
  const salvarCiclo = useMutation({
    mutationFn: async () => {
      if (!fc.name.trim() || !fc.starts_on) throw new Error("Informe o nome e o início do ciclo");
      const { id, ...resto } = fc;
      const payload = Object.fromEntries(Object.entries(resto).map(([k, v]) => [k, v === "" ? null : v]));
      const { data, error } = id
        ? await db.from("volunteer_cycles").update(payload).eq("id", id).select("id").single()
        : await db.from("volunteer_cycles").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (novo) => {
      qc.invalidateQueries({ queryKey: ["chamamento-ciclos"] });
      setDlgCiclo(false);
      setParams({ ciclo: novo }, { replace: true });
      toast.success("Ciclo salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ---------- Novo candidato ----------
  const [dlgCand, setDlgCand] = useState(false);
  const [pessoa, setPessoa] = useState<PessoaBasica | null>(null);
  const [fn, setFn] = useState({ origem: "reuniao", perfil: "trabalhador", areas: [] as string[], disponibilidade: "", motivacao: "" });
  const criarCandidato = useMutation({
    mutationFn: async () => {
      if (!pessoa) throw new Error("Escolha a pessoa no cadastro");
      const { data, error } = await db.from("volunteer_candidates").insert({
        person_id: pessoa.id, cycle_id: ciclo?.id ?? cicloAtual?.id ?? null, origem: fn.origem, areas_interesse: fn.areas,
        disponibilidade: fn.disponibilidade.trim() || null, motivacao: fn.motivacao.trim() || null,
      }).select("id").single();
      if (error) throw error;
      if (fn.perfil === "colaborador") {
        const { error: e2 } = await db.rpc("chamamento_avancar", { p_candidate: data.id, p_etapa: "colaborador", p_nota: "Perfil de colaborador financeiro: orientado sobre doações e encaminhado ao setor responsável." });
        if (e2) throw e2;
      }
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["chamamento-candidatos"] });
      setDlgCand(false); setPessoa(null);
      setFn({ origem: "reuniao", perfil: "trabalhador", areas: [], disponibilidade: "", motivacao: "" });
      if (fn.perfil === "colaborador") toast.success("Registrado como colaborador financeiro");
      else navigate(`/app/chamamento/${id}`);
    },
    onError: (e: Error) => toast.error(e.message.includes("uma_aberta") ? "Esta pessoa já tem uma jornada em andamento." : e.message),
  });

  const trazerInteresse = useMutation({
    mutationFn: async (i: Interesse) => {
      const { data, error } = await db.rpc("chamamento_de_interesse", { p_submission: i.id, p_cycle: ciclo?.id ?? cicloAtual?.id ?? null });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (id) => { qc.invalidateQueries({ queryKey: ["chamamento-candidatos"] }); navigate(`/app/chamamento/${id}`); },
    onError: (e: Error) => toast.error(e.message),
  });

  const colunas = ETAPAS_JORNADA;
  const contagem = (e: string) => doCiclo.filter((c) => c.etapa === e).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">Chamamento</h1>
            <p className="text-sm text-muted-foreground">A jornada de frequentador a voluntário, em ciclos bimestrais.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => abrirCiclo()}><CalendarRange className="w-4 h-4 mr-2" /> Novo ciclo</Button>
            <Button onClick={() => setDlgCand(true)}><UserPlus className="w-4 h-4 mr-2" /> Novo candidato</Button>
          </div>
        </div>

        {/* Ciclo */}
        <Card>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <Select value={cicloId} onValueChange={(v) => setParams({ ciclo: v }, { replace: true })}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Escolha o ciclo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os ciclos</SelectItem>
                    {ciclos.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {ciclo && (
                  <Badge variant="outline" className={ciclo.status === "em_andamento" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : ciclo.status === "planejado" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-muted text-muted-foreground"}>
                    {ciclo.status === "em_andamento" ? "Em andamento" : ciclo.status === "planejado" ? "Planejado" : "Encerrado"}
                  </Badge>
                )}
              </div>
              {ciclo && <Button variant="ghost" size="sm" onClick={() => abrirCiclo(ciclo)}><Pencil className="w-4 h-4 mr-2" /> Editar ciclo</Button>}
            </div>
            {ciclo ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  ["Entrevistas até", ciclo.interviews_until],
                  ["Curso (sábado)", ciclo.course_on],
                  ["Estágio", ciclo.internship_starts_on ? `${dataCurta(ciclo.internship_starts_on)} a ${dataCurta(ciclo.internship_ends_on)}` : null],
                  ["Avaliação final", ciclo.evaluation_on],
                  ["Integração oficial", ciclo.integration_on],
                ].map(([r, v]) => (
                  <div key={r as string} className="rounded-md bg-muted px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">{r}</div>
                    <div className="text-sm font-medium">{v ? (String(v).includes(" a ") ? v : dataCurta(v as string)) : "A definir"}</div>
                  </div>
                ))}
              </div>
            ) : ciclos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Crie o primeiro ciclo para organizar as datas de entrevistas, curso, estágio e integração.</p>
            ) : null}
          </CardContent>
        </Card>

        {/* Indicadores */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Indicador icone={Users} rotulo="Aguardando entrevista" valor={contagem("interesse")} />
          <Indicador icone={GraduationCap} rotulo="No curso" valor={contagem("curso")} />
          <Indicador icone={Footprints} rotulo="Em estágio" valor={contagem("estagio")} />
          <Indicador icone={ClipboardCheck} rotulo="Avaliação e integração" valor={contagem("avaliacao") + contagem("integracao")} />
          <Indicador icone={Sparkles} rotulo="Novos voluntários" valor={contagem("voluntario")} />
        </div>

        {/* Quadro da jornada */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid grid-flow-col auto-cols-[260px] lg:auto-cols-fr gap-3 min-w-max lg:min-w-0">
            {colunas.map((col) => {
              const lista = doCiclo.filter((c) => c.etapa === col.etapa);
              return (
                <div key={col.etapa} className="rounded-lg border bg-muted/40 p-2.5 flex flex-col gap-2 min-h-[160px]">
                  <div className="flex items-center justify-between px-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col.curto}</div>
                    <span className="text-xs font-semibold text-muted-foreground">{lista.length}</span>
                  </div>
                  {isLoading ? <div className="text-xs text-muted-foreground px-1">Carregando...</div>
                    : lista.length === 0 ? <div className="text-xs text-muted-foreground px-1 py-4 text-center">Ninguém nesta etapa</div>
                    : lista.map((c) => (
                      <Link key={c.id} to={`/app/chamamento/${c.id}`} className="rounded-md border bg-card p-3 hover:shadow-sm transition-shadow block">
                        <div className="font-medium text-sm truncate">{nomes[c.person_id]?.full_name ?? "..."}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {col.etapa === "estagio" && c.tutor_id ? `Tutor: ${nomes[c.tutor_id]?.full_name ?? "..."}` : nomes[c.person_id]?.phone || ORIGEM_LABEL[c.origem]}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className="text-[10px]">{ORIGEM_LABEL[c.origem]}</Badge>
                          <span className="text-[10px] text-muted-foreground">há {diasDesde(c.updated_at)} d</span>
                        </div>
                      </Link>
                    ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-['Playfair_Display'] text-lg flex items-center gap-2"><Inbox className="w-4 h-4 text-primary" /> Interessados pelo site</CardTitle>
              <CardDescription>Quem deixou o contato em Seja voluntário e ainda não entrou no chamamento.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendentesSite.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum interessado aguardando.</p> : (
                <ul className="divide-y divide-border">
                  {pendentesSite.slice(0, 30).map((i) => (
                    <li key={i.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{i.name}</div>
                        <div className="text-xs text-muted-foreground">{[i.phone, i.email, i.interest_area, dataCurta(i.created_at)].filter(Boolean).join(" · ")}</div>
                        {i.message && <div className="text-xs mt-1 line-clamp-2">"{i.message}"</div>}
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => trazerInteresse.mutate(i)} disabled={trazerInteresse.isPending}>
                        Trazer <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-['Playfair_Display'] text-lg">Saídas e pausas</CardTitle>
              <CardDescription>Colaboradores financeiros, estágios pausados e desligamentos deste ciclo.</CardDescription>
            </CardHeader>
            <CardContent>
              {saidas.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma.</p> : (
                <ul className="divide-y divide-border">
                  {saidas.map((c) => (
                    <li key={c.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/app/chamamento/${c.id}`} className="font-medium text-sm hover:underline">{nomes[c.person_id]?.full_name ?? "..."}</Link>
                        {c.motivo_saida && <div className="text-xs text-muted-foreground line-clamp-2">{c.motivo_saida}</div>}
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${ETAPA_COR[c.etapa]}`}>{ETAPA_LABEL[c.etapa]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ciclo */}
      <Dialog open={dlgCiclo} onOpenChange={setDlgCiclo}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{fc.id ? "Editar ciclo" : "Novo ciclo"}</DialogTitle>
            <DialogDescription>As datas seguem o cronograma bimestral. Ao mudar o início, as outras são sugeridas de novo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
              <div className="grid gap-2"><Label>Nome *</Label><Input value={fc.name} onChange={(e) => setFc((f) => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Início *</Label>
                <Input type="date" value={fc.starts_on} onChange={(e) => setFc((f) => ({ ...f, starts_on: e.target.value, ...(e.target.value ? datasDoCiclo(e.target.value) : {}) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Entrevistas até</Label><Input type="date" value={fc.interviews_until ?? ""} onChange={(e) => setFc((f) => ({ ...f, interviews_until: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Curso (sábado de manhã)</Label><Input type="date" value={fc.course_on ?? ""} onChange={(e) => setFc((f) => ({ ...f, course_on: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Início do estágio</Label><Input type="date" value={fc.internship_starts_on ?? ""} onChange={(e) => setFc((f) => ({ ...f, internship_starts_on: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Fim do estágio</Label><Input type="date" value={fc.internship_ends_on ?? ""} onChange={(e) => setFc((f) => ({ ...f, internship_ends_on: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Avaliação final</Label><Input type="date" value={fc.evaluation_on ?? ""} onChange={(e) => setFc((f) => ({ ...f, evaluation_on: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Integração oficial</Label><Input type="date" value={fc.integration_on ?? ""} onChange={(e) => setFc((f) => ({ ...f, integration_on: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Curso na Formação</Label>
                <Select value={fc.course_id || "nenhum"} onValueChange={(v) => setFc((f) => ({ ...f, course_id: v === "nenhum" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Sem curso</SelectItem>
                    {cursos.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Situação</Label>
                <Select value={fc.status} onValueChange={(v) => setFc((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejado">Planejado</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="encerrado">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Quem segue para o curso é matriculado automaticamente no curso escolhido.</p>
            <div className="grid gap-2"><Label>Observações</Label><Textarea rows={2} value={fc.notes ?? ""} onChange={(e) => setFc((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgCiclo(false)}>Cancelar</Button>
            <Button onClick={() => salvarCiclo.mutate()} disabled={salvarCiclo.isPending}>{salvarCiclo.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Novo candidato */}
      <Dialog open={dlgCand} onOpenChange={setDlgCand}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo candidato</DialogTitle>
            <DialogDescription>Quem procurou a recepção depois da reunião pública. Defina o perfil antes de seguir.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2"><Label>Pessoa (cadastro único)</Label><BuscaPessoa valor={pessoa} onEscolher={setPessoa} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Perfil</Label>
                <Select value={fn.perfil} onValueChange={(v) => setFn((f) => ({ ...f, perfil: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trabalhador">Trabalhador voluntário</SelectItem>
                    <SelectItem value="colaborador">Colaborador financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Como chegou</Label>
                <Select value={fn.origem} onValueChange={(v) => setFn((f) => ({ ...f, origem: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ORIGEM_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {fn.perfil === "colaborador" ? (
              <p className="text-sm text-muted-foreground rounded-md bg-muted p-3">Oriente sobre doações (material ou financeira) e encaminhe ao setor responsável. A pessoa fica registrada como colaboradora, sem seguir para as próximas etapas.</p>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label>Áreas de interesse</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AREAS_INTERESSE.map((a) => (
                      <label key={a} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={fn.areas.includes(a)} onCheckedChange={(c) => setFn((f) => ({ ...f, areas: c ? [...f.areas, a] : f.areas.filter((x) => x !== a) }))} />{a}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2"><Label>Disponibilidade</Label><Input placeholder="Ex.: terças à noite e sábados" value={fn.disponibilidade} onChange={(e) => setFn((f) => ({ ...f, disponibilidade: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Motivação</Label><Textarea rows={2} value={fn.motivacao} onChange={(e) => setFn((f) => ({ ...f, motivacao: e.target.value }))} /></div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgCand(false)}>Cancelar</Button>
            <Button onClick={() => criarCandidato.mutate()} disabled={!pessoa || criarCandidato.isPending}><Plus className="w-4 h-4 mr-2" /> Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Indicador({ icone: Icone, rotulo, valor }: { icone: any; rotulo: string; valor: number }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
          <Icone className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold text-foreground">{valor}</div>
          <div className="text-xs text-muted-foreground leading-tight">{rotulo}</div>
        </div>
      </CardContent>
    </Card>
  );
}
