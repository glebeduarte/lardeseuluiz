import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, MapPin, Info, Loader2, BookOpen, CheckCircle2, MessageCircle, Home } from 'lucide-react';
import { enrollUserInCourse } from '@/lib/enrollments';
import logo from '@/assets/logo-lar-seu-luiz.png';

interface RegPage {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  info_day: string | null;
  info_time: string | null;
  info_format: string | null;
  info_extra: string | null;
  free_text: string | null;
  whatsapp_group_url: string | null;
  thanks_text: string | null;
  course_ids: string[];
  show_course_covers: boolean;
  is_active: boolean;
}

interface CourseMini {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  thumbnail_url: string | null;
}

function InfoBox({ page }: { page: RegPage }) {
  const items = [
    page.info_day && { icon: Calendar, label: page.info_day, sub: 'Dia' },
    page.info_time && { icon: Clock, label: page.info_time, sub: 'Horário' },
    page.info_format && { icon: MapPin, label: page.info_format, sub: 'Formato' },
    page.info_extra && { icon: Info, label: page.info_extra, sub: 'Informações' },
  ].filter(Boolean) as Array<{ icon: any; label: string; sub: string }>;

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      {items.map(({ icon: Icon, label, sub }) => (
        <div key={sub} className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{label}</p>
            <p className="text-sm text-muted-foreground">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CoursesPreview({ courses, showCovers }: { courses: CourseMini[]; showCovers: boolean }) {
  if (courses.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className="font-['Playfair_Display'] font-semibold text-foreground flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" /> Cursos incluídos
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {courses.map((c) => {
          const img = c.thumbnail_url || c.cover_url;
          return (
            <div key={c.id} className="rounded-lg overflow-hidden border bg-card">
              {showCovers && (
                <div className="aspect-[4/5] bg-muted">
                  {img && <img src={img} alt={`Capa do curso ${c.title}`} loading="lazy" className="w-full h-full object-cover" />}
                </div>
              )}
              <p className="text-xs font-medium p-2 leading-snug text-foreground">{c.title}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RegistrationForm({ page, courses, onSuccess }: { page: RegPage; courses: CourseMini[]; onSuccess: () => void }) {
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
          data: { full_name: fullName.trim(), phone: phone.trim() },
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered')) {
          toast({
            title: 'E-mail já cadastrado',
            description: 'Este e-mail já possui conta. Faça login na área do aluno e solicite acesso aos cursos por lá.',
            variant: 'destructive',
          });
          return;
        }
        throw signUpError;
      }

      if (signUpData.user) {
        for (const courseId of page.course_ids) {
          const { error } = await enrollUserInCourse(signUpData.user.id, courseId);
          if (error) console.error('Enrollment error:', courseId, error);
        }
        onSuccess();
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({ title: 'Erro na inscrição', description: error.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-['Playfair_Display'] text-2xl">Inscreva-se Gratuitamente</CardTitle>
        <CardDescription>
          Preencha seus dados para se inscrever{courses.length > 1 ? ' nos cursos desta turma' : courses[0] ? ` no curso ${courses[0].title}` : ''}
        </CardDescription>
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
            Já possui uma conta? <a href={`${import.meta.env.BASE_URL}auth`} className="text-primary hover:underline">Faça login aqui</a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function ThankYouCard({ page }: { page: RegPage }) {
  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="font-['Playfair_Display'] text-2xl">Inscrição confirmada!</CardTitle>
        <CardDescription>
          {page.thanks_text ||
            'Recebemos sua inscrição. Verifique seu e-mail para confirmar a conta e acessar a área do aluno.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {page.whatsapp_group_url ? (
          <>
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground text-center">
              Entre no grupo de WhatsApp da turma para receber avisos, materiais e o link das aulas.
            </div>
            <Button asChild className="w-full">
              <a href={page.whatsapp_group_url} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4 mr-2" /> Entrar no grupo de WhatsApp
              </a>
            </Button>
          </>
        ) : (
          <Button asChild className="w-full">
            <a href={`${import.meta.env.BASE_URL}`}><Home className="h-4 w-4 mr-2" /> Voltar para a Home</a>
          </Button>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Já confirmou seu e-mail? <a href={`${import.meta.env.BASE_URL}auth`} className="text-primary hover:underline">Acesse a área do aluno</a>
        </p>
      </CardContent>
    </Card>
  );
}

export default function PublicRegistrationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<RegPage | null>(null);
  const [courses, setCourses] = useState<CourseMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!slug) { navigate('/'); return; }
    let active = true;

    (async () => {
      const { data, error } = await supabase
        .from('registration_pages')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (!active) return;
      if (error || !data || !(data as any).is_active) {
        navigate('/', { replace: true });
        return;
      }
      const pageData = data as unknown as RegPage;
      setPage(pageData);

      if (pageData.course_ids?.length) {
        const { data: courseData } = await supabase
          .from('courses')
          .select('id, title, description, cover_url, thumbnail_url')
          .in('id', pageData.course_ids);
        if (active) setCourses((courseData as CourseMini[]) || []);
      }
      if (active) setLoading(false);
    })();

    return () => { active = false; };
  }, [slug, navigate]);

  useEffect(() => {
    if (page) document.title = `${page.title} | Lar de Seu Luiz`;
  }, [page]);

  if (loading || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const heroCover = courses.find((c) => c.cover_url)?.cover_url;

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
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-foreground mb-2">{page.title}</h2>
              {page.subtitle && <p className="text-lg text-primary font-medium">{page.subtitle}</p>}
            </div>

            {page.free_text && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{page.free_text}</p>
            )}

            <InfoBox page={page} />
            <CoursesPreview courses={courses} showCovers={page.show_course_covers} />
          </div>

          {submitted ? (
            <ThankYouCard page={page} />
          ) : (
            <RegistrationForm page={page} courses={courses} onSuccess={() => setSubmitted(true)} />
          )}
        </div>

        <div className="text-left mt-12 text-xs text-muted-foreground">
          <p>Lar de Seu Luiz</p>
        </div>
      </div>
    </div>
  );
}
