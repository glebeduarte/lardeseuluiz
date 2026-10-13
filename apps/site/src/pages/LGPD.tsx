import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/app/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, FileCheck, AlertTriangle, CheckCircle } from "lucide-react";

const consentTypeLabels: Record<string, string> = {
  dados_pessoais: "Dados Pessoais", comunicacao: "Comunicação", imagem: "Uso de Imagem",
  dados_saude: "Dados de Saúde", cookies: "Cookies",
};
const consentStatusLabels: Record<string, string> = {
  concedido: "Concedido", revogado: "Revogado", pendente: "Pendente",
};
const dsarTypeLabels: Record<string, string> = {
  acesso: "Acesso", retificacao: "Retificação", exclusao: "Exclusão",
  portabilidade: "Portabilidade", oposicao: "Oposição",
};
const dsarStatusLabels: Record<string, string> = {
  aberta: "Aberta", em_analise: "Em Análise", concluida: "Concluída", recusada: "Recusada",
};

interface Associate { id: string; full_name: string; }
interface Consent { id: string; associate_id: string; consent_type: string; consent_status: string; consent_date: string | null; revocation_date: string | null; notes: string | null; }
interface DataRequest { id: string; associate_id: string | null; request_type: string; request_status: string; description: string | null; response_text: string | null; requested_at: string; responded_at: string | null; }

