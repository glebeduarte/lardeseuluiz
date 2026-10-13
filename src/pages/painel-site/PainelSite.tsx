import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { DIAS, TIPO_EVENTO, hojeISO, hora, useAtividades, useEventos, useProjetos, useSiteConfig, type Area, type Atividade, type Evento } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Aviso } from "@/components/ContaLayout";
import { cn } from "@/lib/utils";

const ABAS = ["Agenda", "Programação", "Ações sociais", "Mensagens", "Contatos"] as const;
type Aba = (typeof ABAS)[number];
const caixa = "rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function PainelSite() {
  const [aba, setAba] = useState<Aba>("Agenda");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Site</h1>
        <p className="text-muted-foreground">O que for salvo aqui aparece no site na hora.</p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {ABAS.map((a) => (
          <button key={a} role="tab" aria-selected={aba === a} onClick={() => setAba(a)}
            className={cn("whitespace-nowrap px-3 py-2 text-sm border-b-2 -mb-px", aba === a ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}
            style={{ borderRadius: 0 }}>
            {a}
          </button>
        ))}
      </div>
      {aba === "Agenda" && <AbaAgenda />}
      {aba === "Programação" && <AbaProgramacao />}
      {aba === "Ações sociais" && <AbaProjetos />}
      {aba === "Mensagens" && <AbaMensagens />}
      {aba === "Contatos" && <AbaContatos />}
    </div>
  );
}

/* ------------------------------------------------------------ Agenda */
const EVENTO_VAZIO = { id: "", tipo: "palestra", titulo: "", data: hojeISO(), inicio: "", palestrante: "", descricao: "", area_id: "", publicado: true };

