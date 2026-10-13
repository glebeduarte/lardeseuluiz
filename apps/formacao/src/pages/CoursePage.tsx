import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { AssessmentBlock } from '@/components/assessment/AssessmentBlock';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, PlayCircle, CheckCircle, Lock, BookOpen, Users,
  ChevronDown, ChevronRight, Video, FileText, Calendar, Clock, User
} from 'lucide-react';
import { StudyLineIcons, getCategoryLabel, getStudyLineLabel } from '@/components/StudyLineIcons';

interface Course {
  id: string;
  title: string;
  description: string | null;
  long_description: string | null;
  cover_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  audience: string | null;
  study_lines: string[] | null;
  learning_topics: string[] | null;
  start_date: string | null;
  end_date: string | null;
  schedule: string | null;
  facilitator: string | null;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  video_url: string | null;
}

interface LessonProgress {
  lesson_id: string;
  completed: boolean;
}

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [assessments, setAssessments] = useState<any[]>([]);

  useEffect(() => {
    if (id && user) fetchCourseData();
  }, [id, user]);

  const fetchCourseData = async () => {
    if (!id || !user) return;

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('status')
      .eq('course_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!enrollment || enrollment.status !== 'approved') {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    setHasAccess(true);

    const [courseRes, modulesRes, progressRes, enrolledRes] = await Promise.all([
      supabase
        .from('courses')
        .select('id, title, description, cover_url, thumbnail_url, category, audience, study_lines, long_description, learning_topics, start_date, end_date, schedule, facilitator')
        .eq('id', id)
        .single(),
      supabase
        .from('modules')
        .select(`id, title, description, order_index, lessons (id, title, description, order_index, video_url)`)
        .eq('course_id', id)
        .order('order_index'),
      supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id),
      supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', id)
        .eq('status', 'approved')
    ]);

    if (courseRes.data) setCourse(courseRes.data as any);
    if (modulesRes.data) {
      const sorted = modulesRes.data.map(m => ({
        ...m,
        lessons: (m.lessons || []).sort((a, b) => a.order_index - b.order_index)
      }));
      setModules(sorted);

      // Auto-expand in-progress module
      const completedIds = new Set(progressRes.data?.filter(p => p.completed).map(p => p.lesson_id) || []);
      const expanded = new Set<string>();
      for (const mod of sorted) {
        const modCompleted = mod.lessons.filter(l => completedIds.has(l.id)).length;
        if (modCompleted > 0 && modCompleted < mod.lessons.length) {
          expanded.add(mod.id);
        }
      }
      // If none in progress, expand first non-completed
      if (expanded.size === 0 && sorted.length > 0) {
        expanded.add(sorted[0].id);
      }
      setExpandedModules(expanded);
    }
    if (progressRes.data) setProgress(progressRes.data);
    setEnrolledCount(enrolledRes.count || 0);

    // Load assessments
    const { data: assessData } = await supabase
      .from('assessments')
      .select('*')
      .eq('course_id', id)
      .eq('status', 'published');
    if (assessData) setAssessments(assessData);

    setLoading(false);
  };

  const isLessonCompleted = (lessonId: string) =>
    progress.some(p => p.lesson_id === lessonId && p.completed);

  const courseLessonIds = new Set(modules.flatMap(m => m.lessons.map(l => l.id)));

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = progress.filter(p => p.completed && courseLessonIds.has(p.lesson_id)).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const getFirstIncompleteLesson = () => {
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        if (!isLessonCompleted(lesson.id)) return lesson;
      }
    }
    return modules[0]?.lessons[0] || null;
  };

  const getModuleProgress = (mod: Module) => {
    const total = mod.lessons.length;
    const completed = mod.lessons.filter(l => isLessonCompleted(l.id)).length;
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const nextLesson = getFirstIncompleteLesson();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-[50vh] w-full rounded-xl" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Lock className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground mb-6">Você não tem acesso a este curso. Solicite sua matrícula.</p>
          <Button onClick={() => navigate('/explore')}>Explorar Cursos</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Curso não encontrado</h2>
          <Button className="mt-4" onClick={() => navigate('/dashboard')}>Voltar</Button>
        </div>
      </DashboardLayout>
    );
  }

  const studyLineLabels = course.study_lines?.map(l => getStudyLineLabel(l)).join(' · ') || '';

  return (
    <DashboardLayout>
      <div className="overflow-x-hidden">
        {/* Hero Section — compacto em mobile */}
        <div className="relative overflow-hidden" style={{ height: 'clamp(200px, 38vh, 420px)' }}>
          {course.cover_url ? (
            <img src={course.cover_url} alt={course.title} className="absolute inset-0 w-full h-full object-cover scale-105 opacity-50" />
          ) : (
            <div className="absolute inset-0">
              <BookOpen className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 text-white/10" />
            </div>
          )}
          {/* Stronger gradient on mobile for legibility */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(205 75% 40% / 0.85) 0%, hsl(168 67% 22% / 0.75) 55%, hsl(213 35% 16% / 0.55) 100%)' }} />

          {/* Back */}
          <div className="absolute top-3 left-3 md:left-6 z-10">
            <Button variant="secondary" size="sm" onClick={() => navigate(-1)} className="bg-white/15 backdrop-blur-md text-white hover:bg-white/25 border border-white/20 h-9 px-3">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Meus Cursos</span><span className="sm:hidden">Voltar</span>
            </Button>
          </div>

          {/* Hero Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:px-10 md:pb-7">
            <div className="max-w-3xl">
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                  MATRICULADO
                </Badge>
                <Badge variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 text-white/85 text-[10px] px-2 py-0.5">
                  {getCategoryLabel(course.category)}
                </Badge>
                {course.study_lines?.slice(0, 2).map((line) => (
                  <Badge key={line} variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 text-white/85 text-[10px] px-2 py-0.5">
                    {getStudyLineLabel(line)}
                  </Badge>
                ))}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white leading-tight">{course.title}</h1>
              {course.description && (
                <p className="hidden sm:block text-sm md:text-base text-white/75 mt-2 max-w-2xl line-clamp-2">{course.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-white/75">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" /> {totalLessons} aulas
                </span>
                <span className="text-white/40">·</span>
                <span className="flex items-center gap-1.5">
                  📚 {modules.length} módulos
                </span>
                <span className="text-white/40">·</span>
                <span className="font-semibold text-white">{progressPercent}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Linear progress bar — visível e cheio de cor */}
        <div className="bg-card border-b border-border px-4 sm:px-6 md:px-10 py-3 sticky top-[58px] z-20 backdrop-blur-md bg-card/90">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {progressPercent === 0 ? 'Comece sua jornada' : progressPercent === 100 ? '🎉 Curso concluído!' : `Você está ${progressPercent}% do caminho`}
            </p>
            {nextLesson && (
              <Button
                size="sm"
                className="gradient-primary text-white h-8 px-3 text-xs"
                onClick={() => navigate(`/lesson/${nextLesson.id}`)}
              >
                <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                {progressPercent === 0 ? 'Começar' : 'Continuar'}
              </Button>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPercent}%`,
                background: progressPercent === 100
                  ? 'hsl(var(--teal))'
                  : 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--teal)))',
              }}
            />
          </div>
        </div>

        {/* Two-column layout */}
        <div className="px-4 sm:px-6 md:px-10 py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column - Content */}
            <div className="flex-1 min-w-0 space-y-8">
              {/* About Section */}
              {(course.long_description || course.description) && (
                <div>
                  <h2 className="text-xl font-display font-bold text-foreground mb-3">Sobre o curso</h2>
                  {course.long_description ? (
                    <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.long_description) }} />
                  ) : course.description ? (
                    <p className="text-muted-foreground">{course.description}</p>
                  ) : null}
                </div>
              )}

              {/* Learning Topics */}
              {course.learning_topics && course.learning_topics.length > 0 && (
                <div className="rounded-xl bg-muted/40 backdrop-blur-sm border border-border/20 p-5">
                  <h3 className="font-display font-bold text-foreground mb-4">O que você vai aprender</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {course.learning_topics.map((topic, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        {topic}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info row */}
              {(course.facilitator || course.schedule || course.start_date || course.audience) && (
                <div>
                  <h3 className="font-display font-bold text-foreground mb-3">Para quem é este curso</h3>
                  <p className="text-sm text-muted-foreground">
                    {course.audience === 'ambos' ? 'Trabalhadores e Frequentadores' : course.audience === 'trabalhadores' ? 'Trabalhadores' : 'Frequentadores'}
                  </p>
                  {(course.start_date || course.schedule || course.facilitator) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-3">
                      {course.start_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {(() => { const [y,m,d] = course.start_date!.split('-'); return `${d}/${m}/${y}`; })()}
                          {course.end_date && ` a ${(() => { const [y,m,d] = course.end_date!.split('-'); return `${d}/${m}/${y}`; })()}`}
                        </div>
                      )}
                      {course.schedule && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" /> {course.schedule}
                        </div>
                      )}
                      {course.facilitator && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" /> {course.facilitator}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Course Content - Modules */}
              <div>
                <h2 className="text-xl font-display font-bold text-foreground mb-4">Conteúdo do curso</h2>

                {modules.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum módulo disponível ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {modules.map((mod, modIndex) => {
                      const modProgress = getModuleProgress(mod);
                      const isExpanded = expandedModules.has(mod.id);

                      // Assessments before this module
                      const beforeModuleAssessments = assessments.filter(
                        a => a.position_type === 'before_module' && a.position_module_id === mod.id
                      );

                      // Assessments after this module
                      const afterModuleAssessments = assessments.filter(
                        a => a.position_type === 'after_module' && a.position_module_id === mod.id
                      );

                      return (
                        <div key={mod.id}>
                          {beforeModuleAssessments.map(a => (
                            <div key={a.id} className="mb-2">
                              <AssessmentBlock assessment={a} />
                            </div>
                          ))}
                          <div className={`rounded-xl border overflow-hidden transition-all ${isExpanded ? 'bg-card border-primary/30 shadow-card' : 'bg-card/60 border-border hover:border-primary/20'}`}>
                          <button
                            onClick={() => toggleModule(mod.id)}
                            className="w-full flex items-center gap-3 p-3.5 sm:p-4 text-left hover:bg-muted/30 transition-colors min-h-[60px]"
                          >
                            {/* Module icon with progress ring */}
                            <div className={`relative h-11 w-11 flex-shrink-0 rounded-xl flex items-center justify-center font-display font-bold text-sm ${
                              modProgress.percent === 100
                                ? 'bg-teal text-white'
                                : modProgress.completed > 0
                                ? 'bg-primary/10 text-primary border border-primary/30'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {modProgress.percent === 100 ? <CheckCircle className="h-5 w-5" /> : modIndex + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-display font-bold text-[14px] sm:text-[15px] text-foreground leading-tight line-clamp-2">{mod.title}</p>
                              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                                <span>{modProgress.completed}/{modProgress.total} {modProgress.total === 1 ? 'aula' : 'aulas'}</span>
                                {modProgress.total > 0 && (
                                  <>
                                    <span className="text-border">·</span>
                                    <div className="flex-1 max-w-[80px] h-1 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${modProgress.percent === 100 ? 'bg-teal' : 'bg-primary'}`}
                                        style={{ width: `${modProgress.percent}%` }}
                                      />
                                    </div>
                                    <span className="font-semibold text-foreground">{modProgress.percent}%</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="border-t border-border/40">
                              {mod.lessons.map((lesson, lessonIndex) => {
                                const completed = isLessonCompleted(lesson.id);
                                const isNext = nextLesson?.id === lesson.id;

                                // Assessments between lessons
                                const betweenLessonsAssessments = assessments.filter(
                                  a => a.position_type === 'between_lessons' && a.position_lesson_after_id === lesson.id
                                );

                                return (
                                  <div key={lesson.id}>
                                    <button
                                      onClick={() => navigate(`/lesson/${lesson.id}`)}
                                      className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left hover:bg-muted/40 transition-colors border-b border-border/20 last:border-b-0 min-h-[52px] ${
                                        isNext ? 'bg-primary/5' : ''
                                      }`}
                                    >
                                      {completed ? (
                                        <div className="h-6 w-6 rounded-full bg-teal flex items-center justify-center flex-shrink-0">
                                          <CheckCircle className="h-4 w-4 text-white" />
                                        </div>
                                      ) : isNext ? (
                                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 animate-pulse">
                                          <PlayCircle className="h-4 w-4 text-white" />
                                        </div>
                                      ) : (
                                        <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                                      )}
                                      <span className={`flex-1 text-sm leading-snug ${completed ? 'text-muted-foreground line-through decoration-1' : 'text-foreground'}`}>
                                        {lesson.title}
                                      </span>
                                      {isNext && (
                                        <span className="text-[10px] text-primary font-bold uppercase tracking-wider whitespace-nowrap">Próxima</span>
                                      )}
                                    </button>
                                    {betweenLessonsAssessments.map(a => (
                                      <div key={a.id} className="px-4 py-2 border-b border-border/10 bg-warning/5">
                                        <AssessmentBlock assessment={a} />
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                          {afterModuleAssessments.map(a => (
                            <div key={a.id} className="mt-2">
                              <AssessmentBlock assessment={a} />
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Assessments at end of course */}
                {assessments.filter(a => a.position_type === 'end_of_course').map(a => (
                  <AssessmentBlock key={a.id} assessment={a} />
                ))}

                {/* Assessments without specific position (fallback) */}
                {assessments.filter(a => 
                  !['end_of_course', 'after_module', 'before_module', 'between_lessons'].includes(a.position_type)
                ).map(a => (
                  <AssessmentBlock key={a.id} assessment={a} />
                ))}
              </div>
            </div>

            {/* Right Column - Sticky sidebar card */}
            <div className="lg:w-80 xl:w-96 shrink-0">
              <div className="lg:sticky lg:top-6 space-y-4">
                {/* Thumbnail card */}
                <div className="rounded-xl border border-border/30 bg-card/50 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden">
                  {(course.thumbnail_url || course.cover_url) && (
                    <div className="aspect-[4/5] overflow-hidden">
                      <img src={course.thumbnail_url || course.cover_url!} alt={course.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="p-5 space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">{completedLessons} de {totalLessons} aulas</span>
                        <span className="font-bold text-foreground">{progressPercent}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>

                    {/* CTA Button */}
                    {nextLesson && (
                      <Button
                        className="w-full gradient-primary text-primary-foreground"
                        size="lg"
                        onClick={() => navigate(`/lesson/${nextLesson.id}`)}
                      >
                        <PlayCircle className="h-5 w-5 mr-2" />
                        {progressPercent === 0 ? 'Começar' : 'Continuar'}
                      </Button>
                    )}

                    {progressPercent === 100 && (
                      <div className="text-center py-2">
                        <Badge className="bg-emerald-600 text-white text-sm px-4 py-1.5">
                          <CheckCircle className="h-4 w-4 mr-1.5" /> Curso Concluído
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
