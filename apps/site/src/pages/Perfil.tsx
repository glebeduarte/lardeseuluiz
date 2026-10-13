import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, type ModulePermission } from "@/hooks/usePermissions";
import AppLayout from "@/components/app/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Camera, Crown, Mail, Phone, IdCard, CalendarDays, MapPin, ShieldCheck,
  Briefcase, KeyRound, Sparkles, UserCircle2, Loader2
} from "lucide-react";

const PERMISSION_LABELS: Record<ModulePermission, { label: string; description: string }> = {
  modulo_macas: { label: "Macas", description: "Sistema de atendimentos espirituais" },
  modulo_passes: { label: "Passes", description: "Aplicação e registro de passes" },
  modulo_dialogo: { label: "Diálogo Fraterno", description: "Atendimentos de diálogo" },
  modulo_recepcao: { label: "Recepção", description: "Acolhimento e frequentadores" },
  modulo_formacao: { label: "Formação", description: "Cursos e formação espiritual" },
  modulo_secretaria: { label: "Secretarias", description: "Gestão de secretarias" },
  modulo_projetos: { label: "Projetos", description: "Projetos sociais" },
  modulo_gestao: { label: "Gestão", description: "Visão gerencial da Casa" },
  modulo_financeiro: { label: "Financeiro", description: "Receitas, despesas e contribuições" },
  modulo_admin: { label: "Administração", description: "Usuários, permissões e LGPD" },
};

