import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/app/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Shield, Trash2 } from "lucide-react";

interface PersonWithRoles {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  roles: string[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  trabalhador: "Trabalhador",
  aluno: "Aluno",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  gestor: "bg-primary/10 text-primary border-primary/20",
  trabalhador: "bg-secondary/10 text-secondary border-secondary/20",
  aluno: "bg-muted text-muted-foreground border-border",
};

const Usuarios = () => {
  const { user, roles: myRoles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<PersonWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("trabalhador");
  const [inviting, setInviting] = useState(false);

  const isAdmin = myRoles.includes("admin");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
    if (!authLoading && user && !isAdmin) { navigate("/app"); toast.error("Acesso restrito a administradores"); }
  }, [user, authLoading, isAdmin, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: people } = await supabase
      .from("people")
      .select("id, user_id, full_name, email")
      .not("user_id", "is", null)
      .order("full_name");
    const { data: allRoles } = await supabase.from("user_roles").select("*");

    const rolesMap: Record<string, string[]> = {};
    (allRoles || []).forEach((r: any) => {
      if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
      rolesMap[r.user_id].push(r.role);
    });

    setProfiles((people || []).map((p: any) => ({
      id: p.id,
      user_id: p.user_id as string,
      full_name: p.full_name,
      email: p.email,
      roles: rolesMap[p.user_id as string] || [],
    })));
    setLoading(false);
  };

  useEffect(() => { if (user && isAdmin) fetchUsers(); }, [user, isAdmin]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      // Create user via edge function
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: inviteEmail, password: invitePassword, full_name: inviteName, role: inviteRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuário criado com sucesso!");
      setInviteOpen(false);
      setInviteEmail(""); setInvitePassword(""); setInviteName(""); setInviteRole("trabalhador");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    } finally {
      setInviting(false);
    }
  };

  const handleAddRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) { toast.error(error.message); return; }
    toast.success("Role adicionada!");
    fetchUsers();
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    if (userId === user?.id && role === "admin") { toast.error("Você não pode remover seu próprio acesso admin"); return; }
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Role removida!");
    fetchUsers();
  };

  if (authLoading || loading) return (
    <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AppLayout>
  );

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Playfair_Display'] text-2xl font-bold">Gestão de Usuários</h1>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="w-4 h-4 mr-2" /> Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Novo Usuário</DialogTitle></DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2"><Label>Nome completo *</Label><Input required value={inviteName} onChange={e => setInviteName(e.target.value)} /></div>
              <div className="space-y-2"><Label>E-mail *</Label><Input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>Senha *</Label><Input required type="password" minLength={6} value={invitePassword} onChange={e => setInvitePassword(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Role inicial</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="aluno">Aluno</option>
                  <option value="trabalhador">Trabalhador</option>
                  <option value="gestor">Gestor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={inviting}>
                {inviting ? "Criando..." : "Criar Usuário"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Usuários do Sistema</CardTitle></CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Permissões</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-semibold">{p.full_name || "Sem nome"}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {p.roles.map(r => (
                            <Badge key={r} variant="outline" className={`text-xs ${ROLE_COLORS[r] || ""}`}>
                              {ROLE_LABELS[r] || r}
                              <button onClick={() => handleRemoveRole(p.user_id, r)} className="ml-1 hover:text-destructive">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                          {p.roles.length === 0 && <span className="text-xs text-muted-foreground">Sem role</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(["admin", "gestor", "trabalhador", "aluno"] as const)
                            .filter(r => !p.roles.includes(r))
                            .map(r => (
                              <Button key={r} variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleAddRole(p.user_id, r)}>
                                <Shield className="w-3 h-3 mr-1" /> +{ROLE_LABELS[r]}
                              </Button>
                            ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Usuarios;
