import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CabecalhoPagina } from '@/compartilhado';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AnnouncementsSection } from '@/components/AnnouncementsSection';
import {
  BookOpen, Users, TrendingUp, ArrowRight, Award, ClipboardList,
  CheckCircle2, AlertTriangle, UserX, FileWarning, ChevronRight,
  Plus, Mail, Megaphone, Eye, CalendarCheck, ClipboardCheck, UserPlus,
} from 'lucide-react';

interface CourseEngagement {
  id: string;
  title: string;
  totalStudents: number;
  activeStudents: number;
  engagementPct: number;
}

interface CourseAssessmentStat {
  courseId: string;
  courseTitle: string;
  avgScore: number;
  attempts: number;
}

interface RecentActivity {
  id: string;
  type: 'enrollment' | 'assessment' | 'completion';
  userName: string;
  description: string;
  created_at: string;
}

interface DashboardStats {
  courses: number;
  students: number;
  pendingEnrollments: number;
  activeEnrollments: number;
  totalLessons: number;
  completedLessons: number;
  studentsWithProgress: number;
  studentsWithoutProgress: number;
  inactiveStudents30d: number;
  coursesWithoutStudents: number;
  totalAssessments: number;
  pendingAssessmentReviews: number;
  completionRate: number;
  recentActivity: RecentActivity[];
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    courses: 0, students: 0, pendingEnrollments: 0, activeEnrollments: 0,
    totalLessons: 0, completedLessons: 0, studentsWithProgress: 0,
    studentsWithoutProgress: 0, inactiveStudents30d: 0, coursesWithoutStudents: 0,
    totalAssessments: 0, pendingAssessmentReviews: 0, completionRate: 0,
    recentActivity: [],
  });
  const [courseEngagements, setCourseEngagements] = useState<CourseEngagement[]>([]);
  const [assessmentStats, setAssessmentStats] = useState<CourseAssessmentStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { navigate('/dashboard'); return; }
    fetchAll();
  }, [isAdmin, authLoading, navigate]);

  const fetchAll = async () => {
    await Promise.all([fetchStats(), fetchCourseEngagement(), fetchAssessmentStats()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString();

    const [
      coursesRes, studentsRes, pendingRes, activeRes, lessonsRes, completedRes,
      progressStudentsRes, recentEnrollmentsRes, allStudentsRes,
      assessmentsRes, recentAttemptsRes, inactiveRes,
    ] = await Promise.all([
      supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('lessons').select('id', { count: 'exact', head: true }),
      supabase.from('lesson_progress').select('id', { count: 'exact', head: true }).eq('completed', true),
      supabase.from('lesson_progress').select('user_id').eq('completed', true),
      supabase.from('enrollments').select('id, status, created_at, user:profiles(full_name), course:courses(title)').order('created_at', { ascending: false }).limit(5),
      supabase.from('profiles').select('id').eq('role', 'student'),
      supabase.from('assessments').select('id', { count: 'exact', head: true }),
      supabase.from('assessment_attempts').select('id, submitted_at, user_id, assessment_id, passed, score').order('submitted_at', { ascending: false, nullsFirst: false }).limit(10),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('is_active', true).lt('last_activity_at', cutoff),
    ]);

    const studentsWithProgressIds = new Set(progressStudentsRes.data?.map(p => p.user_id) || []);
    const allStudentIds = new Set(allStudentsRes.data?.map(s => s.id) || []);
    let studentsWithoutProgress = 0;
    allStudentIds.forEach(id => { if (!studentsWithProgressIds.has(id)) studentsWithoutProgress++; });

    // Build recent activity (mix enrollments + recent assessment attempts)
    const recentActivity: RecentActivity[] = [];
    (recentEnrollmentsRes.data || []).forEach((e: any) => {
      recentActivity.push({
        id: `enr-${e.id}`,
        type: 'enrollment',
        userName: e.user?.full_name || 'Usuário',
        description: `inscreveu-se em ${e.course?.title || 'curso'}`,
        created_at: e.created_at,
      });
    });

    // Enrich assessment attempts with names
    const attemptUserIds = [...new Set((recentAttemptsRes.data || []).map((a: any) => a.user_id))];
    const attemptAssessmentIds = [...new Set((recentAttemptsRes.data || []).map((a: any) => a.assessment_id))];
    let attemptUserMap = new Map<string, string>();
    let attemptAssessmentMap = new Map<string, string>();
    if (attemptUserIds.length > 0) {
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', attemptUserIds);
      data?.forEach(p => attemptUserMap.set(p.id, p.full_name));
    }
    if (attemptAssessmentIds.length > 0) {
      const { data } = await supabase.from('assessments').select('id, title').in('id', attemptAssessmentIds);
      data?.forEach(a => attemptAssessmentMap.set(a.id, a.title));
    }
    (recentAttemptsRes.data || []).slice(0, 5).forEach((a: any) => {
      if (!a.submitted_at) return;
      recentActivity.push({
        id: `att-${a.id}`,
        type: 'assessment',
        userName: attemptUserMap.get(a.user_id) || 'Aluno',
        description: `${a.passed ? 'foi aprovado' : 'submeteu'} em ${attemptAssessmentMap.get(a.assessment_id) || 'avaliação'}${a.score != null ? ` (${a.score}%)` : ''}`,
        created_at: a.submitted_at,
      });
    });
    recentActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Completion rate: students who completed at least 1 lesson / total approved enrollment students
    const { data: approvedEnrollments } = await supabase.from('enrollments').select('user_id').eq('status', 'approved');
    const enrolledUserIds = new Set((approvedEnrollments || []).map(e => e.user_id));
    let completedAtLeastOne = 0;
    enrolledUserIds.forEach(id => { if (studentsWithProgressIds.has(id)) completedAtLeastOne++; });
    const completionRate = enrolledUserIds.size > 0 ? Math.round((completedAtLeastOne / enrolledUserIds.size) * 100) : 0;

    // Pending assessment reviews — questions flagged needs_review
    const { count: pendingReviewCount } = await supabase
      .from('assessment_questions')
      .select('id', { count: 'exact', head: true })
      .eq('needs_review', true);

    setStats(prev => ({
      ...prev,
      courses: coursesRes.count || 0,
      students: studentsRes.count || 0,
      pendingEnrollments: pendingRes.count || 0,
      activeEnrollments: activeRes.count || 0,
      totalLessons: lessonsRes.count || 0,
      completedLessons: completedRes.count || 0,
      studentsWithProgress: studentsWithProgressIds.size,
      studentsWithoutProgress,
      inactiveStudents30d: inactiveRes.count || 0,
      totalAssessments: assessmentsRes.count || 0,
      pendingAssessmentReviews: pendingReviewCount || 0,
      completionRate,
      recentActivity: recentActivity.slice(0, 6),
    }));
  };

  const fetchCourseEngagement = async () => {
    const { data: courses } = await supabase.from('courses').select('id, title').eq('status', 'published').limit(8);
    if (!courses) return;

    const { data: enrollments } = await supabase.from('enrollments').select('course_id, user_id').eq('status', 'approved');
    const { data: progress } = await supabase.from('lesson_progress').select('user_id, lesson_id').eq('completed', true);
    const { data: lessons } = await supabase.from('lessons').select('id, module_id');
    const { data: modules } = await supabase.from('modules').select('id, course_id');

    if (!enrollments || !progress || !lessons || !modules) return;

    const modulesByCourse = new Map<string, string[]>();
    modules.forEach(m => {
      const arr = modulesByCourse.get(m.course_id) || [];
      arr.push(m.id);
      modulesByCourse.set(m.course_id, arr);
    });

    const lessonsByModule = new Map<string, string[]>();
    lessons.forEach(l => {
      const arr = lessonsByModule.get(l.module_id) || [];
      arr.push(l.id);
      lessonsByModule.set(l.module_id, arr);
    });

    const progressByUser = new Map<string, Set<string>>();
    progress.forEach(p => {
      if (!progressByUser.has(p.user_id)) progressByUser.set(p.user_id, new Set());
      progressByUser.get(p.user_id)!.add(p.lesson_id);
    });

    const engagements: CourseEngagement[] = courses.map(course => {
      const courseModules = modulesByCourse.get(course.id) || [];
      const courseLessonIds = new Set<string>();
      courseModules.forEach(mId => {
        (lessonsByModule.get(mId) || []).forEach(lId => courseLessonIds.add(lId));
      });

      const courseStudents = enrollments.filter(e => e.course_id === course.id);
      const totalStudents = courseStudents.length;

      let activeStudents = 0;
      courseStudents.forEach(e => {
        const userProgress = progressByUser.get(e.user_id);
        if (userProgress) {
          const hasAny = [...courseLessonIds].some(lId => userProgress.has(lId));
          if (hasAny) activeStudents++;
        }
      });

      return {
        id: course.id,
        title: course.title,
        totalStudents,
        activeStudents,
        engagementPct: totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0,
      };
    }).sort((a, b) => b.engagementPct - a.engagementPct);

    setCourseEngagements(engagements);

    // Courses with 0 active students (published, with enrolled students but none active)
    const coursesWithoutStudents = engagements.filter(e => e.totalStudents === 0 || e.activeStudents === 0).length;
    setStats(prev => ({ ...prev, coursesWithoutStudents }));
  };

  const fetchAssessmentStats = async () => {
    const { data: assessments } = await supabase.from('assessments').select('id, title, course_id, course:courses(title)').eq('status', 'published');
    if (!assessments || assessments.length === 0) {
      setAssessmentStats([]);
      return;
    }

    const { data: attempts } = await supabase
      .from('assessment_attempts')
      .select('assessment_id, score, passed')
      .not('submitted_at', 'is', null);

    const byCourse = new Map<string, { title: string; scores: number[]; }>();
    assessments.forEach((a: any) => {
      const courseTitle = a.course?.title || 'Curso';
      const courseAttempts = (attempts || []).filter(at => at.assessment_id === a.id);
      const existing = byCourse.get(a.course_id) || { title: courseTitle, scores: [] };
      courseAttempts.forEach(at => {
        if (at.score != null) existing.scores.push(at.score);
      });
      byCourse.set(a.course_id, existing);
    });

    const result: CourseAssessmentStat[] = [];
    byCourse.forEach((v, courseId) => {
      if (v.scores.length === 0) return;
      const avg = Math.round(v.scores.reduce((s, n) => s + n, 0) / v.scores.length);
      result.push({ courseId, courseTitle: v.title, avgScore: avg, attempts: v.scores.length });
    });
    result.sort((a, b) => b.avgScore - a.avgScore);
    setAssessmentStats(result.slice(0, 5));
  };

  const val = (v: number) => loading ? '—' : v;

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `há ${days}d`;
  };

  const getBarColor = (pct: number) => {
    if (pct >= 70) return 'bg-emerald-500';
    if (pct >= 40) return 'bg-primary';
    return 'bg-amber-500';
  };

  const activityIcon = (type: RecentActivity['type']) => {
    if (type === 'assessment') return <ClipboardList className="h-3.5 w-3.5 text-primary" />;
    if (type === 'completion') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />;
    return <UserPlus className="h-3.5 w-3.5 text-primary" />;
  };

  return (
    <DashboardLayout>
      <CabecalhoPagina
        titulo="Painel Administrativo"
        descricao={
          <>
            Visão Geral da Plataforma · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </>
        }
        acoes={
          <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Tudo a postos
          </Badge>
        }
      />
      <div>
        <div className="space-y-6">
          {/* 4 KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              icon={BookOpen}
              label="Cursos Publicados"
              value={val(stats.courses)}
              tone="primary"
              hint="Catálogo ativo"
              onClick={() => navigate('/admin/courses')}
            />
            <KPICard
              icon={Users}
              label="Alunos Cadastrados"
              value={val(stats.students)}
              tone="teal"
              hint={stats.studentsWithoutProgress > 0
                ? `${stats.studentsWithoutProgress} sem nenhum progresso`
                : 'Todos com progresso'}
              hintTone={stats.studentsWithoutProgress > 0 ? 'warn' : 'ok'}
              onClick={() => navigate('/admin/students')}
            />
            <KPICard
              icon={TrendingUp}
              label="Inscrições Ativas"
              value={val(stats.activeEnrollments)}
              tone="accent"
              hint={stats.pendingEnrollments > 0 ? `${stats.pendingEnrollments} pendentes` : 'Tudo em dia'}
              hintTone={stats.pendingEnrollments > 0 ? 'warn' : 'ok'}
              onClick={() => navigate('/admin/courses')}
            />
            <KPICard
              icon={Award}
              label="Taxa de Conclusão"
              value={loading ? '—' : `${stats.completionRate}%`}
              tone="success"
              hint={`${stats.completedLessons} aulas concluídas`}
            />
          </div>

          {/* 2-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Engajamento por Curso */}
              <Card className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b">
                    <h3 className="font-['Playfair_Display'] font-semibold text-lg flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <TrendingUp className="h-3.5 w-3.5" />
                      </span>
                      Engajamento por Curso
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {loading ? (
                      [...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />)
                    ) : courseEngagements.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum curso publicado</p>
                    ) : (
                      courseEngagements.map((c, idx) => {
                        const isTop = idx === 0 && c.engagementPct > 0;
                        return (
                          <div
                            key={c.id}
                            onClick={() => navigate(`/admin/courses/${c.id}/content`)}
                            className={`group cursor-pointer rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/40 ${
                              isTop ? 'bg-amber-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              {isTop && <Award className="h-3.5 w-3.5 text-amber-700 flex-shrink-0" aria-label="Top engajamento" />}
                              <span className="text-xs font-medium text-foreground flex-1 truncate" title={c.title}>{c.title}</span>
                              <span className={`text-xs font-bold tabular-nums ${
                                c.engagementPct >= 70 ? 'text-emerald-700' : c.engagementPct >= 40 ? 'text-primary' : c.engagementPct > 0 ? 'text-amber-700' : 'text-muted-foreground'
                              }`}>
                                {c.engagementPct}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${getBarColor(c.engagementPct)}`}
                                  style={{ width: `${c.engagementPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                                {c.activeStudents}/{c.totalStudents}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Avaliações */}
              <Card className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b">
                    <h3 className="font-['Playfair_Display'] font-semibold text-lg flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <ClipboardList className="h-3.5 w-3.5" />
                      </span>
                      Avaliações
                    </h3>
                    <button
                      onClick={() => navigate('/admin/assessments')}
                      className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                    >
                      Ver todas <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  {/* mini-stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
                      <p className="text-2xl font-bold text-foreground leading-none tabular-nums">{val(stats.totalAssessments)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Avaliações criadas</p>
                    </div>
                    <div className={`rounded-lg px-3 py-2.5 border ${
                      stats.pendingAssessmentReviews > 0
                        ? 'bg-amber-100 border-amber-300'
                        : 'bg-emerald-100 border-emerald-300'
                    }`}>
                      <p className={`text-2xl font-bold leading-none tabular-nums ${
                        stats.pendingAssessmentReviews > 0 ? 'text-amber-800' : 'text-emerald-800'
                      }`}>{val(stats.pendingAssessmentReviews)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.pendingAssessmentReviews > 0 ? 'Pend. revisão' : 'Sem pendências'}
                      </p>
                    </div>
                  </div>

                  {/* Top courses by avg score */}
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Médias por curso
                  </p>
                  <div className="space-y-2">
                    {loading ? (
                      [...Array(3)].map((_, i) => <div key={i} className="h-8 bg-muted/30 rounded-lg animate-pulse" />)
                    ) : assessmentStats.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">Nenhuma avaliação respondida ainda</p>
                    ) : (
                      assessmentStats.map(s => (
                        <div
                          key={s.courseId}
                          onClick={() => navigate('/admin/assessments')}
                          className="flex items-center gap-2 cursor-pointer rounded-lg p-2 -mx-2 hover:bg-muted/40 transition-colors"
                        >
                          <span className="text-xs font-medium text-foreground flex-1 truncate" title={s.courseTitle}>
                            {s.courseTitle}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {s.attempts} resp.
                          </span>
                          <span className={`text-xs font-bold tabular-nums w-10 text-right ${
                            s.avgScore >= 70 ? 'text-emerald-700' : s.avgScore >= 50 ? 'text-primary' : 'text-amber-700'
                          }`}>
                            {s.avgScore}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* Atividade Recente */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-['Playfair_Display'] font-semibold text-lg mb-4 pb-3 border-b flex items-center gap-2">
                    <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <CalendarCheck className="h-3.5 w-3.5" />
                    </span>
                    Atividade Recente
                  </h3>
                  {loading ? (
                    <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-muted/30 animate-pulse" />)}</div>
                  ) : stats.recentActivity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade recente</p>
                  ) : (
                    <div className="space-y-0">
                      {stats.recentActivity.map((a) => (
                        <div key={a.id} className="flex items-start gap-2.5 py-2.5 border-b border-border last:border-b-0">
                          <span className="h-6 w-6 rounded-md bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                            {activityIcon(a.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              <strong className="text-foreground font-semibold">{a.userName}</strong>{' '}{a.description}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatTimeAgo(a.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Insights & Alertas — actionable */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-['Playfair_Display'] font-semibold text-lg mb-4 pb-3 border-b flex items-center gap-2">
                    <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                    Insights & Alertas
                  </h3>
                  <div className="space-y-2">
                    <ActionableAlert
                      icon={UserX}
                      tone={stats.inactiveStudents30d > 0 ? 'warn' : 'ok'}
                      label="Alunos inativos há 30+ dias"
                      value={stats.inactiveStudents30d}
                      onClick={() => navigate('/admin/students')}
                    />
                    <ActionableAlert
                      icon={FileWarning}
                      tone={stats.studentsWithoutProgress > 0 ? 'warn' : 'ok'}
                      label="Alunos com 0% de progresso"
                      value={stats.studentsWithoutProgress}
                      onClick={() => navigate('/admin/students')}
                    />
                    <ActionableAlert
                      icon={BookOpen}
                      tone={stats.coursesWithoutStudents > 0 ? 'warn' : 'ok'}
                      label="Cursos sem alunos ativos"
                      value={stats.coursesWithoutStudents}
                      onClick={() => navigate('/admin/courses')}
                    />
                    <ActionableAlert
                      icon={ClipboardCheck}
                      tone={stats.pendingEnrollments > 0 ? 'warn' : 'ok'}
                      label="Inscrições pendentes"
                      value={stats.pendingEnrollments}
                      onClick={() => navigate('/admin/courses')}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Ações Rápidas — full-width bottom */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-['Playfair_Display'] font-semibold text-lg mb-3 pb-3 border-b flex items-center gap-2">
                <span className="text-base"></span> Ações Rápidas
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <QuickAction icon={Plus} label="Novo Curso" onClick={() => navigate('/admin/courses/new')} tone="primary" />
                <QuickAction icon={Users} label="Alunos" onClick={() => navigate('/admin/students')} tone="teal" />
                <QuickAction icon={ClipboardList} label="Avaliações" onClick={() => navigate('/admin/assessments')} tone="accent" />
                <QuickAction icon={CalendarCheck} label="Presenças" onClick={() => navigate('/admin/attendance')} tone="success" />
                <QuickAction icon={Mail} label="E-mails" onClick={() => navigate('/admin/emails')} tone="primary" />
                <QuickAction icon={Megaphone} label="Avisos" onClick={() => navigate('/admin/announcements')} tone="teal" />
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <AnnouncementsSection />
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ===== Sub-components ===== */
type KPITone = 'primary' | 'teal' | 'accent' | 'success';

// Padrão único: cartões brancos com borda; o tom só aparece no quadrado do ícone
const toneStyles: Record<KPITone, {
  cardBg: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  border: string;
  glow: string;
}> = {
  primary: { cardBg: 'bg-card', iconBg: 'bg-primary/10', iconColor: 'text-primary', valueColor: 'text-foreground', border: 'border-border', glow: 'shadow-sm' },
  teal: { cardBg: 'bg-card', iconBg: 'bg-primary/10', iconColor: 'text-primary', valueColor: 'text-foreground', border: 'border-border', glow: 'shadow-sm' },
  accent: { cardBg: 'bg-card', iconBg: 'bg-primary/10', iconColor: 'text-primary', valueColor: 'text-foreground', border: 'border-border', glow: 'shadow-sm' },
  success: { cardBg: 'bg-card', iconBg: 'bg-primary/10', iconColor: 'text-primary', valueColor: 'text-foreground', border: 'border-border', glow: 'shadow-sm' },
};

function KPICard({
  icon: Icon, label, value, tone = 'primary', hint, hintTone, onClick,
}: {
  icon: any; label: string; value: string | number;
  tone?: KPITone; hint?: string; hintTone?: 'ok' | 'warn'; onClick?: () => void;
}) {
  const t = toneStyles[tone];
  const interactive = !!onClick;
  const hintClass = hintTone === 'warn'
    ? 'text-amber-700 font-medium'
    : hintTone === 'ok'
      ? 'text-emerald-700 font-medium'
      : 'text-muted-foreground';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`group text-left w-full rounded-lg border ${t.border} ${t.cardBg} p-4 transition-all ${
        interactive
          ? 'cursor-pointer hover:shadow-sm hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
          : 'cursor-default'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`h-11 w-11 rounded-lg ${t.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${t.iconColor}`} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-2xl font-bold leading-none tabular-nums ${t.valueColor}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
        </div>
        {interactive && (
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        )}
      </div>
      {hint && <p className={`text-xs mt-2 truncate ${hintClass}`}>{hint}</p>}
    </button>
  );
}

function ActionableAlert({
  icon: Icon, tone, label, value, onClick,
}: {
  icon: any; tone: 'ok' | 'warn'; label: string; value: number; onClick: () => void;
}) {
  // Situação: pendente em âmbar, ok em verde (paleta do guia)
  const styles = tone === 'warn'
    ? { bg: 'bg-amber-50 border-amber-300 hover:bg-amber-100', icon: 'text-amber-800', value: 'text-amber-800' }
    : { bg: 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100', icon: 'text-emerald-800', value: 'text-emerald-800' };
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-colors text-left group ${styles.bg}`}
    >
      <span className="h-8 w-8 rounded-lg bg-card flex items-center justify-center flex-shrink-0">
        <Icon className={`h-4 w-4 ${styles.icon}`} />
      </span>
      <span className="flex-1 text-xs text-foreground leading-tight">{label}</span>
      <span className={`text-lg font-bold tabular-nums ${styles.value}`}>{value}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function QuickAction({
  icon: Icon, label, onClick, tone = 'primary',
}: {
  icon: any; label: string; onClick: () => void; tone?: KPITone;
}) {
  const t = toneStyles[tone];
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center justify-center gap-2 rounded-lg px-3 py-4 border ${t.border} ${t.cardBg} hover:bg-muted hover:border-primary/30 transition-colors`}
    >
      <span className={`h-9 w-9 rounded-lg ${t.iconBg} flex items-center justify-center`}>
        <Icon className={`h-4 w-4 ${t.iconColor}`} />
      </span>
      <span className="text-xs font-medium text-foreground text-center leading-tight">{label}</span>
    </button>
  );
}
