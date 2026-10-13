import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHero } from '@/components/layout/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, ClipboardCheck, FileText, Archive, Pencil, Eye, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Assessment {
  id: string;
  title: string;
  status: string;
  passing_score: number;
  created_at: string;
  course: { id: string; title: string };
  questions_count: number;
  attempts_count: number;
}

export default function AssessmentsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isAdmin) fetchAssessments();
  }, [isAdmin]);

  const fetchAssessments = async () => {
    const { data } = await supabase
      .from('assessments')
      .select('id, title, status, passing_score, created_at, course_id, courses(id, title)')
      .order('created_at', { ascending: false });

    if (data) {
      const withCounts = await Promise.all(
        data.map(async (a: any) => {
          const [qRes, attRes] = await Promise.all([
            supabase.from('assessment_questions').select('id', { count: 'exact', head: true }).eq('assessment_id', a.id),
            supabase.from('assessment_attempts').select('id', { count: 'exact', head: true }).eq('assessment_id', a.id),
          ]);
          return {
            id: a.id,
            title: a.title,
            status: a.status,
            passing_score: a.passing_score,
            created_at: a.created_at,
            course: a.courses,
            questions_count: qRes.count || 0,
            attempts_count: attRes.count || 0,
          };
        })
      );
      setAssessments(withCounts);
    }
    setLoading(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'published': return <Badge className="bg-green-100 text-green-700 border-green-200">Publicada</Badge>;
      case 'draft': return <Badge variant="secondary">Rascunho</Badge>;
      case 'archived': return <Badge variant="outline" className="text-muted-foreground">Arquivada</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const filtered = assessments.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.course?.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHero title="Avaliações" description="Gerencie as avaliações dos cursos" />
        <div className="px-4 sm:px-6 space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => navigate('/admin/assessments/new')} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Avaliação
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou curso..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação encontrada</h3>
              <p className="text-muted-foreground mb-4">Crie sua primeira avaliação para começar.</p>
              <Button onClick={() => navigate('/admin/assessments/new')} className="gap-2">
                <Plus className="h-4 w-4" /> Nova Avaliação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => (
              <Card key={a.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{a.title}</h3>
                        {statusBadge(a.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {a.course?.title} · {a.questions_count} questões · {a.attempts_count} tentativas · Nota mín. {a.passing_score}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Criada em {format(new Date(a.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {a.attempts_count > 0 && (
                        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/assessments/${a.id}/results`)}>
                          <BarChart3 className="h-4 w-4 mr-1" /> Resultados
                        </Button>
                      )}
                      {a.status !== 'archived' && (
                        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/assessments/${a.id}`)}>
                          <Pencil className="h-4 w-4 mr-1" /> Editar
                        </Button>
                      )}
                      {a.status === 'published' && (
                        <Button variant="outline" size="sm" className="text-muted-foreground" onClick={async () => {
                          await supabase.from('assessments').update({ status: 'archived' as any }).eq('id', a.id);
                          fetchAssessments();
                        }}>
                          <Archive className="h-4 w-4 mr-1" /> Arquivar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
