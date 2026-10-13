import { useState, useEffect, useRef } from 'react';

const MEET_URL = 'https://meet.google.com/dvh-ooii-vgb';
const REDIRECT_SECONDS = 8;
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Clock, Info, Loader2, BookOpen } from 'lucide-react';
import logo from '@/assets/logo-lar-seu-luiz.png';

type Status = 'loading' | 'ready' | 'submitting' | 'success' | 'duplicate' | 'not_found' | 'expired' | 'error';

interface LessonInfo {
  link_id: string;
  lesson_id: string;
  lesson_title: string;
  lesson_order: number;
  course_name: string;
  expires_at: string;
  redirect_url?: string | null;
}

export default function AttendancePage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [lessonInfo, setLessonInfo] = useState<LessonInfo | null>(null);
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const redirectTimer = useRef<number | null>(null);

  const targetUrl = lessonInfo?.redirect_url?.trim() || MEET_URL;

  useEffect(() => {
    if (status !== 'success') return;
    setCountdown(REDIRECT_SECONDS);
    const interval = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(interval);
          window.location.href = targetUrl;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    redirectTimer.current = interval;
    return () => {
      if (redirectTimer.current) window.clearInterval(redirectTimer.current);
    };
  }, [status, targetUrl]);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    verifyLink();
  }, [token]);

  const verifyLink = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-attendance-link', {
        body: { token },
      });

      if (error) {
        const parsed = JSON.parse(error.message || '{}');
        if (parsed?.error === 'expired') {
          setStatus('expired');
        } else {
          setStatus('error');
        }
        return;
      }

      if (data?.error === 'expired') {
        setStatus('expired');
        return;
      }

      if (data?.error) {
        setStatus('error');
        return;
      }

      setLessonInfo(data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('submitting');
    try {
      const { data, error } = await supabase.functions.invoke('confirm-attendance', {
        body: { token, email: email.trim() },
      });

      if (error) {
        // Try to parse the error context
        try {
          const parsed = JSON.parse(error.message || '{}');
          if (parsed?.error === 'duplicate') {
            setUserName(parsed.name || '');
            setStatus('duplicate');
            return;
          }
          if (parsed?.error === 'not_found') {
            setErrorMessage(parsed.message || '');
            setStatus('not_found');
            return;
          }
          if (parsed?.error === 'expired') {
            setStatus('expired');
            return;
          }
        } catch {}
        setStatus('error');
        return;
      }

      if (data?.error === 'duplicate') {
        setUserName(data.name || '');
        setStatus('duplicate');
      } else if (data?.error === 'not_found') {
        setErrorMessage(data.message || '');
        setStatus('not_found');
      } else if (data?.error === 'expired') {
        setStatus('expired');
      } else if (data?.success) {
        setUserName(data.name || '');
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(214,40%,97%)] via-[hsl(208,68%,95%)] to-[hsl(168,42%,93%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Lar de Seu Luiz" className="h-16 w-16 rounded-xl object-cover shadow-lg mb-3" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Registro de Presença</h2>
        </div>

        <Card className="shadow-xl border-border/50">
          <CardContent className="p-6">
            {/* Loading */}
            {status === 'loading' && (
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verificando link...</p>
              </div>
            )}

            {/* Expired */}
            {status === 'expired' && (
              <div className="flex flex-col items-center py-8 gap-3 text-center">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Link Expirado</h3>
                <p className="text-sm text-muted-foreground">O período de registro de presença encerrou. Entre em contato com o facilitador caso precise de ajuda.</p>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div className="flex flex-col items-center py-8 gap-3 text-center">
                <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Link Inválido</h3>
                <p className="text-sm text-muted-foreground">Este link de presença não é válido. Verifique se copiou o link correto.</p>
              </div>
            )}

            {/* Ready - show form */}
            {(status === 'ready' || status === 'submitting' || status === 'not_found') && lessonInfo && (
              <>
                <div className="mb-6 text-center">
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1 mb-3">
                    <BookOpen className="h-3.5 w-3.5" />
                    {lessonInfo.course_name}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Aula {lessonInfo.lesson_order} — {lessonInfo.lesson_title}
                  </h3>
                  <p className="text-sm text-muted-foreground capitalize">{today}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                      Seu e-mail cadastrado
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="exemplo@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (status === 'not_found') setStatus('ready');
                      }}
                      required
                      disabled={status === 'submitting'}
                      className="h-12"
                    />
                  </div>

                  {status === 'not_found' && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                      <AlertCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-accent">
                        {errorMessage || 'E-mail não encontrado. Verifique se está usando o mesmo e-mail do cadastro.'}
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={status === 'submitting' || !email.trim()}
                  >
                    {status === 'submitting' ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Confirmando...
                      </>
                    ) : (
                      'Confirmar Presença'
                    )}
                  </Button>
                </form>
              </>
            )}

            {/* Success */}
            {status === 'success' && (
              <div className="flex flex-col items-center py-8 gap-3 text-center">
                <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-success" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Presença Confirmada!</h3>
                <p className="text-sm text-muted-foreground">
                  {userName ? `${userName}, sua` : 'Sua'} presença na aula foi registrada com sucesso.
                </p>
                <div className="w-full mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <p className="text-sm text-foreground">
                    Você será redirecionado(a) para a aula no Google Meet em{' '}
                    <span className="font-bold text-primary">{countdown}s</span>...
                  </p>
                  <Button
                    onClick={() => { window.location.href = targetUrl; }}
                    className="w-full h-11"
                  >
                    Entrar na aula agora
                  </Button>
                </div>
              </div>
            )}

            {/* Duplicate */}
            {status === 'duplicate' && (
              <div className="flex flex-col items-center py-8 gap-3 text-center">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Info className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Já Registrado</h3>
                <p className="text-sm text-muted-foreground">
                  {userName ? `${userName}, sua` : 'Sua'} presença já foi confirmada nesta aula!
                </p>
                <Button
                  onClick={() => { window.location.href = targetUrl; }}
                  className="w-full h-11 mt-4"
                >
                  Entrar na aula agora
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Lar de Seu Luiz — Plataforma de Formação
        </p>
      </div>
    </div>
  );
}
