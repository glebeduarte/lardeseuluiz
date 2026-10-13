import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Home, Search, BookOpen, Compass, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const quickLinks = [
    { label: "Início", href: "/", icon: Home },
    { label: "Explorar cursos", href: "/explore", icon: Compass },
    { label: "Biblioteca", href: "/biblioteca", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHero
        title="Página não encontrada"
        description="Parece que o caminho que você escolheu não existe por aqui."
        variant="student"
      />

      <main className="flex-1 flex items-center justify-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-2xl text-center animate-fade-up">
          <div className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-2xl bg-muted text-primary shadow-card">
            <span className="font-display text-5xl font-bold">404</span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Oops! Não encontramos essa página
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-md mx-auto leading-relaxed">
            A página que você tentou acessar pode ter sido movida, removida ou talvez nunca tenha existido. Vamos te ajudar a voltar para um lugar seguro.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Button asChild size="lg" className="w-full sm:w-auto gap-2">
              <a href={`${import.meta.env.BASE_URL}`}>
                <ArrowLeft className="h-4 w-4" />
                Voltar para o início
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto gap-2">
              <a href={`${import.meta.env.BASE_URL}dashboard`}>
                <Search className="h-4 w-4" />
                Acessar meu dashboard
              </a>
            </Button>
          </div>

          <div className="border-t border-border pt-8">
            <p className="text-sm text-muted-foreground mb-4">Ou explore algumas seções populares:</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {quickLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground card-hover hover:text-primary hover:border-primary/30"
                >
                  <link.icon className="h-4 w-4 text-primary" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
