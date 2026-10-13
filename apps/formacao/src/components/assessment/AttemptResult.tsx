import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, ArrowLeft, RotateCcw, Trophy } from 'lucide-react';

interface Props {
  attempt: {
    id: string;
    score: number;
    passed: boolean;
    time_spent_seconds: number | null;
    attempt_number: number;
  };
  assessmentTitle: string;
  passingScore: number;
  showAnswers: string;
  assessmentId: string;
  onBack: () => void;
  onRetry?: () => void;
}

interface AnswerDetail {
  question_id: string;
  answer_given: string;
  is_correct: boolean | null;
  question: {
    statement: string;
    alternatives: { id: string; text: string }[];
    correct_answer: string;
    explanation: string | null;
    question_type: string;
  };
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Múltipla Escolha',
  true_false: 'Verdadeiro ou Falso',
  multiple_answer: 'Múltipla Resposta',
  ordering: 'Ordenação',
  fill_blank: 'Preencher Lacuna',
  essay: 'Dissertativa',
};

export function AttemptResult({ attempt, assessmentTitle, passingScore, showAnswers, assessmentId, onBack, onRetry }: Props) {
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const showGabarito = showAnswers === 'always' || (showAnswers === 'on_pass' && attempt.passed);

  useEffect(() => {
    if (showGabarito) loadAnswers();
  }, [showGabarito]);

  const loadAnswers = async () => {
    const { data: answerData } = await supabase
      .from('assessment_answers')
      .select('question_id, answer_given, is_correct')
      .eq('attempt_id', attempt.id);

    if (!answerData) return;

    const questionIds = answerData.map(a => a.question_id);
    const { data: questionData } = await supabase
      .from('assessment_questions')
      .select('id, statement, alternatives, correct_answer, explanation, question_type')
      .in('id', questionIds);

    if (questionData) {
      const merged = answerData.map(a => ({
        ...a,
        question: questionData.find(q => q.id === a.question_id)!,
      })).filter(a => a.question);
      setAnswers(merged as any);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}min ${s}s`;
  };

  const renderAnswerReview = (a: AnswerDetail) => {
    const { question: q } = a;

    // Multiple choice / true-false
    if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
      return (
        <div className="space-y-1">
          {q.alternatives?.map((alt: any) => (
            <div key={alt.id} className={`text-xs px-3 py-1.5 rounded-lg ${
              alt.id === q.correct_answer ? 'bg-emerald-100 text-emerald-800 font-medium' :
              alt.id === a.answer_given && !a.is_correct ? 'bg-destructive/10 text-destructive' :
              'text-muted-foreground'
            }`}>
              {alt.id.toUpperCase()}) {alt.text}
              {alt.id === q.correct_answer && ' ✓'}
              {alt.id === a.answer_given && alt.id !== q.correct_answer && ' (sua resposta)'}
            </div>
          ))}
        </div>
      );
    }

    // Multiple answer
    if (q.question_type === 'multiple_answer') {
      const givenIds = a.answer_given?.split(',').filter(Boolean) || [];
      const correctIds = q.correct_answer?.split(',').filter(Boolean) || [];
      return (
        <div className="space-y-1">
          {q.alternatives?.map((alt: any) => {
            const isGiven = givenIds.includes(alt.id);
            const isCorrectAlt = correctIds.includes(alt.id);
            return (
              <div key={alt.id} className={`text-xs px-3 py-1.5 rounded-lg ${
                isCorrectAlt ? 'bg-emerald-100 text-emerald-800 font-medium' :
                isGiven && !isCorrectAlt ? 'bg-destructive/10 text-destructive' :
                'text-muted-foreground'
              }`}>
                {alt.id.toUpperCase()}) {alt.text}
                {isCorrectAlt && ' ✓'}
                {isGiven && !isCorrectAlt && ' (sua resposta)'}
              </div>
            );
          })}
        </div>
      );
    }

    // Ordering
    if (q.question_type === 'ordering') {
      const givenOrder = a.answer_given?.split(',') || [];
      const correctOrder = q.correct_answer?.split(',') || [];
      return (
        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Sua ordem:</p>
            <div className="space-y-1">
              {givenOrder.map((id, idx) => {
                const alt = q.alternatives?.find((x: any) => x.id === id);
                const isCorrectPos = correctOrder[idx] === id;
                return (
                  <div key={idx} className={`text-xs px-3 py-1.5 rounded-lg ${isCorrectPos ? 'bg-emerald-100 text-emerald-800' : 'bg-destructive/10 text-destructive'}`}>
                    {idx + 1}. {alt?.text || id} {isCorrectPos ? '✓' : '✗'}
                  </div>
                );
              })}
            </div>
          </div>
          {!a.is_correct && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Ordem correta:</p>
              <div className="space-y-1">
                {correctOrder.map((id, idx) => {
                  const alt = q.alternatives?.find((x: any) => x.id === id);
                  return (
                    <div key={idx} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800">
                      {idx + 1}. {alt?.text || id}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Fill in the blank
    if (q.question_type === 'fill_blank') {
      return (
        <div className="space-y-1">
          <div className={`text-xs px-3 py-1.5 rounded-lg ${a.is_correct ? 'bg-emerald-100 text-emerald-800' : 'bg-destructive/10 text-destructive'}`}>
            Sua resposta: {a.answer_given || '(vazio)'} {a.is_correct ? '✓' : '✗'}
          </div>
          {!a.is_correct && (
            <div className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800">
              Resposta correta: {q.correct_answer}
            </div>
          )}
        </div>
      );
    }

    // Essay
    if (q.question_type === 'essay') {
      return (
        <div className="space-y-1">
          <div className="text-xs px-3 py-1.5 rounded-lg bg-muted text-foreground">
            {a.answer_given || '(não respondida)'}
          </div>
          <p className="text-xs text-muted-foreground italic">Questão dissertativa — correção manual pendente.</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className={attempt.passed ? 'border-emerald-300 bg-emerald-50/50' : 'border-amber-300 bg-amber-50/50'}>
        <CardContent className="p-6 text-center">
          {attempt.passed ? (
            <Trophy className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💪</span>
            </div>
          )}
          <h2 className="text-2xl font-['Playfair_Display'] font-bold mb-1">
            {attempt.passed ? 'Parabéns! Você foi aprovado!' : 'Continue estudando!'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {attempt.passed ? 'Você alcançou a nota mínima nesta avaliação.' : 'Fortaleça seu aprendizado e tente novamente.'}
          </p>

          <div className="flex items-center justify-center gap-6 mb-4">
            <div>
              <p className="text-4xl font-bold text-foreground">{attempt.score}%</p>
              <p className="text-xs text-muted-foreground">Sua nota</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div>
              <p className="text-4xl font-bold text-muted-foreground">{passingScore}%</p>
              <p className="text-xs text-muted-foreground">Nota mínima</p>
            </div>
          </div>

          <Progress value={attempt.score} className="h-2 mb-2" />

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>Tentativa {attempt.attempt_number}</span>
            {attempt.time_spent_seconds && <span>Tempo: {formatTime(attempt.time_spent_seconds)}</span>}
          </div>

          <div className="flex justify-center gap-3 mt-6">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            {onRetry && !attempt.passed && (
              <Button onClick={onRetry}>
                <RotateCcw className="h-4 w-4 mr-2" /> Tentar Novamente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Answer Review */}
      {showGabarito && answers.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Revisão das Respostas</h3>
          {answers.map((a) => (
            <Card key={a.question_id} className={a.is_correct === true ? 'border-emerald-300' : a.is_correct === false ? 'border-destructive/30' : 'border-border'}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {a.is_correct === true ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  ) : a.is_correct === false ? (
                    <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center mt-0.5 flex-shrink-0 text-xs">?</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px]">{QUESTION_TYPE_LABELS[a.question.question_type] || a.question.question_type}</Badge>
                    </div>
                    <p className="text-sm font-medium mb-2">{a.question.statement}</p>
                    {renderAnswerReview(a)}
                    {a.question.explanation && (
                      <p className="text-xs text-muted-foreground mt-2 italic">💡 {a.question.explanation}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
