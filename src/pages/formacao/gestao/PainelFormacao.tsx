import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Aviso } from "@/components/ContaLayout";
import { cn } from "@/lib/utils";

const ABAS = ["Cursos", "Inscrições pendentes", "Calendário", "Biblioteca"] as const;
export const caixa = "rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function PainelFormacao() {
  const [aba, setAba] = useState<(typeof ABAS)[number]>("Cursos");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Formação</h1>
        <p className="text-muted-foreground">Cursos, alunos, presenças, calendário e biblioteca.</p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {ABAS.map((a) => (
          <button key={a} role="tab" aria-selected={aba === a} onClick={() => setAba(a)} style={{ borderRadius: 0 }}
            className={cn("whitespace-nowrap px-3 py-2 text-sm border-b-2 -mb-px", aba === a ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {a}
          </button>
        ))}
      </div>
      {aba === "Cursos" && <ListaCursos />}
      {aba === "Inscrições pendentes" && <Pendentes />}
      {aba === "Calendário" && <EditorCalendario />}
      {aba === "Biblioteca" && <EditorBiblioteca />}
    </div>
  );
}

function ListaCursos() {
  const { pode } = useAuth();
  const navigate = useNavigate();
  const cursos = useQuery({
    queryKey: ["gestao-cursos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cursos").select("id, titulo, situacao, publico, inscricoes_abertas, matriculas(count)").order("titulo");
      if (error) throw error;
      return data as unknown as { id: string; titulo: string; situacao: string; publico: string; inscricoes_abertas: boolean; matriculas: { count: number }[] }[];
    },
  });
  const criar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("cursos").insert({ titulo: "Novo curso", situacao: "rascunho" }).select("id").single();
      if (error) throw error;
      await supabase.from("turmas").insert({ curso_id: data.id, nome: "Turma única" });
      return data.id as string;
    },
    onSuccess: (id) => navigate(`/formacao/gestao/curso/${id}`),
  });

  return (
    <div className="flex flex-col gap-4">
      {pode("formacao.gerir") && <div><Button onClick={() => criar.mutate()} disabled={criar.isPending}><Plus className="h-4 w-4" aria-hidden /> Novo curso</Button></div>}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-3 font-medium">Curso</th><th className="px-4 py-3 font-medium">Situação</th><th className="px-4 py-3 font-medium">Público</th><th className="px-4 py-3 font-medium text-right">Alunos</th></tr>
          </thead>
          <tbody className="divide-y">
            {cursos.data?.map((c) => (
              <tr key={c.id} className="hover:bg-muted/40">
                <td className="px-4 py-3"><Link to={`/formacao/gestao/curso/${c.id}`} className="font-medium text-primary hover:underline">{c.titulo}</Link></td>
                <td className="px-4 py-3">{{ publicado: "Publicado", rascunho: "Rascunho", arquivado: "Arquivado" }[c.situacao]}{c.situacao === "publicado" && !c.inscricoes_abertas && " · inscrições fechadas"}</td>
                <td className="px-4 py-3">{c.publico === "voluntarios" ? "Voluntários" : "Todos"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{c.matriculas?.[0]?.count ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pendentes() {
  const qc = useQueryClient();
  const { pessoa, pode } = useAuth();
  const lista = useQuery({
    queryKey: ["matriculas-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matriculas").select("id, criado_em, pessoas(nome, email, telefone), cursos(titulo)").eq("situacao", "pendente").order("criado_em");
      if (error) throw error;
      return data as unknown as { id: string; criado_em: string; pessoas: { nome: string; email: string | null; telefone: string | null }; cursos: { titulo: string } }[];
    },
  });
  const decidir = useMutation({
    mutationFn: async ({ id, situacao }: { id: string; situacao: string }) => {
      const { error } = await supabase.from("matriculas").update({ situacao, decidido_por: pessoa?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matriculas-pendentes"] }),
  });
  if (lista.data?.length === 0) return <p className="text-muted-foreground">Nenhuma inscrição aguardando aprovação.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {lista.data?.map((m) => (
        <li key={m.id} className="rounded-lg border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="font-medium">{m.pessoas.nome}</span>
            <span className="text-sm text-muted-foreground">{m.cursos.titulo} · {new Date(m.criado_em).toLocaleDateString("pt-BR")}</span>
          </div>
          {pode("formacao.gerir") && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => decidir.mutate({ id: m.id, situacao: "aprovada" })}>Aprovar</Button>
              <Button size="sm" variant="outline" onClick={() => decidir.mutate({ id: m.id, situacao: "recusada" })}>Recusar</Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

type Entrada = { id?: string; codigo_curso: string; data: string | null; rotulo_data: string; ordem: number; roteiro: string; tema: string; modulo: string; facilitador: string; tipo: string };
function EditorCalendario() {
  const qc = useQueryClient();
  const { pode } = useAuth();
  const lista = useQuery({
    queryKey: ["calendario-gestao"],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendario_estudos").select("*").order("codigo_curso").order("data");
      if (error) throw error;
      return data as Entrada[];
    },
  });
  const [form, setForm] = useState<Entrada | null>(null);
  const salvar = useMutation({
    mutationFn: async (e: Entrada) => {
      const rotulo = e.data ? new Date(e.data + "T12:00").toLocaleDateString("pt-BR") : e.rotulo_data;
      const dados = { ...e, rotulo_data: rotulo };
      const { error } = e.id ? await supabase.from("calendario_estudos").update(dados).eq("id", e.id) : await supabase.from("calendario_estudos").insert(dados);
      if (error) throw error;
    },
    onSuccess: () => { setForm(null); qc.invalidateQueries({ queryKey: ["calendario-gestao"] }); qc.invalidateQueries({ queryKey: ["calendario"] }); },
  });
  const remover = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("calendario_estudos").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendario-gestao"] }),
  });
  const campo = (k: keyof Entrada, rot: string, tipo = "text") => (
    <div className="flex flex-col gap-1.5"><Label htmlFor={`cal-${k}`}>{rot}</Label>
      <Input id={`cal-${k}`} type={tipo} value={(form?.[k] as string) ?? ""} onChange={(e) => setForm({ ...form!, [k]: e.target.value })} /></div>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">O calendário aparece no site em <Link to="/calendario/esde" className="text-primary hover:underline">/calendario/esde</Link>.</p>
      {pode("formacao.gerir") && !form && <div><Button onClick={() => setForm({ codigo_curso: lista.data?.[0]?.codigo_curso ?? "ESDE", data: null, rotulo_data: "", ordem: 0, roteiro: "", tema: "", modulo: "", facilitador: "", tipo: "aula" })}><Plus className="h-4 w-4" aria-hidden /> Nova data</Button></div>}
      {form && (
        <form className="rounded-lg border bg-card p-4 grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); salvar.mutate(form); }}>
          {campo("codigo_curso", "Curso (código)")}
          {campo("data", "Data", "date")}
          <div className="flex flex-col gap-1.5"><Label htmlFor="cal-tipo">Tipo</Label>
            <select id="cal-tipo" className={caixa} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="aula">Aula</option><option value="revisao">Revisão</option><option value="evento">Evento</option><option value="pausa">Sem encontro</option>
            </select></div>
          {campo("modulo", "Módulo")}
          {campo("roteiro", "Roteiro")}
          {campo("facilitador", "Facilitação")}
          <div className="sm:col-span-3">{campo("tema", "Tema")}</div>
          <div className="flex gap-2 sm:col-span-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
            <Button type="submit" disabled={salvar.isPending || !form.data}>Salvar</Button>
          </div>
          {salvar.isError && <div className="sm:col-span-3"><Aviso tipo="erro">Não foi possível salvar.</Aviso></div>}
        </form>
      )}
      <ul className="rounded-lg border bg-card divide-y">
        {lista.data?.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <button className="flex flex-col text-left min-w-0" onClick={() => pode("formacao.gerir") && setForm(e)}>
              <span className="tabular-nums text-muted-foreground">{e.codigo_curso} · {e.rotulo_data} · {e.modulo} {e.roteiro}</span>
              <span className="font-medium truncate">{e.tema}</span>
            </button>
            {pode("formacao.gerir") && <button className="rounded p-2 text-muted-foreground hover:bg-muted" aria-label="Remover data" onClick={() => remover.mutate(e.id!)}><Trash2 className="h-4 w-4" /></button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Livro = { id?: string; titulo: string; autor: string; espirito: string | null; pdf_url: string | null; capa_url: string | null };
function EditorBiblioteca() {
  const qc = useQueryClient();
  const { pode } = useAuth();
  const lista = useQuery({
    queryKey: ["livros"],
    queryFn: async () => { const { data } = await supabase.from("livros").select("*").order("titulo"); return (data ?? []) as Livro[]; },
  });
  const [form, setForm] = useState<Livro | null>(null);
  const salvar = useMutation({
    mutationFn: async (l: Livro) => {
      const dados = { titulo: l.titulo, autor: l.autor, espirito: l.espirito || null, pdf_url: l.pdf_url || null, capa_url: l.capa_url || null };
      const { error } = l.id ? await supabase.from("livros").update(dados).eq("id", l.id) : await supabase.from("livros").insert(dados);
      if (error) throw error;
    },
    onSuccess: () => { setForm(null); qc.invalidateQueries({ queryKey: ["livros"] }); },
  });
  if (!pode("formacao.gerir")) return <p className="text-muted-foreground">A biblioteca é editada pela coordenação da Formação.</p>;
  const campo = (k: keyof Livro, rot: string) => (
    <div className="flex flex-col gap-1.5"><Label htmlFor={`lv-${k}`}>{rot}</Label>
      <Input id={`lv-${k}`} value={(form?.[k] as string) ?? ""} onChange={(e) => setForm({ ...form!, [k]: e.target.value })} /></div>
  );
  return (
    <div className="flex flex-col gap-4">
      {!form && <div><Button onClick={() => setForm({ titulo: "", autor: "", espirito: "", pdf_url: "", capa_url: "" })}><Plus className="h-4 w-4" aria-hidden /> Novo livro</Button></div>}
      {form && (
        <form className="rounded-lg border bg-card p-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); salvar.mutate(form); }}>
          {campo("titulo", "Título")}{campo("autor", "Autor ou médium")}{campo("espirito", "Espírito (opcional)")}{campo("pdf_url", "Link do livro")}
          <div className="sm:col-span-2">{campo("capa_url", "Link da capa (opcional)")}</div>
          <div className="flex gap-2 sm:col-span-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
            <Button type="submit" disabled={!form.titulo || !form.autor || salvar.isPending}>Salvar</Button>
          </div>
        </form>
      )}
      <ul className="rounded-lg border bg-card divide-y">
        {lista.data?.map((l) => (
          <li key={l.id}><button className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted" onClick={() => setForm(l)}><span className="font-medium">{l.titulo}</span> <span className="text-muted-foreground">· {l.autor}</span></button></li>
        ))}
      </ul>
    </div>
  );
}
