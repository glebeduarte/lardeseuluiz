import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, X, KeyRound, ChevronRight, Save, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Ficha de uma pessoa dentro do Painel de pessoas: cadastrar, ver, editar e excluir,
// com papéis na Casa, vínculo de associado, secretarias e funções no mesmo lugar.
// Papéis e macas do Atendimento e matrículas da Formação ficam no painel de Acessos (link no fim).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const hoje = () => new Date().toISOString().slice(0, 10);
const soDigitos = (s: string) => s.replace(/\D/g, "");

const PAPEIS: { valor: string; rotulo: string; ajuda: string }[] = [
  { valor: "trabalhador", rotulo: "Voluntário", ajuda: "Trabalha na Casa." },
  { valor: "frequentador", rotulo: "Frequentador", ajuda: "Vem às palestras e atividades." },
  { valor: "assistido", rotulo: "Assistido", ajuda: "Recebe atendimento espiritual." },
  { valor: "beneficiario_social", rotulo: "Beneficiário social", ajuda: "Atendido pelas ações sociais." },
  { valor: "doador", rotulo: "Doador", ajuda: "Contribui com doações." },
];
const CATEGORIAS: [string, string][] = [["fundador", "Fundador"], ["efetivo", "Efetivo"], ["colaborador", "Colaborador"]];
const SITUACOES: [string, string][] = [["ativo", "Ativo"], ["inadimplente", "Inadimplente"], ["afastado", "Afastado"], ["desligado", "Desligado"]];
const CONTEXTOS: [string, string][] = [["casa", "Na Casa"], ["secretaria", "Em uma secretaria"], ["projeto", "Em um projeto"]];

interface Dados { full_name: string; email: string; phone: string; cpf: string; birth_date: string; notes: string }
const dadosVazios: Dados = { full_name: "", email: "", phone: "", cpf: "", birth_date: "", notes: "" };

interface Ficha {
  pessoa: { id: string; full_name: string; email: string | null; phone: string | null; cpf: string | null; birth_date: string | null; notes: string | null; user_id: string | null; created_at: string };
  papeis: { id: string; role: string; started_at: string | null }[];
  vinculo: { id: string; category: string; status: string; admission_date: string } | null;
  secretarias: { id: string; secretaria_id: string; member_role: string; nome: string }[];
  funcoes: { id: string; function_id: string; context_type: string; context_id: string | null; started_at: string; nome: string }[];
}

