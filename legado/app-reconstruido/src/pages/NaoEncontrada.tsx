import { Link } from "react-router-dom";

export default function NaoEncontrada() {
  return (
    <main className="min-h-dvh grid place-items-center px-4 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold">Página não encontrada</h1>
        <p className="text-muted-foreground">O endereço pode ter mudado com a nova plataforma.</p>
        <Link to="/" className="text-primary underline-offset-4 hover:underline">Ir para o início</Link>
      </div>
    </main>
  );
}
