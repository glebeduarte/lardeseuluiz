import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, UserCheck, Vote, Download, Plus } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";

const voteLabels: Record<string, string> = { sim: "✅ Sim", nao: "❌ Não", abstencao: "⬜ Abstenção" };

const AssembleiaDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin") || roles.includes("gestor");

  const [assembly, setAssembly] = useState<any>(null);
  const [agendaItems, setAgendaItems] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [associates, setAssociates] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agendaDialog, setAgendaDialog] = useState(false);
  const [attendeeDialog, setAttendeeDialog] = useState(false);
  const [agendaForm, setAgendaForm] = useState({ title: "", description: "", requires_vote: false });

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    const [asmRes, agRes, attRes, assocRes, votesRes] = await Promise.all([
      supabase.from("assemblies").select("*").eq("id", id).single(),
      supabase.from("agenda_items").select("*").eq("assembly_id", id).order("item_order"),
      supabase.from("assembly_attendees").select("*, associates(full_name)").eq("assembly_id", id),
      supabase.from("associates").select("id, full_name").eq("status", "ativo").order("full_name"),
      supabase.from("votes").select("*, agenda_items!inner(assembly_id)").eq("agenda_items.assembly_id", id),
    ]);
    setAssembly(asmRes.data);
    setAgendaItems(agRes.data || []);
    setAttendees(attRes.data || []);
    setAssociates(assocRes.data || []);
    setVotes(votesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { if (user && id) fetchAll(); }, [user, id]);

  // Realtime votes
  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`votes-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "assembly_attendees" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleAddAgendaItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("agenda_items").insert({
      assembly_id: id,
      title: agendaForm.title,
      description: agendaForm.description || null,
      requires_vote: agendaForm.requires_vote,
      item_order: agendaItems.length + 1,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Item adicionado à pauta!");
    setAgendaDialog(false);
    setAgendaForm({ title: "", description: "", requires_vote: false });
    fetchAll();
  };

  const handleCheckIn = async (associateId: string) => {
    const { error } = await supabase.from("assembly_attendees").insert({ assembly_id: id, associate_id: associateId });
    if (error) { toast.error(error.code === "23505" ? "Já registrado!" : error.message); return; }
    toast.success("Presença registrada!");
    fetchAll();
  };

  const handleVote = async (agendaItemId: string, associateId: string, voteOption: string) => {
    const { error } = await supabase.from("votes").insert({
      agenda_item_id: agendaItemId,
      associate_id: associateId,
      vote: voteOption as any,
    });
    if (error) { toast.error(error.code === "23505" ? "Voto já registrado!" : error.message); return; }
    toast.success("Voto registrado!");
    fetchAll();
  };

  const handleStatusChange = async (status: string) => {
    await supabase.from("assemblies").update({ status: status as any }).eq("id", id);
    toast.success(`Assembleia ${status === "em_andamento" ? "iniciada" : status === "encerrada" ? "encerrada" : "atualizada"}!`);
    fetchAll();
  };

  const generateMinutes = () => {
    if (!assembly) return "";
    const date = new Date(assembly.scheduled_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const quorumPct = associates.length > 0 ? ((attendees.length / associates.length) * 100).toFixed(1) : "0";

    let text = `ATA DA ASSEMBLEIA GERAL ${assembly.assembly_type === "extraordinaria" ? "EXTRAORDINÁRIA" : "ORDINÁRIA"}\n`;
    text += `${assembly.title}\n\n`;
    text += `Data: ${date}\n`;
    text += `Local: ${assembly.location || "Sede do Lar de Seu Luiz"}\n`;
    text += `Presentes: ${attendees.length} de ${associates.length} associados ativos (${quorumPct}%)\n`;
    text += `Quórum exigido: ${assembly.quorum_required}%\n`;
    text += `Quórum ${parseFloat(quorumPct) >= assembly.quorum_required ? "ATINGIDO ✓" : "NÃO ATINGIDO ✗"}\n\n`;

    text += `LISTA DE PRESENÇA:\n`;
    attendees.forEach((a, i) => { text += `${i + 1}. ${(a.associates as any)?.full_name || "—"}\n`; });
    text += `\n`;

    text += `ORDEM DO DIA:\n\n`;
    agendaItems.forEach((item, i) => {
      text += `${i + 1}. ${item.title}\n`;
      if (item.description) text += `   ${item.description}\n`;
      if (item.requires_vote) {
        const itemVotes = votes.filter(v => v.agenda_item_id === item.id);
        const sim = itemVotes.filter(v => v.vote === "sim").length;
        const nao = itemVotes.filter(v => v.vote === "nao").length;
        const abs = itemVotes.filter(v => v.vote === "abstencao").length;
        text += `   VOTAÇÃO: ${sim} SIM | ${nao} NÃO | ${abs} ABSTENÇÃO\n`;
        text += `   RESULTADO: ${sim > nao ? "APROVADO" : sim < nao ? "REJEITADO" : "EMPATE"}\n`;
      }
      text += `\n`;
    });

    text += `\nNada mais havendo a tratar, foi encerrada a sessão, da qual eu, secretário(a), lavrei a presente ata.\n`;
    return text;
  };

  const handleDownloadMinutes = async () => {
    const text = generateMinutes();
    await supabase.from("assemblies").update({ minutes_text: text }).eq("id", id);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ata-${assembly?.title?.replace(/\s+/g, "-").toLowerCase() || "assembleia"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Ata gerada e salva!");
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AppLayout>;
  if (!assembly) return <AppLayout><div className="text-center py-20 text-muted-foreground">Assembleia não encontrada.</div></AppLayout>;

  const quorumPct = associates.length > 0 ? ((attendees.length / associates.length) * 100) : 0;
  const quorumMet = quorumPct >= assembly.quorum_required;
  const attendeeIds = new Set(attendees.map(a => a.associate_id));

  return (
    <AppLayout>
      <button onClick={() => navigate("/app/assembleias")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-['Playfair_Display'] text-2xl font-bold">{assembly.title}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className={`badge ${assembly.status === "encerrada" ? "badge-teal" : assembly.status === "em_andamento" ? "badge-gold" : "badge-blue"}`}>
              {assembly.status === "convocada" ? "Convocada" : assembly.status === "em_andamento" ? "Em andamento" : assembly.status === "encerrada" ? "Encerrada" : "Cancelada"}
            </span>
            <span>{new Date(assembly.scheduled_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {assembly.status === "convocada" && <Button onClick={() => handleStatusChange("em_andamento")}>▶ Iniciar</Button>}
            {assembly.status === "em_andamento" && <Button variant="secondary" onClick={() => handleStatusChange("encerrada")}>⏹ Encerrar</Button>}
            {assembly.status === "encerrada" && <Button variant="outline" onClick={handleDownloadMinutes}><Download className="w-4 h-4 mr-1" /> Gerar Ata</Button>}
          </div>
        )}
      </div>

      {/* Quorum bar */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Quórum</span>
            <span className={`text-sm font-bold ${quorumMet ? "text-green-600" : "text-amber-600"}`}>
              {attendees.length}/{associates.length} ({quorumPct.toFixed(0)}%) — {quorumMet ? "✓ Atingido" : `Faltam ${Math.ceil(associates.length * assembly.quorum_required / 100) - attendees.length}`}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{
              width: `${Math.min(quorumPct, 100)}%`,
              background: quorumMet ? "hsl(var(--secondary))" : "hsl(var(--accent))"
            }} />
          </div>
          <div className="relative h-0">
            <div className="absolute top-0 h-3 border-l-2 border-dashed border-foreground/30" style={{ left: `${assembly.quorum_required}%`, transform: "translateY(-12px)" }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Attendance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base"><UserCheck className="w-4 h-4 inline mr-1" /> Presença ({attendees.length})</CardTitle>
            {isAdmin && (assembly.status === "convocada" || assembly.status === "em_andamento") && (
              <Dialog open={attendeeDialog} onOpenChange={setAttendeeDialog}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-3 h-3" /></Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar Presença</DialogTitle></DialogHeader>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {associates.filter(a => !attendeeIds.has(a.id)).map(a => (
                      <button key={a.id} onClick={() => { handleCheckIn(a.id); setAttendeeDialog(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-sm font-medium">
                        {a.full_name}
                      </button>
                    ))}
                    {associates.filter(a => !attendeeIds.has(a.id)).length === 0 && (
                      <p className="text-center text-muted-foreground py-4">Todos os associados já estão presentes.</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {attendees.map((a, i) => (
                <div key={a.id} className="flex items-center gap-2 text-sm py-1">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "hsl(var(--primary-muted))", color: "hsl(var(--primary))" }}>{i + 1}</span>
                  <span>{(a.associates as any)?.full_name}</span>
                </div>
              ))}
              {attendees.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma presença registrada.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Agenda + Voting */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">📋 Pauta ({agendaItems.length} itens)</CardTitle>
              {isAdmin && assembly.status !== "encerrada" && (
                <Dialog open={agendaDialog} onOpenChange={setAgendaDialog}>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> Adicionar</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Novo Item de Pauta</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddAgendaItem} className="space-y-4">
                      <div className="space-y-2"><Label>Título *</Label><Input required value={agendaForm.title} onChange={e => setAgendaForm(f => ({ ...f, title: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>Descrição</Label><Input value={agendaForm.description} onChange={e => setAgendaForm(f => ({ ...f, description: e.target.value }))} /></div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="req_vote" checked={agendaForm.requires_vote} onChange={e => setAgendaForm(f => ({ ...f, requires_vote: e.target.checked }))} />
                        <label htmlFor="req_vote" className="text-sm">Requer votação</label>
                      </div>
                      <Button type="submit" className="w-full">Adicionar</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {agendaItems.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item na pauta.</p>}
              {agendaItems.map((item, idx) => {
                const itemVotes = votes.filter(v => v.agenda_item_id === item.id);
                const sim = itemVotes.filter(v => v.vote === "sim").length;
                const nao = itemVotes.filter(v => v.vote === "nao").length;
                const abs = itemVotes.filter(v => v.vote === "abstencao").length;
                const totalVotes = sim + nao + abs;

                return (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "hsl(var(--primary-muted))", color: "hsl(var(--primary))" }}>{idx + 1}</span>
                      <div className="flex-1">
                        <div className="font-semibold">{item.title}</div>
                        {item.description && <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>}

                        {item.requires_vote && (
                          <div className="mt-3">
                            {assembly.status === "em_andamento" && isAdmin && (
                              <div className="mb-3">
                                <div className="text-xs font-semibold text-muted-foreground mb-2">Votar por associado presente:</div>
                                <div className="flex flex-wrap gap-1">
                                  {attendees.filter(a => !itemVotes.some(v => v.associate_id === a.associate_id)).map(a => (
                                    <div key={a.associate_id} className="flex items-center gap-1 border rounded-lg px-2 py-1 text-xs">
                                      <span className="font-medium mr-1">{(a.associates as any)?.full_name?.split(" ")[0]}</span>
                                      {["sim", "nao", "abstencao"].map(opt => (
                                        <button key={opt} onClick={() => handleVote(item.id, a.associate_id, opt)}
                                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold hover:opacity-80"
                                          style={{ background: opt === "sim" ? "hsl(var(--secondary-muted))" : opt === "nao" ? "hsl(var(--destructive-muted))" : "hsl(var(--muted))" }}>
                                          {opt === "sim" ? "S" : opt === "nao" ? "N" : "A"}
                                        </button>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {totalVotes > 0 && (
                              <div className="space-y-1">
                                <div className="flex gap-4 text-sm">
                                  <span className="font-semibold" style={{ color: "hsl(var(--secondary))" }}>✅ {sim}</span>
                                  <span className="font-semibold" style={{ color: "hsl(var(--destructive))" }}>❌ {nao}</span>
                                  <span className="text-muted-foreground">⬜ {abs}</span>
                                  <span className="ml-auto text-xs text-muted-foreground">{totalVotes} votos</span>
                                </div>
                                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                                  {sim > 0 && <div style={{ width: `${(sim / totalVotes) * 100}%`, background: "hsl(var(--secondary))" }} />}
                                  {nao > 0 && <div style={{ width: `${(nao / totalVotes) * 100}%`, background: "hsl(var(--destructive))" }} />}
                                  {abs > 0 && <div style={{ width: `${(abs / totalVotes) * 100}%`, background: "hsl(var(--muted-foreground))" }} />}
                                </div>
                                {(assembly.status === "encerrada") && (
                                  <div className="text-xs font-bold mt-1" style={{ color: sim > nao ? "hsl(var(--secondary))" : "hsl(var(--destructive))" }}>
                                    {sim > nao ? "APROVADO" : sim < nao ? "REJEITADO" : "EMPATE"}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default AssembleiaDetalhe;
