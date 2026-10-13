import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CabecalhoPagina } from '@/compartilhado';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Play,
  FileText,
  Loader2,
  FolderOpen,
  Paperclip,
  ChevronUp,
  ChevronDown,
  Users,
  Bell,
} from 'lucide-react';
import { BatchImport } from '@/components/BatchImport';
import { RichTextEditor } from '@/components/RichTextEditor';
import { CourseStudentProgress } from '@/components/admin/CourseStudentProgress';
import { LessonAttachments } from '@/components/LessonAttachments';

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
  video_url: string | null;
  embed_url: string | null;
  embed_title: string | null;
  thumbnail_url: string | null;
  order_index: number;
}

interface Course {
  id: string;
  title: string;
}

export default function CourseContentPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // Module dialog
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [notifyOnModuleSave, setNotifyOnModuleSave] = useState(false);
  const [savingModule, setSavingModule] = useState(false);

  // Lesson dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    video_url: '',
    embed_url: '',
    embed_title: '',
  });
  const [notifyOnLessonSave, setNotifyOnLessonSave] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);

  // Delete dialogs
  const [deleteModuleDialog, setDeleteModuleDialog] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [deleteLessonDialog, setDeleteLessonDialog] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<{ lesson: Lesson; moduleId: string } | null>(null);

  // Attachments dialog
  const [attachmentsDialogOpen, setAttachmentsDialogOpen] = useState(false);
  const [attachmentsLesson, setAttachmentsLesson] = useState<Lesson | null>(null);

  // Student progress dialog
  const [studentProgressOpen, setStudentProgressOpen] = useState(false);

  // Notification state
  const [sendingNotification, setSendingNotification] = useState(false);

  // Drag and drop state
  const [draggedModule, setDraggedModule] = useState<string | null>(null);
  const [draggedLesson, setDraggedLesson] = useState<{ lessonId: string; moduleId: string } | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchCourseContent();
  }, [isAdmin, id, navigate]);

  const fetchCourseContent = async () => {
    setLoading(true);

    // Fetch course
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', id)
      .maybeSingle();

    if (courseError || !courseData) {
      toast({
        title: 'Curso não encontrado',
        variant: 'destructive',
      });
      navigate('/admin/courses');
      return;
    }

    setCourse(courseData);

    // Fetch modules with lessons
    const { data: modulesData } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', id)
      .order('order_index');

    const modulesWithLessons = await Promise.all(
      (modulesData || []).map(async (mod) => {
        const { data: lessons } = await supabase
          .from('lessons')
          .select('*')
          .eq('module_id', mod.id)
          .order('order_index');
        return { ...mod, lessons: lessons || [] };
      })
    );

    setModules(modulesWithLessons);
    setLoading(false);
  };

  // Module handlers
  const openModuleDialog = (module?: Module) => {
    if (module) {
      setEditingModule(module);
      setModuleForm({ title: module.title, description: module.description || '' });
    } else {
      setEditingModule(null);
      setModuleForm({ title: '', description: '' });
    }
    setNotifyOnModuleSave(false);
    setModuleDialogOpen(true);
  };

  const saveModule = async () => {
    if (!moduleForm.title.trim()) {
      toast({ title: 'Título é obrigatório', variant: 'destructive' });
      return;
    }

    setSavingModule(true);

    if (editingModule) {
      const { error } = await supabase
        .from('modules')
        .update({
          title: moduleForm.title,
          description: moduleForm.description || null,
        })
        .eq('id', editingModule.id);

      if (error) {
        toast({ title: 'Erro ao atualizar módulo', variant: 'destructive' });
      } else {
        toast({ title: 'Módulo atualizado!' });
        if (notifyOnModuleSave) sendContentNotification('module', moduleForm.title);
        fetchCourseContent();
      }
    } else {
      const maxOrder = modules.length > 0 ? Math.max(...modules.map((m) => m.order_index)) : -1;
      const { error } = await supabase.from('modules').insert({
        course_id: id,
        title: moduleForm.title,
        description: moduleForm.description || null,
        order_index: maxOrder + 1,
      });

      if (error) {
        toast({ title: 'Erro ao criar módulo', variant: 'destructive' });
      } else {
        toast({ title: 'Módulo criado!' });
        if (notifyOnModuleSave) sendContentNotification('module', moduleForm.title);
        fetchCourseContent();
      }
    }

    setSavingModule(false);
    setModuleDialogOpen(false);
  };

  const deleteModule = async () => {
    if (!moduleToDelete) return;

    const { error } = await supabase.from('modules').delete().eq('id', moduleToDelete.id);

    if (error) {
      toast({ title: 'Erro ao excluir módulo', variant: 'destructive' });
    } else {
      toast({ title: 'Módulo excluído!' });
      setModules(modules.filter((m) => m.id !== moduleToDelete.id));
    }

    setDeleteModuleDialog(false);
    setModuleToDelete(null);
  };

  // Lesson handlers
  const openLessonDialog = (moduleId: string, lesson?: Lesson) => {
    setLessonModuleId(moduleId);
    if (lesson) {
      setEditingLesson(lesson);
      setLessonForm({
        title: lesson.title,
        description: lesson.description || '',
        video_url: lesson.video_url || '',
        embed_url: lesson.embed_url || '',
        embed_title: lesson.embed_title || '',
      });
    } else {
      setEditingLesson(null);
      setLessonForm({ title: '', description: '', video_url: '', embed_url: '', embed_title: '' });
    }
    setNotifyOnLessonSave(false);
    setLessonDialogOpen(true);
  };

  const saveLesson = async () => {
    if (!lessonForm.title.trim() || !lessonModuleId) {
      toast({ title: 'Título é obrigatório', variant: 'destructive' });
      return;
    }

    setSavingLesson(true);

    if (editingLesson) {
      const { error } = await supabase
        .from('lessons')
        .update({
          title: lessonForm.title,
          description: lessonForm.description || null,
          video_url: lessonForm.video_url || null,
          embed_url: lessonForm.embed_url || null,
          embed_title: lessonForm.embed_title || null,
        })
        .eq('id', editingLesson.id);

      if (error) {
        toast({ title: 'Erro ao atualizar aula', variant: 'destructive' });
      } else {
        toast({ title: 'Aula atualizada!' });
        if (notifyOnLessonSave) sendContentNotification('lesson', lessonForm.title);
        fetchCourseContent();
      }
    } else {
      const module = modules.find((m) => m.id === lessonModuleId);
      const maxOrder = module && module.lessons.length > 0
        ? Math.max(...module.lessons.map((l) => l.order_index))
        : -1;

      const { error } = await supabase.from('lessons').insert({
        module_id: lessonModuleId,
        title: lessonForm.title,
        description: lessonForm.description || null,
        video_url: lessonForm.video_url || null,
        embed_url: lessonForm.embed_url || null,
        embed_title: lessonForm.embed_title || null,
        order_index: maxOrder + 1,
      });

      if (error) {
        toast({ title: 'Erro ao criar aula', variant: 'destructive' });
      } else {
        toast({ title: 'Aula criada!' });
        if (notifyOnLessonSave) sendContentNotification('lesson', lessonForm.title);
        fetchCourseContent();
      }
    }

    setSavingLesson(false);
    setLessonDialogOpen(false);
  };

  const deleteLesson = async () => {
    if (!lessonToDelete) return;

    const { error } = await supabase.from('lessons').delete().eq('id', lessonToDelete.lesson.id);

    if (error) {
      toast({ title: 'Erro ao excluir aula', variant: 'destructive' });
    } else {
      toast({ title: 'Aula excluída!' });
      fetchCourseContent();
    }

    setDeleteLessonDialog(false);
    setLessonToDelete(null);
  };

  // Drag and drop handlers for modules
  const handleModuleDragStart = (e: React.DragEvent, moduleId: string) => {
    setDraggedModule(moduleId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleModuleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleModuleDrop = async (e: React.DragEvent, targetModuleId: string) => {
    e.preventDefault();
    if (!draggedModule || draggedModule === targetModuleId) {
      setDraggedModule(null);
      return;
    }

    const draggedIndex = modules.findIndex((m) => m.id === draggedModule);
    const targetIndex = modules.findIndex((m) => m.id === targetModuleId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedModule(null);
      return;
    }

    const newModules = [...modules];
    const [removed] = newModules.splice(draggedIndex, 1);
    newModules.splice(targetIndex, 0, removed);

    // Update order_index for all modules
    const updates = newModules.map((mod, index) => ({
      id: mod.id,
      order_index: index,
    }));

    setModules(newModules.map((mod, index) => ({ ...mod, order_index: index })));
    setDraggedModule(null);

    // Save to database
    for (const update of updates) {
      await supabase.from('modules').update({ order_index: update.order_index }).eq('id', update.id);
    }

    toast({ title: 'Ordem dos módulos atualizada!' });
  };

  // Drag and drop handlers for lessons
  const handleLessonDragStart = (e: React.DragEvent, lessonId: string, moduleId: string) => {
    e.stopPropagation();
    setDraggedLesson({ lessonId, moduleId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLessonDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleLessonDrop = async (e: React.DragEvent, targetLessonId: string, targetModuleId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedLesson || (draggedLesson.lessonId === targetLessonId && draggedLesson.moduleId === targetModuleId)) {
      setDraggedLesson(null);
      return;
    }

    const sourceModule = modules.find((m) => m.id === draggedLesson.moduleId);
    const targetModule = modules.find((m) => m.id === targetModuleId);

    if (!sourceModule || !targetModule) {
      setDraggedLesson(null);
      return;
    }

    const draggedLessonData = sourceModule.lessons.find((l) => l.id === draggedLesson.lessonId);
    if (!draggedLessonData) {
      setDraggedLesson(null);
      return;
    }

    // Same module reorder
    if (draggedLesson.moduleId === targetModuleId) {
      const draggedIndex = sourceModule.lessons.findIndex((l) => l.id === draggedLesson.lessonId);
      const targetIndex = sourceModule.lessons.findIndex((l) => l.id === targetLessonId);

      const newLessons = [...sourceModule.lessons];
      const [removed] = newLessons.splice(draggedIndex, 1);
      newLessons.splice(targetIndex, 0, removed);

      const newModules = modules.map((mod) =>
        mod.id === targetModuleId
          ? { ...mod, lessons: newLessons.map((l, i) => ({ ...l, order_index: i })) }
          : mod
      );

      setModules(newModules);
      setDraggedLesson(null);

      // Save to database
      for (let i = 0; i < newLessons.length; i++) {
        await supabase.from('lessons').update({ order_index: i }).eq('id', newLessons[i].id);
      }

      toast({ title: 'Ordem das aulas atualizada!' });
    } else {
      // Move to different module
      const targetIndex = targetModule.lessons.findIndex((l) => l.id === targetLessonId);

      const newSourceLessons = sourceModule.lessons.filter((l) => l.id !== draggedLesson.lessonId);
      const newTargetLessons = [...targetModule.lessons];
      newTargetLessons.splice(targetIndex, 0, draggedLessonData);

      const newModules = modules.map((mod) => {
        if (mod.id === draggedLesson.moduleId) {
          return { ...mod, lessons: newSourceLessons.map((l, i) => ({ ...l, order_index: i })) };
        }
        if (mod.id === targetModuleId) {
          return { ...mod, lessons: newTargetLessons.map((l, i) => ({ ...l, order_index: i })) };
        }
        return mod;
      });

      setModules(newModules);
      setDraggedLesson(null);

      // Update module_id and order_index in database
      await supabase.from('lessons').update({ module_id: targetModuleId, order_index: targetIndex }).eq('id', draggedLessonData.id);

      for (let i = 0; i < newSourceLessons.length; i++) {
        await supabase.from('lessons').update({ order_index: i }).eq('id', newSourceLessons[i].id);
      }
      for (let i = 0; i < newTargetLessons.length; i++) {
        await supabase.from('lessons').update({ order_index: i }).eq('id', newTargetLessons[i].id);
      }

      toast({ title: 'Aula movida para outro módulo!' });
    }
  };

  // Handler for dropping lesson on module header (moves to end of that module)
  const handleLessonDropOnModule = async (e: React.DragEvent, targetModuleId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedLesson || draggedLesson.moduleId === targetModuleId) {
      setDraggedLesson(null);
      return;
    }

    const sourceModule = modules.find((m) => m.id === draggedLesson.moduleId);
    const targetModule = modules.find((m) => m.id === targetModuleId);

    if (!sourceModule || !targetModule) {
      setDraggedLesson(null);
      return;
    }

    const draggedLessonData = sourceModule.lessons.find((l) => l.id === draggedLesson.lessonId);
    if (!draggedLessonData) {
      setDraggedLesson(null);
      return;
    }

    // Move to end of target module
    const newSourceLessons = sourceModule.lessons.filter((l) => l.id !== draggedLesson.lessonId);
    const newTargetLessons = [...targetModule.lessons, draggedLessonData];

    const newModules = modules.map((mod) => {
      if (mod.id === draggedLesson.moduleId) {
        return { ...mod, lessons: newSourceLessons.map((l, i) => ({ ...l, order_index: i })) };
      }
      if (mod.id === targetModuleId) {
        return { ...mod, lessons: newTargetLessons.map((l, i) => ({ ...l, order_index: i })) };
      }
      return mod;
    });

    setModules(newModules);
    setDraggedLesson(null);

    // Update database
    const newOrderIndex = targetModule.lessons.length;
    await supabase.from('lessons').update({ module_id: targetModuleId, order_index: newOrderIndex }).eq('id', draggedLessonData.id);

    for (let i = 0; i < newSourceLessons.length; i++) {
      await supabase.from('lessons').update({ order_index: i }).eq('id', newSourceLessons[i].id);
    }

    toast({ title: 'Aula movida para outro módulo!' });
  };

  // Move module up/down
  const moveModule = async (moduleId: string, direction: 'up' | 'down') => {
    const currentIndex = modules.findIndex((m) => m.id === moduleId);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const newModules = [...modules];
    [newModules[currentIndex], newModules[targetIndex]] = [newModules[targetIndex], newModules[currentIndex]];

    // Update order_index
    const updatedModules = newModules.map((mod, index) => ({ ...mod, order_index: index }));
    setModules(updatedModules);

    // Save to database
    await Promise.all([
      supabase.from('modules').update({ order_index: targetIndex }).eq('id', moduleId),
      supabase.from('modules').update({ order_index: currentIndex }).eq('id', modules[targetIndex].id),
    ]);

    toast({ title: 'Ordem do módulo atualizada!' });
  };

  // Move lesson up/down within module
  const moveLesson = async (lessonId: string, moduleId: string, direction: 'up' | 'down') => {
    const module = modules.find((m) => m.id === moduleId);
    if (!module) return;

    const currentIndex = module.lessons.findIndex((l) => l.id === lessonId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= module.lessons.length) return;

    const newLessons = [...module.lessons];
    [newLessons[currentIndex], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[currentIndex]];

    // Update order_index
    const updatedLessons = newLessons.map((lesson, index) => ({ ...lesson, order_index: index }));
    
    const newModules = modules.map((mod) =>
      mod.id === moduleId ? { ...mod, lessons: updatedLessons } : mod
    );
    setModules(newModules);

    // Save to database
    await Promise.all([
      supabase.from('lessons').update({ order_index: targetIndex }).eq('id', lessonId),
      supabase.from('lessons').update({ order_index: currentIndex }).eq('id', module.lessons[targetIndex].id),
    ]);

    toast({ title: 'Ordem da aula atualizada!' });
  };

  const sendContentNotification = async (contentType: string, contentTitle: string) => {
    if (!course) return;
    
    setSendingNotification(true);
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'content_updated',
          course_id: id,
          course_title: course.title,
          content_type: contentType,
          content_title: contentTitle,
        },
      });

      if (error) throw error;

      toast({ 
        title: 'Notificações enviadas!',
        description: 'Os alunos matriculados foram notificados por e-mail.',
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Erro ao enviar notificações',
        description: 'Não foi possível notificar os alunos.',
        variant: 'destructive',
      });
    } finally {
      setSendingNotification(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <CabecalhoPagina
        titulo="Conteúdo do Curso"
        descricao={course?.title}
        acoes={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/courses')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={() => setStudentProgressOpen(true)} variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Alunos
            </Button>
            <Button onClick={() => navigate(`/admin/courses/${id}`)} variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Editar Curso
            </Button>
          </>
        }
      />
      <div className="max-w-4xl space-y-6">

        {/* Modules */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="font-['Playfair_Display'] text-lg">Módulos e Aulas</CardTitle>
            <div className="flex items-center gap-2">
              <BatchImport courseId={id!} onImportComplete={fetchCourseContent} />
              <Button onClick={() => openModuleDialog()} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Módulo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {modules.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-['Playfair_Display'] font-semibold mb-1">Nenhum módulo ainda</h3>
                <p className="text-sm text-muted-foreground mb-4">Crie o primeiro módulo do curso</p>
                <Button onClick={() => openModuleDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Módulo
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map((module, index) => (
                  <div
                    key={module.id}
                    className={`border rounded-lg bg-card ${draggedModule === module.id ? 'opacity-50 bg-muted/50' : ''} ${draggedModule && draggedModule !== module.id ? 'border-primary/50' : ''}`}
                    onDragOver={handleModuleDragOver}
                    onDrop={(e) => handleModuleDrop(e, module.id)}
                  >
                    <Accordion type="multiple" className="w-full">
                      <AccordionItem value={module.id} className="border-0">
                        <div className="flex items-center px-3 sm:px-4 gap-1">
                          {/* Move Up/Down Buttons */}
                          <div className="flex flex-col shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => moveModule(module.id, 'up')}
                              disabled={index === 0}
                              title="Mover para cima"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => moveModule(module.id, 'down')}
                              disabled={index === modules.length - 1}
                              title="Mover para baixo"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <AccordionTrigger 
                            className={`flex-1 hover:no-underline py-4 min-w-0 ${draggedLesson && draggedLesson.moduleId !== module.id ? 'ring-2 ring-primary/50 ring-offset-2 rounded-lg' : ''}`}
                            onDragOver={(e) => {
                              if (draggedLesson) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            onDrop={(e) => handleLessonDropOnModule(e, module.id)}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 text-left min-w-0">
                              <span className="font-medium truncate">
                                {module.title}
                              </span>
                              <span className="text-sm text-muted-foreground shrink-0">
                                ({module.lessons.length} {module.lessons.length === 1 ? 'aula' : 'aulas'})
                              </span>
                            </div>
                          </AccordionTrigger>
                        </div>
                        <AccordionContent className="px-3 sm:px-4 pt-4 pb-4 space-y-4">
                          <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => openModuleDialog(module)}>
                              <Pencil className="h-3 w-3 mr-2" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendContentNotification('module', module.title)}
                              disabled={sendingNotification}
                            >
                              <Bell className="h-3 w-3 mr-2" />
                              Notificar Alunos
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                setModuleToDelete(module);
                                setDeleteModuleDialog(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Excluir
                            </Button>
                          </div>

                          {/* Lessons */}
                          <div className="space-y-2">
                            {module.lessons.map((lesson, lessonIndex) => (
                              <div
                                key={lesson.id}
                                className={`flex flex-col gap-2 p-3 bg-muted/30 rounded-lg group ${draggedLesson?.lessonId === lesson.id ? 'opacity-50' : ''}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {/* Move Up/Down Buttons */}
                                  <div className="flex flex-col shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={() => moveLesson(lesson.id, module.id, 'up')}
                                      disabled={lessonIndex === 0}
                                      title="Mover para cima"
                                    >
                                      <ChevronUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={() => moveLesson(lesson.id, module.id, 'down')}
                                      disabled={lessonIndex === module.lessons.length - 1}
                                      title="Mover para baixo"
                                    >
                                      <ChevronDown className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <Play className="h-4 w-4 text-primary shrink-0" />
                                  <span className="flex-1 min-w-0 truncate text-sm">
                                    {lessonIndex + 1}. {lesson.title}
                                  </span>
                                </div>
                                <div className="flex gap-1 flex-wrap pl-8 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Anexos"
                                    onClick={() => {
                                      setAttachmentsLesson(lesson);
                                      setAttachmentsDialogOpen(true);
                                    }}
                                  >
                                    <Paperclip className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Editar"
                                    onClick={() => openLessonDialog(module.id, lesson)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Notificar alunos sobre esta aula"
                                    onClick={() => sendContentNotification('lesson', lesson.title)}
                                    disabled={sendingNotification}
                                  >
                                    <Bell className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    title="Excluir"
                                    onClick={() => {
                                      setLessonToDelete({ lesson, moduleId: module.id });
                                      setDeleteLessonDialog(true);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}

                            <Button
                              variant="outline"
                              className="w-full border-dashed"
                              onClick={() => openLessonDialog(module.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar Aula
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                placeholder="Ex: Introdução ao React"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                placeholder="Descrição do módulo..."
                rows={3}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none pt-2 border-t">
              <Checkbox
                checked={notifyOnModuleSave}
                onCheckedChange={(v) => setNotifyOnModuleSave(v === true)}
              />
              <div>
                <span className="text-sm font-medium">Notificar alunos por e-mail</span>
                <p className="text-xs text-muted-foreground">Enviar aviso de novo conteúdo aos matriculados</p>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveModule} disabled={savingModule}>
              {savingModule && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingLesson ? 'Editar Aula' : 'Nova Aula'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="space-y-4 py-4 pr-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="Ex: O que é React?"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <RichTextEditor
                  value={lessonForm.description}
                  onChange={(value) => setLessonForm({ ...lessonForm, description: value })}
                  placeholder="Descrição da aula..."
                />
              </div>
              <div className="space-y-2">
                <Label>Link do Vídeo (YouTube ou Google Drive)</Label>
                <Input
                  value={lessonForm.video_url}
                  onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... ou https://drive.google.com/file/d/..."
                />
                <p className="text-xs text-muted-foreground">
                  Cole o link do YouTube ou Google Drive
                </p>
              </div>
              <div className="space-y-2 pt-2 border-t">
                <Label>Conteúdo externo (iframe)</Label>
                <Input
                  value={lessonForm.embed_title}
                  onChange={(e) => setLessonForm({ ...lessonForm, embed_title: e.target.value })}
                  placeholder="Título do bloco (opcional). Ex: Atividade interativa"
                />
                <Input
                  value={lessonForm.embed_url}
                  onChange={(e) => setLessonForm({ ...lessonForm, embed_url: e.target.value })}
                  placeholder="https://... (Genially, Canva, Padlet, Forms, Miro, etc.)"
                />
                <p className="text-xs text-muted-foreground">
                  Cole a URL de incorporação (https). Será exibida como iframe abaixo do vídeo na aula.
                  Alguns sites (ex: Google Meet) bloqueiam incorporação.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none pt-2 border-t">
                <Checkbox
                  checked={notifyOnLessonSave}
                  onCheckedChange={(v) => setNotifyOnLessonSave(v === true)}
                />
                <div>
                  <span className="text-sm font-medium">Notificar alunos por e-mail</span>
                  <p className="text-xs text-muted-foreground">Enviar aviso de novo conteúdo aos matriculados</p>
                </div>
              </label>
            </div>
          </ScrollArea>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveLesson} disabled={savingLesson}>
              {savingLesson && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Module Dialog */}
      <AlertDialog open={deleteModuleDialog} onOpenChange={setDeleteModuleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Módulo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Todas as aulas deste módulo serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteModule} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Lesson Dialog */}
      <AlertDialog open={deleteLessonDialog} onOpenChange={setDeleteLessonDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Aula</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta aula?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteLesson} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Attachments Dialog */}
      <Dialog open={attachmentsDialogOpen} onOpenChange={setAttachmentsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar Anexos</DialogTitle>
          </DialogHeader>
          {attachmentsLesson && (
            <LessonAttachments
              lessonId={attachmentsLesson.id}
              lessonTitle={attachmentsLesson.title}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachmentsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Progress Dialog */}
      {course && (
        <CourseStudentProgress
          courseId={course.id}
          courseTitle={course.title}
          open={studentProgressOpen}
          onOpenChange={setStudentProgressOpen}
        />
      )}
    </DashboardLayout>
  );
}