const ROLE_META: Record<string, { label: string; tone: string }> = {
  trabalhador: { label: "Voluntário", tone: "bg-primary/10 text-primary border-primary/20" },
  assistido: { label: "Assistido", tone: "bg-sky-100 text-sky-800 border-sky-300" },
  beneficiario_social: { label: "Beneficiário social", tone: "bg-amber-100 text-amber-800 border-amber-300" },
  doador: { label: "Doador", tone: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  associado: { label: "Associado", tone: "bg-secondary/10 text-secondary border-secondary/20" },
  frequentador: { label: "Frequentador", tone: "bg-muted text-foreground border-border" },
};

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

const Perfil = () => {
  const { user, loading: authLoading, roles, simulacao } = useAuth();
  const { isAdmin, isGestor, permissions, isLoading: permsLoading } = usePermissions();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [person, setperson] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [personRoles, setPersonRoles] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [membership, setMembership] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: prof }, { data: peopleRows }] = await Promise.all([
      // "Visualizar como" uma pessoa: o perfil mostrado é o dela
      supabase.from("profiles").select("*").eq("user_id", simulacao?.userId ?? user.id).maybeSingle(),
      simulacao?.personId
        ? supabase.from("people").select("*").eq("id", simulacao.personId).limit(1)
        : supabase.from("people").select("*").eq("user_id", user.id).limit(1),
    ]);

    const p = peopleRows?.[0] || null;
    setProfile(prof);
    setperson(p);

    if (p) {
      const [{ data: pr }, { data: was }, { data: mem }] = await Promise.all([
        supabase.from("person_roles").select("*").eq("person_id", p.id).is("ended_at", null),
        supabase
          .from("worker_assignments")
          .select("id, context_type, started_at, ended_at, functions(id, name, description, category)")
          .eq("person_id", p.id)
          .is("ended_at", null),
        supabase
          .from("associate_memberships")
          .select("*")
          .eq("person_id", p.id)
          .order("admission_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setPersonRoles(pr || []);
      setAssignments(was || []);
      setMembership(mem || null);
    }

    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, simulacao]);

  const handleAvatar = async (file: File) => {
    if (!user || !person) {
      toast({ title: "Perfil não vinculado", description: "Solicite à secretaria o vínculo do seu cadastro.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);
      const url = pub.publicUrl;
      await supabase.from("people").update({ photo_url: url }).eq("id", person.id);
      await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
      toast({ title: "Foto atualizada", description: "Sua nova foto de perfil foi salva." });
      await load();
    } catch (e: any) {
      toast({ title: "Falha ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const isLoading = authLoading || loading || permsLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando perfil…
        </div>
      </AppLayout>
    );
  }

  const displayName = person?.full_name || profile?.full_name || user?.email?.split("@")[0] || "Trabalhador";
  const photo = person?.photo_url || profile?.avatar_url;
  const isPremium = membership && membership.status === "ativo";
  const totalPerms = permissions.size + (isAdmin ? 999 : 0);

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase();

  const address = person?.address as any;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Hero */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <div
            style={{
              height: 120,
              position: "relative",
              background:
                "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 60%, hsl(var(--accent)) 100%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.2,
                backgroundImage:
                  "radial-gradient(circle at 20% 30%, rgba(255,255,255,.35) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.25) 0%, transparent 45%)",
              }}
            />
            {isPremium && (
              <div style={{ position: "absolute", top: 16, right: 16 }}>
                <Badge className="bg-[hsl(var(--accent))] text-[hsl(var(--primary-dark))] border-0 gap-1 px-3 py-1 shadow">
                  <Crown className="w-3.5 h-3.5" /> Associado Premium
                </Badge>
              </div>
            )}
          </div>

          <CardContent style={{ paddingTop: 16, paddingBottom: 24 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 24,
              }}
            >
              <div style={{ position: "relative", flexShrink: 0, width: 112, height: 112, marginTop: -72 }}>
                <div
                  style={{
                    width: 112, height: 112, borderRadius: "9999px",
                    boxShadow: "0 0 0 4px hsl(var(--background)), 0 10px 25px rgba(0,0,0,.15)",
                    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28, fontWeight: 700,
                    background: "hsl(var(--muted))", color: "hsl(var(--primary))",
                  }}
                >
                  {photo ? (
                    <img src={photo} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    initials || <UserCircle2 className="w-16 h-16" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="hover:scale-105 transition disabled:opacity-60"
                  style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 32, height: 32, borderRadius: "9999px",
                    background: "hsl(var(--primary))", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 10px rgba(0,0,0,.2)",
                  }}
                  aria-label="Alterar foto"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])}
                />
              </div>

              <div style={{ flex: "1 1 0%", minWidth: 0, paddingTop: 4 }}>
                <h1
                  className="font-['Playfair_Display']"
                  style={{
                    fontSize: 26, fontWeight: 700, lineHeight: 1.15,
                    color: "hsl(var(--foreground))", margin: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {displayName}
                </h1>
                <p
                  className="font-['DM_Mono']"
                  style={{
                    fontSize: 12, color: "hsl(var(--muted-foreground))",
                    textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {user?.email}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {isAdmin && (
                    <Badge className="bg-[hsl(var(--primary))] text-white border-0 gap-1">
                      <ShieldCheck className="w-3 h-3" /> Administrador
                    </Badge>
                  )}
                  {isGestor && !isAdmin && (
                    <Badge className="bg-[hsl(var(--secondary))] text-white border-0 gap-1">
                      <ShieldCheck className="w-3 h-3" /> Gestor
                    </Badge>
                  )}
                  {personRoles.map((r) => {
                    const meta = ROLE_META[r.role] || { label: r.role, tone: "bg-muted" };
                    return (
                      <Badge key={r.id} variant="outline" className={meta.tone}>
                        {meta.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={Briefcase} label="Funções ativas" value={assignments.length} />
          <StatCard
            icon={KeyRound}
            label="Módulos liberados"
            value={isAdmin ? "Todos" : permissions.size}
          />
          <StatCard
            icon={Sparkles}
            label="Tipo de acesso"
            value={isAdmin ? "Administrador" : isGestor ? "Gestor" : "Trabalhador"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dados pessoais */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-['Playfair_Display']">Dados pessoais</CardTitle>
              <CardDescription>Informações cadastrais do seu vínculo com a Casa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={Mail} label="E-mail" value={person?.email || user?.email} />
              <InfoRow icon={Phone} label="Telefone" value={person?.phone} />
              <InfoRow icon={IdCard} label="CPF" value={person?.cpf} />
              <InfoRow icon={CalendarDays} label="Nascimento" value={formatDate(person?.birth_date)} />
              {address && (
                <InfoRow
                  icon={MapPin}
                  label="Endereço"
                  value={[address.street, address.number, address.city, address.state].filter(Boolean).join(", ") || "—"}
                />
              )}
            </CardContent>
          </Card>

          {/* Associado / Premium */}
          <Card className={isPremium ? "border-[hsl(var(--accent))] shadow-[0_0_0_1px_hsl(var(--accent)/0.3)]" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-['Playfair_Display'] flex items-center gap-2">
                  <Crown className="w-4 h-4 text-[hsl(var(--accent))]" /> Associação
                </CardTitle>
                {isPremium && <Badge className="bg-[hsl(var(--accent))] text-[hsl(var(--primary-dark))] border-0">Ativo</Badge>}
              </div>
              <CardDescription>Status do vínculo associativo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {membership ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Categoria</span>
                    <span className="font-medium capitalize">{membership.category || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Situação</span>
                    <span className="font-medium capitalize">{membership.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Admissão</span>
                    <span className="font-medium">{formatDate(membership.admission_date)}</span>
                  </div>
                  {membership.exit_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Desligamento</span>
                      <span className="font-medium">{formatDate(membership.exit_date)}</span>
                    </div>
                  )}
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate("/meu-painel/contribuicoes")}
                  >
                    Ver minhas contribuições
                  </Button>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Você ainda não possui vínculo associativo registrado.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Funções */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-['Playfair_Display'] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[hsl(var(--primary))]" /> Minhas funções
              </CardTitle>
              <CardDescription>Atribuições ativas na Casa</CardDescription>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma função ativa atribuída no momento.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {assignments.map((a) => (
                    <li key={a.id} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-foreground">{a.functions?.name || "Função"}</div>
                        {a.functions?.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">{a.functions.description}</div>
                        )}
                        <div className="text-[11px] text-muted-foreground mt-1 font-['DM_Mono'] uppercase tracking-wider">
                          {a.context_type} · desde {formatDate(a.started_at)}
                        </div>
                      </div>
                      {a.functions?.category && (
                        <Badge variant="outline" className="capitalize shrink-0">
                          {a.functions.category}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recursos / permissões */}
          <Card>
            <CardHeader>
              <CardTitle className="font-['Playfair_Display'] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[hsl(var(--secondary))]" /> Recursos
              </CardTitle>
              <CardDescription>Módulos que você pode acessar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(isAdmin ? Object.keys(PERMISSION_LABELS) as ModulePermission[] : Array.from(permissions)).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum módulo liberado.
                </p>
              ) : (
                (isAdmin ? (Object.keys(PERMISSION_LABELS) as ModulePermission[]) : Array.from(permissions)).map((p) => {
                  const meta = PERMISSION_LABELS[p as ModulePermission];
                  if (!meta) return null;
                  return (
                    <div
                      key={p}
                      className="flex items-start gap-3 p-2.5 rounded-md border border-border bg-card/50 hover:bg-muted/40 transition"
                    >
                      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{meta.label}</div>
                        <div className="text-xs text-muted-foreground">{meta.description}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: any }) => (
  <Card>
    <CardContent className="p-5 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-[11px] font-['DM_Mono'] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-bold font-['Playfair_Display']">{value}</div>
      </div>
    </CardContent>
  </Card>
);

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
    <span className="text-[11px] font-['DM_Mono'] uppercase tracking-wider text-muted-foreground w-28 shrink-0">
      {label}
    </span>
    <span className="text-sm text-foreground flex-1 truncate">{value || "—"}</span>
  </div>
);

export default Perfil;
