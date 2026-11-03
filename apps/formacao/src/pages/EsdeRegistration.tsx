import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, MapPin, BookOpen, Users, Lock, Loader2, CheckCircle2, MessageCircle, Mail, ArrowRight } from 'lucide-react';
import { enrollUserInCourse } from '@/lib/enrollments';
import logo from '@/assets/logo-lar-seu-luiz.png';

const ESDE_COURSE_ID = '348d7a02-2159-4fee-9aa6-a92cbdc9696f';

function EsdeCourseInfo() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-foreground mb-2">ESDE I</h2>
        <p className="text-lg text-primary font-medium">
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
          { icon: BookOpen, label: 'Gratuito', sub: 'Sem custo de inscrição', bg: 'bg-accent/20', color: 'text-accent-foreground' },
          { icon: Users, label: 'Para frequentadores', sub: 'Aberto a todos os interessados', bg: 'bg-muted', color: 'text-muted-foreground' },
        ].map(({ icon: Icon, label, sub, bg, color }) => (
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

function EsdeClosedCard() {
  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-['Playfair_Display'] text-2xl">Inscrições Encerradas</CardTitle>
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

function EsdeRegistrationForm({ onSuccess }: { onSuccess: (nome: string, email: string) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

        onSuccess(fullName.trim(), email.trim());
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({ title: "Erro na inscrição", description: error.message || "Ocorreu um erro ao processar sua inscrição. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-['Playfair_Display'] text-2xl">Inscreva-se Gratuitamente</CardTitle>
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

// Tela exibida logo após a inscrição. O link do grupo vem da aula "Informações Iniciais"
// (módulo "Comece aqui") por meio da função formacao.esde_link_grupo_whatsapp().
function EsdeConfirmacao({ nome, email }: { nome: string; email: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [clicou, setClicou] = useState(false);

  useEffect(() => {
    (supabase as any)
      .rpc('esde_link_grupo_whatsapp')
      .then(({ data }: { data: string | null }) => {
        setLink(data ?? null);
        setCarregando(false);
      });
  }, []);

  const primeiroNome = nome.split(' ')[0];

  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="font-['Playfair_Display'] text-2xl">
          {primeiroNome ? `${primeiroNome}, sua inscrição foi feita` : 'Inscrição feita'}
        </CardTitle>
        <CardDescription>Falta um passo: entrar no grupo de WhatsApp da turma.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">1. Entre no grupo da turma agora</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Os avisos, o link das aulas ao vivo e os materiais de estudo são enviados pelo grupo.
            Quem não entra no grupo fica sem essas informações.
          </p>
          {carregando ? (
            <div className="flex justify-center py-2"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : link ? (
            <Button asChild size="lg" className="w-full bg-[#25D366] hover:bg-[#1ebe5a] text-white">
              <a href={link} target="_blank" rel="noreferrer" onClick={() => setClicou(true)}>
                <MessageCircle className="h-5 w-5 mr-2" /> Entrar no grupo de WhatsApp
              </a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              O link do grupo também está na primeira aula do curso, em "Comece aqui", dentro da área do aluno.
            </p>
          )}
          {clicou && (
            <p className="text-xs text-muted-foreground text-center">
              Se o WhatsApp não abriu, toque no botão de novo ou acesse a aula "Informações Iniciais" na área do aluno.
            </p>
          )}
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" /> 2. Confirme seu e-mail
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enviamos uma mensagem para <span className="font-medium text-foreground break-all">{email}</span>.
            Clique no link dela para ativar sua conta. Confira também a caixa de spam.
          </p>
        </div>

        <Button asChild variant="outline" className="w-full">
          <a href={`${import.meta.env.BASE_URL}auth`}>
            3. Acessar a área do aluno <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function EsdeRegistration() {
  const [enrollmentOpen, setEnrollmentOpen] = useState<boolean | null>(null);
  const [inscrito, setInscrito] = useState<{ nome: string; email: string } | null>(null);

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
        {inscrito ? (
          <div className="max-w-lg mx-auto">
            <EsdeConfirmacao nome={inscrito.nome} email={inscrito.email} />
          </div>
        ) : (
        <div className="grid md:grid-cols-2 gap-8">
          <EsdeCourseInfo />
          {enrollmentOpen ? (
            <EsdeRegistrationForm onSuccess={(nome, email) => setInscrito({ nome, email })} />
          ) : (
            <EsdeClosedCard />
          )}
        </div>
        )}

        <div className="text-left mt-12 text-xs text-muted-foreground">
          <p>Lar de Seu Luiz</p>
        </div>
      </div>
    </div>
  );
}
