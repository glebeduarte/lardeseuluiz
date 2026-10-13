import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { enrollUserInCourse } from '@/lib/enrollments';
import { Search, BookOpen, Loader2, Lock, Users, ChevronRight } from 'lucide-react';
import { StudyLineIcons, getCategoryIcon } from '@/components/StudyLineIcons';
import { PageHero } from '@/components/layout/PageHero';
import { EmptyState } from '@/components/ui/empty-state';
import { CoursesLoadingSkeleton } from '@/components/ui/course-skeletons';

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  status: string;
  category: string | null;
  audience: string | null;
  study_lines: string[] | null;
  enrollment_open: boolean;
}

interface Enrollment {
  course_id: string;
  status: string;
}

type StudyLineFilter = 'todos' | 'espirita' | 'umbanda' | 'espiritualista';

export default function ExploreCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [studyLineFilter, setStudyLineFilter] = useState<StudyLineFilter>('todos');
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [coursesRes, enrollmentsRes] = await Promise.all([
      supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, status, category, audience, study_lines, enrollment_open')
        .eq('status', 'published')
        .order('created_at', { ascending: false }),
      supabase
        .from('enrollments')
        .select('course_id, status')
        .eq('user_id', user.id)
    ]);

    if (coursesRes.data) setCourses(coursesRes.data);
    if (enrollmentsRes.data) setEnrollments(enrollmentsRes.data);
    setLoading(false);
  };

  const getEnrollmentStatus = (courseId: string) => {
    const enrollment = enrollments.find(e => e.course_id === courseId);
    return enrollment?.status || null;
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    setEnrollingId(courseId);

    const { error } = await enrollUserInCourse(user.id, courseId);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível realizar a inscrição.', variant: 'destructive' });
    } else {
      toast({
        title: 'Inscrição realizada!',
        description: 'Você já pode acessar o curso.',
      });
      setEnrollments([...enrollments, { course_id: courseId, status: 'approved' }]);
    }
    setEnrollingId(null);
  };

  const userType = profile?.user_type || 'frequentador';
  const filteredCourses = courses
    .filter(course => {
      if (course.audience === 'trabalhadores' && userType !== 'trabalhador') return false;
      if (course.audience === 'frequentadores' && userType !== 'frequentador') return false;
      if (studyLineFilter !== 'todos' && !(course.study_lines?.includes(studyLineFilter))) return false;
      return true;
    })
    .filter(course => course.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const formacoes = filteredCourses.filter(course => course.category === 'formacoes');
  const cursosExtras = filteredCourses.filter(course => course.category === 'cursos_extras');
  const materiais = filteredCourses.filter(course => course.category === 'materiais');

  const getStatusBadge = (course: Course) => {
    const status = getEnrollmentStatus(course.id);

    if (!course.enrollment_open && status !== 'approved') {
      return <Badge className="bg-muted text-muted-foreground text-[10px]"><Lock className="h-3 w-3 mr-1" />Em Breve</Badge>;
    }
    if (status === 'approved') {
      return <Badge className="bg-emerald-600 text-white text-[10px]">Matriculado</Badge>;
    }
    if (course.enrollment_open && !status) {
      return <Badge className="bg-accent text-accent-foreground text-[10px]">Inscreva-se</Badge>;
    }
    return null;
  };

  const renderActionButton = (course: Course) => {
    const status = getEnrollmentStatus(course.id);

    if (!course.enrollment_open && status !== 'approved') {
      return (
        <Button size="sm" variant="secondary" disabled className="w-full text-xs">
          <Lock className="h-3 w-3 mr-1" />
          Em Breve
        </Button>
      );
    }
    if (status === 'approved') {
      return (
        <Button size="sm" className="w-full text-xs bg-primary hover:bg-primary/90" onClick={(e) => { e.stopPropagation(); navigate(`/course/${course.id}`); }}>
          Acessar Curso
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs"
        onClick={(e) => { e.stopPropagation(); handleEnroll(course.id); }}
        disabled={enrollingId === course.id}
      >
        {enrollingId === course.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
        Inscrever-se
      </Button>
    );
  };

  const renderCourseCard = (course: Course) => (
    <div
      key={course.id}
      className={`rounded-xl overflow-hidden border border-border/50 shadow-[0_2px_8px_rgba(0,0,0,0.08)] group transition-all duration-300 ${
        !course.enrollment_open && getEnrollmentStatus(course.id) !== 'approved' ? 'opacity-60 grayscale' : 'hover:shadow-lg'
      }`}
    >
      {/* Image 4:5 */}
      <div className="aspect-[4/5] bg-muted relative overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          {getStatusBadge(course)}
        </div>
      </div>

      {/* Text */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <StudyLineIcons studyLines={course.study_lines} size="sm" />
          {course.study_lines && course.study_lines.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {course.study_lines.map(l => l === 'espirita' ? 'Espírita' : l === 'umbanda' ? 'Umbanda' : 'Espiritualista').join(' · ')}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-[15px] leading-tight line-clamp-2">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-[13px] text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        )}
        <div className="flex gap-1 flex-wrap">
          {(course.audience === 'trabalhadores' || course.audience === 'ambos') && (
            <span className="text-[11px] text-blue-600 flex items-center gap-0.5">
              <Users className="h-3 w-3" /> Trabalhadores
            </span>
          )}
          {(course.audience === 'frequentadores' || course.audience === 'ambos') && (
            <span className="text-[11px] text-purple-600 flex items-center gap-0.5">
              <Users className="h-3 w-3" /> Frequentadores
            </span>
          )}
        </div>
        {renderActionButton(course)}
      </div>
    </div>
  );

  // Mobile list row — compact horizontal layout
  const renderCourseListItem = (course: Course) => {
    const status = getEnrollmentStatus(course.id);
    const isUnavailable = !course.enrollment_open && status !== 'approved';
    const isApproved = status === 'approved';
    return (
      <button
        key={course.id}
        onClick={() => {
          if (isApproved) navigate(`/course/${course.id}`);
          else if (!isUnavailable) handleEnroll(course.id);
        }}
        disabled={isUnavailable || enrollingId === course.id}
        aria-label={`${course.title}${isApproved ? ' — acessar curso' : isUnavailable ? ' — em breve' : ' — inscrever-se'}`}
        className={`w-full flex items-center gap-3 bg-card border border-border rounded-xl p-2.5 text-left shadow-card transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          isUnavailable ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:border-primary/40'
        }`}
      >
        <div className="relative h-[72px] w-[72px] flex-shrink-0 rounded-lg overflow-hidden bg-muted">
          {course.thumbnail_url ? (
            <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="h-7 w-7 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="flex-1 font-display font-bold text-[14px] leading-tight line-clamp-2">
              {course.title}
            </h3>
            <div className="flex-shrink-0">{getStatusBadge(course)}</div>
          </div>
          {course.description && (
            <p className="text-[12px] text-muted-foreground line-clamp-1 mt-1">
              {course.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <StudyLineIcons studyLines={course.study_lines} size="sm" />
            {course.study_lines && course.study_lines.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {course.study_lines.map(l => l === 'espirita' ? 'Espírita' : l === 'umbanda' ? 'Umbanda' : 'Espiritualista').join(' · ')}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
      </button>
    );
  };

  const renderSection = (title: string, subtitle: string, icon: string, coursesList: Course[]) => {
    if (coursesList.length === 0) return null;
    return (
      <div className="space-y-4">
        <div className="border-t border-border/50 pt-6">
          <h2 className="text-xl font-display font-semibold flex items-center gap-2">
            <span>{icon}</span> {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        {/* Mobile: compact list */}
        <div className="flex flex-col gap-2.5 sm:hidden">
          {coursesList.map(renderCourseListItem)}
        </div>
        {/* sm+: portrait grid */}
        <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
          {coursesList.map(renderCourseCard)}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <PageHero title="Explorar Cursos" description="Descubra novos cursos e inscreva-se" variant="student" />
      <div className="p-4 sm:p-6 md:p-7 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted-foreground">Linha:</span>
            {([
              { value: 'todos', label: 'Todas', icon: '📚' },
              { value: 'espirita', label: 'Espírita', icon: '🙏' },
              { value: 'umbanda', label: 'Umbanda', icon: '🕯️' },
              { value: 'espiritualista', label: 'Espiritualista', icon: '✨' },
            ] as { value: StudyLineFilter; label: string; icon: string }[]).map(tab => (
              <button
                key={tab.value}
                onClick={() => setStudyLineFilter(tab.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  studyLineFilter === tab.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <CoursesLoadingSkeleton count={4} />
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={searchTerm ? 'Nenhum curso encontrado' : 'Nenhum curso disponível'}
            description={
              searchTerm
                ? 'Tente buscar por outro termo ou remova os filtros aplicados.'
                : 'Novos cursos serão publicados em breve. Volte mais tarde para conferir as novidades.'
            }
          />
        ) : (
          <div className="space-y-10">
            {renderSection('Formações Contínuas', 'Cursos com calendário estruturado e acompanhamento', '📚', formacoes)}
            {renderSection('Cursos Extras', 'Formações pontuais para aprofundamento específico', '🎓', cursosExtras)}
            {renderSection('Materiais', 'Recursos de consulta e apoio ao aprendizado — acesso direto', '📖', materiais)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
