import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CabecalhoPagina } from '@/compartilhado';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Circle, BookOpen, CalendarCheck, Percent, Loader2 } from 'lucide-react';

interface LessonAttendance {
  lesson_id: string;
  lesson_title: string;
  lesson_order: number;
  module_title: string;
  confirmed_at: string | null;
}

export default function MyAttendancePage() {
  const { user } = useAuth();
  const [data, setData] = useState<LessonAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchAttendance();
  }, [user]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // Get ESDE courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .ilike('title', '%ESDE%');

      if (!courses?.length) { setLoading(false); return; }

      const courseIds = courses.map((c) => c.id);

      // Get modules
      const { data: modules } = await supabase
        .from('modules')
        .select('id, title, course_id, order_index')
        .in('course_id', courseIds)
        .order('order_index');

      if (!modules?.length) { setLoading(false); return; }

      const moduleMap = Object.fromEntries(modules.map((m) => [m.id, m]));
      const moduleIds = modules.map((m) => m.id);

      // Get lessons
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title, order_index, module_id')
        .in('module_id', moduleIds)
        .order('order_index');

      if (!lessons?.length) { setLoading(false); return; }

      // Get user's attendance
      const { data: records } = await supabase
        .from('attendance_records')
        .select('lesson_id, confirmed_at')
        .eq('user_id', user!.id);

      const recordMap = Object.fromEntries((records || []).map((r) => [r.lesson_id, r.confirmed_at]));

      const result: LessonAttendance[] = lessons.map((l) => ({
        lesson_id: l.id,
        lesson_title: l.title,
        lesson_order: l.order_index,
        module_title: moduleMap[l.module_id]?.title || '',
        confirmed_at: recordMap[l.id] || null,
      }));

      setData(result);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const totalLessons = data.length;
  const attended = data.filter((d) => d.confirmed_at).length;
  const percentage = totalLessons > 0 ? Math.round((attended / totalLessons) * 100) : 0;

  return (
    <DashboardLayout>
      <CabecalhoPagina titulo="Minha Frequência" descricao="Acompanhe sua presença nas aulas do ESDE" />
      <div className="space-y-6">

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                  <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalLessons}</p>
                    <p className="text-xs text-muted-foreground">Aulas realizadas</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                  <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{attended}</p>
                    <p className="text-xs text-muted-foreground">Minhas presenças</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                  <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Percent className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{percentage}%</p>
                    <p className="text-xs text-muted-foreground">Meu percentual</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lesson list */}
            <div className="space-y-2">
              {data.map((item) => (
                <div
                  key={item.lesson_id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card"
                >
                  {item.confirmed_at ? (
                    <CheckCircle className="h-5 w-5 text-emerald-700 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      <span className="text-muted-foreground mr-1.5">{item.lesson_order}.</span>
                      {item.lesson_title}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.module_title}</p>
                  </div>
                  {item.confirmed_at && (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs flex-shrink-0">
                      Presente
                    </Badge>
                  )}
                </div>
              ))}

              {data.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhuma aula encontrada no ESDE.
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
