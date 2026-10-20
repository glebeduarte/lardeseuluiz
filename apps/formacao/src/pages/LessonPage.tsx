import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, ArrowRight, CheckCircle, FileText, ExternalLink,
  Loader2, ChevronDown, ChevronRight, Video, Menu, X,
  FileSpreadsheet, FileType, FileArchive, Presentation, Download
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  embed_url: string | null;
  embed_title: string | null;
  order_index: number;
  module_id: string;
}

interface ModuleWithLessons {
  id: string;
  title: string;
  course_id: string;
  order_index: number;
  lessons: { id: string; title: string; order_index: number; video_url: string | null }[];
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string | null;
}

interface NavigationLesson {
  id: string;
  title: string;
}

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentModule, setCurrentModule] = useState<{ id: string; title: string; course_id: string } | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [allModules, setAllModules] = useState<ModuleWithLessons[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [prevLesson, setPrevLesson] = useState<NavigationLesson | null>(null);
  const [nextLesson, setNextLesson] = useState<NavigationLesson | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSidebarModules, setExpandedSidebarModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id && user) fetchLessonData();
  }, [id, user]);

  const fetchLessonData = async () => {
    if (!id || !user) return;
    setLoading(true);

    const { data: lessonData } = await supabase.from('lessons').select('*').eq('id', id).single();
    if (!lessonData) { setLoading(false); return; }
    setLesson(lessonData);

    const { data: moduleData } = await supabase.from('modules').select('id, title, course_id, order_index').eq('id', lessonData.module_id).single();

    if (moduleData) {
      setCurrentModule(moduleData);
      const { data: courseData } = await supabase.from('courses').select('title').eq('id', moduleData.course_id).single();
      if (courseData) setCourseTitle(courseData.title);

      const { data: modulesData } = await supabase.from('modules').select(`id, title, course_id, order_index, lessons (id, title, order_index, video_url)`).eq('course_id', moduleData.course_id).order('order_index');

      if (modulesData) {
        const sorted = modulesData.map(m => ({ ...m, lessons: (m.lessons || []).sort((a, b) => a.order_index - b.order_index) }));
        setAllModules(sorted);
        const expanded = new Set<string>();
        expanded.add(moduleData.id);
        setExpandedSidebarModules(expanded);
        const allLessons: { id: string; title: string }[] = [];
        sorted.forEach(m => m.lessons.forEach(l => allLessons.push({ id: l.id, title: l.title })));
        const idx = allLessons.findIndex(l => l.id === id);
        setPrevLesson(idx > 0 ? allLessons[idx - 1] : null);
        setNextLesson(idx < allLessons.length - 1 ? allLessons[idx + 1] : null);
      }

      const { data: progressData } = await supabase.from('lesson_progress').select('lesson_id, completed').eq('user_id', user.id).eq('completed', true);
      if (progressData) {
        setCompletedLessons(new Set(progressData.map(p => p.lesson_id)));
        setIsCompleted(progressData.some(p => p.lesson_id === id));
      }
    }

    const { data: attachmentsData } = await supabase.from('attachments').select('id, name, url, type').eq('lesson_id', id);
    if (attachmentsData) setAttachments(attachmentsData);
    setLoading(false);
  };

  const toggleComplete = async () => {
    if (!user || !id) return;
    setMarking(true);
    if (isCompleted) {
      await supabase.from('lesson_progress').delete().eq('lesson_id', id).eq('user_id', user.id);
      setIsCompleted(false);
      setCompletedLessons(prev => { const n = new Set(prev); n.delete(id); return n; });
    } else {
      const { error } = await supabase.from('lesson_progress').upsert({ lesson_id: id, user_id: user.id, completed: true, completed_at: new Date().toISOString() }, { onConflict: 'user_id,lesson_id' });
      if (error) {
        await supabase.from('lesson_progress').insert({ lesson_id: id, user_id: user.id, completed: true, completed_at: new Date().toISOString() });
      }
      setIsCompleted(true);
      setCompletedLessons(prev => new Set(prev).add(id));
      toast({ title: 'Aula concluída!', description: 'Seu progresso foi salvo.' });
    }
    setMarking(false);
  };

  const getVideoEmbedUrl = (url: string) => {
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    return url;
  };

  const toggleSidebarModule = (modId: string) => {
    setExpandedSidebarModules(prev => {
      const n = new Set(prev);
      if (n.has(modId)) n.delete(modId); else n.add(modId);
      return n;
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!lesson) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h2 className="font-['Playfair_Display'] text-2xl font-bold">Aula não encontrada</h2>
          <Button className="mt-4" onClick={() => navigate('/dashboard')}>Voltar</Button>
        </div>
      </DashboardLayout>
    );
  }

  const getAttachmentMeta = (name: string, type: string | null) => {
    const ext = (name.split('.').pop() || '').toLowerCase();
    const mime = (type || '').toLowerCase();
    if (ext === 'pdf' || mime.includes('pdf')) return { Icon: FileText, label: 'PDF', color: 'text-destructive', bg: 'bg-destructive/10' };
    if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('sheet') || mime.includes('excel')) return { Icon: FileSpreadsheet, label: ext.toUpperCase(), color: 'text-emerald-700', bg: 'bg-emerald-100' };
    if (['ppt', 'pptx'].includes(ext) || mime.includes('presentation')) return { Icon: Presentation, label: ext.toUpperCase(), color: 'text-amber-700', bg: 'bg-amber-100' };
    if (['doc', 'docx'].includes(ext) || mime.includes('word')) return { Icon: FileType, label: ext.toUpperCase(), color: 'text-primary', bg: 'bg-primary/10' };
    if (['zip', 'rar', '7z'].includes(ext)) return { Icon: FileArchive, label: ext.toUpperCase(), color: 'text-accent-foreground', bg: 'bg-accent/20' };
    return { Icon: FileText, label: ext ? ext.toUpperCase() : 'FILE', color: 'text-primary', bg: 'bg-primary/10' };
  };

  // Module progress + lesson index in module
  const moduleObj = allModules.find(m => m.id === currentModule?.id);
  const moduleLessons = moduleObj?.lessons || [];
  const moduleLessonIndex = moduleLessons.findIndex(l => l.id === id);
  const moduleCompletedCount = moduleLessons.filter(l => completedLessons.has(l.id)).length;
  const modulePercent = moduleLessons.length > 0 ? Math.round((moduleCompletedCount / moduleLessons.length) * 100) : 0;

  return (
    // Player da aula em largura total (com a lista de aulas à direita), dentro da moldura padrão
    <DashboardLayout larguraTotal>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0 min-h-[calc(100vh-44px)]">
        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-5 pb-[100px] md:pb-8">
          {/* Breadcrumb + back (desktop) */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground min-w-0 flex-1">
              <button
                onClick={() => currentModule && navigate(`/course/${currentModule.course_id}`)}
                className="hover:text-primary transition-colors truncate font-medium"
              >
                {courseTitle}
              </button>
              {currentModule && (
                <>
                  <ChevronRight className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{currentModule.title}</span>
                </>
              )}
            </div>
            {/* Desktop top nav buttons */}
            <div className="hidden md:flex items-center gap-2">
              {prevLesson && (
                <Button variant="ghost" size="sm" onClick={() => navigate(`/lesson/${prevLesson.id}`)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
              )}
              {nextLesson && (
                <Button variant="ghost" size="sm" onClick={() => navigate(`/lesson/${nextLesson.id}`)}>
                  Próxima <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {/* Module progress mini bar */}
          {moduleLessons.length > 0 && moduleLessonIndex >= 0 && (
            <div className="bg-card border rounded-lg px-4 py-2.5 flex items-center gap-3">
              <div className="text-xs font-semibold text-primary whitespace-nowrap">
                Aula {moduleLessonIndex + 1}<span className="text-muted-foreground">/{moduleLessons.length}</span>
              </div>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${((moduleLessonIndex + 1) / moduleLessons.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {moduleCompletedCount}/{moduleLessons.length} ✓
              </span>
            </div>
          )}

          {/* Video Player */}
          {lesson.video_url ? (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border relative">
              <iframe
                src={getVideoEmbedUrl(lesson.video_url)}
                className="w-full h-full"
                allow="autoplay; encrypted-media; accelerometer; gyroscope; picture-in-picture"
                allowFullScreen
                title={lesson.title}
              />
              <div className="absolute bottom-3 left-4 text-xs text-white/60 font-medium pointer-events-none">
                {courseTitle}
              </div>
            </div>
          ) : null}

          {/* External embed (iframe) */}
          {lesson.embed_url && /^https:\/\//i.test(lesson.embed_url) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs font-semibold text-primary">
                  {lesson.embed_title || 'Conteúdo interativo'}
                </p>
                <a
                  href={lesson.embed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Abrir em nova aba <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="w-full rounded-lg overflow-hidden bg-black border" style={{ aspectRatio: '16 / 10' }}>
                <iframe
                  src={lesson.embed_url}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media; fullscreen; accelerometer; gyroscope; picture-in-picture; clipboard-write"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
                  title={lesson.embed_title || lesson.title}
                />
              </div>
            </div>
          )}

          {/* Title + Meta */}
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl font-bold leading-tight text-foreground">{lesson.title}</h1>
            <div className="flex gap-4 text-xs text-muted-foreground mt-2 pb-4 border-b border-border flex-wrap">
              {currentModule && <span>📂 {currentModule.title}</span>}
              {isCompleted && <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">✓ Concluída</Badge>}
            </div>
          </div>

          {/* Description */}
          {lesson.description && (
            <div className="guide-content max-w-none">
              <div
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.description) }}
              />
            </div>
          )}

          {/* Mark as complete — destaque (desktop+ inline / sempre visível no fim) */}
          <div className="pt-5 border-t border-border">
            <Button
              size="lg"
              variant={isCompleted ? 'outline' : 'default'}
              onClick={toggleComplete}
              disabled={marking}
              className={`w-full sm:w-auto font-semibold transition-all ${
                isCompleted
                  ? 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                  : ''
              }`}
            >
              {marking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isCompleted ? 'Aula concluída — desmarcar' : 'Marcar aula como concluída'}
            </Button>
          </div>

          {/* Attachments — MOBILE/TABLET only (desktop shows them in sidebar) */}
          {attachments.length > 0 && (
            <div className="lg:hidden pt-5 border-t border-border">
              <p className="font-['Playfair_Display'] text-sm font-semibold text-foreground mb-3">Materiais de Apoio</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {attachments.map(att => {
                  const meta = getAttachmentMeta(att.name, att.type);
                  const Icon = meta.Icon;
                  return (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square flex flex-col items-center justify-center gap-2 p-3 bg-card border rounded-lg hover:border-primary hover:shadow-sm transition-all"
                    >
                      <div className={`flex items-center justify-center w-14 h-14 rounded-lg ${meta.bg}`}>
                        <Icon className={`h-8 w-8 ${meta.color}`} strokeWidth={1.75} />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{meta.label}</span>
                      <span className="text-[11px] text-foreground text-center leading-tight line-clamp-2 w-full px-1" title={att.name}>
                        {att.name}
                      </span>
                      <Download className="absolute top-2 right-2 h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}



          {/* Bottom Navigation — DESKTOP only */}
          <div className="hidden md:flex items-center justify-between pt-5 border-t border-border">
            {prevLesson ? (
              <Button variant="outline" size="default" onClick={() => navigate(`/lesson/${prevLesson.id}`)}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Anterior
              </Button>
            ) : <div />}

            {nextLesson ? (
              <Button size="default" onClick={() => navigate(`/lesson/${nextLesson.id}`)}>
                Próxima Aula <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button size="default" onClick={() => currentModule && navigate(`/course/${currentModule.course_id}`)}>
                Finalizar curso <CheckCircle className="h-4 w-4 ml-1.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar - Course Content */}
        <div className="hidden lg:block border-l border-border bg-card overflow-y-auto">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-['Playfair_Display'] text-sm font-semibold text-foreground">Conteúdo do Curso</p>
          </div>

          {allModules.map((mod, modIdx) => {
            const isModExpanded = expandedSidebarModules.has(mod.id);
            const modCompleted = mod.lessons.filter(l => completedLessons.has(l.id)).length;
            const isCurrentMod = mod.id === currentModule?.id;

            return (
              <div key={mod.id} className="border-b border-border">
                <button
                  onClick={() => toggleSidebarModule(mod.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-semibold transition-colors ${isCurrentMod || isModExpanded ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <span>{mod.title}</span>
                  <span className={`text-[11px] ${isModExpanded ? 'text-primary' : 'text-muted-foreground'}`}>
                    {mod.lessons.length} aula{mod.lessons.length !== 1 ? 's' : ''}
                  </span>
                </button>
                {isModExpanded && mod.lessons.map(l => {
                  const isCurrent = l.id === id;
                  const isLCompleted = completedLessons.has(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => navigate(`/lesson/${l.id}`)}
                      className={`w-full flex items-center gap-2 px-4 py-2 pl-7 text-left text-xs transition-all border-b border-border/30 ${
                        isCurrent
                          ? 'bg-primary/10 text-primary font-medium border-r-2 border-r-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                      }`}
                    >
                      {isLCompleted ? (
                        <span className="text-emerald-700">✓</span>
                      ) : isCurrent ? (
                        <span className="text-primary">●</span>
                      ) : (
                        <span>○</span>
                      )}
                      <span className="truncate">{l.title}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="p-4 border-t border-border">
              <p className="font-['Playfair_Display'] text-sm font-semibold text-foreground mb-3">Materiais de Apoio</p>
              <div className="grid grid-cols-2 gap-2.5">
                {attachments.map(att => {
                  const meta = getAttachmentMeta(att.name, att.type);
                  const Icon = meta.Icon;
                  return (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square flex flex-col items-center justify-center gap-2 p-3 bg-card border rounded-lg hover:border-primary hover:shadow-sm transition-all"
                    >
                      <div className={`flex items-center justify-center w-14 h-14 rounded-lg ${meta.bg}`}>
                        <Icon className={`h-8 w-8 ${meta.color}`} strokeWidth={1.75} />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{meta.label}</span>
                      <span className="text-[11px] text-foreground text-center leading-tight line-clamp-2 w-full px-1" title={att.name}>
                        {att.name}
                      </span>
                      <Download className="absolute top-2 right-2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Mobile fixed bottom nav: Anterior / posição / Próxima */}
        <div
          data-lsl-barra-inferior
          className="fixed left-0 right-0 z-30 md:hidden bg-card border-t px-3 py-2"
          style={{ bottom: 0, paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="default"
              disabled={!prevLesson}
              onClick={() => prevLesson && navigate(`/lesson/${prevLesson.id}`)}
              className="flex-1 h-11 disabled:opacity-30"
              aria-label="Aula anterior"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="text-center px-1">
              <p className="text-[10px] text-muted-foreground font-medium">Aula</p>
              <p className="text-[12px] font-semibold leading-tight">
                {moduleLessonIndex >= 0 ? `${moduleLessonIndex + 1} de ${moduleLessons.length}` : ''}
              </p>
            </div>
            {nextLesson ? (
              <Button
                size="default"
                onClick={() => navigate(`/lesson/${nextLesson.id}`)}
                className="flex-1 h-11"
                aria-label="Próxima aula"
              >
                Próxima <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="default"
                onClick={() => currentModule && navigate(`/course/${currentModule.course_id}`)}
                className="flex-1 h-11"
              >
                Finalizar <CheckCircle className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile sidebar toggle (FAB) — acima da barra de aulas mobile */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed right-4 lg:hidden h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md z-40"
          style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
          aria-label="Conteúdo do curso"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Mobile Sidebar Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-card border-l border-border overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <p className="font-['Playfair_Display'] text-sm font-semibold text-foreground">Conteúdo do Curso</p>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {allModules.map((mod, modIdx) => {
                const isModExpanded = expandedSidebarModules.has(mod.id);
                return (
                  <div key={mod.id} className="border-b border-border">
                    <button onClick={() => toggleSidebarModule(mod.id)} className="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hover:text-foreground">
                      <span>{mod.title}</span>
                      <span className="text-[11px]">{mod.lessons.length} aulas</span>
                    </button>
                    {isModExpanded && mod.lessons.map(l => {
                      const isCurrent = l.id === id;
                      const isLCompleted = completedLessons.has(l.id);
                      return (
                        <button key={l.id} onClick={() => { navigate(`/lesson/${l.id}`); setSidebarOpen(false); }} className={`w-full flex items-center gap-2 px-4 py-2 pl-7 text-left text-xs ${isCurrent ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                          {isLCompleted ? <span className="text-emerald-700">✓</span> : isCurrent ? <span className="text-primary">●</span> : <span>○</span>}
                          <span className="truncate">{l.title}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              {attachments.length > 0 && (
                <div className="p-4">
                  <p className="font-['Playfair_Display'] text-sm font-semibold text-foreground mb-3">Materiais de Apoio</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {attachments.map(att => {
                      const meta = getAttachmentMeta(att.name, att.type);
                      const Icon = meta.Icon;
                      return (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-square flex flex-col items-center justify-center gap-2 p-3 bg-card border rounded-lg hover:border-primary hover:shadow-sm transition-all"
                        >
                          <div className={`flex items-center justify-center w-14 h-14 rounded-lg ${meta.bg}`}>
                            <Icon className={`h-8 w-8 ${meta.color}`} strokeWidth={1.75} />
                          </div>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{meta.label}</span>
                          <span className="text-[11px] text-foreground text-center leading-tight line-clamp-2 w-full px-1" title={att.name}>
                            {att.name}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
