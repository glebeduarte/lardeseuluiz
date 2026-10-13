import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import logoLarSeuLuiz from '@/assets/logo-lar-seu-luiz.png';
import larBackground from '@/assets/lar-seu-luiz-background.jpg';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forced = searchParams.get('forced') === '1' || sessionStorage.getItem('force_password_change') === '1';
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user came from password reset email
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (session && (type === 'recovery' || forced)) {
        setIsValidSession(true);
      } else if (session) {
        // User is logged in but not from recovery link
        navigate('/dashboard');
      }
      setCheckingSession(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, forced]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = resetPasswordSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao redefinir senha',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      sessionStorage.removeItem('force_password_change');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', user.id);
      }
      toast({
        title: 'Senha redefinida!',
        description: 'Sua senha foi atualizada com sucesso. Faça login novamente.',
      });
      await supabase.auth.signOut();
      navigate('/auth');
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex bg-background">
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden">
          <img 
            src={larBackground} 
            alt="Lar de Seu Luiz" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/60" />
          <div className="relative z-10 text-center text-primary-foreground">
            <div className="mb-8 flex justify-center">
              <div className="p-4 bg-primary-foreground/20 rounded-2xl backdrop-blur-sm">
                <img src={logoLarSeuLuiz} alt="Lar de Seu Luiz" className="h-24 w-24 object-contain rounded-lg" />
              </div>
            </div>
            <h1 className="text-3xl font-display font-bold mb-2">Área de Formação</h1>
            <h2 className="text-2xl font-display font-semibold mb-4 opacity-95">Lar de Seu Luiz</h2>
            <p className="text-lg opacity-90 max-w-md">Secretaria de Formação</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-md border-border/50 bg-card shadow-lg animate-fade-up">
            <CardHeader className="text-center">
              <div className="lg:hidden mb-4 flex justify-center">
                <img src={logoLarSeuLuiz} alt="Lar de Seu Luiz" className="h-16 w-16 object-contain rounded-lg" />
              </div>
              <CardTitle className="text-2xl font-display">Link Inválido</CardTitle>
              <CardDescription>
                Este link de recuperação de senha expirou ou é inválido.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/auth')} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden">
        <img 
          src={larBackground} 
          alt="Lar de Seu Luiz" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 text-center text-primary-foreground">
          <div className="mb-8 flex justify-center">
            <div className="p-4 bg-primary-foreground/20 rounded-2xl backdrop-blur-sm">
              <img src={logoLarSeuLuiz} alt="Lar de Seu Luiz" className="h-24 w-24 object-contain rounded-lg" />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">Área de Formação</h1>
          <h2 className="text-2xl font-display font-semibold mb-4 opacity-95">Lar de Seu Luiz</h2>
          <p className="text-lg opacity-90 max-w-md">Secretaria de Formação</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-border/50 bg-card shadow-lg animate-fade-up">
          <CardHeader className="text-center">
            <div className="lg:hidden mb-4 flex justify-center">
              <img src={logoLarSeuLuiz} alt="Lar de Seu Luiz" className="h-16 w-16 object-contain rounded-lg" />
            </div>
            <CardTitle className="text-2xl font-display">
              {forced ? 'Crie sua nova senha' : 'Nova Senha'}
            </CardTitle>
            <CardDescription>
              {forced
                ? 'Você entrou com a senha padrão. Defina uma senha pessoal para continuar.'
                : 'Digite sua nova senha abaixo'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {forced && (
              <Alert variant="destructive" className="border-amber-500/50 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
                <ShieldAlert className="h-5 w-5" />
                <AlertTitle>Senha padrão detectada</AlertTitle>
                <AlertDescription>
                  Você acessou a plataforma usando a senha padrão. Por segurança, é obrigatório criar uma senha pessoal agora. Essa senha será usada em todos os seus próximos acessos.
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Redefinir Senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
