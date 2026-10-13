import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Clock, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Enrollment {
  id: string;
  status: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
  };
}

export default function EnrollmentsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchEnrollments();
  }, [isAdmin, navigate]);

  const fetchEnrollments = async () => {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        status,
        created_at,
        user:profiles!enrollments_user_id_fkey (
          id,
          full_name,
          email
        ),
        course:courses (
          id,
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEnrollments(data as any);
    }
    setLoading(false);
  };

  const updateEnrollmentStatus = async (enrollmentId: string, newStatus: 'approved' | 'rejected') => {
    const enrollment = enrollments.find(e => e.id === enrollmentId);
    
    const { error } = await supabase
      .from('enrollments')
      .update({ status: newStatus })
      .eq('id', enrollmentId);

    if (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setEnrollments(
        enrollments.map((e) =>
          e.id === enrollmentId ? { ...e, status: newStatus } : e
        )
      );
      toast({
        title: newStatus === 'approved' ? 'Inscrição aprovada!' : 'Inscrição rejeitada',
      });

      // Send email notification for approved enrollments
      if (newStatus === 'approved' && enrollment) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'enrollment_approved',
              user_email: enrollment.user.email,
              user_name: enrollment.user.full_name,
              course_title: enrollment.course.title,
            },
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }
    }
  };

  const filteredEnrollments = enrollments.filter((e) => {
    if (activeTab === 'pending') return e.status === 'pending';
    if (activeTab === 'approved') return e.status === 'approved';
    if (activeTab === 'rejected') return e.status === 'rejected';
    return true;
  });

  const pendingCount = enrollments.filter((e) => e.status === 'pending').length;
  const approvedCount = enrollments.filter((e) => e.status === 'approved').length;
  const rejectedCount = enrollments.filter((e) => e.status === 'rejected').length;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 md:p-7 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">Inscrições</h1>
          <p className="text-muted-foreground mt-1">Gerencie as solicitações de inscrição</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto">
            <TabsList className="w-auto">
              <TabsTrigger value="pending" className="gap-1.5 text-xs sm:text-sm">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Pendentes</span>
                <span className="sm:hidden">Pend.</span>
                {pendingCount > 0 && (
                  <Badge className="ml-1 bg-warning text-warning-foreground text-[10px] px-1.5">{pendingCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-1.5 text-xs sm:text-sm">
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Aprovadas</span>
                <span className="sm:hidden">Aprov.</span>
                <span className="text-[10px]">({approvedCount})</span>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-1.5 text-xs sm:text-sm">
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Rejeitadas</span>
                <span className="sm:hidden">Rej.</span>
                <span className="text-[10px]">({rejectedCount})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredEnrollments.length === 0 ? (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-12 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma inscrição encontrada</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredEnrollments.map((enrollment) => (
                  <Card key={enrollment.id} className="bg-card/50 border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-medium truncate">{enrollment.user.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{enrollment.user.email}</p>
                          <p className="text-sm text-muted-foreground">{enrollment.course.title}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(enrollment.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                            <Badge
                              className={
                                enrollment.status === 'approved'
                                  ? 'bg-success/20 text-success'
                                  : enrollment.status === 'pending'
                                  ? 'bg-warning/20 text-warning'
                                  : 'bg-destructive/20 text-destructive'
                              }
                            >
                              {enrollment.status === 'approved'
                                ? 'Aprovada'
                                : enrollment.status === 'pending'
                                ? 'Pendente'
                                : 'Rejeitada'}
                            </Badge>
                          </div>
                        </div>
                        {activeTab === 'pending' && (
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90"
                              onClick={() => updateEnrollmentStatus(enrollment.id, 'approved')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateEnrollmentStatus(enrollment.id, 'rejected')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
