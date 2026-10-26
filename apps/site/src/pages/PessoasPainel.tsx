import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search, X, SlidersHorizontal, Download, Loader2, Lock, ChevronRight, ArrowUpDown, UserPlus, KeyRound,
} from "lucide-react";
import * as XLSX from "xlsx";
import AppLayout from "@/components/app/AppLayout";
import { CabecalhoPagina } from "@/compartilhado";
import FichaPessoa from "@/components/pessoas/FichaPessoa";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";

// Painel de pessoas: todo mundo do cadastro, com papel na Casa, secretarias, funções,
// Atendimento, macas e Formação. Filtros combinam entre grupos (e) e somam dentro do grupo (ou).

/* ------------------------------------------------------------------------------------------------ Dados */

interface Pessoa {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  nascimento: string | null;
  tem_cpf: boolean;
  cadastrado_em: string;
  cadastro_confirmado: boolean;
  tem_login: boolean;
  ultimo_acesso: string | null;
  papeis: { papel: string; desde: string | null }[];
  associado: { categoria: string; situacao: string; admissao: string } | null;
  secretarias: { nome: string; papel: string }[];
  funcoes: { nome: string; categoria: string; contexto: string; onde: string | null }[];
  atendimento: string[];
  macas: { numero: number; nome: string; dia: string }[];
  cursos: { curso: string; status: string; turma: string | null }[];
  facilita: string[];
  acesso: string[];
}

/** Pessoa com os campos que os filtros e a ordenação usam, já calculados. */
interface Linha extends Pessoa {
  tags: Set<string>;
  cursosAtivos: string[];
  idade: number | null;
  diasAniversario: number | null;
  qtdFuncoes: number;
}

const ROTULO_PAPEL: Record<string, string> = {
  trabalhador: "Voluntário",
  frequentador: "Frequentador",
  assistido: "Assistido",
  beneficiario_social: "Beneficiário social",
  doador: "Doador",
  coordenador: "Coordenador",
  associado: "Associado",
  aluno: "Aluno da Formação",
  facilitador: "Facilitador",
  sem_papel: "Sem papel",
};
const ORDEM_PAPEL = ["trabalhador", "coordenador", "frequentador", "assistido", "associado", "aluno", "facilitador", "beneficiario_social", "doador", "sem_papel"];

const ROTULO_ATEND: Record<string, string> = {
  medium: "Médium", dialogador: "Dialogador", recepcao: "Recepção", admin: "Admin do Atendimento",
};
const ROTULO_ACESSO: Record<string, string> = {
  admin: "Administrador", gestor: "Gestor", trabalhador: "Voluntário", aluno: "Aluno",
};
const ROTULO_DIA: Record<string, string> = { terca: "Terça", sabado: "Sábado" };
const ROTULO_CATEGORIA: Record<string, string> = { fundador: "Fundador", efetivo: "Efetivo", colaborador: "Colaborador" };
const ROTULO_SITUACAO: Record<string, string> = { ativo: "Ativo", inadimplente: "Inadimplente", afastado: "Afastado", desligado: "Desligado" };

const COR_PAPEL: Record<string, string> = {
  trabalhador: "bg-[#e3eefb] text-[#0059b1]",
  coordenador: "bg-[#fff3cc] text-[#7a5200]",
  frequentador: "bg-[#effaf8] text-[#176e69]",
  assistido: "bg-[#f5f3ff] text-[#6d28d9]",
  associado: "bg-[#fdecef] text-[#a3243b]",
  aluno: "bg-[#dcf2ef] text-[#176e69]",
  facilitador: "bg-[#dcf2ef] text-[#0e4f4b]",
  beneficiario_social: "bg-[#fef3e2] text-[#8a4b00]",
  doador: "bg-[#ecf8ec] text-[#256b25]",
  sem_papel: "bg-muted text-muted-foreground",
};

const ehCoordenacao = (nome: string) => /^coordena|^dire[cç][aã]o/i.test(nome.trim());

function idadeDe(nasc: string | null, hoje: Date) {
  if (!nasc) return null;
  const [a, m, d] = nasc.split("-").map(Number);
  let idade = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade--;
  return idade;
}

function diasAteAniversario(nasc: string | null, hoje: Date) {
  if (!nasc) return null;
  const [, m, d] = nasc.split("-").map(Number);
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  let prox = new Date(hoje.getFullYear(), m - 1, d);
  if (prox < base) prox = new Date(hoje.getFullYear() + 1, m - 1, d);
  return Math.round((prox.getTime() - base.getTime()) / 86400000);
}

