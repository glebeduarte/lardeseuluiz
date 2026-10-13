import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Play, BookOpen, Users, ArrowRight, Loader2 } from 'lucide-react';
import logo from '@/assets/logo-lar-seu-luiz.png';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      navigate(isAdmin ? '/admin' : '/welcome', { replace: true });
    }
  }, [user, loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    // Página fora da moldura: cartão centralizado com o logo, no padrão único
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-sm p-6 sm:p-8 text-center">
        <img
          src={logo}
          alt="Logo Lar de Seu Luiz"
          className="mx-auto mb-4 h-14 w-14 rounded-xl object-contain"
        />

        <h1 className="font-['Playfair_Display'] text-2xl font-bold text-foreground">
          Área de Formação
        </h1>
        <h2 className="font-['Playfair_Display'] text-lg font-semibold text-primary mb-3">
          Lar de Seu Luiz
        </h2>

        <p className="text-sm text-muted-foreground mb-6">
          Repositório de aprendizado e conteúdo da Secretaria de Formação.
          Acesse cursos e materiais para o seu desenvolvimento.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={() => navigate('/auth')}
          >
            Acessar Plataforma
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/auth')}
          >
            <Play className="mr-2 h-4 w-4" />
            Já tenho conta
          </Button>
        </div>
      </div>

      <footer className="mt-6 text-center text-xs text-muted-foreground">
        <p>© 2025 Lar de Seu Luiz - Secretaria de Formação. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
