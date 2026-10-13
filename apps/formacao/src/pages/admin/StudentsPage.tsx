import { useEffect, useState, useMemo } from 'react';
import { enrollUserInCourse } from '@/lib/enrollments';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Search, MoreVertical, User, BookOpen, Ban, CheckCircle, Plus, Trash2,
  UserX, Mail, Clock, ArrowUpDown, Shield, RefreshCw, ChevronUp, ChevronDown, Users,
  UserCheck, Heart, Briefcase, Activity, KeyRound
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExportStudents } from '@/components/admin/ExportStudents';
import { PageHero } from '@/components/layout/PageHero';
import { MiniKPI } from '@/components/admin/MiniKPI';

interface Student {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  user_type: 'frequentador' | 'trabalhador';
  isAdminUser: boolean;
  enrollments_count: number;
  averageProgress: number;
  lastAccess: string | null;
  courses: {
    courseId: string;
    courseTitle: string;
    totalLessons: number;
    completedLessons: number;
    progressPercent: number;
  }[];
}

interface Enrollment {
  id: string;
  status: string;
  course: { id: string; title: string; };
}

interface Course {
  id: string;
  title: string;
}

type SortKey = 'full_name' | 'email' | 'phone' | 'user_type' | 'enrollments_count' | 'averageProgress' | 'lastAccess' | 'is_active';
type SortDir = 'asc' | 'desc';