function AbaAgenda() {
  const qc = useQueryClient();
  const { pessoa } = useAuth();
  const [ver, setVer] = useState<"proximos" | "todos">("proximos");
  const eventos = useEventos({ desde: ver === "proximos" ? hojeISO() : undefined, todos: true });
  const projetos = useProjetos();
  const [form, setForm] = useState<typeof EVENTO_VAZIO | null>(null);

  const salvar = useMutation({
    mutationFn: async (f: typeof EVENTO_VAZIO) => {
      const dados = {
        tipo: f.tipo, titulo: f.titulo.trim(), data: f.data, inicio: f.inicio || null,
        palestrante: f.palestrante.trim() || null, descricao: f.descricao.trim() || null,
        area_id: f.area_id || null, publicado: f.publicado,
      };
      const { error } = f.id
        ? await supabase.from("eventos").update(dados).eq("id", f.id)
        : await supabase.from("eventos").insert({ ...dados, criado_por: pessoa?.id });
      if (error) throw error;
    },
    onSuccess: () => { setForm(null); qc.invalidateQueries({ queryKey: ["eventos"] }); },
  });

  function editar(e: Evento) {
    setForm({ id: e.id, tipo: e.tipo, titulo: e.titulo, data: e.data, inicio: e.inicio?.slice(0, 5) ?? "", palestrante: e.palestrante ?? "",
      descricao: e.descricao ?? "", area_id: e.area_id ?? "", publicado: e.publicado });
  }
  function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (form && form.titulo.trim().length > 2) salvar.mutate(form);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 text-sm">
          <button className={cn("rounded-full px-3 py-1", ver === "proximos" ? "bg-primary/10 text-primary" : "text-muted-foreground")} onClick={() => setVer("proximos")}>Próximos</button>
          <button className={cn("rounded-full px-3 py-1", ver === "todos" ? "bg-primary/10 text-primary" : "text-muted-foreground")} onClick={() => setVer("todos")}>Todos</button>
        </div>
        <Button onClick={() => setForm({ ...EVENTO_VAZIO })}><Plus className="h-4 w-4" aria-hidden /> Nova data</Button>
      </div>

      {form && (
        <form onSubmit={enviar} className="rounded-lg border bg-card p-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-tipo">Tipo</Label>
            <select id="ev-tipo" className={caixa} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {Object.entries(TIPO_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2"><Label htmlFor="ev-data">Data</Label><Input id="ev-data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="ev-hora">Horário</Label><Input id="ev-hora" type="time" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></div>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2"><Label htmlFor="ev-titulo">Título ou tema</Label><Input id="ev-titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="ev-pal">Palestrante ou responsável</Label><Input id="ev-pal" value={form.palestrante} onChange={(e) => setForm({ ...form, palestrante: e.target.value })} /></div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-area">Ação social ligada (opcional)</Label>
            <select id="ev-area" className={caixa} value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
              <option value="">Nenhuma</option>
              {projetos.data?.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2"><Label htmlFor="ev-desc">Descrição (opcional)</Label>
            <textarea id="ev-desc" rows={2} className={caixa} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm" htmlFor="ev-pub">
            <Switch id="ev-pub" checked={form.publicado} onCheckedChange={(v) => setForm({ ...form, publicado: v })} /> Publicado no site
          </label>
          <div className="flex gap-2 sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
            <Button type="submit" disabled={salvar.isPending || form.titulo.trim().length < 3}>{salvar.isPending ? "Salvando…" : "Salvar"}</Button>
          </div>
          {salvar.isError && <div className="sm:col-span-2"><Aviso tipo="erro">Não foi possível salvar. Confira os campos.</Aviso></div>}
        </form>
      )}

      <ul className="rounded-lg border bg-card divide-y">
        {eventos.data?.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-muted-foreground tabular-nums">
                {new Date(e.data + "T12:00").toLocaleDateString("pt-BR")} {hora(e.inicio)} · {TIPO_EVENTO[e.tipo]}{!e.publicado && " · rascunho"}
              </span>
              <span className="font-medium truncate">{e.titulo}</span>
              {e.palestrante && <span className="text-sm text-muted-foreground truncate">{e.palestrante}</span>}
            </div>
            <button className="rounded p-2 text-muted-foreground hover:bg-muted" onClick={() => editar(e)} aria-label={`Editar ${e.titulo}`}><Pencil className="h-4 w-4" /></button>
          </li>
        ))}
        {eventos.data?.length === 0 && <li className="px-4 py-6 text-muted-foreground">Nenhuma data cadastrada.</li>}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------ Programação */
function AbaProgramacao() {
  const qc = useQueryClient();
  const { data } = useAtividades(true);
  const [form, setForm] = useState<Atividade | null>(null);

  const salvar = useMutation({
    mutationFn: async (a: Atividade) => {
      const { error } = await supabase.from("atividades").update({
        titulo: a.titulo, descricao: a.descricao, inicio: a.inicio, fim: a.fim, ativa: a.ativa, online: a.online,
      }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => { setForm(null); qc.invalidateQueries({ queryKey: ["atividades"] }); },
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Ajuste títulos, descrições e horários dos dias de trabalho. Para criar um novo dia ou mudar a sequência interna, fale com a administração da plataforma.</p>
      <ul className="flex flex-col gap-3">
        {data?.map((a) => (
          <li key={a.id} className="rounded-lg border bg-card p-4 flex flex-col gap-3">
            {form?.id === a.id ? (
              <form onSubmit={(e) => { e.preventDefault(); salvar.mutate(form); }} className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2"><Label htmlFor="at-tit">Título</Label><Input id="at-tit" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
                <div className="flex flex-col gap-2 sm:col-span-2"><Label htmlFor="at-desc">Descrição</Label>
                  <textarea id="at-desc" rows={2} className={caixa} value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
                <div className="flex flex-col gap-2"><Label htmlFor="at-ini">Início</Label><Input id="at-ini" type="time" value={form.inicio.slice(0, 5)} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></div>
                <div className="flex flex-col gap-2"><Label htmlFor="at-fim">Fim</Label><Input id="at-fim" type="time" value={form.fim.slice(0, 5)} onChange={(e) => setForm({ ...form, fim: e.target.value })} /></div>
                <label className="flex items-center gap-2 text-sm" htmlFor="at-ativa"><Switch id="at-ativa" checked={form.ativa} onCheckedChange={(v) => setForm({ ...form, ativa: v })} /> Aparece no site</label>
                <div className="flex gap-2 sm:justify-end">
                  <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
                  <Button type="submit" disabled={salvar.isPending}>Salvar</Button>
                </div>
                {salvar.isError && <div className="sm:col-span-2"><Aviso tipo="erro">Confira os horários: o fim precisa ser depois do início.</Aviso></div>}
              </form>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-secondary">{DIAS[a.dia_semana]} {a.recorrencia !== "semanal" && `(${a.recorrencia})`} · {hora(a.inicio)} às {hora(a.fim)}{!a.ativa && " · oculto"}</span>
                  <span className="font-medium">{a.titulo}</span>
                </div>
                <button className="rounded p-2 text-muted-foreground hover:bg-muted" onClick={() => setForm(a)} aria-label={`Editar ${a.titulo}`}><Pencil className="h-4 w-4" /></button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------ Projetos */
function AbaProjetos() {
  const qc = useQueryClient();
  const { data } = useProjetos();
  const [form, setForm] = useState<Area | null>(null);
  const salvar = useMutation({
    mutationFn: async (a: Area) => {
      const { error } = await supabase.from("areas").update({
        resumo: a.resumo, conteudo: a.conteudo, etiquetas: a.etiquetas, aceita_candidaturas: a.aceita_candidaturas,
      }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => { setForm(null); qc.invalidateQueries({ queryKey: ["projetos"] }); qc.invalidateQueries({ queryKey: ["area"] }); },
  });

  return (
    <ul className="flex flex-col gap-3">
      {data?.map((p) => (
        <li key={p.id} className="rounded-lg border bg-card p-4">
          {form?.id === p.id ? (
            <form onSubmit={(e) => { e.preventDefault(); salvar.mutate(form); }} className="flex flex-col gap-3">
              <span className="font-medium">{p.nome}</span>
              <div className="flex flex-col gap-2"><Label htmlFor="pj-res">Resumo (aparece no cartão)</Label>
                <textarea id="pj-res" rows={2} className={caixa} value={form.resumo ?? ""} onChange={(e) => setForm({ ...form, resumo: e.target.value })} /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="pj-cont">Texto da página</Label>
                <textarea id="pj-cont" rows={6} className={caixa} value={form.conteudo ?? ""} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="pj-tags">Etiquetas, separadas por vírgula</Label>
                <Input id="pj-tags" value={form.etiquetas.join(", ")} onChange={(e) => setForm({ ...form, etiquetas: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} /></div>
              <label className="flex items-center gap-2 text-sm" htmlFor="pj-cand"><Switch id="pj-cand" checked={form.aceita_candidaturas} onCheckedChange={(v) => setForm({ ...form, aceita_candidaturas: v })} /> Aceita candidaturas de participação</label>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
                <Button type="submit" disabled={salvar.isPending}>Salvar</Button>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1 min-w-0"><span className="font-medium">{p.nome}</span><span className="text-sm text-muted-foreground">{p.resumo}</span></div>
              <button className="rounded p-2 text-muted-foreground hover:bg-muted" onClick={() => setForm(p)} aria-label={`Editar ${p.nome}`}><Pencil className="h-4 w-4" /></button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------ Mensagens */
function AbaMensagens() {
  const qc = useQueryClient();
  const msgs = useQuery({
    queryKey: ["mensagens"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mensagens_contato").select("*").order("criado_em", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const marcar = useMutation({
    mutationFn: async ({ id, lida }: { id: string; lida: boolean }) => {
      const { error } = await supabase.from("mensagens_contato").update({ lida }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mensagens"] }),
  });
  if (msgs.data?.length === 0) return <p className="text-muted-foreground">Nenhuma mensagem recebida.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {msgs.data?.map((m) => (
        <li key={m.id} className={cn("rounded-lg border bg-card p-4 flex flex-col gap-2", !m.lida && "border-primary")}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium">{m.nome}{m.assunto && <span className="text-muted-foreground"> · {m.assunto}</span>}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{new Date(m.criado_em).toLocaleString("pt-BR")}</span>
          </div>
          <p className="text-sm whitespace-pre-line">{m.mensagem}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span className="select-all">{[m.email, m.telefone].filter(Boolean).join(" · ")}</span>
            <Button size="sm" variant="ghost" onClick={() => marcar.mutate({ id: m.id, lida: !m.lida })}>{m.lida ? "Marcar como não lida" : "Marcar como lida"}</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------ Contatos */
const CAMPOS_CONFIG: [string, string][] = [
  ["endereco", "Endereço"], ["whatsapp_exibicao", "WhatsApp (como aparece)"], ["whatsapp", "WhatsApp (só números, com 55)"],
  ["whatsapp_horario", "Horário do WhatsApp"], ["email", "E-mail"], ["instagram", "Link do Instagram"], ["youtube", "Link do YouTube"],
];
function AbaContatos() {
  const qc = useQueryClient();
  const { data } = useSiteConfig();
  const [valores, setValores] = useState<Record<string, string> | null>(null);
  const atual = valores ?? data ?? {};
  const salvar = useMutation({
    mutationFn: async () => {
      const linhas = CAMPOS_CONFIG.map(([chave]) => ({ chave, valor: (atual[chave] ?? "").trim() }));
      const { error } = await supabase.from("site_config").upsert(linhas);
      if (error) throw error;
    },
    onSuccess: () => { setValores(null); qc.invalidateQueries({ queryKey: ["site_config"] }); },
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }} className="grid gap-4 sm:grid-cols-2 max-w-3xl">
      {CAMPOS_CONFIG.map(([chave, rotulo]) => (
        <div key={chave} className={cn("flex flex-col gap-2", chave === "endereco" && "sm:col-span-2")}>
          <Label htmlFor={`cfg-${chave}`}>{rotulo}</Label>
          <Input id={`cfg-${chave}`} value={atual[chave] ?? ""} onChange={(e) => setValores({ ...atual, [chave]: e.target.value })} />
        </div>
      ))}
      {salvar.isSuccess && <div className="sm:col-span-2"><Aviso tipo="ok">Contatos atualizados no site.</Aviso></div>}
      {salvar.isError && <div className="sm:col-span-2"><Aviso tipo="erro">Não foi possível salvar.</Aviso></div>}
      <div><Button type="submit" disabled={salvar.isPending || !valores}>Salvar contatos</Button></div>
    </form>
  );
}
