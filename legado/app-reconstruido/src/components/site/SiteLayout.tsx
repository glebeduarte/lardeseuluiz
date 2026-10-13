import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSiteConfig } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS: { to: string; rotulo: string; externo?: boolean }[] = [
  { to: "/#programacao", rotulo: "Horários" },
  { to: "/agenda", rotulo: "Agenda" },
  { to: "/atendimentos", rotulo: "Atendimentos" },
  { to: "/formacao/", rotulo: "Cursos", externo: true },
  { to: "/#acoes", rotulo: "Ações sociais" },
  { to: "/a-casa", rotulo: "A casa" },
  { to: "/#contato", rotulo: "Contato" },
];

export function SiteLayout({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [aberto, setAberto] = useState(false);
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 80);
    return () => window.clearTimeout(t);
  }, [hash, pathname]);

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <div className="container flex items-center justify-between gap-4 py-3">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <img src="/logo-lsl.png" alt="" className="h-11 w-auto rounded bg-white p-0.5" />
            <span className="flex flex-col leading-tight min-w-0">
              <span className="font-display text-lg font-semibold truncate">Lar de Seu Luiz</span>
              <span className="text-xs text-muted-foreground truncate">Pium · Nísia Floresta/RN</span>
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1" aria-label="Principal">
            {LINKS.map((l) => l.externo ? (
              <a key={l.to} href={l.to} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted">{l.rotulo}</a>
            ) : (
              <NavLink key={l.to} to={l.to} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted">
                {l.rotulo}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant={session ? "outline" : "default"}>
              <Link to={session ? "/minha-area" : "/entrar"}>{session ? "Minha área" : "Entrar"}</Link>
            </Button>
            <button
              type="button"
              className="lg:hidden rounded-md p-2 hover:bg-muted"
              aria-label={aberto ? "Fechar menu" : "Abrir menu"}
              aria-expanded={aberto}
              onClick={() => setAberto(!aberto)}
            >
              {aberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <nav className={cn("lg:hidden border-t", aberto ? "block" : "hidden")} aria-label="Principal (celular)">
          <div className="container flex flex-col py-2">
            {LINKS.map((l) => l.externo ? (
              <a key={l.to} href={l.to} className="py-2.5 text-sm">{l.rotulo}</a>
            ) : (
              <Link key={l.to} to={l.to} onClick={() => setAberto(false)} className="py-2.5 text-sm">
                {l.rotulo}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <Rodape />
    </div>
  );
}

function Rodape() {
  const { data: cfg } = useSiteConfig();
  return (
    <footer className="border-t bg-card">
      <div className="container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="flex flex-col gap-2 lg:col-span-2">
          <span className="font-display text-lg font-semibold">Lar de Seu Luiz</span>
          <p className="text-muted-foreground max-w-md">
            Casa espiritualista aberta a todos, dedicada ao acolhimento fraterno, ao estudo da Doutrina Espírita e à ação social.
            Todas as atividades são gratuitas.
          </p>
          {cfg?.endereco && <p className="text-muted-foreground">{cfg.endereco}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-medium">Institucional</span>
          <Link to="/a-casa" className="text-muted-foreground hover:text-foreground">A casa e transparência</Link>
          <Link to="/voluntariado" className="text-muted-foreground hover:text-foreground">Quero ser voluntário</Link>
          <Link to="/privacidade" className="text-muted-foreground hover:text-foreground">Privacidade</Link>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-medium">Contato</span>
          {cfg?.whatsapp_exibicao && <span className="text-muted-foreground select-all">WhatsApp {cfg.whatsapp_exibicao}</span>}
          {cfg?.email && <span className="text-muted-foreground select-all break-all">{cfg.email}</span>}
          {cfg?.instagram && <a href={cfg.instagram} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">Instagram</a>}
          {cfg?.youtube && <a href={cfg.youtube} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">YouTube</a>}
        </div>
      </div>
      <div className="border-t">
        <p className="container py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Lar de Seu Luiz · Organização religiosa sem fins lucrativos
        </p>
      </div>
    </footer>
  );
}

export function Secao({ id, titulo, eyebrow, intro, children, tom = "claro" }: {
  id?: string; titulo: string; eyebrow?: string; intro?: string; children: ReactNode; tom?: "claro" | "card";
}) {
  return (
    <section id={id} className={cn("py-16 scroll-mt-20", tom === "card" && "bg-card border-y")}>
      <div className="container flex flex-col gap-8">
        <div className="flex flex-col gap-2 max-w-2xl">
          {eyebrow && <span className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">{eyebrow}</span>}
          <h2 className="text-3xl md:text-4xl font-semibold leading-tight">{titulo}</h2>
          {intro && <p className="text-muted-foreground text-lg">{intro}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
