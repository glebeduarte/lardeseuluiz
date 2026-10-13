import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/app/AppLayout";
import BuscaPessoa from "@/components/acoes/BuscaPessoa";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, ShieldCheck, ShieldAlert, Printer, Lock } from "lucide-react";
import {
  db, dataBR, dataLongaBR, EDICAO_LABEL, EDICAO_COR, useNomesPessoas, useMinhaPessoa,
  type Edicao, type PessoaBasica, type Familia,
} from "@/lib/acoes";

const TURNOS = ["Manhã", "Tarde", "Noite", "Dia todo"];
const TIPOS_SAUDE = ["Aferição de pressão", "Glicemia", "Consulta", "Orientação", "Curativo", "Encaminhamento", "Outro"];

export default function EdicaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const aba = params.get("aba") || "escala";
  const { canAccess } = usePermissions();

  const { data } = useQuery({
    queryKey: ["edicao", id],
    queryFn: async () => {
      const { data, error } = await db.from("project_editions").select("*, projects(id, name, has_health_records)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as (Edicao & { projects: { id: string; name: string; has_health_records: boolean } }) | null;
    },
  });
  const temSaude = !!data?.projects?.has_health_records;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link to={data ? `/app/acoes/${data.project_id}` : "/app/acoes"} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 print:hidden">
            <ArrowLeft className="w-4 h-4" /> {data?.projects?.name ?? "Ações Sociais"}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold font-['Playfair_Display'] text-foreground">{data?.title ?? "..."}</h1>
            {data && <Badge variant="outline" className={`text-xs ${EDICAO_COR[data.status]}`}>{EDICAO_LABEL[data.status]}</Badge>}
          </div>
          {data && (
            <p className="text-sm text-muted-foreground">
              <span>{dataLongaBR(data.starts_on)}</span>
              {data.start_time ? ` · ${data.start_time}` : ""}{data.location ? ` · ${data.location}` : ""}{data.goal ? ` · Meta: ${data.goal}` : ""}
            </p>
          )}
        </div>

        <Tabs value={aba} onValueChange={(v) => setParams({ aba: v }, { replace: true })}>
          <TabsList className="print:hidden">
            <TabsTrigger value="escala">Escala</TabsTrigger>
            <TabsTrigger value="entregas">Entregas</TabsTrigger>
            {temSaude && <TabsTrigger value="saude">Saúde</TabsTrigger>}
            <TabsTrigger value="relatorio">Relatório</TabsTrigger>
          </TabsList>
          <TabsContent value="escala" className="mt-4">{data && <Escala edicao={data} />}</TabsContent>
          <TabsContent value="entregas" className="mt-4">{data && <Entregas edicao={data} />}</TabsContent>
          {temSaude && (
            <TabsContent value="saude" className="mt-4">
              {canAccess("modulo_saude") ? data && <Saude edicao={data} /> : (
                <Alert><Lock className="h-4 w-4" /><AlertTitle>Área restrita</AlertTitle>
                  <AlertDescription>Os atendimentos de saúde são dados sensíveis. Só quem tem a permissão "Saúde" na sua função pode ver e registrar.</AlertDescription></Alert>
              )}
            </TabsContent>
          )}
          <TabsContent value="relatorio" className="mt-4">{data && <RelatorioEdicao edicao={data} />}</TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ---------- Escala ----------
type Turno = { id: string; person_id: string; task: string | null; shift: string | null; confirmed: boolean; attended: boolean };

function Escala({ edicao }: { edicao: Edicao }) {
  const qc = useQueryClient();
  const [pessoa, setPessoa] = useState<PessoaBasica | null>(null);
  const [tarefa, setTarefa] = useState("");
  const [turno, setTurno] = useState("");
  const chave = ["edicao-escala", edicao.id];

  const { data: lista = [] } = useQuery({
    queryKey: chave,
    queryFn: async () => {
      const { data, error } = await db.from("edition_shifts").select("*").eq("edition_id", edicao.id).order("created_at");
      if (error) throw error;
      return (data ?? []) as Turno[];
    },
  });
  const { data: nomes = {} } = useNomesPessoas(lista.map((t) => t.person_id));

  const incluir = useMutation({
    mutationFn: async () => {
      if (!pessoa) throw new Error("Escolha a pessoa");
      const { error } = await db.from("edition_shifts").insert({ edition_id: edicao.id, person_id: pessoa.id, task: tarefa.trim() || null, shift: turno || null });
      if (error) throw error;
    },
    onSuccess: () => { setPessoa(null); setTarefa(""); qc.invalidateQueries({ queryKey: chave }); toast.success("Incluído na escala"); },
    onError: (e: any) => toast.error(e.message),
  });
  const alterar = useMutation({
    mutationFn: async ({ id, campos }: { id: string; campos: Partial<Turno> }) => {
      const { error } = await db.from("edition_shifts").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chave }),
    onError: (e: any) => toast.error(e.message),
  });
  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("edition_shifts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chave }),
    onError: (e: any) => toast.error(e.message),
  });

  const confirmados = lista.filter((t) => t.confirmed).length;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-['Playfair_Display'] text-lg">Incluir na escala</CardTitle>
          <CardDescription>
            {lista.length} escalado{lista.length !== 1 ? "s" : ""}{edicao.volunteers_needed ? ` de ${edicao.volunteers_needed} necessários` : ""} · {confirmados} confirmado{confirmados !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto] items-end">
          <div className="grid gap-2"><Label>Voluntário</Label><BuscaPessoa valor={pessoa} onEscolher={setPessoa} /></div>
          <div className="grid gap-2"><Label>Tarefa</Label><Input placeholder="Ex.: Cozinha, distribuição" value={tarefa} onChange={(e) => setTarefa(e.target.value)} /></div>
          <div className="grid gap-2">
            <Label>Turno</Label>
            <Select value={turno} onValueChange={setTurno}>
              <SelectTrigger><SelectValue placeholder="Turno" /></SelectTrigger>
              <SelectContent>{TURNOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={() => incluir.mutate()} disabled={!pessoa || incluir.isPending}><Plus className="w-4 h-4 mr-2" /> Incluir</Button>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voluntário</TableHead>
              <TableHead>Tarefa</TableHead>
              <TableHead>Turno</TableHead>
              <TableHead>Confirmou</TableHead>
              <TableHead>Presente</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Ninguém escalado ainda.</TableCell></TableRow>
            ) : lista.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="font-medium">{nomes[t.person_id]?.full_name ?? "..."}</div>
                  {nomes[t.person_id]?.phone && <div className="text-xs text-muted-foreground">{nomes[t.person_id]?.phone}</div>}
                </TableCell>
                <TableCell>
                  <Input className="h-8" defaultValue={t.task ?? ""} onBlur={(e) => e.target.value !== (t.task ?? "") && alterar.mutate({ id: t.id, campos: { task: e.target.value || null } })} />
                </TableCell>
                <TableCell className="text-sm">{t.shift || "-"}</TableCell>
                <TableCell>
                  {t.confirmed ? <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-800 border-emerald-300">Confirmado</Badge>
                    : <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => alterar.mutate({ id: t.id, campos: { confirmed: true } })}>Marcar</Button>}
                </TableCell>
                <TableCell>
                  <Checkbox checked={t.attended} onCheckedChange={(v) => alterar.mutate({ id: t.id, campos: { attended: !!v } })} aria-label="Esteve presente" />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" title="Tirar da escala" onClick={() => remover.mutate(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------- Entregas ----------
