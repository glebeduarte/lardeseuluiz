import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import logo from "@/assets/logo-lar-seu-luiz.png";
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
    // Página fora da moldura: cartão centralizado com o logo, no padrão único
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <main className="w-full max-w-lg rounded-2xl border bg-card shadow-sm p-6 sm:p-8 text-center">
        <img src={logo} alt="Lar de Seu Luiz" className="mx-auto mb-4 h-14 w-14 rounded-xl object-contain" />
        <h1 className="font-['Playfair_Display'] text-2xl font-bold text-foreground">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">Parece que o caminho que você escolheu não existe por aqui.</p>
        <div>
          <p className="font-['Playfair_Display'] text-5xl font-bold text-primary mb-4">404</p>

          <h2 className="font-['Playfair_Display'] text-xl font-semibold text-foreground mb-2">
            Oops! Não encontramos essa página
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            A página que você tentou acessar pode ter sido movida, removida ou talvez nunca tenha existido. Vamos te ajudar a voltar para um lugar seguro.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Button asChild className="w-full sm:w-auto gap-2">
              <a href={`${import.meta.env.BASE_URL}`}>
                <ArrowLeft className="h-4 w-4" />
                Voltar para o início
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto gap-2">
              <a href={`${import.meta.env.BASE_URL}dashboard`}>
                <Search className="h-4 w-4" />
                Acessar meu dashboard
              </a>
            </Button>
          </div>

          <div className="border-t pt-6">
            <p className="text-sm text-muted-foreground mb-4">Ou explore algumas seções populares:</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {quickLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted hover:text-primary"
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
