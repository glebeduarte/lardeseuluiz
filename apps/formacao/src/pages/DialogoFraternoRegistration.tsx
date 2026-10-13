import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { enrollUserInCourse } from '@/lib/enrollments';
import { Calendar, Clock, MapPin, BookOpen, Users } from 'lucide-react';
import logo from '@/assets/logo-lar-seu-luiz.png';

// TODO: Substituir pelo ID real do curso de Diálogo Fraterno quando criado
const DIALOGO_FRATERNO_COURSE_ID = '';

export default function DialogoFraternoRegistration() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim() || phone.trim().length < 10) {
      toast({
        title: "Erro",
        description: "O telefone é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
          toast({
            title: "E-mail já cadastrado",
            description: "Este e-mail já está cadastrado. Por favor, faça login na área do aluno e solicite acesso ao curso por lá.",
            variant: "destructive",
          });
          return;
        }
        throw signUpError;
      }

      if (signUpData.user && DIALOGO_FRATERNO_COURSE_ID) {
        const { error: enrollmentError } = await enrollUserInCourse(signUpData.user.id, DIALOGO_FRATERNO_COURSE_ID);

        if (enrollmentError) {
          console.error('Enrollment error:', enrollmentError);
        }
      }

      toast({
        title: "Inscrição realizada com sucesso!",
        description: "Você foi inscrito no curso de Diálogo Fraterno. Verifique seu e-mail para confirmar sua conta.",
      });

      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Erro na inscrição",
        description: error.message || "Ocorreu um erro ao processar sua inscrição. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    // Página pública fora da moldura: cabeçalho branco com o logo e conteúdo em max-w-5xl
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <img
            src={logo}
            alt="Lar de Seu Luiz"
            className="h-10 w-10 rounded-lg object-contain"
          />
          <div className="min-w-0">
            <h1 className="font-['Playfair_Display'] text-lg font-semibold text-foreground leading-tight">
              Área de Formação do Lar de Seu Luiz
            </h1>
            <p className="text-xs text-muted-foreground">Secretaria de Formação</p>
          </div>
        </div>
      </header>

      <div>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Course Info */}
            <div className="space-y-6">
              <div>
              <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-foreground mb-2">Diálogo Fraterno</h2>
                <p className="text-lg text-primary font-medium">
                  Atualização e Reciclagem
                </p>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                Curso de atualização e reciclagem do Diálogo fraterno no acolhimento de 
                frequentadores no Lar de Seu Luiz nos trabalhos de terças-feiras e sábados.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-foreground">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">28 de Fevereiro</p>
                    <p className="text-sm text-muted-foreground">Encontro único</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-foreground">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">8:30 às 12:00</p>
                    <p className="text-sm text-muted-foreground">Horário de Brasília</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-foreground">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Curso Presencial</p>
                    <p className="text-sm text-muted-foreground">No Lar de Seu Luiz</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-foreground">
                  <div className="p-2 rounded-lg bg-accent/20">
                    <BookOpen className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Gratuito</p>
                    <p className="text-sm text-muted-foreground">Sem custo de inscrição</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-foreground">
                  <div className="p-2 rounded-lg bg-sky-100">
                    <Users className="h-5 w-5 text-sky-800" />
                  </div>
                  <div>
                    <p className="font-medium">Exclusivo para trabalhadores</p>
                    <p className="text-sm text-muted-foreground">Trabalhadores do Lar de Seu Luiz</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Form */}
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="font-['Playfair_Display'] text-2xl">Inscreva-se</CardTitle>
                <CardDescription>
                  Preencha os dados abaixo para se inscrever no curso de Diálogo Fraterno
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Seu nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Digite a senha novamente"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? 'Processando...' : 'Confirmar Inscrição'}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Já possui uma conta?{' '}
                    <a href={`${import.meta.env.BASE_URL}auth`} className="text-primary hover:underline">
                      Faça login aqui
                    </a>{' '}
                    e solicite acesso ao curso pela área do aluno.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="text-left mt-12 text-xs text-muted-foreground">
            <p>Lar de Seu Luiz - Secretaria de Formação</p>
          </div>
        </div>
      </div>
    </div>
  );
}
