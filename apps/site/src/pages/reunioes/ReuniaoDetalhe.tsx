import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CalendarClock, Check, CloudOff, Copy, FileText, ListChecks, Loader2, MapPin, MessageSquareText,
  NotebookPen, Paperclip, Trash2, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import GuardaReunioes from "@/components/reunioes/GuardaReunioes";
import type { EditorNotasRef } from "@/components/reunioes/EditorNotas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  buscarReuniao, doCampoDataHora, enviarArquivoReuniao, excluirReuniao, linkAssinado, nomesDePessoas,
  paraCampoDataHora, removerArquivoReuniao, salvarReuniao, tamanhoLegivel, type Reuniao,
} from "@/lib/reunioes";

// Ficha de uma reunião: dados (data e hora, local, participantes), pauta inicial, transcrição e anotações.
// Tudo é salvo sozinho, pouco depois de a pessoa parar de digitar.

const EditorNotas = lazy(() => import("@/components/reunioes/EditorNotas"));

type Estado = "salvo" | "pendente" | "salvando" | "erro";

const CarregandoEditor = () => (
  <div className="flex items-center gap-2 py-10 justify-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Abrindo o editor...</div>
);

function Secao({ icone: Icone, titulo, ajuda, acoes, children }: {
  icone: typeof NotebookPen; titulo: string; ajuda?: ReactNode; acoes?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card border shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 sm:px-6 pt-5 pb-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-['Playfair_Display'] text-xl font-bold" style={{ color: "hsl(var(--primary-dark))" }}>
            <Icone className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--primary))" }} />{titulo}
          </h2>
          {ajuda && <p className="mt-1 text-sm text-muted-foreground">{ajuda}</p>}
        </div>
        {acoes}
      </header>
      <div className="px-2 sm:px-4 pb-4">{children}</div>
    </section>
  );
}

function Participantes({ valor, aoMudar, sugestoes }: { valor: string[]; aoMudar: (v: string[]) => void; sugestoes: string[] }) {
  const [texto, setTexto] = useState("");

  const incluir = (bruto: string) => {
    const novos = bruto.split(/[,;\n]+/).map((n) => n.trim().replace(/\s+/g, " ")).filter(Boolean);
    if (!novos.length) return;
    const ja = new Set(valor.map((n) => n.toLowerCase()));
    const lista = [...valor];
    for (const n of novos) if (!ja.has(n.toLowerCase())) { ja.add(n.toLowerCase()); lista.push(n); }
    if (lista.length !== valor.length) aoMudar(lista);
    setTexto("");
  };

  const tecla = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); incluir(texto); }
    else if (e.key === "Backspace" && !texto && valor.length) aoMudar(valor.slice(0, -1));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
        {valor.map((nome) => (
          <span key={nome} className="inline-flex items-center gap-1 rounded-full pl-3 pr-1 py-1 text-sm font-medium" style={{ background: "hsl(var(--primary-muted))", color: "hsl(var(--primary-dark))" }}>
            {nome}
            <button type="button" onClick={() => aoMudar(valor.filter((n) => n !== nome))} aria-label={`Tirar ${nome}`}
              className="rounded-full p-1 hover:bg-white/70"><X className="w-3.5 h-3.5" /></button>
          </span>
        ))}
        <input list="reuniao-pessoas" value={texto} onKeyDown={tecla} onBlur={() => incluir(texto)}
          onChange={(e) => {
            const v = e.target.value;
            // Escolher um nome da lista de sugestões já inclui a pessoa
            if (sugestoes.includes(v)) incluir(v); else setTexto(v);
          }}
          onPaste={(e) => {
            const colado = e.clipboardData.getData("text");
            if (/[,;\n]/.test(colado)) { e.preventDefault(); incluir(colado); }
          }}
          placeholder={valor.length ? "Incluir mais alguém" : "Digite um nome e aperte Enter"}
          className="flex-1 min-w-[180px] bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-muted-foreground" />
        <datalist id="reuniao-pessoas">
          {sugestoes.filter((n) => !valor.includes(n)).map((n) => <option key={n} value={n} />)}
        </datalist>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">Um nome por vez. Vale também quem não tem cadastro na casa.</p>
    </div>
  );
}