function preparar(p: Pessoa, hoje: Date): Linha {
  const tags = new Set<string>(p.papeis.map((x) => x.papel));
  const coordena = p.secretarias.some((s) => s.papel === "coordenador") || p.funcoes.some((f) => ehCoordenacao(f.nome));
  if (coordena) tags.add("coordenador");
  if (p.associado) tags.add("associado");
  const cursosAtivos = p.cursos.filter((c) => c.status !== "rejected").map((c) => c.curso);
  if (cursosAtivos.length) tags.add("aluno");
  if (p.facilita.length) tags.add("facilitador");
  if (p.papeis.length === 0) tags.add("sem_papel");
  return {
    ...p,
    tags,
    cursosAtivos,
    idade: idadeDe(p.nascimento, hoje),
    diasAniversario: diasAteAniversario(p.nascimento, hoje),
    qtdFuncoes: p.funcoes.length + p.atendimento.length + p.secretarias.length,
  };
}

function usePessoas(ativo: boolean) {
  return useQuery({
    queryKey: ["pessoas-listagem"],
    enabled: ativo,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (f: string) => Promise<{ data: unknown; error: Error | null }>)("pessoas_listagem");
      if (error) throw error;
      return (data || []) as Pessoa[];
    },
  });
}

/* ------------------------------------------------------------------------------------------------ Filtros na URL */

const GRUPOS = ["papel", "atend", "sec", "funcao", "maca", "dia", "curso", "acesso", "assoc"] as const;
type Grupo = (typeof GRUPOS)[number];

const ORDENS = {
  nome_asc: "Nome (A a Z)",
  nome_desc: "Nome (Z a A)",
  cadastro_novo: "Cadastro mais recente",
  cadastro_antigo: "Cadastro mais antigo",
  acesso_recente: "Acessou por último",
  acesso_antigo: "Sem acessar há mais tempo",
  aniversario: "Próximos aniversários",
  idade_maior: "Mais velhos primeiro",
  idade_menor: "Mais novos primeiro",
  mais_funcoes: "Mais funções primeiro",
} as const;
type Ordem = keyof typeof ORDENS;

const TRI = { login: ["com", "sem"], cpf: ["com", "sem"], cadastro: ["confirmado", "pendente"] } as const;
type Tri = keyof typeof TRI;

function useFiltros() {
  const [sp, setSp] = useSearchParams();
  const lista = (g: Grupo) => sp.getAll(g);
  const alternar = (g: Grupo, valor: string) => {
    const atual = sp.getAll(g);
    const novo = atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
    const prox = new URLSearchParams(sp);
    prox.delete(g);
    novo.forEach((v) => prox.append(g, v));
    setSp(prox, { replace: true });
  };
  const definir = (chave: string, valor: string | null) => {
    const prox = new URLSearchParams(sp);
    if (valor) prox.set(chave, valor); else prox.delete(chave);
    setSp(prox, { replace: true });
  };
  const zerar = (g: Grupo) => {
    const prox = new URLSearchParams(sp);
    prox.delete(g);
    setSp(prox, { replace: true });
  };
  const limpar = () => {
    const prox = new URLSearchParams();
    if (sp.get("q")) prox.set("q", sp.get("q")!);
    if (sp.get("ordem")) prox.set("ordem", sp.get("ordem")!);
    setSp(prox, { replace: true });
  };
  const ordem = (sp.get("ordem") as Ordem) in ORDENS ? (sp.get("ordem") as Ordem) : "nome_asc";
  const tri = (t: Tri) => sp.get(t) || "";
  const qtdAtivos = GRUPOS.reduce((n, g) => n + sp.getAll(g).length, 0) + (Object.keys(TRI) as Tri[]).filter((t) => sp.get(t)).length;
  return { sp, lista, alternar, definir, zerar, limpar, ordem, tri, qtdAtivos, busca: sp.get("q") || "" };
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* ------------------------------------------------------------------------------------------------ Página */

export default function PessoasPainel() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate("/login?voltar=/app/pessoas/painel"); }, [loading, user, navigate]);
  const { data, isLoading, error } = usePessoas(!!user);

  return (
    <AppLayout>
      {loading || isLoading || !user ? (
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Carregando pessoas...</div>
      ) : error ? (
        <div className="max-w-xl mx-auto text-center py-20 space-y-3">
          <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
          <h1 className="font-['Playfair_Display'] text-2xl font-bold">Painel de pessoas</h1>
          <p className="text-muted-foreground">Este painel é da coordenação e da gestão. Se você precisa dele, fale com a Diretoria.</p>
        </div>
      ) : (
        <Painel pessoas={data || []} />
      )}
    </AppLayout>
  );
}

const LinkRR = ({ href, className, children }: { href: string; className: string; children: ReactNode }) => <Link to={href} className={className}>{children}</Link>;