type Entrega = { id: string; family_id: string | null; recipient_name: string | null; items: string | null; quantity: number | null; delivered_at: string; notes: string | null; families: { name: string } | null };

function Entregas({ edicao }: { edicao: Edicao }) {
  const qc = useQueryClient();
  const { user, simulacao } = useAuth();
  const { data: eu } = useMinhaPessoa(user?.id, simulacao?.personId);
  const chave = ["edicao-entregas", edicao.id];
  const vazio = { family_id: "", recipient_name: "", items: "", quantity: "1", notes: "" };
  const [f, setF] = useState(vazio);

  const { data } = useQuery({
    queryKey: chave,
    queryFn: async () => {
      const [{ data: ent, error }, { data: fams }] = await Promise.all([
        db.from("deliveries").select("*, families(name)").eq("edition_id", edicao.id).order("delivered_at", { ascending: false }),
        db.from("project_families").select("family_id, families(id, name)").eq("project_id", edicao.project_id).is("left_on", null),
      ]);
      if (error) throw error;
      return { ent: (ent ?? []) as Entrega[], fams: ((fams ?? []) as { families: Familia }[]).map((x) => x.families).filter(Boolean) };
    },
  });

  const registrar = useMutation({
    mutationFn: async () => {
      if (!f.family_id && !f.recipient_name.trim()) throw new Error("Escolha a família ou escreva quem recebeu");
      const { error } = await db.from("deliveries").insert({
        edition_id: edicao.id, family_id: f.family_id || null, recipient_name: f.recipient_name.trim() || null,
        items: f.items.trim() || null, quantity: Number(f.quantity) || 1, notes: f.notes.trim() || null, delivered_by: eu?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setF({ ...vazio, items: f.items }); qc.invalidateQueries({ queryKey: chave }); toast.success("Entrega registrada"); },
    onError: (e: any) => toast.error(e.message),
  });
  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("deliveries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chave }),
    onError: (e: any) => toast.error(e.message),
  });

  const ent = data?.ent ?? [];
  const total = ent.reduce((t, x) => t + (x.quantity || 0), 0);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-['Playfair_Display'] text-lg">Registrar entrega</CardTitle>
          <CardDescription>{ent.length} entrega{ent.length !== 1 ? "s" : ""} · {total} ite{total !== 1 ? "ns" : "m"} nesta edição</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_90px_auto] items-end">
          <div className="grid gap-2">
            <Label>Família</Label>
            <Select value={f.family_id || "nenhuma"} onValueChange={(v) => setF((s) => ({ ...s, family_id: v === "nenhuma" ? "" : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Sem cadastro (avulso)</SelectItem>
                {(data?.fams ?? []).map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2"><Label>Quem recebeu</Label><Input value={f.recipient_name} onChange={(e) => setF((s) => ({ ...s, recipient_name: e.target.value }))} /></div>
          <div className="grid gap-2"><Label>O que foi entregue</Label><Input placeholder="Ex.: Sopa, cesta básica" value={f.items} onChange={(e) => setF((s) => ({ ...s, items: e.target.value }))} /></div>
          <div className="grid gap-2"><Label>Qtd.</Label><Input type="number" min={1} value={f.quantity} onChange={(e) => setF((s) => ({ ...s, quantity: e.target.value }))} /></div>
          <Button onClick={() => registrar.mutate()} disabled={registrar.isPending}><Plus className="w-4 h-4 mr-2" /> Registrar</Button>
        </CardContent>
      </Card>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Família / pessoa</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ent.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nenhuma entrega registrada.</TableCell></TableRow>
            ) : ent.map((x) => (
              <TableRow key={x.id}>
                <TableCell className="text-sm whitespace-nowrap">{new Date(x.delivered_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                <TableCell>
                  <div className="font-medium">{x.families?.name ?? x.recipient_name ?? "-"}</div>
                  {x.families && x.recipient_name && <div className="text-xs text-muted-foreground">Recebido por {x.recipient_name}</div>}
                </TableCell>
                <TableCell className="text-sm">{x.items || "-"}</TableCell>
                <TableCell className="text-right">{x.quantity}</TableCell>
                <TableCell><Button variant="ghost" size="icon" title="Apagar registro" onClick={() => remover.mutate(x.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------- Saúde (dados sensíveis, exige consentimento LGPD) ----------
type RegistroSaude = { id: string; person_id: string; care_type: string; notes: string | null; referral: string | null; created_at: string };

function Saude({ edicao }: { edicao: Edicao }) {
  const qc = useQueryClient();
  const { user, simulacao } = useAuth();
  const { data: eu } = useMinhaPessoa(user?.id, simulacao?.personId);
  const chave = ["edicao-saude", edicao.id];
  const [pessoa, setPessoa] = useState<PessoaBasica | null>(null);
  const [tipo, setTipo] = useState(TIPOS_SAUDE[0]);
  const [obs, setObs] = useState("");
  const [encaminhamento, setEncaminhamento] = useState("");

  const { data: lista = [] } = useQuery({
    queryKey: chave,
    queryFn: async () => {
      const { data, error } = await db.from("health_records").select("*").eq("edition_id", edicao.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RegistroSaude[];
    },
  });
  const { data: nomes = {} } = useNomesPessoas(lista.map((r) => r.person_id));

  const { data: consentiu, refetch } = useQuery({
    queryKey: ["consentimento-saude", pessoa?.id],
    enabled: !!pessoa,
    queryFn: async () => {
      const { data, error } = await db.rpc("consentimento_saude", { p_person: pessoa!.id });
      if (error) throw error;
      return !!data;
    },
  });

  const registrarTermo = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("registrar_consentimento_saude", { p_person: pessoa!.id, p_obs: `Termo assinado em ${edicao.title} (${dataBR(edicao.starts_on)})` });
      if (error) throw error;
    },
    onSuccess: () => { refetch(); toast.success("Consentimento registrado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!pessoa) throw new Error("Escolha a pessoa atendida");
      const { error } = await db.from("health_records").insert({
        edition_id: edicao.id, person_id: pessoa.id, care_type: tipo, notes: obs.trim() || null, referral: encaminhamento.trim() || null, recorded_by: eu?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setPessoa(null); setObs(""); setEncaminhamento(""); qc.invalidateQueries({ queryKey: chave }); toast.success("Atendimento registrado"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-['Playfair_Display'] text-lg">Registrar atendimento</CardTitle>
          <CardDescription>Só é possível registrar para quem assinou o consentimento de dados de saúde (LGPD).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2"><Label>Pessoa atendida</Label><BuscaPessoa valor={pessoa} onEscolher={setPessoa} /></div>
            <div className="grid gap-2">
              <Label>Tipo de atendimento</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS_SAUDE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {pessoa && consentiu === false && (
            <Alert className="border-amber-300 bg-amber-50">
              <ShieldAlert className="h-4 w-4 text-amber-700" />
              <AlertTitle>Sem consentimento para dados de saúde</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Peça para a pessoa ler e assinar o termo de consentimento. Depois de assinado, registre aqui.</p>
                <Button size="sm" variant="outline" onClick={() => registrarTermo.mutate()} disabled={registrarTermo.isPending}>
                  <ShieldCheck className="w-4 h-4 mr-2" /> A pessoa assinou o termo
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {pessoa && consentiu && (
            <div className="text-xs text-emerald-800 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Consentimento de dados de saúde registrado</div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2"><Label>Observações</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: PA 12x8" /></div>
            <div className="grid gap-2"><Label>Encaminhamento</Label><Textarea rows={2} value={encaminhamento} onChange={(e) => setEncaminhamento(e.target.value)} placeholder="Ex.: UBS do bairro" /></div>
          </div>
          <Button onClick={() => salvar.mutate()} disabled={!pessoa || !consentiu || salvar.isPending}><Plus className="w-4 h-4 mr-2" /> Registrar atendimento</Button>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Pessoa</TableHead>
              <TableHead>Atendimento</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead>Encaminhamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nenhum atendimento registrado.</TableCell></TableRow>
            ) : lista.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm whitespace-nowrap">{new Date(r.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                <TableCell className="font-medium">{nomes[r.person_id]?.full_name ?? "..."}</TableCell>
                <TableCell className="text-sm">{r.care_type}</TableCell>
                <TableCell className="text-sm">{r.notes || "-"}</TableCell>
                <TableCell className="text-sm">{r.referral || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------- Relatório ----------
function RelatorioEdicao({ edicao }: { edicao: Edicao }) {
  const { data: r } = useQuery({
    queryKey: ["edicao-relatorio", edicao.id],
    queryFn: async () => {
      const { data, error } = await db.rpc("relatorio_edicao", { p_edition: edicao.id });
      if (error) throw error;
      return data as Record<string, number>;
    },
  });
  const itens: [string, string][] = [
    ["voluntarios_escalados", "Voluntários escalados"], ["voluntarios_presentes", "Voluntários presentes"], ["candidaturas", "Candidaturas"],
    ["entregas", "Entregas"], ["itens_entregues", "Itens entregues"], ["familias_atendidas", "Famílias atendidas"], ["atendimentos_saude", "Atendimentos de saúde"],
  ];
  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Imprimir</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {itens.map(([k, l]) => (
          <Card key={k}><CardContent className="p-4"><div className="text-2xl font-bold">{r?.[k] ?? "-"}</div><div className="text-xs text-muted-foreground">{l}</div></CardContent></Card>
        ))}
      </div>
      {edicao.goal && <p className="text-sm"><span className="text-muted-foreground">Meta da edição:</span> {edicao.goal}</p>}
      {edicao.notes && <p className="text-sm whitespace-pre-line"><span className="text-muted-foreground">Observações:</span> {edicao.notes}</p>}
    </div>
  );
}
