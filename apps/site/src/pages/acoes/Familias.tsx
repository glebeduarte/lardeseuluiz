import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/app/AppLayout";
import BuscaPessoa from "@/components/acoes/BuscaPessoa";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Search, Trash2, ShieldCheck } from "lucide-react";
import { db, dataBR, useMinhaPessoa, useNomesPessoas, type Familia, type PessoaBasica } from "@/lib/acoes";

type Membro = { id?: string; name: string; relation: string; birth_date: string };
type FamiliaLista = Familia & { project_families: { left_on: string | null; projects: { name: string } | null }[] };

const vazio = () => ({
  name: "", phone: "", endereco: "", neighborhood: "", notes: "", is_active: true, consentiu: false,
  responsavel: null as PessoaBasica | null, membros: [] as Membro[],
});

export default function Familias() {
  const qc = useQueryClient();
  const { user, simulacao } = useAuth();
  const { data: eu } = useMinhaPessoa(user?.id, simulacao?.personId);
  const [busca, setBusca] = useState("");
  const [mostrarInativas, setMostrarInativas] = useState(false);
  const [dlg, setDlg] = useState(false);
  const [editando, setEditando] = useState<FamiliaLista | null>(null);
  const [f, setF] = useState(vazio());

  const { data: familias = [], isLoading } = useQuery({
    queryKey: ["familias"],
    queryFn: async () => {
      const { data, error } = await db.from("families").select("*, project_families(left_on, projects(name))").order("name");
      if (error) throw error;
      return (data ?? []) as FamiliaLista[];
    },
  });
  const { data: nomesResp = {} } = useNomesPessoas(familias.map((x) => x.responsible_person_id));

  const filtradas = familias.filter((x) =>
    (mostrarInativas || x.is_active) &&
    (!busca.trim() || `${x.name} ${x.neighborhood ?? ""}`.toLowerCase().includes(busca.trim().toLowerCase())));

  const abrirNova = () => { setEditando(null); setF(vazio()); setDlg(true); };
  const abrirEdicao = async (x: FamiliaLista) => {
    setEditando(x);
    const { data: membros } = await db.from("family_members").select("id, name, relation, birth_date").eq("family_id", x.id).order("created_at");
    setF({
      name: x.name, phone: x.phone ?? "", endereco: x.address?.texto ?? "", neighborhood: x.neighborhood ?? "", notes: x.notes ?? "",
      is_active: x.is_active, consentiu: !!x.consent_given_at,
      responsavel: x.responsible_person_id ? (nomesResp[x.responsible_person_id] ?? { id: x.responsible_person_id, full_name: "Responsável", phone: null }) : null,
      membros: ((membros ?? []) as Membro[]).map((m) => ({ ...m, relation: m.relation ?? "", birth_date: m.birth_date ?? "" })),
    });
    setDlg(true);
  };

  const salvar = useMutation({
    mutationFn: async () => {
      if (!f.name.trim()) throw new Error("Informe o nome da família");
      if (!f.consentiu) throw new Error("Registre que a família autorizou o cadastro (LGPD) antes de salvar.");
      const membros = f.membros.filter((m) => m.name.trim());
      const payload = {
        name: f.name.trim(), phone: f.phone.trim() || null, address: f.endereco.trim() ? { texto: f.endereco.trim() } : null,
        neighborhood: f.neighborhood.trim() || null, notes: f.notes.trim() || null, is_active: f.is_active,
        responsible_person_id: f.responsavel?.id ?? null, members_count: membros.length + (f.responsavel ? 1 : 0) || null,
        ...(editando?.consent_given_at ? {} : { consent_given_at: new Date().toISOString(), consent_registered_by: eu?.id ?? null }),
      };
      let familyId = editando?.id;
      if (editando) {
        const { error } = await db.from("families").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { data, error } = await db.from("families").insert(payload).select("id").single();
        if (error) throw error;
        familyId = data.id;
      }
      // Membros: atualiza os existentes, inclui os novos e tira os que saíram da lista
      const { data: atuais } = await db.from("family_members").select("id").eq("family_id", familyId);
      const manter = new Set(membros.filter((m) => m.id).map((m) => m.id));
      const sair = ((atuais ?? []) as { id: string }[]).filter((m) => !manter.has(m.id)).map((m) => m.id);
      if (sair.length) await db.from("family_members").delete().in("id", sair);
      for (const m of membros) {
        const linha = { family_id: familyId, name: m.name.trim(), relation: m.relation.trim() || null, birth_date: m.birth_date || null };
        const { error } = m.id ? await db.from("family_members").update(linha).eq("id", m.id) : await db.from("family_members").insert(linha);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["familias"] }); toast.success(editando ? "Família atualizada!" : "Família cadastrada!"); setDlg(false); },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const ajustarMembro = (i: number, campos: Partial<Membro>) =>
    setF((s) => ({ ...s, membros: s.membros.map((m, j) => (j === i ? { ...m, ...campos } : m)) }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link to="/app/acoes" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Ações Sociais
          </Link>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">Famílias atendidas</h1>
              <p className="text-sm text-muted-foreground">Cadastro das famílias acompanhadas pelas ações sociais. {filtradas.length} de {familias.length}.</p>
            </div>
            <Button onClick={abrirNova}><Plus className="w-4 h-4 mr-2" /> Nova família</Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome ou bairro" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={mostrarInativas} onCheckedChange={setMostrarInativas} /> Mostrar inativas
          </label>
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Família</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead>Pessoas</TableHead>
                <TableHead>Ações</TableHead>
                <TableHead>LGPD</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtradas.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma família cadastrada.</TableCell></TableRow>
              ) : filtradas.map((x) => (
                <TableRow key={x.id} className={x.is_active ? "" : "opacity-60"}>
                  <TableCell>
                    <div className="font-medium">{x.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[x.responsible_person_id ? nomesResp[x.responsible_person_id]?.full_name : null, x.phone].filter(Boolean).join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{x.neighborhood || "-"}</TableCell>
                  <TableCell className="text-sm">{x.members_count ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {x.project_families.filter((v) => !v.left_on).map((v, i) => <Badge key={i} variant="outline" className="text-[10px]">{v.projects?.name}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {x.consent_given_at
                      ? <span className="text-xs text-emerald-800 inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> {dataBR(x.consent_given_at)}</span>
                      : <span className="text-xs text-amber-700">Pendente</span>}
                  </TableCell>
                  <TableCell><Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEdicao(x)}><Pencil className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar família" : "Nova família"}</DialogTitle>
            <DialogDescription>Guarde só o necessário para o acompanhamento. Os dados ficam visíveis apenas para quem opera as ações sociais.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Nome da família *</Label><Input placeholder="Ex.: Família Silva" value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Telefone</Label><Input value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2">
              <Label>Responsável (do cadastro de pessoas)</Label>
              <BuscaPessoa valor={f.responsavel} onEscolher={(p) => setF((s) => ({ ...s, responsavel: p }))} placeholder="Opcional: busque pelo nome" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
              <div className="grid gap-2"><Label>Endereço</Label><Input value={f.endereco} onChange={(e) => setF((s) => ({ ...s, endereco: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Bairro</Label><Input value={f.neighborhood} onChange={(e) => setF((s) => ({ ...s, neighborhood: e.target.value }))} /></div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Outras pessoas da família</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setF((s) => ({ ...s, membros: [...s.membros, { name: "", relation: "", birth_date: "" }] }))}>
                  <Plus className="w-4 h-4 mr-1" /> Incluir
                </Button>
              </div>
              {f.membros.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma pessoa incluída.</p>}
              {f.membros.map((m, i) => (
                <div key={m.id ?? i} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2">
                  <Input placeholder="Nome" value={m.name} onChange={(e) => ajustarMembro(i, { name: e.target.value })} />
                  <Input placeholder="Parentesco" value={m.relation} onChange={(e) => ajustarMembro(i, { relation: e.target.value })} />
                  <Input type="date" value={m.birth_date} onChange={(e) => ajustarMembro(i, { birth_date: e.target.value })} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setF((s) => ({ ...s, membros: s.membros.filter((_, j) => j !== i) }))}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid gap-2"><Label>Observações</Label><Textarea rows={3} value={f.notes} onChange={(e) => setF((s) => ({ ...s, notes: e.target.value }))} /></div>

            <div className="rounded-md border p-3 space-y-3 bg-muted/30">
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={f.consentiu} disabled={!!editando?.consent_given_at} onCheckedChange={(v) => setF((s) => ({ ...s, consentiu: !!v }))} className="mt-0.5" />
                <span>
                  A família autorizou o cadastro dos seus dados para o acompanhamento nas ações sociais (LGPD).
                  {editando?.consent_given_at && <span className="block text-xs text-muted-foreground">Registrado em {dataBR(editando.consent_given_at)}.</span>}
                </span>
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={f.is_active} onCheckedChange={(v) => setF((s) => ({ ...s, is_active: v }))} /> Família ativa
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(false)}>Cancelar</Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>{salvar.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
