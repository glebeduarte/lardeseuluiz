import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/app/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PaginaSite } from "@/components/inicio/Pagina";
import { toast } from "sonner";
import { Printer, Pencil, Plus, Trash2, Tags, CalendarPlus, Check } from "lucide-react";

// Calendário de trabalhos da casa (antes em calendario.lardeseuluiz.com.br, no Lovable).
// Tabelas governanca.cal_*; edição liberada para admin, gestão e direção (conferido também no banco).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Calendario { id: string; ano: number; ativo: boolean }
interface Categoria { id: string; nome: string; slug: string; cor: string; ordem: number }
interface Evento { id: string; categoria_id: string; data: string }
interface Feriado { id: string; data: string; nome: string | null }

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const COR_FERIADO = "#cccccc";

const iso = (a: number, m: number, d: number) => `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const slugify = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Mesmo mês, mesmo dia da semana e mesma ocorrência (1ª, 2ª... ou última) no ano de destino.
function dataEquivalente(dataIso: string, anoDestino: number): string {
  const [a, m, d] = dataIso.split("-").map(Number);
  const mes = m - 1;
  const dow = new Date(a, mes, d).getDay();
  const primeira = 1 + ((7 + dow - new Date(a, mes, 1).getDay()) % 7);
  const ocorrencia = Math.floor((d - primeira) / 7);
  const ultima = d + 7 > new Date(a, mes + 1, 0).getDate();
  const fimDestino = new Date(anoDestino, mes + 1, 0).getDate();
  let alvo = 1 + ((7 + dow - new Date(anoDestino, mes, 1).getDay()) % 7);
  if (ultima) { while (alvo + 7 <= fimDestino) alvo += 7; }
  else { alvo += ocorrencia * 7; if (alvo > fimDestino) alvo -= 7; }
  return iso(anoDestino, mes, alvo);
}

export default function CalendarioTrabalhos({ publico = false }: { publico?: boolean }) {
  const qc = useQueryClient();
  const { isAdmin, canAccess } = usePermissions();
  const podeEditar = !publico && (isAdmin || canAccess("modulo_gestao"));

  const [calId, setCalId] = useState<string>("");
  const [filtro, setFiltro] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const [abrirCategorias, setAbrirCategorias] = useState(false);
  const [abrirNovoAno, setAbrirNovoAno] = useState(false);

  const { data: calendarios = [] } = useQuery({
    queryKey: ["cal-calendarios"],
    queryFn: async () => {
      const { data, error } = await db.from("cal_calendarios").select("*").order("ano", { ascending: false });
      if (error) throw error;
      return data as Calendario[];
    },
  });
  useEffect(() => {
    if (!calId && calendarios.length) setCalId((calendarios.find((c) => c.ativo) ?? calendarios[0]).id);
  }, [calendarios, calId]);
  const cal = calendarios.find((c) => c.id === calId);

  const { data: categorias = [] } = useQuery({
    queryKey: ["cal-categorias"],
    queryFn: async () => {
      const { data, error } = await db.from("cal_categorias").select("*").order("ordem").order("nome");
      if (error) throw error;
      return data as Categoria[];
    },
  });
  const { data: eventos = [] } = useQuery({
    queryKey: ["cal-eventos", calId],
    enabled: !!calId,
    queryFn: async () => {
      const { data, error } = await db.from("cal_eventos").select("id,categoria_id,data").eq("calendario_id", calId);
      if (error) throw error;
      return data as Evento[];
    },
  });
  const { data: feriados = [] } = useQuery({
    queryKey: ["cal-feriados", calId],
    enabled: !!calId,
    queryFn: async () => {
      const { data, error } = await db.from("cal_feriados").select("id,data,nome").eq("calendario_id", calId);
      if (error) throw error;
      return data as Feriado[];
    },
  });

  const catPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const porDia = useMemo(() => {
    const m = new Map<string, Categoria[]>();
    eventos.forEach((e) => {
      const c = catPorId.get(e.categoria_id);
      if (c) m.set(e.data, [...(m.get(e.data) || []), c].sort((x, y) => x.ordem - y.ordem));
    });
    return m;
  }, [eventos, catPorId]);
  const feriadoSet = useMemo(() => new Set(feriados.map((f) => f.data)), [feriados]);

  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["cal-eventos", calId] });
    qc.invalidateQueries({ queryKey: ["cal-feriados", calId] });
  };

  const ano = cal?.ano ?? new Date().getFullYear();

  const conteudo = (
      <>
        <div className="max-w-7xl mx-auto space-y-5 print:space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
            <div>
              {!publico && <h1 className="text-2xl font-bold">Calendário de trabalhos</h1>}
              <p className="text-sm text-muted-foreground">Toque em um dia colorido para ver o que acontece nele.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {calendarios.length > 0 && (
                <Select value={calId} onValueChange={setCalId}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {calendarios.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.ano}{c.ativo ? " (ativo)" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" />Imprimir</Button>
              {podeEditar && (
                <>
                  <Button variant={editando ? "default" : "outline"} size="sm" onClick={() => setEditando(!editando)}>
                    {editando ? <Check className="w-4 h-4 mr-1" /> : <Pencil className="w-4 h-4 mr-1" />}
                    {editando ? "Concluir edição" : "Editar"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setAbrirCategorias(true)}><Tags className="w-4 h-4 mr-1" />Categorias</Button>
                  <Button variant="outline" size="sm" onClick={() => setAbrirNovoAno(true)}><CalendarPlus className="w-4 h-4 mr-1" />Novo ano</Button>
                </>
              )}
            </div>
          </div>

          <h2 className="hidden print:block text-center text-xl font-bold">Lar de Seu Luiz · Calendário de trabalhos {ano}</h2>

          {editando && (
            <p className="text-sm rounded-md border border-primary/40 bg-primary/5 px-3 py-2 print:hidden">
              Modo de edição: toque em um dia para marcar as atividades e o feriado.
              {cal && !cal.ativo && (
                <Button variant="link" size="sm" className="ml-2 h-auto p-0" onClick={async () => {
                  const { error } = await db.rpc("cal_ativar", { p_id: cal.id });
                  if (error) return toast.error("Não foi possível ativar.");
                  qc.invalidateQueries({ queryKey: ["cal-calendarios"] });
                  toast.success(`${cal.ano} passa a ser o calendário ativo.`);
                }}>Tornar {cal.ano} o calendário ativo</Button>
              )}
            </p>
          )}

          {/* Legenda com filtro */}
          <div className="flex flex-wrap justify-center gap-2 p-3 bg-card rounded-lg border print:p-1 print:gap-1">
            {[...categorias.map((c) => ({ slug: c.slug, nome: c.nome, cor: c.cor })), { slug: "feriado", nome: "Feriados", cor: COR_FERIADO }].map((c) => (
              <button key={c.slug} onClick={() => setFiltro(filtro === c.slug ? null : c.slug)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full border-2 text-sm transition ${filtro === c.slug ? "border-primary" : "border-transparent"} ${filtro && filtro !== c.slug ? "opacity-40" : ""} print:text-[10px] print:px-1`}>
                <span className="w-4 h-4 rounded" style={{ backgroundColor: c.cor }} />{c.nome}
              </button>
            ))}
            {filtro && <button onClick={() => setFiltro(null)} className="px-3 py-1 rounded-full bg-muted text-sm print:hidden">Limpar filtro</button>}
          </div>

          {calendarios.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Nenhum calendário cadastrado ainda.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
              {MESES.map((mes, mi) => {
                const inicio = new Date(ano, mi, 1).getDay();
                const total = new Date(ano, mi + 1, 0).getDate();
                const celulas: (number | null)[] = [...Array(inicio).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
                return (
                  <div key={mes} className="bg-card rounded-lg p-3 border print:p-1 print:break-inside-avoid">
                    <h3 className="font-bold text-primary capitalize mb-2 print:mb-0 print:text-sm">{mes}</h3>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {SEMANA.map((s, i) => <div key={i} className={`text-center text-xs font-semibold ${i === 0 ? "text-destructive" : "text-muted-foreground"}`}>{s}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 print:gap-0.5">
                      {celulas.map((dia, i) => {
                        if (dia === null) return <div key={i} className="aspect-square" />;
                        const chave = iso(ano, mi, dia);
                        const ativs = porDia.get(chave) || [];
                        const feriado = feriadoSet.has(chave);
                        const combina = !filtro || ativs.some((a) => a.slug === filtro) || (filtro === "feriado" && feriado);
                        const cores = ativs.slice(0, 3).map((a) => `${a.cor}55`);
                        const fundo = cores.length === 2
                          ? `linear-gradient(135deg, ${cores[0]} 50%, ${cores[1]} 50%)`
                          : cores.length === 3
                            ? `linear-gradient(135deg, ${cores[0]} 33%, ${cores[1]} 33%, ${cores[1]} 66%, ${cores[2]} 66%)`
                            : ativs[0] ? `${ativs[0].cor}30` : undefined;
                        const dica = [...ativs.map((a) => a.nome), ...(feriado ? ["Feriado"] : [])].join(", ");
                        const el = (
                          <button type="button" disabled={!editando && !dica} onClick={editando ? () => setDiaAberto(chave) : undefined}
                            className={`relative w-full aspect-square flex items-center justify-center text-sm font-medium rounded-md print:text-[10px]
                              ${ativs.length ? "border" : ""} ${editando || dica ? "hover:ring-2 hover:ring-primary cursor-pointer" : "cursor-default"}
                              ${feriado ? "font-bold" : ""} ${i % 7 === 0 && !ativs.length && !feriado ? "text-destructive/70" : ""}
                              ${combina ? "" : "opacity-20"}`}
                            style={{ background: fundo, borderColor: ativs[0]?.cor, color: feriado ? "#9ca3af" : undefined }}>
                            {dia}
                            {ativs.length > 1 && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-foreground/70" />}
                          </button>
                        );
                        if (!dica || editando) return <div key={i}>{el}</div>;
                        const [, mm, dd] = chave.split("-");
                        return (
                          <Popover key={i}>
                            <PopoverTrigger asChild>{el}</PopoverTrigger>
                            <PopoverContent side="top" className="w-60 p-3">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">
                                {new Date(ano, Number(mm) - 1, Number(dd)).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                              </p>
                              <ul className="space-y-1.5">
                                {ativs.map((a) => (
                                  <li key={a.id} className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: a.cor }} />{a.nome}</li>
                                ))}
                                {feriado && (
                                  <li className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: COR_FERIADO }} />
                                    Feriado{feriados.find((f) => f.data === chave)?.nome ? `: ${feriados.find((f) => f.data === chave)?.nome}` : ""}</li>
                                )}
                              </ul>
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {diaAberto && cal && (
          <DialogDia data={diaAberto} calId={cal.id} categorias={categorias} eventos={eventos.filter((e) => e.data === diaAberto)}
            feriado={feriados.find((f) => f.data === diaAberto)} onFechar={() => setDiaAberto(null)} onSalvo={recarregar} />
        )}
        <DialogCategorias aberto={abrirCategorias} onFechar={() => setAbrirCategorias(false)} categorias={categorias}
          onMudou={() => { qc.invalidateQueries({ queryKey: ["cal-categorias"] }); recarregar(); }} />
        <DialogNovoAno aberto={abrirNovoAno} onFechar={() => setAbrirNovoAno(false)} calendarios={calendarios}
          onCriado={(id) => { qc.invalidateQueries({ queryKey: ["cal-calendarios"] }); setCalId(id); }} />
      </>
  );

  return publico ? (
    <PaginaSite documento="Calendário" titulo={`Calendário de trabalhos ${ano}`}
      intro="Dias de trabalho, atendimentos ao público, cursos, reuniões e eventos da casa ao longo do ano.">
      {conteudo}
    </PaginaSite>
  ) : <AppLayout>{conteudo}</AppLayout>;
}

function DialogDia({ data, calId, categorias, eventos, feriado, onFechar, onSalvo }: {
  data: string; calId: string; categorias: Categoria[]; eventos: Evento[]; feriado?: Feriado; onFechar: () => void; onSalvo: () => void;
}) {
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set(eventos.map((e) => e.categoria_id)));
  const [ehFeriado, setEhFeriado] = useState(!!feriado);
  const [nomeFeriado, setNomeFeriado] = useState(feriado?.nome ?? "");
  const [salvando, setSalvando] = useState(false);
  const [a, m, d] = data.split("-").map(Number);
  const titulo = new Date(a, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const salvar = async () => {
    setSalvando(true);
    try {
      const atuais = new Set(eventos.map((e) => e.categoria_id));
      const remover = eventos.filter((e) => !marcadas.has(e.categoria_id)).map((e) => e.id);
      const incluir = [...marcadas].filter((c) => !atuais.has(c)).map((c) => ({ calendario_id: calId, categoria_id: c, data }));
      if (remover.length) { const { error } = await db.from("cal_eventos").delete().in("id", remover); if (error) throw error; }
      if (incluir.length) { const { error } = await db.from("cal_eventos").insert(incluir); if (error) throw error; }
      if (ehFeriado) {
        const { error } = await db.from("cal_feriados").upsert({ calendario_id: calId, data, nome: nomeFeriado.trim() || null }, { onConflict: "calendario_id,data" });
        if (error) throw error;
      } else if (feriado) {
        const { error } = await db.from("cal_feriados").delete().eq("id", feriado.id); if (error) throw error;
      }
      onSalvo(); onFechar();
    } catch {
      toast.error("Não foi possível salvar. Confira se você tem permissão de edição.");
    } finally { setSalvando(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="capitalize">{titulo}</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {categorias.map((c) => (
            <label key={c.id} className="flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer">
              <Checkbox checked={marcadas.has(c.id)} onCheckedChange={(v) => {
                const n = new Set(marcadas); v ? n.add(c.id) : n.delete(c.id); setMarcadas(n);
              }} />
              <span className="w-4 h-4 rounded" style={{ backgroundColor: c.cor }} />
              <span className="text-sm">{c.nome}</span>
            </label>
          ))}
          <label className="flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer">
            <Checkbox checked={ehFeriado} onCheckedChange={(v) => setEhFeriado(!!v)} />
            <span className="w-4 h-4 rounded" style={{ backgroundColor: COR_FERIADO }} />
            <span className="text-sm">Feriado</span>
          </label>
          {ehFeriado && <Input placeholder="Nome do feriado (opcional)" value={nomeFeriado} onChange={(e) => setNomeFeriado(e.target.value)} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogCategorias({ aberto, onFechar, categorias, onMudou }: {
  aberto: boolean; onFechar: () => void; categorias: Categoria[]; onMudou: () => void;
}) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#3b82f6");

  const criar = async () => {
    if (!nome.trim()) return;
    const ordem = Math.max(0, ...categorias.map((c) => c.ordem)) + 1;
    const { error } = await db.from("cal_categorias").insert({ nome: nome.trim(), slug: slugify(nome), cor, ordem });
    if (error) return toast.error("Não foi possível criar (o nome pode já existir).");
    setNome(""); onMudou();
  };
  const atualizar = async (c: Categoria, campos: Partial<Categoria>) => {
    const { error } = await db.from("cal_categorias").update(campos).eq("id", c.id);
    if (error) return toast.error("Não foi possível salvar.");
    onMudou();
  };
  const excluir = async (c: Categoria) => {
    if (!confirm(`Excluir "${c.nome}"? As marcações dessa categoria em todos os anos também saem.`)) return;
    const { error } = await db.from("cal_categorias").delete().eq("id", c.id);
    if (error) return toast.error("Não foi possível excluir.");
    onMudou();
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Categorias do calendário</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {categorias.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <input type="color" defaultValue={c.cor} onBlur={(e) => e.target.value !== c.cor && atualizar(c, { cor: e.target.value })} className="w-9 h-9 rounded border" />
              <Input defaultValue={c.nome} onBlur={(e) => e.target.value.trim() && e.target.value !== c.nome && atualizar(c, { nome: e.target.value.trim() })} />
              <Button variant="ghost" size="icon" onClick={() => excluir(c)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 space-y-2">
          <Label>Nova categoria</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="w-9 h-9 rounded border" />
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Evangelização infantil" />
            <Button onClick={criar}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogNovoAno({ aberto, onFechar, calendarios, onCriado }: {
  aberto: boolean; onFechar: () => void; calendarios: Calendario[]; onCriado: (id: string) => void;
}) {
  const [ano, setAno] = useState(new Date().getFullYear() + 1);
  const [origem, setOrigem] = useState<string>("nenhum");
  const [ativar, setAtivar] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const criar = async () => {
    if (calendarios.some((c) => c.ano === ano)) return toast.error("Já existe calendário para esse ano.");
    setSalvando(true);
    try {
      const { data: novo, error } = await db.from("cal_calendarios").insert({ ano, ativo: false }).select().single();
      if (error) throw error;
      if (origem !== "nenhum") {
        const { data: evs, error: e1 } = await db.from("cal_eventos").select("categoria_id,data").eq("calendario_id", origem);
        if (e1) throw e1;
        const linhas = (evs as Evento[]).map((e) => ({ calendario_id: novo.id, categoria_id: e.categoria_id, data: dataEquivalente(e.data, ano) }));
        const unicas = [...new Map(linhas.map((l) => [`${l.categoria_id}|${l.data}`, l])).values()];
        if (unicas.length) { const { error: e2 } = await db.from("cal_eventos").insert(unicas); if (e2) throw e2; }
      }
      if (ativar) await db.rpc("cal_ativar", { p_id: novo.id });
      toast.success(`Calendário ${ano} criado. Confira os feriados, que não são copiados.`);
      onCriado(novo.id); onFechar();
    } catch {
      toast.error("Não foi possível criar o calendário.");
    } finally { setSalvando(false); }
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo calendário</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1"><Label>Ano</Label><Input type="number" value={ano} onChange={(e) => setAno(parseInt(e.target.value) || ano)} className="w-32" /></div>
          <div className="space-y-1">
            <Label>Copiar marcações de</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Começar vazio</SelectItem>
                {calendarios.map((c) => <SelectItem key={c.id} value={c.id}>{c.ano}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">A cópia mantém o dia da semana e a posição no mês (ex.: 3ª terça de março).</p>
          </div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={ativar} onCheckedChange={(v) => setAtivar(!!v)} />Tornar o calendário ativo</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={criar} disabled={salvando}>{salvando ? "Criando..." : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
