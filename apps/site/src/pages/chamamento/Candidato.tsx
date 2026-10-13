import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/app/AppLayout";
import BuscaPessoa from "@/components/acoes/BuscaPessoa";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { db, useNomesPessoas, useMinhaPessoa, type PessoaBasica } from "@/lib/acoes";
import {
  ACAO_PROXIMA, AREAS_ESTAGIO, AREAS_INTERESSE, CRITERIOS, DECISOES, ETAPA_COR, ETAPA_LABEL, ETAPAS_JORNADA, ORIGEM_LABEL, PROXIMA,
  RODIZIO, dataCurta, semanaDoEstagio, type Candidato as TCandidato, type Ciclo, type Etapa,
} from "@/lib/chamamento";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Save, Plus, Trash2, Info, Phone, MessageCircle } from "lucide-react";

const paraCampoLocal = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

type Registro = { id: string; semana: number; data: string; area: string; presente: boolean; pontual: boolean; observacoes: string | null };
type Evento = { id: string; etapa_de: Etapa | null; etapa_para: Etapa | null; nota: string | null; por: string | null; em: string };
type Indicadores = { registros: number; presencas: number; pontuais: number; assiduidade: number | null; semanas: number; tem_conta: boolean; matriculado: boolean; curso_aulas: number; curso_concluidas: number };

