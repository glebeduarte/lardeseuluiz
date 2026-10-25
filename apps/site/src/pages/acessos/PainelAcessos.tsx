import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Search, KeyRound, Lock, HeartPulse, GraduationCap, Landmark, ChevronRight, Loader2, Plus, X, History, Ticket,
  Building2, Briefcase, UserRound, ShieldCheck,
} from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { CabecalhoPagina, iniciaisLsl } from "@/compartilhado";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DIA, MODULOS, NOME_SISTEMA, PAPEIS, TIPO_PESSOA, criarAcesso, nomePapel, useGravarAcesso, usePainelAcessos, usePainelDireitos,
  usePainelPessoas, type Acessos, type Sistema,
} from "@/lib/acessos";

// Painel único de acessos: uma pessoa, três colunas (Atendimento, Formação e Governança).
// Admin geral mexe nas três; o admin do Atendimento ou da Formação mexe só na coluna dele.

const LinkRR = ({ href, className, children }: { href: string; className: string; children: ReactNode }) => <Link to={href} className={className}>{children}</Link>;

const COR: Record<Sistema, { faixa: string; icone: string; texto: string; suave: string }> = {
  atendimento: { faixa: "bg-[#7c3aed]", icone: "bg-[#ede9fe] text-[#6d28d9]", texto: "text-[#6d28d9]", suave: "bg-[#f5f3ff]" },
  formacao: { faixa: "bg-[#176e69]", icone: "bg-[#dcf2ef] text-[#176e69]", texto: "text-[#176e69]", suave: "bg-[#effaf8]" },
  governanca: { faixa: "bg-[#0059b1]", icone: "bg-[#e3eefb] text-[#0059b1]", texto: "text-[#0059b1]", suave: "bg-[#f1f6fd]" },
};
const ICONE: Record<Sistema, typeof HeartPulse> = { atendimento: HeartPulse, formacao: GraduationCap, governanca: Landmark };

export default function PainelAcessos() {
  const { personId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate(`/login?voltar=/app/acessos${personId ? "/" + personId : ""}`); }, [loading, user, navigate, personId]);
  const { data: direitos, isLoading } = usePainelDireitos(!!user);
  return (
    <AppLayout>
      {loading || isLoading || !user ? <Carregando /> : !direitos?.algum ? <SemAcesso /> : personId ? <Ficha personId={personId} /> : <Lista />}
    </AppLayout>
  );
}

function Carregando() {
  return <div className="flex items-center justify-center py-32 text-muted-foreground gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Carregando...</div>;
}

