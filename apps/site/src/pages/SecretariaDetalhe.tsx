import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/app/AppLayout";
import BuscaPessoa from "@/components/acoes/BuscaPessoa";
import TarefaCartao, { Avatar } from "@/components/secretarias/TarefaCartao";
import NovaTarefa from "@/components/secretarias/NovaTarefa";
import { useAuth } from "@/hooks/useAuth";
import { db, useMinhaPessoa, type PessoaBasica } from "@/lib/acoes";
import { useSecretaria, useTarefas, type PessoaSecretaria } from "@/lib/secretarias";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, ClipboardCheck, LayoutList, Crown, Settings2, Pencil, Trash2, Check, X, Lock, ChevronRight, Phone } from "lucide-react";

type Responsabilidade = { id: string; title: string; description: string | null; item_order: number };

/** Página inicial da secretaria: responsabilidades, pessoas (coordenação em destaque) e tarefas recentes. */
export default function SecretariaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, simulacao } = useAuth();
  const { data: eu } = useMinhaPessoa(user?.id, simulacao?.personId);
  const { sec, carregando, semAcesso, pessoas, souCoordenador, direcao } = useSecretaria(id);
  const { data: tarefas = [] } = useTarefas(sec ? id : undefined);
  const [nova, setNova] = useState<null | "nova" | "registrar">(null);
  const [gerir, setGerir] = useState(false);
  const [todasResp, setTodasResp] = useState(false);

  const { data: resp = [] } = useQuery({
    queryKey: ["secretaria-resp", id],
    enabled: !!sec,
    queryFn: async () => ((await db.from("secretaria_responsibilities").select("id, title, description, item_order").eq("secretaria_id", id).order("item_order")).data ?? []) as Responsabilidade[],
  });

  if (carregando) return <AppLayout><p className="text-sm text-muted-foreground text-center py-16">Carregando...</p></AppLayout>;
  if (semAcesso || !sec) {
    return (
      <AppLayout>
        <Card className="max-w-md mx-auto mt-10"><CardContent className="py-10 text-center space-y-3">
          <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="font-medium">Esta página é dos membros da secretaria</p>
          <p className="text-sm text-muted-foreground">Só os membros, a Direção e os administradores acessam. Fale com a coordenação para participar.</p>
          <Button variant="outline" asChild><Link to="/app/secretarias">Ver secretarias</Link></Button>
        </CardContent></Card>
      </AppLayout>
    );
  }

  const coordenadores = pessoas.filter((p) => p.member_role === "coordenador");
  const participantes = pessoas.filter((p) => p.member_role === "participante");
  const recentes = [...tarefas].filter((t) => t.status !== "cancelada").sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6);
  const editaResp = souCoordenador || direcao;
  const abrirTarefa = (tid: string) => navigate(`/app/secretarias/${id}/tarefas?tarefa=${tid}`);
  const marcarFeita = async (tid: string, feita: boolean) => {
    const { error } = await db.from("secretaria_tasks").update({ status: feita ? "a_fazer" : "feita" }).eq("id", tid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["secretaria-tarefas", id] });
    qc.invalidateQueries({ queryKey: ["minhas-secretarias"] });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link to="/app/secretarias" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Secretarias</Link>
          <div className="mt-3 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ background: "hsl(var(--primary) / 0.08)" }}>{sec.icon || "📋"}</span>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">{sec.name}</h1>
                {sec.description && <p className="text-sm text-muted-foreground mt-1">{sec.description}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2">
              <Button variant="outline" className="h-11" onClick={() => setNova("registrar")}><ClipboardCheck className="w-4 h-4 mr-2" /> Registrar o que fiz</Button>
              <Button className="h-11" onClick={() => setNova("nova")}><Plus className="w-4 h-4 mr-2" /> Nova tarefa</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[["A fazer", sec.a_fazer, "text-sky-700"], ["Fazendo", sec.fazendo, "text-amber-700"], ["Feitas em 30 dias", sec.feitas_30d, "text-emerald-700"]].map(([r, v, c]) => (
            <Link key={r as string} to={`/app/secretarias/${id}/tarefas`} className="rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className={`text-2xl font-bold ${c}`}>{v as number}</div>
              <div className="text-xs text-muted-foreground leading-tight">{r as string}</div>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="font-['Playfair_Display'] text-lg">Tarefas recentes</CardTitle>
                  <CardDescription>Toque numa tarefa para ver os detalhes no painel</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild><Link to={`/app/secretarias/${id}/tarefas`}><LayoutList className="w-4 h-4 mr-2" /> Painel</Link></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentes.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa ainda.</p>
                    <Button variant="outline" onClick={() => setNova("nova")}><Plus className="w-4 h-4 mr-2" /> Criar a primeira</Button>
                  </div>
                ) : recentes.map((t) => (
                  <TarefaCartao key={t.id} tarefa={t} pessoas={pessoas} aoAbrir={() => abrirTarefa(t.id)} aoConcluir={() => marcarFeita(t.id, t.status === "feita")} />
                ))}
                {tarefas.length > recentes.length && (
                  <Link to={`/app/secretarias/${id}/tarefas`} className="flex items-center justify-center gap-1 text-sm text-primary py-2 hover:underline">
                    Ver todas as {tarefas.filter((t) => t.status !== "cancelada").length} tarefas <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </CardContent>
            </Card>

            <Responsabilidades secretariaId={id!} lista={resp} podeEditar={editaResp} todas={todasResp} aoVerTodas={() => setTodasResp((v) => !v)} />
          </div>

          <Card className="h-fit">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="font-['Playfair_Display'] text-lg">Pessoas</CardTitle>
                <CardDescription>{pessoas.length} na secretaria</CardDescription>
              </div>
              {(souCoordenador || direcao) && <Button variant="outline" size="sm" onClick={() => setGerir(true)}><Settings2 className="w-4 h-4 mr-2" /> Gerenciar</Button>}
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{coordenadores.length === 1 ? "Coordenação" : "Coordenadores"}</div>
                {coordenadores.length === 0 ? <p className="text-sm text-muted-foreground">Ainda sem coordenação definida.</p> : coordenadores.map((p) => (
                  <div key={p.member_id} className="flex items-center gap-3 rounded-xl border-2 p-3" style={{ borderColor: "hsl(var(--accent))", background: "hsl(var(--accent) / 0.08)" }}>
                    <Avatar pessoa={p} tamanho={44} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{p.full_name}</div>
                      <div className="text-xs inline-flex items-center gap-1 text-[hsl(var(--accent-dark))] font-medium"><Crown className="w-3.5 h-3.5" /> Coordenação</div>
                    </div>
                    {p.phone && <a href={`tel:${p.phone.replace(/\D/g, "")}`} aria-label={`Ligar para ${p.full_name}`} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted"><Phone className="w-4 h-4" /></a>}
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Participantes</div>
                {participantes.length === 0 ? <p className="text-sm text-muted-foreground py-1">Nenhum participante ainda.</p> : (
                  <ul className="divide-y divide-border">
                    {participantes.map((p) => (
                      <li key={p.member_id} className="flex items-center gap-3 py-2.5">
                        <Avatar pessoa={p} tamanho={36} />
                        <span className="text-sm truncate flex-1">{p.full_name}{p.person_id === eu?.id ? " (você)" : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {id && <NovaTarefa aberto={!!nova} modo={nova ?? "nova"} aoFechar={() => setNova(null)} secretariaId={id} pessoas={pessoas} eu={eu?.id ?? null} />}
      {id && <GerirPessoas aberto={gerir} aoFechar={() => setGerir(false)} secretariaId={id} pessoas={pessoas} direcao={direcao} eu={eu?.id ?? null} />}
    </AppLayout>
  );
}

function Responsabilidades({ secretariaId, lista, podeEditar, todas, aoVerTodas }: {
  secretariaId: string; lista: Responsabilidade[]; podeEditar: boolean; todas: boolean; aoVerTodas: () => void;
}) {
  const qc = useQueryClient();
  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const recarregar = () => qc.invalidateQueries({ queryKey: ["secretaria-resp", secretariaId] });
  const incluir = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("secretaria_responsibilities").insert({ secretaria_id: secretariaId, title: novo.trim(), item_order: (lista.at(-1)?.item_order ?? 0) + 1 });
      if (error) throw error;
    },
    onSuccess: () => { setNovo(""); recarregar(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const salvar = useMutation({
    mutationFn: async (rid: string) => {
      const { error } = await db.from("secretaria_responsibilities").update({ title: texto.trim() }).eq("id", rid);
      if (error) throw error;
    },
    onSuccess: () => { setEditando(null); recarregar(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remover = useMutation({
    mutationFn: async (rid: string) => {
      const { error } = await db.from("secretaria_responsibilities").delete().eq("id", rid);
      if (error) throw error;
    },
    onSuccess: recarregar,
    onError: (e: Error) => toast.error(e.message),
  });
  const visiveis = todas ? lista : lista.slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-['Playfair_Display'] text-lg">Responsabilidades</CardTitle>
        <CardDescription>O que cabe a esta secretaria na Casa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma responsabilidade cadastrada.</p>}
        <ol className="space-y-2">
          {visiveis.map((r, i) => (
            <li key={r.id} className="flex items-start gap-3 rounded-lg px-1 py-1.5 group">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>{i + 1}</span>
              {editando === r.id ? (
                <div className="flex-1 flex gap-2">
                  <Input className="h-10" value={texto} autoFocus onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && texto.trim()) salvar.mutate(r.id); }} />
                  <Button size="icon" className="h-10 w-10 shrink-0" aria-label="Salvar" onClick={() => texto.trim() && salvar.mutate(r.id)}><Check className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" aria-label="Cancelar" onClick={() => setEditando(null)}><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] leading-snug">{r.title}</div>
                    {r.description && <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>}
                  </div>
                  {podeEditar && (
                    <div className="flex shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Editar" onClick={() => { setEditando(r.id); setTexto(r.title); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Remover" onClick={() => remover.mutate(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
        {lista.length > 6 && (
          <button type="button" onClick={aoVerTodas} className="text-sm text-primary hover:underline">{todas ? "Mostrar menos" : `Ver todas as ${lista.length}`}</button>
        )}
        {podeEditar && (
          <div className="flex gap-2 pt-2">
            <Input className="h-11" placeholder="Nova responsabilidade" value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && novo.trim()) incluir.mutate(); }} />
            <Button className="h-11 shrink-0" variant="outline" disabled={!novo.trim()} onClick={() => incluir.mutate()}><Plus className="w-4 h-4" /></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Coordenação inclui e retira participantes; Direção e admins também definem coordenadores. */
function GerirPessoas({ aberto, aoFechar, secretariaId, pessoas, direcao, eu }: {
  aberto: boolean; aoFechar: () => void; secretariaId: string; pessoas: PessoaSecretaria[]; direcao: boolean; eu: string | null;
}) {
  const qc = useQueryClient();
  const [pessoa, setPessoa] = useState<PessoaBasica | null>(null);
  const [papel, setPapel] = useState<"participante" | "coordenador">("participante");
  const recarregar = () => { qc.invalidateQueries({ queryKey: ["secretaria-pessoas", secretariaId] }); qc.invalidateQueries({ queryKey: ["minhas-secretarias"] }); };

  const incluir = useMutation({
    mutationFn: async () => {
      if (!pessoa) return;
      if (pessoas.some((p) => p.person_id === pessoa.id)) throw new Error("Esta pessoa já faz parte da secretaria.");
      const { error } = await db.from("secretaria_members").insert({ secretaria_id: secretariaId, person_id: pessoa.id, member_role: direcao ? papel : "participante" });
      if (error) throw error;
    },
    onSuccess: () => { setPessoa(null); setPapel("participante"); recarregar(); toast.success("Pessoa incluída"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mudarPapel = useMutation({
    mutationFn: async (p: PessoaSecretaria) => {
      const { error } = await db.from("secretaria_members").update({ member_role: p.member_role === "coordenador" ? "participante" : "coordenador" }).eq("id", p.member_id);
      if (error) throw error;
    },
    onSuccess: recarregar,
    onError: (e: Error) => toast.error(e.message),
  });
  const retirar = useMutation({
    mutationFn: async (p: PessoaSecretaria) => {
      const { error } = await db.from("secretaria_members").delete().eq("id", p.member_id);
      if (error) throw error;
    },
    onSuccess: recarregar,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) aoFechar(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-['Playfair_Display'] text-xl">Pessoas da secretaria</DialogTitle>
          <DialogDescription>{direcao ? "Inclua participantes e defina quem coordena." : "Como coordenação, você inclui e retira participantes."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-lg border p-3">
          <Label className="text-sm">Incluir pessoa</Label>
          <BuscaPessoa valor={pessoa} onEscolher={setPessoa} />
          <div className="flex gap-2">
            {direcao && (
              <Select value={papel} onValueChange={(v) => setPapel(v as typeof papel)}>
                <SelectTrigger className="h-11 flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="participante">Participante</SelectItem>
                  <SelectItem value="coordenador">Coordenação</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button className="h-11 flex-1" disabled={!pessoa || incluir.isPending} onClick={() => incluir.mutate()}><Plus className="w-4 h-4 mr-2" /> Incluir</Button>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {pessoas.map((p) => {
            const podeRetirar = direcao || p.member_role === "participante";
            return (
              <li key={p.member_id} className="flex items-center gap-3 py-3">
                <Avatar pessoa={p} tamanho={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.full_name}{p.person_id === eu ? " (você)" : ""}</div>
                  {p.member_role === "coordenador"
                    ? <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 mt-0.5">Coordenação</Badge>
                    : <span className="text-xs text-muted-foreground">Participante</span>}
                </div>
                {direcao && (
                  <Button variant="ghost" size="sm" className="h-9" onClick={() => mudarPapel.mutate(p)}>
                    {p.member_role === "coordenador" ? "Tornar participante" : "Tornar coordenação"}
                  </Button>
                )}
                {podeRetirar && (
                  <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Retirar ${p.full_name}`} onClick={() => retirar.mutate(p)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                )}
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
