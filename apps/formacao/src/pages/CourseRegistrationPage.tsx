import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, BookOpen, Users, Lock, Loader2, User } from 'lucide-react';
import { enrollUserInCourse } from '@/lib/enrollments';
import logo from '@/assets/logo-lar-seu-luiz.png';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  long_description: string | null;
  enrollment_open: boolean;
  registration_page_enabled: boolean;
  audience: string;
  schedule: string | null;
  facilitator: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_url: string | null;
  study_lines: string[];
}

function CourseInfo({ course }: { course: CourseData }) {
  const audienceLabel = course.audience === 'trabalhadores' ? 'Trabalhadores' : course.audience === 'frequentadores' ? 'Frequentadores' : 'Todos';

  const infoItems = [
    course.start_date && {
      icon: Calendar,
      label: `Início: ${format(new Date(course.start_date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
      sub: course.schedule || 'Verifique o calendário',
      bg: 'bg-primary/10',
      color: 'text-primary',
    },
    course.schedule && !course.start_date && {
      icon: Clock,
      label: course.schedule,
      sub: 'Horário das aulas',
      bg: 'bg-primary/10',
      color: 'text-primary',
    },
    {
      icon: BookOpen,
      label: 'Gratuito',
      sub: 'Sem custo de inscrição',
      bg: 'bg-accent/20',
      color: 'text-accent-foreground',
    },
    {
      icon: Users,
      label: `Para ${audienceLabel.toLowerCase()}`,
      sub: 'Público destinado',
      bg: 'bg-muted',
      color: 'text-muted-foreground',
    },
    course.facilitator && {
      icon: User,
      label: course.facilitator,
      sub: 'Facilitador(a)',
      bg: 'bg-primary/10',
      color: 'text-primary',
    },
  ].filter(Boolean) as Array<{ icon: any; label: string; sub: string; bg: string; color: string }>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-foreground mb-2">{course.title}</h2>
        {course.description && (
          <p className="text-lg text-primary font-medium">{course.description}</p>
        )}
      </div>

      {course.long_description && (
        <p className="text-muted-foreground leading-relaxed">{course.long_description}</p>
      )}

      <div className="space-y-4">
        {infoItems.map(({ icon: Icon, label, sub, bg, color }) => (
          <div key={label} className="flex items-center gap-3 text-foreground">
            <div className={`p-2 rounded-lg ${bg}`}>
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

function ClosedCard({ courseTitle }: { courseTitle: string }) {
  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-['Playfair_Display'] text-2xl">Inscrições Encerradas</CardTitle>
        <CardDescription>
          As inscrições para o curso {courseTitle} foram encerradas pois a turma está lotada.
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

function RegistrationForm({ course }: { course: CourseData }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const userType = course.audience === 'trabalhadores' ? 'trabalhador' : 'frequentador';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim() || phone.trim().length < 10) {
      toast({ title: 'Erro', description: 'O telefone é obrigatório (mín. 10 dígitos).', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
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
            user_type: userType,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
          toast({
            title: 'E-mail já cadastrado',
            description: `Este e-mail já está cadastrado. Faça login na área do aluno e solicite acesso ao curso por lá.`,
            variant: 'destructive',
          });
          return;
        }
        throw signUpError;
      }

      if (signUpData.user) {
        const { error: enrollmentError } = await enrollUserInCourse(signUpData.user.id, course.id);

        if (enrollmentError) console.error('Enrollment error:', enrollmentError);

        toast({
          title: 'Inscrição realizada com sucesso!',
          description: `Você foi inscrito no curso ${course.title}. Verifique seu e-mail para confirmar sua conta.`,
        });
        setTimeout(() => navigate('/auth'), 3000);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Erro na inscrição',
        description: error.message || 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-['Playfair_Display'] text-2xl">Inscreva-se Gratuitamente</CardTitle>
        <CardDescription>Preencha seus dados para se inscrever no curso {course.title}</CardDescription>
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

export default function CourseRegistrationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { navigate('/'); return; }

    supabase
      .from('courses')
      .select('id, title, description, long_description, enrollment_open, registration_page_enabled, audience, schedule, facilitator, start_date, end_date, cover_url, study_lines')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate('/');
          return;
        }
        // Cast because types haven't regenerated yet
        const courseData = data as unknown as CourseData;
        if (!courseData.registration_page_enabled) {
          navigate('/');
          return;
        }
        setCourse(courseData);
        setLoading(false);
      });
  }, [id, navigate]);

  if (loading || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    // Página pública fora da moldura: cabeçalho branco com o logo e conteúdo em max-w-5xl
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logo} alt="Lar de Seu Luiz" className="h-10 w-10 rounded-lg object-contain" />
          <h1 className="font-['Playfair_Display'] text-lg font-semibold text-foreground leading-tight">
            Área de Formação do Lar de Seu Luiz
          </h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Capa do curso (quando houver), como imagem do conteúdo */}
        {course.cover_url && (
          <img src={course.cover_url} alt={`Capa do curso ${course.title}`} className="w-full max-h-64 object-cover rounded-lg border mb-8" />
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <CourseInfo course={course} />
          {course.enrollment_open ? <RegistrationForm course={course} /> : <ClosedCard courseTitle={course.title} />}
        </div>

        <div className="text-left mt-12 text-xs text-muted-foreground">
          <p>Lar de Seu Luiz</p>
        </div>
      </div>
    </div>
  );
}
