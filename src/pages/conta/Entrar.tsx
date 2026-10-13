import { Link } from "react-router-dom";

export default function Entrar() {
  return (
    <main className="min-h-dvh grid place-items-center px-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 text-center flex flex-col gap-4">
        <img src="/logo-lsl.png" alt="Lar de Seu Luiz" className="mx-auto h-20 w-auto rounded-md bg-white p-1" />
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <p className="text-muted-foreground">O login único será liberado na Fase 3. Até lá, use os sistemas atuais.</p>
        <Link to="/" className="text-primary underline-offset-4 hover:underline">Voltar ao início</Link>
      </div>
    </main>
  );
}
