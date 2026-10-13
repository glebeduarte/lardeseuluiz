import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHero } from '@/components/layout/PageHero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Link2, Copy, Check, Users, Clock, Download, Eye, Loader2, ListChecks, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DEFAULT_REDIRECT_URL = 'https://meet.google.com/dvh-ooii-vgb';

interface LessonWithAttendance {
  id: string;
  title: string;
  order_index: number;
  module_title: string;
  course_id: string;
  course_title: string;
  attendance_count: number;
  enrolled_count: number;
  active_link: {
    id: string;
    token: string;
    expires_at: string;
  } | null;
  _module_order: number;
}

interface AttendanceRecord {
  id: string;
  confirmed_at: string;
  user: {
    full_name: string;
    email: string;
  };
}

export default function AttendanceAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lessons, setLessons] = useState<LessonWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<LessonWithAttendance | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateLesson, setGenerateLesson] = useState<LessonWithAttendance | null>(null);
  const [duration, setDuration] = useState('90');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      // Get ESDE courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .in('title', ['ESDE I', 'ESDE II']);

      if (!courses?.length) {
        setLoading(false);
        return;
      }

      const courseIds = courses.map((c) => c.id);
      const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.title]));

      // Get modules
      const { data: modules } = await supabase
        .from('modules')
        .select('id, title, course_id, order_index')
        .in('course_id', courseIds)
        .order('order_index');

      if (!modules?.length) {
        setLoading(false);
        return;
      }

      const moduleIds = modules.map((m) => m.id);
      const moduleMap = Object.fromEntries(modules.map((m) => [m.id, m]));

      // Get lessons
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('id, title, order_index, module_id')
        .in('module_id', moduleIds)
        .order('order_index');

      if (!lessonData?.length) {
        setLoading(false);
        return;
      }

      // Get attendance counts
      const lessonIds = lessonData.map((l) => l.id);
      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('lesson_id');

      const attendanceCounts: Record<string, number> = {};
      attendanceData?.forEach((r) => {
        attendanceCounts[r.lesson_id] = (attendanceCounts[r.lesson_id] || 0) + 1;
      });

      // Get active links
      const { data: links } = await supabase
        .from('attendance_links')
        .select('id, token, lesson_id, expires_at')
        .in('lesson_id', lessonIds)
        .gt('expires_at', new Date().toISOString());

      const linkMap: Record<string, { id: string; token: string; expires_at: string }> = {};
      links?.forEach((l) => {
        linkMap[l.lesson_id] = { id: l.id, token: l.token, expires_at: l.expires_at };
      });

      // Get enrolled count per course
      const enrolledCounts: Record<string, number> = {};
      for (const courseId of courseIds) {
        const { count } = await supabase
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .eq('status', 'approved');
        enrolledCounts[courseId] = count || 0;
      }

      const result: LessonWithAttendance[] = lessonData.map((l) => {
        const mod = moduleMap[l.module_id];
        return {
          id: l.id,
          title: l.title,
          order_index: l.order_index,
          module_title: mod?.title || '',
          course_id: mod?.course_id || '',
          course_title: courseMap[mod?.course_id] || '',
          attendance_count: attendanceCounts[l.id] || 0,
          enrolled_count: enrolledCounts[mod?.course_id] || 0,
          active_link: linkMap[l.id] || null,
          _module_order: mod?.order_index ?? 0,
        };
      });

      // Sort by module order, then lesson order (same sequence as ESDE I curriculum)
      result.sort((a, b) => a._module_order - b._module_order || a.order_index - b.order_index);

      setLessons(result);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleGenerateLink = async () => {
    if (!generateLesson || !user) return;
    setGenerating(true);

    const expiresAt = new Date(Date.now() + parseInt(duration) * 60 * 1000).toISOString();

    const trimmedUrl = redirectUrl.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      toast({ title: 'URL inválida', description: 'A URL deve começar com http:// ou https://', variant: 'destructive' });
      setGenerating(false);
      return;
    }

    const { data, error } = await supabase
      .from('attendance_links')
      .insert({
        lesson_id: generateLesson.id,
        created_by: user.id,
        expires_at: expiresAt,
        redirect_url: trimmedUrl || null,
      } as any)
      .select('token')
      .single();

    if (error) {
      toast({ title: 'Erro ao gerar link', description: error.message, variant: 'destructive' });
      setGenerating(false);
      return;
    }

    const url = `${window.location.origin}${import.meta.env.BASE_URL}presenca/${data.token}`;
    setGeneratedUrl(url);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: 'Link gerado e copiado!', description: 'Cole no chat do Google Meet.' });
    setGenerating(false);

    // Refresh
    fetchLessons();

    setTimeout(() => setCopied(false), 3000);
  };

  const handleViewRecords = async (lesson: LessonWithAttendance) => {
    setSelectedLesson(lesson);
    setDetailOpen(true);
    setRecordsLoading(true);

    const { data } = await supabase
      .from('attendance_records')
      .select('id, confirmed_at, user_id')
      .eq('lesson_id', lesson.id)
      .order('confirmed_at', { ascending: true });

    if (data?.length) {
      const userIds = data.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      setRecords(
        data.map((r) => ({
          id: r.id,
          confirmed_at: r.confirmed_at,
          user: profileMap[r.user_id] || { full_name: 'Desconhecido', email: '' },
        }))
      );
    } else {
      setRecords([]);
    }
    setRecordsLoading(false);
  };

  const exportCSV = () => {
    if (!records.length || !selectedLesson) return;
    const header = 'Nome,E-mail,Horário de Confirmação\n';
    const rows = records
      .map((r) => `"${r.user.full_name}","${r.user.email}","${format(new Date(r.confirmed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presenca-${selectedLesson.title.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetAttendance = async (lesson: LessonWithAttendance) => {
    const { error, count } = await supabase
      .from('attendance_records')
      .delete({ count: 'exact' })
      .eq('lesson_id', lesson.id);

    if (error) {
      toast({ title: 'Erro ao zerar presenças', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Presenças zeradas', description: `${count ?? 0} registro(s) removido(s) da aula "${lesson.title}".` });
    fetchLessons();
  };

  const getFrequencyColor = (count: number, total: number) => {
    if (total === 0) return 'text-muted-foreground';
    const pct = (count / total) * 100;
    if (pct >= 75) return 'text-success';
    if (pct >= 50) return 'text-accent';
    return 'text-destructive';
  };

  const getRemainingTime = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expirado';
    const minutes = Math.floor(diff / 60000);
    if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
    return `${minutes}min`;
  };

  return (
    <DashboardLayout>
      <PageHero title="Presenças" description="Gerencie a frequência das aulas do ESDE" />
      <div className="p-4 sm:p-6 space-y-6">

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : lessons.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma aula encontrada. Cadastre aulas no curso ESDE primeiro.
            </CardContent>
          </Card>
        ) : (() => {
          const courseTitles = ['ESDE I', 'ESDE II'].filter((t) => lessons.some((l) => l.course_title === t));
          const renderTable = (rows: LessonWithAttendance[]) => (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aula</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-[100px]">Presentes</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-[100px]">Frequência</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-[140px]">Link</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-[160px]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhuma aula cadastrada neste curso.
                      </td>
                    </tr>
                  ) : rows.map((lesson, i) => (
                    <tr key={lesson.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-card' : 'bg-muted/40'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            {lesson.order_index}
                          </span>
                          <div>
                            <p className="font-medium text-foreground">{lesson.title}</p>
                            <p className="text-xs text-muted-foreground">{lesson.module_title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium">{lesson.attendance_count}</span>
                        <span className="text-muted-foreground">/{lesson.enrolled_count}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${getFrequencyColor(lesson.attendance_count, lesson.enrolled_count)}`}>
                          {lesson.enrolled_count > 0 ? Math.round((lesson.attendance_count / lesson.enrolled_count) * 100) : 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {lesson.active_link ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
                            <Clock className="h-3 w-3" />
                            {getRemainingTime(lesson.active_link.expires_at)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => handleViewRecords(lesson)} title="Ver lista">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => {
                              setGenerateLesson(lesson);
                              setGeneratedUrl('');
                              setCopied(false);
                              setRedirectUrl('');
                              setGenerateOpen(true);
                            }}
                            title="Gerar link"
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-destructive hover:text-destructive"
                                title="Zerar presenças"
                                disabled={lesson.attendance_count === 0}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Zerar presenças desta aula?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso removerá permanentemente os <strong>{lesson.attendance_count}</strong> registro(s) de presença da aula <strong>"{lesson.title}"</strong>. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleResetAttendance(lesson)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Sim, zerar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );

          const defaultTab = courseTitles[0] || 'ESDE I';
          return (
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList>
                {(courseTitles.length ? courseTitles : ['ESDE I']).map((t) => (
                  <TabsTrigger key={t} value={t}>{t}</TabsTrigger>
                ))}
              </TabsList>
              {(courseTitles.length ? courseTitles : ['ESDE I']).map((t) => (
                <TabsContent key={t} value={t} className="mt-4">
                  {renderTable(lessons.filter((l) => l.course_title === t))}
                </TabsContent>
              ))}
            </Tabs>
          );
        })()}
      </div>


      {/* Generate Link Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Link de Presença</DialogTitle>
          </DialogHeader>
          {generateLesson && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">Aula {generateLesson.order_index} — {generateLesson.title}</p>
                <p className="text-xs text-muted-foreground">{generateLesson.module_title}</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Duração do link</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h30 (padrão)</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                    <SelectItem value="180">3 horas</SelectItem>
                    <SelectItem value="480">8 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  URL de redirecionamento <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input
                  type="url"
                  placeholder={DEFAULT_REDIRECT_URL}
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  disabled={!!generatedUrl}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Se vazio, será usado o link padrão do Google Meet.
                </p>
              </div>


              {generatedUrl ? (
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Link gerado:</p>
                    <p className="text-sm font-mono break-all">{generatedUrl}</p>
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={async () => {
                      await navigator.clipboard.writeText(generatedUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiado!' : 'Copiar link'}
                  </Button>
                </div>
              ) : (
                <Button className="w-full gap-2" onClick={handleGenerateLink} disabled={generating}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  {generating ? 'Gerando...' : 'Gerar e copiar link'}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Records Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedLesson && `Presença — Aula ${selectedLesson.order_index}`}
            </DialogTitle>
          </DialogHeader>
          {selectedLesson && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{selectedLesson.title}</p>
                  <p className="text-xs text-muted-foreground">{selectedLesson.module_title}</p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Users className="h-3 w-3" />
                  {records.length} presentes
                </Badge>
              </div>

              {selectedLesson.active_link && (
                <div className="flex items-center gap-2 text-sm text-success">
                  <Clock className="h-4 w-4" />
                  Link ativo — expira em {getRemainingTime(selectedLesson.active_link.expires_at)}
                </div>
              )}

              {recordsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : records.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma presença registrada.</p>
              ) : (
                <div className="space-y-2">
                  {records.map((r, i) => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border">
                      <div>
                        <p className="text-sm font-medium">{r.user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{r.user.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.confirmed_at), 'HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {records.length > 0 && (
                <Button variant="outline" className="w-full gap-2" onClick={exportCSV}>
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
