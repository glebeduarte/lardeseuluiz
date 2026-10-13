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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/10" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwODA4MCIgc3Ryb2tlLXdpZHRoPSIwLjUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1Ii8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        
        {/* Floating elements */}
        <div className="absolute top-1/4 left-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-10 h-48 w-48 rounded-full bg-accent/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo */}
            <div className="mb-8 animate-fade-up">
              <div className="inline-flex p-3 rounded-2xl bg-card border border-border shadow-lg">
                <img 
                  src={logo} 
                  alt="Logo Lar de Seu Luiz" 
                  className="h-20 w-20 rounded-xl object-cover"
                />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-4 text-foreground animate-fade-up" style={{ animationDelay: '0.1s' }}>
              Área de Formação
            </h1>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold mb-8 text-primary animate-fade-up" style={{ animationDelay: '0.15s' }}>
              Lar de Seu Luiz
            </h2>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.25s' }}>
              Repositório de aprendizado e conteúdo da Secretaria de Formação. 
              Acesse cursos e materiais para o seu desenvolvimento.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <Button
                size="lg"
                className="text-lg px-8 py-6"
                onClick={() => navigate('/auth')}
              >
                Acessar Plataforma
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => navigate('/auth')}
              >
                <Play className="mr-2 h-5 w-5" />
                Já tenho conta
              </Button>
            </div>

          </div>
        </div>

      {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />

        {/* Footer */}
        <footer className="absolute bottom-0 left-0 right-0 py-6 px-6 border-t border-border bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto text-center text-muted-foreground">
            <p>© 2025 Lar de Seu Luiz - Secretaria de Formação. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