const LGPD = () => {
  const { user, loading: authLoading, roles } = useAuth();
  const navigate = useNavigate();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [loading, setLoading] = useState(true);
  const [consentDialog, setConsentDialog] = useState(false);
  const [requestDialog, setRequestDialog] = useState(false);
  const [responseDialog, setResponseDialog] = useState<DataRequest | null>(null);
  const [consentForm, setConsentForm] = useState({ associate_id: "", consent_type: "dados_pessoais", consent_status: "pendente", notes: "" });
  const [requestForm, setRequestForm] = useState({ associate_id: "", request_type: "acesso", description: "" });
  const [responseText, setResponseText] = useState("");

  const isAdmin = roles.includes("admin");

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    const [cRes, rRes, aRes] = await Promise.all([
      supabase.from("lgpd_consents").select("*").order("created_at", { ascending: false }),
      supabase.from("data_requests").select("*").order("requested_at", { ascending: false }),
      supabase.from("associates").select("id, full_name").order("full_name"),
    ]);
    setConsents((cRes.data || []) as Consent[]);
    setRequests((rRes.data || []) as DataRequest[]);
    setAssociates((aRes.data || []) as Associate[]);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const getAssocName = (id: string | null) => associates.find(a => a.id === id)?.full_name || "—";

  const handleAddConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      associate_id: consentForm.associate_id,
      consent_type: consentForm.consent_type as any,
      consent_status: consentForm.consent_status as any,
      consent_date: consentForm.consent_status === "concedido" ? new Date().toISOString() : null,
      notes: consentForm.notes || null,
    };
    const { error } = await supabase.from("lgpd_consents").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Consentimento registrado!");
    setConsentDialog(false);
    setConsentForm({ associate_id: "", consent_type: "dados_pessoais", consent_status: "pendente", notes: "" });
    fetchData();
  };

  const handleRevokeConsent = async (id: string) => {
    const { error } = await supabase.from("lgpd_consents").update({
      consent_status: "revogado" as any, revocation_date: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Consentimento revogado.");
    fetchData();
  };

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      associate_id: requestForm.associate_id || null,
      request_type: requestForm.request_type as any,
      description: requestForm.description || null,
      created_by: user?.id,
    };
    const { error } = await supabase.from("data_requests").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Solicitação registrada!");
    setRequestDialog(false);
    setRequestForm({ associate_id: "", request_type: "acesso", description: "" });
    fetchData();
  };

  const handleRespond = async () => {
    if (!responseDialog) return;
    const { error } = await supabase.from("data_requests").update({
      request_status: "concluida" as any,
      response_text: responseText,
      responded_at: new Date().toISOString(),
    }).eq("id", responseDialog.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Resposta registrada!");
    setResponseDialog(null);
    setResponseText("");
    fetchData();
  };

  const stats = {
    totalConsents: consents.length,
    concedidos: consents.filter(c => c.consent_status === "concedido").length,
    pendentes: consents.filter(c => c.consent_status === "pendente").length,
    requestsOpen: requests.filter(r => r.request_status === "aberta" || r.request_status === "em_analise").length,
  };

  if (authLoading || loading) return (
    <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AppLayout>
  );

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Playfair_Display'] text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" /> Conformidade LGPD
        </h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Consentimentos", value: stats.totalConsents, icon: <FileCheck className="w-5 h-5 text-primary" /> },
          { label: "Concedidos", value: stats.concedidos, icon: <CheckCircle className="w-5 h-5 text-secondary" /> },
          { label: "Pendentes", value: stats.pendentes, icon: <AlertTriangle className="w-5 h-5 text-accent" /> },
          { label: "Solicitações Abertas", value: stats.requestsOpen, icon: <Shield className="w-5 h-5 text-destructive" /> },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
              <div className="mt-1">{s.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="consents">
        <TabsList className="mb-4">
          <TabsTrigger value="consents">Consentimentos</TabsTrigger>
          <TabsTrigger value="requests">Solicitações (DSAR)</TabsTrigger>
        </TabsList>

        <TabsContent value="consents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-['Playfair_Display']">Registro de Consentimentos</CardTitle>
              {isAdmin && (
                <Dialog open={consentDialog} onOpenChange={setConsentDialog}>
                  <DialogTrigger asChild><Button size="sm">+ Consentimento</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Registrar Consentimento</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddConsent} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Associado *</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required value={consentForm.associate_id} onChange={e => setConsentForm(f => ({ ...f, associate_id: e.target.value }))}>
                          <option value="">Selecione...</option>
                          {associates.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={consentForm.consent_type} onChange={e => setConsentForm(f => ({ ...f, consent_type: e.target.value }))}>
                            {Object.entries(consentTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={consentForm.consent_status} onChange={e => setConsentForm(f => ({ ...f, consent_status: e.target.value }))}>
                            {Object.entries(consentStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea value={consentForm.notes} onChange={e => setConsentForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                      </div>
                      <Button type="submit" className="w-full">Salvar</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {consents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum consentimento registrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Associado</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data Consentimento</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consents.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{getAssocName(c.associate_id)}</TableCell>
                          <TableCell>{consentTypeLabels[c.consent_type] || c.consent_type}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              c.consent_status === "concedido" ? "bg-secondary/10 text-secondary" :
                              c.consent_status === "revogado" ? "bg-destructive/10 text-destructive" :
                              "bg-accent/10 text-accent-foreground"
                            }`}>
                              {consentStatusLabels[c.consent_status]}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {c.consent_date ? new Date(c.consent_date).toLocaleDateString("pt-BR") : "—"}
                          </TableCell>
                          <TableCell>
                            {isAdmin && c.consent_status === "concedido" && (
                              <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleRevokeConsent(c.id)}>
                                Revogar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-['Playfair_Display']">Solicitações de Titulares (DSAR)</CardTitle>
              {isAdmin && (
                <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
                  <DialogTrigger asChild><Button size="sm">+ Solicitação</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Registrar Solicitação</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddRequest} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Associado</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={requestForm.associate_id} onChange={e => setRequestForm(f => ({ ...f, associate_id: e.target.value }))}>
                          <option value="">Selecione...</option>
                          {associates.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Solicitação</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={requestForm.request_type} onChange={e => setRequestForm(f => ({ ...f, request_type: e.target.value }))}>
                          {Object.entries(dsarTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea value={requestForm.description} onChange={e => setRequestForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                      </div>
                      <Button type="submit" className="w-full">Registrar</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma solicitação registrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titular</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{getAssocName(r.associate_id)}</TableCell>
                          <TableCell>{dsarTypeLabels[r.request_type] || r.request_type}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.request_status === "concluida" ? "bg-secondary/10 text-secondary" :
                              r.request_status === "recusada" ? "bg-destructive/10 text-destructive" :
                              r.request_status === "em_analise" ? "bg-accent/10 text-accent-foreground" :
                              "bg-primary/10 text-primary"
                            }`}>
                              {dsarStatusLabels[r.request_status]}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{new Date(r.requested_at).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>
                            {isAdmin && (r.request_status === "aberta" || r.request_status === "em_analise") && (
                              <Button variant="outline" size="sm" onClick={() => { setResponseDialog(r); setResponseText(r.response_text || ""); }}>
                                Responder
                              </Button>
                            )}
                            {r.response_text && (
                              <Button variant="ghost" size="sm" className="ml-1" onClick={() => { setResponseDialog(r); setResponseText(r.response_text || ""); }}>
                                Ver
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Response dialog */}
      <Dialog open={!!responseDialog} onOpenChange={() => setResponseDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resposta à Solicitação</DialogTitle></DialogHeader>
          {responseDialog && (
            <div className="space-y-4">
              <div className="text-sm">
                <div><span className="font-medium">Titular:</span> {getAssocName(responseDialog.associate_id)}</div>
                <div><span className="font-medium">Tipo:</span> {dsarTypeLabels[responseDialog.request_type]}</div>
                {responseDialog.description && <div><span className="font-medium">Descrição:</span> {responseDialog.description}</div>}
              </div>
              <div className="space-y-2">
                <Label>Resposta</Label>
                <Textarea value={responseText} onChange={e => setResponseText(e.target.value)} rows={4}
                  disabled={responseDialog.request_status === "concluida" || responseDialog.request_status === "recusada"} />
              </div>
              {isAdmin && (responseDialog.request_status === "aberta" || responseDialog.request_status === "em_analise") && (
                <Button className="w-full" onClick={handleRespond}>Concluir Solicitação</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default LGPD;