function Ficha({ inicial }: { inicial: Reuniao }) {
  const id = inicial.id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [r, setR] = useState(inicial);
  const [estado, setEstado] = useState<Estado>("salvo");
  const [salvoEm, setSalvoEm] = useState<Date | null>(null);
  const [enviando, setEnviando] = useState(false);
  const anotacoesRef = useRef<EditorNotasRef>(null);
  const campoArquivo = useRef<HTMLInputElement>(null);
  const campoTitulo = useRef<HTMLTextAreaElement>(null);

  // O título cresce em altura quando não cabe numa linha (no celular, por exemplo)
  useLayoutEffect(() => {
    const el = campoTitulo.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [r.titulo]);

  const { data: pessoas = [] } = useQuery({ queryKey: ["reunioes-pessoas"], queryFn: nomesDePessoas, staleTime: 10 * 60 * 1000 });

  // Salvamento automático: junta as mudanças e grava 1,2 s depois da última; as gravações saem uma de cada vez.
  const pendente = useRef<Partial<Reuniao>>({});
  const relogio = useRef<number>();
  const fila = useRef<Promise<void>>(Promise.resolve());
  const avisouErro = useRef(false);

  const gravar = useCallback(() => {
    window.clearTimeout(relogio.current);
    fila.current = fila.current.then(async () => {
      const campos = pendente.current;
      if (!Object.keys(campos).length) return;
      pendente.current = {};
      setEstado("salvando");
      try {
        await salvarReuniao(id, campos);
        avisouErro.current = false;
        setSalvoEm(new Date());
        setEstado(Object.keys(pendente.current).length ? "pendente" : "salvo");
      } catch (e) {
        // Devolve o que não foi gravado, sem passar por cima do que mudou nesse meio tempo
        pendente.current = { ...campos, ...pendente.current };
        setEstado("erro");
        if (!avisouErro.current) {
          avisouErro.current = true;
          toast.error((e as Error).message || "Não foi possível salvar. Confira a internet.");
        }
      }
    });
    return fila.current;
  }, [id]);

  const mudar = useCallback((campos: Partial<Reuniao>) => {
    pendente.current = { ...pendente.current, ...campos };
    setEstado("pendente");
    window.clearTimeout(relogio.current);
    relogio.current = window.setTimeout(gravar, 1200);
  }, [gravar]);

  const campo = (campos: Partial<Reuniao>) => { setR((a) => ({ ...a, ...campos })); mudar(campos); };

  // Ao sair da tela, grava o que faltou e atualiza a lista
  useEffect(() => () => { gravar().then(() => qc.invalidateQueries({ queryKey: ["reunioes"] })); }, [gravar, qc]);
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (Object.keys(pendente.current).length) { gravar(); e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [gravar]);

  const anexarTranscricao = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setEnviando(true);
    try {
      const caminho = await enviarArquivoReuniao(id, arquivo);
      const anterior = r.transcricao_arquivo;
      campo({ transcricao_arquivo: { caminho, nome: arquivo.name, tamanho: arquivo.size } });
      if (anterior) removerArquivoReuniao(anterior.caminho);
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível enviar o arquivo.");
    } finally {
      setEnviando(false);
      if (campoArquivo.current) campoArquivo.current.value = "";
    }
  };

  const abrirTranscricao = async () => {
    if (!r.transcricao_arquivo) return;
    // A aba é aberta já no clique, para o navegador não bloquear; o link assinado chega em seguida
    const aba = window.open("", "_blank");
    try {
      const url = await linkAssinado(r.transcricao_arquivo.caminho);
      if (aba) aba.location.href = url; else window.location.href = url;
    } catch (e) {
      aba?.close();
      toast.error((e as Error).message);
    }
  };

  const tirarTranscricao = () => {
    if (!r.transcricao_arquivo) return;
    removerArquivoReuniao(r.transcricao_arquivo.caminho);
    campo({ transcricao_arquivo: null });
  };

  const copiarMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(anotacoesRef.current?.emMarkdown() ?? "");
      toast.success("Anotações copiadas em markdown.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const excluir = async () => {
    try {
      window.clearTimeout(relogio.current);
      pendente.current = {};
      await excluirReuniao(id);
      qc.invalidateQueries({ queryKey: ["reunioes"] });
      toast.success("Reunião excluída.");
      navigate("/app/reunioes");
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível excluir.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/reunioes" className="lsl-cabecalho__voltar" style={{ marginBottom: 0 }}><ArrowLeft />Reuniões</Link>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
            {estado === "salvando" && <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>}
            {estado === "pendente" && <>Salvando em instantes...</>}
            {estado === "salvo" && salvoEm && <><Check className="w-4 h-4 text-emerald-600" /> Salvo às {salvoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</>}
            {estado === "erro" && (
              <button type="button" onClick={() => gravar()} className="flex items-center gap-1.5 font-semibold text-destructive underline">
                <CloudOff className="w-4 h-4" /> Não salvou. Tentar de novo
              </button>
            )}
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Excluir reunião" title="Excluir reunião"><Trash2 className="w-4 h-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir esta reunião?</AlertDialogTitle>
                <AlertDialogDescription>A pauta, as anotações, a transcrição e os arquivos enviados serão apagados. Não dá para desfazer.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={excluir} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <textarea ref={campoTitulo} rows={1} value={r.titulo} placeholder="Título da reunião" aria-label="Título da reunião"
        autoFocus={!inicial.titulo}
        onChange={(e) => campo({ titulo: e.target.value.replace(/\n/g, " ") })}
        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
        className="block w-full resize-none overflow-hidden bg-transparent font-['Playfair_Display'] text-3xl sm:text-4xl font-bold leading-tight outline-none placeholder:text-slate-300"
        style={{ color: "hsl(var(--primary-dark))" }} />

      <section className="rounded-2xl bg-card border shadow-sm p-4 sm:p-6 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reuniao-data" className="flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Data e hora</Label>
          <Input id="reuniao-data" type="datetime-local" className="h-11 text-base" value={paraCampoDataHora(r.data_hora)}
            onChange={(e) => campo({ data_hora: doCampoDataHora(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reuniao-local" className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Local</Label>
          <Input id="reuniao-local" className="h-11 text-base" list="reuniao-locais" value={r.local ?? ""} placeholder="Sede do Lar, Google Meet..."
            onChange={(e) => campo({ local: e.target.value })} />
          <datalist id="reuniao-locais"><option value="Sede do Lar" /><option value="Google Meet" /><option value="WhatsApp" /></datalist>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label className="flex items-center gap-2"><Users className="w-4 h-4" /> Participantes{r.participantes.length > 0 && <span className="text-muted-foreground font-normal">({r.participantes.length})</span>}</Label>
          <Participantes valor={r.participantes} aoMudar={(participantes) => campo({ participantes })} sugestoes={pessoas} />
        </div>
      </section>

      <Secao icone={ListChecks} titulo="Pauta inicial" ajuda="Os assuntos previstos para a conversa.">
        <Suspense fallback={<CarregandoEditor />}>
          <EditorNotas reuniaoId={id} inicial={inicial.pauta} tamanho="pauta" aoMudar={(pauta) => mudar({ pauta })}
            dica="Liste os assuntos, ou digite / para ver as formatações" />
        </Suspense>
      </Secao>

      <Secao icone={NotebookPen} titulo="Anotações"
        ajuda={<>Digite <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-semibold">/</kbd> para escolher título, lista, tarefa, tabela, imagem, vídeo, áudio ou arquivo. Os atalhos de markdown também funcionam: <code>#</code> título, <code>-</code> lista, <code>[]</code> tarefa, <code>&gt;</code> citação.</>}
        acoes={<Button variant="outline" size="sm" onClick={copiarMarkdown}><Copy className="w-4 h-4 mr-2" /> Copiar em markdown</Button>}>
        <Suspense fallback={<CarregandoEditor />}>
          <EditorNotas ref={anotacoesRef} reuniaoId={id} inicial={inicial.anotacoes} tamanho="anotacoes" aoMudar={(anotacoes) => mudar({ anotacoes })}
            dica="Registre o que foi conversado, ou digite / para ver as formatações" />
        </Suspense>
      </Secao>

      <Secao icone={MessageSquareText} titulo="Transcrição" ajuda="Cole o texto da transcrição ou anexe o arquivo (texto, documento, áudio ou vídeo, até 50 MB).">
        <div className="px-2 space-y-3">
          {r.transcricao_arquivo ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
              <FileText className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--primary))" }} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.transcricao_arquivo.nome}</div>
                <div className="text-xs text-muted-foreground">{tamanhoLegivel(r.transcricao_arquivo.tamanho)}</div>
              </div>
              <Button variant="outline" size="sm" onClick={abrirTranscricao}>Abrir</Button>
              <Button variant="ghost" size="sm" onClick={tirarTranscricao}>Remover</Button>
            </div>
          ) : (
            <Button variant="outline" className="h-11" disabled={enviando} onClick={() => campoArquivo.current?.click()}>
              {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />}
              {enviando ? "Enviando..." : "Anexar arquivo da transcrição"}
            </Button>
          )}
          <input ref={campoArquivo} type="file" className="hidden" onChange={(e) => anexarTranscricao(e.target.files?.[0])} />
          <Textarea value={r.transcricao_texto ?? ""} onChange={(e) => campo({ transcricao_texto: e.target.value })}
            placeholder="Cole aqui o texto da transcrição" className="min-h-[180px] max-h-[60vh] text-base leading-relaxed" />
        </div>
      </Secao>
    </div>
  );
}

function Pagina() {
  const { id = "" } = useParams();
  // Sempre busca de novo ao abrir, para não mostrar no editor uma versão antiga guardada na memória
  const { data, isLoading, error } = useQuery({ queryKey: ["reuniao", id], queryFn: () => buscarReuniao(id), gcTime: 0, staleTime: Infinity, refetchOnWindowFocus: false });

  return (
    <AppLayout>
      {isLoading ? (
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Carregando...</div>
      ) : error || !data ? (
        <div className="max-w-xl mx-auto text-center py-20 space-y-4">
          <p className="text-muted-foreground">Reunião não encontrada.</p>
          <Button asChild variant="outline"><Link to="/app/reunioes">Voltar para Reuniões</Link></Button>
        </div>
      ) : (
        <Ficha key={data.id} inicial={data} />
      )}
    </AppLayout>
  );
}

export default function ReuniaoDetalhe() {
  return <GuardaReunioes><Pagina /></GuardaReunioes>;
}