function useFicha(id: string | null) {
  return useQuery({
    queryKey: ["ficha-pessoa", id],
    enabled: !!id,
    queryFn: async (): Promise<Ficha> => {
      const [p, r, v, s, f] = await Promise.all([
        db.from("people").select("id, full_name, email, phone, cpf, birth_date, notes, user_id, created_at").eq("id", id).single(),
        db.from("person_roles").select("id, role, started_at").eq("person_id", id).is("ended_at", null),
        db.from("associate_memberships").select("id, category, status, admission_date").eq("person_id", id).is("exit_date", null).order("admission_date", { ascending: false }).limit(1),
        db.from("secretaria_members").select("id, secretaria_id, member_role, secretarias(name)").eq("person_id", id),
        db.from("worker_assignments").select("id, function_id, context_type, context_id, started_at, functions(name)").eq("person_id", id).is("ended_at", null),
      ]);
      if (p.error) throw p.error;
      return {
        pessoa: p.data,
        papeis: r.data || [],
        vinculo: v.data?.[0] || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        secretarias: (s.data || []).map((x: any) => ({ id: x.id, secretaria_id: x.secretaria_id, member_role: x.member_role, nome: x.secretarias?.name || "Secretaria" })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        funcoes: (f.data || []).map((x: any) => ({ id: x.id, function_id: x.function_id, context_type: x.context_type, context_id: x.context_id, started_at: x.started_at, nome: x.functions?.name || "Função" })),
      };
    },
  });
}

function useOpcoes() {
  return useQuery({
    queryKey: ["ficha-opcoes"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [s, f, p] = await Promise.all([
        db.from("secretarias").select("id, name").order("name"),
        db.from("functions").select("id, name, category").eq("is_active", true).order("name"),
        db.from("projects").select("id, name").order("name"),
      ]);
      return {
        secretarias: (s.data || []) as { id: string; name: string }[],
        funcoes: (f.data || []) as { id: string; name: string; category: string }[],
        projetos: (p.data || []) as { id: string; name: string }[],
      };
    },
  });
}

const msgErro = (e: unknown) => {
  const m = (e as { message?: string })?.message || "Não foi possível salvar.";
  if (/row-level security|permission denied/i.test(m)) return "Você não tem permissão para essa alteração.";
  if (/duplicate key/i.test(m)) return "Isso já está cadastrado para esta pessoa.";
  if (/health_records|violates foreign key/i.test(m)) return "Esta pessoa tem registros que impedem a exclusão (atendimento de saúde, por exemplo).";
  return m;
};

/* ------------------------------------------------------------------------------------------------ Ficha */

export default function FichaPessoa({ pessoaId, aberta, fechar, aoCriar }: {
  /** null = nova pessoa */
  pessoaId: string | null;
  aberta: boolean;
  fechar: () => void;
  aoCriar: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { data: ficha, isLoading } = useFicha(aberta ? pessoaId : null);
  const nova = !pessoaId;

  const atualizar = () => {
    qc.invalidateQueries({ queryKey: ["ficha-pessoa", pessoaId] });
    qc.invalidateQueries({ queryKey: ["pessoas-listagem"] });
    qc.invalidateQueries({ queryKey: ["people-full"] });
  };

  return (
    <Sheet open={aberta} onOpenChange={(v) => !v && fechar()}>
      <SheetContent side="right" className="z-[70] w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b text-left">
          <SheetTitle className="font-['Playfair_Display'] text-xl pr-8">
            {nova ? "Nova pessoa" : ficha?.pessoa.full_name || "Carregando..."}
          </SheetTitle>
          {!nova && ficha && (
            <p className="text-[13px] text-muted-foreground">
              Cadastrada em {new Date(ficha.pessoa.created_at).toLocaleDateString("pt-BR")} · {ficha.pessoa.user_id ? "tem login" : "sem login"}
            </p>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {nova ? (
            <SecaoDados nova onSalvo={(id) => { qc.invalidateQueries({ queryKey: ["pessoas-listagem"] }); aoCriar(id); }} />
          ) : isLoading || !ficha ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Abrindo ficha...</div>
          ) : (
            <>
              <SecaoDados ficha={ficha} onSalvo={atualizar} />
              <SecaoPapeis ficha={ficha} atualizar={atualizar} />
              <SecaoVinculo ficha={ficha} atualizar={atualizar} />
              <SecaoSecretarias ficha={ficha} atualizar={atualizar} />
              <SecaoFuncoes ficha={ficha} atualizar={atualizar} />
              <Bloco titulo="Atendimento, macas e Formação">
                <p className="text-[13px] text-muted-foreground">Papel de médium, dialogador ou recepção, maca, matrículas e login ficam no painel de acessos.</p>
                <Link to={`/app/acessos/${ficha.pessoa.id}`} className="mt-2 flex items-center gap-3 rounded-xl border border-border/70 px-3 py-3 hover:bg-[#f1f6fd]">
                  <KeyRound className="w-4 h-4 text-[#0059b1]" /><span className="flex-1 text-sm font-medium">Abrir acessos desta pessoa</span><ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              </Bloco>
              <SecaoExcluir ficha={ficha} aoExcluir={() => { qc.invalidateQueries({ queryKey: ["pessoas-listagem"] }); qc.invalidateQueries({ queryKey: ["people-full"] }); fechar(); }} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Bloco({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
        {acao}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------ Dados pessoais */

function SecaoDados({ ficha, nova, onSalvo }: { ficha?: Ficha; nova?: boolean; onSalvo: (id: string) => void }) {
  const [d, setD] = useState<Dados>(dadosVazios);
  const [comoVoluntario, setComoVoluntario] = useState(false);
  const [comoFrequentador, setComoFrequentador] = useState(true);
  useEffect(() => {
    if (!ficha) { setD(dadosVazios); return; }
    const p = ficha.pessoa;
    setD({ full_name: p.full_name, email: p.email || "", phone: p.phone || "", cpf: p.cpf || "", birth_date: p.birth_date || "", notes: p.notes || "" });
  }, [ficha]);

  const mudou = !ficha || (["full_name", "email", "phone", "cpf", "birth_date", "notes"] as (keyof Dados)[])
    .some((k) => (d[k] || "") !== ((ficha.pessoa as unknown as Record<string, string | null>)[k] || ""));

  const salvar = useMutation({
    mutationFn: async () => {
      const nome = d.full_name.trim();
      if (nome.length < 3) throw new Error("Escreva o nome completo.");
      const cpf = soDigitos(d.cpf);
      if (cpf && cpf.length !== 11) throw new Error("O CPF precisa ter 11 números.");
      if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) throw new Error("Confira o e-mail.");
      const linha = {
        full_name: nome, email: d.email.trim().toLowerCase() || null, phone: d.phone.trim() || null,
        cpf: cpf || null, birth_date: d.birth_date || null, notes: d.notes.trim() || null,
      };
      if (ficha) {
        const { error } = await db.from("people").update(linha).eq("id", ficha.pessoa.id);
        if (error) throw error;
        return ficha.pessoa.id as string;
      }
      if (linha.email) {
        const { data: ja } = await db.from("people").select("id, full_name").ilike("email", linha.email).limit(1);
        if (ja?.length) throw new Error(`Já existe uma pessoa com esse e-mail: ${ja[0].full_name}.`);
      }
      const { data, error } = await db.from("people").insert(linha).select("id").single();
      if (error) throw error;
      const papeis = [comoVoluntario && "trabalhador", comoFrequentador && "frequentador"].filter(Boolean) as string[];
      for (const role of papeis) {
        const { error: e2 } = await db.from("person_roles").insert({ person_id: data.id, role, started_at: hoje() });
        if (e2) toast.error(msgErro(e2));
      }
      return data.id as string;
    },
    onSuccess: (id) => { toast.success(ficha ? "Dados salvos." : "Pessoa cadastrada."); onSalvo(id); },
    onError: (e) => toast.error(msgErro(e)),
  });

  const campo = (k: keyof Dados) => ({ value: d[k], onChange: (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value })) });

  return (
    <Bloco titulo="Dados pessoais">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }}>
        <div className="grid gap-1.5"><Label htmlFor="fp-nome">Nome completo</Label><Input id="fp-nome" {...campo("full_name")} className="h-11" autoFocus={nova} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label htmlFor="fp-email">E-mail</Label><Input id="fp-email" type="email" inputMode="email" {...campo("email")} className="h-11" /></div>
          <div className="grid gap-1.5"><Label htmlFor="fp-tel">Telefone</Label><Input id="fp-tel" type="tel" inputMode="tel" {...campo("phone")} className="h-11" placeholder="(84) 99999-0000" /></div>
          <div className="grid gap-1.5"><Label htmlFor="fp-cpf">CPF</Label><Input id="fp-cpf" inputMode="numeric" {...campo("cpf")} className="h-11" placeholder="Só números" /></div>
          <div className="grid gap-1.5"><Label htmlFor="fp-nasc">Nascimento</Label><Input id="fp-nasc" type="date" {...campo("birth_date")} className="h-11" /></div>
        </div>
        <div className="grid gap-1.5"><Label htmlFor="fp-obs">Observações</Label><Textarea id="fp-obs" rows={2} {...campo("notes")} /></div>
        {nova && (
          <div className="space-y-2 rounded-xl bg-muted/50 p-3">
            <label className="flex items-center justify-between gap-3 text-sm"><span>Frequentador</span><Switch checked={comoFrequentador} onCheckedChange={setComoFrequentador} /></label>
            <label className="flex items-center justify-between gap-3 text-sm"><span>Voluntário</span><Switch checked={comoVoluntario} onCheckedChange={setComoVoluntario} /></label>
          </div>
        )}
        <Button type="submit" className="w-full h-11" disabled={salvar.isPending || !mudou}>
          {salvar.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {nova ? "Cadastrar pessoa" : mudou ? "Salvar dados" : "Dados salvos"}
        </Button>
      </form>
    </Bloco>
  );
}

/* ------------------------------------------------------------------------------------------------ Papéis na Casa */

function SecaoPapeis({ ficha, atualizar }: { ficha: Ficha; atualizar: () => void }) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const ativo = (v: string) => ficha.papeis.find((p) => p.role === v);
  const alternar = async (v: string) => {
    setOcupado(v);
    try {
      const atual = ativo(v);
      const { error } = atual
        ? await db.from("person_roles").update({ ended_at: hoje() }).eq("id", atual.id)
        : await db.from("person_roles").insert({ person_id: ficha.pessoa.id, role: v, started_at: hoje() });
      if (error) throw error;
      toast.success(atual ? "Papel encerrado." : "Papel incluído.");
      atualizar();
    } catch (e) { toast.error(msgErro(e)); } finally { setOcupado(null); }
  };
  return (
    <Bloco titulo="Papel na Casa">
      <ul className="divide-y divide-border/60">
        {PAPEIS.map((p) => {
          const a = ativo(p.valor);
          return (
            <li key={p.valor} className="flex items-center gap-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{p.rotulo}</div>
                <div className="text-[12px] text-muted-foreground">{a?.started_at ? `Desde ${a.started_at.split("-").reverse().join("/")}` : p.ajuda}</div>
              </div>
              {ocupado === p.valor ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Switch checked={!!a} onCheckedChange={() => alternar(p.valor)} aria-label={p.rotulo} />}
            </li>
          );
        })}
      </ul>
      {!!ativo("trabalhador") && !soDigitos(ficha.pessoa.cpf || "") && (
        <p className="mt-2 text-[12px] text-muted-foreground bg-muted/60 rounded-lg px-3 py-2">Ainda sem CPF. A própria pessoa informa no primeiro acesso, ou você preenche nos dados pessoais.</p>
      )}
    </Bloco>
  );
}

/* ------------------------------------------------------------------------------------------------ Associado */

function SecaoVinculo({ ficha, atualizar }: { ficha: Ficha; atualizar: () => void }) {
  const v = ficha.vinculo;
  const [cat, setCat] = useState(v?.category || "colaborador");
  const [sit, setSit] = useState(v?.status || "ativo");
  const [adm, setAdm] = useState(v?.admission_date || hoje());
  const [abrir, setAbrir] = useState(false);
  useEffect(() => { setCat(v?.category || "colaborador"); setSit(v?.status || "ativo"); setAdm(v?.admission_date || hoje()); }, [v]);

  const salvar = useMutation({
    mutationFn: async () => {
      const linha = { category: cat, status: sit, admission_date: adm };
      const { error } = v
        ? await db.from("associate_memberships").update(linha).eq("id", v.id)
        : await db.from("associate_memberships").insert({ ...linha, person_id: ficha.pessoa.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(v ? "Vínculo atualizado." : "Associado incluído."); setAbrir(false); atualizar(); },
    onError: (e) => toast.error(msgErro(e)),
  });
  const encerrar = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("associate_memberships").update({ exit_date: hoje() }).eq("id", v!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Vínculo de associado encerrado."); atualizar(); },
    onError: (e) => toast.error(msgErro(e)),
  });

  const editando = !!v || abrir;
  return (
    <Bloco titulo="Associado (estatuto)" acao={!v && !abrir ? <Button size="sm" variant="outline" onClick={() => setAbrir(true)}><Plus className="w-4 h-4 mr-1" />Incluir</Button> : undefined}>
      {!editando ? <p className="text-[13px] text-muted-foreground">Não é associado.</p> : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Categoria</Label>
              <Select value={cat} onValueChange={setCat}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[80]">{CATEGORIAS.map(([k, r]) => <SelectItem key={k} value={k}>{r}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid gap-1.5"><Label>Situação</Label>
              <Select value={sit} onValueChange={setSit}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[80]">{SITUACOES.map(([k, r]) => <SelectItem key={k} value={k}>{r}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="fp-adm">Admissão</Label><Input id="fp-adm" type="date" value={adm} onChange={(e) => setAdm(e.target.value)} className="h-11" /></div>
          <div className="flex gap-2">
            {v ? <Button variant="outline" className="h-11" onClick={() => encerrar.mutate()} disabled={encerrar.isPending}>Encerrar vínculo</Button>
              : <Button variant="ghost" className="h-11" onClick={() => setAbrir(false)}>Cancelar</Button>}
            <Button className="flex-1 h-11" onClick={() => salvar.mutate()} disabled={salvar.isPending}>{v ? "Salvar vínculo" : "Incluir como associado"}</Button>
          </div>
          {!soDigitos(ficha.pessoa.cpf || "") && <p className="text-[12px] text-muted-foreground">Ainda sem CPF. A pessoa informa no primeiro acesso.</p>}
        </div>
      )}
    </Bloco>
  );
}

/* ------------------------------------------------------------------------------------------------ Secretarias */

function SecaoSecretarias({ ficha, atualizar }: { ficha: Ficha; atualizar: () => void }) {
  const { data: op } = useOpcoes();
  const [nova, setNova] = useState("");
  const [papel, setPapel] = useState("participante");
  const livres = (op?.secretarias || []).filter((s) => !ficha.secretarias.some((m) => m.secretaria_id === s.id));

  const exec = async (fn: () => Promise<{ error: unknown }>, ok: string) => {
    const { error } = await fn();
    if (error) { toast.error(msgErro(error)); return; }
    toast.success(ok); atualizar();
  };

  return (
    <Bloco titulo="Secretarias">
      {ficha.secretarias.length === 0 ? <p className="text-[13px] text-muted-foreground mb-3">Não participa de nenhuma secretaria.</p> : (
        <ul className="divide-y divide-border/60 mb-3">
          {ficha.secretarias.map((m) => (
            <li key={m.id} className="flex items-center gap-2 py-2">
              <span className="flex-1 min-w-0 text-sm font-medium truncate">{m.nome}</span>
              <button onClick={() => exec(() => db.from("secretaria_members").update({ member_role: m.member_role === "coordenador" ? "participante" : "coordenador" }).eq("id", m.id), "Papel na secretaria alterado.")}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${m.member_role === "coordenador" ? "bg-[#fff3cc] text-[#7a5200]" : "bg-muted text-muted-foreground"}`}
                title="Tocar para trocar entre coordena e participa">
                {m.member_role === "coordenador" && <Crown className="w-3 h-3" />}{m.member_role === "coordenador" ? "Coordena" : "Participa"}
              </button>
              <Button variant="ghost" size="icon" aria-label={`Tirar de ${m.nome}`} onClick={() => exec(() => db.from("secretaria_members").delete().eq("id", m.id), "Saiu da secretaria.")}><X className="w-4 h-4" /></Button>
            </li>
          ))}
        </ul>
      )}
      {livres.length > 0 && (
        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_130px_auto] gap-2">
          <Select value={nova} onValueChange={setNova}><SelectTrigger className="h-11 col-span-2 sm:col-span-1"><SelectValue placeholder="Escolher secretaria" /></SelectTrigger>
            <SelectContent className="z-[80]">{livres.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
          <Select value={papel} onValueChange={setPapel}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[80]"><SelectItem value="participante">Participa</SelectItem><SelectItem value="coordenador">Coordena</SelectItem></SelectContent></Select>
          <Button className="h-11" disabled={!nova} onClick={() => exec(() => db.from("secretaria_members").insert({ secretaria_id: nova, person_id: ficha.pessoa.id, member_role: papel }), "Incluída na secretaria.").then(() => setNova(""))}>
            <Plus className="w-4 h-4" /><span className="sr-only sm:not-sr-only sm:ml-1">Incluir</span>
          </Button>
        </div>
      )}
    </Bloco>
  );
}

/* ------------------------------------------------------------------------------------------------ Funções */

function SecaoFuncoes({ ficha, atualizar }: { ficha: Ficha; atualizar: () => void }) {
  const { data: op } = useOpcoes();
  const [abrir, setAbrir] = useState(false);
  const [funcao, setFuncao] = useState("");
  const [ctx, setCtx] = useState("casa");
  const [ctxId, setCtxId] = useState("");
  const [inicio, setInicio] = useState(hoje());

  const ondeDe = (f: Ficha["funcoes"][number]) => f.context_type === "casa" ? "Na Casa"
    : f.context_type === "secretaria" ? op?.secretarias.find((s) => s.id === f.context_id)?.name || "Secretaria"
    : op?.projetos.find((p) => p.id === f.context_id)?.name || "Projeto";

  const incluir = useMutation({
    mutationFn: async () => {
      if (!funcao) throw new Error("Escolha a função.");
      if (ctx !== "casa" && !ctxId) throw new Error(ctx === "secretaria" ? "Escolha a secretaria." : "Escolha o projeto.");
      const { error } = await db.from("worker_assignments").insert({
        person_id: ficha.pessoa.id, function_id: funcao, context_type: ctx, context_id: ctx === "casa" ? null : ctxId, started_at: inicio,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Função atribuída."); setAbrir(false); setFuncao(""); setCtx("casa"); setCtxId(""); atualizar(); },
    onError: (e) => toast.error(msgErro(e)),
  });
  const encerrar = async (id: string) => {
    const { error } = await db.from("worker_assignments").update({ ended_at: hoje() }).eq("id", id);
    if (error) { toast.error(msgErro(error)); return; }
    toast.success("Função encerrada."); atualizar();
  };

  return (
    <Bloco titulo="Funções" acao={!abrir ? <Button size="sm" variant="outline" onClick={() => setAbrir(true)}><Plus className="w-4 h-4 mr-1" />Atribuir</Button> : undefined}>
      {ficha.funcoes.length === 0 && !abrir && <p className="text-[13px] text-muted-foreground">Nenhuma função atribuída.</p>}
      {ficha.funcoes.length > 0 && (
        <ul className="divide-y divide-border/60">
          {ficha.funcoes.map((f) => (
            <li key={f.id} className="flex items-center gap-2 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{f.nome}</div>
                <div className="text-[12px] text-muted-foreground">{ondeDe(f)} · desde {f.started_at.split("-").reverse().join("/")}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => encerrar(f.id)}>Encerrar</Button>
            </li>
          ))}
        </ul>
      )}
      {abrir && (
        <div className="space-y-3 mt-3 rounded-xl bg-muted/40 p-3">
          <Select value={funcao} onValueChange={setFuncao}><SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Escolher função" /></SelectTrigger>
            <SelectContent className="z-[80]">{(op?.funcoes || []).map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select>
          <Select value={ctx} onValueChange={(v) => { setCtx(v); setCtxId(""); }}><SelectTrigger className="h-11 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[80]">{CONTEXTOS.map(([k, r]) => <SelectItem key={k} value={k}>{r}</SelectItem>)}</SelectContent></Select>
          {ctx !== "casa" && (
            <Select value={ctxId} onValueChange={setCtxId}><SelectTrigger className="h-11 bg-card"><SelectValue placeholder={ctx === "secretaria" ? "Qual secretaria" : "Qual projeto"} /></SelectTrigger>
              <SelectContent className="z-[80]">{(ctx === "secretaria" ? op?.secretarias : op?.projetos || [])?.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select>
          )}
          <div className="grid gap-1.5"><Label htmlFor="fp-ini">Começou em</Label><Input id="fp-ini" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="h-11 bg-card" /></div>
          <div className="flex gap-2">
            <Button variant="ghost" className="h-11" onClick={() => setAbrir(false)}>Cancelar</Button>
            <Button className="flex-1 h-11" onClick={() => incluir.mutate()} disabled={incluir.isPending}>Atribuir função</Button>
          </div>
        </div>
      )}
    </Bloco>
  );
}

/* ------------------------------------------------------------------------------------------------ Excluir */

function SecaoExcluir({ ficha, aoExcluir }: { ficha: Ficha; aoExcluir: () => void }) {
  const [confirmar, setConfirmar] = useState(false);
  const [texto, setTexto] = useState("");
  const primeiro = ficha.pessoa.full_name.trim().split(/\s+/)[0];
  const excluir = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("people").delete().eq("id", ficha.pessoa.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pessoa excluída."); setConfirmar(false); aoExcluir(); },
    onError: (e) => toast.error(msgErro(e)),
  });
  return (
    <section className="rounded-2xl border border-[#f3c4cc] bg-[#fff7f8] p-4">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#a3243b] mb-1">Excluir cadastro</h3>
      <p className="text-[13px] text-muted-foreground mb-3">
        Apaga a pessoa com papéis, vínculo, secretarias e funções. Para quem só se afastou, prefira desligar o papel de voluntário.
        {ficha.pessoa.user_id && " O login dela continua existindo; para bloquear, use o painel de acessos."}
      </p>
      <Button variant="outline" className="h-11 border-[#e8a1ae] text-[#a3243b] hover:bg-[#fdecef] hover:text-[#a3243b]" onClick={() => { setTexto(""); setConfirmar(true); }}>
        <Trash2 className="w-4 h-4 mr-2" />Excluir {primeiro}
      </Button>
      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent className="z-[90]">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {ficha.pessoa.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>Isso não tem volta. Para confirmar, escreva <strong>{primeiro}</strong> abaixo.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={texto} onChange={(e) => setTexto(e.target.value)} className="h-11" aria-label="Confirmação" autoFocus />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={texto.trim().toLowerCase() !== primeiro.toLowerCase() || excluir.isPending}
              onClick={(e) => { e.preventDefault(); excluir.mutate(); }} className="bg-[#a3243b] hover:bg-[#8a1d31]">
              Excluir de vez
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
