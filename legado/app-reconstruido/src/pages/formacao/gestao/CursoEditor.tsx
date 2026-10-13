import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Paperclip, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useAulasDoCurso, useCurso, type Aula, type Curso, type Modulo } from "@/lib/formacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Aviso } from "@/components/ContaLayout";
import { cn } from "@/lib/utils";
import { caixa } from "./PainelFormacao";

const ABAS = ["Dados", "Conteúdo", "Alunos", "Presença", "Avaliações"] as const;

export default function CursoEditor() {
  const { id } = useParams<{ id: string }>();
  const [aba, setAba] = useState<(typeof ABAS)[number]>("Dados");
  const { data } = useCurso(id);
  if (!data?.curso) return <p className="text-muted-foreground">Carregando curso…</p>;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link to="/formacao/gestao" className="flex items-center gap-1 text-sm text-primary hover:underline w-fit"><ArrowLeft className="h-4 w-4" aria-hidden /> Formação</Link>
        <h1 className="text-3xl font-semibold">{data.curso.titulo}</h1>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {ABAS.map((a) => (
          <button key={a} role="tab" aria-selected={aba === a} onClick={() => setAba(a)} style={{ borderRadius: 0 }}
            className={cn("whitespace-nowrap px-3 py-2 text-sm border-b-2 -mb-px", aba === a ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>{a}</button>
        ))}
      </div>
      {aba === "Dados" && <Dados curso={data.curso} />}
      {aba === "Conteúdo" && <Conteudo cursoId={data.curso.id} modulos={data.modulos} />}
      {aba === "Alunos" && <Alunos cursoId={data.curso.id} />}
      {aba === "Presença" && <PresencaCurso cursoId={data.curso.id} modulos={data.modulos} />}
      {aba === "Avaliações" && <Resultados cursoId={data.curso.id} />}
    </div>
  );
}

/* --------------------------------------------------------------- Dados */
function Dados({ curso }: { curso: Curso }) {
  const qc = useQueryClient();
  const { pode } = useAuth();
  const [f, setF] = useState(curso);
  const turma = useQuery({
    queryKey: ["turma", curso.id],
    queryFn: async () => { const { data } = await supabase.from("turmas").select("*").eq("curso_id", curso.id).order("criado_em").limit(1).maybeSingle(); return data; },
  });
  const [t, setT] = useState<{ vagas_tipo: string; vagas_max: number | null; link_encontro: string | null } | null>(null);
  useEffect(() => { if (turma.data) setT(turma.data); }, [turma.data]);

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cursos").update({
        titulo: f.titulo, descricao: f.descricao, descricao_longa: f.descricao_longa, publico: f.publico, situacao: f.situacao,
        inscricoes_abertas: f.inscricoes_abertas, exige_aprovacao: f.exige_aprovacao, horario: f.horario, facilitadores: f.facilitadores,
        inicio: f.inicio || null, fim: f.fim || null, capa_url: f.capa_url, miniatura_url: f.miniatura_url,
      }).eq("id", curso.id);
      if (error) throw error;
      if (turma.data && t) {
        const r = await supabase.from("turmas").update({ vagas_tipo: t.vagas_tipo, vagas_max: t.vagas_tipo === "limitada" ? t.vagas_max : null, link_encontro: t.link_encontro || null }).eq("id", turma.data.id);
        if (r.error) throw r.error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["curso", curso.id] }); qc.invalidateQueries({ queryKey: ["gestao-cursos"] }); },
  });

  const enviarCapa = useMutation({
    mutationFn: async (arq: File) => {
      const caminho = `cursos/${curso.id}/${Date.now()}-${arq.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("formacao").upload(caminho, arq);
      if (error) throw error;
      const url = supabase.storage.from("formacao").getPublicUrl(caminho).data.publicUrl;
      setF((v) => ({ ...v, capa_url: url, miniatura_url: url }));
    },
  });

  const editavel = pode("formacao.gerir");
  const campo = (k: keyof Curso, rot: string, tipo = "text") => (
    <div className="flex flex-col gap-1.5"><Label htmlFor={`c-${k}`}>{rot}</Label>
      <Input id={`c-${k}`} type={tipo} disabled={!editavel} value={(f[k] as string) ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );

  return (
    <form className="grid gap-4 sm:grid-cols-2 max-w-4xl" onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }}>
      <div className="sm:col-span-2">{campo("titulo", "Título")}</div>
      <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="c-desc">Resumo</Label>
        <textarea id="c-desc" rows={2} disabled={!editavel} className={caixa} value={f.descricao ?? ""} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></div>
      <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="c-longa">Descrição completa</Label>
        <textarea id="c-longa" rows={5} disabled={!editavel} className={caixa} value={f.descricao_longa ?? ""} onChange={(e) => setF({ ...f, descricao_longa: e.target.value })} /></div>
      {campo("horario", "Dia e horário")}
      {campo("facilitadores", "Facilitação")}
      {campo("inicio", "Início", "date")}
      {campo("fim", "Término", "date")}
      <div className="flex flex-col gap-1.5"><Label htmlFor="c-sit">Situação</Label>
        <select id="c-sit" disabled={!editavel} className={caixa} value={f.situacao} onChange={(e) => setF({ ...f, situacao: e.target.value as Curso["situacao"] })}>
          <option value="rascunho">Rascunho</option><option value="publicado">Publicado</option><option value="arquivado">Arquivado</option>
        </select></div>
      <div className="flex flex-col gap-1.5"><Label htmlFor="c-pub">Quem pode se inscrever</Label>
        <select id="c-pub" disabled={!editavel} className={caixa} value={f.publico} onChange={(e) => setF({ ...f, publico: e.target.value as Curso["publico"] })}>
          <option value="todos">Frequentadores e voluntários</option><option value="voluntarios">Só voluntários</option>
        </select></div>
      <label className="flex items-center gap-2 text-sm" htmlFor="c-abertas"><Switch id="c-abertas" disabled={!editavel} checked={f.inscricoes_abertas} onCheckedChange={(v) => setF({ ...f, inscricoes_abertas: v })} /> Inscrições abertas</label>
      <label className="flex items-center gap-2 text-sm" htmlFor="c-aprov"><Switch id="c-aprov" disabled={!editavel} checked={f.exige_aprovacao} onCheckedChange={(v) => setF({ ...f, exige_aprovacao: v })} /> Inscrição precisa de aprovação</label>
      {t && (
        <>
          <div className="flex flex-col gap-1.5"><Label htmlFor="t-vagas">Vagas</Label>
            <div className="flex gap-2">
              <select id="t-vagas" disabled={!editavel} className={caixa} value={t.vagas_tipo} onChange={(e) => setT({ ...t, vagas_tipo: e.target.value })}>
                <option value="ilimitada">Sem limite</option><option value="limitada">Limitadas</option>
              </select>
              {t.vagas_tipo === "limitada" && <Input aria-label="Número de vagas" type="number" min={1} disabled={!editavel} value={t.vagas_max ?? ""} onChange={(e) => setT({ ...t, vagas_max: Number(e.target.value) || null })} />}
            </div></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="t-link">Link da sala online (Meet)</Label>
            <Input id="t-link" disabled={!editavel} placeholder="https://meet.google.com/…" value={t.link_encontro ?? ""} onChange={(e) => setT({ ...t, link_encontro: e.target.value })} /></div>
        </>
      )}
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="c-capa">Capa</Label>
        <div className="flex flex-wrap items-center gap-3">
          {f.capa_url && <img src={f.capa_url} alt="" className="h-16 w-28 rounded object-cover border" />}
          {editavel && <input id="c-capa" type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && enviarCapa.mutate(e.target.files[0])} className="text-sm" />}
        </div>
      </div>
      {salvar.isSuccess && <div className="sm:col-span-2"><Aviso tipo="ok">Curso salvo.</Aviso></div>}
      {salvar.isError && <div className="sm:col-span-2"><Aviso tipo="erro">Não foi possível salvar.</Aviso></div>}
      {editavel && <div><Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? "Salvando…" : "Salvar curso"}</Button></div>}
    </form>
  );
}

/* --------------------------------------------------------------- Conteúdo */
function Conteudo({ cursoId, modulos }: { cursoId: string; modulos: Modulo[] }) {
  const qc = useQueryClient();
  const { pode } = useAuth();
  const aulas = useAulasDoCurso(cursoId, modulos);
  const [aberta, setAberta] = useState<Aula | null>(null);
  const editavel = pode("formacao.gerir");
  const recarregar = () => { qc.invalidateQueries({ queryKey: ["curso", cursoId] }); qc.invalidateQueries({ queryKey: ["aulas-curso", cursoId] }); };

  const novoModulo = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("modulos").insert({ curso_id: cursoId, titulo: "Novo módulo", ordem: modulos.length + 1 }); if (error) throw error; },
    onSuccess: recarregar,
  });
  const renomear = useMutation({
    mutationFn: async ({ id, titulo }: { id: string; titulo: string }) => { const { error } = await supabase.from("modulos").update({ titulo }).eq("id", id); if (error) throw error; },
    onSuccess: recarregar,
  });
  const novaAula = useMutation({
    mutationFn: async (moduloId: string) => {
      const n = (aulas.data ?? []).filter((a) => a.modulo_id === moduloId).length;
      const { data, error } = await supabase.from("aulas").insert({ modulo_id: moduloId, titulo: "Nova aula", ordem: n + 1 }).select("*").single();
      if (error) throw error;
      return data as Aula;
    },
    onSuccess: (a) => { recarregar(); setAberta(a); },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="flex flex-col gap-3">
        {modulos.map((m) => (
          <div key={m.id} className="rounded-lg border bg-card">
            <div className="px-3 py-2 border-b">
              {editavel ? (
                <input aria-label="Título do módulo" defaultValue={m.titulo} className="w-full bg-transparent font-medium focus:outline-none"
                  onBlur={(e) => e.target.value !== m.titulo && renomear.mutate({ id: m.id, titulo: e.target.value })} />
              ) : <span className="font-medium">{m.titulo}</span>}
            </div>
            <ul className="py-1">
              {(aulas.data ?? []).filter((a) => a.modulo_id === m.id).map((a) => (
                <li key={a.id}><button onClick={() => setAberta(a)} className={cn("w-full text-left px-3 py-1.5 text-sm hover:bg-muted", aberta?.id === a.id && "bg-primary/10 text-primary")}>{a.titulo}</button></li>
              ))}
            </ul>
            {editavel && <button className="flex items-center gap-1 px-3 py-2 text-sm text-primary hover:underline" onClick={() => novaAula.mutate(m.id)}><Plus className="h-4 w-4" aria-hidden /> Aula</button>}
          </div>
        ))}
        {editavel && <Button variant="outline" onClick={() => novoModulo.mutate()}><Plus className="h-4 w-4" aria-hidden /> Módulo</Button>}
      </div>
      <div>{aberta ? <EditorAula key={aberta.id} aula={aberta} editavel={editavel} aoSalvar={recarregar} /> : <p className="text-muted-foreground">Escolha uma aula para editar.</p>}</div>
    </div>
  );
}

function EditorAula({ aula, editavel, aoSalvar }: { aula: Aula; editavel: boolean; aoSalvar: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState(aula);
  const anexos = useQuery({
    queryKey: ["anexos", aula.id],
    queryFn: async () => { const { data } = await supabase.from("anexos").select("*").eq("aula_id", aula.id); return data ?? []; },
  });
  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("aulas").update({ titulo: f.titulo, descricao: f.descricao, video_url: f.video_url || null, embed_url: f.embed_url || null, ordem: f.ordem }).eq("id", aula.id);
      if (error) throw error;
    },
    onSuccess: aoSalvar,
  });
  const anexar = useMutation({
    mutationFn: async (arq: File) => {
      const caminho = `${aula.id}/${Date.now()}-${arq.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("formacao-anexos").upload(caminho, arq);
      if (up.error) throw up.error;
      const { error } = await supabase.from("anexos").insert({ aula_id: aula.id, nome: arq.name, url: caminho, tipo: arq.type });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["anexos", aula.id] }),
  });
  const remover = useMutation({
    mutationFn: async (a: { id: string; url: string }) => {
      if (!a.url.startsWith("http")) await supabase.storage.from("formacao-anexos").remove([a.url]);
      const { error } = await supabase.from("anexos").delete().eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["anexos", aula.id] }),
  });

  return (
    <form className="rounded-lg border bg-card p-5 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }}>
      <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
        <div className="flex flex-col gap-1.5"><Label htmlFor="a-tit">Título da aula</Label><Input id="a-tit" disabled={!editavel} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="a-ord">Ordem</Label><Input id="a-ord" type="number" disabled={!editavel} value={f.ordem} onChange={(e) => setF({ ...f, ordem: Number(e.target.value) })} /></div>
      </div>
      <div className="flex flex-col gap-1.5"><Label htmlFor="a-video">Vídeo (YouTube, Vimeo ou Google Drive)</Label><Input id="a-video" disabled={!editavel} value={f.video_url ?? ""} onChange={(e) => setF({ ...f, video_url: e.target.value })} /></div>
      <div className="flex flex-col gap-1.5"><Label htmlFor="a-desc">Texto da aula</Label>
        <textarea id="a-desc" rows={8} disabled={!editavel} className={caixa} value={f.descricao ?? ""} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Materiais</span>
        <ul className="flex flex-col gap-1">
          {anexos.data?.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-sm rounded border px-3 py-1.5">
              <span className="flex items-center gap-2 min-w-0"><Paperclip className="h-4 w-4 shrink-0" aria-hidden /><span className="truncate">{a.nome}</span></span>
              {editavel && <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label={`Remover ${a.nome}`} onClick={() => remover.mutate(a)}><Trash2 className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
        {editavel && <input type="file" aria-label="Anexar material" onChange={(e) => e.target.files?.[0] && anexar.mutate(e.target.files[0])} className="text-sm" />}
        {anexar.isError && <Aviso tipo="erro">Não foi possível enviar o arquivo (limite de 50 MB).</Aviso>}
      </div>
      {salvar.isSuccess && <Aviso tipo="ok">Aula salva.</Aviso>}
      {editavel && <div><Button type="submit" disabled={salvar.isPending}>Salvar aula</Button></div>}
    </form>
  );
}

/* --------------------------------------------------------------- Alunos */
const SIT = ["pendente", "aprovada", "recusada", "cancelada", "concluida"];
function Alunos({ cursoId }: { cursoId: string }) {
  const qc = useQueryClient();
  const { pode, pessoa } = useAuth();
  const lista = useQuery({
    queryKey: ["alunos", cursoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("matriculas").select("id, situacao, criado_em, pessoas(id, nome, email, telefone)").eq("curso_id", cursoId).order("criado_em");
      if (error) throw error;
      return data as unknown as { id: string; situacao: string; criado_em: string; pessoas: { id: string; nome: string; email: string | null; telefone: string | null } }[];
    },
  });
  const mudar = useMutation({
    mutationFn: async ({ id, situacao }: { id: string; situacao: string }) => { const { error } = await supabase.from("matriculas").update({ situacao, decidido_por: pessoa?.id }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alunos", cursoId] }),
  });
  const [busca, setBusca] = useState("");
  const filtrados = (lista.data ?? []).filter((m) => !busca || m.pessoas.nome.toLowerCase().includes(busca.toLowerCase()));
  const csv = () => {
    const linhas = [["Nome", "E-mail", "Telefone", "Situação", "Inscrição"], ...filtrados.map((m) => [m.pessoas.nome, m.pessoas.email ?? "", m.pessoas.telefone ?? "", m.situacao, new Date(m.criado_em).toLocaleDateString("pt-BR")])];
    const blob = new Blob(["﻿" + linhas.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "alunos.csv"; a.click();
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <Input aria-label="Buscar aluno" placeholder="Buscar aluno" className="max-w-xs" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <span className="text-sm text-muted-foreground">{lista.data?.filter((m) => m.situacao === "aprovada").length ?? 0} matriculados</span>
        <Button variant="outline" size="sm" onClick={csv}>Exportar planilha</Button>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Aluno</th><th className="px-4 py-3 font-medium">Contato</th><th className="px-4 py-3 font-medium">Situação</th></tr></thead>
          <tbody className="divide-y">
            {filtrados.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2.5 font-medium">{m.pessoas.nome}</td>
                <td className="px-4 py-2.5 text-muted-foreground break-all">{[m.pessoas.email, m.pessoas.telefone].filter(Boolean).join(" · ")}</td>
                <td className="px-4 py-2.5">
                  <select aria-label={`Situação de ${m.pessoas.nome}`} disabled={!pode("formacao.gerir")} className="rounded border border-input bg-card px-2 py-1 text-sm" value={m.situacao} onChange={(e) => mudar.mutate({ id: m.id, situacao: e.target.value })}>
                    {SIT.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Presença */
function PresencaCurso({ cursoId, modulos }: { cursoId: string; modulos: Modulo[] }) {
  const qc = useQueryClient();
  const { pessoa } = useAuth();
  const aulas = useAulasDoCurso(cursoId, modulos);
  const [aulaId, setAulaId] = useState("");
  const [horas, setHoras] = useState(3);
  const [copiado, setCopiado] = useState(false);

  const turma = useQuery({
    queryKey: ["turma", cursoId],
    queryFn: async () => { const { data } = await supabase.from("turmas").select("*").eq("curso_id", cursoId).order("criado_em").limit(1).maybeSingle(); return data; },
  });
  const alunos = useQuery({
    queryKey: ["alunos-aprovados", cursoId],
    queryFn: async () => {
      const { data } = await supabase.from("matriculas").select("pessoas(id, nome)").eq("curso_id", cursoId).eq("situacao", "aprovada");
      return ((data ?? []) as unknown as { pessoas: { id: string; nome: string } }[]).map((m) => m.pessoas).sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });
  const presencas = useQuery({
    queryKey: ["presencas-aula", aulaId],
    enabled: !!aulaId,
    queryFn: async () => { const { data } = await supabase.from("presencas").select("pessoa_id, situacao").eq("aula_id", aulaId); return new Map((data ?? []).map((p) => [p.pessoa_id, p.situacao])); },
  });
  const link = useQuery({
    queryKey: ["link-presenca", aulaId],
    enabled: !!aulaId,
    queryFn: async () => { const { data } = await supabase.from("links_presenca").select("*").eq("aula_id", aulaId).gt("expira_em", new Date().toISOString()).order("criado_em", { ascending: false }).limit(1).maybeSingle(); return data; },
  });
  const gerar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("links_presenca").insert({ aula_id: aulaId, expira_em: new Date(Date.now() + horas * 3600_000).toISOString(), url_destino: turma.data?.link_encontro ?? null, criado_por: pessoa?.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["link-presenca", aulaId] }),
  });
  const marcar = useMutation({
    mutationFn: async ({ pessoaId, situacao }: { pessoaId: string; situacao: string }) => {
      const { error } = await supabase.from("presencas").upsert({ aula_id: aulaId, pessoa_id: pessoaId, situacao, forma: "chamada", registrado_por: pessoa?.id }, { onConflict: "aula_id,pessoa_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["presencas-aula", aulaId] }),
  });

  const endereco = link.data ? `${window.location.origin}/presenca/${link.data.token}` : "";
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5 max-w-md"><Label htmlFor="p-aula">Aula</Label>
        <select id="p-aula" className={caixa} value={aulaId} onChange={(e) => setAulaId(e.target.value)}>
          <option value="">Escolha a aula</option>
          {modulos.map((m) => (
            <optgroup key={m.id} label={m.titulo}>{(aulas.data ?? []).filter((a) => a.modulo_id === m.id).map((a) => <option key={a.id} value={a.id}>{a.titulo}</option>)}</optgroup>
          ))}
        </select></div>
      {aulaId && (
        <>
          <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
            <span className="font-medium">Link de presença</span>
            {link.data ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-muted px-2 py-1 text-sm break-all select-all">{endereco}</code>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(endereco).then(() => setCopiado(true)).catch(() => setCopiado(false)); }}><Copy className="h-4 w-4" aria-hidden /> {copiado ? "Copiado" : "Copiar"}</Button>
                <span className="text-sm text-muted-foreground">Vale até {new Date(link.data.expira_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5"><Label htmlFor="p-horas">Válido por (horas)</Label><Input id="p-horas" type="number" min={1} max={12} className="w-28" value={horas} onChange={(e) => setHoras(Number(e.target.value) || 1)} /></div>
                <Button onClick={() => gerar.mutate()} disabled={gerar.isPending}>Gerar link</Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">O aluno abre o link, entra com a conta dele e a presença é registrada. {turma.data?.link_encontro ? "Depois ele é levado para a sala do Meet." : "Cadastre o link do Meet na aba Dados para o aluno ser levado à sala."}</p>
          </div>
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Aluno</th><th className="px-4 py-3 font-medium">Chamada</th></tr></thead>
              <tbody className="divide-y">
                {alunos.data?.map((a) => {
                  const s = presencas.data?.get(a.id);
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-2">{a.nome}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          {[["presente", "Presente"], ["ausente", "Falta"], ["justificada", "Justificada"]].map(([v, r]) => (
                            <button key={v} onClick={() => marcar.mutate({ pessoaId: a.id, situacao: v })}
                              className={cn("rounded-full border px-2.5 py-0.5 text-xs", s === v ? (v === "presente" ? "bg-secondary text-secondary-foreground border-secondary" : v === "ausente" ? "bg-destructive text-destructive-foreground border-destructive" : "bg-accent text-accent-foreground") : "text-muted-foreground hover:bg-muted")}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Avaliações */
function Resultados({ cursoId }: { cursoId: string }) {
  const lista = useQuery({
    queryKey: ["resultados", cursoId],
    queryFn: async () => {
      const { data } = await supabase.from("avaliacoes").select("id, titulo, situacao, nota_minima, tentativas(pessoa_id, nota, aprovada)").eq("curso_id", cursoId);
      return (data ?? []) as unknown as { id: string; titulo: string; situacao: string; nota_minima: number; tentativas: { pessoa_id: string; nota: number; aprovada: boolean }[] }[];
    },
  });
  if (lista.data?.length === 0) return <p className="text-muted-foreground">Este curso não tem avaliações.</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {lista.data?.map((a) => {
        const pessoas = new Set(a.tentativas.map((t) => t.pessoa_id));
        const aprovados = new Set(a.tentativas.filter((t) => t.aprovada).map((t) => t.pessoa_id));
        const media = a.tentativas.length ? a.tentativas.reduce((s, t) => s + Number(t.nota ?? 0), 0) / a.tentativas.length : 0;
        return (
          <li key={a.id} className="rounded-lg border bg-card p-4 flex flex-col gap-2">
            <span className="font-medium">{a.titulo}</span>
            <span className="text-xs text-muted-foreground">{a.situacao === "publicada" ? "Publicada" : a.situacao} · nota mínima {a.nota_minima}%</span>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div><dt className="text-xs text-muted-foreground">Fizeram</dt><dd className="font-display text-2xl tabular-nums">{pessoas.size}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Aprovados</dt><dd className="font-display text-2xl tabular-nums">{aprovados.size}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Média</dt><dd className="font-display text-2xl tabular-nums">{Math.round(media)}%</dd></div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
