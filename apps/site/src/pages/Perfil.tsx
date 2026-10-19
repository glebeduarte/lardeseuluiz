import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, type ModulePermission } from "@/hooks/usePermissions";
import MinhasAcoes from "@/components/acoes/MinhasAcoes";
import MinhasTarefas from "@/components/secretarias/MinhasTarefas";
import { useMinhaJornada } from "@/components/site/JornadaVoluntario";
import { ETAPA_COR, ETAPA_LABEL, ETAPAS_JORNADA, dataCurta, proximoPasso, semanaDoEstagio } from "@/lib/chamamento";
import { db } from "@/lib/acoes";
import { MolduraSimples, useAreasLsl, iniciaisLsl } from "@/compartilhado";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Bed, MessagesSquare, Crown, Save, Eye, Footprints, Check,
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
  const { user, loading: authLoading, simulacao } = useAuth();
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
  const temGovernanca = isAdmin || isGestor || perms.length > 0 || funcoes.length > 0 || !!associacao;
  const endereco = (person?.address && typeof person.address === "object" ? person.address : null) as Endereco | null;
  const papelPrincipal = isAdmin ? "Administrador" : isGestor ? "Gestor" : funcoes.length ? "Voluntário" : roles[0] ? ROLE_META[roles[0].role]?.label ?? "Frequentador" : "Frequentador";
  const nomesFuncoes = funcoes.map((f) => f.functions?.name).filter(Boolean).join(" · ");

  return (
    <MolduraSimples sistema="perfil" areas={areas} usuario={{ nome, foto }} navegar={navegar}>
      {carregando ? (
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando perfil...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Identidade */}
          <Card className="overflow-hidden">
            <div className="h-24 sm:h-28" style={{ background: "hsl(var(--primary-dark))" }} />
            <CardContent className="pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 -mt-12 sm:-mt-14">
                  <div className="w-full h-full rounded-full border-4 border-card bg-[hsl(var(--accent))] text-[hsl(var(--primary-dark))] flex items-center justify-center text-2xl font-bold overflow-hidden shadow-md">
                    {foto ? <img src={foto} alt="" className="w-full h-full object-cover" /> : iniciaisLsl(nome)}
                  </div>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || !person}
                    className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow border-2 border-card disabled:opacity-60"
                    aria-label="Trocar foto">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatar(f); e.target.value = ""; }} />
                </div>
                <div className="flex-1 min-w-0 sm:pb-1">
                  <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground truncate">{nome}</h1>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{papelPrincipal}</Badge>
                    {roles.filter((r) => r.role !== "trabalhador" && ROLE_META[r.role]).map((r) => (
                      <Badge key={r.id} variant="outline" className={ROLE_META[r.role].tone}>{ROLE_META[r.role].label}</Badge>
                    ))}
                    {associacao?.status === "ativo" && <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 gap-1"><Crown className="w-3 h-3" /> Associado</Badge>}
                    {(atendimento?.papeis ?? []).map((p) => (
                      <Badge key={p} variant="outline" className="bg-sky-100 text-sky-800 border-sky-300">{PAPEIS_ATENDIMENTO[p] ?? p}</Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-muted-foreground">
                    {(person?.email || user?.email) && <span className="inline-flex items-center gap-1.5 min-w-0"><Mail className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{person?.email || user?.email}</span></span>}
                    {person?.phone && <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{person.phone}</span>}
                  </div>
                </div>
                <Button variant="outline" onClick={() => irPara("dados")} className="sm:mb-1">
                  <Pencil className="w-4 h-4 mr-2" /> Editar meus dados
                </Button>
              </div>
            </CardContent>
          </Card>

          {simulacao?.personId && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Você está vendo o perfil de outra pessoa. As alterações ficam bloqueadas.
            </div>
          )}

          <Tabs value={aba} onValueChange={irPara}>
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList>
                <TabsTrigger value="geral">Visão geral</TabsTrigger>
                <TabsTrigger value="dados">Meus dados</TabsTrigger>
                <TabsTrigger value="formacao">Formação</TabsTrigger>
                {atendimento && <TabsTrigger value="atendimento">Atendimento</TabsTrigger>}
                {temGovernanca && <TabsTrigger value="governanca">Governança</TabsTrigger>}
                <TabsTrigger value="acoes">Ações sociais</TabsTrigger>
                {temJornada && <TabsTrigger value="jornada">Voluntariado</TabsTrigger>}
              </TabsList>
            </div>

            {/* ---------- Visão geral ---------- */}
            <TabsContent value="geral" className="mt-4 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Indicador icone={BookOpen} rotulo="Cursos em andamento" valor={cursosAtivos.length} />
                <Indicador icone={CheckCircle2} rotulo="Presenças nas aulas" valor={formacao?.presencas ?? 0} />
                {atendimento
                  ? <Indicador icone={MessagesSquare} rotulo="Diálogos realizados" valor={atendimento.dialogos} />
                  : <Indicador icone={Award} rotulo="Avaliações aprovadas" valor={formacao?.avaliacoes_aprovadas ?? 0} />}
                <Indicador icone={Briefcase} rotulo="Funções na Casa" valor={funcoes.length} />
              </div>

              <MinhasTarefas desativado={!!simulacao?.personId} />

              <div className="grid gap-4 md:grid-cols-2">
                <Area icone={GraduationCap} titulo="Formação" href={formacao?.admin ? "/formacao/admin" : "/formacao/dashboard"} externo
                  resumo={cursosAtivos.length ? `${cursosAtivos.length} curso${cursosAtivos.length > 1 ? "s" : ""} em andamento` : "Nenhum curso em andamento"}
                  acao={() => irPara("formacao")}>
                  {cursosAtivos.slice(0, 2).map((c) => <ProgressoCurso key={c.id} curso={c} />)}
                  {!cursosAtivos.length && <a href="/formacao/explore" className="text-sm text-primary hover:underline">Conhecer os cursos da Casa</a>}
                </Area>

                {atendimento && (
                  <Area icone={HeartPulse} titulo="Atendimento" href="/atendimento/" externo
                    resumo={atendimento.papeis.map((p) => PAPEIS_ATENDIMENTO[p] ?? p).join(" · ")}
                    acao={() => irPara("atendimento")}>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <MiniNumero valor={atendimento.dialogos_mes} rotulo="Diálogos no mês" />
                      <MiniNumero valor={atendimento.acompanhamentos_ativos} rotulo="Em tratamento" />
                      <MiniNumero valor={atendimento.macas.length} rotulo="Macas" />
                    </div>
                  </Area>
                )}

                {temGovernanca && (
                  <Area icone={Landmark} titulo="Governança" href={areas?.governanca ? "/app" : undefined}
                    resumo={nomesFuncoes || (associacao ? "Associado da Casa" : "Sem função ativa")}
                    acao={() => irPara("governanca")}>
                    <div className="flex flex-wrap gap-1.5">
                      {perms.slice(0, 6).map((p) => PERMISSION_LABELS[p] && <Badge key={p} variant="outline" className="text-xs">{PERMISSION_LABELS[p].label}</Badge>)}
                      {perms.length > 6 && <Badge variant="outline" className="text-xs">+{perms.length - 6}</Badge>}
                      {!perms.length && <span className="text-sm text-muted-foreground">Nenhum módulo da gestão liberado.</span>}
                    </div>
                  </Area>
                )}

                {jornada && !["desligado", "colaborador"].includes(jornada.etapa) && (
                  <Area icone={Footprints} titulo="Jornada de voluntário" resumo={ETAPA_LABEL[jornada.etapa]} acao={() => irPara("jornada")}>
                    <p className="text-sm text-muted-foreground">{proximoPasso(jornada)}</p>
                  </Area>
                )}
                <Area icone={HeartHandshake} titulo="Ações sociais" href="/#eventos" resumo="Escalas e pedidos de participação" acao={() => irPara("acoes")}>
                  <p className="text-sm text-muted-foreground">Confirme as suas escalas e acompanhe os pedidos na aba Ações sociais.</p>
                </Area>
              </div>
            </TabsContent>

            {/* ---------- Meus dados (editável) ---------- */}
            <TabsContent value="dados" className="mt-4">
              {!person ? (
                <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Seu cadastro ainda não está vinculado a esta conta. Fale com a secretaria da Casa.
                </CardContent></Card>
              ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="font-['Playfair_Display'] text-lg">Dados pessoais</CardTitle>
                      <CardDescription>O que você alterar aqui vale para o site, a Formação e o Atendimento.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2">
                        <Label>Nome completo *</Label>
                        <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label>Telefone / WhatsApp</Label>
                          <Input inputMode="tel" placeholder="(84) 99999-9999" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Data de nascimento</Label>
                          <Input type="date" value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} />
                        </div>
                      </div>
                      <div className="border-t pt-4 space-y-3">
                        <div className="text-sm font-medium">Endereço</div>
                        <div className="grid grid-cols-[2fr_1fr] gap-3">
                          <div className="grid gap-2"><Label>Rua</Label><Input value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} /></div>
                          <div className="grid gap-2"><Label>Número</Label><Input value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} /></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="grid gap-2"><Label>Complemento</Label><Input value={form.complement} onChange={(e) => setForm((f) => ({ ...f, complement: e.target.value }))} /></div>
                          <div className="grid gap-2"><Label>Bairro</Label><Input value={form.neighborhood} onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))} /></div>
                        </div>
                        <div className="grid grid-cols-[2fr_64px_1fr] gap-3">
                          <div className="grid gap-2"><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></div>
                          <div className="grid gap-2"><Label>UF</Label><Input maxLength={2} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} /></div>
                          <div className="grid gap-2"><Label>CEP</Label><Input inputMode="numeric" value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} /></div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={salvar} disabled={salvando}>
                          {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Salvar alterações
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="font-['Playfair_Display'] text-lg">Dados da conta</CardTitle>
                      <CardDescription>Para corrigir estes dados, fale com a secretaria.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <InfoLinha icone={Mail} rotulo="E-mail de acesso" valor={user?.email} />
                      <InfoLinha icone={IdCard} rotulo="CPF" valor={person.cpf ? String(person.cpf).replace(/^(\d{3})\d{6}(\d{2})$/, "$1.***.***-$2") : null} />
                      <InfoLinha icone={CalendarDays} rotulo="Cadastro desde" valor={dataBR(person.created_at, true)} />
                      <InfoLinha icone={MapPin} rotulo="Endereço atual" valor={endereco ? [endereco.street, endereco.number, endereco.neighborhood, endereco.city].filter(Boolean).join(", ") : null} />
                      <div className="pt-3">
                        <Button variant="outline" size="sm" asChild><Link to="/privacidade"><ShieldCheck className="w-4 h-4 mr-2" /> Política de privacidade</Link></Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* ---------- Formação ---------- */}
            <TabsContent value="formacao" className="mt-4 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Indicador icone={BookOpen} rotulo="Cursos em andamento" valor={cursosAtivos.length} />
                <Indicador icone={CheckCircle2} rotulo="Presenças nas aulas" valor={formacao?.presencas ?? 0} />
                <Indicador icone={Award} rotulo="Avaliações aprovadas" valor={formacao?.avaliacoes_aprovadas ?? 0} />
              </div>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="font-['Playfair_Display'] text-lg">Meus cursos</CardTitle>
                    <CardDescription>Inscrições e progresso nas aulas</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild><a href="/formacao/dashboard">Abrir a Formação</a></Button>
                </CardHeader>
                <CardContent>
                  {(formacao?.cursos ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Você ainda não está inscrito em nenhum curso. <a href="/formacao/explore" className="text-primary hover:underline">Ver cursos</a>
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {formacao!.cursos.map((c) => (
                        <li key={c.id} className="py-3 flex items-center gap-4">
                          {c.capa ? <img src={c.capa} alt="" className="w-16 h-12 rounded-md object-cover shrink-0" /> : (
                            <div className="w-16 h-12 rounded-md shrink-0 flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                              <GraduationCap className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <a href={`/formacao/course/${c.id}`} className="font-medium hover:underline truncate">{c.titulo}</a>
                              <SituacaoInscricao status={c.status} />
                            </div>
                            {c.status === "approved" && c.aulas > 0 ? <ProgressoCurso curso={c} semTitulo /> : (
                              <div className="text-xs text-muted-foreground mt-0.5">{[c.horario, c.inicio ? `início ${dataBR(c.inicio)}` : null].filter(Boolean).join(" · ")}</div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---------- Atendimento ---------- */}
            {atendimento && (
              <TabsContent value="atendimento" className="mt-4 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Indicador icone={MessagesSquare} rotulo="Diálogos realizados" valor={atendimento.dialogos} />
                  <Indicador icone={CalendarDays} rotulo="Diálogos neste mês" valor={atendimento.dialogos_mes} />
                  <Indicador icone={Users} rotulo="Consulentes em tratamento" valor={atendimento.acompanhamentos_ativos} />
                  <Indicador icone={Bed} rotulo="Macas em que atua" valor={atendimento.macas.length} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-['Playfair_Display'] text-lg">Meus papéis</CardTitle>
                      <CardDescription>O que você faz no Atendimento</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {atendimento.papeis.map((p) => <Badge key={p} variant="outline" className="bg-sky-100 text-sky-800 border-sky-300">{PAPEIS_ATENDIMENTO[p] ?? p}</Badge>)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                      <div>
                        <CardTitle className="font-['Playfair_Display'] text-lg">Minhas macas</CardTitle>
                        <CardDescription>Macas em que você atua como médium</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" asChild><a href="/atendimento/">Abrir o Atendimento</a></Button>
                    </CardHeader>
                    <CardContent>
                      {atendimento.macas.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma maca atribuída.</p> : (
                        <ul className="divide-y divide-border">
                          {atendimento.macas.map((m) => (
                            <li key={m.numero} className="py-2.5 flex items-center gap-3">
                              <span className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: m.cor || "hsl(var(--primary))" }}>{m.numero}</span>
                              <div className="min-w-0">
                                <div className="font-medium text-sm">{m.nome}</div>
                                {m.dia && <div className="text-xs text-muted-foreground">{DIAS[m.dia] ?? m.dia}</div>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}

            {/* ---------- Governança ---------- */}
            {temGovernanca && (
              <TabsContent value="governanca" className="mt-4">
                <div className="grid gap-6 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="font-['Playfair_Display'] text-lg flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /> Minhas funções</CardTitle>
                      <CardDescription>Atribuições ativas na Casa</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {funcoes.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Nenhuma função ativa atribuída no momento.</p> : (
                        <ul className="divide-y divide-border">
                          {funcoes.map((a) => (
                            <li key={a.id} className="py-3 flex items-start justify-between gap-4">
                              <div>
                                <div className="font-medium text-foreground">{a.functions?.name || "Função"}</div>
                                {a.functions?.description && <div className="text-xs text-muted-foreground mt-0.5">{a.functions.description}</div>}
                                <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider">{a.context_type} · desde {dataBR(a.started_at, true)}</div>
                              </div>
                              {a.functions?.category && <Badge variant="outline" className="capitalize shrink-0">{String(a.functions.category).replace(/_/g, " ")}</Badge>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="font-['Playfair_Display'] text-lg flex items-center gap-2"><Crown className="w-4 h-4 text-[hsl(var(--accent-dark))]" /> Associação</CardTitle>
                      <CardDescription>Vínculo associativo com a Casa</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {associacao ? (
                        <>
                          <div className="flex items-center justify-between"><span className="text-muted-foreground">Situação</span>
                            <Badge variant="outline" className={`capitalize ${associacao.status === "ativo" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"}`}>{associacao.status}</Badge></div>
                          {associacao.category && <div className="flex items-center justify-between"><span className="text-muted-foreground">Categoria</span><span className="capitalize">{String(associacao.category).replace(/_/g, " ")}</span></div>}
                          <div className="flex items-center justify-between"><span className="text-muted-foreground">Desde</span><span>{dataBR(associacao.admission_date, true)}</span></div>
                          {(gov?.contribuicoes ?? []).length > 0 && (
                            <div className="border-t pt-3 space-y-1.5">
                              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Últimas contribuições</div>
                              {gov!.contribuicoes.map((c) => (
                                <div key={c.id} className="flex justify-between"><span>{c.reference_month}</span><span className="font-medium">{Number(c.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
                              ))}
                            </div>
                          )}
                          <Button variant="outline" size="sm" className="w-full" asChild><Link to="/meu-painel">Painel do associado</Link></Button>
                        </>
                      ) : <p className="text-muted-foreground text-center py-4">Você ainda não possui vínculo associativo registrado.</p>}
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-3">
                    <CardHeader>
                      <CardTitle className="font-['Playfair_Display'] text-lg flex items-center gap-2"><KeyRound className="w-4 h-4 text-primary" /> Recursos liberados</CardTitle>
                      <CardDescription>Módulos da gestão que você pode acessar</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {perms.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum módulo liberado.</p> : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {perms.map((p) => PERMISSION_LABELS[p] && (
                            <div key={p} className="flex items-start gap-3 p-2.5 rounded-md border bg-card">
                              <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium">{PERMISSION_LABELS[p].label}</div>
                                <div className="text-xs text-muted-foreground">{PERMISSION_LABELS[p].description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}

            {/* ---------- Jornada de voluntário (Chamamento) ---------- */}
            {temJornada && (
              <TabsContent value="jornada" className="mt-4 space-y-6">
                {jornada && (
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                      <div>
                        <CardTitle className="font-['Playfair_Display'] text-lg flex items-center gap-2"><Footprints className="w-4 h-4 text-primary" /> Minha jornada de voluntário</CardTitle>
                        <CardDescription>{jornada.ciclo?.nome ?? "Chamamento"} · desde {dataCurta(jornada.criado_em)}</CardDescription>
                      </div>
                      <Badge variant="outline" className={ETAPA_COR[jornada.etapa]}>{ETAPA_LABEL[jornada.etapa]}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <ol className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {ETAPAS_JORNADA.map((e, i) => {
                          const idx = ETAPAS_JORNADA.findIndex((x) => x.etapa === jornada.etapa);
                          const feito = idx >= 0 && (i < idx || jornada.etapa === "voluntario");
                          const atual = i === idx && jornada.etapa !== "voluntario";
                          return (
                            <li key={e.etapa} className="flex flex-col gap-1.5">
                              <div className={`h-1.5 rounded-full ${feito ? "bg-primary" : atual ? "bg-[hsl(var(--accent))]" : "bg-muted"}`} />
                              <div className={`text-xs font-semibold ${atual ? "text-foreground" : feito ? "text-primary" : "text-muted-foreground"}`}>{feito && <Check className="w-3 h-3 inline mr-1" />}{e.curto}</div>
                            </li>
                          );
                        })}
                      </ol>
                      <p className="text-sm rounded-md bg-muted px-4 py-3">{proximoPasso(jornada)}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <InfoLinha icone={GraduationCap} rotulo="Curso" valor={jornada.ciclo?.curso_em ? dataCurta(jornada.ciclo.curso_em) : null} />
                        <InfoLinha icone={Footprints} rotulo="Estágio" valor={jornada.ciclo?.estagio_inicio ? `${dataCurta(jornada.ciclo.estagio_inicio)} a ${dataCurta(jornada.ciclo.estagio_fim)}` : null} />
                        <InfoLinha icone={Users} rotulo="Tutor" valor={jornada.tutor} />
                        <InfoLinha icone={CheckCircle2} rotulo="Presenças no estágio" valor={jornada.registros ? `${jornada.presencas} de ${jornada.registros}` : null} />
                      </div>
                      {jornada.ciclo?.curso_id && ["curso", "estagio"].includes(jornada.etapa) && (
                        <Button variant="outline" size="sm" asChild><a href={`/formacao/course/${jornada.ciclo.curso_id}`}>Abrir o curso na Formação</a></Button>
                      )}
                    </CardContent>
                  </Card>
                )}
                {estagiarios.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-['Playfair_Display'] text-lg">Estagiários que acompanho</CardTitle>
                      <CardDescription>Registre as presenças, o checkpoint da semana 4 e a avaliação final.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="divide-y divide-border">
                        {estagiarios.map((x) => (
                          <li key={x.id} className="py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <Link to={`/app/chamamento/${x.id}?aba=estagio`} className="font-medium hover:underline">{x.nome}</Link>
                              {x.etapa === "estagio" && x.estagio_inicio && <div className="text-xs text-muted-foreground">Semana {semanaDoEstagio(x.estagio_inicio)} de 8</div>}
                            </div>
                            <Badge variant="outline" className={`text-xs ${ETAPA_COR[x.etapa]}`}>{ETAPA_LABEL[x.etapa]}</Badge>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            {/* ---------- Ações sociais ---------- */}
            <TabsContent value="acoes" className="mt-4">
              <div className="grid gap-6 lg:grid-cols-3"><MinhasAcoes simulandoOutraPessoa={!!simulacao?.personId} /></div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </MolduraSimples>
  );
}

function Indicador({ icone: Icone, rotulo, valor }: { icone: ComponentType<{ className?: string }>; rotulo: string; valor: number | string }) {
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

function Area({ icone: Icone, titulo, resumo, href, externo, acao, children }: {
  icone: ComponentType<{ className?: string }>; titulo: string; resumo: string; href?: string; externo?: boolean; acao: () => void; children: ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
          <Icone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <CardTitle className="font-['Playfair_Display'] text-lg">{titulo}</CardTitle>
          <CardDescription className="truncate">{resumo}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">{children}</CardContent>
      <div className="px-6 pb-5 flex gap-2">
        <Button variant="outline" size="sm" onClick={acao}>Ver detalhes</Button>
        {href && (externo
          ? <Button variant="ghost" size="sm" asChild><a href={href}>Abrir <ChevronRight className="w-4 h-4 ml-1" /></a></Button>
          : <Button variant="ghost" size="sm" asChild><Link to={href}>Abrir <ChevronRight className="w-4 h-4 ml-1" /></Link></Button>)}
      </div>
    </Card>
  );
}

function ProgressoCurso({ curso, semTitulo }: { curso: CursoResumo; semTitulo?: boolean }) {
  const pct = curso.aulas ? Math.round((curso.concluidas / curso.aulas) * 100) : 0;
  return (
    <div className="space-y-1">
      {!semTitulo && <div className="text-sm font-medium truncate">{curso.titulo}</div>}
      <div className="flex items-center gap-2">
        <Progress value={pct} className="h-2 flex-1 bg-muted" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">{curso.concluidas}/{curso.aulas} aulas</span>
      </div>
    </div>
  );
}

function MiniNumero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="rounded-md bg-muted px-2 py-2">
      <div className="text-lg font-bold">{valor}</div>
      <div className="text-[11px] text-muted-foreground leading-tight">{rotulo}</div>
    </div>
  );
}

function SituacaoInscricao({ status }: { status: string }) {
  const m: Record<string, [string, string]> = {
    approved: ["Inscrito", "bg-emerald-100 text-emerald-800 border-emerald-300"],
    pending: ["Aguardando aprovação", "bg-amber-100 text-amber-800 border-amber-300"],
    rejected: ["Não aprovada", "bg-muted text-muted-foreground border-border"],
    completed: ["Concluído", "bg-sky-100 text-sky-800 border-sky-300"],
  };
  const [rotulo, cor] = m[status] ?? [status, "bg-muted text-muted-foreground border-border"];
  return <Badge variant="outline" className={`text-[10px] ${cor}`}>{rotulo}</Badge>;
}

function InfoLinha({ icone: Icone, rotulo, valor }: { icone: ComponentType<{ className?: string }>; rotulo: string; valor?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{rotulo}</div>
        <div className="text-sm break-words">{valor || "Não informado"}</div>
      </div>
    </div>
  );
}
