import { useState } from "react";
import { NavLink } from "react-router-dom";
import { BookOpen, CalendarDays, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const ITENS = [
  { to: "/cursos", rotulo: "Cursos", icone: GraduationCap },
  { to: "/calendario/esde", rotulo: "Calendário do ESDE", icone: CalendarDays },
  { to: "/biblioteca", rotulo: "Biblioteca", icone: BookOpen },
];

/** Navegação entre as páginas públicas da Formação. */
export function FormacaoNav() {
  return (
    <nav aria-label="Formação" className="flex gap-1 overflow-x-auto border-b">
      {ITENS.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.to === "/cursos"} style={{ borderRadius: 0 }}
          className={({ isActive }) => cn(
            "flex items-center gap-2 whitespace-nowrap border-b-2 -mb-px px-3 py-2 text-sm",
            isActive ? "border-lsl-dourado text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
          )}>
          <i.icone className="h-4 w-4" aria-hidden /> {i.rotulo}
        </NavLink>
      ))}
    </nav>
  );
}

/** Capa do curso. Sem imagem cadastrada, usa uma capa com a identidade da casa. */
export function CapaCurso({ src, titulo, className }: { src?: string | null; titulo: string; className?: string }) {
  const [falhou, setFalhou] = useState(false);
  if (src && !falhou) return <img src={src} alt="" loading="lazy" onError={() => setFalhou(true)} className={cn("w-full object-cover bg-muted", className)} />;
  return (
    <div className={cn("relative w-full overflow-hidden bg-primary text-primary-foreground flex flex-col justify-end p-5", className)} aria-hidden>
      <img src="/logo-lsl.png" alt="" className="absolute right-4 top-4 h-12 w-auto rounded bg-white p-0.5 opacity-90" />
      <span className="h-1 w-12 bg-lsl-dourado mb-3" />
      <span className="font-display text-xl leading-snug line-clamp-2">{titulo}</span>
    </div>
  );
}
