import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="container flex items-center justify-between py-5">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo-lsl.png" alt="Lar de Seu Luiz" className="h-12 w-auto rounded-md bg-white p-1" />
          <span className="font-display text-lg font-semibold">Lar de Seu Luiz</span>
        </Link>
        <Button asChild variant="outline">
          <Link to="/entrar">Entrar</Link>
        </Button>
      </header>

      <section className="container flex-1 flex flex-col justify-center gap-6 py-16 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Nova plataforma em construção</p>
        <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
          Um só lugar para cursos, atendimentos, ações sociais e a vida da casa.
        </h1>
        <p className="text-lg text-muted-foreground">
          Os sistemas atuais continuam funcionando normalmente enquanto cada área é transferida para cá.
        </p>
      </section>

      <footer className="container py-6 text-sm text-muted-foreground">
        Rua dos Navegantes, 22 · Colônia do Pium · Nísia Floresta/RN
      </footer>
    </main>
  );
}
