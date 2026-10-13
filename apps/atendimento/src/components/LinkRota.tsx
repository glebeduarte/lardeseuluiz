import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

// Link do TanStack Router para o "voltar" do CabecalhoPagina (respeita o basepath /atendimento).
export function LinkRota({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}
