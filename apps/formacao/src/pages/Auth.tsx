import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';
import logoLarSeuLuiz from '@/assets/logo-lar-seu-luiz.png';
import { Checkbox } from '@/components/ui/checkbox';

const WORKER_CODE = 'LSL@2026';

const hasForcedPasswordChangeForUser = (userId: string) => {
  const value = sessionStorage.getItem('force_password_change');
  if (!value) return false;

  try {
    const parsed = JSON.parse(value) as { userId?: string; createdAt?: number };
    const isRecent = typeof parsed.createdAt === 'number' && Date.now() - parsed.createdAt < 10 * 60 * 1000;
    return parsed.userId === userId && isRecent;
  } catch {
    sessionStorage.removeItem('force_password_change');
    return false;
  }
};

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
  isWorker: z.boolean(),
  workerCode: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
}).refine((data) => !data.isWorker || data.workerCode === WORKER_CODE, {
  message: 'Código de trabalhador inválido',
  path: ['workerCode'],
});

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, user, loading: authLoading, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    isWorker: false,
    workerCode: '',
  });

  useEffect(() => {
    if (user && !authLoading) {
      if (hasForcedPasswordChangeForUser(user.id)) {
        navigate('/reset-password?forced=1', { replace: true });
      } else {
        navigate(isAdmin ? '/admin' : '/welcome', { replace: true });
      }
    }
  }, [user, authLoading, isAdmin, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse(loginForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const usingDefaultPassword = loginForm.password === 'LSL@estudo2026';

    setLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setLoading(false);

    if (error) {
      sessionStorage.removeItem('force_password_change');
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
          : error.message,
        variant: 'destructive',
      });
    } else if (usingDefaultPassword) {
      const { data: { user: signedInUser } } = await supabase.auth.getUser();
      if (signedInUser) {
        sessionStorage.setItem('force_password_change', JSON.stringify({
          userId: signedInUser.id,
          createdAt: Date.now(),
        }));
        navigate('/reset-password?forced=1', { replace: true });
      }
      toast({
        title: 'Defina uma nova senha',
        description: 'Por segurança, crie uma senha pessoal para continuar.',
      });
    } else {
      toast({ title: 'Bem-vindo de volta!' });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signUpSchema.safeParse(signUpForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const userType = signUpForm.isWorker ? 'trabalhador' : 'frequentador';
    const redirectUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { data, error } = await supabase.auth.signUp({
      email: signUpForm.email,
      password: signUpForm.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: signUpForm.fullName,
          phone: signUpForm.phone,
          user_type: userType,
        },
      },
    });
    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message.includes('already registered')
          ? 'Este email já está cadastrado'
          : error.message,
        variant: 'destructive',
      });
    } else {
      // Send welcome email and notify admins asynchronously (don't block signup flow)
      if (data?.user) {
        // Send welcome email to new user
        supabase.functions.invoke('send-welcome-email', {
          body: {
            userId: data.user.id,
            email: signUpForm.email,
            fullName: signUpForm.fullName,
          },
        }).then(({ error: emailError }) => {
          if (emailError) {
            console.error('Failed to send welcome email:', emailError);
          } else {
            console.log('Welcome email sent successfully');
          }
        });

        // Notify admins about new user registration
        supabase.functions.invoke('notify-admins-new-user', {
          body: {
            userId: data.user.id,
            userEmail: signUpForm.email,
            userName: signUpForm.fullName,
            userPhone: signUpForm.phone,
          },
        }).then(({ error: notifyError }) => {
          if (notifyError) {
            console.error('Failed to notify admins:', notifyError);
          } else {
            console.log('Admins notified successfully');
          }
        });
      }

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Você já pode acessar a plataforma.',
      });
      navigate('/welcome');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md rounded-2xl border bg-card shadow-sm">
          <CardHeader className="text-center">
            <img src={logoLarSeuLuiz} alt="Lar de Seu Luiz" className="mx-auto mb-3 h-14 w-14 object-contain rounded-xl" />
            <CardTitle className="font-['Playfair_Display'] text-2xl">Área de Formação</CardTitle>
            <CardDescription>
              Lar de Seu Luiz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <p className="font-semibold text-primary">Está com problemas para entrar?</p>
                  <p className="mt-1 text-muted-foreground">
                    Fizemos um reset geral. Se ainda não trocou sua senha, use a senha padrão:
                  </p>
                  <p className="mt-2 font-mono text-base font-bold text-foreground">LSL@estudo2026</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recomendamos alterar após o primeiro acesso em "Esqueci minha senha".
                  </p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className={errors.password ? 'border-destructive' : ''}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Entrar
                  </Button>

                  <div className="text-center">
                    <a
                      href={`${import.meta.env.BASE_URL}forgot-password`}
                      className="text-sm text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </a>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      placeholder="Seu nome"
                      value={signUpForm.fullName}
                      onChange={(e) => setSignUpForm({ ...signUpForm, fullName: e.target.value })}
                      className={errors.fullName ? 'border-destructive' : ''}
                    />
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signUpForm.email}
                      onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefone *</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={signUpForm.phone}
                      onChange={(e) => setSignUpForm({ ...signUpForm, phone: e.target.value })}
                      className={errors.phone ? 'border-destructive' : ''}
                    />
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={signUpForm.password}
                        onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })}
                        className={errors.password ? 'border-destructive' : ''}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar Senha</Label>
                    <Input
                      id="signup-confirm"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signUpForm.confirmPassword}
                      onChange={(e) => setSignUpForm({ ...signUpForm, confirmPassword: e.target.value })}
                      className={errors.confirmPassword ? 'border-destructive' : ''}
                    />
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="signup-worker"
                        checked={signUpForm.isWorker}
                        onCheckedChange={(checked) =>
                          setSignUpForm({
                            ...signUpForm,
                            isWorker: !!checked,
                            workerCode: checked ? signUpForm.workerCode : '',
                          })
                        }
                      />
                      <Label htmlFor="signup-worker" className="text-sm font-normal leading-tight cursor-pointer">
                        Sou trabalhador do Lar de Seu Luiz
                      </Label>
                    </div>
                    {signUpForm.isWorker && (
                      <div className="space-y-2">
                        <Label htmlFor="signup-worker-code">Código de trabalhador</Label>
                        <Input
                          id="signup-worker-code"
                          type="text"
                          placeholder="Digite o código"
                          value={signUpForm.workerCode}
                          onChange={(e) => setSignUpForm({ ...signUpForm, workerCode: e.target.value })}
                          className={errors.workerCode ? 'border-destructive' : ''}
                        />
                        {errors.workerCode && <p className="text-sm text-destructive">{errors.workerCode}</p>}
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Criar Conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
  );
}
