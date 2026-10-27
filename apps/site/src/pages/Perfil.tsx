import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, type ModulePermission } from "@/hooks/usePermissions";
import MinhasAcoes from "@/components/acoes/MinhasAcoes";
import { STATUS_COR, STATUS_ROTULO, atrasada, dataAmigavel, type StatusTarefa } from "@/lib/secretarias";
import MeusVinculos, { useMeusVinculos } from "@/components/perfil/MeusVinculos";
import { useMinhaJornada } from "@/components/site/JornadaVoluntario";
import { ETAPA_COR, ETAPA_LABEL, ETAPAS_JORNADA, dataCurta, proximoPasso, semanaDoEstagio } from "@/lib/chamamento";
import { db } from "@/lib/acoes";
import { MolduraSimples, useAreasLsl, iniciaisLsl } from "@/compartilhado";
import fotoCasa from "@/assets/hero-bg.jpg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Camera, Mail, Phone, IdCard, CalendarDays, MapPin, ShieldCheck, Briefcase, KeyRound, Loader2, Pencil,
  GraduationCap, HeartPulse, Landmark, HeartHandshake, ChevronRight, BookOpen, CheckCircle2, Award, Users,
  Bed, MessagesSquare, Crown, Save, Eye, Footprints, Check, ArrowLeft, ListChecks, Sparkles, UserRound, Sun, Moon, Sunrise,
  ChevronDown,
  Ticket,
} from "lucide-react";

// Perfil único da plataforma: dados pessoais editáveis e o resumo de tudo o que a pessoa faz na Casa
// (Formação, Atendimento, Governança e Ações sociais), mostrando só o que vale para o papel dela.

const PERMISSION_LABELS: Record<ModulePermission, { label: string; description: string }> = {
  modulo_macas: { label: "Macas", description: "Sistema de atendimentos espirituais" },
  modulo_passes: { label: "Passes", description: "Aplicação e registro de passes" },
  modulo_dialogo: { label: "Diálogo Fraterno", description: "Atendimentos de diálogo" },
  modulo_recepcao: { label: "Recepção", description: "Acolhimento e frequentadores" },
  modulo_formacao: { label: "Formação", description: "Cursos e formação espiritual" },
  modulo_secretaria: { label: "Secretarias", description: "Gestão de secretarias" },
  modulo_projetos: { label: "Projetos", description: "Projetos sociais" },
  modulo_saude: { label: "Saúde", description: "Atendimentos de saúde das ações (dados sensíveis)" },
  modulo_gestao: { label: "Gestão", description: "Visão gerencial da Casa" },
  modulo_financeiro: { label: "Financeiro", description: "Receitas, despesas e contribuições" },
  modulo_admin: { label: "Administração", description: "Usuários, permissões e LGPD" },
};

