import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Radio } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { NOME_CATEGORIA, SALA_MEET, CARTAZ, imagem, imagemSrcSet, quandoFalta, videoEmbed, type CursoVitrine, type EncontroAoVivo } from '@/lib/vitrine';

const SCRIM_0 = 'linear-gradient(90deg, #000 0%, rgba(0,0,0,.88) 34%, rgba(0,0,0,.35) 62%, rgba(0,0,0,0) 80%), linear-gradient(0deg, #000 0%, rgba(0,0,0,0) 30%)'; // taste-skill-ignore: scrim preto neutro sob o texto, sobre a foto
const SCRIM_1 = 'linear-gradient(0deg, #000, rgba(0,0,0,0))'; // taste-skill-ignore: scrim preto neutro sob o texto, sobre a foto

// Peças da vitrine do aluno: destaque do topo, faixa do encontro ao vivo, fileiras e cartazes.

const diaSemana = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long' });
const diaMes = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/** O que mostrar no botão principal de um curso. */
export function acaoDoCurso(c: CursoVitrine) {
  if (c.matricula === 'approved') {
    if (c.pct === 100) return { rotulo: 'Rever o curso', href: `/course/${c.id}` };
    if (c.proxima && c.feitas > 0) return { rotulo: `Continuar a aula ${c.proxima.numero}`, href: `/lesson/${c.proxima.id}` };
    if (c.proxima) return { rotulo: 'Começar o curso', href: `/lesson/${c.proxima.id}` };
    return { rotulo: 'Abrir o curso', href: `/course/${c.id}` };
  }
  if (c.inscricoesAbertas) return { rotulo: 'Inscrever-se', inscrever: true as const };
  return { rotulo: 'Inscrições em breve', fechado: true as const };
}

/** Linha de informações do curso: aulas, módulos, horário. */
export function metaDoCurso(c: CursoVitrine) {
  const partes = [
    c.categoria ? NOME_CATEGORIA[c.categoria] : null,
    c.aulas ? `${c.aulas} ${c.aulas === 1 ? 'aula' : 'aulas'}` : null,
    c.modulos > 1 ? `${c.modulos} módulos` : null,
    c.horario,
  ];
  return partes.filter(Boolean).join(' · ');
}

