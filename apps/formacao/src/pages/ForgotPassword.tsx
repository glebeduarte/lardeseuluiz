import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { z } from 'zod';
import logoLarSeuLuiz from '@/assets/logo-lar-seu-luiz.png';
import larBackground from '@/assets/lar-seu-luiz-background.jpg';

const emailSchema = z.object({
  email: z.string().email('Email inválido'),
});

export default function ForgotPassword() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://formacao.lardeseuluiz.com.br/reset-password',
    });
    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao enviar email',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setEmailSent(true);
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada.',
      });
    }
  };

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
              {emailSent ? 'Email Enviado' : 'Recuperar Senha'}
            </CardTitle>
            <CardDescription>
              {emailSent 
                ? 'Verifique sua caixa de entrada e siga as instruções'
                : 'Digite seu email para receber o link de recuperação'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <Mail className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <p className="text-center text-muted-foreground text-sm">
                  Enviamos um email para <strong>{email}</strong> com instruções para redefinir sua senha.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setEmailSent(false)}
                >
                  Enviar novamente
                </Button>
                <Link to="/auth">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={error ? 'border-destructive' : ''}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Enviar Link de Recuperação
                </Button>

                <Link to="/auth">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Login
                  </Button>
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
