import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Clock, Target, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QuizPlayer } from './QuizPlayer';
import { AttemptResult } from './AttemptResult';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  shuffle_questions: boolean;
  shuffle_alternatives: boolean;
  show_answers_after: string;
}

interface Props {
  assessment: Assessment;
}

export function AssessmentBlock({ assessment }: Props) {
  const { user } = useAuth();
  const [state, setState] = useState<'idle' | 'playing' | 'result'>('idle');
  const [attempts, setAttempts] = useState<any[]>([]);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any>(null);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user) loadAttempts();
    loadQuestionsCount();
  }, [user, assessment.id]);

  const loadAttempts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('assessment_id', assessment.id)
      .eq('user_id', user.id)
      .order('attempt_number', { ascending: false });
    if (data) setAttempts(data);
  };

  const loadQuestionsCount = async () => {
    const { count } = await supabase
      .from('assessment_questions')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_id', assessment.id);
    setQuestionsCount(count || 0);
  };

  const startAttempt = async () => {
    if (!user) return;
    const attemptNumber = attempts.length + 1;
    const { data, error } = await supabase
      .from('assessment_attempts')
      .insert({
        assessment_id: assessment.id,
        user_id: user.id,
        attempt_number: attemptNumber,
      })
      .select('id')
      .single();
    if (data) {
      setCurrentAttemptId(data.id);
      setState('playing');
    }
  };

  const onQuizComplete = async (attemptId: string) => {
    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();
    setResultData(attempt);
    setState('result');
    loadAttempts();
  };

  const bestScore = attempts.length > 0
    ? Math.max(...attempts.filter(a => a.score !== null).map(a => a.score ?? 0))
    : null;

  const completedAttempts = attempts.filter(a => a.submitted_at);
  const canRetry = assessment.max_attempts === null || completedAttempts.length < assessment.max_attempts;
  const hasPassed = attempts.some(a => a.passed);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}min ${s}s`;
  };

  if (state === 'playing' && currentAttemptId) {
    return (
      <QuizPlayer
        assessmentId={assessment.id}
        attemptId={currentAttemptId}
        timeLimitMinutes={assessment.time_limit_minutes}
        shuffleQuestions={assessment.shuffle_questions}
        shuffleAlternatives={assessment.shuffle_alternatives}
        onComplete={onQuizComplete}
        onCancel={() => { setState('idle'); loadAttempts(); }}
      />
    );
  }

  if (state === 'result' && resultData) {
    return (
      <AttemptResult
        attempt={resultData}
        assessmentTitle={assessment.title}
        passingScore={assessment.passing_score}
        showAnswers={assessment.show_answers_after}
        assessmentId={assessment.id}
        onBack={() => setState('idle')}
        onRetry={canRetry ? () => { setState('idle'); setTimeout(startAttempt, 100); } : undefined}
      />
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{assessment.title}</h3>
              <Badge variant="outline" className="text-xs">Avaliação</Badge>
              {hasPassed && <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Aprovado</Badge>}
            </div>
            {assessment.description && (
              <p className="text-sm text-muted-foreground mb-3">{assessment.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" /> {questionsCount} questões</span>
              <span className="flex items-center gap-1"><ClipboardCheck className="h-3.5 w-3.5" /> Nota mín. {assessment.passing_score}%</span>
              {assessment.time_limit_minutes && (
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {assessment.time_limit_minutes} min</span>
              )}
              {assessment.max_attempts && (
                <span>{completedAttempts.length}/{assessment.max_attempts} tentativas</span>
              )}
              {bestScore !== null && (
                <span className="font-medium text-foreground">Melhor nota: {bestScore}%</span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {completedAttempts.length === 0 ? (
                <Button size="sm" onClick={startAttempt}>Iniciar Avaliação</Button>
              ) : canRetry && !hasPassed ? (
                <Button size="sm" onClick={startAttempt} className="gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Tentar Novamente
                </Button>
              ) : canRetry ? (
                <Button size="sm" variant="outline" onClick={startAttempt} className="gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Refazer
                </Button>
              ) : null}
              {completedAttempts.length > 0 && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => {
                    const lastCompleted = completedAttempts[0];
                    setResultData(lastCompleted);
                    setState('result');
                  }}>
                    Ver Resultado
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowHistory(!showHistory)} className="gap-1 text-muted-foreground">
                    {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    Histórico ({completedAttempts.length})
                  </Button>
                </>
              )}
            </div>

            {/* Attempt History */}
            {showHistory && completedAttempts.length > 0 && (
              <div className="mt-3 border-t pt-3 space-y-2">
                {completedAttempts.map(att => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => { setResultData(att); setState('result'); }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-foreground">Tentativa {att.attempt_number}</span>
                      <span className="font-bold text-foreground">{att.score}%</span>
                      {att.passed ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0">Aprovado</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Reprovado</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      {att.time_spent_seconds && <span>{formatTime(att.time_spent_seconds)}</span>}
                      {att.submitted_at && <span>{format(new Date(att.submitted_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
