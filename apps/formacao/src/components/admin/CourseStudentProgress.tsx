import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, User, CheckCircle, Clock, Users } from 'lucide-react';

interface CourseStudentProgressProps {
  courseId: string;
  courseTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StudentCourseProgress {
  studentId: string;
  studentName: string;
  studentEmail: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

export function CourseStudentProgress({
  courseId,
  courseTitle,
  open,
  onOpenChange,
}: CourseStudentProgressProps) {
  const [students, setStudents] = useState<StudentCourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      fetchStudentProgress();
    }
  }, [open, courseId]);

  const fetchStudentProgress = async () => {
    setLoading(true);

    // Get all approved enrollments for this course
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('course_id', courseId)
      .eq('status', 'approved');

    if (!enrollments || enrollments.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const userIds = enrollments.map((e) => e.user_id);

    // Fetch profiles for these users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    // Get modules for this course
    const { data: modules } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', courseId);

    const moduleIds = (modules || []).map((m) => m.id);

    // Get lessons for these modules
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds);

    const lessonIds = (lessons || []).map((l) => l.id);
    const totalLessons = lessonIds.length;

    // Get progress for all enrolled users
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('user_id, lesson_id, completed')
      .in('user_id', userIds)
      .in('lesson_id', lessonIds)
      .eq('completed', true);

    // Build progress per user
    const userCompletedLessons: Record<string, number> = {};
    (progressData || []).forEach((p) => {
      if (!userCompletedLessons[p.user_id]) {
        userCompletedLessons[p.user_id] = 0;
      }
      userCompletedLessons[p.user_id]++;
    });

    // Map profiles with progress
    const studentsProgress: StudentCourseProgress[] = (profiles || []).map((profile) => {
      const completedLessons = userCompletedLessons[profile.id] || 0;
      const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        studentId: profile.id,
        studentName: profile.full_name,
        studentEmail: profile.email,
        totalLessons,
        completedLessons,
        progressPercent,
      };
    });

    // Sort by progress (highest first), then by name
    studentsProgress.sort((a, b) => {
      if (b.progressPercent !== a.progressPercent) {
        return b.progressPercent - a.progressPercent;
      }
      return a.studentName.localeCompare(b.studentName);
    });

    setStudents(studentsProgress);
    setLoading(false);
  };

  const filteredStudents = students.filter(
    (student) =>
      student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProgressColor = (percent: number) => {
    if (percent === 100) return 'text-success';
    if (percent >= 50) return 'text-primary';
    if (percent > 0) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getProgressBadgeClass = (percent: number) => {
    if (percent === 100) return 'bg-success/20 text-success';
    if (percent > 0) return 'bg-primary/20 text-primary';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Alunos Matriculados - {courseTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats */}
          <div className="flex gap-3">
            <Badge variant="secondary" className="text-sm">
              <Users className="h-3 w-3 mr-1" />
              {students.length} alunos matriculados
            </Badge>
            {students.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                <CheckCircle className="h-3 w-3 mr-1" />
                {students.filter((s) => s.progressPercent === 100).length} concluíram
              </Badge>
            )}
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {students.length === 0
                    ? 'Nenhum aluno matriculado neste curso'
                    : 'Nenhum aluno encontrado com a busca'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <Card key={student.studentId} className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                         {/* Avatar */}
                         <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-medium flex-shrink-0 text-sm">
                           {student.studentName.charAt(0).toUpperCase()}
                         </div>

                         {/* Info + Progress */}
                         <div className="flex-1 min-w-0">
                           <p className="font-medium truncate text-sm">{student.studentName}</p>
                           <p className="text-xs text-muted-foreground truncate">
                             {student.studentEmail}
                           </p>
                           <div className="flex items-center gap-2 mt-1">
                             {student.progressPercent === 100 ? (
                               <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                             ) : (
                               <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                             )}
                             <span
                               className={`text-xs font-medium ${getProgressColor(student.progressPercent)}`}
                             >
                               {student.completedLessons}/{student.totalLessons}
                             </span>
                             <Badge className={`${getProgressBadgeClass(student.progressPercent)} text-[10px] px-1.5 py-0`}>
                               {student.progressPercent}%
                             </Badge>
                           </div>
                         </div>
                       </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <Progress value={student.progressPercent} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