const ROLE_META: Record<string, { label: string; tone: string }> = {
  trabalhador: { label: "Voluntário", tone: "bg-primary/10 text-primary border-primary/20" },
  assistido: { label: "Assistido", tone: "bg-sky-100 text-sky-800 border-sky-300" },
  beneficiario_social: { label: "Beneficiário social", tone: "bg-amber-100 text-amber-800 border-amber-300" },
  doador: { label: "Doador", tone: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  associado: { label: "Associado", tone: "bg-amber-100 text-amber-800 border-amber-300" },
  frequentador: { label: "Frequentador", tone: "bg-muted text-foreground border-border" },
};

const PAPEIS_ATENDIMENTO: Record<string, string> = { admin: "Administrador", dialogador: "Dialogador", recepcao: "Acolhimento", medium: "Médium" };
const DIAS: Record<string, string> = { segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta", sabado: "Sábado", domingo: "Domingo" };

type Endereco = { street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string; zip?: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Linha = any;

type CursoResumo = { id: string; titulo: string; capa: string | null; status: string; inicio: string | null; fim: string | null; horario: string | null; aulas: number; concluidas: number };
type Resumo = {
  formacao: { cursos: CursoResumo[]; presencas: number; avaliacoes_aprovadas: number; admin: boolean };
  atendimento: null | { papeis: string[]; macas: { nome: string; numero: number; dia: string | null; cor: string | null }[]; dialogos: number; dialogos_mes: number; acompanhamentos_ativos: number };
};

const dataBR = (d?: string | null, longa = false) =>
  d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR", longa ? { day: "2-digit", month: "long", year: "numeric" } : undefined) : "";

const formVazio = { full_name: "", phone: "", birth_date: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", zip: "" };

export default function Perfil() {
  const { user, loading: authLoading, simulacao, signOut } = useAuth();
  const { isAdmin, isGestor, permissions, isLoading: permsLoading } = usePermissions();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const aba = params.get("aba") || "geral";
  const irPara = (v: string) => setParams({ aba: v }, { replace: true });
  const areas = useAreasLsl(supabase, user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?voltar=/app/perfil");
  }, [user, authLoading, navigate]);

  // Governança: cadastro, papéis, funções, associação e contribuições
  const { data: gov, isLoading: govLoading } = useQuery({
    queryKey: ["perfil-governanca", user?.id, simulacao?.personId],
    enabled: !!user,
    queryFn: async () => {
      const { data: peopleRows } = simulacao?.personId
        ? await supabase.from("people").select("*").eq("id", simulacao.personId).limit(1)
        : await supabase.from("people").select("*").eq("user_id", user!.id).limit(1);
      const person: Linha = peopleRows?.[0] ?? null;
      if (!person) return { person: null, roles: [], funcoes: [], associacao: null, contribuicoes: [] };
      const [{ data: roles }, { data: funcoes }, { data: associacao }, { data: contribuicoes }] = await Promise.all([
        supabase.from("person_roles").select("*").eq("person_id", person.id).is("ended_at", null),
        supabase.from("worker_assignments").select("id, context_type, started_at, functions(id, name, description, category)").eq("person_id", person.id).is("ended_at", null),
        supabase.from("associate_memberships").select("*").eq("person_id", person.id).order("admission_date", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("contributions").select("id, amount, reference_month, paid_at").eq("person_id", person.id).order("paid_at", { ascending: false }).limit(3),
      ]);
      return { person, roles: (roles ?? []) as Linha[], funcoes: (funcoes ?? []) as Linha[], associacao: associacao as Linha, contribuicoes: (contribuicoes ?? []) as Linha[] };
    },
  });

  // Formação e Atendimento (resumo seguro calculado no banco)
  const { data: resumo } = useQuery({
    queryKey: ["perfil-resumo", user?.id, simulacao?.userId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.schema("public" as never).rpc("meu_resumo" as never, (simulacao?.userId ? { p_user: simulacao.userId } : {}) as never);
      if (error) throw error;
      return data as unknown as Resumo;
    },
  });

  const person = gov?.person;
  const { data: jornada } = useMinhaJornada(!simulacao?.personId);
  // Estagiários que a pessoa acompanha como tutora no Chamamento
  const { data: estagiarios = [] } = useQuery({
    queryKey: ["perfil-estagiarios", person?.id],
    enabled: !!person?.id,
    queryFn: async () => {
      const { data } = await db.from("volunteer_candidates").select("id, etapa, estagio_inicio, person_id").eq("tutor_id", person!.id).in("etapa", ["estagio", "avaliacao", "integracao", "pausado"]);
      const lista = (data ?? []) as { id: string; etapa: keyof typeof ETAPA_LABEL; estagio_inicio: string | null; person_id: string }[];
      if (!lista.length) return [];
      const { data: nomes } = await db.rpc("pessoas_basico", { p_ids: lista.map((x) => x.person_id) });
      const mapa = Object.fromEntries(((nomes ?? []) as { id: string; full_name: string }[]).map((n) => [n.id, n.full_name]));
      return lista.map((x) => ({ ...x, nome: mapa[x.person_id] ?? "Estagiário" }));
    },
  });
  const temJornada = !!jornada || estagiarios.length > 0;
  useEffect(() => {
    if (!person) return;
    const a: Endereco = (person.address && typeof person.address === "object" ? person.address : {}) as Endereco;
    setForm({
      full_name: person.full_name ?? "", phone: person.phone ?? "", birth_date: person.birth_date ?? "",
      street: a.street ?? "", number: a.number ?? "", complement: a.complement ?? "", neighborhood: a.neighborhood ?? "",
      city: a.city ?? "", state: a.state ?? "", zip: a.zip ?? "",
    });
  }, [person]);

  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["perfil-governanca"] });
    try { sessionStorage.removeItem("lsl:areas"); } catch { /* sem armazenamento */ }
  };

  const handleAvatar = async (file: File) => {
    if (!user || !person) {
      toast.error("Seu cadastro ainda não está vinculado. Fale com a secretaria.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);
      const { error } = await supabase.from("people").update({ photo_url: pub.publicUrl }).eq("id", person.id);
      if (error) throw error;
      await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", user.id);
      toast.success("Foto atualizada");
      recarregar();
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível enviar a foto");
    } finally {
      setUploading(false);
    }
  };

  const salvar = async () => {
    if (!person) return;
    if (!form.full_name.trim()) { toast.error("Informe o seu nome"); return; }
    setSalvando(true);
    const endereco: Endereco = {
      street: form.street.trim(), number: form.number.trim(), complement: form.complement.trim(), neighborhood: form.neighborhood.trim(),
      city: form.city.trim(), state: form.state.trim().toUpperCase(), zip: form.zip.trim(),
    };
    const temEndereco = Object.values(endereco).some(Boolean);
    const { error } = await supabase.from("people").update({
      full_name: form.full_name.trim(), phone: form.phone.trim() || null, birth_date: form.birth_date || null,
      address: (temEndereco ? endereco : null) as never,
    }).eq("id", person.id);
    setSalvando(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Dados atualizados em todas as áreas");
    recarregar();
  };

  const navegar = (href: string) => {
    if (href.startsWith("/formacao") || href.startsWith("/atendimento")) return false;
    navigate(href);
    return true;
  };

  const { data: vinculos } = useMeusVinculos(simulacao?.personId);
  const carregando = authLoading || govLoading || permsLoading;
  const nome = person?.full_name || areas?.nome || user?.email?.split("@")[0] || "";
  const foto = person?.photo_url || areas?.foto;
  const roles = gov?.roles ?? [];
  const funcoes = gov?.funcoes ?? [];
  const associacao = gov?.associacao;
  const formacao = resumo?.formacao;
  const atendimento = resumo?.atendimento;
  const cursosAtivos = (formacao?.cursos ?? []).filter((c) => c.status === "approved");
  const perms = isAdmin ? (Object.keys(PERMISSION_LABELS) as ModulePermission[]) : Array.from(permissions);
  const secretariasV = vinculos?.secretarias ?? [];
  const projetosV = vinculos?.projetos ?? [];
  const temVinculos = secretariasV.length > 0 || projetosV.length > 0;
  const temGovernanca = isAdmin || isGestor || perms.length > 0 || funcoes.length > 0 || !!associacao || temVinculos;
  const resumoVinculos = [
    ...secretariasV.map((s) => (s.papel === "coordenador" ? `Coordena ${s.nome}` : s.nome)),
    ...projetosV.map((p) => (p.coordena ? `Coordena ${p.nome}` : p.nome)),
  ].join(" · ");
  const endereco = (person?.address && typeof person.address === "object" ? person.address : null) as Endereco | null;
  const papelPrincipal = isAdmin ? "Administrador" : isGestor ? "Gestor" : funcoes.length ? "Voluntário" : roles[0] ? ROLE_META[roles[0].role]?.label ?? "Frequentador" : "Frequentador";
  const nomesFuncoes = funcoes.map((f) => f.functions?.name).filter(Boolean).join(" · ");

  // Selos do hero: um por papel, com a cor da área (Governança azul, Formação verde, Atendimento roxo)
  type PapelHero = { chave: string; texto: string; icone: ComponentType<{ className?: string }>; cor: string };
  const papeisHero: PapelHero[] = [
    ...(isAdmin ? [{ chave: "g-admin", texto: "Administrador geral", icone: ShieldCheck, cor: "text-[#0059b1]" }] : isGestor ? [{ chave: "g-gestor", texto: "Gestor", icone: ShieldCheck, cor: "text-[#0059b1]" }] : []),
    ...secretariasV.filter((x) => x.papel === "coordenador").map((x) => ({ chave: `s-${x.id}`, texto: `Coordena ${x.nome}`, icone: Crown, cor: "text-[#b8860b]" })),
    ...projetosV.filter((x) => x.coordena).map((x) => ({ chave: `p-${x.id}`, texto: `Coordena ${x.nome}`, icone: Crown, cor: "text-[#b8860b]" })),
    ...funcoes.filter((f) => f.functions?.name).map((f) => ({ chave: `f-${f.id}`, texto: f.functions.name as string, icone: Briefcase, cor: "text-[#0059b1]" })),
    ...(atendimento?.papeis ?? []).map((x) => ({ chave: `a-${x}`, texto: x === "admin" ? "Admin do Atendimento" : PAPEIS_ATENDIMENTO[x] ?? x, icone: HeartPulse, cor: "text-[#6d28d9]" })),
    ...(formacao?.admin ? [{ chave: "fo-admin", texto: "Admin dos cursos", icone: GraduationCap, cor: "text-[#176e69]" }] : []),
    ...((areas as { formacao_facilitador?: boolean } | null)?.formacao_facilitador ? [{ chave: "fo-fac", texto: "Facilitador", icone: GraduationCap, cor: "text-[#176e69]" }] : []),
    ...(cursosAtivos.length && !formacao?.admin ? [{ chave: "fo-aluno", texto: cursosAtivos.length === 1 ? "Aluno de 1 curso" : `Aluno de ${cursosAtivos.length} cursos`, icone: GraduationCap, cor: "text-[#176e69]" }] : []),
    ...(associacao?.status === "ativo" ? [{ chave: "assoc", texto: "Associado", icone: Award, cor: "text-[#b8860b]" }] : []),
  ];
  if (!papeisHero.some((x) => x.chave.startsWith("f-") || x.chave.startsWith("g-")) && roles.some((r: Linha) => r.role === "trabalhador"))
    papeisHero.unshift({ chave: "vol", texto: "Voluntário", icone: Sparkles, cor: "text-[#0059b1]" });

  // Tarefas e escalas da pessoa (mesmas consultas usadas nos outros blocos)
  const { data: minhasTarefas = [] } = useQuery({
    queryKey: ["minhas-tarefas"],
    enabled: !!user && !simulacao?.personId,
    queryFn: async () => ((await db.rpc("minhas_tarefas")).data ?? []) as { id: string; title: string; status: StatusTarefa; due_date: string | null; secretaria_id: string; secretaria: string }[],
  });
  const { data: minhasAcoes } = useQuery({
    queryKey: ["minhas-acoes"],
    enabled: !!user && !simulacao?.personId,
    queryFn: async () => ((await db.rpc("minhas_acoes")).data ?? null) as { escalas: { id: string; data: string; hora: string | null; projeto: string; confirmed: boolean; task: string | null }[] } | null,
  });
  const [verAcessos, setVerAcessos] = useState(false);
  const hojeIso = new Date().toISOString().slice(0, 10);
  const proximasEscalas = (minhasAcoes?.escalas ?? []).filter((e) => e.data >= hojeIso);
  const primeiroNome = (nome || "").split(" ")[0];
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const IconeSaudacao = hora < 12 ? Sunrise : hora < 18 ? Sun : Moon;

  // Áreas de voluntário (tarefas, onde ajudo, escalas, atendimento) só para voluntário ou administrador geral
  const veSistemas = !!(areas?.voluntario || areas?.admin);
  // Atalhos coloridos da tela inicial do perfil (só aparecem os que fazem sentido para a pessoa)
  const atalhos: Atalho[] = [
    { id: "formacao", titulo: "Meus cursos", icone: GraduationCap, cor: "verde",
      info: cursosAtivos.length ? `${cursosAtivos.length} em andamento` : "Conheça os cursos", mostrar: true },
    { id: "tarefas", titulo: "Minhas tarefas", icone: ListChecks, cor: "azul",
      info: minhasTarefas.length ? `${minhasTarefas.length} para fazer` : "Nada pendente", contador: minhasTarefas.length, mostrar: veSistemas && (secretariasV.length > 0 || minhasTarefas.length > 0) },
    { id: "casa", titulo: "Onde eu ajudo", icone: HeartHandshake, cor: "dourado",
      info: temVinculos ? [...secretariasV.map((s) => s.nome), ...projetosV.map((x) => x.nome)].slice(0, 2).join(", ") : funcoes.length ? nomesFuncoes : "Secretarias e projetos", mostrar: veSistemas && temGovernanca },
    { id: "acoes", titulo: "Minhas escalas", icone: CalendarDays, cor: "laranja",
      info: proximasEscalas.length ? `Próxima: ${dataAmigavel(proximasEscalas[0].data)}` : "Ações sociais", contador: proximasEscalas.filter((e) => !e.confirmed).length, mostrar: veSistemas },
    { id: "atendimento", titulo: "Atendimento", icone: HeartPulse, cor: "roxo",
      info: atendimento ? atendimento.papeis.map((x) => PAPEIS_ATENDIMENTO[x] ?? x).join(" e ") : "", mostrar: veSistemas && !!atendimento },
    { id: "jornada", titulo: "Ser voluntário", icone: Footprints, cor: "rosa",
      info: jornada ? ETAPA_LABEL[jornada.etapa] : estagiarios.length ? `${estagiarios.length} estagiário(s)` : "", mostrar: temJornada },
    { id: "dados", titulo: "Meus dados", icone: UserRound, cor: "cinza", info: "Nome, telefone e endereço", mostrar: true },
  ];

  // "Para você agora": o que pede atenção, em linguagem simples
  const avisos: { chave: string; icone: ComponentType<{ className?: string }>; cor: CorAtalho; texto: string; acao: () => void }[] = [];
  proximasEscalas.filter((e) => !e.confirmed).slice(0, 2).forEach((e) =>
    avisos.push({ chave: `e${e.id}`, icone: CalendarDays, cor: "laranja", texto: `Confirme sua escala em ${e.projeto} (${dataAmigavel(e.data)})`, acao: () => irPara("acoes") }));
  minhasTarefas.filter((x) => atrasada(x)).slice(0, 2).forEach((x) =>
    avisos.push({ chave: `t${x.id}`, icone: ListChecks, cor: "azul", texto: `Tarefa atrasada: ${x.title}`, acao: () => navigate(`/app/secretarias/${x.secretaria_id}/tarefas?tarefa=${x.id}`) }));
  if (jornada && !["desligado", "colaborador", "voluntario"].includes(jornada.etapa))
    avisos.push({ chave: "jornada", icone: Footprints, cor: "rosa", texto: proximoPasso(jornada), acao: () => irPara("jornada") });
  cursosAtivos.filter((c) => c.aulas > 0 && c.concluidas < c.aulas).slice(0, 1).forEach((c) =>
    avisos.push({ chave: `c${c.id}`, icone: BookOpen, cor: "verde", texto: `Continue o curso ${c.titulo}: ${c.concluidas} de ${c.aulas} aulas`, acao: () => window.location.assign(`/formacao/course/${c.id}`) }));
  if ((areas as { rifas?: { vende?: boolean } } | null)?.rifas?.vende)
    avisos.push({ chave: "rifa", icone: Ticket, cor: "dourado", texto: "Você é vendedor de uma rifa aberta. Toque para registrar vendas.", acao: () => navigate("/app/rifas/vender") });

  const tituloSecao: Record<string, string> = {
    formacao: "Meus cursos", tarefas: "Minhas tarefas", casa: "Onde eu ajudo", acoes: "Minhas escalas",
    atendimento: "Atendimento", jornada: "Ser voluntário", dados: "Meus dados",
  };

  return (
    <MolduraSimples sistema="perfil" areas={areas} usuario={{ nome, foto }} navegar={navegar} aoSair={async () => { await signOut(); navigate("/login"); }}>
      {carregando ? (
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {simulacao?.personId && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Você está vendo o perfil de outra pessoa. As alterações ficam bloqueadas.
            </div>
          )}

          {aba === "geral" ? (
            <>
              {/* Hero: foto da casa em gradiente, a pessoa e os papéis dela em cada área */}
              <section className="relative overflow-hidden rounded-3xl text-white min-h-[300px] sm:min-h-[320px] flex flex-col justify-end">
                <img src={fotoCasa} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0" aria-hidden="true"
                  style={{ background: "linear-gradient(180deg, rgba(0,60,127,0.25) 0%, rgba(0,48,104,0.72) 48%, rgba(0,36,82,0.96) 100%)" }} />
                <div className="absolute -right-12 -top-14 w-32 h-32 sm:w-44 sm:h-44 rounded-full" style={{ background: "#ffc116" }} aria-hidden="true" />

                <div className="relative p-5 sm:p-8 pt-24 sm:pt-28">
                  <div className="flex items-end gap-4 sm:gap-5">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
                      <div className={`w-full h-full rounded-full ring-4 ${foto ? "ring-white/80" : "ring-[#ffc116] ring-offset-2 ring-offset-transparent"} bg-[hsl(var(--accent))] text-[hsl(var(--primary-dark))] flex items-center justify-center text-3xl font-bold overflow-hidden`}>
                        {foto ? <img src={foto} alt={`Foto de ${primeiroNome}`} className="w-full h-full object-cover" /> : iniciaisLsl(nome)}
                      </div>
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || !person}
                        className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-white text-primary flex items-center justify-center disabled:opacity-60" aria-label={foto ? "Trocar foto" : "Adicionar foto"}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-5 h-5" />}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatar(f); e.target.value = ""; }} />
                    </div>
                    <div className="min-w-0 pb-1">
                      <div className="text-sm text-white/85 inline-flex items-center gap-1.5"><IconeSaudacao className="w-4 h-4" /> {saudacao},</div>
                      <h1 className="text-3xl sm:text-[42px] font-bold font-['Playfair_Display'] leading-tight truncate">{primeiroNome}!</h1>
                      <p className="text-[15px] text-white/85 mt-0.5">Que bom ter você no Lar de Seu Luiz.</p>
                    </div>
                  </div>

                  {!foto && person && !simulacao?.personId && (
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="mt-5 w-full sm:w-auto inline-flex items-center gap-3 rounded-2xl bg-white/15 backdrop-blur border border-white/25 px-4 py-3 text-left hover:bg-white/20 transition-colors">
                      <span className="w-10 h-10 rounded-full bg-[#ffc116] text-[#0f1f3d] flex items-center justify-center shrink-0"><Camera className="w-5 h-5" /></span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-[15px]">Coloque uma foto sua</span>
                        <span className="block text-[13px] text-white/80">Assim a equipe te reconhece nas escalas, nos cursos e no atendimento.</span>
                      </span>
                    </button>
                  )}

                  {papeisHero.length > 0 && (
                    <div className="mt-5 space-y-2">
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-white/70">Seus papéis na Casa</div>
                      <div className="flex flex-wrap gap-2">
                        {papeisHero.map((x) => (
                          <span key={x.chave} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-[#0f1f3d]">
                            <x.icone className={`w-4 h-4 ${x.cor}`} /> {x.texto}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Para você agora */}
              {avisos.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-lg font-bold font-['Playfair_Display'] px-1">Para você agora</h2>
                  <div className="space-y-2">
                    {avisos.map((a) => {
                      const Icone = a.icone;
                      return (
                        <button key={a.chave} type="button" onClick={a.acao}
                          className="w-full flex items-center gap-3 rounded-2xl bg-card border p-4 text-left hover:shadow-sm active:scale-[0.99] transition">
                          <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${CORES[a.cor].fundo} ${CORES[a.cor].texto}`}><Icone className="w-5 h-5" /></span>
                          <span className="flex-1 text-[15px] leading-snug">{a.texto}</span>
                          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Atalhos */}
              <section className="space-y-2">
                <h2 className="text-lg font-bold font-['Playfair_Display'] px-1">O que você quer ver?</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {atalhos.filter((a) => a.mostrar).map((a) => {
                    const Icone = a.icone;
                    return (
                      <button key={a.id} type="button" onClick={() => irPara(a.id)}
                        className={`relative rounded-3xl p-4 sm:p-5 text-left border-2 ${CORES[a.cor].cartao} hover:shadow-md active:scale-[0.98] transition min-h-[132px] flex flex-col`}>
                        {!!a.contador && <span className="absolute top-3 right-3 min-w-[24px] h-6 px-2 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">{a.contador}</span>}
                        <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${CORES[a.cor].icone} text-white shadow-sm`}><Icone className="w-6 h-6" /></span>
                        <span className="mt-auto pt-3">
                          <span className="block font-semibold text-[16px] text-foreground leading-tight">{a.titulo}</span>
                          <span className="block text-xs text-muted-foreground mt-1 line-clamp-2">{a.info}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <>
              {/* Cabeçalho das seções: simples, com voltar */}
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => irPara("geral")} aria-label="Voltar"
                  className="w-11 h-11 rounded-full bg-card border flex items-center justify-center hover:bg-muted shrink-0"><ArrowLeft className="w-5 h-5" /></button>
                <h1 className="text-2xl font-bold font-['Playfair_Display']">{tituloSecao[aba] ?? "Meu perfil"}</h1>
              </div>

              {aba === "dados" && (
                !person ? (
                  <Vazio icone={UserRound} cor="cinza" titulo="Cadastro ainda não vinculado" texto="Fale com a secretaria da Casa para ligar o seu cadastro a esta conta." />
                ) : (
                  <div className="space-y-4">
                    <Bloco>
                      <p className="text-sm text-muted-foreground">O que você mudar aqui vale para tudo: site, cursos e atendimento.</p>
                      <Campo rotulo="Nome completo"><Input className="h-12 text-base" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} /></Campo>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Campo rotulo="WhatsApp"><Input className="h-12 text-base" inputMode="tel" placeholder="(84) 99999-9999" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Campo>
                        <Campo rotulo="Data de nascimento"><Input className="h-12 text-base" type="date" value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} /></Campo>
                      </div>
                    </Bloco>
                    <Bloco titulo="Endereço">
                      <div className="grid grid-cols-[2fr_1fr] gap-3">
                        <Campo rotulo="Rua"><Input className="h-12 text-base" value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} /></Campo>
                        <Campo rotulo="Número"><Input className="h-12 text-base" value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} /></Campo>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Campo rotulo="Complemento"><Input className="h-12 text-base" value={form.complement} onChange={(e) => setForm((f) => ({ ...f, complement: e.target.value }))} /></Campo>
                        <Campo rotulo="Bairro"><Input className="h-12 text-base" value={form.neighborhood} onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))} /></Campo>
                      </div>
                      <div className="grid grid-cols-[2fr_72px] sm:grid-cols-[2fr_72px_1fr] gap-3">
                        <Campo rotulo="Cidade"><Input className="h-12 text-base" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></Campo>
                        <Campo rotulo="UF"><Input className="h-12 text-base" maxLength={2} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} /></Campo>
                        <div className="col-span-2 sm:col-span-1"><Campo rotulo="CEP"><Input className="h-12 text-base" inputMode="numeric" value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} /></Campo></div>
                      </div>
                    </Bloco>
                    <Button className="h-12 w-full text-base rounded-2xl" onClick={salvar} disabled={salvando}>
                      {salvando ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />} Salvar meus dados
                    </Button>
                    <Bloco titulo="Da sua conta">
                      <p className="text-xs text-muted-foreground -mt-1">Para mudar estes, fale com a secretaria.</p>
                      <InfoLinha icone={Mail} rotulo="E-mail de acesso" valor={user?.email} />
                      <InfoLinha icone={IdCard} rotulo="CPF" valor={person.cpf ? String(person.cpf).replace(/^(\d{3})\d{6}(\d{2})$/, "$1.***.***-$2") : null} />
                      <InfoLinha icone={CalendarDays} rotulo="Na Casa desde" valor={dataBR(person.created_at, true)} />
                      <Link to="/privacidade" className="inline-flex items-center gap-2 text-sm text-primary"><ShieldCheck className="w-4 h-4" /> Como cuidamos dos seus dados</Link>
                    </Bloco>
                  </div>
                )
              )}

              {aba === "formacao" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Numero cor="verde" valor={cursosAtivos.length} rotulo="Cursos" />
                    <Numero cor="azul" valor={formacao?.presencas ?? 0} rotulo="Presenças" />
                    <Numero cor="dourado" valor={formacao?.avaliacoes_aprovadas ?? 0} rotulo="Avaliações" />
                  </div>
                  {(formacao?.cursos ?? []).length === 0 ? (
                    <Vazio icone={GraduationCap} cor="verde" titulo="Você ainda não está em nenhum curso" texto="Que tal começar? Os cursos da Casa são gratuitos."
                      acao={<Button className="h-11 rounded-xl" asChild><a href="/formacao/explore">Ver cursos</a></Button>} />
                  ) : (
                    <div className="space-y-3">
                      {formacao!.cursos.map((c) => {
                        const pct = c.aulas ? Math.round((c.concluidas / c.aulas) * 100) : 0;
                        return (
                          <a key={c.id} href={`/formacao/course/${c.id}`} className="flex items-center gap-4 rounded-2xl bg-card border p-4 hover:shadow-sm">
                            {c.capa ? <img src={c.capa} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" /> : (
                              <span className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${CORES.verde.fundo} ${CORES.verde.texto}`}><GraduationCap className="w-7 h-7" /></span>
                            )}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="font-semibold leading-snug">{c.titulo}</div>
                              {c.status === "approved" && c.aulas > 0 ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-2.5 flex-1 rounded-full bg-emerald-100 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">{c.concluidas}/{c.aulas}</span>
                                </div>
                              ) : <SituacaoInscricao status={c.status} />}
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                  <Button variant="outline" className="h-12 w-full rounded-2xl" asChild><a href="/formacao/dashboard">Abrir a área de cursos</a></Button>
                </div>
              )}

              {aba === "tarefas" && (
                minhasTarefas.length === 0 ? (
                  <Vazio icone={ListChecks} cor="azul" titulo="Nenhuma tarefa pendente" texto="Quando alguém colocar você numa tarefa da secretaria, ela aparece aqui."
                    acao={<Button variant="outline" className="h-11 rounded-xl" asChild><Link to="/app/secretarias">Ver minhas secretarias</Link></Button>} />
                ) : (
                  <div className="space-y-3">
                    {minhasTarefas.map((x) => (
                      <Link key={x.id} to={`/app/secretarias/${x.secretaria_id}/tarefas?tarefa=${x.id}`} className="flex items-center gap-3 rounded-2xl bg-card border p-4 hover:shadow-sm">
                        <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${CORES.azul.fundo} ${CORES.azul.texto}`}><ListChecks className="w-5 h-5" /></span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium leading-snug">{x.title}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                            <span>{x.secretaria}</span>
                            <span className={`rounded-full border px-2 py-0.5 ${STATUS_COR[x.status]}`}>{STATUS_ROTULO[x.status]}</span>
                            {x.due_date && <span className={atrasada(x) ? "text-red-600 font-medium" : ""}>{atrasada(x) ? "atrasada · " : "até "}{dataAmigavel(x.due_date)}</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                  </div>
                )
              )}

              {aba === "casa" && (
                <div className="space-y-4">
                  {vinculos && <MeusVinculos vinculos={vinculos} operaAcoes={isAdmin || isGestor || permissions.has("modulo_projetos")} />}
                  {funcoes.length > 0 && (
                    <Bloco titulo="Minhas funções">
                      <div className="space-y-2">
                        {funcoes.map((a) => (
                          <div key={a.id} className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                            <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${CORES.dourado.fundo} ${CORES.dourado.texto}`}><Briefcase className="w-5 h-5" /></span>
                            <div className="min-w-0">
                              <div className="font-medium">{a.functions?.name || "Função"}</div>
                              {a.functions?.description && <div className="text-xs text-muted-foreground">{a.functions.description}</div>}
                              <div className="text-xs text-muted-foreground mt-0.5">desde {dataBR(a.started_at, true)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Bloco>
                  )}
                  {associacao && (
                    <Bloco titulo="Associação">
                      <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Situação</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${associacao.status === "ativo" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{associacao.status}</span></div>
                      <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Desde</span><span>{dataBR(associacao.admission_date, true)}</span></div>
                      {(gov?.contribuicoes ?? []).slice(0, 2).map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Contribuição {c.reference_month}</span><span className="font-medium">{Number(c.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
                      ))}
                      <Button variant="outline" className="h-11 w-full rounded-xl" asChild><Link to="/meu-painel">Painel do associado</Link></Button>
                    </Bloco>
                  )}
                  {perms.length > 0 && (
                    <div className="rounded-2xl border bg-card">
                      <button type="button" onClick={() => setVerAcessos((v) => !v)} className="w-full flex items-center justify-between p-4 text-left">
                        <span className="inline-flex items-center gap-2 text-sm font-medium"><KeyRound className="w-4 h-4 text-muted-foreground" /> Acessos da minha conta</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${verAcessos ? "rotate-180" : ""}`} />
                      </button>
                      {verAcessos && (
                        <div className="px-4 pb-4 flex flex-wrap gap-2">
                          {perms.map((x) => PERMISSION_LABELS[x] && <span key={x} className="rounded-full bg-muted px-3 py-1 text-xs">{PERMISSION_LABELS[x].label}</span>)}
                        </div>
                      )}
                    </div>
                  )}
                  {areas?.governanca && <Button variant="outline" className="h-12 w-full rounded-2xl" asChild><Link to="/app"><Landmark className="w-4 h-4 mr-2" /> Abrir a Governança</Link></Button>}
                </div>
              )}

              {aba === "acoes" && (
                <div className="space-y-4">
                  <div className="grid gap-6"><MinhasAcoes simulandoOutraPessoa={!!simulacao?.personId} /></div>
                  <Button variant="outline" className="h-12 w-full rounded-2xl" asChild><Link to="/#acoes"><HeartHandshake className="w-4 h-4 mr-2" /> Conhecer as ações sociais</Link></Button>
                </div>
              )}

              {aba === "atendimento" && atendimento && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Numero cor="roxo" valor={atendimento.dialogos_mes} rotulo="Diálogos no mês" />
                    <Numero cor="azul" valor={atendimento.acompanhamentos_ativos} rotulo="Em tratamento" />
                    <Numero cor="verde" valor={atendimento.dialogos} rotulo="Diálogos no total" />
                  </div>
                  <Bloco titulo="O que eu faço">
                    <div className="flex flex-wrap gap-2">
                      {atendimento.papeis.map((x) => <span key={x} className={`rounded-full px-3 py-1.5 text-sm font-medium ${CORES.roxo.fundo} ${CORES.roxo.texto}`}>{PAPEIS_ATENDIMENTO[x] ?? x}</span>)}
                    </div>
                  </Bloco>
                  {atendimento.macas.length > 0 && (
                    <Bloco titulo="Minhas macas">
                      <div className="space-y-2">
                        {atendimento.macas.map((m) => (
                          <div key={m.numero} className="flex items-center gap-3">
                            <span className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: m.cor || "hsl(var(--primary))" }}>{m.numero}</span>
                            <div><div className="font-medium">{m.nome}</div>{m.dia && <div className="text-xs text-muted-foreground">{DIAS[m.dia] ?? m.dia}</div>}</div>
                          </div>
                        ))}
                      </div>
                    </Bloco>
                  )}
                  <Button className="h-12 w-full rounded-2xl" asChild><a href="/atendimento/">Abrir o Atendimento</a></Button>
                </div>
              )}

              {aba === "jornada" && (
                <div className="space-y-4">
                  {jornada && (
                    <Bloco>
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">{jornada.ciclo?.nome ?? "Sua jornada"}</div>
                        <Badge variant="outline" className={ETAPA_COR[jornada.etapa]}>{ETAPA_LABEL[jornada.etapa]}</Badge>
                      </div>
                      <ol className="space-y-3">
                        {ETAPAS_JORNADA.map((e, i) => {
                          const idx = ETAPAS_JORNADA.findIndex((x) => x.etapa === jornada.etapa);
                          const feito = idx >= 0 && (i < idx || jornada.etapa === "voluntario");
                          const atual = i === idx && jornada.etapa !== "voluntario";
                          return (
                            <li key={e.etapa} className="flex items-center gap-3">
                              <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${feito ? "bg-emerald-500 text-white" : atual ? "bg-pink-500 text-white ring-4 ring-pink-100" : "bg-muted text-muted-foreground"}`}>
                                {feito ? <Check className="w-4 h-4" /> : i + 1}
                              </span>
                              <span className={`text-[15px] ${atual ? "font-semibold" : feito ? "text-muted-foreground" : "text-muted-foreground"}`}>{e.rotulo}</span>
                            </li>
                          );
                        })}
                      </ol>
                      <p className="text-[15px] rounded-xl bg-pink-50 border border-pink-200 px-4 py-3">{proximoPasso(jornada)}</p>
                      {jornada.tutor && <p className="text-sm text-muted-foreground">Seu tutor: <span className="text-foreground font-medium">{jornada.tutor}</span></p>}
                      {jornada.ciclo?.curso_id && ["curso", "estagio"].includes(jornada.etapa) && (
                        <Button variant="outline" className="h-11 w-full rounded-xl" asChild><a href={`/formacao/course/${jornada.ciclo.curso_id}`}>Abrir o curso</a></Button>
                      )}
                    </Bloco>
                  )}
                  {estagiarios.length > 0 && (
                    <Bloco titulo="Estagiários que acompanho">
                      <div className="space-y-2">
                        {estagiarios.map((x) => (
                          <Link key={x.id} to={`/app/chamamento/${x.id}?aba=estagio`} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/50">
                            <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${CORES.rosa.fundo} ${CORES.rosa.texto}`}>{iniciaisLsl(x.nome)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{x.nome}</div>
                              {x.etapa === "estagio" && x.estagio_inicio && <div className="text-xs text-muted-foreground">Semana {semanaDoEstagio(x.estagio_inicio)} de 8</div>}
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                    </Bloco>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </MolduraSimples>
  );
}

// ---------- Peças visuais do perfil ----------
type CorAtalho = "verde" | "azul" | "dourado" | "laranja" | "roxo" | "rosa" | "cinza";
type Atalho = { id: string; titulo: string; icone: ComponentType<{ className?: string }>; cor: CorAtalho; info: string; contador?: number; mostrar: boolean };

/** Cores de área: cada assunto tem a sua, para reconhecer de longe (como os ícones do celular). */
const CORES: Record<CorAtalho, { cartao: string; icone: string; fundo: string; texto: string; numero: string }> = {
  verde: { cartao: "bg-emerald-50 border-emerald-100", icone: "bg-emerald-500", fundo: "bg-emerald-100", texto: "text-emerald-700", numero: "text-emerald-600" },
  azul: { cartao: "bg-sky-50 border-sky-100", icone: "bg-sky-500", fundo: "bg-sky-100", texto: "text-sky-700", numero: "text-sky-600" },
  dourado: { cartao: "bg-amber-50 border-amber-100", icone: "bg-amber-500", fundo: "bg-amber-100", texto: "text-amber-700", numero: "text-amber-600" },
  laranja: { cartao: "bg-orange-50 border-orange-100", icone: "bg-orange-500", fundo: "bg-orange-100", texto: "text-orange-700", numero: "text-orange-600" },
  roxo: { cartao: "bg-violet-50 border-violet-100", icone: "bg-violet-500", fundo: "bg-violet-100", texto: "text-violet-700", numero: "text-violet-600" },
  rosa: { cartao: "bg-pink-50 border-pink-100", icone: "bg-pink-500", fundo: "bg-pink-100", texto: "text-pink-700", numero: "text-pink-600" },
  cinza: { cartao: "bg-slate-50 border-slate-200", icone: "bg-slate-500", fundo: "bg-slate-100", texto: "text-slate-700", numero: "text-slate-600" },
};

function Bloco({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-card border p-4 sm:p-5 space-y-4">
      {titulo && <h2 className="font-bold font-['Playfair_Display'] text-lg">{titulo}</h2>}
      {children}
    </section>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-sm">{rotulo}</Label>{children}</div>;
}

function Numero({ cor, valor, rotulo }: { cor: CorAtalho; valor: number; rotulo: string }) {
  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-4 text-center ${CORES[cor].cartao}`}>
      <div className={`text-2xl sm:text-3xl font-bold ${CORES[cor].numero}`}>{valor}</div>
      <div className="text-xs text-muted-foreground leading-tight mt-0.5">{rotulo}</div>
    </div>
  );
}

function Vazio({ icone: Icone, cor, titulo, texto, acao }: { icone: ComponentType<{ className?: string }>; cor: CorAtalho; titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <div className="rounded-3xl border-2 border-dashed bg-card p-8 text-center space-y-3">
      <span className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${CORES[cor].fundo} ${CORES[cor].texto}`}><Icone className="w-8 h-8" /></span>
      <div className="font-semibold text-lg">{titulo}</div>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{texto}</p>
      {acao}
    </div>
  );
}

function SituacaoInscricao({ status }: { status: string }) {
  const m: Record<string, [string, string]> = {
    approved: ["Inscrito", "bg-emerald-100 text-emerald-800"],
    pending: ["Aguardando aprovação", "bg-amber-100 text-amber-800"],
    rejected: ["Não aprovada", "bg-muted text-muted-foreground"],
    completed: ["Concluído", "bg-sky-100 text-sky-800"],
  };
  const [rotulo, cor] = m[status] ?? [status, "bg-muted text-muted-foreground"];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cor}`}>{rotulo}</span>;
}

function InfoLinha({ icone: Icone, rotulo, valor }: { icone: ComponentType<{ className?: string }>; rotulo: string; valor?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <Icone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{rotulo}</div>
        <div className="text-sm break-words">{valor || "Não informado"}</div>
      </div>
    </div>
  );
}
