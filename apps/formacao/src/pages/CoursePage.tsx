import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AssessmentBlock } from '@/components/assessment/AssessmentBlock';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { enrollUserInCourse } from '@/lib/enrollments';
import { CARTAZ, NOME_CATEGORIA, imagem, imagemSrcSet, videoEmbed } from '@/lib/vitrine';
import { getStudyLineLabel } from '@/components/StudyLineIcons';
import { ArrowLeft, Check, ChevronDown, Lock, Play } from 'lucide-react';

const SCRIM_0 = 'linear-gradient(90deg, #000 0%, rgba(0,0,0,.9) 36%, rgba(0,0,0,.35) 64%, rgba(0,0,0,0) 82%), linear-gradient(0deg, #000 0%, rgba(0,0,0,0) 32%)'; // taste-skill-ignore: scrim preto neutro sob o texto, sobre a foto
const SCRIM_1 = 'linear-gradient(0deg, #000, rgba(0,0,0,0))'; // taste-skill-ignore: scrim preto neutro sob o texto, sobre a foto

// Página do curso no estilo da vitrine: destaque com a capa, aulas por módulo como episódios
// e as informações do curso ao lado. Quem ainda não está matriculado vê a ementa e se inscreve aqui.

interface Course {
  id: string; title: string; description: string | null; long_description: string | null;
  cover_url: string | null; thumbnail_url: string | null; category: string | null; audience: string | null;
  study_lines: string[] | null; learning_topics: string[] | null; start_date: string | null; end_date: string | null;
  schedule: string | null; facilitator: string | null; enrollment_open: boolean | null;
  tagline: string | null; trailer_url: string | null; estimated_duration_minutes: number | null;
}
interface Lesson { id: string; title: string; order_index: number; video_url?: string | null }
interface Module { id: string; title: string; description: string | null; order_index: number; lessons: Lesson[] }