export default function StudentsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('full_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrollmentsDialogOpen, setEnrollmentsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [assigningCourse, setAssigningCourse] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState(false);
  const [convertingType, setConvertingType] = useState(false);
  const [resetPwDialogOpen, setResetPwDialogOpen] = useState(false);
  const [studentToResetPw, setStudentToResetPw] = useState<Student | null>(null);
  const [resettingPw, setResettingPw] = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    fetchStudents();
  }, [isAdmin, navigate]);

  const fetchStudents = async () => {
    setLoading(true);
    const { data: coursesData } = await supabase.from('courses').select('id, title').order('title');
    setCourses(coursesData || []);
    const { data: profiles, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error || !profiles) { setLoading(false); return; }
    // Fetch admin roles to tag admin users
    const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    const adminUserIds = new Set((adminRoles || []).map(r => r.user_id));
    const { data: enrollments } = await supabase.from('enrollments').select(`user_id, course_id, status, course:courses (id, title)`).eq('status', 'approved');
    const { data: modulesData } = await supabase.from('modules').select('id, course_id');
    const { data: lessonsData } = await supabase.from('lessons').select('id, module_id');
    const { data: progressData } = await supabase.from('lesson_progress').select('user_id, lesson_id, completed, completed_at').eq('completed', true);
    const courseToLessons: Record<string, string[]> = {};
    (modulesData || []).forEach((module) => {
      if (!courseToLessons[module.course_id]) courseToLessons[module.course_id] = [];
      const moduleLessons = (lessonsData || []).filter((l) => l.module_id === module.id).map((l) => l.id);
      courseToLessons[module.course_id].push(...moduleLessons);
    });
    const userCompletedLessons: Record<string, Set<string>> = {};
    const userLastProgress: Record<string, string | null> = {};
    (progressData || []).forEach((p) => {
      if (!userCompletedLessons[p.user_id]) userCompletedLessons[p.user_id] = new Set();
      userCompletedLessons[p.user_id].add(p.lesson_id);
      if (p.completed_at) {
        if (!userLastProgress[p.user_id] || p.completed_at > userLastProgress[p.user_id]!) userLastProgress[p.user_id] = p.completed_at;
      }
    });
    const studentEnrollmentsMap: Record<string, Student['courses']> = {};
    (enrollments || []).forEach((enrollment: any) => {
      const studentId = enrollment.user_id;
      const course = enrollment.course;
      if (!course) return;
      if (!studentEnrollmentsMap[studentId]) studentEnrollmentsMap[studentId] = [];
      const courseLessons = courseToLessons[course.id] || [];
      const totalLessons = courseLessons.length;
      const userCompleted = userCompletedLessons[studentId] || new Set();
      const completedLessons = courseLessons.filter((lid) => userCompleted.has(lid)).length;
      const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      studentEnrollmentsMap[studentId].push({ courseId: course.id, courseTitle: course.title, totalLessons, completedLessons, progressPercent });
    });
    const studentsWithProgress: Student[] = profiles.map((profile) => {
      const studentCourses = studentEnrollmentsMap[profile.id] || [];
      const averageProgress = studentCourses.length > 0 ? Math.round(studentCourses.reduce((sum, c) => sum + c.progressPercent, 0) / studentCourses.length) : 0;
      // Prefer the most recent between login activity and lesson progress
      const activity = (profile as any).last_activity_at as string | null;
      const progress = userLastProgress[profile.id] || null;
      const lastAccess = activity && progress ? (activity > progress ? activity : progress) : (activity || progress);
      return { ...profile, isAdminUser: adminUserIds.has(profile.id), enrollments_count: studentCourses.length, averageProgress, lastAccess, courses: studentCourses };
    });
    setStudents(studentsWithProgress);
    setLoading(false);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const filteredAndSortedStudents = useMemo(() => {
    const filtered = students.filter((s) => {
      const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCourse = selectedCourse === 'all' || s.courses.some((c) => c.courseId === selectedCourse);
      return matchesSearch && matchesCourse;
    });
    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'full_name': return a.full_name.localeCompare(b.full_name, 'pt-BR') * dir;
        case 'email': return a.email.localeCompare(b.email) * dir;
        case 'phone': return ((a.phone || '').localeCompare(b.phone || '')) * dir;
        case 'user_type': return a.user_type.localeCompare(b.user_type) * dir;
        case 'enrollments_count': return (a.enrollments_count - b.enrollments_count) * dir;
        case 'averageProgress': return (a.averageProgress - b.averageProgress) * dir;
        case 'lastAccess': {
          if (!a.lastAccess && !b.lastAccess) return 0;
          if (!a.lastAccess) return 1 * dir;
          if (!b.lastAccess) return -1 * dir;
          return (new Date(a.lastAccess).getTime() - new Date(b.lastAccess).getTime()) * dir;
        }
        case 'is_active': return (Number(a.is_active) - Number(b.is_active)) * dir;
        default: return 0;
      }
    });
  }, [students, searchQuery, selectedCourse, sortKey, sortDir]);

  const allVisibleSelected = filteredAndSortedStudents.length > 0 && filteredAndSortedStudents.every(s => selectedIds.has(s.id));
  const toggleSelectAll = () => { if (allVisibleSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(filteredAndSortedStudents.map(s => s.id))); };
  const toggleSelect = (id: string) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };

  const bulkConvertType = async () => {
    if (selectedIds.size === 0) return;
    setConvertingType(true);
    const selected = students.filter(s => selectedIds.has(s.id));
    const updates = selected.map(s => ({ id: s.id, newType: s.user_type === 'trabalhador' ? 'frequentador' as const : 'trabalhador' as const }));
    let errorCount = 0;
    for (const u of updates) {
      const { error } = await supabase.from('profiles').update({ user_type: u.newType } as any).eq('id', u.id);
      if (error) errorCount++;
    }
    setStudents(prev => prev.map(s => { const update = updates.find(u => u.id === s.id); return update ? { ...s, user_type: update.newType } : s; }));
    setSelectedIds(new Set());
    setConvertingType(false);
    toast({ title: `${updates.length - errorCount} aluno(s) convertido(s)`, description: errorCount > 0 ? `${errorCount} erro(s)` : undefined });
  };

  const toggleStudentStatus = async (student: Student) => {
    const { error } = await supabase.from('profiles').update({ is_active: !student.is_active }).eq('id', student.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { setStudents(students.map(s => s.id === student.id ? { ...s, is_active: !s.is_active } : s)); toast({ title: student.is_active ? 'Desativado' : 'Ativado' }); }
  };

  const viewEnrollments = async (student: Student) => {
    setSelectedStudent(student); setEnrollmentsDialogOpen(true); setLoadingEnrollments(true);
    const { data } = await supabase.from('enrollments').select(`id, status, course:courses (id, title)`).eq('user_id', student.id);
    setStudentEnrollments((data as any) || []); setLoadingEnrollments(false);
  };

  const openAssignDialog = async (student: Student) => {
    setSelectedStudent(student); setSelectedCourseId(''); setAssignDialogOpen(true);
    const { data: allCourses } = await supabase.from('courses').select('id, title').order('title');
    const { data: enrollments } = await supabase.from('enrollments').select('course_id').eq('user_id', student.id).in('status', ['approved', 'pending']);
    const enrolledCourseIds = new Set(enrollments?.map((e) => e.course_id) || []);
    setAvailableCourses((allCourses || []).filter((c) => !enrolledCourseIds.has(c.id)));
  };

  const assignCourse = async () => {
    if (!selectedStudent || !selectedCourseId) return;
    setAssigningCourse(true);
    const { error } = await enrollUserInCourse(selectedStudent.id, selectedCourseId);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Curso atribuído!' }); setAssignDialogOpen(false); fetchStudents(); }
    setAssigningCourse(false);
  };

  const removeEnrollment = async (enrollmentId: string) => {
    const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { setStudentEnrollments(studentEnrollments.filter(e => e.id !== enrollmentId)); fetchStudents(); toast({ title: 'Removida' }); }
  };

  const openDeleteDialog = (student: Student) => { setStudentToDelete(student); setDeleteDialogOpen(true); };

  const deleteStudent = async () => {
    if (!studentToDelete) return;
    setDeletingStudent(true);
    await supabase.from('enrollments').delete().eq('user_id', studentToDelete.id);
    await supabase.from('lesson_progress').delete().eq('user_id', studentToDelete.id);
    const { error } = await supabase.from('profiles').delete().eq('id', studentToDelete.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { setStudents(students.filter(s => s.id !== studentToDelete.id)); toast({ title: 'Removido' }); }
    setDeletingStudent(false); setDeleteDialogOpen(false); setStudentToDelete(null);
  };

  const sendPasswordReset = async (student: Student) => {
    const { error } = await supabase.auth.resetPasswordForEmail(student.email, { redirectTo: 'https://formacao.lardeseuluiz.com.br/reset-password' });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else toast({ title: 'E-mail enviado!', description: `Link enviado para ${student.email}` });
  };

  const openResetPwDialog = (student: Student) => { setStudentToResetPw(student); setResetPwDialogOpen(true); };

  const resetToDefaultPassword = async () => {
    if (!studentToResetPw) return;
    setResettingPw(true);
    const { data, error } = await supabase.functions.invoke('admin-set-password', {
      body: { email: studentToResetPw.email, password: 'LSL@estudo2026' },
    });
    if (error || (data && (data as any).error)) {
      toast({ title: 'Erro', description: error?.message || (data as any)?.error || 'Falha ao redefinir', variant: 'destructive' });
    } else {
      await supabase.from('profiles').update({ must_change_password: true }).eq('id', studentToResetPw.id);
      toast({ title: 'Senha redefinida', description: `Senha de ${studentToResetPw.email} agora é LSL@estudo2026. Ele(a) será solicitado(a) a criar uma nova no próximo acesso.` });
    }
    setResettingPw(false);
    setResetPwDialogOpen(false);
    setStudentToResetPw(null);
  };

  const promoteToAdmin = async (student: Student) => {
    const { error } = await supabase.from('user_roles').insert({ user_id: student.id, role: 'admin' as any });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { await supabase.from('profiles').update({ role: 'admin' }).eq('id', student.id); setStudents(students.map(s => s.id === student.id ? { ...s, isAdminUser: true } : s)); toast({ title: `${student.full_name} promovido!` }); }
  };

  const getProgressColor = (pct: number) => {
    if (pct === 100) return 'text-teal';
    if (pct >= 50) return 'text-primary';
    if (pct > 0) return 'text-accent';
    return 'text-muted-foreground';
  };

  const formatLastAccess = (date: string | null) => {
    if (!date) return 'Sem atividade';
    const d = new Date(date);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `há ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'ontem';
    if (diffD < 7) return `há ${diffD} dias`;
    return format(d, 'dd/MM/yyyy', { locale: ptBR });
  };

  const SortableHeader = ({ column, children, className }: { column: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button onClick={() => handleSort(column)} className="flex items-center gap-0.5 hover:text-white/80 transition-colors w-full text-left">
        {children}
        <SortIcon column={column} />
      </button>
    </TableHead>
  );

  // Avatar color generator
  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-blue-500 to-teal-500',
      'from-teal-500 to-primary',
      'from-accent to-orange-500',
      'from-primary to-blue-600',
      'from-purple-500 to-primary',
    ];
    const idx = name.charCodeAt(0) % gradients.length;
    return gradients[idx];
  };

  // KPIs
  const totalStudents = students.length;
  const frequentadoresCount = students.filter(s => s.user_type === 'frequentador').length;
  const trabalhadoresCount = students.filter(s => s.user_type === 'trabalhador').length;
  const activeStudentsCount = students.filter(s => s.is_active).length;
  const studentsWithProgressCount = students.filter(s => s.averageProgress > 0).length;

  return (
    <DashboardLayout>
      <PageHero title="Alunos" description="Gerencie os alunos e acompanhe seu progresso" />
      <div className="p-4 sm:p-6 md:p-7 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniKPI
            icon={Users}
            label="Total de alunos"
            value={loading ? '—' : totalStudents}
            tone="primary"
            hint={`${activeStudentsCount} ativos`}
          />
          <MiniKPI
            icon={Heart}
            label="Frequentadores"
            value={loading ? '—' : frequentadoresCount}
            tone="accent"
          />
          <MiniKPI
            icon={Briefcase}
            label="Trabalhadores"
            value={loading ? '—' : trabalhadoresCount}
            tone="teal"
          />
          <MiniKPI
            icon={Activity}
            label="Com progresso"
            value={loading ? '—' : studentsWithProgressCount}
            tone="success"
            hint={totalStudents > 0 ? `${Math.round((studentsWithProgressCount / totalStudents) * 100)}% do total` : undefined}
          />
        </div>

        {/* Header */}
        <div className="flex justify-end gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <Button variant="outline" size="sm" className="gap-2" onClick={bulkConvertType} disabled={convertingType}>
                <RefreshCw className={`h-3.5 w-3.5 ${convertingType ? 'animate-spin' : ''}`} />
                Converter ({selectedIds.size})
              </Button>
            )}
            <ExportStudents students={students} courses={courses} defaultCourseFilter={selectedCourse} />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 focus:ring-primary/10 focus:border-primary" />
          </div>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Filtrar por curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cursos</SelectItem>
              {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="bg-muted/50 border border-border rounded-xl px-4 py-2 flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">Exibindo</span>
            <span className="text-lg font-display font-bold text-foreground tabular-nums">{filteredAndSortedStudents.length}</span>
          </div>
        </div>

        {/* Table */}
        <Card className="shadow-card border-border rounded-2xl overflow-hidden hidden sm:block">
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[900px] table-fixed">
              <TableHeader>
                <TableRow className="bg-foreground hover:bg-foreground">
                  <TableHead className="w-10 text-white/80">
                    <Checkbox checked={allVisibleSelected} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <SortableHeader column="full_name"><span className="text-white/80 text-[10px] uppercase tracking-[0.1em]">Aluno</span></SortableHeader>
                  <SortableHeader column="email" className="hidden md:table-cell"><span className="text-white/80 text-[10px] uppercase tracking-[0.1em]">E-mail</span></SortableHeader>
                  <SortableHeader column="phone" className="hidden lg:table-cell"><span className="text-white/80 text-[10px] uppercase tracking-[0.1em]">Telefone</span></SortableHeader>
                  <SortableHeader column="user_type"><span className="text-white/80 text-[10px] uppercase tracking-[0.1em]">Tipo</span></SortableHeader>
                  <SortableHeader column="enrollments_count"><span className="text-white/80 text-[10px] uppercase tracking-[0.1em]">Cursos</span></SortableHeader>
                  <SortableHeader column="averageProgress"><span className="text-white/80 text-[10px] uppercase tracking-[0.1em]">Progresso</span></SortableHeader>
                  <SortableHeader column="lastAccess" className="hidden lg:table-cell"><span className="text-white/80 text-[10px] uppercase tracking-[0.1em]">Último Acesso</span></SortableHeader>
                  <SortableHeader column="is_active"><span className="text-white/80 text-[10px] uppercase tracking-[0.1em]">Status</span></SortableHeader>
                  <TableHead className="w-12 bg-foreground"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={10}><div className="h-12 bg-muted/50 rounded animate-pulse" /></TableCell></TableRow>)
                ) : filteredAndSortedStudents.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12"><User className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Nenhum aluno encontrado</p></TableCell></TableRow>
                ) : (
                  filteredAndSortedStudents.map((student, idx) => (
                    <TableRow
                      key={student.id}
                      className={`transition-colors duration-150 ${selectedIds.has(student.id) ? 'bg-blue-lt' : idx % 2 === 1 ? 'bg-muted/30' : ''} hover:bg-muted/50`}
                    >
                      <TableCell><Checkbox checked={selectedIds.has(student.id)} onCheckedChange={() => toggleSelect(student.id)} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${getAvatarGradient(student.full_name)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                            {student.full_name.charAt(0).toUpperCase()}
                          </div>
                           <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm break-words">{student.full_name}</span>
                              {student.isAdminUser && <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/40 text-primary font-medium">Admin</Badge>}
                            </div>
                            <span className="text-[11px] text-muted-foreground md:hidden">{student.email}</span>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell text-sm break-all">{student.email}</TableCell>
                      <TableCell className="text-muted-foreground hidden lg:table-cell text-sm">{student.phone || '—'}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${student.user_type === 'trabalhador' ? 'bg-teal/10 text-teal' : 'bg-primary/10 text-primary'}`}>
                          {student.user_type === 'trabalhador' ? 'Trabalhador' : 'Frequentador'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-display">{student.enrollments_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-[70px] h-[5px] bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${student.averageProgress === 100 ? 'bg-teal' : student.averageProgress >= 50 ? 'bg-primary' : 'bg-accent'}`} style={{ width: `${student.averageProgress}%` }} />
                          </div>
                          <span className={`text-xs font-display font-bold ${getProgressColor(student.averageProgress)}`}>{student.averageProgress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden lg:table-cell text-sm">{formatLastAccess(student.lastAccess)}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          student.is_active ? 'bg-[#E8F8F0] text-[#1A7A50]' : 'bg-muted text-muted-foreground'
                        }`}>
                          {student.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openAssignDialog(student)}><Plus className="h-4 w-4 mr-2" />Atribuir Curso</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => viewEnrollments(student)}><BookOpen className="h-4 w-4 mr-2" />Ver Cursos</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendPasswordReset(student)}><Mail className="h-4 w-4 mr-2" />Enviar link de redefinição</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openResetPwDialog(student)}><KeyRound className="h-4 w-4 mr-2" />Redefinir para senha padrão</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStudentStatus(student)}>{student.is_active ? <><Ban className="h-4 w-4 mr-2" />Desativar</> : <><CheckCircle className="h-4 w-4 mr-2" />Ativar</>}</DropdownMenuItem>
                            {!student.isAdminUser && <DropdownMenuItem onClick={() => promoteToAdmin(student)}><Shield className="h-4 w-4 mr-2" />Promover a Admin</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => openDeleteDialog(student)} className="text-destructive focus:text-destructive"><UserX className="h-4 w-4 mr-2" />Remover</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination info */}
        {!loading && filteredAndSortedStudents.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>Mostrando {filteredAndSortedStudents.length} de {students.length} alunos</span>
          </div>
        )}

        {/* Mobile Card Layout */}
        <div className="block sm:hidden space-y-3">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />)}</div>
          ) : filteredAndSortedStudents.length === 0 ? (
            <div className="text-center py-12"><User className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Nenhum aluno encontrado</p></div>
          ) : (
            filteredAndSortedStudents.map((student) => (
              <Card key={student.id} className="shadow-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={selectedIds.has(student.id)} onCheckedChange={() => toggleSelect(student.id)} className="mt-1" />
                    <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${getAvatarGradient(student.full_name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {student.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                            {student.full_name}
                            {student.isAdminUser && <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/40 text-primary font-medium">Admin</Badge>}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">{student.email}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openAssignDialog(student)}><Plus className="h-4 w-4 mr-2" />Atribuir Curso</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => viewEnrollments(student)}><BookOpen className="h-4 w-4 mr-2" />Ver Cursos</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendPasswordReset(student)}><Mail className="h-4 w-4 mr-2" />Enviar link de redefinição</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openResetPwDialog(student)}><KeyRound className="h-4 w-4 mr-2" />Redefinir para senha padrão</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStudentStatus(student)}>{student.is_active ? <><Ban className="h-4 w-4 mr-2" />Desativar</> : <><CheckCircle className="h-4 w-4 mr-2" />Ativar</>}</DropdownMenuItem>
                            {!student.isAdminUser && <DropdownMenuItem onClick={() => promoteToAdmin(student)}><Shield className="h-4 w-4 mr-2" />Promover</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => openDeleteDialog(student)} className="text-destructive"><UserX className="h-4 w-4 mr-2" />Remover</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${student.user_type === 'trabalhador' ? 'bg-teal/10 text-teal' : 'bg-primary/10 text-primary'}`}>
                          {student.user_type === 'trabalhador' ? 'Trabalhador' : 'Frequentador'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-[5px] bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${student.averageProgress === 100 ? 'bg-teal' : 'bg-primary'}`} style={{ width: `${student.averageProgress}%` }} />
                          </div>
                          <span className="text-xs font-display font-bold">{student.averageProgress}%</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${student.is_active ? 'bg-[#E8F8F0] text-[#1A7A50]' : 'bg-muted text-muted-foreground'}`}>
                          {student.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={enrollmentsDialogOpen} onOpenChange={setEnrollmentsDialogOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="font-display">Cursos de {selectedStudent?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            {loadingEnrollments ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />)}</div>
            : studentEnrollments.length === 0 ? <p className="text-center text-muted-foreground py-8">Nenhum curso</p>
            : studentEnrollments.map(enrollment => {
              const cp = selectedStudent?.courses.find(c => c.courseId === enrollment.course.id);
              return (
                <div key={enrollment.id} className="p-3 bg-muted/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{enrollment.course.title}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${enrollment.status === 'approved' ? 'bg-teal/10 text-teal' : enrollment.status === 'pending' ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'}`}>
                        {enrollment.status === 'approved' ? 'Aprovado' : enrollment.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => removeEnrollment(enrollment.id)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  {cp && enrollment.status === 'approved' && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-[5px] bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${cp.progressPercent}%` }} /></div>
                      <span className="text-xs font-display font-bold">{cp.completedLessons}/{cp.totalLessons} ({cp.progressPercent}%)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle className="font-display">Atribuir Curso</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Selecione um curso para {selectedStudent?.full_name}</p>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger><SelectValue placeholder="Selecione um curso" /></SelectTrigger>
              <SelectContent>{availableCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
            </Select>
            {availableCourses.length === 0 && <p className="text-sm text-muted-foreground">Todos os cursos já atribuídos.</p>}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancelar</Button>
              <Button onClick={assignCourse} disabled={!selectedCourseId || assigningCourse} className="gradient-primary text-white">{assigningCourse ? 'Atribuindo...' : 'Atribuir'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Remover Aluno</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover <strong>{studentToDelete?.full_name}</strong>? Todas as matrículas e progresso serão perdidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingStudent}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteStudent} disabled={deletingStudent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingStudent ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetPwDialogOpen} onOpenChange={setResetPwDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Redefinir senha</AlertDialogTitle>
            <AlertDialogDescription>
              A senha de <strong>{studentToResetPw?.full_name}</strong> ({studentToResetPw?.email}) será alterada para <strong>LSL@estudo2026</strong>. O aluno poderá alterá-la depois. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resettingPw}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={resetToDefaultPassword} disabled={resettingPw} className="gradient-primary text-white">
              {resettingPw ? 'Redefinindo...' : 'Redefinir senha'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
