import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { PageHero } from '@/components/layout/PageHero';
import { CabecalhoPagina } from '@/compartilhado';
import { ArrowLeft, Download, Search, Trophy, Target, Users, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AttemptRow {
  id: string;
  user_id: string;
  attempt_number: number;
  score: number | null;
  passed: boolean | null;
  submitted_at: string | null;
  time_spent_seconds: number | null;
  profile?: { full_name: string; email: string };
}

export default function AssessmentResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<any>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    const [aRes, attRes] = await Promise.all([
      supabase.from('assessments').select('*, courses(title)').eq('id', id!).single(),
      supabase.from('assessment_attempts').select('*').eq('assessment_id', id!).order('submitted_at', { ascending: false }),
    ]);

    if (aRes.data) setAssessment(aRes.data);

    if (attRes.data) {
      const userIds = [...new Set(attRes.data.map((a: any) => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      setAttempts(attRes.data.map((a: any) => ({
        ...a,
        profile: profileMap.get(a.user_id) || { full_name: 'Desconhecido', email: '' },
      })));
    }
    setLoading(false);
  };

  const completedAttempts = attempts.filter(a => a.submitted_at && a.score !== null);
  const uniqueStudents = new Set(completedAttempts.map(a => a.user_id)).size;
  const avgScore = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((s, a) => s + (a.score || 0), 0) / completedAttempts.length)
    : 0;
  const passedCount = completedAttempts.filter(a => a.passed).length;
  const passRate = completedAttempts.length > 0 ? Math.round((passedCount / completedAttempts.length) * 100) : 0;
  const avgTime = completedAttempts.filter(a => a.time_spent_seconds).length > 0
    ? Math.round(completedAttempts.filter(a => a.time_spent_seconds).reduce((s, a) => s + (a.time_spent_seconds || 0), 0) / completedAttempts.filter(a => a.time_spent_seconds).length / 60)
    : 0;

  // Score distribution for chart
  const scoreRanges = [
    { range: '0-20', min: 0, max: 20 },
    { range: '21-40', min: 21, max: 40 },
    { range: '41-60', min: 41, max: 60 },
    { range: '61-80', min: 61, max: 80 },
    { range: '81-100', min: 81, max: 100 },
  ];
  const scoreDistribution = scoreRanges.map(r => ({
    range: r.range,
    count: completedAttempts.filter(a => (a.score || 0) >= r.min && (a.score || 0) <= r.max).length,
  }));

  const pieData = [
    { name: 'Aprovados', value: passedCount, color: 'hsl(var(--primary))' },
    { name: 'Reprovados', value: completedAttempts.length - passedCount, color: 'hsl(var(--muted-foreground))' },
  ].filter(d => d.value > 0);

  // Best score per student
  const bestScores = new Map<string, AttemptRow>();
  completedAttempts.forEach(a => {
    const existing = bestScores.get(a.user_id);
    if (!existing || (a.score || 0) > (existing.score || 0)) {
      bestScores.set(a.user_id, a);
    }
  });

  const matchesSearch = (a: AttemptRow) =>
    (a.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.profile?.email?.toLowerCase().includes(search.toLowerCase())) ?? false;

  const matchesStatus = (a: AttemptRow) =>
    statusFilter === 'all' || (statusFilter === 'passed' ? !!a.passed : !a.passed);

  const filtered = [...bestScores.values()].filter(a => matchesSearch(a) && matchesStatus(a));
  const filteredAttempts = completedAttempts.filter(a => matchesSearch(a) && matchesStatus(a));

  const exportCSV = () => {
    const rows = [['Aluno', 'Email', 'Tentativa', 'Nota', 'Aprovado', 'Tempo (min)', 'Data']];
    completedAttempts.forEach(a => {
      rows.push([
        a.profile?.full_name || '',
        a.profile?.email || '',
        String(a.attempt_number),
        String(a.score || 0),
        a.passed ? 'Sim' : 'Não',
        a.time_spent_seconds ? String(Math.round(a.time_spent_seconds / 60)) : '',
        a.submitted_at ? format(new Date(a.submitted_at), 'dd/MM/yyyy HH:mm') : '',
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resultados-${assessment?.title || 'avaliacao'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}min ${s}s`;
  };

  if (loading) {
    return <DashboardLayout><div className="text-center py-8 text-muted-foreground">Carregando...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <CabecalhoPagina
        titulo={`Resultados: ${assessment?.title || ''}`}
        descricao={(assessment?.courses as any)?.title || 'Visualize os resultados da avaliação'}
        acoes={
          <>
            <Button variant="outline" onClick={() => navigate('/admin/assessments')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
          </>
        }
      />
      <div className="space-y-6">
        <div className="space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueStudents}</p>
                <p className="text-xs text-muted-foreground">Alunos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgScore}%</p>
                <p className="text-xs text-muted-foreground">Nota média</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{passRate}%</p>
                <p className="text-xs text-muted-foreground">Aprovação</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgTime}min</p>
                <p className="text-xs text-muted-foreground">Tempo médio</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {completedAttempts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="font-['Playfair_Display'] text-lg">Distribuição de Notas</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip />
                    <Bar dataKey="count" name="Alunos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-['Playfair_Display'] text-lg">Aprovação</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Student Results Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="font-['Playfair_Display'] text-lg">Resultados</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="passed">Aprovados</SelectItem>
                    <SelectItem value="failed">Reprovados</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar aluno..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="best">
              <TabsList className="mb-4">
                <TabsTrigger value="best">Por Aluno (melhor nota)</TabsTrigger>
                <TabsTrigger value="all">Todas as Tentativas ({filteredAttempts.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="best">
                {filtered.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Nenhuma tentativa encontrada.</p>
                ) : (
                  <div className="rounded-lg border bg-card overflow-x-auto">
                    <table className="w-full text-sm [&_th]:px-3 [&_td]:px-3 [&_th]:pt-3">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium text-muted-foreground">Aluno</th>
                          <th className="pb-2 font-medium text-muted-foreground">Melhor Nota</th>
                          <th className="pb-2 font-medium text-muted-foreground">Tentativas</th>
                          <th className="pb-2 font-medium text-muted-foreground">Status</th>
                          <th className="pb-2 font-medium text-muted-foreground">Tempo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(a => {
                          const studentAttempts = completedAttempts.filter(att => att.user_id === a.user_id);
                          return (
                            <tr key={a.user_id} className="border-b last:border-0">
                              <td className="py-3">
                                <p className="font-medium text-foreground">{a.profile?.full_name}</p>
                                <p className="text-xs text-muted-foreground">{a.profile?.email}</p>
                              </td>
                              <td className="py-3">
                                <span className="font-bold">{a.score}%</span>
                              </td>
                              <td className="py-3">{studentAttempts.length}</td>
                              <td className="py-3">
                                {a.passed ? (
                                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">Aprovado</Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">Reprovado</Badge>
                                )}
                              </td>
                              <td className="py-3 text-muted-foreground">
                                {a.time_spent_seconds ? formatTime(a.time_spent_seconds) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all">
                {filteredAttempts.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Nenhuma tentativa encontrada.</p>
                ) : (
                  <div className="rounded-lg border bg-card overflow-x-auto">
                    <table className="w-full text-sm [&_th]:px-3 [&_td]:px-3 [&_th]:pt-3">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium text-muted-foreground">Aluno</th>
                          <th className="pb-2 font-medium text-muted-foreground">Tentativa #</th>
                          <th className="pb-2 font-medium text-muted-foreground">Nota</th>
                          <th className="pb-2 font-medium text-muted-foreground">Status</th>
                          <th className="pb-2 font-medium text-muted-foreground">Tempo</th>
                          <th className="pb-2 font-medium text-muted-foreground">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...filteredAttempts]
                          .sort((x, y) => {
                            const nx = x.profile?.full_name || '';
                            const ny = y.profile?.full_name || '';
                            if (nx !== ny) return nx.localeCompare(ny, 'pt-BR');
                            return x.attempt_number - y.attempt_number;
                          })
                          .map((a, idx, arr) => {
                            const prev = arr[idx - 1];
                            const isFirstOfStudent = !prev || prev.user_id !== a.user_id;
                            const totalForStudent = arr.filter(x => x.user_id === a.user_id).length;
                            return (
                              <tr key={a.id} className={`border-b last:border-0 ${isFirstOfStudent ? 'border-t-2 border-t-muted' : ''}`}>
                                <td className="py-3">
                                  {isFirstOfStudent ? (
                                    <>
                                      <p className="font-medium text-foreground">{a.profile?.full_name}</p>
                                      <p className="text-xs text-muted-foreground">{a.profile?.email}</p>
                                    </>
                                  ) : (
                                    <span className="text-xs text-muted-foreground pl-3">↳</span>
                                  )}
                                </td>
                                <td className="py-3">
                                  <span className="font-medium">{a.attempt_number}</span>
                                  <span className="text-xs text-muted-foreground"> / {totalForStudent}</span>
                                </td>
                                <td className="py-3"><span className="font-bold">{a.score}%</span></td>
                                <td className="py-3">
                                  {a.passed ? (
                                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">Aprovado</Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-xs">Reprovado</Badge>
                                  )}
                                </td>
                                <td className="py-3 text-muted-foreground">
                                  {a.time_spent_seconds ? formatTime(a.time_spent_seconds) : '—'}
                                </td>
                                <td className="py-3 text-muted-foreground text-xs">
                                  {a.submitted_at ? format(new Date(a.submitted_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
