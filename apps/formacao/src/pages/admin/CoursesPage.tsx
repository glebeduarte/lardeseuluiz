import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CabecalhoPagina } from '@/compartilhado';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, MoreVertical, Pencil, Trash2, Eye, BookOpen, Layers, Play, Sparkles, LayoutGrid, List, LockOpen, Lock, FolderOpen, FileText, Globe, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PageHero } from '@/components/layout/PageHero';
import { MiniKPI } from '@/components/admin/MiniKPI';

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
  created_at: string;
  modules_count?: number;
  lessons_count?: number;
}

export default function CoursesPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchCourses();
  }, [isAdmin, navigate]);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Get module and lesson counts for each course
      const coursesWithCounts = await Promise.all(
        data.map(async (course) => {
          // Get modules for this course
          const { data: modulesData } = await supabase
            .from('modules')
            .select('id')
            .eq('course_id', course.id);
          
          const moduleIds = modulesData?.map(m => m.id) || [];
          const modulesCount = moduleIds.length;
          
          // Get lessons count for all modules of this course
          let lessonsCount = 0;
          if (moduleIds.length > 0) {
            const { count } = await supabase
              .from('lessons')
              .select('id', { count: 'exact', head: true })
              .in('module_id', moduleIds);
            lessonsCount = count || 0;
          }
          
          return { ...course, modules_count: modulesCount, lessons_count: lessonsCount };
        })
      );
      setCourses(coursesWithCounts);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!courseToDelete) return;

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseToDelete.id);

    if (error) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Curso excluído com sucesso' });
      setCourses(courses.filter((c) => c.id !== courseToDelete.id));
    }
    setDeleteDialogOpen(false);
    setCourseToDelete(null);
  };

  const toggleStatus = async (course: Course) => {
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('courses')
      .update({ status: newStatus })
      .eq('id', course.id);

    if (error) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setCourses(courses.map((c) => (c.id === course.id ? { ...c, status: newStatus } : c)));
      toast({ title: `Curso ${newStatus === 'published' ? 'publicado' : 'despublicado'}` });
    }
  };

  const toggleEnrollment = async (course: Course) => {
    const newValue = !course.enrollment_open;
    const { error } = await supabase
      .from('courses')
      .update({ enrollment_open: newValue })
      .eq('id', course.id);

    if (error) {
      toast({ title: 'Erro ao atualizar inscrições', description: error.message, variant: 'destructive' });
    } else {
      setCourses(courses.map((c) => (c.id === course.id ? { ...c, enrollment_open: newValue } : c)));
      toast({ title: newValue ? 'Inscrições abertas' : 'Inscrições encerradas' });
    }
  };

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // KPIs computed from course list
  const publishedCount = courses.filter(c => c.status === 'published').length;
  const draftCount = courses.filter(c => c.status === 'draft').length;
  const enrollmentOpenCount = courses.filter(c => c.enrollment_open && c.status === 'published').length;
  const totalLessons = courses.reduce((sum, c) => sum + (c.lessons_count || 0), 0);

  return (
    <DashboardLayout>
      <CabecalhoPagina
        titulo="Cursos"
        descricao="Gerencie todos os cursos da plataforma"
        acoes={
          <Button onClick={() => navigate('/admin/courses/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Curso
          </Button>
        }
      />
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniKPI icon={Globe} label="Publicados" value={loading ? '—' : publishedCount} tone="primary" />
          <MiniKPI icon={EyeOff} label="Rascunhos" value={loading ? '—' : draftCount} tone="muted" />
          <MiniKPI icon={LockOpen} label="Inscrições abertas" value={loading ? '—' : enrollmentOpenCount} tone="teal" />
          <MiniKPI icon={Play} label="Total de aulas" value={loading ? '—' : totalLessons} tone="accent" />
        </div>

        {/* Search & View Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'list' | 'grid')}>
            <ToggleGroupItem value="list" aria-label="Visualização em lista" className="h-9 w-9 p-0">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Visualização em grade" className="h-9 w-9 p-0">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Courses List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-['Playfair_Display'] text-lg font-semibold mb-1">Nenhum curso encontrado</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery ? 'Tente uma busca diferente' : 'Crie seu primeiro curso!'}
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate('/admin/courses/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Curso
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}>
            {filteredCourses.map((course) => viewMode === 'grid' ? (
              <Card key={course.id} className="overflow-hidden group hover:shadow-sm transition-shadow">
                <div className="aspect-[4/5] bg-muted overflow-hidden">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-['Playfair_Display'] font-semibold text-sm line-clamp-2">{course.title}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}`)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}/content`)}>
                          <Layers className="h-4 w-4 mr-2" /> Gerenciar Conteúdo
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(course)}>
                          <Eye className="h-4 w-4 mr-2" /> {course.status === 'published' ? 'Despublicar' : 'Publicar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setCourseToDelete(course); setDeleteDialogOpen(true); }} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={course.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-1.5 py-0'
                      : 'bg-muted text-muted-foreground border-border text-[10px] px-1.5 py-0'}>
                      {course.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </Badge>
                    {course.category === 'formacoes' && (
                      <Badge variant="outline" className="bg-sky-100 text-sky-800 border-sky-300 text-[10px] px-1.5 py-0">Formação</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{course.modules_count} módulos</span>
                    <span className="flex items-center gap-1"><Play className="h-3 w-3" />{course.lessons_count} aulas</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t mt-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5">
                            <Switch checked={course.enrollment_open} onCheckedChange={() => toggleEnrollment(course)} className="scale-75" />
                            <span className="text-[10px] text-muted-foreground">{course.enrollment_open ? 'Inscrições abertas' : 'Inscrições fechadas'}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{course.enrollment_open ? 'Clique para fechar inscrições' : 'Clique para abrir inscrições'}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div
                key={course.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
              >
                <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-['Playfair_Display'] font-semibold text-sm truncate">{course.title}</h3>
                    <Badge variant="outline" className={course.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-1.5 py-0'
                      : 'bg-muted text-muted-foreground border-border text-[10px] px-1.5 py-0'}>
                      {course.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </Badge>
                    {course.category === 'formacoes' && (
                      <Badge variant="outline" className="bg-sky-100 text-sky-800 border-sky-300 text-[10px] px-1.5 py-0">Formação</Badge>
                    )}
                    {course.category === 'cursos_extras' && (
                      <Badge variant="outline" className="bg-accent/20 text-accent-foreground border-accent/40 text-[10px] px-1.5 py-0">Curso Extra</Badge>
                    )}
                    {course.category === 'materiais' && (
                      <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] px-1.5 py-0">Material</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{course.modules_count} módulos</span>
                    <span className="flex items-center gap-1"><Play className="h-3 w-3" />{course.lessons_count} aulas</span>
                    {course.study_lines && course.study_lines.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        {course.study_lines.includes('espirita') && '🙏'}
                        {course.study_lines.includes('umbanda') && '🕯️'}
                        {course.study_lines.includes('espiritualista') && '✨'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                          <Switch checked={course.enrollment_open} onCheckedChange={() => toggleEnrollment(course)} className="scale-75" />
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{course.enrollment_open ? 'Aberto' : 'Fechado'}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{course.enrollment_open ? 'Clique para fechar inscrições' : 'Clique para abrir inscrições'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}`)}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}/content`)}>
                        <Layers className="h-4 w-4 mr-2" /> Gerenciar Conteúdo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStatus(course)}>
                        <Eye className="h-4 w-4 mr-2" /> {course.status === 'published' ? 'Despublicar' : 'Publicar'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setCourseToDelete(course); setDeleteDialogOpen(true); }} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Curso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{courseToDelete?.title}"? Esta ação não pode ser
              desfeita e todos os módulos e aulas serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