function Painel({ pessoas }: { pessoas: Pessoa[] }) {
  const f = useFiltros();
  const fichaParam = f.sp.get("pessoa");
  const abrirFicha = (id: string) => f.definir("pessoa", id);
  const fecharFicha = () => f.definir("pessoa", null);
  const chaveFiltros = (() => { const c = new URLSearchParams(f.sp); c.delete("pessoa"); return c.toString(); })();
  const [texto, setTexto] = useState(f.busca);
  const [abrirFiltros, setAbrirFiltros] = useState(false);
  const [limite, setLimite] = useState(60);

  useEffect(() => {
    const t = setTimeout(() => { if (texto.trim() !== f.busca) f.definir("q", texto.trim() || null); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const linhas = useMemo(() => { const hoje = new Date(); return pessoas.map((p) => preparar(p, hoje)); }, [pessoas]);

  // Opções de cada grupo, tiradas da própria base, com a contagem total de pessoas.
  const opcoes = useMemo(() => {
    const conta = (pegar: (l: Linha) => string[]) => {
      const m = new Map<string, number>();
      linhas.forEach((l) => new Set(pegar(l)).forEach((v) => m.set(v, (m.get(v) || 0) + 1)));
      return m;
    };
    const ordenar = (m: Map<string, number>, rotulo: (v: string) => string, ordemFixa?: string[]) =>
      [...m.entries()]
        .map(([valor, n]) => ({ valor, n, rotulo: rotulo(valor) }))
        .sort((a, b) => ordemFixa ? ordemFixa.indexOf(a.valor) - ordemFixa.indexOf(b.valor) : a.rotulo.localeCompare(b.rotulo, "pt-BR", { numeric: true }));
    const macaRotulo = new Map<string, string>();
    linhas.forEach((l) => l.macas.forEach((m) => macaRotulo.set(String(m.numero), `${m.numero} · ${m.nome}`)));
    return {
      papel: ordenar(conta((l) => [...l.tags]), (v) => ROTULO_PAPEL[v] || v, ORDEM_PAPEL),
      atend: ordenar(conta((l) => l.atendimento), (v) => ROTULO_ATEND[v] || v, ["medium", "dialogador", "recepcao", "admin"]),
      sec: ordenar(conta((l) => l.secretarias.map((s) => s.nome)), (v) => v),
      funcao: ordenar(conta((l) => l.funcoes.map((x) => x.nome)), (v) => v),
      maca: ordenar(conta((l) => l.macas.map((m) => String(m.numero))), (v) => macaRotulo.get(v) || v),
      dia: ordenar(conta((l) => l.macas.map((m) => m.dia)), (v) => ROTULO_DIA[v] || v),
      curso: ordenar(conta((l) => l.cursosAtivos), (v) => v),
      acesso: ordenar(conta((l) => l.acesso), (v) => ROTULO_ACESSO[v] || v, ["admin", "gestor", "trabalhador", "aluno"]),
      assoc: ordenar(conta((l) => l.associado ? [l.associado.categoria, `sit:${l.associado.situacao}`] : []),
        (v) => v.startsWith("sit:") ? `Situação: ${ROTULO_SITUACAO[v.slice(4)] || v.slice(4)}` : ROTULO_CATEGORIA[v] || v),
    };
  }, [linhas]);

  const rotuloDe = (g: Grupo, v: string) => opcoes[g].find((o) => o.valor === v)?.rotulo || v;

  const filtradas = useMemo(() => {
    const q = semAcento(f.busca);
    const qDig = f.busca.replace(/\D/g, "");
    const sel = Object.fromEntries(GRUPOS.map((g) => [g, f.lista(g)])) as Record<Grupo, string[]>;
    const algum = (escolhidos: string[], tem: string[]) => escolhidos.length === 0 || escolhidos.some((v) => tem.includes(v));
    const secPapel = f.sp.get("secpapel");

    const r = linhas.filter((l) => {
      if (q && !(semAcento(l.nome).includes(q) || (l.email && l.email.toLowerCase().includes(q)) || (qDig.length >= 4 && l.telefone?.replace(/\D/g, "").includes(qDig)))) return false;
      if (!algum(sel.papel, [...l.tags])) return false;
      if (!algum(sel.atend, l.atendimento)) return false;
      const secs = l.secretarias.filter((s) => !secPapel || s.papel === secPapel).map((s) => s.nome);
      if (sel.sec.length ? !algum(sel.sec, secs) : secPapel ? secs.length === 0 : false) return false;
      if (!algum(sel.funcao, l.funcoes.map((x) => x.nome))) return false;
      if (!algum(sel.maca, l.macas.map((m) => String(m.numero)))) return false;
      if (!algum(sel.dia, l.macas.map((m) => m.dia))) return false;
      if (!algum(sel.curso, l.cursosAtivos)) return false;
      if (!algum(sel.acesso, l.acesso)) return false;
      if (sel.assoc.length) {
        const cats = sel.assoc.filter((v) => !v.startsWith("sit:"));
        const sits = sel.assoc.filter((v) => v.startsWith("sit:")).map((v) => v.slice(4));
        if (!l.associado) return false;
        if (cats.length && !cats.includes(l.associado.categoria)) return false;
        if (sits.length && !sits.includes(l.associado.situacao)) return false;
      }
      const login = f.tri("login"); if (login && (login === "com") !== l.tem_login) return false;
      const cpf = f.tri("cpf"); if (cpf && (cpf === "com") !== l.tem_cpf) return false;
      const cad = f.tri("cadastro"); if (cad && (cad === "confirmado") !== l.cadastro_confirmado) return false;
      return true;
    });

    const nome = (a: Linha, b: Linha) => a.nome.localeCompare(b.nome, "pt-BR");
    const nulosNoFim = (x: number | null, y: number | null, dir: 1 | -1) => x === null && y === null ? 0 : x === null ? 1 : y === null ? -1 : (x - y) * dir;
    const tempo = (s: string | null) => (s ? new Date(s).getTime() : null);
    const cmp: Record<Ordem, (a: Linha, b: Linha) => number> = {
      nome_asc: nome,
      nome_desc: (a, b) => -nome(a, b),
      cadastro_novo: (a, b) => nulosNoFim(tempo(a.cadastrado_em), tempo(b.cadastrado_em), -1) || nome(a, b),
      cadastro_antigo: (a, b) => nulosNoFim(tempo(a.cadastrado_em), tempo(b.cadastrado_em), 1) || nome(a, b),
      acesso_recente: (a, b) => nulosNoFim(tempo(a.ultimo_acesso), tempo(b.ultimo_acesso), -1) || nome(a, b),
      acesso_antigo: (a, b) => nulosNoFim(tempo(a.ultimo_acesso), tempo(b.ultimo_acesso), 1) || nome(a, b),
      aniversario: (a, b) => nulosNoFim(a.diasAniversario, b.diasAniversario, 1) || nome(a, b),
      idade_maior: (a, b) => nulosNoFim(a.idade, b.idade, -1) || nome(a, b),
      idade_menor: (a, b) => nulosNoFim(a.idade, b.idade, 1) || nome(a, b),
      mais_funcoes: (a, b) => b.qtdFuncoes - a.qtdFuncoes || nome(a, b),
    };
    return r.sort(cmp[f.ordem]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhas, chaveFiltros]);

  useEffect(() => setLimite(60), [chaveFiltros]);

  const pilulas: { chave: string; rotulo: string; tirar: () => void }[] = [
    ...GRUPOS.flatMap((g) => f.lista(g).map((v) => ({ chave: `${g}:${v}`, rotulo: rotuloDe(g, v), tirar: () => f.alternar(g, v) }))),
    ...(f.sp.get("secpapel") ? [{ chave: "secpapel", rotulo: f.sp.get("secpapel") === "coordenador" ? "Coordena secretaria" : "Participa de secretaria", tirar: () => f.definir("secpapel", null) }] : []),
    ...(f.tri("login") ? [{ chave: "login", rotulo: f.tri("login") === "com" ? "Com login" : "Sem login", tirar: () => f.definir("login", null) }] : []),
    ...(f.tri("cpf") ? [{ chave: "cpf", rotulo: f.tri("cpf") === "com" ? "Com CPF" : "Sem CPF", tirar: () => f.definir("cpf", null) }] : []),
    ...(f.tri("cadastro") ? [{ chave: "cadastro", rotulo: f.tri("cadastro") === "confirmado" ? "Cadastro confirmado" : "Cadastro pendente", tirar: () => f.definir("cadastro", null) }] : []),
  ];

  const exportar = () => {
    const linhasPlanilha = filtradas.map((l) => ({
      Nome: l.nome,
      "E-mail": l.email || "",
      Telefone: l.telefone || "",
      Nascimento: l.nascimento ? l.nascimento.split("-").reverse().join("/") : "",
      Idade: l.idade ?? "",
      "Na Casa": ORDEM_PAPEL.filter((t) => l.tags.has(t)).map((t) => ROTULO_PAPEL[t]).join(", "),
      Atendimento: l.atendimento.map((a) => ROTULO_ATEND[a] || a).join(", "),
      Macas: l.macas.map((m) => `${m.numero} ${m.nome} (${ROTULO_DIA[m.dia] || m.dia})`).join(", "),
      Secretarias: l.secretarias.map((s) => `${s.nome}${s.papel === "coordenador" ? " (coordenação)" : ""}`).join(", "),
      Funções: l.funcoes.map((x) => x.onde ? `${x.nome} (${x.onde})` : x.nome).join(", "),
      Cursos: l.cursosAtivos.join(", "),
      Associado: l.associado ? `${ROTULO_CATEGORIA[l.associado.categoria] || l.associado.categoria} · ${ROTULO_SITUACAO[l.associado.situacao] || l.associado.situacao}` : "",
      "Acesso ao sistema": l.acesso.map((a) => ROTULO_ACESSO[a] || a).join(", "),
      Login: l.tem_login ? "Sim" : "Não",
      CPF: l.tem_cpf ? "Preenchido" : "Falta",
      "Último acesso": l.ultimo_acesso ? new Date(l.ultimo_acesso).toLocaleDateString("pt-BR") : "",
      "Cadastrado em": new Date(l.cadastrado_em).toLocaleDateString("pt-BR"),
    }));
    const ws = XLSX.utils.json_to_sheet(linhasPlanilha);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pessoas");
    XLSX.writeFile(wb, `pessoas-lsl-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const papeisRapidos = opcoes.papel.filter((o) => ["trabalhador", "coordenador", "frequentador", "assistido", "associado", "aluno", "sem_papel"].includes(o.valor));
  const papelSel = f.lista("papel");

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <CabecalhoPagina titulo="Painel de pessoas" Link={LinkRR}
        descricao="Todo o cadastro da Casa em um lugar: papel, secretaria, função, maca e curso de cada pessoa."
        acoes={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportar} disabled={!filtradas.length}><Download className="w-4 h-4 mr-2" />Planilha</Button>
            <Button onClick={() => abrirFicha("nova")}><UserPlus className="w-4 h-4 mr-2" />Nova pessoa</Button>
          </div>
        } />

      {/* Atalhos por papel */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
        <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap pb-1">
          <BotaoAtalho ativo={papelSel.length === 0} onClick={() => f.zerar("papel")} rotulo="Todos" n={linhas.length} />
          {papeisRapidos.map((o) => (
            <BotaoAtalho key={o.valor} ativo={papelSel.includes(o.valor)} onClick={() => f.alternar("papel", o.valor)} rotulo={o.rotulo} n={o.n} />
          ))}
        </div>
      </div>

      {/* Busca, filtros e ordem */}
      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_240px] gap-2">
        <div className="relative col-span-2 sm:col-span-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nome, e-mail ou telefone"
            className="h-12 pl-12 pr-10 text-base rounded-2xl" aria-label="Procurar pessoa" />
          {texto && (
            <button onClick={() => setTexto("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" aria-label="Limpar busca">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button variant="outline" className="h-12 rounded-2xl px-4" onClick={() => setAbrirFiltros(true)}>
          <SlidersHorizontal className="w-4 h-4 mr-2" />Filtros{f.qtdAtivos > 0 && <span className="ml-2 rounded-full bg-[#0059b1] text-white text-xs px-2 py-0.5 lining-nums">{f.qtdAtivos}</span>}
        </Button>
        <Select value={f.ordem} onValueChange={(v) => f.definir("ordem", v === "nome_asc" ? null : v)}>
          <SelectTrigger className="h-12 rounded-2xl" aria-label="Ordenar"><ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground shrink-0" /><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.entries(ORDENS) as [Ordem, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {pilulas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          {pilulas.map((p) => (
            <button key={p.chave} onClick={p.tirar} className="inline-flex items-center gap-1 rounded-full bg-[#e3eefb] text-[#0059b1] text-[13px] font-medium pl-3 pr-2 py-1">
              {p.rotulo}<X className="w-3.5 h-3.5" />
            </button>
          ))}
          <button onClick={f.limpar} className="text-[13px] font-medium text-muted-foreground underline underline-offset-2 px-2">Limpar filtros</button>
        </div>
      )}

      <p className="text-sm text-muted-foreground lining-nums">
        <strong className="text-foreground">{filtradas.length}</strong> de {linhas.length} pessoas · {ORDENS[f.ordem].toLowerCase()}
      </p>

      {filtradas.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">Ninguém com esses filtros. Tire algum filtro ou confira a busca.</p>
      ) : (
        <>
          {/* Celular: cartões */}
          <ul className="lg:hidden space-y-2">
            {filtradas.slice(0, limite).map((l) => <Cartao key={l.id} l={l} ordem={f.ordem} abrir={abrirFicha} />)}
          </ul>
          {/* Computador: tabela */}
          <div className="hidden lg:block rounded-2xl border border-border/70 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Pessoa</th>
                  <th className="px-3 py-3 font-semibold">Na Casa</th>
                  <th className="px-3 py-3 font-semibold">Atendimento</th>
                  <th className="px-3 py-3 font-semibold">Secretarias e funções</th>
                  <th className="px-3 py-3 font-semibold">Formação</th>
                  <th className="px-3 py-3 font-semibold">Cadastro</th>
                  <th className="px-4 py-3 font-semibold text-right">{colunaOrdem(f.ordem).titulo}</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.slice(0, limite).map((l) => <LinhaTabela key={l.id} l={l} ordem={f.ordem} abrir={abrirFicha} />)}
              </tbody>
            </table>
          </div>
          {filtradas.length > limite && (
            <div className="text-center">
              <Button variant="outline" className="rounded-2xl h-11" onClick={() => setLimite((n) => n + 100)}>
                Mostrar mais ({filtradas.length - limite} restantes)
              </Button>
            </div>
          )}
        </>
      )}

      <FichaPessoa
        pessoaId={fichaParam && fichaParam !== "nova" ? fichaParam : null}
        aberta={!!fichaParam}
        fechar={fecharFicha}
        aoCriar={(id) => abrirFicha(id)}
      />

      <Sheet open={abrirFiltros} onOpenChange={setAbrirFiltros}>
        <SheetContent side="right" className="z-[70] w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b">
            <SheetTitle className="font-['Playfair_Display'] text-xl">Filtros</SheetTitle>
            <p className="text-[13px] text-muted-foreground text-left">Dentro de um grupo, vale qualquer opção marcada. Entre grupos, a pessoa precisa atender a todos.</p>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            <GrupoFiltro titulo="Na Casa" opcoes={opcoes.papel} marcados={f.lista("papel")} alternar={(v) => f.alternar("papel", v)} />
            <GrupoFiltro titulo="Atendimento" opcoes={opcoes.atend} marcados={f.lista("atend")} alternar={(v) => f.alternar("atend", v)} />
            <GrupoFiltro titulo="Maca" opcoes={opcoes.maca} marcados={f.lista("maca")} alternar={(v) => f.alternar("maca", v)} recolher={8} />
            <GrupoFiltro titulo="Dia de trabalho na maca" opcoes={opcoes.dia} marcados={f.lista("dia")} alternar={(v) => f.alternar("dia", v)} />
            <div className="space-y-2">
              <GrupoFiltro titulo="Secretaria" opcoes={opcoes.sec} marcados={f.lista("sec")} alternar={(v) => f.alternar("sec", v)} />
              <Escolha3 rotulo="Na secretaria" valor={f.sp.get("secpapel") || ""} definir={(v) => f.definir("secpapel", v)}
                opcoes={[["", "Qualquer"], ["coordenador", "Coordena"], ["participante", "Participa"]]} />
            </div>
            <GrupoFiltro titulo="Função" opcoes={opcoes.funcao} marcados={f.lista("funcao")} alternar={(v) => f.alternar("funcao", v)} vazio="Nenhuma função atribuída ainda." />
            <GrupoFiltro titulo="Curso da Formação" opcoes={opcoes.curso} marcados={f.lista("curso")} alternar={(v) => f.alternar("curso", v)} recolher={8} />
            <GrupoFiltro titulo="Associado" opcoes={opcoes.assoc} marcados={f.lista("assoc")} alternar={(v) => f.alternar("assoc", v)} vazio="Nenhum associado cadastrado ainda." />
            <GrupoFiltro titulo="Acesso ao sistema" opcoes={opcoes.acesso} marcados={f.lista("acesso")} alternar={(v) => f.alternar("acesso", v)} />
            <div className="space-y-3">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Situação do cadastro</h3>
              <Escolha3 rotulo="Login" valor={f.tri("login")} definir={(v) => f.definir("login", v)} opcoes={[["", "Todos"], ["com", "Com login"], ["sem", "Sem login"]]} />
              <Escolha3 rotulo="CPF" valor={f.tri("cpf")} definir={(v) => f.definir("cpf", v)} opcoes={[["", "Todos"], ["com", "Preenchido"], ["sem", "Falta"]]} />
              <Escolha3 rotulo="Dados" valor={f.tri("cadastro")} definir={(v) => f.definir("cadastro", v)} opcoes={[["", "Todos"], ["confirmado", "Confirmados"], ["pendente", "Pendentes"]]} />
            </div>
          </div>
          <SheetFooter className="border-t px-5 py-3 flex-row gap-2 sm:justify-between">
            <Button variant="ghost" onClick={f.limpar} disabled={f.qtdAtivos === 0}>Limpar</Button>
            <Button className="flex-1 sm:flex-none" onClick={() => setAbrirFiltros(false)}>Ver {filtradas.length} pessoas</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ Peças */

function BotaoAtalho({ ativo, onClick, rotulo, n }: { ativo: boolean; onClick: () => void; rotulo: string; n: number }) {
  return (
    <button onClick={onClick} aria-pressed={ativo}
      className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${ativo ? "bg-[#0059b1] border-[#0059b1] text-white" : "bg-card border-border/70 hover:bg-[#f1f6fd]"}`}>
      {rotulo} <span className={`lining-nums ${ativo ? "text-white/80" : "text-muted-foreground"}`}>{n}</span>
    </button>
  );
}

function GrupoFiltro({ titulo, opcoes, marcados, alternar, recolher, vazio }: {
  titulo: string; opcoes: { valor: string; rotulo: string; n: number }[]; marcados: string[]; alternar: (v: string) => void; recolher?: number; vazio?: string;
}) {
  const [tudo, setTudo] = useState(false);
  const visiveis = recolher && !tudo ? opcoes.filter((o, i) => i < recolher || marcados.includes(o.valor)) : opcoes;
  return (
    <section className="space-y-2">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
      {opcoes.length === 0 ? <p className="text-[13px] text-muted-foreground">{vazio || "Nada por aqui ainda."}</p> : (
        <div className="flex flex-wrap gap-1.5">
          {visiveis.map((o) => {
            const on = marcados.includes(o.valor);
            return (
              <button key={o.valor} onClick={() => alternar(o.valor)} aria-pressed={on}
                className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors text-left ${on ? "bg-[#0059b1] border-[#0059b1] text-white" : "bg-card border-border/70 hover:bg-[#f1f6fd]"}`}>
                {o.rotulo} <span className={`lining-nums ${on ? "text-white/80" : "text-muted-foreground"}`}>{o.n}</span>
              </button>
            );
          })}
          {recolher && opcoes.length > recolher && (
            <button onClick={() => setTudo((t) => !t)} className="text-[13px] font-medium text-[#0059b1] px-2 py-1.5">
              {tudo ? "Mostrar menos" : `Ver todas (${opcoes.length})`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Escolha3({ rotulo, valor, definir, opcoes }: { rotulo: string; valor: string; definir: (v: string | null) => void; opcoes: [string, string][] }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-24 shrink-0">{rotulo}</span>
      <div className="flex-1 grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
        {opcoes.map(([v, r]) => (
          <button key={v || "todos"} onClick={() => definir(v || null)} aria-pressed={valor === v}
            className={`rounded-full px-2 py-1.5 text-[13px] font-medium ${valor === v ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

function Etiqueta({ tag }: { tag: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[12px] font-medium ${COR_PAPEL[tag] || "bg-muted"}`}>{ROTULO_PAPEL[tag] || tag}</span>;
}

const dataCurta = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "Nunca");

/** O que mostrar na última coluna, conforme a ordenação escolhida. */
function colunaOrdem(ordem: Ordem) {
  switch (ordem) {
    case "cadastro_novo": case "cadastro_antigo": return { titulo: "Cadastro", valor: (l: Linha) => dataCurta(l.cadastrado_em) };
    case "aniversario": return { titulo: "Aniversário", valor: (l: Linha) => l.nascimento ? `${l.nascimento.slice(8, 10)}/${l.nascimento.slice(5, 7)}${l.diasAniversario === 0 ? " · hoje" : l.diasAniversario !== null && l.diasAniversario <= 30 ? ` · em ${l.diasAniversario} dias` : ""}` : "Sem data" };
    case "idade_maior": case "idade_menor": return { titulo: "Idade", valor: (l: Linha) => l.idade !== null ? `${l.idade} anos` : "Sem data" };
    case "mais_funcoes": return { titulo: "Funções", valor: (l: Linha) => String(l.qtdFuncoes) };
    default: return { titulo: "Último acesso", valor: (l: Linha) => l.tem_login ? dataCurta(l.ultimo_acesso) : "Sem login" };
  }
}

function tagsOrdenadas(l: Linha) {
  return ORDEM_PAPEL.filter((t) => l.tags.has(t) && t !== "aluno" && t !== "facilitador");
}

function Cartao({ l, ordem, abrir }: { l: Linha; ordem: Ordem; abrir: (id: string) => void }) {
  const col = colunaOrdem(ordem);
  const linhaAtend = [...l.atendimento.map((a) => ROTULO_ATEND[a] || a), ...l.macas.map((m) => `Maca ${m.numero} ${m.nome} (${ROTULO_DIA[m.dia] || m.dia})`)];
  const linhaSec = [...l.secretarias.map((s) => s.papel === "coordenador" ? `Coordena ${s.nome}` : s.nome), ...l.funcoes.map((x) => x.nome)];
  return (
    <li>
      <button type="button" onClick={() => abrir(l.id)} className="w-full text-left flex gap-3 rounded-2xl bg-card border border-border/70 p-4 hover:bg-[#f1f6fd] transition-colors">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-[16px] leading-tight">{l.nome}</span>
            <span className="text-[12px] text-muted-foreground shrink-0 lining-nums">{col.valor(l)}</span>
          </div>
          <div className="flex flex-wrap gap-1">{tagsOrdenadas(l).map((t) => <Etiqueta key={t} tag={t} />)}</div>
          {linhaAtend.length > 0 && <p className="text-[13px] text-foreground/80"><span className="text-muted-foreground">Atendimento: </span>{linhaAtend.join(" · ")}</p>}
          {linhaSec.length > 0 && <p className="text-[13px] text-foreground/80"><span className="text-muted-foreground">Na gestão: </span>{linhaSec.join(" · ")}</p>}
          {l.cursosAtivos.length > 0 && <p className="text-[13px] text-foreground/80"><span className="text-muted-foreground">Formação: </span>{l.cursosAtivos.length} {l.cursosAtivos.length === 1 ? "curso" : "cursos"}</p>}
          <SinaisCadastro l={l} />
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 self-center" />
      </button>
    </li>
  );
}

function SinaisCadastro({ l }: { l: Linha }) {
  const faltas = [!l.tem_login && "sem login", !l.tem_cpf && "sem CPF", !l.cadastro_confirmado && "dados não confirmados"].filter(Boolean) as string[];
  if (faltas.length === 0) return <p className="text-[12px] text-[#256b25]">Cadastro completo</p>;
  return (
    <p className="text-[12px] text-[#8a4b00] flex items-center gap-1">
      {!l.tem_login && <KeyRound className="w-3 h-3" />}{faltas.join(" · ")}
    </p>
  );
}

function LinhaTabela({ l, ordem, abrir }: { l: Linha; ordem: Ordem; abrir: (id: string) => void }) {
  const col = colunaOrdem(ordem);
  return (
    <tr onClick={() => abrir(l.id)} className="border-t border-border/60 align-top hover:bg-[#f1f6fd] cursor-pointer">
      <td className="px-4 py-3">
        <button type="button" onClick={(e) => { e.stopPropagation(); abrir(l.id); }} className="font-semibold hover:underline text-left">{l.nome}</button>
        <div className="text-[12px] text-muted-foreground truncate max-w-[220px]">{l.email || l.telefone || "Sem contato"}</div>
      </td>
      <td className="px-3 py-3"><div className="flex flex-wrap gap-1 max-w-[200px]">{tagsOrdenadas(l).map((t) => <Etiqueta key={t} tag={t} />)}</div></td>
      <td className="px-3 py-3 text-[13px]">
        {l.atendimento.length === 0 && l.macas.length === 0 ? <span className="text-muted-foreground">·</span> : (
          <>
            <div>{l.atendimento.map((a) => ROTULO_ATEND[a] || a).join(", ")}</div>
            {l.macas.map((m) => <div key={`${m.numero}${m.dia}`} className="text-muted-foreground">Maca {m.numero} {m.nome} · {ROTULO_DIA[m.dia] || m.dia}</div>)}
          </>
        )}
      </td>
      <td className="px-3 py-3 text-[13px]">
        {l.secretarias.length === 0 && l.funcoes.length === 0 ? <span className="text-muted-foreground">·</span> : (
          <>
            {l.secretarias.map((s) => <div key={s.nome + s.papel}>{s.nome}{s.papel === "coordenador" && <span className="text-[#7a5200]"> · coordena</span>}</div>)}
            {l.funcoes.map((x) => <div key={x.nome + (x.onde || "")} className="text-muted-foreground">{x.nome}{x.onde ? ` (${x.onde})` : ""}</div>)}
          </>
        )}
      </td>
      <td className="px-3 py-3 text-[13px]">
        {l.cursosAtivos.length === 0 && l.facilita.length === 0 ? <span className="text-muted-foreground">·</span> : (
          <span title={l.cursosAtivos.join("\n")}>
            {l.cursosAtivos.length > 0 && <div className="lining-nums">{l.cursosAtivos.length} {l.cursosAtivos.length === 1 ? "curso" : "cursos"}</div>}
            {l.facilita.length > 0 && <div className="text-[#0e4f4b]">Facilita {l.facilita.length}</div>}
          </span>
        )}
      </td>
      <td className="px-3 py-3"><SinaisCadastro l={l} /></td>
      <td className="px-4 py-3 text-right text-[13px] text-muted-foreground whitespace-nowrap lining-nums">{col.valor(l)}</td>
    </tr>
  );
}
