import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CabecalhoPagina } from '@/compartilhado';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Play, Info, BookOpen, CheckCircle2, BarChart3, Trophy, Sparkles, History, ClipboardList, Compass } from 'lucide-react';

interface DashboardConfig {
  hero_image_url: string | null;
  announcement_enabled: boolean;
  announcement_text: string | null;
  announcement_type: string;
}

interface EnrolledCourse {
  id: string;
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    cover_url: string | null;
    study_lines: string[] | null;
    category: string | null;
    created_at?: string;
  };
  status: string;
  created_at?: string;
}

interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
}

interface RecentLesson {
  id: string;
  title: string;
  courseName: string;
  courseId: string;
  completedAt: string;
}

interface AssessmentItem {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  attempt?: { id: string; score: number | null; passed: boolean | null; submitted_at: string | null };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<Record<string, CourseProgress>>({});
  const [lastAccessedCourseId, setLastAccessedCourseId] = useState<string | null>(null);
  const [lastLesson, setLastLesson] = useState<{ id: string; title: string; moduleName: string } | null>(null);
  const [dashConfig, setDashConfig] = useState<DashboardConfig | null>(null);
  const [recentLessons, setRecentLessons] = useState<RecentLesson[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);

  useEffect(() => {
    if (authLoading) return;
    const params = new URLSearchParams(location.search);
    if (isAdmin && !params.has('student-view')) {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, authLoading, navigate, location.search]);

  useEffect(() => {
    if (user) fetchData();
    fetchDashboardConfig();
  }, [user]);

  const fetchDashboardConfig = async () => {
    const { data } = await supabase.from('dashboard_config').select('*').limit(1).single();
    if (data) setDashConfig(data as any);
  };

  const fetchData = async () => {
    const enrolledRes = await supabase
      .from('enrollments')
      .select(`id, status, created_at, course:courses (id, title, description, thumbnail_url, cover_url, study_lines, category, created_at)`)
      .eq('user_id', user?.id)
      .eq('status', 'approved');

    if (enrolledRes.data) {
      setEnrolledCourses(enrolledRes.data as any);
      const courseIds = enrolledRes.data.map((e: any) => e.course?.id).filter(Boolean);
      if (courseIds.length > 0) {
        await Promise.all([
          fetchCourseProgress(courseIds),
          fetchLastAccessed(courseIds),
          fetchRecentLessons(),
          fetchAssessments(courseIds, enrolledRes.data as any),
        ]);
      }
    }
    setLoading(false);
  };

  const fetchRecentLessons = async () => {
    const { data } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed_at, lessons:lesson_id(id, title, module_id, modules:module_id(title, course_id, courses:course_id(id, title)))')
      .eq('user_id', user?.id)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(6);
    if (data) {
      setRecentLessons(
        data.filter((d: any) => d.lessons).map((d: any) => ({
          id: d.lessons.id,
          title: d.lessons.title,
          courseName: d.lessons.modules?.courses?.title || d.lessons.modules?.title || '',
          courseId: d.lessons.modules?.courses?.id || d.lessons.modules?.course_id || '',
          completedAt: d.completed_at,
        })),
      );
    }
  };

  const fetchLastAccessed = async (courseIds: string[]) => {
    const { data } = await supabase.from('lesson_progress').select('lesson_id, completed_at').eq('user_id', user?.id).eq('completed', true).order('completed_at', { ascending: false }).limit(1);
    if (data && data.length > 0) {
      const { data: lessonData } = await supabase.from('lessons').select('id, title, module_id, modules(id, title, course_id)').eq('id', data[0].lesson_id).single();
      if (lessonData && (lessonData as any).modules) {
        const mod = (lessonData as any).modules;
        if (courseIds.includes(mod.course_id)) {
          setLastAccessedCourseId(mod.course_id);
          setLastLesson({ id: lessonData.id, title: lessonData.title, moduleName: mod.title });
        }
      }
    }
  };

  const fetchCourseProgress = async (courseIds: string[]) => {
    const { data: modulesData } = await supabase.from('modules').select('id, course_id').in('course_id', courseIds);
    if (!modulesData) return;
    const moduleIds = modulesData.map(m => m.id);
    const { data: lessonsData } = await supabase.from('lessons').select('id, module_id').in('module_id', moduleIds);
    if (!lessonsData) return;
    const { data: progressData } = await supabase.from('lesson_progress').select('lesson_id').eq('user_id', user?.id).eq('completed', true);
    const completed = new Set(progressData?.map(p => p.lesson_id) || []);
    const progress: Record<string, CourseProgress> = {};
    courseIds.forEach(courseId => {
      const cm = modulesData.filter(m => m.course_id === courseId).map(m => m.id);
      const cl = lessonsData.filter(l => cm.includes(l.module_id));
      progress[courseId] = { courseId, totalLessons: cl.length, completedLessons: cl.filter(l => completed.has(l.id)).length };
    });
    setCourseProgress(progress);
  };

  const fetchAssessments = async (courseIds: string[], enrolled: EnrolledCourse[]) => {
    const { data: assessmentsData } = await supabase.from('assessments').select('id, title, course_id').in('course_id', courseIds).eq('status', 'published');
    if (!assessmentsData || assessmentsData.length === 0) { setAssessments([]); return; }
    const ids = assessmentsData.map(a => a.id);
    const { data: attemptsData } = await supabase.from('assessment_attempts').select('id, assessment_id, score, passed, submitted_at').in('assessment_id', ids).eq('user_id', user?.id).order('submitted_at', { ascending: false });
    const map: Record<string, string> = {};
    enrolled.forEach(e => { map[e.course.id] = e.course.title; });
    setAssessments(assessmentsData.map(a => {
      const at = attemptsData?.find(x => x.assessment_id === a.id && x.submitted_at);
      return { id: a.id, title: a.title, courseId: a.course_id, courseName: map[a.course_id] || '', attempt: at ? { id: at.id, score: at.score, passed: at.passed, submitted_at: at.submitted_at } : undefined };
    }));
  };

  const getPct = (id: string) => {
    const p = courseProgress[id];
    return p && p.totalLessons > 0 ? Math.round((p.completedLessons / p.totalLessons) * 100) : 0;
  };

  const firstName = profile?.full_name?.split(' ')[0] || '';
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Hero course = último acessado, ou primeiro em andamento
  const heroCourse =
    (lastAccessedCourseId && enrolledCourses.find(e => e.course.id === lastAccessedCourseId)) ||
    enrolledCourses.find(e => { const p = getPct(e.course.id); return p > 0 && p < 100; }) ||
    enrolledCourses[0];

  const heroPct = heroCourse ? getPct(heroCourse.course.id) : 0;
  const heroProg = heroCourse ? courseProgress[heroCourse.course.id] : undefined;
  const heroAssessments = heroCourse ? assessments.filter(a => a.courseId === heroCourse.course.id).length : 0;
  const heroBg = heroCourse?.course.cover_url || heroCourse?.course.thumbnail_url || dashConfig?.hero_image_url || '';

  // Stats
  const totalCourses = enrolledCourses.length;
  const totalCompleted = Object.values(courseProgress).reduce((s, p) => s + p.completedLessons, 0);
  const totalLessons = Object.values(courseProgress).reduce((s, p) => s + p.totalLessons, 0);
  const overall = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;
  const completedCourses = enrolledCourses.filter(e => { const p = courseProgress[e.course.id]; return p && p.totalLessons > 0 && p.completedLessons === p.totalLessons; }).length;

  // Rows
  const novidades = [...enrolledCourses]
    .filter(e => getPct(e.course.id) === 0)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 12);
  const emAndamento = enrolledCourses.filter(e => { const p = getPct(e.course.id); return p > 0 && p < 100; });
  const concluidos = enrolledCourses.filter(e => getPct(e.course.id) === 100);

