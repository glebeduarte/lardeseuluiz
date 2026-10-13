import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { PageHero } from '@/components/layout/PageHero';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, ChevronDown, ChevronRight, Sparkles, Loader2, RefreshCw, AlertCircle, GripVertical, Lock } from 'lucide-react';

interface Course { id: string; title: string; }
interface Module { id: string; title: string; order_index: number; lessons: Lesson[]; }
interface Lesson { id: string; title: string; order_index: number; }

type QuestionType = 'multiple_choice' | 'true_false' | 'multiple_answer' | 'ordering' | 'fill_blank' | 'essay';

interface QuestionForm {
  id?: string;
  question_type: QuestionType;
  statement: string;
  alternatives: { id: string; text: string }[];
  correct_answer: string;
  explanation: string;
  ai_generated: boolean;
  needs_review: boolean;
}

const STEPS = ['Curso', 'Escopo', 'Configuração', 'Conteúdo IA', 'Questões', 'Posição'];

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Múltipla Escolha',
  true_false: 'Verdadeiro ou Falso',
  multiple_answer: 'Múltipla Resposta',
  ordering: 'Ordenação',
  fill_blank: 'Preencher Lacuna',
  essay: 'Dissertativa',
};

export default function AssessmentWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isEdit = !!id;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hasAttempts, setHasAttempts] = useState(false);

  // Step 1 - Course
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  // Step 2 - Scope
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<string>>(new Set());
  const [expandedMods, setExpandedMods] = useState<Set<string>>(new Set());

  // Step 3 - Config
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAlternatives, setShuffleAlternatives] = useState(true);
  const [showAnswersAfter, setShowAnswersAfter] = useState<'always' | 'never' | 'on_pass'>('on_pass');

  // Step 4 - AI Content
  const [aiContentText, setAiContentText] = useState('');
  const [aiQuantity, setAiQuantity] = useState(10);
  const [aiQuestionTypes, setAiQuestionTypes] = useState<('multiple_choice' | 'true_false')[]>(['multiple_choice', 'true_false']);
  const [generating, setGenerating] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Step 5 - Questions (manual + AI)
  const [questions, setQuestions] = useState<QuestionForm[]>([]);

  // Step 6 - Position
  const [positionType, setPositionType] = useState<'after_module' | 'before_module' | 'end_of_course' | 'between_lessons'>('end_of_course');
  const [positionModuleId, setPositionModuleId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
    if (isEdit) loadAssessment();
  }, []);

  useEffect(() => {
    if (selectedCourseId) fetchModules(selectedCourseId);
  }, [selectedCourseId]);

  // RN03: check if there are attempts
  useEffect(() => {
    if (isEdit && id) {
      supabase.from('assessment_attempts').select('id', { count: 'exact', head: true }).eq('assessment_id', id)
        .then(({ count }) => setHasAttempts((count || 0) > 0));
    }
  }, [isEdit, id]);

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').order('title');
    if (data) setCourses(data);
  };

  const fetchModules = async (courseId: string) => {
    const { data } = await supabase
      .from('modules')
      .select('id, title, order_index, lessons(id, title, order_index)')
      .eq('course_id', courseId)
      .order('order_index');
    if (data) {
      const sorted = data.map(m => ({
        ...m,
        lessons: (m.lessons || []).sort((a: any, b: any) => a.order_index - b.order_index)
      }));
      setModules(sorted);
      setExpandedMods(new Set(sorted.map(m => m.id)));
    }
  };

  const loadAssessment = async () => {
    const { data: a } = await supabase.from('assessments').select('*').eq('id', id).single();
    if (!a) return;

    setSelectedCourseId(a.course_id);
    setTitle(a.title);
    setDescription(a.description || '');
    setPassingScore(a.passing_score);
    setMaxAttempts(a.max_attempts);
    setTimeLimitMinutes(a.time_limit_minutes);
    setShuffleQuestions(a.shuffle_questions);
    setShuffleAlternatives(a.shuffle_alternatives);
    setShowAnswersAfter(a.show_answers_after);
    setPositionType(a.position_type);
    setPositionModuleId(a.position_module_id);

    const { data: qs } = await supabase.from('assessment_questions').select('*').eq('assessment_id', id!).order('order_index');
    if (qs) {
      setQuestions(qs.map((q: any) => ({
        id: q.id,
        question_type: q.question_type,
        statement: q.statement,
        alternatives: q.alternatives || [],
        correct_answer: q.correct_answer || '',
        explanation: q.explanation || '',
        ai_generated: q.ai_generated,
        needs_review: q.needs_review,
      })));
    }

    const { data: sources } = await supabase.from('assessment_content_sources').select('lesson_id, content_text').eq('assessment_id', id!);
    if (sources) {
      setSelectedLessonIds(new Set(sources.filter((s: any) => s.lesson_id).map((s: any) => s.lesson_id)));
      const textSource = sources.find((s: any) => s.content_text);
      if (textSource) setAiContentText(textSource.content_text || '');
    }
  };

  const toggleModule = (modId: string) => {
    setExpandedMods(prev => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId); else next.add(modId);
      return next;
    });
  };

  const toggleModuleLessons = (mod: Module) => {
    const allSelected = mod.lessons.every(l => selectedLessonIds.has(l.id));
    const next = new Set(selectedLessonIds);
    mod.lessons.forEach(l => { if (allSelected) next.delete(l.id); else next.add(l.id); });
    setSelectedLessonIds(next);
  };

  const toggleLesson = (lessonId: string) => {
    const next = new Set(selectedLessonIds);
    if (next.has(lessonId)) next.delete(lessonId); else next.add(lessonId);
    setSelectedLessonIds(next);
  };

  const createDefaultAlternatives = (type: QuestionType): { id: string; text: string }[] => {
    switch (type) {
      case 'multiple_choice':
        return [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }];
      case 'true_false':
        return [{ id: 'v', text: 'Verdadeiro' }, { id: 'f', text: 'Falso' }];
      case 'multiple_answer':
        return [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }];
      case 'ordering':
        return [{ id: '1', text: '' }, { id: '2', text: '' }, { id: '3', text: '' }, { id: '4', text: '' }];
      case 'fill_blank':
      case 'essay':
        return [];
      default:
        return [];
    }
  };

  const addQuestion = (type: QuestionType) => {
    if (hasAttempts) {
      toast({ title: 'Edição bloqueada', description: 'Não é possível adicionar questões pois já existem tentativas registradas.', variant: 'destructive' });
      return;
    }
    const newQ: QuestionForm = {
      question_type: type,
      statement: '',
      alternatives: createDefaultAlternatives(type),
      correct_answer: '',
      explanation: '',
      ai_generated: false,
      needs_review: false,
    };
    setQuestions(prev => [...prev, newQ]);
  };

  const updateQuestion = (index: number, updates: Partial<QuestionForm>) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  const removeQuestion = (index: number) => {
    if (hasAttempts) {
      toast({ title: 'Edição bloqueada', description: 'Não é possível remover questões pois já existem tentativas registradas.', variant: 'destructive' });
      return;
    }
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateAlternative = (qIndex: number, altId: string, text: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      return { ...q, alternatives: q.alternatives.map(a => a.id === altId ? { ...a, text } : a) };
    }));
  };

  const addAlternative = (qIndex: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const nextId = String.fromCharCode(97 + q.alternatives.length); // e, f, g...
      return { ...q, alternatives: [...q.alternatives, { id: nextId, text: '' }] };
    }));
  };

  const removeAlternative = (qIndex: number, altId: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      return { ...q, alternatives: q.alternatives.filter(a => a.id !== altId) };
    }));
  };

  // Ordering: move item up/down
  const moveOrderItem = (qIndex: number, altIndex: number, direction: 'up' | 'down') => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const alts = [...q.alternatives];
      const swapIdx = direction === 'up' ? altIndex - 1 : altIndex + 1;
      if (swapIdx < 0 || swapIdx >= alts.length) return q;
      [alts[altIndex], alts[swapIdx]] = [alts[swapIdx], alts[altIndex]];
      // correct_answer stores the correct order as comma-separated ids
      const correctOrder = alts.map((_, idx) => String(idx + 1)).join(',');
      return { ...q, alternatives: alts, correct_answer: correctOrder };
    }));
  };

  // Multiple answer: toggle correct answers (comma-separated)
  const toggleCorrectAnswer = (qIndex: number, altId: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const current = q.correct_answer ? q.correct_answer.split(',') : [];
      const next = current.includes(altId) ? current.filter(x => x !== altId) : [...current, altId];
      return { ...q, correct_answer: next.join(',') };
    }));
  };

  const callGenerateWithRetry = async (body: any, retries = 2): Promise<any> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const { data, error } = await supabase.functions.invoke('generate-questions', { body });
      if (error) {
        if (attempt < retries && (error.message?.includes('429') || error.message?.includes('timeout'))) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(error.message || 'Erro ao chamar função');
      }
      if (data?.error) {
        if (attempt < retries && data.error.includes('Limite')) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(data.error);
      }
      return data;
    }
  };

  const generateWithAI = async () => {
    if (selectedLessonIds.size === 0 && !aiContentText.trim()) {
      toast({ title: 'Sem conteúdo', description: 'Selecione aulas no escopo ou cole um texto para gerar questões.', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const data = await callGenerateWithRetry({
        lesson_ids: Array.from(selectedLessonIds),
        content_text: aiContentText || undefined,
        quantity: aiQuantity,
        question_types: aiQuestionTypes,
      });

      const generated: QuestionForm[] = (data.questions || []).map((q: any) => ({
        question_type: q.question_type,
        statement: q.statement,
        alternatives: q.alternatives,
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        ai_generated: true,
        needs_review: true,
      }));

      setQuestions(prev => [...prev, ...generated]);
      toast({ title: `${generated.length} questões geradas!`, description: 'Revise e edite as questões antes de publicar.' });
      setStep(4);
    } catch (err: any) {
      toast({ title: 'Erro na geração', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const regenerateQuestion = async (index: number) => {
    const q = questions[index];
    setRegeneratingIndex(index);
    try {
      const data = await callGenerateWithRetry({
        lesson_ids: Array.from(selectedLessonIds),
        content_text: aiContentText || undefined,
        quantity: 1,
        question_types: [q.question_type],
        exclude_statements: [q.statement],
      });

      const newQ = data.questions?.[0];
      if (newQ) {
        updateQuestion(index, {
          statement: newQ.statement,
          alternatives: newQ.alternatives,
          correct_answer: newQ.correct_answer,
          explanation: newQ.explanation || '',
          ai_generated: true,
          needs_review: true,
        });
        toast({ title: 'Questão regenerada!' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao regenerar', description: err.message, variant: 'destructive' });
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const markReviewed = (index: number) => {
    updateQuestion(index, { needs_review: false });
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!selectedCourseId;
      case 1: return selectedLessonIds.size > 0;
      case 2: return title.trim().length > 0;
      case 3: return true;
      case 4: return questions.length >= 3 && questions.every(q => {
        if (!q.statement.trim()) return false;
        if (q.question_type === 'essay') return true; // no correct_answer needed
        if (q.question_type === 'fill_blank') return !!q.correct_answer.trim();
        return !!q.correct_answer;
      });
      case 5: return true;
      default: return false;
    }
  };

  const saveAssessment = async (publish: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      const assessmentData = {
        course_id: selectedCourseId,
        title,
        description: description || null,
        status: (publish ? 'published' : 'draft') as 'published' | 'draft',
        position_type: positionType,
        position_module_id: positionType !== 'end_of_course' ? positionModuleId : null,
        requires_completion: true,
        passing_score: passingScore,
        max_attempts: maxAttempts,
        time_limit_minutes: timeLimitMinutes,
        shuffle_questions: shuffleQuestions,
        shuffle_alternatives: shuffleAlternatives,
        show_answers_after: showAnswersAfter,
        created_by: user.id,
      };

      let assessmentId = id;

      if (isEdit) {
        await supabase.from('assessments').update(assessmentData).eq('id', id!);
      } else {
        const { data, error } = await supabase.from('assessments').insert(assessmentData).select('id').single();
        if (error) throw error;
        assessmentId = data.id;
      }

      // Save questions (only if no attempts - RN03)
      if (!hasAttempts) {
        if (isEdit) {
          await supabase.from('assessment_questions').delete().eq('assessment_id', assessmentId!);
        }
        if (questions.length > 0) {
          await supabase.from('assessment_questions').insert(
            questions.map((q, i) => ({
              assessment_id: assessmentId!,
              question_type: q.question_type,
              statement: q.statement,
              alternatives: q.alternatives.length > 0 ? q.alternatives : null,
              correct_answer: q.correct_answer || null,
              explanation: q.explanation || null,
              order_index: i,
              ai_generated: q.ai_generated,
              needs_review: q.needs_review,
            }))
          );
        }
      }

      // Save content sources
      if (isEdit) {
        await supabase.from('assessment_content_sources').delete().eq('assessment_id', assessmentId!);
      }
      const sources: any[] = [];
      if (selectedLessonIds.size > 0) {
        Array.from(selectedLessonIds).forEach(lessonId => {
          sources.push({ assessment_id: assessmentId!, source_type: 'lesson_transcript', lesson_id: lessonId });
        });
      }
      if (aiContentText.trim()) {
        sources.push({ assessment_id: assessmentId!, source_type: 'manual_text', content_text: aiContentText });
      }
      if (sources.length > 0) {
        await supabase.from('assessment_content_sources').insert(sources);
      }

      toast({ title: publish ? 'Avaliação publicada!' : 'Rascunho salvo!' });
      navigate('/admin/assessments');
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const archiveAssessment = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await supabase.from('assessments').update({ status: 'archived' as any }).eq('id', id);
      toast({ title: 'Avaliação arquivada!' });
      navigate('/admin/assessments');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const needsReviewCount = questions.filter(q => q.needs_review).length;
  const aiCount = questions.filter(q => q.ai_generated).length;

  const renderQuestionEditor = (q: QuestionForm, qi: number) => {
    const isLocked = hasAttempts;

    return (
      <Card key={qi} className={q.needs_review ? 'border-amber-300 bg-amber-50/30' : ''}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">#{qi + 1}</span>
              <Badge variant="outline">{QUESTION_TYPE_LABELS[q.question_type]}</Badge>
              {q.ai_generated && (
                <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> IA</Badge>
              )}
              {q.needs_review && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
                  <AlertCircle className="h-3 w-3" /> Revisar
                </Badge>
              )}
              {isLocked && (
                <Badge variant="outline" className="text-muted-foreground gap-1"><Lock className="h-3 w-3" /> Bloqueada</Badge>
              )}
            </div>
            <div className="flex gap-1">
              {q.ai_generated && !isLocked && (
                <Button variant="outline" size="sm" className="gap-1" disabled={regeneratingIndex === qi} onClick={() => regenerateQuestion(qi)}>
                  {regeneratingIndex === qi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Regenerar
                </Button>
              )}
              {q.needs_review && (
                <Button variant="outline" size="sm" className="text-green-600 gap-1" onClick={() => markReviewed(qi)}>
                  <Check className="h-4 w-4" /> Aprovada
                </Button>
              )}
              {!isLocked && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeQuestion(qi)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Enunciado *</Label>
            <Textarea
              value={q.statement}
              onChange={e => updateQuestion(qi, { statement: e.target.value })}
              placeholder={q.question_type === 'fill_blank' ? 'Use ___ para indicar a lacuna. Ex: O fundador do Espiritismo foi ___.' : 'Digite o enunciado da questão...'}
              rows={2}
              disabled={isLocked}
            />
          </div>

          {/* Multiple Choice / True-False */}
          {(q.question_type === 'multiple_choice' || q.question_type === 'true_false') && (
            <div className="space-y-2">
              <Label>Alternativas (clique na correta)</Label>
              {q.alternatives.map(alt => (
                <div key={alt.id} className="flex items-center gap-2">
                  <button
                    onClick={() => !isLocked && updateQuestion(qi, { correct_answer: alt.id })}
                    disabled={isLocked}
                    className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                      q.correct_answer === alt.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {alt.id.toUpperCase()}
                  </button>
                  {q.question_type === 'multiple_choice' ? (
                    <Input value={alt.text} onChange={e => updateAlternative(qi, alt.id, e.target.value)} placeholder={`Alternativa ${alt.id.toUpperCase()}`} disabled={isLocked} />
                  ) : (
                    <span className="text-sm font-medium">{alt.text}</span>
                  )}
                </div>
              ))}
              {!q.correct_answer && <p className="text-xs text-destructive">Selecione a resposta correta.</p>}
            </div>
          )}

          {/* Multiple Answer */}
          {q.question_type === 'multiple_answer' && (
            <div className="space-y-2">
              <Label>Alternativas (marque todas as corretas)</Label>
              {q.alternatives.map(alt => {
                const isCorrect = q.correct_answer.split(',').includes(alt.id);
                return (
                  <div key={alt.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={isCorrect}
                      onCheckedChange={() => !isLocked && toggleCorrectAnswer(qi, alt.id)}
                      disabled={isLocked}
                    />
                    <Input value={alt.text} onChange={e => updateAlternative(qi, alt.id, e.target.value)} placeholder={`Alternativa ${alt.id.toUpperCase()}`} disabled={isLocked} />
                    {!isLocked && q.alternatives.length > 2 && (
                      <Button variant="ghost" size="sm" onClick={() => removeAlternative(qi, alt.id)} className="text-muted-foreground h-8 w-8 p-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
              {!isLocked && (
                <Button variant="outline" size="sm" onClick={() => addAlternative(qi)} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Adicionar alternativa
                </Button>
              )}
              {!q.correct_answer && <p className="text-xs text-destructive">Marque pelo menos uma resposta correta.</p>}
            </div>
          )}

          {/* Ordering */}
          {q.question_type === 'ordering' && (
            <div className="space-y-2">
              <Label>Itens na ordem correta (arraste ou use as setas)</Label>
              {q.alternatives.map((alt, altIdx) => (
                <div key={alt.id} className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button onClick={() => !isLocked && moveOrderItem(qi, altIdx, 'up')} disabled={altIdx === 0 || isLocked} className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5">
                      <ChevronRight className="h-3.5 w-3.5 -rotate-90" />
                    </button>
                    <button onClick={() => !isLocked && moveOrderItem(qi, altIdx, 'down')} disabled={altIdx === q.alternatives.length - 1 || isLocked} className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5">
                      <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                    </button>
                  </div>
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-bold text-muted-foreground w-5">{altIdx + 1}.</span>
                  <Input value={alt.text} onChange={e => updateAlternative(qi, alt.id, e.target.value)} placeholder={`Item ${altIdx + 1}`} disabled={isLocked} />
                  {!isLocked && q.alternatives.length > 2 && (
                    <Button variant="ghost" size="sm" onClick={() => removeAlternative(qi, alt.id)} className="text-muted-foreground h-8 w-8 p-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {!isLocked && (
                <Button variant="outline" size="sm" onClick={() => {
                  setQuestions(prev => prev.map((q2, i) => {
                    if (i !== qi) return q2;
                    const newId = String(q2.alternatives.length + 1);
                    const newAlts = [...q2.alternatives, { id: newId, text: '' }];
                    return { ...q2, alternatives: newAlts, correct_answer: newAlts.map((_, idx) => String(idx + 1)).join(',') };
                  }));
                }} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Adicionar item
                </Button>
              )}
              <p className="text-xs text-muted-foreground">A ordem definida aqui é a ordem correta. No quiz será embaralhada.</p>
            </div>
          )}

          {/* Fill in the blank */}
          {q.question_type === 'fill_blank' && (
            <div className="space-y-2">
              <Label>Resposta correta *</Label>
              <Input
                value={q.correct_answer}
                onChange={e => updateQuestion(qi, { correct_answer: e.target.value })}
                placeholder="Resposta esperada na lacuna..."
                disabled={isLocked}
              />
              <p className="text-xs text-muted-foreground">Use ___ no enunciado para indicar onde fica a lacuna.</p>
            </div>
          )}

          {/* Essay */}
          {q.question_type === 'essay' && (
            <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              Questão dissertativa — o aluno digitará uma resposta livre. A correção deve ser feita manualmente.
            </div>
          )}

          <div className="space-y-2">
            <Label>Explicação (opcional)</Label>
            <Input
              value={q.explanation}
              onChange={e => updateQuestion(qi, { explanation: e.target.value })}
              placeholder="Justificativa da resposta correta..."
              disabled={isLocked}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHero
          title={isEdit ? 'Editar Avaliação' : 'Nova Avaliação'}
          description={isEdit ? 'Edite as configurações e questões da avaliação' : 'Configure uma nova avaliação para o curso'}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/assessments')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          {hasAttempts && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
              <Lock className="h-3 w-3" /> Questões bloqueadas (há tentativas)
            </Badge>
          )}
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => i <= step && setStep(i)}
              disabled={i > step}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                i === step ? 'bg-primary text-primary-foreground' :
                i < step ? 'bg-primary/10 text-primary cursor-pointer' :
                'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : <span className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center text-xs">{i + 1}</span>}
              {s}
            </button>
          ))}
        </div>

        {/* Step 1: Course Selection */}
        {step === 0 && (
          <Card>
            <CardHeader><CardTitle>Selecionar Curso</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Escolha em qual curso esta avaliação será criada.</p>
              <div className="grid gap-2">
                {courses.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCourseId(c.id)}
                    className={`text-left p-4 rounded-xl border transition-colors ${
                      selectedCourseId === c.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <span className="font-medium">{c.title}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Scope */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Definir Escopo</CardTitle>
              <p className="text-sm text-muted-foreground">{selectedLessonIds.size} aula(s) selecionada(s)</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {modules.map(mod => {
                const allSelected = mod.lessons.every(l => selectedLessonIds.has(l.id));
                const someSelected = mod.lessons.some(l => selectedLessonIds.has(l.id));
                return (
                  <div key={mod.id} className="border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 p-3 bg-muted/30">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => toggleModuleLessons(mod)}
                        className={someSelected && !allSelected ? 'opacity-50' : ''}
                      />
                      <button onClick={() => toggleModule(mod.id)} className="flex items-center gap-2 flex-1 text-left">
                        {expandedMods.has(mod.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-medium text-sm">{mod.title}</span>
                        <span className="text-xs text-muted-foreground">{mod.lessons.length} aulas</span>
                      </button>
                    </div>
                    {expandedMods.has(mod.id) && (
                      <div className="border-t">
                        {mod.lessons.map(l => (
                          <label key={l.id} className="flex items-center gap-3 px-6 py-2 hover:bg-muted/20 cursor-pointer">
                            <Checkbox checked={selectedLessonIds.has(l.id)} onCheckedChange={() => toggleLesson(l.id)} />
                            <span className="text-sm">{l.title}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Configuration */}
        {step === 2 && (
          <Card>
            <CardHeader><CardTitle>Configurar Avaliação</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Nome da Avaliação *</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Avaliação do Módulo 1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição / Instruções (opcional)</Label>
                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Instruções para o aluno..." rows={3} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nota mínima de aprovação (%)</Label>
                  <Input type="number" min={0} max={100} value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Limite de tentativas (vazio = ilimitado)</Label>
                  <Input type="number" min={1} value={maxAttempts ?? ''} onChange={e => setMaxAttempts(e.target.value ? Number(e.target.value) : null)} placeholder="Ilimitado" />
                </div>
                <div className="space-y-2">
                  <Label>Tempo limite em minutos (vazio = sem limite)</Label>
                  <Input type="number" min={1} value={timeLimitMinutes ?? ''} onChange={e => setTimeLimitMinutes(e.target.value ? Number(e.target.value) : null)} placeholder="Sem limite" />
                </div>
                <div className="space-y-2">
                  <Label>Mostrar gabarito</Label>
                  <Select value={showAnswersAfter} onValueChange={(v) => setShowAnswersAfter(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">Sempre</SelectItem>
                      <SelectItem value="on_pass">Somente aprovados</SelectItem>
                      <SelectItem value="never">Nunca</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>Embaralhar questões</Label>
                  <Switch checked={shuffleQuestions} onCheckedChange={setShuffleQuestions} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Embaralhar alternativas</Label>
                  <Switch checked={shuffleAlternatives} onCheckedChange={setShuffleAlternatives} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: AI Content Sources */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Gerar Questões com IA
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Use inteligência artificial para gerar questões automaticamente com base no conteúdo das aulas selecionadas ou em um texto adicional.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Aulas selecionadas no escopo</Label>
                  {selectedLessonIds.size > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {modules.flatMap(m => m.lessons).filter(l => selectedLessonIds.has(l.id)).map(l => (
                        <Badge key={l.id} variant="secondary" className="text-xs">{l.title}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma aula selecionada. Volte ao passo 2 para selecionar.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aiContent">Texto adicional (opcional)</Label>
                  <p className="text-xs text-muted-foreground">Cole aqui conteúdo extra que a IA deve considerar ao gerar questões.</p>
                  <Textarea id="aiContent" value={aiContentText} onChange={e => setAiContentText(e.target.value)} placeholder="Cole aqui trechos de apostilas, resumos ou qualquer conteúdo relevante..." rows={6} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade de questões</Label>
                    <Input type="number" min={3} max={30} value={aiQuantity} onChange={e => setAiQuantity(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipos de questão</Label>
                    <div className="flex flex-col gap-2 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={aiQuestionTypes.includes('multiple_choice')} onCheckedChange={(checked) => {
                          if (checked) setAiQuestionTypes(prev => [...prev, 'multiple_choice']);
                          else setAiQuestionTypes(prev => prev.filter(t => t !== 'multiple_choice'));
                        }} />
                        <span className="text-sm">Múltipla Escolha</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={aiQuestionTypes.includes('true_false')} onCheckedChange={(checked) => {
                          if (checked) setAiQuestionTypes(prev => [...prev, 'true_false']);
                          else setAiQuestionTypes(prev => prev.filter(t => t !== 'true_false'));
                        }} />
                        <span className="text-sm">Verdadeiro ou Falso</span>
                      </label>
                    </div>
                  </div>
                </div>

                <Button onClick={generateWithAI} disabled={generating || aiQuestionTypes.length === 0 || (selectedLessonIds.size === 0 && !aiContentText.trim())} className="w-full gap-2" size="lg">
                  {generating ? (<><Loader2 className="h-4 w-4 animate-spin" /> Gerando questões...</>) : (<><Sparkles className="h-4 w-4" /> Gerar {aiQuantity} Questões com IA</>)}
                </Button>

                {questions.filter(q => q.ai_generated).length > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{aiCount} questões geradas pela IA</p>
                      {needsReviewCount > 0 && <p className="text-xs text-muted-foreground">{needsReviewCount} pendentes de revisão</p>}
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto" onClick={() => setStep(4)}>Revisar Questões</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Questions */}
        {step === 4 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Questões ({questions.length})</CardTitle>
                    {needsReviewCount > 0 && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-sm text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {needsReviewCount} questão(ões) pendente(s) de revisão
                        </p>
                        <Button variant="outline" size="sm" className="text-green-600 gap-1" onClick={() => {
                          setQuestions(prev => prev.map(q => ({ ...q, needs_review: false })));
                        }}>
                          <Check className="h-4 w-4" /> Aprovar Todas
                        </Button>
                      </div>
                    )}
                    {hasAttempts && (
                      <p className="text-sm text-amber-600 flex items-center gap-1 mt-1">
                        <Lock className="h-4 w-4" />
                        Questões bloqueadas — já existem tentativas registradas
                      </p>
                    )}
                  </div>
                  {!hasAttempts && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => addQuestion('multiple_choice')}><Plus className="h-4 w-4 mr-1" /> Múltipla Escolha</Button>
                      <Button size="sm" variant="outline" onClick={() => addQuestion('true_false')}><Plus className="h-4 w-4 mr-1" /> V ou F</Button>
                      <Button size="sm" variant="outline" onClick={() => addQuestion('multiple_answer')}><Plus className="h-4 w-4 mr-1" /> Múltipla Resposta</Button>
                      <Button size="sm" variant="outline" onClick={() => addQuestion('ordering')}><Plus className="h-4 w-4 mr-1" /> Ordenação</Button>
                      <Button size="sm" variant="outline" onClick={() => addQuestion('fill_blank')}><Plus className="h-4 w-4 mr-1" /> Lacuna</Button>
                      <Button size="sm" variant="outline" onClick={() => addQuestion('essay')}><Plus className="h-4 w-4 mr-1" /> Dissertativa</Button>
                      <Button size="sm" variant="secondary" onClick={() => setStep(3)} className="gap-1"><Sparkles className="h-4 w-4" /> Gerar mais com IA</Button>
                    </div>
                  )}
                </div>
                {questions.length < 3 && <p className="text-sm text-destructive">Mínimo de 3 questões para publicar.</p>}
              </CardHeader>
            </Card>

            {questions.map((q, qi) => renderQuestionEditor(q, qi))}
          </div>
        )}

        {/* Step 6: Position */}
        {step === 5 && (
          <Card>
            <CardHeader><CardTitle>Posicionamento no Curso</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Onde a avaliação aparecerá?</Label>
                <Select value={positionType} onValueChange={(v) => setPositionType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="end_of_course">Final do curso</SelectItem>
                    <SelectItem value="after_module">Após um módulo</SelectItem>
                    <SelectItem value="before_module">Antes de um módulo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {positionType !== 'end_of_course' && (
                <div className="space-y-2">
                  <Label>Selecionar módulo</Label>
                  <Select value={positionModuleId || ''} onValueChange={setPositionModuleId}>
                    <SelectTrigger><SelectValue placeholder="Selecione um módulo" /></SelectTrigger>
                    <SelectContent>
                      {modules.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="mt-4 space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Pré-visualização</Label>
                {modules.map(mod => (
                  <div key={mod.id}>
                    {positionType === 'before_module' && positionModuleId === mod.id && (
                      <div className="p-2 px-4 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium text-primary my-1">📝 {title || 'Avaliação'}</div>
                    )}
                    <div className="p-2 px-4 rounded-lg bg-muted/30 text-sm">📚 {mod.title} ({mod.lessons.length} aulas)</div>
                    {positionType === 'after_module' && positionModuleId === mod.id && (
                      <div className="p-2 px-4 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium text-primary my-1">📝 {title || 'Avaliação'}</div>
                    )}
                  </div>
                ))}
                {positionType === 'end_of_course' && (
                  <div className="p-2 px-4 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium text-primary">📝 {title || 'Avaliação'}</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : navigate('/admin/assessments')} disabled={saving}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {step === 0 ? 'Cancelar' : 'Anterior'}
          </Button>

          <div className="flex items-center gap-2">
            {step === STEPS.length - 1 ? (
              <>
                {needsReviewCount > 0 && <span className="text-xs text-amber-600 mr-2">{needsReviewCount} questão(ões) pendente(s) de revisão</span>}
                {isEdit && (
                  <Button variant="outline" onClick={archiveAssessment} disabled={saving} className="text-muted-foreground">
                    Arquivar
                  </Button>
                )}
                <Button variant="outline" onClick={() => saveAssessment(false)} disabled={saving}>Salvar Rascunho</Button>
                <Button onClick={() => saveAssessment(true)} disabled={saving || questions.length < 3 || needsReviewCount > 0}>Publicar Avaliação</Button>
              </>
            ) : (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                {step === 3 ? 'Pular / Próximo' : 'Próximo'} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
