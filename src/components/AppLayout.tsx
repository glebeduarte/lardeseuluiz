import { Link, NavLink, Outlet } from "react-router-dom";
import { Home, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { modulosVisiveis } from "@/lib/modulos";
import { cn } from "@/lib/utils";

/** Moldura das áreas logadas: cabeçalho e menu conforme as permissões da pessoa. */
export function AppLayout() {
  const { pessoa, pode, sair } = useAuth();
  const modulos = modulosVisiveis(pode).filter((m) => m.disponivel);
  const nome = pessoa?.nome_social || pessoa?.nome || "";

  const item = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap",
      isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between gap-4 py-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src="/logo-lsl.png" alt="" className="h-9 w-auto rounded bg-white p-0.5" />
            <span className="font-display font-semibold truncate">Lar de Seu Luiz</span>
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            <span className="hidden sm:inline text-sm text-muted-foreground truncate">{nome}</span>
            <button
              type="button"
              onClick={sair}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden /> Sair
            </button>
          </div>
        </div>
        <nav className="container flex gap-1 overflow-x-auto pb-2" aria-label="Áreas">
          <NavLink to="/minha-area" className={item} end>
            <Home className="h-4 w-4" aria-hidden /> Minha área
          </NavLink>
          {modulos.map((m) => m.externo ? (
            <a key={m.rota} href={m.rota} className={item({ isActive: false })}>
              <m.icone className="h-4 w-4" aria-hidden /> {m.nome}
            </a>
          ) : (
            <NavLink key={m.rota} to={m.rota} className={item}>
              <m.icone className="h-4 w-4" aria-hidden /> {m.nome}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 container py-8">
        <Outlet />
      </main>
    </div>
  );
}