  const formatDate = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

  return (
    <DashboardLayout>
      <CabecalhoPagina titulo={`${getGreeting()}${firstName ? `, ${firstName}` : ''}`} />
      <div className="space-y-6">
        {/* Curso em destaque: último acessado ou primeiro em andamento */}
        {heroCourse && (
          <section className="rounded-lg border bg-card overflow-hidden flex flex-col md:flex-row">
            <div className="md:w-2/5 aspect-[16/10] md:aspect-auto bg-muted">
              {heroBg ? (
                <img src={heroBg} alt={heroCourse.course.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full min-h-[160px] flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 p-5 sm:p-6 flex flex-col gap-4 min-w-0">
              <div className="min-w-0">
                <h2 className="font-['Playfair_Display'] text-xl sm:text-2xl font-bold text-foreground leading-tight break-words">
                  {heroCourse.course.title}
                </h2>
                {heroCourse.course.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{heroCourse.course.description}</p>
                )}
              </div>
              <div className="grid grid-cols-4 rounded-lg border overflow-hidden">
                <HeroMeta value={heroProg?.completedLessons ?? 0} label="Concluídas" />
                <HeroMeta value={heroProg?.totalLessons ?? 0} label="Total" />
                <HeroMeta value={Math.max(0, (heroProg?.totalLessons ?? 0) - (heroProg?.completedLessons ?? 0))} label="Restam" />
                <HeroMeta value={heroAssessments} label="Avaliações" accent />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Progresso</span>
                  <span className="text-sm font-bold text-primary">{heroPct}%</span>
                </div>
                <Progress value={heroPct} className="h-2" />
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <Button onClick={() => navigate(`/course/${heroCourse.course.id}`)}>
                  <Play className="h-4 w-4 mr-2 fill-current" />
                  Continuar
                </Button>
                <Button variant="outline" onClick={() => navigate(`/course/${heroCourse.course.id}`)}>
                  <Info className="h-4 w-4 mr-2" /> Detalhes
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Indicadores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={<BookOpen className="h-5 w-5" />} tone="b" value={totalCourses} label="Cursos" sub="matriculado" />
          <Stat icon={<CheckCircle2 className="h-5 w-5" />} tone="g" value={totalCompleted} label="Aulas concluídas" sub="de todos os cursos" />
          <Stat icon={<BarChart3 className="h-5 w-5" />} tone="p" value={`${overall}%`} label="Progresso geral" sub="em todos os cursos" />
          <Stat icon={<Trophy className="h-5 w-5" />} tone="a" value={`${completedCourses} / ${totalCourses}`} label="Cursos concluídos" sub={totalCourses ? `${Math.round((completedCourses / totalCourses) * 100)}% de conclusão` : '—'} />
        </div>

        {/* RECENTES */}
        {recentLessons.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 overflow-x-auto">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap flex-shrink-0">Recentes</span>
            <div className="flex gap-2 flex-nowrap sm:flex-wrap">
              {recentLessons.slice(0, 5).map(l => (
                <button
                  key={l.id}
                  onClick={() => l.courseId && navigate(`/course/${l.courseId}`)}
                  className="flex-shrink-0 flex items-center gap-2 bg-card hover:bg-muted border rounded-md px-3 py-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="truncate max-w-[160px] sm:max-w-[200px]">{l.title}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">· {formatDate(l.completedAt)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {dashConfig?.announcement_enabled && dashConfig.announcement_text && (
          <div className="rounded-lg px-4 py-3 text-sm border bg-sky-100 border-sky-300 text-sky-800">
            {dashConfig.announcement_text}
          </div>
        )}

        <Row icon={<Sparkles className="h-4 w-4" />} title="Novidades" count={novidades.length} loading={loading}>
          {novidades.map(e => <Card key={e.id} enr={e} pct={getPct(e.course.id)} prog={courseProgress[e.course.id]} badge="new" onClick={() => navigate(`/course/${e.course.id}`)} />)}
        </Row>

        <Row icon={<Play className="h-4 w-4 fill-current" />} title="Em andamento" count={emAndamento.length} loading={loading}>
          {emAndamento.map(e => <Card key={e.id} enr={e} pct={getPct(e.course.id)} prog={courseProgress[e.course.id]} onClick={() => navigate(`/course/${e.course.id}`)} />)}
        </Row>

        <Row icon={<Trophy className="h-4 w-4" />} title="Concluídos" count={concluidos.length} loading={loading}>
          {concluidos.map(e => <Card key={e.id} enr={e} pct={100} prog={courseProgress[e.course.id]} badge="done" onClick={() => navigate(`/course/${e.course.id}`)} />)}
        </Row>

        <Row icon={<BookOpen className="h-4 w-4" />} title="Todos os meus cursos" count={enrolledCourses.length} loading={loading}
             action={<Button variant="outline" size="sm" onClick={() => navigate('/explore')}><Compass className="h-4 w-4 mr-2" /> Explorar cursos →</Button>}>
          {enrolledCourses.map(e => <Card key={e.id} enr={e} pct={getPct(e.course.id)} prog={courseProgress[e.course.id]} onClick={() => navigate(`/course/${e.course.id}`)} />)}
        </Row>

        {assessments.length > 0 && (
          <div>
            <RowHead icon={<ClipboardList className="h-4 w-4" />} title="Minhas Avaliações" count={assessments.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assessments.slice(0, 6).map(item => {
                const done = !!item.attempt;
                const passed = item.attempt?.passed;
                const score = item.attempt?.score;
                // Situação na paleta do padrão único: ok, pendente (refazer) e informação (a fazer)
                const statusClass = done
                  ? (passed ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300')
                  : 'bg-sky-100 text-sky-800 border-sky-300';
                const statusLabel = done ? (passed ? 'Aprovado' : 'Refazer') : 'Pendente';
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/course/${item.courseId}`)}
                    className="group text-left bg-card border rounded-lg p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Badge variant="outline" className={`text-xs gap-1 ${statusClass}`}>
                        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ClipboardList className="h-3.5 w-3.5" />}
                        {statusLabel}
                      </Badge>
                      {done && score != null && (
                        <div className="flex flex-col items-end leading-none">
                          <span className="text-2xl font-bold text-foreground">{score}%</span>
                          <span className="text-xs text-muted-foreground mt-0.5">nota</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-['Playfair_Display'] text-base font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{item.courseName}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {done && item.attempt?.submitted_at ? `Realizada em ${formatDate(item.attempt.submitted_at)}` : 'Aguardando início'}
                      </span>
                      <span className="text-xs font-semibold text-primary">
                        {done ? 'Rever →' : 'Iniciar →'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!loading && enrolledCourses.length === 0 && (
          <div className="rounded-lg border bg-card text-center py-8 px-4">
            <Compass className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Você ainda não está inscrito em nenhum curso.</p>
            <Button onClick={() => navigate('/explore')}>
              <BookOpen className="h-4 w-4 mr-2" /> Explorar cursos
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ───────── sub-components ───────── */

function HeroMeta({ value, label, accent }: { value: number | string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col px-2 sm:px-4 py-2.5 gap-0.5 border-r last:border-r-0 items-center sm:items-start text-center sm:text-left bg-muted/40">
      <span className={`text-base sm:text-xl font-bold leading-none ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</span>
      <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{label}</span>
    </div>
  );
}

// Cartão de indicador do padrão único: quadrado de 44px em azul suave, número em destaque e rótulo pequeno
function Stat({ icon, value, label, sub }: { icon: React.ReactNode; tone: 'b' | 'g' | 'p' | 'a'; value: string | number; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4 min-w-0">
      <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 text-primary" style={{ background: 'hsl(var(--primary) / 0.1)' }}>{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-2xl font-bold text-foreground leading-none">{value}</span>
        <span className="text-xs text-muted-foreground mt-1 truncate">{label}</span>
        <span className="text-xs text-muted-foreground/80 truncate">{sub}</span>
      </div>
    </div>
  );
}

function RowHead({ icon, title, count, action }: { icon: React.ReactNode; title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-primary">{icon}</span>
      <h2 className="font-['Playfair_Display'] text-lg font-semibold text-foreground">{title}</h2>
      {typeof count === 'number' && (
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{count}</span>
      )}
      <div className="flex-1 h-px bg-border ml-2" />
      {action}
    </div>
  );
}

function Row({ icon, title, count, children, loading, action }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode; loading?: boolean; action?: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  if (!loading && arr.length === 0) return null;
  return (
    <div>
      <RowHead icon={icon} title={title} count={count} action={action} />
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 [scrollbar-width:thin]">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[168px] sm:w-[220px] rounded-lg bg-card border animate-pulse">
                <div className="aspect-[16/10] bg-muted" />
                <div className="p-3 space-y-2"><div className="h-3 bg-muted rounded w-3/4" /><div className="h-2 bg-muted rounded w-1/2" /></div>
              </div>
            ))
          : children}
      </div>
    </div>
  );
}

function Card({ enr, pct, prog, badge, onClick }: { enr: EnrolledCourse; pct: number; prog?: CourseProgress; badge?: 'new' | 'done'; onClick: () => void }) {
  const thumb = enr.course.thumbnail_url || enr.course.cover_url;
  return (
    <div
      onClick={onClick}
      className="group flex-shrink-0 w-[168px] sm:w-[220px] rounded-lg overflow-hidden bg-card border cursor-pointer transition-all hover:shadow-sm hover:border-primary/40"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {thumb ? (
          <img src={thumb} alt={enr.course.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {badge === 'new' && (
          <Badge variant="outline" className="absolute top-2 left-2 text-[10px] bg-sky-100 text-sky-800 border-sky-300">✦ Novo</Badge>
        )}
        {badge === 'done' && (
          <Badge variant="outline" className="absolute top-2 left-2 text-[10px] gap-1 bg-emerald-100 text-emerald-800 border-emerald-300"><CheckCircle2 className="h-3 w-3" /> Concluído</Badge>
        )}
        {pct > 0 && pct < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-sm font-semibold text-foreground leading-tight line-clamp-1">{enr.course.title}</div>
        {enr.course.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">{enr.course.description}</div>}
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[10px] text-muted-foreground">{prog ? `${prog.completedLessons} / ${prog.totalLessons} aulas` : '—'}</span>
          <span className="text-[10px] font-bold text-primary">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