export default function Candidato() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const { user, simulacao } = useAuth();
  const { data: eu } = useMinhaPessoa(user?.id, simulacao?.personId);
  const { canAccess } = usePermissions();
  const podeOperar = canAccess("modulo_recepcao");

  const { data: c, isLoading } = useQuery({
    queryKey: ["chamamento-candidato", id],
    queryFn: async () => {
      const { data, error } = await db.from("volunteer_candidates").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as TCandidato | null;
    },
  });
  const { data: ciclos = [] } = useQuery({
    queryKey: ["chamamento-ciclos"],
    queryFn: async () => ((await db.from("volunteer_cycles").select("*").order("starts_on", { ascending: false })).data ?? []) as Ciclo[],
  });
  const { data: ind } = useQuery({
    queryKey: ["chamamento-indicadores", id, c?.updated_at],
    enabled: !!c,
    queryFn: async () => ((await db.rpc("chamamento_indicadores", { p_candidate: id })).data ?? null) as Indicadores | null,
  });
  const { data: registros = [] } = useQuery({
    queryKey: ["chamamento-registros", id],
    queryFn: async () => ((await db.from("internship_records").select("*").eq("candidate_id", id).order("semana").order("data")).data ?? []) as Registro[],
  });
  const { data: eventos = [] } = useQuery({
    queryKey: ["chamamento-eventos", id, c?.updated_at],
    queryFn: async () => ((await db.from("volunteer_candidate_events").select("*").eq("candidate_id", id).order("em", { ascending: false })).data ?? []) as Evento[],
  });
  const { data: funcoes = [] } = useQuery({
    queryKey: ["funcoes-ativas"],
    queryFn: async () => ((await db.from("functions").select("id, name").eq("is_active", true).order("name")).data ?? []) as { id: string; name: string }[],
  });
  const { data: secretarias = [] } = useQuery({
    queryKey: ["secretarias-ativas"],
    queryFn: async () => ((await db.from("secretarias").select("id, name").eq("is_active", true).order("name")).data ?? []) as { id: string; name: string }[],
  });
  const { data: nomes = {} } = useNomesPessoas([c?.person_id, c?.tutor_id, c?.entrevistador_id, ...eventos.map((e) => e.por)]);

  const ciclo = ciclos.find((x) => x.id === c?.cycle_id);
  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["chamamento-candidato", id] });
    qc.invalidateQueries({ queryKey: ["chamamento-candidatos"] });
  };

  // Rascunho editável dos campos do candidato
  const [f, setF] = useState<TCandidato | null>(null);
  const [tutor, setTutor] = useState<PessoaBasica | null>(null);
  const [entrevistador, setEntrevistador] = useState<PessoaBasica | null>(null);
  useEffect(() => { if (c) setF(c); }, [c]);
  useEffect(() => { if (c?.tutor_id) setTutor(nomes[c.tutor_id] ?? null); else setTutor(null); }, [c?.tutor_id, nomes]);
  useEffect(() => { if (c?.entrevistador_id) setEntrevistador(nomes[c.entrevistador_id] ?? null); else setEntrevistador(null); }, [c?.entrevistador_id, nomes]);

  const salvar = useMutation({
    mutationFn: async (campos: Partial<TCandidato>) => {
      const { error } = await db.from("volunteer_candidates").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { recarregar(); toast.success("Salvo"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [encerrar, setEncerrar] = useState<Etapa | null>(null);
  const [motivo, setMotivo] = useState("");
  const avancar = useMutation({
    mutationFn: async ({ etapa, nota }: { etapa: Etapa; nota?: string }) => {
      const { data, error } = await db.rpc("chamamento_avancar", { p_candidate: id, p_etapa: etapa, p_nota: nota ?? null });
      if (error) throw error;
      return data as { aviso?: string | null };
    },
    onSuccess: (r) => {
      recarregar();
      qc.invalidateQueries({ queryKey: ["chamamento-eventos", id] });
      setEncerrar(null); setMotivo("");
      toast.success(r?.aviso || "Etapa atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !f) return <AppLayout><p className="text-sm text-muted-foreground py-16 text-center">{isLoading ? "Carregando..." : "Candidato não encontrado."}</p></AppLayout>;

  const pessoa = nomes[f.person_id];
  const aba = params.get("aba") || ({ interesse: "entrevista", curso: "curso", estagio: "estagio", avaliacao: "avaliacao", integracao: "integracao" } as Record<string, string>)[f.etapa] || "historico";
  const irPara = (v: string) => setParams({ aba: v }, { replace: true });
  const proxima = PROXIMA[f.etapa];
  const encerrada = ["voluntario", "colaborador", "desligado"].includes(f.etapa);
  const idxAtual = ETAPAS_JORNADA.findIndex((e) => e.etapa === f.etapa);
  const ent = f.entrevista ?? {};
  const setEnt = (k: string, v: string | boolean) => setF((x) => (x ? { ...x, entrevista: { ...x.entrevista, [k]: v } } : x));
  const crit = f.avaliacao?.criterios ?? {};
  const setAval = (campos: Partial<TCandidato["avaliacao"]>) => setF((x) => (x ? { ...x, avaliacao: { ...x.avaliacao, ...campos } } : x));
  const telefone = pessoa?.phone?.replace(/\D/g, "");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link to={`/app/chamamento${f.cycle_id ? `?ciclo=${f.cycle_id}` : ""}`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Chamamento
          </Link>
          <div className="mt-2 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">{pessoa?.full_name ?? "..."}</h1>
                <Badge variant="outline" className={`text-xs ${ETAPA_COR[f.etapa]}`}>{ETAPA_LABEL[f.etapa]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {[ORIGEM_LABEL[f.origem], ciclo?.name, `desde ${dataCurta(f.created_at)}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {telefone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://wa.me/55${telefone.replace(/^55/, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp</a>
                </Button>
              )}
              {pessoa?.phone && <Button variant="outline" size="sm" asChild><a href={`tel:${telefone}`}><Phone className="w-4 h-4 mr-2" /> {pessoa.phone}</a></Button>}
              {podeOperar && !encerrada && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Encerrar <ChevronDown className="w-4 h-4 ml-1" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {f.etapa !== "pausado" && <DropdownMenuItem onClick={() => setEncerrar("pausado")}>Pausar (mais tempo)</DropdownMenuItem>}
                    <DropdownMenuItem onClick={() => setEncerrar("colaborador")}>Encaminhar como colaborador financeiro</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEncerrar("desligado")} className="text-destructive">Desligamento respeitoso</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {podeOperar && proxima && (
                <Button size="sm" onClick={() => avancar.mutate({ etapa: proxima })} disabled={avancar.isPending}>
                  {ACAO_PROXIMA[f.etapa]} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Linha da jornada */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <ol className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {ETAPAS_JORNADA.map((e, i) => {
                const feito = idxAtual >= 0 ? i < idxAtual || f.etapa === "voluntario" : false;
                const atual = i === idxAtual && f.etapa !== "voluntario";
                return (
                  <li key={e.etapa} className="flex flex-col gap-1.5">
                    <div className={`h-1.5 rounded-full ${feito ? "bg-primary" : atual ? "bg-[hsl(var(--accent))]" : "bg-muted"}`} />
                    <div className={`text-xs font-semibold ${atual ? "text-foreground" : feito ? "text-primary" : "text-muted-foreground"}`}>
                      {feito && <Check className="w-3 h-3 inline mr-1" />}{e.curto}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-snug hidden md:block">{e.ajuda}</div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <Tabs value={aba} onValueChange={irPara}>
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList>
              <TabsTrigger value="entrevista">Entrevista</TabsTrigger>
              <TabsTrigger value="curso">Curso</TabsTrigger>
              <TabsTrigger value="estagio">Estágio</TabsTrigger>
              <TabsTrigger value="avaliacao">Avaliação final</TabsTrigger>
              <TabsTrigger value="integracao">Integração</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>
          </div>

          {/* ---------- Entrevista ---------- */}
          <TabsContent value="entrevista" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="font-['Playfair_Display'] text-lg">Entrevista inicial</CardTitle>
                  <CardDescription>Secretaria de Acolhimento · 30 a 40 minutos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-2"><Label>Data e hora</Label>
                      <Input type="datetime-local" value={paraCampoLocal(f.entrevista_em)} onChange={(e) => setF({ ...f, entrevista_em: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
                    <div className="grid gap-2"><Label>Entrevistador</Label><BuscaPessoa valor={entrevistador} onEscolher={setEntrevistador} /></div>
                  </div>
                  {[
                    ["trajetoria", "Trajetória espiritual e conhecimento da Doutrina Espírita"],
                    ["motivacao", "Motivação para servir no Lar de Seu Luiz"],
                    ["disponibilidade", "Disponibilidade de horários e frequência"],
                    ["expectativas", "Expectativas e áreas de interesse"],
                  ].map(([k, r]) => (
                    <div key={k} className="grid gap-2"><Label>{r}</Label>
                      <Textarea rows={2} value={String(ent[k] ?? "")} onChange={(e) => setEnt(k, e.target.value)} /></div>
                  ))}
                  <div className="rounded-md border p-3 space-y-2">
                    <div className="text-sm font-medium">Entregue na entrevista</div>
                    {[
                      ["processo_apresentado", "Apresentação do processo completo (etapas seguintes)"],
                      ["material_entregue", "Material preparatório (trechos do Guia do Voluntariado)"],
                      ["data_curso_informada", `Data do próximo curso${ciclo?.course_on ? ` (${dataCurta(ciclo.course_on)})` : ""}`],
                      ["conduta_orientada", "Orientações sobre vestimenta e conduta"],
                    ].map(([k, r]) => (
                      <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={!!ent[k]} onCheckedChange={(v) => setEnt(k, !!v)} />{r}
                      </label>
                    ))}
                  </div>
                  <div className="grid gap-2"><Label>Observações</Label><Textarea rows={2} value={String(ent.observacoes ?? "")} onChange={(e) => setEnt("observacoes", e.target.value)} /></div>
                  <div className="flex justify-end">
                    <Button onClick={() => salvar.mutate({
                      entrevista_em: f.entrevista_em ?? (Object.values(ent).some(Boolean) ? new Date().toISOString() : null),
                      entrevistador_id: entrevistador?.id ?? (f.entrevista_em ? eu?.id ?? null : null), entrevista: ent,
                    })} disabled={salvar.isPending}><Save className="w-4 h-4 mr-2" /> Salvar entrevista</Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Playfair_Display'] text-lg">Ficha de inscrição</CardTitle>
                  <CardDescription>Dados básicos, disponibilidade e motivação</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Ciclo</Label>
                    <Select value={f.cycle_id ?? "nenhum"} onValueChange={(v) => setF({ ...f, cycle_id: v === "nenhum" ? null : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">Sem ciclo</SelectItem>
                        {ciclos.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Áreas de interesse</Label>
                    <div className="grid gap-1.5">
                      {AREAS_INTERESSE.map((a) => (
                        <label key={a} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={f.areas_interesse.includes(a)} onCheckedChange={(v) => setF({ ...f, areas_interesse: v ? [...f.areas_interesse, a] : f.areas_interesse.filter((x) => x !== a) })} />{a}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2"><Label>Disponibilidade</Label><Input value={f.disponibilidade ?? ""} onChange={(e) => setF({ ...f, disponibilidade: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>Motivação</Label><Textarea rows={3} value={f.motivacao ?? ""} onChange={(e) => setF({ ...f, motivacao: e.target.value })} /></div>
                  <Button variant="outline" className="w-full" onClick={() => salvar.mutate({ cycle_id: f.cycle_id, areas_interesse: f.areas_interesse, disponibilidade: f.disponibilidade || null, motivacao: f.motivacao || null })}>
                    <Save className="w-4 h-4 mr-2" /> Salvar ficha
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ---------- Curso ---------- */}
          <TabsContent value="curso" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Playfair_Display'] text-lg">Curso O Trabalho Voluntário na Casa Espírita</CardTitle>
                <CardDescription>Sábado pela manhã{ciclo?.course_on ? `, ${dataCurta(ciclo.course_on)}` : ""}. Aulas, dinâmicas, testemunhos e espaço para perguntas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!ind?.tem_conta ? (
                  <Alert><Info className="h-4 w-4" /><AlertDescription>A pessoa ainda não tem conta na plataforma. Peça para ela criar o acesso em lardeseuluiz.vercel.app/formacao com o mesmo e-mail do cadastro; depois, avance de novo para matricular.</AlertDescription></Alert>
                ) : !ciclo?.course_id ? (
                  <Alert><Info className="h-4 w-4" /><AlertDescription>O ciclo não tem curso definido. Edite o ciclo e escolha o curso na Formação.</AlertDescription></Alert>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={ind.matriculado ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"}>
                        {ind.matriculado ? "Matriculado" : "Ainda não matriculado"}
                      </Badge>
                      {!ind.matriculado && f.etapa === "interesse" && <span className="text-xs text-muted-foreground">A matrícula acontece ao seguir para o curso.</span>}
                    </div>
                    {ind.matriculado && ind.curso_aulas > 0 && (
                      <div className="flex items-center gap-3 max-w-md">
                        <Progress value={Math.round((ind.curso_concluidas / ind.curso_aulas) * 100)} className="h-2 flex-1 bg-muted" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{ind.curso_concluidas}/{ind.curso_aulas} aulas</span>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">Ao final do curso, confirme o interesse em seguir para o estágio e registre o Termo de Compromisso na aba Estágio.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- Estágio ---------- */}
          <TabsContent value="estagio" className="mt-4 space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Playfair_Display'] text-lg">Estágio probatório</CardTitle>
                  <CardDescription>8 semanas com tutor da Secretaria de Acolhimento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2"><Label>Tutor</Label><BuscaPessoa valor={tutor} onEscolher={setTutor} /></div>
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <Checkbox className="mt-0.5" checked={!!f.termo_assinado_em} onCheckedChange={(v) => setF({ ...f, termo_assinado_em: v ? new Date().toISOString() : null })} />
                    <span>Termo de Compromisso do Estagiário assinado{f.termo_assinado_em && <span className="block text-xs text-muted-foreground">em {dataCurta(f.termo_assinado_em)}</span>}</span>
                  </label>
                  <div className="grid gap-2"><Label>Início do estágio</Label>
                    <Input type="date" value={f.estagio_inicio ?? ""} onChange={(e) => setF({ ...f, estagio_inicio: e.target.value || null })} /></div>
                  <Button className="w-full" onClick={() => salvar.mutate({ tutor_id: tutor?.id ?? null, termo_assinado_em: f.termo_assinado_em, estagio_inicio: f.estagio_inicio })}>
                    <Save className="w-4 h-4 mr-2" /> Salvar
                  </Button>
                  <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1">
                    <div className="font-medium text-foreground">Áreas permitidas</div>
                    <div>Recepção e acolhimento, servir água, limpeza e organização, apoio logístico e observação.</div>
                    <div>Não permitido nesta fase: passes, mediunidade e evangelização.</div>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <MiniIndicador rotulo="Assiduidade" valor={ind?.assiduidade != null ? `${ind.assiduidade}%` : "-"} alerta={ind?.assiduidade != null && ind.assiduidade < 75} />
                  <MiniIndicador rotulo="Presenças" valor={`${ind?.presencas ?? 0}/${ind?.registros ?? 0}`} />
                  <MiniIndicador rotulo="Semana atual" valor={f.etapa === "estagio" ? `${semanaDoEstagio(f.estagio_inicio)} de 8` : "-"} />
                </div>
                <FichaAcompanhamento candidatoId={f.id} registros={registros} semanaAtual={semanaDoEstagio(f.estagio_inicio)} eu={eu?.id ?? null} />
                <Card>
                  <CardHeader>
                    <CardTitle className="font-['Playfair_Display'] text-lg">Checkpoint 1 (semana 4)</CardTitle>
                    <CardDescription>Conversa com o tutor: assiduidade, pontualidade, postura, impressões do estagiário e ajustes.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 w-48"><Label>Data da conversa</Label><Input type="date" value={f.checkpoint1_em ?? ""} onChange={(e) => setF({ ...f, checkpoint1_em: e.target.value || null })} /></div>
                    <Textarea rows={3} placeholder="O que foi conversado e os ajustes combinados" value={f.checkpoint1 ?? ""} onChange={(e) => setF({ ...f, checkpoint1: e.target.value })} />
                    <div className="flex justify-end"><Button variant="outline" onClick={() => salvar.mutate({ checkpoint1_em: f.checkpoint1_em, checkpoint1: f.checkpoint1 || null })}><Save className="w-4 h-4 mr-2" /> Salvar checkpoint</Button></div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ---------- Avaliação final ---------- */}
          <TabsContent value="avaliacao" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Playfair_Display'] text-lg">Avaliação final (semana 8)</CardTitle>
                <CardDescription>Reunião formal de encerramento: avaliação conjunta do tutor e dos coordenadores das áreas onde atuou.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-2">
                  {CRITERIOS.map((k) => (
                    <label key={k.chave} className="flex items-start gap-2 text-sm cursor-pointer rounded-md border p-2.5">
                      <Checkbox className="mt-0.5" checked={!!crit[k.chave]} onCheckedChange={(v) => setAval({ criterios: { ...crit, [k.chave]: !!v } })} />
                      <span>{k.rotulo}{k.chave === "assiduidade" && ind?.assiduidade != null && (
                        <span className={`block text-xs ${ind.assiduidade < 75 ? "text-destructive" : "text-emerald-700"}`}>Registrada: {ind.assiduidade}%</span>
                      )}</span>
                    </label>
                  ))}
                </div>
                <div className="grid gap-2"><Label>Parecer do tutor</Label><Textarea rows={4} value={f.avaliacao?.parecer ?? ""} onChange={(e) => setAval({ parecer: e.target.value })} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Decisão</Label>
                    <Select value={f.avaliacao?.decisao ?? ""} onValueChange={(v) => setAval({ decisao: v })}>
                      <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                      <SelectContent>{Object.entries(DECISOES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label>Data da avaliação</Label><Input type="date" value={f.avaliado_em ?? ""} onChange={(e) => setF({ ...f, avaliado_em: e.target.value || null })} /></div>
                </div>
                {f.avaliacao?.decisao === "desligado" && (
                  <Alert><Info className="h-4 w-4" /><AlertDescription>O desligamento é conduzido com amor e clareza pelo tutor, explicando os motivos e deixando a porta aberta para uma nova tentativa. Depois de conversar, use Encerrar › Desligamento respeitoso.</AlertDescription></Alert>
                )}
                <div className="flex justify-end">
                  <Button onClick={() => salvar.mutate({ avaliacao: f.avaliacao, avaliado_em: f.avaliado_em ?? (f.avaliacao?.decisao ? new Date().toISOString().slice(0, 10) : null) })}><Save className="w-4 h-4 mr-2" /> Salvar avaliação</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- Integração ---------- */}
          <TabsContent value="integracao" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Playfair_Display'] text-lg">Área definitiva</CardTitle>
                  <CardDescription>Na integração a pessoa vira voluntária e recebe esta função, com os acessos que ela libera.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Função</Label>
                    <Select value={f.funcao_final_id ?? "nenhuma"} onValueChange={(v) => setF({ ...f, funcao_final_id: v === "nenhuma" ? null : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhuma">A definir</SelectItem>
                        {funcoes.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Secretaria</Label>
                    <Select value={f.secretaria_final_id ?? "casa"} onValueChange={(v) => setF({ ...f, secretaria_final_id: v === "casa" ? null : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casa">Casa (sem secretaria)</SelectItem>
                        {secretarias.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => salvar.mutate({ funcao_final_id: f.funcao_final_id, secretaria_final_id: f.secretaria_final_id })}>
                    <Save className="w-4 h-4 mr-2" /> Salvar área
                  </Button>
                  {f.integrado_em && <p className="text-sm text-emerald-800">Integrado em {dataCurta(f.integrado_em)}.</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Playfair_Display'] text-lg">Integração oficial</CardTitle>
                  <CardDescription>Na roda de preparação antes da reunião pública{ciclo?.integration_on ? ` (${dataCurta(ciclo.integration_on)})` : ""}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="font-medium">Momento solene</div>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    <li>Apresentação dos novos voluntários pelo nome</li>
                    <li>Área definitiva de atuação</li>
                    <li>Entrega simbólica da camiseta do Lar</li>
                    <li>Palavra de acolhida da Direção</li>
                    <li>Oração coletiva de consagração ao trabalho</li>
                  </ul>
                  <div className="font-medium pt-2">Depois da integração</div>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                    <li>Inclusão nos grupos de comunicação da casa</li>
                    <li>Inclusão na escala regular de trabalho</li>
                    <li>Acompanhamento pela secretaria responsável</li>
                    <li>Convite permanente aos estudos doutrinários (EDE)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ---------- Histórico ---------- */}
          <TabsContent value="historico" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {eventos.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sem registros.</p> : (
                  <ol className="relative border-l border-border ml-2 space-y-5">
                    {eventos.map((e) => (
                      <li key={e.id} className="ml-4">
                        <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                        <div className="text-sm font-medium">
                          {e.etapa_de ? `${ETAPA_LABEL[e.etapa_de]} → ` : ""}{e.etapa_para ? ETAPA_LABEL[e.etapa_para] : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(e.em).toLocaleString("pt-BR")}{e.por && nomes[e.por] ? ` · ${nomes[e.por].full_name}` : ""}</div>
                        {e.nota && <div className="text-sm mt-1">{e.nota}</div>}
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!encerrar} onOpenChange={(v) => { if (!v) setEncerrar(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{encerrar === "pausado" ? "Pausar a jornada" : encerrar === "colaborador" ? "Colaborador financeiro" : "Desligamento respeitoso"}</DialogTitle>
            <DialogDescription>
              {encerrar === "desligado" ? "Registre os motivos explicados à pessoa. A porta fica aberta para uma nova tentativa." : "Escreva o motivo para o histórico."}
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEncerrar(null)}>Cancelar</Button>
            <Button variant={encerrar === "desligado" ? "destructive" : "default"} disabled={!motivo.trim() || avancar.isPending}
              onClick={() => encerrar && avancar.mutate({ etapa: encerrar, nota: motivo })}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function MiniIndicador({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <Card className={alerta ? "border-destructive/40" : ""}>
      <CardContent className="p-4">
        <div className={`text-2xl font-bold ${alerta ? "text-destructive" : "text-foreground"}`}>{valor}</div>
        <div className="text-xs text-muted-foreground">{rotulo}{alerta ? " (mínimo 75%)" : ""}</div>
      </CardContent>
    </Card>
  );
}

/** Ficha de Acompanhamento do Estágio: presenças, áreas e observações do tutor. */
function FichaAcompanhamento({ candidatoId, registros, semanaAtual, eu }: { candidatoId: string; registros: Registro[]; semanaAtual: number; eu: string | null }) {
  const qc = useQueryClient();
  const novo = () => ({ semana: String(Math.min(semanaAtual, 8)), data: new Date().toISOString().slice(0, 10), area: RODIZIO(Math.min(semanaAtual, 8)), presente: true, pontual: true, observacoes: "" });
  const [r, setR] = useState(novo());
  const chave = ["chamamento-registros", candidatoId];
  const incluir = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("internship_records").insert({
        candidate_id: candidatoId, semana: Number(r.semana), data: r.data, area: r.area, presente: r.presente, pontual: r.presente && r.pontual,
        observacoes: r.observacoes.trim() || null, registrado_por: eu,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: chave }); qc.invalidateQueries({ queryKey: ["chamamento-indicadores"] }); setR(novo()); toast.success("Registro incluído"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("internship_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: chave }); qc.invalidateQueries({ queryKey: ["chamamento-indicadores"] }); },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-['Playfair_Display'] text-lg">Ficha de acompanhamento</CardTitle>
        <CardDescription>Rodízio sugerido: semanas 1 e 2 recepção, 3 e 4 apoio logístico, 5 e 6 limpeza, 7 e 8 área de preferência.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-[80px_140px_1fr] items-end">
          <div className="grid gap-2"><Label>Semana</Label>
            <Select value={r.semana} onValueChange={(v) => setR({ ...r, semana: v, area: RODIZIO(Number(v)) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: 8 }, (_, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2"><Label>Data</Label><Input type="date" value={r.data} onChange={(e) => setR({ ...r, data: e.target.value })} /></div>
          <div className="grid gap-2 col-span-2 md:col-span-1"><Label>Área</Label>
            <Select value={r.area} onValueChange={(v) => setR({ ...r, area: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AREAS_ESTAGIO.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={r.presente} onCheckedChange={(v) => setR({ ...r, presente: !!v })} /> Presente</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={r.pontual} disabled={!r.presente} onCheckedChange={(v) => setR({ ...r, pontual: !!v })} /> Pontual</label>
          <Input className="flex-1 min-w-[180px]" placeholder="Observação do tutor (opcional)" value={r.observacoes} onChange={(e) => setR({ ...r, observacoes: e.target.value })} />
          <Button onClick={() => incluir.mutate()} disabled={incluir.isPending}><Plus className="w-4 h-4 mr-2" /> Registrar</Button>
        </div>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Semana</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Presença</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nenhum registro ainda.</TableCell></TableRow>
              ) : registros.map((x) => (
                <TableRow key={x.id}>
                  <TableCell>{x.semana}</TableCell>
                  <TableCell className="whitespace-nowrap">{dataCurta(x.data)}</TableCell>
                  <TableCell className="text-sm">{x.area}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${!x.presente ? "bg-red-50 text-red-700 border-red-200" : x.pontual ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"}`}>
                      {!x.presente ? "Falta" : x.pontual ? "Presente" : "Atrasado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{x.observacoes || "-"}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" title="Apagar registro" onClick={() => remover.mutate(x.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