const dataBR = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
const PUBLICO: Record<string, string> = { ambos: 'Voluntários e frequentadores', trabalhadores: 'Voluntários da Casa', frequentadores: 'Frequentadores' };

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [feitas, setFeitas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [matriculado, setMatriculado] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [assessments, setAssessments] = useState<any[]>([]);
  const [video, setVideo] = useState(false);
  const [inscrevendo, setInscrevendo] = useState(false);

  useEffect(() => { if (id && user) carregar(); }, [id, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const carregar = async () => {
    if (!id || !user) return;
    const [{ data: matr }, { data: c }] = await Promise.all([
      supabase.from('enrollments').select('status').eq('course_id', id).eq('user_id', user.id).maybeSingle(),
      supabase.from('courses')
        .select('id, title, description, long_description, cover_url, thumbnail_url, category, audience, study_lines, learning_topics, start_date, end_date, schedule, facilitator, enrollment_open, tagline, trailer_url, estimated_duration_minutes')
        .eq('id', id).maybeSingle(),
    ]);
    setCourse((c as Course) ?? null);
    const ok = matr?.status === 'approved';
    setMatriculado(ok);

    if (ok) {
      const [modsRes, progRes, avRes] = await Promise.all([
        supabase.from('modules').select('id, title, description, order_index, lessons (id, title, order_index, video_url)').eq('course_id', id).order('order_index'),
        supabase.from('lesson_progress').select('lesson_id, completed').eq('user_id', user.id).eq('completed', true),
        supabase.from('assessments').select('*').eq('course_id', id).eq('status', 'published'),
      ]);
      setModules((modsRes.data ?? []).map((m) => ({ ...m, lessons: [...(m.lessons || [])].sort((a, b) => a.order_index - b.order_index) })) as Module[]);
      setFeitas(new Set((progRes.data ?? []).map((p) => p.lesson_id)));
      setAssessments(avRes.data ?? []);
    } else {
      // Ementa pública: só os títulos
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ementa } = await (supabase.rpc as any)('ementa_cursos', { p_curso: id });
      const mapa = new Map<string, Module>();
      ((ementa ?? []) as Array<{ module_id: string; module_title: string; module_order: number; lesson_id: string | null; lesson_title: string | null; lesson_order: number }>).forEach((e) => {
        if (!mapa.has(e.module_id)) mapa.set(e.module_id, { id: e.module_id, title: e.module_title, description: null, order_index: e.module_order, lessons: [] });
        if (e.lesson_id) mapa.get(e.module_id)!.lessons.push({ id: e.lesson_id, title: e.lesson_title ?? '', order_index: e.lesson_order });
      });
      setModules([...mapa.values()].sort((a, b) => a.order_index - b.order_index));
      setFeitas(new Set());
      setAssessments([]);
    }
    setLoading(false);
  };

  const inscrever = async () => {
    if (!user || !course) return;
    setInscrevendo(true);
    const { error } = await enrollUserInCourse(user.id, course.id);
    setInscrevendo(false);
    if (error) return toast({ title: 'Não foi possível fazer a inscrição', description: 'Tente de novo ou fale com a Secretaria de Formação.', variant: 'destructive' });
    toast({ title: 'Inscrição feita', description: 'Já pode começar a primeira aula.' });
    qc.invalidateQueries({ queryKey: ['vitrine-aluno'] });
    setLoading(true);
    carregar();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div aria-busy="true" aria-label="Carregando o curso">
          <div className="bg-[#111] h-[320px] md:h-[460px]" />
          <div className="aluno-coluna mt-10 space-y-3">{[0, 1, 2, 3].map((k) => <div key={k} className="h-14 rounded-lg bg-[#111]" />)}</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="aluno-coluna py-20">
          <h1 className="font-['Playfair_Display'] text-[28px] font-bold text-white">Curso não encontrado</h1>
          <p className="mt-2 text-[#b4b4b4]">Ele pode ter saído do ar. Veja os outros cursos no Início.</p>
          <Link to="/dashboard" className="aluno-botao aluno-botao--principal mt-6">Voltar ao Início</Link>
        </div>
      </DashboardLayout>
    );
  }

  const aulasEmOrdem = modules.flatMap((m) => m.lessons);
  const total = aulasEmOrdem.length;
  const feitasAqui = aulasEmOrdem.filter((l) => feitas.has(l.id)).length;
  const pct = total ? Math.round((feitasAqui / total) * 100) : 0;
  const proximaIdx = aulasEmOrdem.findIndex((l) => !feitas.has(l.id));
  const proxima = proximaIdx >= 0 ? aulasEmOrdem[proximaIdx] : null;
  const fundo = course.cover_url;
  const capa = course.thumbnail_url || course.cover_url;
  const minutos = course.estimated_duration_minutes && total ? course.estimated_duration_minutes * total : null;
  const meta = [
    course.category ? NOME_CATEGORIA[course.category] : null,
    total ? `${total} ${total === 1 ? 'aula' : 'aulas'}` : null,
    modules.length > 1 ? `${modules.length} módulos` : null,
    minutos ? `${Math.floor(minutos / 60)}h${minutos % 60 ? String(minutos % 60).padStart(2, '0') : ''} de aula` : null,
    course.schedule,
  ].filter(Boolean).join(' · ');

  const botaoPrincipal = matriculado ? (
    proxima ? (
      <Link to={`/lesson/${proxima.id}`} className="aluno-botao aluno-botao--principal">
        <Play className="h-4 w-4 fill-current" />{feitasAqui === 0 ? 'Começar o curso' : `Continuar a aula ${proximaIdx + 1}`}
      </Link>
    ) : aulasEmOrdem[0] ? (
      <Link to={`/lesson/${aulasEmOrdem[0].id}`} className="aluno-botao aluno-botao--principal"><Play className="h-4 w-4 fill-current" />Rever o curso</Link>
    ) : null
  ) : course.enrollment_open !== false ? (
    <button className="aluno-botao aluno-botao--principal" onClick={inscrever} disabled={inscrevendo}>{inscrevendo ? 'Inscrevendo...' : 'Inscrever-se'}</button>
  ) : (
    <button className="aluno-botao aluno-botao--principal" disabled>Inscrições em breve</button>
  );

  // Onde cada avaliação entra na lista
  const avaliacoesEm = (tipo: string, campo: string, valor: string) => assessments.filter((a) => a.position_type === tipo && a[campo] === valor);
  const avaliacoesSoltas = assessments.filter((a) => !['after_module', 'before_module', 'between_lessons'].includes(a.position_type));

  let numero = 0;

  return (
    <DashboardLayout>
      {/* Destaque do curso */}
      <section className="relative bg-black">
        <div className="relative md:absolute md:inset-0 overflow-hidden">
          {fundo ? (
            <>
              <img src={imagem(fundo, 1600)} srcSet={imagemSrcSet(fundo)} sizes="100vw" alt="" className="w-full aspect-[16/9] md:aspect-auto md:h-full object-cover" />
              <div aria-hidden className="absolute inset-0 hidden md:block" style={{ background: SCRIM_0 }} />
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 md:hidden" style={{ background: SCRIM_1 }} />
            </>
          ) : <div className="hidden md:block absolute inset-0 bg-[#111]" />}
        </div>
        <div className="aluno-coluna relative md:min-h-[460px] py-6 md:py-12 flex flex-col justify-center">
          <button onClick={() => navigate(-1)} className="self-start inline-flex items-center gap-2 h-9 text-[14px] font-semibold text-[#b4b4b4] hover:text-white mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <div className={`flex gap-10 items-center ${fundo ? '' : 'md:justify-between'}`}>
            <div className="max-w-[580px]">
              {!fundo && capa && <img src={imagem(capa, 300, CARTAZ)} alt="" className="md:hidden w-32 aspect-[4/5] object-cover rounded-lg mb-5" />}
              <h1 className="font-['Playfair_Display'] font-bold text-[30px] md:text-[46px] leading-[1.05] tracking-[-0.02em] text-white">{course.title}</h1>
              {meta && <p className="mt-3 text-[14px] text-[#b4b4b4]">{meta}</p>}
              {(course.tagline || course.description) && <p className="mt-4 text-[16px] md:text-[17px] leading-relaxed text-white/90">{course.tagline || course.description}</p>}
              {matriculado && total > 0 && (
                <div className="mt-5 max-w-[420px]">
                  <div className="flex justify-between text-[13px] text-[#b4b4b4]">
                    <span>{pct === 100 ? 'Curso concluído' : feitasAqui === 0 ? 'Você ainda não começou' : `Você fez ${feitasAqui} de ${total} aulas`}</span>
                    <span className="text-white tabular-nums">{pct}%</span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-white/20" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                {botaoPrincipal}
                {course.trailer_url && <button className="aluno-botao aluno-botao--secundario" onClick={() => setVideo(true)}>Ver apresentação</button>}
              </div>
              {!matriculado && course.enrollment_open !== false && <p className="mt-3 text-[13px] text-[#949494]">A inscrição vale na hora e é gratuita.</p>}
            </div>
            {!fundo && capa && <img src={imagem(capa, 600, CARTAZ)} alt="" className="hidden md:block w-[280px] aspect-[4/5] object-cover rounded-lg shrink-0" />}
          </div>
        </div>
      </section>

      <div className="aluno-coluna mt-8 md:mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        {/* Aulas */}
        <section aria-labelledby="aulas-titulo" className="min-w-0">
          <div className="flex items-end justify-between mb-4">
            <h2 id="aulas-titulo" className="text-[22px] font-semibold text-white">Aulas</h2>
            {total > 0 && <span className="text-[14px] text-[#949494] tabular-nums">{total} {total === 1 ? 'aula' : 'aulas'}</span>}
          </div>
          {modules.length === 0 && <p className="rounded-xl bg-[#111] p-5 text-[15px] text-[#b4b4b4]">As aulas deste curso ainda estão sendo preparadas.</p>}
          <div className="space-y-3">
            {modules.map((mod, mi) => {
              const fm = mod.lessons.filter((l) => feitas.has(l.id)).length;
              const temProxima = mod.lessons.some((l) => l.id === proxima?.id);
              const aberto = matriculado ? temProxima || (proxima === null && mi === 0) : mi === 0;
              return (
                <div key={mod.id} className="space-y-3">
                  {avaliacoesEm('before_module', 'position_module_id', mod.id).map((a) => <AssessmentBlock key={a.id} assessment={a} />)}
                  <details open={aberto} className="group rounded-xl bg-[#111] overflow-hidden">
                    <summary className="flex items-center gap-4 px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-[#161616]">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-[#949494]">Módulo {mi + 1}{matriculado && mod.lessons.length ? ` · ${fm} de ${mod.lessons.length}` : mod.lessons.length ? ` · ${mod.lessons.length} ${mod.lessons.length === 1 ? 'aula' : 'aulas'}` : ''}</p>
                        <p className="text-[16px] font-semibold text-white leading-snug">{mod.title}</p>
                      </div>
                      {matriculado && mod.lessons.length > 0 && fm === mod.lessons.length && <span className="text-[12px] font-semibold rounded-full px-2.5 py-1 bg-[#172a1d] text-[#3fc07a]">Concluído</span>}
                      <ChevronDown className="h-5 w-5 text-[#949494] transition-transform group-open:rotate-180 shrink-0" />
                    </summary>
                    <ol className="pb-2">
                      {mod.lessons.map((l) => {
                        numero += 1;
                        const n = numero;
                        const feita = feitas.has(l.id);
                        const ehProxima = matriculado && proxima?.id === l.id;
                        const conteudo = (
                          <>
                            <span className={`w-8 shrink-0 text-right tabular-nums text-[15px] ${ehProxima ? 'text-white font-semibold' : 'text-[#949494]'}`}>{n}</span>
                            <span className={`flex-1 min-w-0 text-[15px] leading-snug ${feita ? 'text-[#b4b4b4]' : 'text-white'}`}>{l.title}</span>
                            {ehProxima && <span className="text-[12px] font-semibold rounded-full px-2.5 py-1 shrink-0" style={{ background: 'var(--ouro-fundo)', color: 'var(--ouro)' }}>Próxima</span>}
                            {feita && <Check className="h-4 w-4 text-[#3fc07a] shrink-0" aria-label="Feita" />}
                            {!matriculado && <Lock className="h-4 w-4 text-[#949494] shrink-0" aria-label="Disponível depois da inscrição" />}
                            {matriculado && !feita && !ehProxima && <Play className="h-4 w-4 text-[#949494] shrink-0 opacity-0 group-hover/aula:opacity-100" />}
                          </>
                        );
                        return (
                          <li key={l.id}>
                            {matriculado ? (
                              <Link to={`/lesson/${l.id}`} className={`group/aula flex items-center gap-4 px-5 min-h-[52px] py-2.5 hover:bg-[#1a1a1a] ${ehProxima ? 'bg-[#1a1a1a]' : ''}`}>{conteudo}</Link>
                            ) : (
                              <div className="flex items-center gap-4 px-5 min-h-[52px] py-2.5">{conteudo}</div>
                            )}
                            {avaliacoesEm('between_lessons', 'position_lesson_after_id', l.id).map((a) => <div key={a.id} className="px-5 py-2"><AssessmentBlock assessment={a} /></div>)}
                          </li>
                        );
                      })}
                    </ol>
                  </details>
                  {avaliacoesEm('after_module', 'position_module_id', mod.id).map((a) => <AssessmentBlock key={a.id} assessment={a} />)}
                </div>
              );
            })}
            {avaliacoesSoltas.map((a) => <AssessmentBlock key={a.id} assessment={a} />)}
          </div>
        </section>

        {/* Sobre o curso */}
        <aside aria-labelledby="sobre-titulo" className="space-y-8 lg:pt-1">
          <section>
            <h2 id="sobre-titulo" className="text-[22px] font-semibold text-white mb-3">Sobre o curso</h2>
            {course.long_description ? (
              <div className="prose prose-sm prose-invert max-w-none text-[15px] text-[#e6e6e6]" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.long_description) }} />
            ) : (
              <p className="text-[15px] text-[#e6e6e6] leading-relaxed">{course.description || 'A Secretaria de Formação ainda vai escrever a apresentação deste curso.'}</p>
            )}
          </section>

          {course.learning_topics && course.learning_topics.length > 0 && (
            <section>
              <h3 className="text-[17px] font-semibold text-white mb-3">O que você vai aprender</h3>
              <ul className="space-y-2">
                {course.learning_topics.map((t, i) => (
                  <li key={i} className="flex gap-3 text-[15px] text-[#e6e6e6] leading-snug"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--ouro)' }} />{t}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl bg-[#111] p-5">
            <h3 className="text-[17px] font-semibold text-white mb-3">Informações</h3>
            <dl className="space-y-3 text-[14px]">
              {course.audience && <Info rotulo="Para quem" valor={PUBLICO[course.audience] ?? course.audience} />}
              {course.start_date && <Info rotulo="Datas" valor={`${dataBR(course.start_date)}${course.end_date && course.end_date !== course.start_date ? ` a ${dataBR(course.end_date)}` : ''}`} />}
              {course.schedule && <Info rotulo="Horário" valor={course.schedule} />}
              {course.facilitator && <Info rotulo="Facilitação" valor={course.facilitator} />}
              {course.study_lines && course.study_lines.length > 0 && <Info rotulo="Linha de estudo" valor={course.study_lines.map(getStudyLineLabel).join(', ')} />}
            </dl>
          </section>
        </aside>
      </div>

      <Dialog open={video} onOpenChange={setVideo}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-0">
          <DialogTitle className="sr-only">Apresentação de {course.title}</DialogTitle>
          {course.trailer_url && (
            <div className="aspect-video">
              <iframe src={videoEmbed(course.trailer_url)} title={`Apresentação de ${course.title}`} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-[#949494]">{rotulo}</dt>
      <dd className="text-white mt-0.5">{valor}</dd>
    </div>
  );
}
