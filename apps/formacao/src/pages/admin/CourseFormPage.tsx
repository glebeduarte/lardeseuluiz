import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CabecalhoPagina } from '@/compartilhado';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUpload } from '@/components/ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2, Plus, X, Users } from 'lucide-react';
import { z } from 'zod';
import { Switch } from '@/components/ui/switch';

interface ClassGroup {
  id: string;
  name: string;
  vacancy_type: string;
  max_students: number | null;
  course_id: string;
}

const courseSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  status: z.enum(['draft', 'published']),
  category: z.enum(['formacoes', 'cursos_extras', 'materiais']),
  audience: z.enum(['trabalhadores', 'frequentadores', 'ambos']),
});

export default function CourseFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: '',
    description: '',
    long_description: '',
    thumbnail_url: '',
    cover_url: '',
    status: 'draft' as 'draft' | 'published',
    category: 'cursos_extras' as 'formacoes' | 'cursos_extras' | 'materiais',
    audience: 'ambos' as 'trabalhadores' | 'frequentadores' | 'ambos',
    study_lines: [] as string[],
    enrollment_open: true,
    registration_page_enabled: false,
    learning_topics: [] as string[],
    start_date: '',
    end_date: '',
    schedule: '',
    facilitator: '',
    estimated_duration_minutes: '' as string | number,
    tagline: '',
    featured: false,
    featured_order: 0 as string | number,
    trailer_url: '',
  });

  const [newTopic, setNewTopic] = useState('');
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [savingTurma, setSavingTurma] = useState(false);

  const [audienceChecks, setAudienceChecks] = useState({
    trabalhadores: true,
    frequentadores: true,
  });

  const [studyLineChecks, setStudyLineChecks] = useState({
    espirita: false,
    umbanda: false,
    espiritualista: false,
  });

  const isEditing = !!id;

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    if (isEditing) { fetchCourse(); fetchClassGroups(); }
  }, [isAdmin, id, navigate]);

  const fetchCourse = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast({ title: 'Erro ao carregar curso', description: 'Curso não encontrado', variant: 'destructive' });
      navigate('/admin/courses');
      return;
    }

    const audience = (data.audience as any) || 'ambos';
    const studyLines = (data.study_lines as string[]) || [];
    setForm({
      title: data.title,
      description: data.description || '',
      long_description: (data as any).long_description || '',
      thumbnail_url: data.thumbnail_url || '',
      cover_url: data.cover_url || '',
      status: data.status as any,
      category: (data.category as any) || 'cursos_extras',
      audience,
      study_lines: studyLines,
      enrollment_open: data.enrollment_open !== false,
      registration_page_enabled: (data as any).registration_page_enabled || false,
      learning_topics: (data as any).learning_topics || [],
      start_date: (data as any).start_date || '',
      end_date: (data as any).end_date || '',
      schedule: (data as any).schedule || '',
      facilitator: (data as any).facilitator || '',
      estimated_duration_minutes: (data as any).estimated_duration_minutes || '',
      tagline: (data as any).tagline || '',
      featured: !!(data as any).featured,
      featured_order: (data as any).featured_order ?? 0,
      trailer_url: (data as any).trailer_url || '',
    });
    setAudienceChecks({
      trabalhadores: audience === 'trabalhadores' || audience === 'ambos',
      frequentadores: audience === 'frequentadores' || audience === 'ambos',
    });
    setStudyLineChecks({
      espirita: studyLines.includes('espirita'),
      umbanda: studyLines.includes('umbanda'),
      espiritualista: studyLines.includes('espiritualista'),
    });
    setLoading(false);
  };

  const fetchClassGroups = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('class_groups')
      .select('*')
      .eq('course_id', id)
      .order('created_at');
    setClassGroups((data as unknown as ClassGroup[]) || []);
  };

  const updateClassGroup = async (cg: ClassGroup, updates: Partial<ClassGroup>) => {
    setSavingTurma(true);
    const { error } = await supabase
      .from('class_groups')
      .update(updates)
      .eq('id', cg.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setClassGroups(classGroups.map(g => g.id === cg.id ? { ...g, ...updates } : g));
      toast({ title: 'Turma atualizada!' });
    }
    setSavingTurma(false);
  };

  const handleAudienceChange = (type: 'trabalhadores' | 'frequentadores', checked: boolean) => {
    const newChecks = { ...audienceChecks, [type]: checked };
    if (!newChecks.trabalhadores && !newChecks.frequentadores) return;
    setAudienceChecks(newChecks);
    let audience: 'trabalhadores' | 'frequentadores' | 'ambos';
    if (newChecks.trabalhadores && newChecks.frequentadores) audience = 'ambos';
    else if (newChecks.trabalhadores) audience = 'trabalhadores';
    else audience = 'frequentadores';
    setForm({ ...form, audience });
  };

  const handleStudyLineChange = (line: 'espirita' | 'umbanda' | 'espiritualista', checked: boolean) => {
    const newChecks = { ...studyLineChecks, [line]: checked };
    setStudyLineChecks(newChecks);
    const newStudyLines: string[] = [];
    if (newChecks.espirita) newStudyLines.push('espirita');
    if (newChecks.umbanda) newStudyLines.push('umbanda');
    if (newChecks.espiritualista) newStudyLines.push('espiritualista');
    setForm({ ...form, study_lines: newStudyLines });
  };

  const addTopic = () => {
    if (newTopic.trim() && form.learning_topics.length < 8) {
      setForm({ ...form, learning_topics: [...form.learning_topics, newTopic.trim()] });
      setNewTopic('');
    }
  };

  const removeTopic = (index: number) => {
    setForm({ ...form, learning_topics: form.learning_topics.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!audienceChecks.trabalhadores && !audienceChecks.frequentadores) {
      setErrors({ audience: 'Selecione pelo menos um público destinado' });
      return;
    }

    const result = courseSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);

    const courseData: any = {
      title: form.title,
      description: form.description || null,
      long_description: form.long_description || null,
      thumbnail_url: form.thumbnail_url || null,
      cover_url: form.cover_url || null,
      status: form.status,
      category: form.category,
      audience: form.audience,
      study_lines: form.study_lines,
      enrollment_open: form.enrollment_open,
      registration_page_enabled: form.registration_page_enabled,
      learning_topics: form.learning_topics,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      schedule: form.schedule || null,
      facilitator: form.facilitator || null,
      estimated_duration_minutes: form.estimated_duration_minutes ? Number(form.estimated_duration_minutes) : null,
      tagline: form.tagline.trim() || null,
      featured: form.featured,
      featured_order: Number(form.featured_order) || 0,
      trailer_url: form.trailer_url.trim() || null,
    };

    let error;

    if (isEditing) {
      const res = await supabase.from('courses').update(courseData).eq('id', id);
      error = res.error;
    } else {
      const res = await supabase.from('courses').insert(courseData).select().single();
      error = res.error;
      if (!error && res.data) {
        // Auto-create default "Turma 1"
        await supabase.from('class_groups').insert({ course_id: res.data.id, name: 'Turma 1' });
        navigate(`/admin/courses/${res.data.id}/content`);
        toast({ title: 'Curso criado com sucesso! Agora adicione o conteúdo.' });
        return;
      }
    }

    setSaving(false);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Curso ${isEditing ? 'atualizado' : 'criado'} com sucesso!` });
      if (isEditing) navigate('/admin/courses');
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
        titulo={isEditing ? 'Editar Curso' : 'Novo Curso'}
        descricao={isEditing ? 'Atualize as informações do curso' : 'Preencha os dados do novo curso'}
        acoes={
          <Button variant="outline" onClick={() => navigate('/admin/courses')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        }
      />
      <div className="max-w-4xl space-y-6">

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader><CardTitle className="font-['Playfair_Display'] text-lg">Informações Básicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Curso *</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: ESDE I" className={errors.title ? 'border-destructive' : ''} />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição Curta</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Breve descrição do curso..." rows={3} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="long_description">Descrição Longa (Sobre o Curso)</Label>
                <p className="text-sm text-muted-foreground">Texto detalhado exibido na página de apresentação do curso.</p>
                <Textarea id="long_description" value={form.long_description} onChange={(e) => setForm({ ...form, long_description: e.target.value })} placeholder="Descreva os objetivos, metodologia e o que o aluno pode esperar..." rows={6} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select value={form.category} onValueChange={(v: any) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formacoes">Formação</SelectItem>
                      <SelectItem value="cursos_extras">Curso Extra</SelectItem>
                      <SelectItem value="materiais">Material</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Liberado para Inscrição</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox id="enrollment_open" checked={form.enrollment_open} onCheckedChange={(c) => setForm({ ...form, enrollment_open: !!c })} />
                  <label htmlFor="enrollment_open" className="text-sm font-medium">Sim, permitir inscrições</label>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Página de Inscrição Pública</Label>
                <p className="text-sm text-muted-foreground">Cria uma página pública de inscrição com formulário de cadastro para este curso.</p>
                <div className="flex items-center space-x-2">
                  <Checkbox id="registration_page_enabled" checked={form.registration_page_enabled} onCheckedChange={(c) => setForm({ ...form, registration_page_enabled: !!c })} />
                  <label htmlFor="registration_page_enabled" className="text-sm font-medium">Habilitar página de inscrição</label>
                </div>
                {form.registration_page_enabled && isEditing && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="font-medium mb-1">Link da página de inscrição:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-background px-2 py-1 rounded break-all flex-1">
                        {window.location.origin}{import.meta.env.BASE_URL}inscricao/curso/{id}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}inscricao/curso/${id}`);
                          toast({ title: 'Link copiado!' });
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label>Público Destinado *</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="trabalhadores" checked={audienceChecks.trabalhadores} onCheckedChange={(c) => handleAudienceChange('trabalhadores', !!c)} />
                    <label htmlFor="trabalhadores" className="text-sm font-medium">Trabalhadores</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="frequentadores" checked={audienceChecks.frequentadores} onCheckedChange={(c) => handleAudienceChange('frequentadores', !!c)} />
                    <label htmlFor="frequentadores" className="text-sm font-medium">Frequentadores</label>
                  </div>
                </div>
                {errors.audience && <p className="text-sm text-destructive">{errors.audience}</p>}
              </div>

              <div className="space-y-3">
                <Label>Linha de Estudo</Label>
                <p className="text-sm text-muted-foreground">Selecione uma ou mais linhas (opcional)</p>
                <div className="flex flex-col gap-3">
                  {(['espirita', 'umbanda', 'espiritualista'] as const).map(line => (
                    <div key={line} className="flex items-center space-x-2">
                      <Checkbox id={line} checked={studyLineChecks[line]} onCheckedChange={(c) => handleStudyLineChange(line, !!c)} />
                      <label htmlFor={line} className="text-sm font-medium capitalize">{line === 'espirita' ? 'Espírita' : line === 'umbanda' ? 'Umbanda' : 'Espiritualista'}</label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning Topics */}
          <Card>
            <CardHeader><CardTitle className="font-['Playfair_Display'] text-lg">O que o aluno vai aprender</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Adicione até 8 tópicos de aprendizado (opcional).</p>
              {form.learning_topics.map((topic, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm flex-1">✓ {topic}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTopic(i)} className="h-6 w-6">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {form.learning_topics.length < 8 && (
                <div className="flex gap-2">
                  <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Ex: Fundamentos da Doutrina Espírita" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())} />
                  <Button type="button" variant="outline" size="icon" onClick={addTopic}><Plus className="h-4 w-4" /></Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course Info */}
          <Card>
            <CardHeader><CardTitle className="font-['Playfair_Display'] text-lg">Informações Adicionais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data de Início</Label>
                  <Input type="date" id="start_date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Data de Término</Label>
                  <Input type="date" id="end_date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule">Horário/Frequência</Label>
                <Input id="schedule" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Ex: Quintas-feiras, 19h30 às 21h" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facilitator">Facilitador</Label>
                <Input id="facilitator" value={form.facilitator} onChange={(e) => setForm({ ...form, facilitator: e.target.value })} placeholder="Ex: Secretaria de Formação" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duração estimada por aula (minutos)</Label>
                <Input type="number" id="duration" value={form.estimated_duration_minutes} onChange={(e) => setForm({ ...form, estimated_duration_minutes: e.target.value })} placeholder="Ex: 45" />
              </div>
            </CardContent>
          </Card>

          {/* Vitrine do aluno */}
          <Card>
            <CardHeader><CardTitle className="font-['Playfair_Display'] text-lg">Vitrine do aluno</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Como o curso aparece no Início do aluno, no estilo de uma plataforma de vídeos.</p>
              <div className="space-y-2">
                <Label htmlFor="tagline">Frase da vitrine</Label>
                <Input id="tagline" maxLength={120} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Ex: Estude a Doutrina Espírita do começo, com a turma de quinta" />
                <p className="text-xs text-muted-foreground">Até 120 caracteres. Aparece no destaque do topo e no cartão do curso.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trailer_url">Vídeo de apresentação (YouTube ou Google Drive)</Label>
                <Input id="trailer_url" value={form.trailer_url} onChange={(e) => setForm({ ...form, trailer_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
                <p className="text-xs text-muted-foreground">Opcional. Abre no botão "Ver apresentação".</p>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="featured" checked={form.featured} onCheckedChange={(c) => setForm({ ...form, featured: !!c })} />
                  <label htmlFor="featured" className="text-sm font-medium">Mostrar nos destaques do topo</label>
                </div>
                {form.featured && (
                  <div className="space-y-2 w-32">
                    <Label htmlFor="featured_order">Ordem</Label>
                    <Input type="number" id="featured_order" min={0} value={form.featured_order} onChange={(e) => setForm({ ...form, featured_order: e.target.value })} />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">A capa de fundo (21:9) aparece grande no destaque. Sem ela, o Início usa a capa do cartão.</p>
            </CardContent>
          </Card>

          {/* Turmas */}
          {isEditing && classGroups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-['Playfair_Display'] text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Turmas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {classGroups.map((cg) => (
                  <div key={cg.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{cg.name}</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Label className="whitespace-nowrap">Vagas:</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Ilimitado</span>
                          <Switch
                            checked={cg.vacancy_type === 'limited'}
                            onCheckedChange={(checked) =>
                              updateClassGroup(cg, {
                                vacancy_type: checked ? 'limited' : 'unlimited',
                                max_students: checked ? (cg.max_students || 30) : null,
                              })
                            }
                            disabled={savingTurma}
                          />
                          <span className="text-sm text-muted-foreground">Limitado</span>
                        </div>
                      </div>
                      {cg.vacancy_type === 'limited' && (
                        <div className="flex items-center gap-3">
                          <Label htmlFor={`max-${cg.id}`} className="whitespace-nowrap">Máximo de alunos:</Label>
                          <Input
                            id={`max-${cg.id}`}
                            type="number"
                            min={1}
                            value={cg.max_students || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || null;
                              setClassGroups(classGroups.map(g => g.id === cg.id ? { ...g, max_students: val } : g));
                            }}
                            onBlur={() => updateClassGroup(cg, { max_students: cg.max_students })}
                            className="w-24"
                            disabled={savingTurma}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="font-['Playfair_Display'] text-lg">Imagens</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Thumbnail (Capa do Card)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Envie uma imagem em formato retrato (4:5). Tamanho recomendado: 800x1000px.
                </p>
                <ImageUpload value={form.thumbnail_url} onChange={(url) => setForm({ ...form, thumbnail_url: url })} bucket="course-assets" folder="thumbnails" />
              </div>
              <div className="space-y-2">
                <Label>Cover (Imagem de Fundo)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Imagem fullscreen exibida na página do curso. Proporção 21:9 recomendada.
                </p>
                <ImageUpload value={form.cover_url} onChange={(url) => setForm({ ...form, cover_url: url })} bucket="course-assets" folder="covers" aspectRatio="21:9" />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/courses')}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Curso'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
