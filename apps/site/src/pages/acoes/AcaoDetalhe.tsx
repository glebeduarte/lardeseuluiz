import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/app/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, ChevronRight, Check, X, Stethoscope, ExternalLink, UserMinus } from "lucide-react";
import {
  db, dataBR, hoje, EDICAO_LABEL, EDICAO_COR, CANDIDATURA_LABEL, CANDIDATURA_COR, useNomesPessoas,
  type Edicao, type EdicaoStatus, type CandidaturaStatus, type Familia,
} from "@/lib/acoes";

interface Projeto { id: string; name: string; slug: string | null; schedule: string | null; is_public: boolean; has_health_records: boolean; summary: string | null }

const formVazio = () => ({ title: "", starts_on: "", start_time: "", location: "", status: "planejada" as EdicaoStatus, volunteers_needed: "", goal: "", notes: "", repetir: "1" });

export default function AcaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const aba = params.get("aba") || "edicoes";
  const qc = useQueryClient();

  const { data: projeto } = useQuery({
    queryKey: ["acao", id],
    queryFn: async () => {
      const { data, error } = await db.from("projects").select("id, name, slug, schedule, is_public, has_health_records, summary").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Projeto | null;
    },
  });

  const { data: edicoes = [] } = useQuery({
    queryKey: ["acao-edicoes", id],
    queryFn: async () => {
      const { data, error } = await db.from("project_editions").select("*").eq("project_id", id).order("starts_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Edicao[];
    },
  });

  // ---------- Edições ----------
  const [dlg, setDlg] = useState(false);
  const [editando, setEditando] = useState<Edicao | null>(null);
  const [form, setForm] = useState(formVazio());

  const abrirNova = () => {
    setEditando(null);
    setForm({ ...formVazio(), title: projeto?.name ?? "" });
    setDlg(true);
  };
  const abrirEdicao = (e: Edicao) => {
    setEditando(e);
    setForm({
      title: e.title, starts_on: e.starts_on, start_time: e.start_time ?? "", location: e.location ?? "", status: e.status,
      volunteers_needed: e.volunteers_needed != null ? String(e.volunteers_needed) : "", goal: e.goal ?? "", notes: e.notes ?? "", repetir: "1",
    });
    setDlg(true);
  };

  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.starts_on) throw new Error("Informe o nome e a data da edição");
      const base = {
        project_id: id, title: form.title.trim(), start_time: form.start_time || null, location: form.location.trim() || null,
        status: form.status, volunteers_needed: form.volunteers_needed ? Number(form.volunteers_needed) : null,
        goal: form.goal.trim() || null, notes: form.notes.trim() || null,
      };
      if (editando) {
        const { error } = await db.from("project_editions").update({ ...base, starts_on: form.starts_on }).eq("id", editando.id);
        if (error) throw error;
        return;
      }
      const vezes = Math.min(Math.max(Number(form.repetir) || 1, 1), 26);
      const linhas = Array.from({ length: vezes }, (_, i) => {
        const d = new Date(form.starts_on + "T12:00:00");
        d.setDate(d.getDate() + 7 * i);
        return { ...base, starts_on: d.toISOString().slice(0, 10) };
      });
      const { error } = await db.from("project_editions").insert(linhas);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["acao-edicoes", id] });
      qc.invalidateQueries({ queryKey: ["acoes-painel"] });
      toast.success(editando ? "Edição atualizada!" : "Edição criada!");
      setDlg(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const proximas = edicoes.filter((e) => e.starts_on >= hoje()).reverse();
  const passadas = edicoes.filter((e) => e.starts_on < hoje());

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link to="/app/acoes" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Ações Sociais
          </Link>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground flex items-center gap-2">
                {projeto?.name ?? "..."}
                {projeto?.has_health_records && <Stethoscope className="w-5 h-5 text-[hsl(var(--primary))]" />}
              </h1>
              <p className="text-sm text-muted-foreground">{projeto?.schedule || projeto?.summary}</p>
            </div>
            {projeto?.is_public && projeto.slug && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/projetos/${projeto.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" /> Ver no site</a>
              </Button>
            )}
          </div>
        </div>

        <Tabs value={aba} onValueChange={(v) => setParams({ aba: v }, { replace: true })}>
          <TabsList>
            <TabsTrigger value="edicoes">Edições</TabsTrigger>
            <TabsTrigger value="familias">Famílias atendidas</TabsTrigger>
            <TabsTrigger value="voluntarios">Voluntários</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="edicoes" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={abrirNova}><Plus className="w-4 h-4 mr-2" /> Nova edição</Button>
            </div>
            <TabelaEdicoes titulo="Próximas" lista={proximas} onEditar={abrirEdicao} vazio="Nenhuma edição marcada." />
            {passadas.length > 0 && <TabelaEdicoes titulo="Anteriores" lista={passadas} onEditar={abrirEdicao} vazio="" />}
          </TabsContent>

          <TabsContent value="familias" className="mt-4">
            {id && <FamiliasDoProjeto projetoId={id} />}
          </TabsContent>

          <TabsContent value="voluntarios" className="mt-4">
            {id && <VoluntariosDoProjeto projetoId={id} edicoes={edicoes} />}
          </TabsContent>

          <TabsContent value="relatorios" className="mt-4">
            <RelatoriosDoProjeto edicoes={passadas.filter((e) => e.status !== "cancelada")} />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar edição" : "Nova edição"}</DialogTitle>
            <DialogDescription>Cada edição é um dia da ação, com escala, entregas e relatório próprios.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Nome *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Data *</Label>
                <Input type="date" value={form.starts_on} onChange={(e) => setForm((f) => ({ ...f, starts_on: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Horário</Label>
                <Input placeholder="15h" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Situação</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as EdicaoStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(EDICAO_LABEL) as [EdicaoStatus, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Voluntários necessários</Label>
                <Input type="number" min={0} value={form.volunteers_needed} onChange={(e) => setForm((f) => ({ ...f, volunteers_needed: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Local</Label>
              <Input placeholder="Lar de Seu Luiz" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Meta</Label>
              <Input placeholder="Ex.: 120 sopas" value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            {!editando && (
              <div className="grid gap-2 w-48">
                <Label>Repetir por quantas semanas</Label>
                <Input type="number" min={1} max={26} value={form.repetir} onChange={(e) => setForm((f) => ({ ...f, repetir: e.target.value }))} />
              </div>
            )}
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

function TabelaEdicoes({ titulo, lista, onEditar, vazio }: { titulo: string; lista: Edicao[]; onEditar: (e: Edicao) => void; vazio: string }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Edição</TableHead>
              <TableHead>Voluntários</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="w-[110px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">{vazio}</TableCell></TableRow>
            ) : lista.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap">{dataBR(e.starts_on)}{e.start_time ? ` · ${e.start_time}` : ""}</TableCell>
                <TableCell>
                  <div className="font-medium">{e.title}</div>
                  {e.goal && <div className="text-xs text-muted-foreground">Meta: {e.goal}</div>}
                </TableCell>
                <TableCell className="text-sm">{e.volunteers_needed ?? "-"}</TableCell>
                <TableCell><Badge variant="outline" className={`text-xs ${EDICAO_COR[e.status]}`}>{EDICAO_LABEL[e.status]}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => onEditar(e)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" title="Abrir" asChild><Link to={`/app/acoes/edicao/${e.id}`}><ChevronRight className="w-4 h-4" /></Link></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------- Famílias atendidas pelo projeto ----------
function FamiliasDoProjeto({ projetoId }: { projetoId: string }) {
  const qc = useQueryClient();
  const [escolha, setEscolha] = useState("");
  const { data } = useQuery({
    queryKey: ["acao-familias", projetoId],
    queryFn: async () => {
      const [{ data: vinc, error }, { data: todas }] = await Promise.all([
        db.from("project_families").select("family_id, joined_on, left_on, notes, families(*)").eq("project_id", projetoId).is("left_on", null),
        db.from("families").select("id, name, neighborhood, members_count").eq("is_active", true).order("name"),
      ]);
      if (error) throw error;
      return { vinc: (vinc ?? []) as { family_id: string; joined_on: string; families: Familia }[], todas: (todas ?? []) as Familia[] };
    },
  });
  const vinc = data?.vinc ?? [];
  const ids = new Set(vinc.map((v) => v.family_id));
  const disponiveis = (data?.todas ?? []).filter((f) => !ids.has(f.id));

  const incluir = useMutation({
    mutationFn: async () => {
      if (!escolha) return;
      const { error } = await db.from("project_families").upsert({ project_id: projetoId, family_id: escolha, joined_on: hoje(), left_on: null });
      if (error) throw error;
    },
    onSuccess: () => { setEscolha(""); qc.invalidateQueries({ queryKey: ["acao-familias", projetoId] }); qc.invalidateQueries({ queryKey: ["acoes-painel"] }); toast.success("Família incluída na ação"); },
    onError: (e: any) => toast.error(e.message),
  });
  const desligar = useMutation({
    mutationFn: async (familyId: string) => {
      const { error } = await db.from("project_families").update({ left_on: hoje() }).eq("project_id", projetoId).eq("family_id", familyId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["acao-familias", projetoId] }); toast.success("Família desligada desta ação"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Select value={escolha} onValueChange={setEscolha}>
          <SelectTrigger className="sm:w-80"><SelectValue placeholder="Incluir família cadastrada" /></SelectTrigger>
          <SelectContent>
            {disponiveis.length === 0 ? <div className="px-3 py-2 text-sm text-muted-foreground">Nenhuma outra família ativa</div>
              : disponiveis.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}{f.neighborhood ? ` · ${f.neighborhood}` : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => incluir.mutate()} disabled={!escolha || incluir.isPending}><Plus className="w-4 h-4 mr-2" /> Incluir</Button>
        <Button variant="outline" asChild><Link to="/app/familias">Cadastrar nova família</Link></Button>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Família</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Pessoas</TableHead>
              <TableHead>Na ação desde</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vinc.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nenhuma família acompanhada por esta ação.</TableCell></TableRow>
            ) : vinc.map((v) => (
              <TableRow key={v.family_id}>
                <TableCell className="font-medium">{v.families?.name}</TableCell>
                <TableCell className="text-sm">{v.families?.neighborhood || "-"}</TableCell>
                <TableCell className="text-sm">{v.families?.members_count ?? "-"}</TableCell>
                <TableCell className="text-sm">{dataBR(v.joined_on)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" title="Desligar da ação" onClick={() => desligar.mutate(v.family_id)}><UserMinus className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------- Voluntários: candidaturas das edições e interessados vindos do site ----------
function VoluntariosDoProjeto({ projetoId, edicoes }: { projetoId: string; edicoes: Edicao[] }) {
  const qc = useQueryClient();
  const idsEdicoes = edicoes.map((e) => e.id);
  const { data } = useQuery({
    queryKey: ["acao-voluntarios", projetoId, idsEdicoes.join(",")],
    queryFn: async () => {
      const [{ data: cand }, { data: site }] = await Promise.all([
        idsEdicoes.length
          ? db.from("edition_applications").select("*").in("edition_id", idsEdicoes).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        db.from("volunteer_submissions").select("*").eq("project_id", projetoId).order("created_at", { ascending: false }),
      ]);
      return {
        cand: (cand ?? []) as { id: string; edition_id: string; person_id: string; message: string | null; status: CandidaturaStatus; created_at: string }[],
        site: (site ?? []) as { id: string; name: string; email: string | null; phone: string | null; message: string | null; created_at: string }[],
      };
    },
  });
  const cand = data?.cand ?? [];
  const { data: nomes = {} } = useNomesPessoas(cand.map((c) => c.person_id));
  const edicao = (id: string) => edicoes.find((e) => e.id === id);

  const decidir = useMutation({
    mutationFn: async ({ c, status }: { c: (typeof cand)[number]; status: CandidaturaStatus }) => {
      const { error } = await db.from("edition_applications").update({ status }).eq("id", c.id);
      if (error) throw error;
      if (status === "aprovada") {
        const { data: ja } = await db.from("edition_shifts").select("id").eq("edition_id", c.edition_id).eq("person_id", c.person_id).limit(1);
        if (!ja?.length) {
          const { error: e2 } = await db.from("edition_shifts").insert({ edition_id: c.edition_id, person_id: c.person_id, task: "A definir" });
          if (e2) throw e2;
        }
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["acao-voluntarios", projetoId] });
      qc.invalidateQueries({ queryKey: ["acoes-painel"] });
      toast.success(v.status === "aprovada" ? "Candidatura aprovada e incluída na escala" : "Candidatura recusada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-['Playfair_Display'] text-lg">Candidaturas</CardTitle>
          <CardDescription>Pessoas que pediram para participar de uma edição pelo site ou pelo perfil.</CardDescription>
        </CardHeader>
        <CardContent>
          {cand.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma candidatura ainda.</p> : (
            <ul className="divide-y divide-border">
              {cand.map((c) => (
                <li key={c.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{nomes[c.person_id]?.full_name ?? "Pessoa"}</div>
                    <div className="text-xs text-muted-foreground">{edicao(c.edition_id)?.title} · {dataBR(edicao(c.edition_id)?.starts_on)}{nomes[c.person_id]?.phone ? ` · ${nomes[c.person_id]?.phone}` : ""}</div>
                    {c.message && <div className="text-sm mt-1">"{c.message}"</div>}
                  </div>
                  {c.status === "pendente" ? (
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="outline" title="Aprovar" onClick={() => decidir.mutate({ c, status: "aprovada" })}><Check className="w-4 h-4 text-emerald-700" /></Button>
                      <Button size="icon" variant="outline" title="Recusar" onClick={() => decidir.mutate({ c, status: "recusada" })}><X className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  ) : <Badge variant="outline" className={`text-xs shrink-0 ${CANDIDATURA_COR[c.status]}`}>{CANDIDATURA_LABEL[c.status]}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-['Playfair_Display'] text-lg">Interessados pelo site</CardTitle>
          <CardDescription>Quem preencheu o formulário de voluntariado escolhendo esta ação, sem ter conta.</CardDescription>
        </CardHeader>
        <CardContent>
          {(data?.site ?? []).length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum interessado registrado.</p> : (
            <ul className="divide-y divide-border">
              {data!.site.map((s) => (
                <li key={s.id} className="py-3">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{[s.phone, s.email, dataBR(s.created_at)].filter(Boolean).join(" · ")}</div>
                  {s.message && <div className="text-sm mt-1">"{s.message}"</div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Relatórios ----------
type Relatorio = { voluntarios_escalados: number; voluntarios_presentes: number; candidaturas: number; entregas: number; itens_entregues: number; familias_atendidas: number; atendimentos_saude: number };

function RelatoriosDoProjeto({ edicoes }: { edicoes: Edicao[] }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["acao-relatorios", edicoes.map((e) => e.id).join(",")],
    enabled: edicoes.length > 0,
    queryFn: async () =>
      Promise.all(edicoes.slice(0, 24).map(async (e) => {
        const { data } = await db.rpc("relatorio_edicao", { p_edition: e.id });
        return { e, r: (data ?? {}) as Relatorio };
      })),
  });
  const soma = (k: keyof Relatorio) => data.reduce((t, x) => t + (Number(x.r[k]) || 0), 0);

  if (edicoes.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">Os relatórios aparecem depois que a primeira edição acontecer.</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[["Edições", data.length], ["Voluntários presentes", soma("voluntarios_presentes")], ["Entregas", soma("entregas")], ["Itens entregues", soma("itens_entregues")]].map(([l, v]) => (
          <Card key={l as string}><CardContent className="p-4"><div className="text-2xl font-bold">{v as number}</div><div className="text-xs text-muted-foreground">{l as string}</div></CardContent></Card>
        ))}
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Edição</TableHead>
              <TableHead className="text-right">Escalados</TableHead>
              <TableHead className="text-right">Presentes</TableHead>
              <TableHead className="text-right">Entregas</TableHead>
              <TableHead className="text-right">Itens</TableHead>
              <TableHead className="text-right">Famílias</TableHead>
              <TableHead className="text-right">Saúde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Calculando...</TableCell></TableRow>
              : data.map(({ e, r }) => (
                <TableRow key={e.id}>
                  <TableCell><Link className="hover:underline" to={`/app/acoes/edicao/${e.id}?aba=relatorio`}>{dataBR(e.starts_on)} · {e.title}</Link></TableCell>
                  <TableCell className="text-right">{r.voluntarios_escalados}</TableCell>
                  <TableCell className="text-right">{r.voluntarios_presentes}</TableCell>
                  <TableCell className="text-right">{r.entregas}</TableCell>
                  <TableCell className="text-right">{r.itens_entregues}</TableCell>
                  <TableCell className="text-right">{r.familias_atendidas}</TableCell>
                  <TableCell className="text-right">{r.atendimentos_saude}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