// ---------------------------------------------------------------------------------------------
// Destaque do topo
// ---------------------------------------------------------------------------------------------
export function Destaque({ itens, aoInscrever, inscrevendo }: {
  itens: CursoVitrine[];
  aoInscrever: (c: CursoVitrine) => void;
  inscrevendo: string | null;
}) {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [video, setVideo] = useState<CursoVitrine | null>(null);
  const total = itens.length;

  useEffect(() => { if (i >= total) setI(0); }, [i, total]);
  useEffect(() => {
    if (total < 2 || pausado || video) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setI((x) => (x + 1) % total), 9000);
    return () => window.clearTimeout(t);
  }, [i, total, pausado, video]);

  const c = itens[Math.min(i, total - 1)];
  if (!c) return null;
  const acao = acaoDoCurso(c);
  const largo = !!c.fundo;
  const emAndamento = c.matricula === 'approved' && c.feitas > 0 && c.pct < 100;

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques da Formação"
      onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)} onBlur={() => setPausado(false)}
      className="relative bg-black">
      {/* Imagem: no celular fica em cima do texto; no computador ocupa o fundo */}
      <div className="relative md:absolute md:inset-0 overflow-hidden">
        {largo ? (
          <img key={c.id} src={imagem(c.fundo, 1600)} srcSet={imagemSrcSet(c.fundo)} sizes="100vw" alt="" className="w-full aspect-[16/9] md:aspect-auto md:h-full object-cover animate-fade-in" />
        ) : (
          <div className="hidden md:block absolute inset-0 bg-[#111]" />
        )}
        {largo && (
          <div aria-hidden className="absolute inset-0 hidden md:block"
            style={{ background: SCRIM_0 }} />
        )}
        {largo && <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 md:hidden" style={{ background: SCRIM_1 }} />}
      </div>

      <div className="aluno-coluna relative md:min-h-[520px] md:flex md:items-center">
        <div className={`flex w-full gap-10 ${largo ? '' : 'md:justify-between'} items-center py-6 md:py-14`}>
          <div className="max-w-[560px]" aria-live="polite">
            {!largo && c.capa && (
              <img src={imagem(c.capa, 300, CARTAZ)} alt="" className="md:hidden w-32 aspect-[4/5] object-cover rounded-lg mb-5" />
            )}
            <h2 className="font-['Playfair_Display'] font-bold text-[30px] leading-[1.05] md:text-[48px] tracking-[-0.02em] text-white">{c.titulo}</h2>
            <p className="mt-3 text-[14px] text-[#b4b4b4]">{metaDoCurso(c)}</p>
            {(c.frase || c.descricao) && (
              <p className="mt-4 text-[16px] md:text-[17px] leading-relaxed text-white/90 line-clamp-3">{c.frase || c.descricao}</p>
            )}
            {emAndamento && c.proxima && (
              <div className="mt-5 max-w-[420px]">
                <div className="flex justify-between text-[13px] text-[#b4b4b4]">
                  <span className="truncate pr-3">Próxima: aula {c.proxima.numero}, {c.proxima.titulo}</span>
                  <span className="text-white tabular-nums">{c.feitas} de {c.aulas}</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-white/20" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.pct}>
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {'href' in acao && acao.href ? (
                <Link to={acao.href} className="aluno-botao aluno-botao--principal"><Play className="h-4 w-4 fill-current" />{acao.rotulo}</Link>
              ) : 'inscrever' in acao ? (
                <button className="aluno-botao aluno-botao--principal" disabled={inscrevendo === c.id} onClick={() => aoInscrever(c)}>
                  {inscrevendo === c.id ? 'Inscrevendo...' : acao.rotulo}
                </button>
              ) : (
                <button className="aluno-botao aluno-botao--principal" disabled>{acao.rotulo}</button>
              )}
              {c.apresentacao && (
                <button className="aluno-botao aluno-botao--secundario" onClick={() => setVideo(c)}>Ver apresentação</button>
              )}
              <Link to={`/course/${c.id}`} className="aluno-botao aluno-botao--secundario">Ver o curso</Link>
            </div>
          </div>
          {!largo && c.capa && (
            <img src={imagem(c.capa, 600, CARTAZ)} alt="" className="hidden md:block w-[300px] aspect-[4/5] object-cover rounded-lg shrink-0" />
          )}
        </div>
      </div>

      {total > 1 && (
        <div className="aluno-coluna relative pb-5 md:pb-0 md:absolute md:bottom-6 md:left-0 md:right-0 flex items-center gap-2">
          {itens.map((it, k) => (
            <button key={it.id} onClick={() => setI(k)} aria-label={`Destaque ${k + 1}: ${it.titulo}`} aria-current={k === i}
              className="h-11 flex items-center group">
              <span className={`block h-1 rounded-full transition-[width,background-color] ${k === i ? 'w-8 bg-white' : 'w-4 bg-white/35 group-hover:bg-white/60'}`} />
            </button>
          ))}
          <span className="sr-only">Destaque {i + 1} de {total}</span>
        </div>
      )}

      <Dialog open={!!video} onOpenChange={(o) => !o && setVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-0">
          <DialogTitle className="sr-only">Apresentação de {video?.titulo}</DialogTitle>
          {video?.apresentacao && (
            <div className="aspect-video">
              <iframe src={videoEmbed(video.apresentacao)} title={`Apresentação de ${video.titulo}`} className="w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Faixa do próximo encontro ao vivo
// ---------------------------------------------------------------------------------------------
export function FaixaAoVivo({ e }: { e: EncontroAoVivo }) {
  const quando = quandoFalta(e.data);
  const ehHoje = quando === 'hoje';
  const titulo = e.tipo === 'encerramento' ? 'Encerramento' : e.tema || 'Encontro da turma';
  return (
    <section aria-labelledby="ao-vivo-titulo" className="rounded-xl bg-[#111] p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex flex-col items-center justify-center w-[72px] h-[72px] rounded-lg bg-[#2a2a2a]">
          <span className="text-[12px] text-[#b4b4b4] capitalize">{diaSemana(e.data).replace('-feira', '')}</span>
          <span className="text-[22px] font-semibold text-white tabular-nums leading-tight">{diaMes(e.data)}</span>
        </div>
        <div className="md:hidden">
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ouro)' }}>
            <Radio className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />Ao vivo {quando}, {e.hora}
          </p>
          <p className="text-[13px] text-[#b4b4b4]">{e.cursoTitulo} · Online</p>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="hidden md:block text-[13px] font-semibold" style={{ color: 'var(--ouro)' }}>
          <Radio className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />Próximo encontro ao vivo, {quando} às {e.hora}
        </p>
        <h2 id="ao-vivo-titulo" className="mt-1 text-[18px] md:text-[20px] font-semibold text-white leading-snug line-clamp-2">{titulo}</h2>
        <p className="mt-1 text-[14px] text-[#b4b4b4]">
          {[e.cursoTitulo, e.roteiro ? `roteiro ${e.roteiro}` : null, e.modulo, e.facilitador ? `com ${e.facilitador}` : null].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="flex gap-3 shrink-0">
        {ehHoje ? (
          <a href={SALA_MEET} target="_blank" rel="noreferrer" className="aluno-botao aluno-botao--principal">Entrar na sala</a>
        ) : (
          <Link to={e.cursoTitulo.includes('II') ? '/esde/calendario/ESDE_II' : '/esde/calendario'} className="aluno-botao aluno-botao--secundario">Ver o calendário</Link>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Fileira rolável com setas no computador
// ---------------------------------------------------------------------------------------------
export function Fileira({ titulo, detalhe, verTodos, children }: { titulo: string; detalhe?: string; verTodos?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [podeVoltar, setPodeVoltar] = useState(false);
  const [podeIr, setPodeIr] = useState(false);
  const medir = () => {
    const el = ref.current; if (!el) return;
    setPodeVoltar(el.scrollLeft > 4);
    setPodeIr(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  useEffect(() => { medir(); const el = ref.current; el?.addEventListener('scroll', medir, { passive: true }); window.addEventListener('resize', medir); return () => { el?.removeEventListener('scroll', medir); window.removeEventListener('resize', medir); }; }, []);
  const rolar = (dir: number) => ref.current?.scrollBy({ left: dir * (ref.current.clientWidth - 120), behavior: 'smooth' });
  const id = `fileira-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section aria-labelledby={id}>
      <div className="flex items-end justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h2 id={id} className="text-[20px] font-semibold text-white">{titulo}</h2>
          {detalhe && <p className="text-[13px] text-[#949494] mt-0.5">{detalhe}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {verTodos && <Link to={verTodos} className="text-[14px] font-semibold text-[#b4b4b4] hover:text-white px-2 h-9 inline-flex items-center">Ver todos</Link>}
          <button aria-label={`Voltar em ${titulo}`} onClick={() => rolar(-1)} disabled={!podeVoltar}
            className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1a1a1a] text-white disabled:opacity-30 hover:bg-[#2a2a2a]"><ChevronLeft className="h-4 w-4" /></button>
          <button aria-label={`Avançar em ${titulo}`} onClick={() => rolar(1)} disabled={!podeIr}
            className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1a1a1a] text-white disabled:opacity-30 hover:bg-[#2a2a2a]"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={ref} className="aluno-fileira">{children}</div>
    </section>
  );
}

/** Cartaz 4:5 de um curso. */
export function Cartaz({ c }: { c: CursoVitrine }) {
  const matriculado = c.matricula === 'approved';
  const sub = matriculado
    ? c.pct === 100 ? 'Concluído' : c.feitas > 0 ? `${c.feitas} de ${c.aulas} aulas` : `${c.aulas} ${c.aulas === 1 ? 'aula' : 'aulas'} · não começou`
    : c.inscricoesAbertas ? 'Inscrições abertas' : 'Em breve';
  return (
    <Link to={`/course/${c.id}`} className="aluno-cartaz shrink-0 w-[152px] sm:w-[188px] group" aria-label={`${c.titulo}. ${sub}`}>
      <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-[#1a1a1a]">
        {c.capa ? (
          <img src={imagem(c.capa, 400, CARTAZ)} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="w-full h-full flex items-end p-3 font-['Playfair_Display'] text-[18px] font-bold text-white">{c.titulo}</div>
        )}
        {matriculado && c.pct > 0 && c.pct < 100 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60" role="progressbar" aria-valuenow={c.pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full" style={{ width: `${c.pct}%` }} />
          </div>
        )}
      </div>
      <p className="mt-2 text-[14px] font-semibold text-white leading-snug line-clamp-2">{c.titulo}</p>
      <p className={`text-[12px] mt-0.5 ${c.pct === 100 && matriculado ? 'text-[#3fc07a]' : 'text-[#949494]'}`}>{sub}</p>
    </Link>
  );
}

/** Cartão largo para continuar a próxima aula. */
export function CartaoContinuar({ c }: { c: CursoVitrine }) {
  if (!c.proxima) return null;
  return (
    <Link to={`/lesson/${c.proxima.id}`} className="aluno-cartaz shrink-0 w-[260px] sm:w-[320px] group">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-[#1a1a1a]">
        {(c.fundo || c.capa) && <img src={(c.fundo ? imagem(c.fundo, 700) : imagem(c.capa, 700, CARTAZ))} alt="" loading="lazy" className="w-full h-full object-cover opacity-80 transition group-hover:opacity-100" />}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-12 w-12 rounded-full bg-black/60 flex items-center justify-center text-white"><Play className="h-5 w-5 fill-current ml-0.5" /></span>
        </span>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60" role="progressbar" aria-valuenow={c.pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full" style={{ width: `${c.pct}%` }} />
        </div>
      </div>
      <p className="mt-2 text-[14px] font-semibold text-white leading-snug line-clamp-1">Aula {c.proxima.numero}: {c.proxima.titulo}</p>
      <p className="text-[12px] text-[#949494]">{c.titulo} · {c.feitas} de {c.aulas} feitas</p>
    </Link>
  );
}
