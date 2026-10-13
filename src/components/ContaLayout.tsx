import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Moldura das telas de login, cadastro e senha. */
export function ContaLayout({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <Link to="/" className="mx-auto" aria-label="Ir para o início">
          <img src="/logo-lsl.png" alt="Lar de Seu Luiz" className="h-20 w-auto rounded-md bg-white p-1" />
        </Link>
        <div className="rounded-lg border bg-card p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-2xl font-semibold">{titulo}</h1>
            {subtitulo && <p className="text-sm text-muted-foreground">{subtitulo}</p>}
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}

export function Aviso({ tipo, children }: { tipo: "erro" | "ok"; children: ReactNode }) {
  return (
    <p
      role={tipo === "erro" ? "alert" : "status"}
      className={
        tipo === "erro"
          ? "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          : "rounded-md bg-secondary/10 px-3 py-2 text-sm text-secondary"
      }
    >
      {children}
    </p>
  );
}
