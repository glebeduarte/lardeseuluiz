import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen, Camera, CheckCircle2, Clock, Loader2,
  Mail, Phone, PlayCircle, Save, User, X
} from 'lucide-react';
import { PageHero } from '@/components/layout/PageHero';

interface EnrolledCourse {
  id: string;
  course: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    cover_url: string | null;
    category: string | null;
  };
}

interface RecentLesson {
  lesson_id: string;
  completed_at: string;
  lesson: {
    id: string;
    title: string;
    module: {
      title: string;
      course: { id: string; title: string };
    };
  } | null;
}

interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
}

export default function MyAccount() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [recentLessons, setRecentLessons] = useState<RecentLesson[]>([]);
  const [courseProgress, setCourseProgress] = useState<Map<string, CourseProgress>>(new Map());
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
    setAvatarUrl(profile?.avatar_url || '');
  }, [profile, user]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [enrollRes, recentRes] = await Promise.all([
      supabase.from('enrollments').select('id, course:courses(id, title, thumbnail_url, cover_url, category)').eq('user_id', user.id).eq('status', 'approved'),
      supabase.from('lesson_progress').select('lesson_id, completed_at, lesson:lessons(id, title, module:modules(title, course:courses(id, title)))').eq('user_id', user.id).eq('completed', true).order('completed_at', { ascending: false }).limit(4),
    ]);

    const enrolled = (enrollRes.data as any) || [];
    setEnrolledCourses(enrolled);
    setRecentLessons((recentRes.data as any) || []);

    if (enrolled.length > 0) {
      const courseIds = enrolled.map((e: any) => e.course?.id).filter(Boolean);
      const [modulesRes, progressRes] = await Promise.all([
        supabase.from('modules').select('id, course_id').in('course_id', courseIds),
        supabase.from('lesson_progress').select('lesson_id').eq('user_id', user!.id).eq('completed', true),
      ]);
      const moduleIds = (modulesRes.data || []).map(m => m.id);
      let lessonsRes = { data: [] as any[] };
      if (moduleIds.length > 0) {
        lessonsRes = await supabase.from('lessons').select('id, module_id').in('module_id', moduleIds);
      }
      const completedSet = new Set((progressRes.data || []).map(p => p.lesson_id));
      const progressMap = new Map<string, CourseProgress>();
      for (const courseId of courseIds) {
        const courseModuleIds = (modulesRes.data || []).filter(m => m.course_id === courseId).map(m => m.id);
        const courseLessons = (lessonsRes.data || []).filter(l => courseModuleIds.includes(l.module_id));
        progressMap.set(courseId, { totalLessons: courseLessons.length, completedLessons: courseLessons.filter(l => completedSet.has(l.id)).length });
      }
      setCourseProgress(progressMap);
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName, phone: phone || null, avatar_url: avatarUrl || null }).eq('id', user.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: fullName, phone: phone || null } });
      toast({ title: 'Perfil atualizado com sucesso!' });
      window.location.reload();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'Senhas não coincidem', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Senha muito curta', description: 'Mínimo 6 caracteres', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Senha atualizada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar senha', description: err.message, variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast({ title: 'Selecione uma imagem', variant: 'destructive' }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'Máximo 5MB', variant: 'destructive' }); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('course-assets').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('course-assets').getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl);
      toast({ title: 'Foto enviada!' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar foto', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  if (!user || !profile) return null;

  const totalCompleted = Array.from(courseProgress.values()).reduce((sum, p) => sum + p.completedLessons, 0);
  const totalLessons = Array.from(courseProgress.values()).reduce((sum, p) => sum + p.totalLessons, 0);
  const overallProgress = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return (
    <DashboardLayout>
      <PageHero title="Minha Conta" description="Gerencie seus dados e acompanhe sua jornada" variant="student" />
      <div className="space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
          {/* Left: Profile Card */}
          <div className="space-y-4">
            <Card className="text-center">
              <CardContent className="p-6">
                {/* Avatar */}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                <div className="relative mx-auto w-fit mb-4">
                  <div className="h-[90px] w-[90px] rounded-full overflow-hidden border-4 border-card shadow-lg">
                    {avatarUrl || profile.avatar_url ? (
                      <img src={avatarUrl || profile.avatar_url || ''} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-primary/10 text-primary flex items-center justify-center">
                        <span className="text-[32px] font-bold text-primary-foreground">{profile.full_name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                  >
                    {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <h2 className="font-['Playfair_Display'] font-bold text-xl mb-0.5">{profile.full_name}</h2>
                <p className="text-xs text-muted-foreground mb-4">{profile.email}</p>

                {/* Stats */}
                <div className="flex justify-around py-3 border-t border-b border-border mb-4">
                  <div>
                    <p className="text-2xl font-bold">{enrolledCourses.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cursos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalCompleted}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aulas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{overallProgress}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Progresso</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-3 py-1 rounded-full">
                  {profile.role === 'admin' ? '⊞ Administrador' : '📚 Aluno'}
                </span>

                {/* Recent Lessons */}
                <div className="mt-5 text-left">
                  <p className="text-[10px] uppercase tracking-[0.13em] text-primary font-bold mb-3">🕐 Aulas Recentes</p>
                  {recentLessons.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma aula assistida</p>
                  ) : (
                    <div className="space-y-0">
                      {recentLessons.map(item => {
                        const lesson = item.lesson as any;
                        if (!lesson) return null;
                        return (
                          <div key={item.lesson_id} onClick={() => navigate(`/lesson/${item.lesson_id}`)} className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors rounded-lg px-1">
                            <div className="h-[42px] w-[42px] rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">📄</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium truncate">{lesson.title}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{lesson.module?.course?.title} · {lesson.module?.title}</p>
                            </div>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(item.completed_at)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Forms - 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Data */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-['Playfair_Display'] font-semibold text-lg mb-4 pb-3 border-b">Dados Pessoais</h3>
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Nome</Label>
                    <Input value={firstName} onChange={e => setFullName(e.target.value + (lastName ? ' ' + lastName : ''))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Sobrenome</Label>
                    <Input value={lastName} onChange={e => setFullName(firstName + ' ' + e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">E-mail</Label>
                    <Input value={profile.email} disabled className="opacity-60" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Telefone</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => { setFullName(profile.full_name); setPhone(profile.phone || ''); }}>Cancelar</Button>
                  <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Password */}
            <Card className="h-fit">
              <CardContent className="p-5">
                <h3 className="font-['Playfair_Display'] font-semibold text-lg mb-4 pb-3 border-b">Alterar Senha</h3>
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Senha atual</Label>
                    <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Nova senha</Label>
                    <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nova senha" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Confirmar nova senha</Label>
                    <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirme a senha" />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button size="sm" onClick={handlePasswordChange} disabled={changingPassword || !newPassword}>
                    {changingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Atualizar Senha
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Courses - Full width below, vertical cards */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-['Playfair_Display'] font-semibold text-lg mb-4 pb-3 border-b">Meus Cursos ({enrolledCourses.length})</h3>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="aspect-[3/4] bg-muted/30 rounded-xl animate-pulse" />)}
              </div>
            ) : enrolledCourses.length === 0 ? (
              <div className="text-center py-6">
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum curso matriculado</p>
                <Button size="sm" className="mt-3" onClick={() => navigate('/explore')}>Explorar Cursos</Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {enrolledCourses.map(enrollment => {
                  const course = enrollment.course;
                  if (!course) return null;
                  const prog = courseProgress.get(course.id);
                  const pct = prog && prog.totalLessons > 0 ? Math.round((prog.completedLessons / prog.totalLessons) * 100) : 0;
                  const bgColors: Record<string, string> = { formacoes: 'bg-primary/10', cursos_extras: 'bg-sky-100', materiais: 'bg-accent/20' };
                  const bg = bgColors[course.category || ''] || 'bg-primary/10';

                  return (
                    <div key={enrollment.id} onClick={() => navigate(`/course/${course.id}`)} className="border border-border rounded-xl overflow-hidden cursor-pointer card-hover">
                      <div className={`${bg} aspect-[4/5] flex items-center justify-center text-[28px]`}>
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span>{pct === 100 ? '✓' : '📚'}</span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-bold truncate mb-2">{course.title}</p>
                        <div className="h-[5px] bg-muted rounded-full overflow-hidden mb-1">
                          <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-right">{pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
