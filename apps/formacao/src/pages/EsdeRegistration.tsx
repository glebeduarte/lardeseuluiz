import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, MapPin, BookOpen, Users, Lock, Loader2 } from 'lucide-react';
import { enrollUserInCourse } from '@/lib/enrollments';
import logo from '@/assets/logo-lar-seu-luiz.png';
import backgroundImage from '@/assets/esde-background.jpg';

const ESDE_COURSE_ID = '348d7a02-2159-4fee-9aa6-a92cbdc9696f';

function EsdeCourseInfo() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">ESDE I</h2>
        <p className="text-xl text-primary font-medium">
          Estudo Sistematizado da Doutrina Espírita
        </p>
      </div>

      <p className="text-muted-foreground leading-relaxed">
        O ESDE é um curso estruturado para o estudo aprofundado da Doutrina Espírita, 
        abrangendo seus aspectos científicos, filosóficos e religiosos. 
        Ideal para quem deseja conhecer ou aprofundar os ensinamentos espíritas.
      </p>

      <div className="space-y-4">
        {[
          { icon: Calendar, label: 'Início: 26 de Fevereiro de 2026', sub: 'Todas as quintas-feiras', bg: 'bg-primary/10', color: 'text-primary' },
          { icon: Clock, label: '19:30 às 21:00', sub: 'Horário de Brasília', bg: 'bg-primary/10', color: 'text-primary' },
          { icon: MapPin, label: 'Curso Online', sub: 'Aulas ao vivo pela internet', bg: 'bg-primary/10', color: 'text-primary' },
          { icon: BookOpen, label: 'Gratuito', sub: 'Sem custo de inscrição', bg: 'bg-accent/20', color: 'text-accent' },
          { icon: Users, label: 'Para frequentadores', sub: 'Aberto a todos os interessados', bg: 'bg-secondary/20', color: 'text-secondary-foreground' },
        ].map(({ icon: Icon, label, sub, bg, color }) => (
          <div key={label} className="flex items-center gap-3 text-foreground">
            <div className={`p-2 rounded-full ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EsdeClosedCard() {
  return (
    <Card className="shadow-xl border-primary/10 bg-card/95 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Inscrições Encerradas</CardTitle>
        <CardDescription>
          As inscrições para o curso ESDE I foram encerradas pois a turma está lotada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4 text-center space-y-2">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Infelizmente não estamos mais aceitando novas inscrições para esta turma. 
            Fique atento às próximas turmas!
          </p>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Já possui uma conta?{' '}
          <a href={`${import.meta.env.BASE_URL}auth`} className="text-primary hover:underline">Faça login aqui</a>
          {' '}para acessar a área do aluno.
        </p>
      </CardContent>
    </Card>
  );
}

function EsdeRegistrationForm() {
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
      toast({ title: "Erro", description: "O telefone é obrigatório.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
          data: { full_name: fullName.trim(), phone: phone.trim() },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
          toast({ title: "E-mail já cadastrado", description: "Este e-mail já está cadastrado. Por favor, faça login na área do aluno e solicite acesso ao curso ESDE I por lá.", variant: "destructive" });
          return;
        }
        throw signUpError;
      }

      if (signUpData.user) {
        const { error: enrollmentError } = await enrollUserInCourse(signUpData.user.id, ESDE_COURSE_ID);

        if (enrollmentError) console.error('Enrollment error:', enrollmentError);

        toast({ title: "Inscrição realizada com sucesso!", description: "Você foi inscrito no curso ESDE I. Verifique seu e-mail para confirmar sua conta e depois acesse a área do aluno." });
        setTimeout(() => navigate('/auth'), 3000);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({ title: "Erro na inscrição", description: error.message || "Ocorreu um erro ao processar sua inscrição. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-primary/10 bg-card/95 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Inscreva-se Gratuitamente</CardTitle>
        <CardDescription>Preencha seus dados para se inscrever no curso ESDE I</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone (WhatsApp)</Label>
            <Input id="phone" type="tel" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processando...</> : 'Inscrever-se'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Já possui uma conta?{' '}
            <a href={`${import.meta.env.BASE_URL}auth`} className="text-primary hover:underline">Faça login aqui</a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function EsdeRegistration() {
  const [enrollmentOpen, setEnrollmentOpen] = useState<boolean | null>(null);

  useEffect(() => {
    supabase
      .from('courses')
      .select('enrollment_open')
      .eq('id', ESDE_COURSE_ID)
      .single()
      .then(({ data }) => {
        setEnrollmentOpen(data?.enrollment_open ?? false);
      });
  }, []);

  if (enrollmentOpen === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-left md:bg-right bg-no-repeat" style={{ backgroundImage: `url(${backgroundImage})` }} />
      <div className="relative z-10 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-start mb-8">
            <img src={logo} alt="Lar de Seu Luiz" className="h-20 w-20 rounded-full object-cover mb-4 shadow-lg" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary text-left">
              Área de Formação do Lar de Seu Luiz
            </h1>
          </div>

          <div className="max-w-4xl grid md:grid-cols-2 gap-8">
            <EsdeCourseInfo />
            {enrollmentOpen ? <EsdeRegistrationForm /> : <EsdeClosedCard />}
          </div>

          <div className="text-left mt-12 text-sm text-muted-foreground">
            <p>Lar de Seu Luiz</p>
          </div>
        </div>
      </div>
    </div>
  );
}