function SemAcesso() {
  return (
    <div className="max-w-xl mx-auto text-center py-20 space-y-3">
      <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
      <h1 className="font-['Playfair_Display'] text-2xl font-bold">Painel de acessos</h1>
      <p className="text-muted-foreground">Só administradores mexem nos acessos. Se você precisa liberar algo para alguém, fale com a coordenação.</p>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ Lista de pessoas */

function Lista() {
  const navigate = useNavigate();
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");
  useEffect(() => { const t = setTimeout(() => setBusca(texto.trim()), 300); return () => clearTimeout(t); }, [texto]);
  const { data: pessoas = [], isLoading } = usePainelPessoas(busca);

  return (
    <div className="max-w-3xl mx-auto">
      <CabecalhoPagina titulo="Acessos" Link={LinkRR}
        descricao="Escolha a pessoa para ver e mudar o que ela pode fazer no Atendimento, na Formação e na Governança." />
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nome, e-mail ou telefone"
          className="h-14 pl-12 text-base rounded-2xl" aria-label="Procurar pessoa" />
      </div>
      {isLoading ? <Carregando /> : pessoas.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Ninguém encontrado. Confira o nome ou cadastre a pessoa em Pessoas.</p>
      ) : (
        <ul className="space-y-2">
          {pessoas.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => navigate(`/app/acessos/${p.id}`)}
                className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border/70 p-3 sm:p-4 text-left hover:bg-[#f1f6fd] transition-colors">
                <Avatar nome={p.nome} foto={p.foto} tamanho="w-12 h-12" />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-[16px] truncate">{p.nome}</span>
                  <span className="block text-sm text-muted-foreground truncate">{p.email || p.telefone || "Sem contato"}</span>
                </span>
                <span className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                  {!p.tem_login ? <Selo tom="aviso">Sem login</Selo> : p.papeis > 0 ? <Selo tom="azul">{p.papeis} {p.papeis === 1 ? "papel" : "papéis"}</Selo> : <Selo>Só o básico</Selo>}
                  {p.voluntario && <span className="text-xs text-muted-foreground">Voluntário</span>}
                </span>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ Ficha da pessoa */

function Ficha({ personId }: { personId: string }) {
  const { data, isLoading, error } = usePainelAcessos(personId);
  const [aba, setAba] = useState<Sistema>("atendimento");
  const gravar = useGravarAcesso(personId);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Primeira coluna visível no celular: a que quem está editando pode mexer
  useEffect(() => {
    if (!data) return;
    const d = data.direitos;
    setAba((a) => (d[a] ? a : d.atendimento ? "atendimento" : d.formacao ? "formacao" : "governanca"));
  }, [data?.direitos]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <Carregando />;
  if (error || !data) return <p className="text-center text-muted-foreground py-20">{(error as Error)?.message || "Não foi possível abrir esta pessoa."}</p>;

  const p = data.pessoa;
  const semLogin = !p.user_id;
  const executar = async (chave: string, funcao: string, args: Record<string, unknown>, sucesso?: string) => {
    setOcupado(chave);
    await gravar(funcao, args, sucesso);
    setOcupado(null);
  };
  const props = { dados: data, semLogin, ocupado, executar };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <Link to="/app/acessos" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Todas as pessoas
      </Link>

      <section className="rounded-3xl bg-card border border-border/70 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar nome={p.nome} foto={p.foto} tamanho="w-16 h-16 sm:w-20 sm:h-20" texto="text-xl" />
        <div className="flex-1 min-w-0">
          <h1 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold leading-tight">{p.nome}</h1>
          <p className="text-muted-foreground text-sm mt-0.5 break-all">{[p.email, p.telefone].filter(Boolean).join(" · ") || "Sem e-mail e telefone"}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {p.tipos.map((t) => <Selo key={t}>{TIPO_PESSOA[t] ?? t}</Selo>)}
            {semLogin ? <Selo tom="aviso">Ainda sem login</Selo> : <Selo tom="verde">Tem login</Selo>}
          </div>
        </div>
        <ResumoPapeis dados={data} />
      </section>

      <NaCasa dados={data} ocupado={ocupado} executar={executar} />

      {semLogin && <CriarAcesso dados={data} />}

      {/* Celular: escolhe a área; telas largas: as três lado a lado */}
      <div className="lg:hidden grid grid-cols-3 gap-1 rounded-full bg-muted p-1 sticky top-2 z-10" role="tablist">
        {(["atendimento", "formacao", "governanca"] as Sistema[]).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={aba === s} onClick={() => setAba(s)}
            className={`h-11 rounded-full text-[14px] font-semibold transition-colors ${aba === s ? "bg-white shadow-sm " + COR[s].texto : "text-muted-foreground"}`}>
            {NOME_SISTEMA[s]}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className={aba === "atendimento" ? "" : "hidden lg:block"}><ColunaAtendimento {...props} /></div>
        <div className={aba === "formacao" ? "" : "hidden lg:block"}><ColunaFormacao {...props} /></div>
        <div className={aba === "governanca" ? "" : "hidden lg:block"}><ColunaGovernanca {...props} /></div>
      </div>

      {data.historico.length > 0 && <Historico dados={data} />}
    </div>
  );
}

type PropsColuna = {
  dados: Acessos; semLogin: boolean; ocupado: string | null;
  executar: (chave: string, funcao: string, args: Record<string, unknown>, sucesso?: string) => Promise<void>;
};

function ResumoPapeis({ dados }: { dados: Acessos }) {
  const selos = [
    ...dados.atendimento.papeis.map((x) => ({ s: "atendimento" as Sistema, t: nomePapel("atendimento", x) })),
    ...dados.formacao.papeis.filter((x) => x === "admin").map((x) => ({ s: "formacao" as Sistema, t: nomePapel("formacao", x) })),
    ...(dados.formacao.cursos.some((c) => c.facilita) ? [{ s: "formacao" as Sistema, t: "Facilitador" }] : []),
    ...dados.governanca.papeis.filter((x) => x !== "trabalhador").map((x) => ({ s: "governanca" as Sistema, t: nomePapel("governanca", x) })),
  ];
  if (!selos.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 sm:max-w-[280px] sm:justify-end">
      {selos.map((x) => <span key={x.s + x.t} className={`px-3 py-1 rounded-full text-xs font-semibold ${COR[x.s].icone}`}>{x.t}</span>)}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ Voluntário ou frequentador */

function NaCasa({ dados, ocupado, executar }: { dados: Acessos; ocupado: string | null; executar: PropsColuna["executar"] }) {
  const p = dados.pessoa;
  const voluntario = p.tipos.includes("trabalhador");
  const pode = dados.direitos.governanca;
  const [pedirCpf, setPedirCpf] = useState(false);
  const [cpf, setCpf] = useState("");
  const mudar = async (v: boolean) => {
    if (v && !p.tem_cpf && !pedirCpf) { setPedirCpf(true); return; }
    await executar("vol", "painel_voluntario", { p_ativo: v, p_cpf: v && !p.tem_cpf ? cpf : null }, v ? "Agora consta como voluntário" : "Agora consta como frequentador");
    setPedirCpf(false); setCpf("");
  };
  return (
    <section className="rounded-3xl bg-card border border-border/70 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[#fff3cc] text-[#7a5200] flex items-center justify-center shrink-0"><UserRound className="w-5 h-5" /></span>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[16px] leading-tight">Na Casa: {voluntario ? "voluntário" : "frequentador"}</h2>
          <p className="text-[13px] text-muted-foreground leading-snug">Voluntário é quem trabalha na Casa. Isso vale para o cadastro e para a Formação.</p>
        </div>
        {ocupado === "vol" ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
          <Switch checked={voluntario || pedirCpf} disabled={!pode} onCheckedChange={(v) => (v ? mudar(true) : pedirCpf ? setPedirCpf(false) : mudar(false))} aria-label="Voluntário" />
        )}
      </div>
      {!pode && <p className="text-[13px] text-muted-foreground mt-2">Só o administrador geral muda isso.</p>}
      {pedirCpf && (
        <div className="mt-3 grid sm:grid-cols-[1fr_auto_auto] gap-2 rounded-2xl bg-[#fff8e0] p-3">
          <Input value={cpf} onChange={(e) => setCpf(e.target.value)} inputMode="numeric" placeholder="CPF da pessoa (só números)" className="h-11 bg-white" aria-label="CPF" autoFocus />
          <Button className="h-11" onClick={() => mudar(true)} disabled={cpf.replace(/\D/g, "").length !== 11}>Confirmar voluntário</Button>
          <Button variant="ghost" className="h-11" onClick={() => { setPedirCpf(false); setCpf(""); }}>Cancelar</Button>
          <p className="sm:col-span-3 text-[13px] text-[#5c4100]">O cadastro de voluntário pede o CPF. Ele fica guardado só no cadastro da Casa.</p>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------ Criar acesso */

function CriarAcesso({ dados }: { dados: Acessos }) {
  const qc = useQueryClient();
  const p = dados.pessoa;
  const [email, setEmail] = useState(p.email ?? "");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  if (!dados.direitos.criar_acesso) {
    return (
      <div className="rounded-3xl bg-amber-50 text-amber-900 p-5 text-[15px]">
        Esta pessoa ainda não tem login. Quem cria o acesso é um administrador geral ou gestor da Governança. Depois disso, os papéis abaixo podem ser ligados.
      </div>
    );
  }
  const enviar = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { toast.error("Informe um e-mail válido."); return; }
    if (senha.length < 6) { toast.error("A senha inicial precisa ter pelo menos 6 caracteres."); return; }
    setEnviando(true);
    try {
      const r = await criarAcesso(p, email, senha);
      toast.success(r.mensagem || "Acesso criado.");
      qc.invalidateQueries({ queryKey: ["painel-acessos", p.id] });
      qc.invalidateQueries({ queryKey: ["painel-pessoas"] });
      setSenha("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <section className="rounded-3xl bg-[#fff8e0] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-full bg-[#ffc116] text-[#0f1f3d] flex items-center justify-center shrink-0"><KeyRound className="w-5 h-5" /></span>
        <div className="min-w-0">
          <h2 className="font-['Playfair_Display'] text-xl font-bold">Criar o acesso de {p.nome.split(" ")[0]}</h2>
          <p className="text-[15px] text-[#5c4100] mt-0.5">Com o login criado, você liga os papéis nas colunas abaixo. Passe a senha inicial para a pessoa pelo WhatsApp e peça que ela troque no primeiro acesso.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-[1fr_220px_auto] gap-3 mt-4">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" placeholder="E-mail da pessoa" className="h-12 bg-white" aria-label="E-mail" />
        <Input value={senha} onChange={(e) => setSenha(e.target.value)} type="text" placeholder="Senha inicial (6 ou mais)" className="h-12 bg-white" aria-label="Senha inicial" autoComplete="off" />
        <Button className="h-12" onClick={enviar} disabled={enviando}>{enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />} Criar acesso</Button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------ Colunas */

function Coluna({ sistema, pode, semLogin, subtitulo, children }: { sistema: Sistema; pode: boolean; semLogin: boolean; subtitulo: string; children: ReactNode }) {
  const Icone = ICONE[sistema];
  return (
    <section className="rounded-3xl bg-card border border-border/70 overflow-hidden">
      <div className={`h-1.5 ${COR[sistema].faixa}`} />
      <div className="p-5 pb-2 flex items-center gap-3">
        <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${COR[sistema].icone}`}><Icone className="w-5 h-5" /></span>
        <div className="min-w-0">
          <h2 className="font-['Playfair_Display'] text-xl font-bold leading-tight">{NOME_SISTEMA[sistema]}</h2>
          <p className="text-sm text-muted-foreground">{subtitulo}</p>
        </div>
      </div>
      {!pode && (
        <p className="mx-5 mt-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground flex gap-2">
          <Lock className="w-4 h-4 mt-0.5 shrink-0" /> Só o administrador {sistema === "governanca" ? "geral" : `do ${NOME_SISTEMA[sistema]}`} muda esta coluna. Você está vendo como está hoje.
        </p>
      )}
      {semLogin && pode && sistema !== "governanca" && (
        <p className="mx-5 mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Crie o acesso acima para liberar esta coluna.</p>
      )}
      <div className="p-5 pt-3 space-y-5">{children}</div>
    </section>
  );
}

function Bloco({ titulo, icone: Icone, children, ajuda }: { titulo: string; icone?: typeof Lock; children: ReactNode; ajuda?: string }) {
  return (
    <div>
      <h3 className="font-sans text-[13px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-2">
        {Icone && <Icone className="w-4 h-4" />} {titulo}
      </h3>
      {ajuda && <p className="text-sm text-muted-foreground -mt-1 mb-2">{ajuda}</p>}
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function LinhaLiga({ titulo, ajuda, ligado, desabilitado, carregando, travado, aoMudar }: {
  titulo: string; ajuda?: string; ligado: boolean; desabilitado?: boolean; carregando?: boolean; travado?: string; aoMudar: (v: boolean) => void;
}) {
  return (
    <label className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${ligado ? "bg-[#f1f6fd]" : "bg-muted/40"} ${desabilitado ? "opacity-70" : "cursor-pointer"}`}>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-[15px] leading-snug">{titulo}</span>
        {ajuda && <span className="block text-[13px] text-muted-foreground leading-snug mt-0.5">{ajuda}</span>}
        {travado && <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[#7a5200]"><Lock className="w-3 h-3" /> {travado}</span>}
      </span>
      {carregando ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
        <Switch checked={ligado} disabled={desabilitado || !!travado} onCheckedChange={aoMudar} aria-label={titulo} />
      )}
    </label>
  );
}

function ColunaAtendimento({ dados, semLogin, ocupado, executar }: PropsColuna) {
  const a = dados.atendimento;
  const pode = dados.direitos.atendimento && !semLogin;
  return (
    <Coluna sistema="atendimento" pode={dados.direitos.atendimento} semLogin={semLogin} subtitulo="Macas, acolhimento e diálogo">
      <Bloco titulo="Papéis">
        {PAPEIS.atendimento.map((r) => (
          <LinhaLiga key={r.id} titulo={r.nome} ajuda={r.ajuda} ligado={a.papeis.includes(r.id)} desabilitado={!pode}
            carregando={ocupado === `at-${r.id}`} travado={a.via_funcao.includes(r.id) ? "Vem de uma função na Governança" : undefined}
            aoMudar={(v) => executar(`at-${r.id}`, "painel_papel", { p_sistema: "atendimento", p_papel: r.id, p_ativo: v }, v ? `${r.nome}: liberado` : `${r.nome}: retirado`)} />
        ))}
      </Bloco>
      {a.papeis.includes("medium") && (
        <Bloco titulo="Macas" ajuda="A maca do médium é escolhida no Atendimento, em Macas.">
          {a.macas.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não está em nenhuma maca.</p> : a.macas.map((m) => (
            <div key={`${m.dia}-${m.numero}`} className="flex items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2.5 text-[15px]">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: m.cor ?? "#94a3b8" }} />
              Maca {m.numero} · {m.nome}{m.dia ? ` · ${DIA[m.dia] ?? m.dia}` : ""}
            </div>
          ))}
          <a href="/atendimento/admin/macas" className="inline-flex items-center gap-1 text-sm font-semibold text-[#6d28d9] mt-1">Abrir Macas no Atendimento <ChevronRight className="w-4 h-4" /></a>
        </Bloco>
      )}
    </Coluna>
  );
}

function ColunaFormacao({ dados, semLogin, ocupado, executar }: PropsColuna) {
  const f = dados.formacao;
  const pode = dados.direitos.formacao && !semLogin;
  const [filtro, setFiltro] = useState("");
  const [facilitar, setFacilitar] = useState(false);
  const cursos = useMemo(() => f.cursos.filter((c) => !filtro || c.titulo.toLowerCase().includes(filtro.toLowerCase())), [f.cursos, filtro]);
  const matriculados = f.cursos.filter((c) => c.matricula).length;
  return (
    <Coluna sistema="formacao" pode={dados.direitos.formacao} semLogin={semLogin} subtitulo={matriculados ? `${matriculados} ${matriculados === 1 ? "curso" : "cursos"}` : "Cursos e estudos"}>
      <Bloco titulo="Papel">
        {PAPEIS.formacao.map((r) => (
          <LinhaLiga key={r.id} titulo={r.nome} ajuda={r.ajuda} ligado={f.papeis.includes(r.id)} desabilitado={!pode}
            carregando={ocupado === `fo-${r.id}`} travado={f.via_funcao.includes(r.id) ? "Vem de uma função na Governança" : undefined}
            aoMudar={(v) => executar(`fo-${r.id}`, "painel_papel", { p_sistema: "formacao", p_papel: r.id, p_ativo: v }, v ? `${r.nome}: liberado` : `${r.nome}: retirado`)} />
        ))}
      </Bloco>
      <Bloco titulo="Facilitador" ajuda="Quem conduz o curso. Lança a presença das aulas e vê os alunos só dos cursos marcados aqui.">
        {f.cursos.filter((c) => !filtro || c.titulo.toLowerCase().includes(filtro.toLowerCase())).filter((c) => c.facilita || facilitar).map((c) => (
          <LinhaLiga key={`fa-${c.id}`} titulo={`Facilita: ${c.titulo}`} ligado={c.facilita} desabilitado={!pode}
            carregando={ocupado === `fa-${c.id}`}
            aoMudar={(v) => executar(`fa-${c.id}`, "painel_facilitador", { p_curso: c.id, p_ativo: v }, v ? `Agora facilita ${c.titulo}` : `Deixou de facilitar ${c.titulo}`)} />
        ))}
        {!facilitar && pode && (
          <Button variant="outline" size="sm" onClick={() => setFacilitar(true)}>
            {f.cursos.some((c) => c.facilita) ? "Marcar outro curso" : "Marcar curso que a pessoa facilita"}
          </Button>
        )}
        {!pode && !f.cursos.some((c) => c.facilita) && <p className="text-sm text-muted-foreground">Não facilita nenhum curso.</p>}
      </Bloco>
      <Bloco titulo="Cursos" ajuda="Ao ligar, a pessoa entra na primeira turma do curso. Se houver mais de uma, troque logo abaixo.">
        {f.cursos.length > 6 && (
          <Input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Procurar curso" className="h-11 mb-1" aria-label="Procurar curso" />
        )}
        {cursos.map((c) => (
          <div key={c.id} className={`rounded-2xl ${c.matricula ? "bg-[#effaf8]" : "bg-muted/40"}`}>
            <LinhaLiga titulo={c.titulo}
              ajuda={c.matricula ? (c.matricula.status === "pending" ? "Inscrição esperando aprovação" : c.matricula.status === "rejected" ? "Inscrição recusada" : "Matriculado") : c.turmas.length ? undefined : "Curso sem turma ainda"}
              ligado={!!c.matricula && c.matricula.status !== "rejected"} desabilitado={!pode || (!c.matricula && c.turmas.length === 0)}
              carregando={ocupado === `cu-${c.id}`}
              aoMudar={(v) => executar(`cu-${c.id}`, "painel_matricula", { p_curso: c.id, p_turma: null, p_ativo: v }, v ? `Matriculado em ${c.titulo}` : `Saiu de ${c.titulo}`)} />
            {c.matricula && c.turmas.length > 1 && (
              <div className="px-3 pb-3 -mt-1">
                <Select value={c.matricula.turma} disabled={!pode}
                  onValueChange={(t) => executar(`cu-${c.id}`, "painel_matricula", { p_curso: c.id, p_turma: t, p_ativo: true }, "Turma trocada")}>
                  <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Turma" /></SelectTrigger>
                  <SelectContent>{c.turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
        ))}
        {cursos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum curso com esse nome.</p>}
      </Bloco>
    </Coluna>
  );
}

function ColunaGovernanca({ dados, semLogin, ocupado, executar }: PropsColuna) {
  const g = dados.governanca;
  const pode = dados.direitos.governanca;
  return (
    <Coluna sistema="governanca" pode={pode} semLogin={semLogin} subtitulo="Gestão, secretarias e ações">
      <Bloco titulo="Papel" icone={ShieldCheck}>
        {PAPEIS.governanca.map((r) => (
          <LinhaLiga key={r.id} titulo={r.nome} ajuda={r.ajuda} ligado={g.papeis.includes(r.id)} desabilitado={!pode || semLogin}
            carregando={ocupado === `go-${r.id}`}
            aoMudar={(v) => executar(`go-${r.id}`, "painel_papel", { p_sistema: "governanca", p_papel: r.id, p_ativo: v }, v ? `${r.nome}: liberado` : `${r.nome}: retirado`)} />
        ))}
        {semLogin && <p className="text-sm text-muted-foreground">Os papéis da Governança dependem do login. Funções, secretarias e rifas já podem ser definidas.</p>}
      </Bloco>

      <Funcoes dados={dados} pode={pode} ocupado={ocupado} executar={executar} />

      <Bloco titulo="Secretarias e equipes" icone={Building2}>
        {g.secretarias.map((s) => (
          <div key={s.id} className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${s.papel ? "bg-[#f1f6fd]" : "bg-muted/40"}`}>
            <span className="flex-1 min-w-0 font-semibold text-[15px] truncate">{s.nome}</span>
            {ocupado === `se-${s.id}` ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
              <Select value={s.papel ?? "nao"} disabled={!pode}
                onValueChange={(v) => executar(`se-${s.id}`, "painel_secretaria", { p_secretaria: s.id, p_papel: v === "nao" ? null : v }, "Secretaria atualizada")}>
                <SelectTrigger className="h-10 w-[150px] bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não participa</SelectItem>
                  <SelectItem value="participante">Participante</SelectItem>
                  <SelectItem value="coordenador">Coordenador</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
        {g.secretarias.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma secretaria ativa.</p>}
      </Bloco>

      <Bloco titulo="Rifas" icone={Ticket} ajuda="Quem vende registra a venda pelo celular. Quem cuida das rifas é quem tem o módulo Ações sociais.">
        {g.rifas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma rifa aberta agora.</p> : g.rifas.map((r) => (
          <LinhaLiga key={r.id} titulo={`Vende: ${r.titulo}`} ajuda={r.status === "rascunho" ? "Rifa ainda em rascunho" : undefined} ligado={r.vende}
            desabilitado={!pode} carregando={ocupado === `ri-${r.id}`}
            aoMudar={(v) => executar(`ri-${r.id}`, "painel_rifa", { p_rifa: r.id, p_vende: v }, v ? "Agora vende esta rifa" : "Deixou de vender esta rifa")} />
        ))}
      </Bloco>

      <Bloco titulo="Módulos que a pessoa abre" ajuda="Vêm das funções. Para mudar, dê ou encerre uma função acima.">
        {dados.governanca.papeis.includes("admin") ? <p className="text-[15px]">Todos, porque é administrador geral.</p> : g.modulos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum módulo além do básico.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">{g.modulos.map((m) => <span key={m} className="px-3 py-1 rounded-full text-[13px] font-medium bg-[#e3eefb] text-[#003c7f]">{MODULOS[m] ?? m}</span>)}</div>
        )}
      </Bloco>
    </Coluna>
  );
}

function Funcoes({ dados, pode, ocupado, executar }: { dados: Acessos; pode: boolean; ocupado: string | null; executar: PropsColuna["executar"] }) {
  const g = dados.governanca;
  const [abrir, setAbrir] = useState(false);
  const [funcao, setFuncao] = useState("");
  const [onde, setOnde] = useState<"casa" | "secretaria" | "projeto">("casa");
  const [local, setLocal] = useState("");
  const opcoesLocal = onde === "secretaria" ? g.secretarias.map((s) => ({ id: s.id, nome: s.nome })) : g.opcoes_projetos;
  const dar = async () => {
    if (!funcao) { toast.error("Escolha a função."); return; }
    if (onde !== "casa" && !local) { toast.error(onde === "secretaria" ? "Escolha a secretaria." : "Escolha o projeto."); return; }
    await executar("fu-nova", "painel_funcao_dar", { p_funcao: funcao, p_contexto: onde, p_contexto_id: onde === "casa" ? null : local }, "Função dada");
    setAbrir(false); setFuncao(""); setOnde("casa"); setLocal("");
  };
  return (
    <Bloco titulo="Funções" icone={Briefcase} ajuda="A função libera módulos e, quando configurado, papéis no Atendimento e na Formação.">
      {g.funcoes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma função no momento.</p>}
      {g.funcoes.map((f) => (
        <div key={f.id} className="flex items-center gap-2 rounded-2xl bg-[#f1f6fd] px-3 py-2.5">
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-[15px] leading-snug">{f.funcao}</span>
            <span className="block text-[13px] text-muted-foreground">{f.contexto_nome ?? "Casa"}</span>
          </span>
          {pode && (
            <Button variant="ghost" size="sm" disabled={ocupado === `fu-${f.id}`} onClick={() => executar(`fu-${f.id}`, "painel_funcao_encerrar", { p_atribuicao: f.id }, "Função encerrada")}>
              {ocupado === `fu-${f.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-1" /> Encerrar</>}
            </Button>
          )}
        </div>
      ))}
      {pode && !abrir && <Button variant="outline" size="sm" className="mt-1" onClick={() => setAbrir(true)}><Plus className="w-4 h-4 mr-1" /> Dar uma função</Button>}
      {pode && abrir && (
        <div className="rounded-2xl border border-border/70 p-3 space-y-2">
          <Select value={funcao} onValueChange={setFuncao}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Qual função?" /></SelectTrigger>
            <SelectContent>{g.opcoes_funcoes.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
          </Select>
          <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
            {(["casa", "secretaria", "projeto"] as const).map((o) => (
              <button key={o} type="button" onClick={() => { setOnde(o); setLocal(""); }}
                className={`h-9 rounded-full text-[13px] font-semibold ${onde === o ? "bg-white shadow-sm text-[#0059b1]" : "text-muted-foreground"}`}>
                {o === "casa" ? "Na Casa" : o === "secretaria" ? "Secretaria" : "Projeto"}
              </button>
            ))}
          </div>
          {onde !== "casa" && (
            <Select value={local} onValueChange={setLocal}>
              <SelectTrigger className="h-11"><SelectValue placeholder={onde === "secretaria" ? "Qual secretaria?" : "Qual projeto?"} /></SelectTrigger>
              <SelectContent>{opcoesLocal.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={dar} disabled={ocupado === "fu-nova"}>{ocupado === "fu-nova" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dar função"}</Button>
            <Button variant="ghost" onClick={() => setAbrir(false)}>Cancelar</Button>
          </div>
        </div>
      )}
    </Bloco>
  );
}

/* ------------------------------------------------------------------------------------------------ Histórico */

function Historico({ dados }: { dados: Acessos }) {
  const [aberto, setAberto] = useState(false);
  const texto = (h: Acessos["historico"][number]) => {
    const d = h.detalhe;
    const alvo = d.papel ? nomePapel(h.sistema, d.papel) : d.curso ?? d.funcao ?? d.secretaria ?? d.rifa ?? "";
    const extra = h.acao === "secretaria" ? (d.papel ? ` como ${d.papel}` : " (saiu)") : "";
    return `${h.acao[0].toUpperCase()}${h.acao.slice(1)}${alvo && h.acao !== "secretaria" ? `: ${alvo}` : h.acao === "secretaria" ? `: ${d.secretaria}${extra}` : ""}`;
  };
  return (
    <section className="rounded-3xl bg-card border border-border/70 p-5">
      <button type="button" onClick={() => setAberto((v) => !v)} className="w-full flex items-center gap-2 text-left">
        <History className="w-5 h-5 text-muted-foreground" />
        <span className="flex-1 font-semibold">Últimas mudanças nos acessos</span>
        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${aberto ? "rotate-90" : ""}`} />
      </button>
      {aberto && (
        <ul className="mt-3 space-y-2">
          {dados.historico.map((h, i) => (
            <li key={i} className="flex flex-wrap gap-x-2 text-[14px]">
              <span className={`font-semibold ${COR[h.sistema].texto}`}>{NOME_SISTEMA[h.sistema]}</span>
              <span>{texto(h)}</span>
              <span className="text-muted-foreground">por {h.por}, {new Date(h.quando).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------ Peças */

function Avatar({ nome, foto, tamanho, texto = "text-base" }: { nome: string; foto: string | null; tamanho: string; texto?: string }) {
  return (
    <span className={`${tamanho} rounded-full bg-[#e3eefb] text-[#003c7f] font-bold flex items-center justify-center overflow-hidden shrink-0 ${texto}`}>
      {foto ? <img src={foto} alt="" className="w-full h-full object-cover" /> : nome ? iniciaisLsl(nome) : <UserRound className="w-1/2 h-1/2" />}
    </span>
  );
}

function Selo({ children, tom }: { children: ReactNode; tom?: "aviso" | "verde" | "azul" }) {
  const c = tom === "aviso" ? "bg-amber-100 text-amber-900" : tom === "verde" ? "bg-emerald-50 text-emerald-800" : tom === "azul" ? "bg-[#e3eefb] text-[#003c7f]" : "bg-muted text-foreground";
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${c}`}>{children}</span>;
}
