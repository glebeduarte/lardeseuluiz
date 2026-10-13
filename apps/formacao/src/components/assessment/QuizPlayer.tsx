import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, ArrowRight, Send, X, ChevronUp, ChevronDown } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Question {
  id: string;
  question_type: string;
  statement: string;
  alternatives: { id: string; text: string }[];
  correct_answer: string;
  order_index: number;
}

interface Props {
  assessmentId: string;
  attemptId: string;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  shuffleAlternatives: boolean;
  onComplete: (attemptId: string) => void;
  onCancel: () => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// For ordering questions, store the user's arrangement
type AnswerValue = string; // For most types, a string. For ordering, comma-separated ids.

export function QuizPlayer({ assessmentId, attemptId, timeLimitMinutes, shuffleQuestions, shuffleAlternatives, onComplete, onCancel }: Props) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime] = useState(Date.now());

  useEffect(() => { loadQuestions(); }, []);

  useEffect(() => {
    if (timeLimitMinutes && timeLeft === null) setTimeLeft(timeLimitMinutes * 60);
  }, [timeLimitMinutes]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) { clearInterval(timer); submitQuiz(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const loadQuestions = async () => {
    const { data } = await supabase
      .from('assessment_questions')
      .select('id, question_type, statement, alternatives, correct_answer, order_index')
      .eq('assessment_id', assessmentId)
      .order('order_index');
    if (data) {
      let qs = data as Question[];
      if (shuffleQuestions) qs = shuffleArray(qs);
      if (shuffleAlternatives) {
        qs = qs.map(q => {
          // Don't shuffle ordering questions or fill_blank/essay (no alternatives)
          if (q.question_type === 'ordering' || q.question_type === 'fill_blank' || q.question_type === 'essay') return q;
          return { ...q, alternatives: shuffleArray(q.alternatives || []) };
        });
      }
      // For ordering questions, initialize the answer with shuffled order
      const initialAnswers: Record<string, string> = {};
      qs.forEach(q => {
        if (q.question_type === 'ordering' && q.alternatives?.length) {
          const shuffledAlts = shuffleArray(q.alternatives);
          // Replace alternatives with shuffled version for display
          q.alternatives = shuffledAlts;
          initialAnswers[q.id] = shuffledAlts.map(a => a.id).join(',');
        }
      });
      setQuestions(qs);
      setAnswers(initialAnswers);
    }
  };

  const selectAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // Multiple answer: toggle
  const toggleMultiAnswer = (questionId: string, altId: string) => {
    setAnswers(prev => {
      const current = prev[questionId] ? prev[questionId].split(',').filter(Boolean) : [];
      const next = current.includes(altId) ? current.filter(x => x !== altId) : [...current, altId];
      return { ...prev, [questionId]: next.join(',') };
    });
  };

  // Ordering: move item
  const moveOrderingItem = (questionId: string, fromIdx: number, direction: 'up' | 'down') => {
    const q = questions.find(q => q.id === questionId);
    if (!q) return;
    const currentOrder = answers[questionId]?.split(',') || q.alternatives.map(a => a.id);
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= currentOrder.length) return;
    const newOrder = [...currentOrder];
    [newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]];
    setAnswers(prev => ({ ...prev, [questionId]: newOrder.join(',') }));
  };

  const submitQuiz = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      let correct = 0;
      let totalGradable = 0;

      const answerRows = questions.map(q => {
        const given = answers[q.id] || '';

        let isCorrect = false;
        if (q.question_type === 'essay') {
          // Essay is not auto-graded
          return { attempt_id: attemptId, question_id: q.id, answer_given: given, is_correct: null as boolean | null, points_earned: 0 };
        }

        totalGradable++;

        if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
          isCorrect = given === q.correct_answer;
        } else if (q.question_type === 'multiple_answer') {
          const givenSet = new Set(given.split(',').filter(Boolean).sort());
          const correctSet = new Set(q.correct_answer.split(',').filter(Boolean).sort());
          isCorrect = givenSet.size === correctSet.size && [...givenSet].every(x => correctSet.has(x));
        } else if (q.question_type === 'ordering') {
          isCorrect = given === q.correct_answer;
        } else if (q.question_type === 'fill_blank') {
          isCorrect = given.trim().toLowerCase() === (q.correct_answer || '').trim().toLowerCase();
        }

        if (isCorrect) correct++;
        return { attempt_id: attemptId, question_id: q.id, answer_given: given, is_correct: isCorrect, points_earned: isCorrect ? 1 : 0 };
      });

      await supabase.from('assessment_answers').insert(answerRows);

      const score = totalGradable > 0 ? Math.floor((correct / totalGradable) * 100) : 0;

      const { data: assessment } = await supabase
        .from('assessments')
        .select('passing_score')
        .eq('id', assessmentId)
        .single();

      const passed = score >= (assessment?.passing_score || 70);

      await supabase
        .from('assessment_attempts')
        .update({ submitted_at: new Date().toISOString(), score, passed, time_spent_seconds: timeSpent })
        .eq('id', attemptId);

      onComplete(attemptId);
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
      setSubmitting(false);
    }
  }, [answers, questions, attemptId, submitting]);

  if (questions.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">Carregando questões...</div>;
  }

  const q = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).filter(k => answers[k]).length;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const totalSeconds = timeLimitMinutes ? timeLimitMinutes * 60 : null;
  const timeProgress = totalSeconds && timeLeft !== null ? (timeLeft / totalSeconds) * 100 : 100;
  const timeUrgent = timeLeft !== null && timeLeft < 60;
  const timeWarning = timeLeft !== null && timeLeft < 180 && !timeUrgent;

  const QUESTION_TYPE_LABELS: Record<string, string> = {
    multiple_choice: 'Múltipla Escolha',
    true_false: 'Verdadeiro ou Falso',
    multiple_answer: 'Múltipla Resposta',
    ordering: 'Ordenação',
    fill_blank: 'Preencher Lacuna',
    essay: 'Dissertativa',
  };

  // Get ordering display
  const getOrderingAlts = () => {
    const order = answers[q.id]?.split(',') || q.alternatives.map(a => a.id);
    return order.map(id => q.alternatives.find(a => a.id === id)).filter(Boolean) as { id: string; text: string }[];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Questão {currentIndex + 1} de {questions.length}</Badge>
          <span className="text-xs text-muted-foreground">{answeredCount}/{questions.length} respondidas</span>
        </div>
        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-bold transition-colors ${
              timeUrgent ? 'bg-destructive/10 text-destructive animate-pulse' :
              timeWarning ? 'bg-amber-100 text-amber-700' :
              'bg-muted text-muted-foreground'
            }`}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
              {totalSeconds && (
                <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${timeUrgent ? 'bg-destructive' : timeWarning ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${timeProgress}%` }} />
                </div>
              )}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      <Progress value={progress} className="h-1.5" />

      {/* Question */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <Badge variant="outline" className="mb-3 text-xs">{QUESTION_TYPE_LABELS[q.question_type] || q.question_type}</Badge>
            <p className="text-lg font-medium text-foreground leading-relaxed">
              {q.question_type === 'fill_blank'
                ? q.statement.replace(/___/g, '______')
                : q.statement}
            </p>
          </div>

          {/* Multiple Choice / True-False */}
          {(q.question_type === 'multiple_choice' || q.question_type === 'true_false') && (
            <div className="space-y-2">
              {q.alternatives?.map(alt => (
                <button
                  key={alt.id}
                  onClick={() => selectAnswer(q.id, alt.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    answers[q.id] === alt.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/30 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      answers[q.id] === alt.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'
                    }`}>{alt.id.toUpperCase()}</span>
                    <span className="text-sm">{alt.text}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Multiple Answer */}
          {q.question_type === 'multiple_answer' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Selecione todas as alternativas corretas.</p>
              {q.alternatives?.map(alt => {
                const selected = answers[q.id]?.split(',').includes(alt.id);
                return (
                  <button
                    key={alt.id}
                    onClick={() => toggleMultiAnswer(q.id, alt.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/30 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selected} className="pointer-events-none" />
                      <span className="text-sm">{alt.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Ordering */}
          {q.question_type === 'ordering' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Coloque os itens na ordem correta usando as setas.</p>
              {getOrderingAlts().map((alt, idx) => (
                <div key={alt.id} className="flex items-center gap-2 p-3 rounded-xl border-2 border-border bg-background">
                  <div className="flex flex-col">
                    <button onClick={() => moveOrderingItem(q.id, idx, 'up')} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => moveOrderingItem(q.id, idx, 'down')} disabled={idx === getOrderingAlts().length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
                  <span className="text-sm flex-1">{alt.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Fill in the blank */}
          {q.question_type === 'fill_blank' && (
            <div className="space-y-2">
              <Input
                value={answers[q.id] || ''}
                onChange={e => selectAnswer(q.id, e.target.value)}
                placeholder="Digite sua resposta..."
                className="text-base"
              />
            </div>
          )}

          {/* Essay */}
          {q.question_type === 'essay' && (
            <div className="space-y-2">
              <Textarea
                value={answers[q.id] || ''}
                onChange={e => selectAnswer(q.id, e.target.value)}
                placeholder="Escreva sua resposta..."
                rows={6}
                className="text-base"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>Anterior</Button>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i === currentIndex ? 'bg-primary' :
                answers[questions[i].id] ? 'bg-primary/40' : 'bg-border'
              }`}
            />
          ))}
        </div>
        {currentIndex < questions.length - 1 ? (
          <Button onClick={() => setCurrentIndex(currentIndex + 1)}>
            Próxima <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => setShowConfirm(true)} disabled={submitting}>
            <Send className="h-4 w-4 mr-1" /> Enviar
          </Button>
        )}
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Você respondeu {answeredCount} de {questions.length} questões.
              {answeredCount < questions.length && ' Questões não respondidas serão consideradas incorretas.'}
              {' '}Após o envio, não será possível alterar suas respostas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={submitQuiz} disabled={submitting}>
              {submitting ? 'Enviando...' : 'Confirmar Envio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
