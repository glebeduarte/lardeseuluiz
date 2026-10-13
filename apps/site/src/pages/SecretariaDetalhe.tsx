import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/app/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, UserPlus, ClipboardList, Activity } from "lucide-react";

interface Secretaria { id: string; name: string; description: string | null; icon: string; }
interface Member { id: string; secretaria_id: string; associate_id: string; member_role: string; associate_name?: string; }
interface Responsibility { id: string; secretaria_id: string; title: string; description: string | null; item_order: number; }
interface Action { id: string; secretaria_id: string; title: string; description: string | null; action_status: string; action_date: string | null; published_by: string | null; publisher_name?: string; created_at: string; }
interface Associate { id: string; full_name: string; }

const STATUS_LABELS: Record<string, string> = { planejada: "Planejada", em_andamento: "Em Andamento", concluida: "Concluída", cancelada: "Cancelada" };
const STATUS_COLORS: Record<string, string> = {
  planejada: "bg-muted text-muted-foreground",
  em_andamento: "bg-primary/10 text-primary",
  concluida: "bg-secondary/10 text-secondary",
  cancelada: "bg-destructive/10 text-destructive",
};
const ROLE_LABELS: Record<string, string> = { coordenador: "Coordenador", participante: "Participante" };

const SecretariaDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [secretaria, setSecretaria] = useState<Secretaria | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [memberOpen, setMemberOpen] = useState(false);
  const [respOpen, setRespOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [editRespId, setEditRespId] = useState<string | null>(null);
  const [editActionId, setEditActionId] = useState<string | null>(null);

  // Forms
  const [memberForm, setMemberForm] = useState({ associate_id: "", member_role: "participante" });
  const [respForm, setRespForm] = useState({ title: "", description: "" });
  const [actionForm, setActionForm] = useState({ title: "", description: "", action_status: "planejada", action_date: "", published_by: "" });

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    const [secRes, memRes, respRes, actRes, assocRes] = await Promise.all([
      supabase.from("secretarias").select("*").eq("id", id).single(),
      supabase.from("secretaria_members").select("*").eq("secretaria_id", id),
      supabase.from("secretaria_responsibilities").select("*").eq("secretaria_id", id).order("item_order"),
      supabase.from("secretaria_actions").select("*").eq("secretaria_id", id).order("created_at", { ascending: false }),
      supabase.from("associates").select("id, full_name").eq("status", "ativo").order("full_name"),
    ]);

    setSecretaria(secRes.data as any);
    setAssociates((assocRes.data || []) as Associate[]);

    const assocMap: Record<string, string> = {};
    (assocRes.data || []).forEach((a: any) => { assocMap[a.id] = a.full_name; });

    setMembers((memRes.data || []).map((m: any) => ({ ...m, associate_name: assocMap[m.associate_id] || "Desconhecido" })));
    setResponsibilities((respRes.data || []) as Responsibility[]);
    setActions((actRes.data || []).map((a: any) => ({ ...a, publisher_name: a.published_by ? assocMap[a.published_by] : null })));
    setLoading(false);
  };

  useEffect(() => { if (user && id) fetchAll(); }, [user, id]);

  // Members
  const handleAddMember = async () => {
    if (!memberForm.associate_id || !id) return;
    const { error } = await supabase.from("secretaria_members").insert({
      secretaria_id: id, associate_id: memberForm.associate_id, member_role: memberForm.member_role as any,
    });
    if (error) { toast.error(error.message.includes("duplicate") ? "Associado já é membro" : error.message); return; }
    toast.success("Membro adicionado!");
    setMemberOpen(false);
    setMemberForm({ associate_id: "", member_role: "participante" });
    fetchAll();
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase.from("secretaria_members").delete().eq("id", memberId);
    if (error) { toast.error(error.message); return; }
    toast.success("Membro removido!");
    fetchAll();
  };

  // Responsibilities
  const openAddResp = () => { setEditRespId(null); setRespForm({ title: "", description: "" }); setRespOpen(true); };
  const openEditResp = (r: Responsibility) => { setEditRespId(r.id); setRespForm({ title: r.title, description: r.description || "" }); setRespOpen(true); };
  const handleSaveResp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const payload = { secretaria_id: id, title: respForm.title, description: respForm.description || null, item_order: responsibilities.length };
    if (editRespId) {
      const { error } = await supabase.from("secretaria_responsibilities").update({ title: respForm.title, description: respForm.description || null }).eq("id", editRespId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("secretaria_responsibilities").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editRespId ? "Responsabilidade atualizada!" : "Responsabilidade adicionada!");
    setRespOpen(false);
    fetchAll();
  };
  const handleDeleteResp = async (rId: string) => {
    await supabase.from("secretaria_responsibilities").delete().eq("id", rId);
    toast.success("Removida!");
    fetchAll();
  };

  // Actions
  const openAddAction = () => { setEditActionId(null); setActionForm({ title: "", description: "", action_status: "planejada", action_date: "", published_by: "" }); setActionOpen(true); };
  const openEditAction = (a: Action) => { setEditActionId(a.id); setActionForm({ title: a.title, description: a.description || "", action_status: a.action_status, action_date: a.action_date || "", published_by: a.published_by || "" }); setActionOpen(true); };
  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const payload = {
      secretaria_id: id,
      title: actionForm.title,
      description: actionForm.description || null,
      action_status: actionForm.action_status as any,
      action_date: actionForm.action_date || null,
      published_by: actionForm.published_by || null,
    };
    if (editActionId) {
      const { title, description, action_status, action_date, published_by } = payload;
      const { error } = await supabase.from("secretaria_actions").update({ title, description, action_status, action_date, published_by }).eq("id", editActionId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("secretaria_actions").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editActionId ? "Ação atualizada!" : "Ação publicada!");
    setActionOpen(false);
    fetchAll();
  };
  const handleDeleteAction = async (aId: string) => {
    await supabase.from("secretaria_actions").delete().eq("id", aId);
    toast.success("Ação removida!");
    fetchAll();
  };

  if (authLoading || loading) return (
    <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AppLayout>
  );

  if (!secretaria) return (
    <AppLayout><div className="text-center py-20 text-muted-foreground">Secretaria não encontrada.</div></AppLayout>
  );

  const coordenadores = members.filter(m => m.member_role === "coordenador");
  const participantes = members.filter(m => m.member_role === "participante");
  const memberIds = new Set(members.map(m => m.associate_id));
  const availableAssociates = associates.filter(a => !memberIds.has(a.id));

  return (
    <AppLayout>
      <div className="mb-6">
        <Link to="/app/secretarias" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{secretaria.icon}</span>
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl font-bold">{secretaria.name}</h1>
            {secretaria.description && <p className="text-sm text-muted-foreground mt-0.5">{secretaria.description}</p>}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-t-4" style={{ borderTopColor: "hsl(var(--primary))" }}>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-primary">{coordenadores.length}</div>
            <div className="text-xs text-muted-foreground">Coordenador{coordenadores.length !== 1 ? "es" : ""}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4" style={{ borderTopColor: "hsl(var(--secondary))" }}>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-secondary">{participantes.length}</div>
            <div className="text-xs text-muted-foreground">Participante{participantes.length !== 1 ? "s" : ""}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4" style={{ borderTopColor: "hsl(var(--accent))" }}>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold" style={{ color: "hsl(var(--accent-dark))" }}>{actions.length}</div>
            <div className="text-xs text-muted-foreground">Ações</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="membros" className="space-y-4">
        <TabsList>
          <TabsTrigger value="membros"><UserPlus className="w-4 h-4 mr-1" /> Membros</TabsTrigger>
          <TabsTrigger value="responsabilidades"><ClipboardList className="w-4 h-4 mr-1" /> Responsabilidades</TabsTrigger>
          <TabsTrigger value="acoes"><Activity className="w-4 h-4 mr-1" /> Ações</TabsTrigger>
        </TabsList>

        {/* MEMBROS */}
        <TabsContent value="membros">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Membros</CardTitle>
              <Button size="sm" onClick={() => setMemberOpen(true)} disabled={availableAssociates.length === 0}>
                <UserPlus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Nenhum membro adicionado.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Função</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {members.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.associate_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={m.member_role === "coordenador" ? "bg-primary/10 text-primary" : ""}>
                            {ROLE_LABELS[m.member_role]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Remover membro?</AlertDialogTitle><AlertDialogDescription>Remover {m.associate_name} desta secretaria?</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveMember(m.id)} className="bg-destructive text-destructive-foreground">Remover</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RESPONSABILIDADES */}
        <TabsContent value="responsabilidades">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Responsabilidades</CardTitle>
              <Button size="sm" onClick={openAddResp}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
            </CardHeader>
            <CardContent>
              {responsibilities.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Nenhuma responsabilidade cadastrada.</p>
              ) : (
                <div className="space-y-3">
                  {responsibilities.map((r, i) => (
                    <div key={r.id} className="flex items-start justify-between p-3 border rounded-lg group">
                      <div className="flex gap-3">
                        <span className="text-sm font-bold text-muted-foreground mt-0.5">{i + 1}.</span>
                        <div>
                          <div className="font-medium">{r.title}</div>
                          {r.description && <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditResp(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteResp(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AÇÕES */}
        <TabsContent value="acoes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Ações</CardTitle>
              <Button size="sm" onClick={openAddAction}><Plus className="w-4 h-4 mr-1" /> Publicar Ação</Button>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Nenhuma ação publicada.</p>
              ) : (
                <div className="space-y-3">
                  {actions.map(a => (
                    <div key={a.id} className="flex items-start justify-between p-4 border rounded-lg group">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{a.title}</span>
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[a.action_status]}`}>{STATUS_LABELS[a.action_status]}</Badge>
                        </div>
                        {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          {a.action_date && <span>📅 {new Date(a.action_date).toLocaleDateString("pt-BR")}</span>}
                          {a.publisher_name && <span>👤 {a.publisher_name}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAction(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir ação?</AlertDialogTitle><AlertDialogDescription>Excluir "{a.title}"?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteAction(a.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Membro</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Associado</Label>
              <Select value={memberForm.associate_id} onValueChange={v => setMemberForm(f => ({ ...f, associate_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {availableAssociates.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={memberForm.member_role} onValueChange={v => setMemberForm(f => ({ ...f, member_role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="coordenador">Coordenador</SelectItem>
                  <SelectItem value="participante">Participante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMemberOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddMember} disabled={!memberForm.associate_id}>Adicionar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Responsibility Dialog */}
      <Dialog open={respOpen} onOpenChange={setRespOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRespId ? "Editar" : "Nova"} Responsabilidade</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveResp} className="space-y-4">
            <div className="space-y-2"><Label>Título *</Label><Input required value={respForm.title} onChange={e => setRespForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={respForm.description} onChange={e => setRespForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <Button type="submit" className="w-full">{editRespId ? "Atualizar" : "Adicionar"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editActionId ? "Editar" : "Publicar"} Ação</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveAction} className="space-y-4">
            <div className="space-y-2"><Label>Título *</Label><Input required value={actionForm.title} onChange={e => setActionForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={actionForm.description} onChange={e => setActionForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={actionForm.action_status} onValueChange={v => setActionForm(f => ({ ...f, action_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejada">Planejada</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={actionForm.action_date} onChange={e => setActionForm(f => ({ ...f, action_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Publicado por</Label>
              <Select value={actionForm.published_by} onValueChange={v => setActionForm(f => ({ ...f, published_by: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {members.map(m => <SelectItem key={m.associate_id} value={m.associate_id}>{m.associate_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">{editActionId ? "Atualizar" : "Publicar"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SecretariaDetalhe;
