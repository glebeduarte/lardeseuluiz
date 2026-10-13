import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Download, FileText, Trash2 } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";

const docTypeLabels: Record<string, string> = {
  ata: "Ata", balancete: "Balancete", regulamento: "Regulamento",
  estatuto: "Estatuto", relatorio: "Relatório", outro: "Outro",
};

const Documentos = () => {
  const { user, roles } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: "", doc_type: "outro", description: "", is_public: false, reference_date: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isAdmin = roles.includes("admin") || roles.includes("gestor");

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchDocs(); }, [user]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { toast.error("Selecione um arquivo."); return; }
    setUploading(true);

    const fileExt = selectedFile.name.split(".").pop();
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, selectedFile);
    if (uploadError) { toast.error("Erro no upload: " + uploadError.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);

    const { error } = await supabase.from("documents").insert({
      title: form.title,
      doc_type: form.doc_type as any,
      description: form.description || null,
      is_public: form.is_public,
      reference_date: form.reference_date || null,
      file_url: urlData.publicUrl,
      file_name: selectedFile.name,
      file_size: selectedFile.size,
      uploaded_by: user?.id,
    });

    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Documento enviado!");
    setDialogOpen(false);
    setForm({ title: "", doc_type: "outro", description: "", is_public: false, reference_date: "" });
    setSelectedFile(null);
    fetchDocs();
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm("Excluir este documento?")) return;
    // Extract path from URL
    const path = fileUrl.split("/documents/")[1];
    if (path) await supabase.storage.from("documents").remove([path]);
    await supabase.from("documents").delete().eq("id", id);
    toast.success("Documento excluído.");
    fetchDocs();
  };

  const fmtSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AppLayout>;

  return (
    <AppLayout>
      <h1 className="font-['Playfair_Display'] text-2xl font-bold mb-6">Documentos</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Acervo Documental</CardTitle>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Upload className="w-4 h-4 mr-1" /> Enviar documento</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Enviar Documento</DialogTitle></DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="space-y-2"><Label>Título *</Label><Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.doc_type} onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))}>
                        {Object.entries(docTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2"><Label>Data referência</Label><Input type="date" value={form.reference_date} onChange={e => setForm(f => ({ ...f, reference_date: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="is_public" checked={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} />
                    <label htmlFor="is_public" className="text-sm">Documento público (visível no site)</label>
                  </div>
                  <div className="space-y-2">
                    <Label>Arquivo *</Label>
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png" required onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="text-sm" />
                  </div>
                  <Button type="submit" className="w-full" disabled={uploading}>
                    {uploading ? "Enviando..." : "Enviar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum documento enviado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Data ref.</TableHead>
                    <TableHead>Visibilidade</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{d.title}</div>
                            <div className="text-xs text-muted-foreground">{d.file_name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><span className="badge badge-blue">{docTypeLabels[d.doc_type] || d.doc_type}</span></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtSize(d.file_size)}</TableCell>
                      <TableCell className="text-sm">{d.reference_date ? new Date(d.reference_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell><span className={`badge ${d.is_public ? "badge-teal" : "badge-grey"}`}>{d.is_public ? "Público" : "Interno"}</span></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <a href={d.file_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon"><Download className="w-4 h-4" /></Button></a>
                          {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id, d.file_url)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
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

export default Documentos;
