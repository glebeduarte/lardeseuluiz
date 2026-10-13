import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
      <div className="bg-[#f5f7fa] text-[#111827] min-h-[calc(100vh-58px)] -mt-px">
        {/* HERO — mantém imagem cinematográfica com overlay escuro */}
        {heroCourse && (
          <section className="relative min-h-[440px] sm:h-[540px] overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center scale-[1.04]"
              style={{ backgroundImage: heroBg ? `url(${heroBg})` : 'linear-gradient(135deg,#1e40af,#3b82f6)', filter: 'brightness(.55) saturate(1.2)' }}
            />
            <div className="absolute inset-0" style={{
              background:
                'linear-gradient(105deg, rgba(15,30,60,.92) 0%, rgba(15,30,60,.65) 38%, rgba(15,30,60,.1) 62%, transparent 80%), linear-gradient(to top, rgba(245,247,250,1) 0%, rgba(245,247,250,.4) 18%, transparent 50%)',
            }} />
            <div className="relative sm:absolute sm:bottom-0 sm:left-0 px-4 py-6 sm:p-10 md:px-14 md:pb-14 sm:max-w-[640px] flex flex-col gap-3.5 min-h-[440px] sm:min-h-0 justify-end">
              <div className="flex items-center gap-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] sm:tracking-[0.2em] text-[#93c5fd]">
                <span className="w-6 sm:w-8 h-[2px] rounded-sm bg-gradient-to-r from-[#3b82f6] to-[#93c5fd] flex-shrink-0" />
                <span className="truncate">✦ {getGreeting()}, {firstName}</span>
              </div>
              <h1 className="font-display text-[28px] sm:text-[52px] md:text-[58px] font-black leading-[1.05] sm:leading-none text-white tracking-[-0.02em] [text-shadow:0_4px_32px_rgba(0,0,0,0.6)] break-words">
                {heroCourse.course.title}
              </h1>
              {heroCourse.course.description && (
                <p className="text-xs sm:text-sm text-white/75 leading-snug max-w-[460px] line-clamp-2">{heroCourse.course.description}</p>
              )}
              <div className="grid grid-cols-4 sm:flex sm:items-stretch bg-white/[0.10] border border-white/20 rounded-xl overflow-hidden w-full sm:w-fit backdrop-blur-sm">
                <HeroMeta value={heroProg?.completedLessons ?? 0} label="Concluídas" />
                <HeroMeta value={heroProg?.totalLessons ?? 0} label="Total" />
                <HeroMeta value={Math.max(0, (heroProg?.totalLessons ?? 0) - (heroProg?.completedLessons ?? 0))} label="Restam" />
                <HeroMeta value={heroAssessments} label="Avaliações" accent />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Progresso</span>
                  <span className="text-[13px] font-bold text-[#93c5fd]">{heroPct}%</span>
                </div>
                <div className="w-full sm:w-[300px] h-1 bg-white/20 rounded-full relative">
                  <div className="h-full rounded-full relative bg-gradient-to-r from-[#3b82f6] to-[#93c5fd]" style={{ width: `${heroPct}%` }}>
                    <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_0_3px_rgba(147,197,253,.5),0_0_12px_#93c5fd]" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 sm:gap-3 items-center mt-1 flex-wrap">
                <button
                  onClick={() => navigate(`/course/${heroCourse.course.id}`)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#0059b1] hover:bg-[#003c7f] text-white rounded-[10px] px-5 sm:px-6 py-3 text-sm font-bold transition-all shadow-[0_4px_24px_rgba(0,89,177,0.45)] hover:-translate-y-px"
                >
                  <span className="bg-white/20 rounded-full w-[22px] h-[22px] flex items-center justify-center text-xs pl-0.5">▶</span>
                  Continuar
                </button>
                <button
                  onClick={() => navigate(`/course/${heroCourse.course.id}`)}
                  className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-[10px] px-4 sm:px-5 py-3 text-sm font-semibold backdrop-blur-sm transition-all"
                >
                  <Info className="h-4 w-4" /> Detalhes
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STATSBAR */}
        <div className="grid grid-cols-2 md:flex md:flex-wrap bg-white border-b border-[#e5e7eb] px-3 sm:px-14">
          <Stat icon={<BookOpen className="h-5 w-5" />} tone="b" value={totalCourses} label="Cursos" sub="matriculado" />
          <Stat icon={<CheckCircle2 className="h-5 w-5" />} tone="g" value={totalCompleted} label="Aulas concluídas" sub="de todos os cursos" />
          <Stat icon={<BarChart3 className="h-5 w-5" />} tone="p" value={`${overall}%`} label="Progresso geral" sub="em todos os cursos" />
          <Stat icon={<Trophy className="h-5 w-5" />} tone="a" value={`${completedCourses} / ${totalCourses}`} label="Cursos concluídos" sub={totalCourses ? `${Math.round((completedCourses / totalCourses) * 100)}% de conclusão` : '—'} />
        </div>

        {/* RECENTES */}
        {recentLessons.length > 0 && (
          <div className="flex items-center gap-3 sm:gap-5 bg-[#fafbfc] border-b border-[#e5e7eb] px-3 sm:px-14 py-4 sm:py-5 overflow-x-auto">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b7280] whitespace-nowrap flex-shrink-0">Recentes</span>
            <div className="flex gap-2 flex-nowrap sm:flex-wrap">
              {recentLessons.slice(0, 5).map(l => (
                <button
                  key={l.id}
                  onClick={() => l.courseId && navigate(`/course/${l.courseId}`)}
                  className="flex-shrink-0 flex items-center gap-2 bg-white hover:bg-[#eff6ff] hover:border-[#0059b1]/30 border border-[#e5e7eb] rounded-full px-3.5 py-1.5 text-xs font-medium text-[#374151] hover:text-[#0059b1] transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0059b1] flex-shrink-0" />
                  <span className="truncate max-w-[160px] sm:max-w-[200px]">{l.title}</span>
                  <span className="text-[10px] text-[#9ca3af] flex-shrink-0">· {formatDate(l.completedAt)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div className="px-3 sm:px-14 py-6 sm:py-9 pb-20 flex flex-col gap-8 sm:gap-11">
          {dashConfig?.announcement_enabled && dashConfig.announcement_text && (
            <div className="rounded-xl px-4 py-3 text-sm border bg-[#eff6ff] border-[#0059b1]/25 text-[#003c7f]">
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
               action={<button onClick={() => navigate('/explore')} className="text-[#0059b1] hover:text-[#003c7f] text-xs font-semibold flex items-center gap-1"><Compass className="h-3.5 w-3.5" /> Explorar cursos →</button>}>
            {enrolledCourses.map(e => <Card key={e.id} enr={e} pct={getPct(e.course.id)} prog={courseProgress[e.course.id]} onClick={() => navigate(`/course/${e.course.id}`)} />)}
          </Row>

          {assessments.length > 0 && (
            <div>
              <RowHead icon={<ClipboardList className="h-4 w-4" />} title="Minhas Avaliações" count={assessments.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-1">
                {assessments.slice(0, 6).map(item => {
                  const done = !!item.attempt;
                  const passed = item.attempt?.passed;
                  const score = item.attempt?.score;
                  const statusColor = done ? (passed ? '#16a34a' : '#f59e0b') : '#0059b1';
                  const statusBg = done ? (passed ? '#dcfce7' : '#fef3c7') : '#dbeafe';
                  const statusLabel = done ? (passed ? 'Aprovado' : 'Refazer') : 'Pendente';
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/course/${item.courseId}`)}
                      className="group text-left bg-white border border-[#e5e7eb] rounded-2xl p-4 sm:p-5 hover:border-[#0059b1]/40 hover:shadow-[0_8px_28px_rgba(0,89,177,0.10)] hover:-translate-y-0.5 transition-all flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: statusBg, color: statusColor }}>
                            {done ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: statusColor }}>{statusLabel}</span>
                        </div>
                        {done && score != null && (
                          <div className="flex flex-col items-end leading-none">
                            <span className="text-[22px] font-extrabold" style={{ color: statusColor }}>{score}%</span>
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#9ca3af] mt-0.5">nota</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold text-[#111827] leading-snug line-clamp-2 group-hover:text-[#0059b1] transition-colors">{item.title}</p>
                        <p className="text-[12px] text-[#6b7280] mt-1 truncate">{item.courseName}</p>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-2 border-t border-[#f3f4f6]">
                        <span className="text-[11px] text-[#9ca3af]">
                          {done && item.attempt?.submitted_at ? `Realizada em ${formatDate(item.attempt.submitted_at)}` : 'Aguardando início'}
                        </span>
                        <span className="text-[11px] font-bold text-[#0059b1] group-hover:translate-x-0.5 transition-transform">
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
            <div className="text-center py-16">
              <Compass className="h-10 w-10 text-[#9ca3af] mx-auto mb-3" />
              <p className="text-[#6b7280] mb-4">Você ainda não está inscrito em nenhum curso.</p>
              <button onClick={() => navigate('/explore')} className="bg-[#0059b1] hover:bg-[#003c7f] text-white rounded-[10px] px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Explorar cursos
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ───────── sub-components ───────── */

function HeroMeta({ value, label, accent }: { value: number | string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col px-2 sm:px-5 py-2.5 sm:py-3 gap-0.5 border-r border-white/20 last:border-r-0 items-center sm:items-start text-center sm:text-left">
      <span className={`text-base sm:text-xl font-extrabold leading-none ${accent ? 'text-[#93c5fd]' : 'text-white'}`}>{value}</span>
      <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.14em] text-white/65 whitespace-nowrap">{label}</span>
    </div>
  );
}

function Stat({ icon, tone, value, label, sub }: { icon: React.ReactNode; tone: 'b' | 'g' | 'p' | 'a'; value: string | number; label: string; sub: string }) {
  const tones: Record<string, string> = {
    b: 'bg-[#dbeafe] border-[#bfdbfe] text-[#0059b1]',
    g: 'bg-[#dcfce7] border-[#bbf7d0] text-[#16a34a]',
    p: 'bg-[#ede9fe] border-[#ddd6fe] text-[#7c3aed]',
    a: 'bg-[#fef3c7] border-[#fde68a] text-[#d99900]',
  };
  return (
    <div className="flex items-center gap-3 sm:gap-3.5 py-3 sm:py-4 px-3 sm:px-6 md:flex-1 md:min-w-[180px] border-r border-b md:border-b-0 border-[#e5e7eb] last:border-r-0 [&:nth-child(2)]:border-r-0 md:[&:nth-child(2)]:border-r min-w-0">
      <div className={`w-9 h-9 sm:w-[42px] sm:h-[42px] rounded-[11px] border flex items-center justify-center flex-shrink-0 ${tones[tone]}`}>{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-[20px] sm:text-[26px] font-extrabold text-[#111827] leading-none">{value}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b7280] mt-1 truncate">{label}</span>
        <span className="text-[10px] sm:text-[11px] text-[#9ca3af] mt-0.5 truncate">{sub}</span>
      </div>
    </div>
  );
}

function RowHead({ icon, title, count, action }: { icon: React.ReactNode; title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[#0059b1]">{icon}</span>
      <h2 className="font-display text-[17px] font-bold text-[#111827] tracking-[-0.01em]">{title}</h2>
      {typeof count === 'number' && (
        <span className="text-[11px] font-semibold text-[#6b7280] bg-[#f3f4f6] px-2.5 py-0.5 rounded-full">{count}</span>
      )}
      <div className="flex-1 h-px bg-[#e5e7eb] ml-2" />
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
              <div key={i} className="flex-shrink-0 w-[168px] sm:w-[220px] rounded-xl bg-white border border-[#e5e7eb] animate-pulse">
                <div className="aspect-[16/10] bg-[#f3f4f6]" />
                <div className="p-3 space-y-2"><div className="h-3 bg-[#f3f4f6] rounded w-3/4" /><div className="h-2 bg-[#f3f4f6] rounded w-1/2" /></div>
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
      className="group flex-shrink-0 w-[168px] sm:w-[220px] rounded-xl overflow-hidden bg-white border border-[#e5e7eb] cursor-pointer transition-all duration-300 hover:scale-[1.04] hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(0,89,177,0.18),0_0_0_1px_rgba(0,89,177,0.20)] hover:border-[#0059b1]/30"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#f3f4f6]">
        {thumb ? (
          <img src={thumb} alt={enr.course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-white bg-gradient-to-br from-[#003c7f] to-[#0059b1]">✦</div>
        )}
        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-[#0059b1] flex items-center justify-center text-white text-base pl-0.5">▶</div>
        </div>
        {badge === 'new' && (
          <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-[#0059b1] text-white px-2 py-0.5 rounded">✦ Novo</span>
        )}
        {badge === 'done' && (
          <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-[#16a34a] text-white px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído</span>
        )}
        {pct > 0 && pct < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div className="h-full bg-[#0059b1]" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-[13px] font-bold text-[#111827] leading-tight line-clamp-1">{enr.course.title}</div>
        {enr.course.description && <div className="text-[11px] text-[#6b7280] mt-1 line-clamp-2 leading-snug">{enr.course.description}</div>}
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[10px] text-[#9ca3af]">{prog ? `${prog.completedLessons} / ${prog.totalLessons} aulas` : '—'}</span>
          <span className="text-[10px] font-bold text-[#0059b1]">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
