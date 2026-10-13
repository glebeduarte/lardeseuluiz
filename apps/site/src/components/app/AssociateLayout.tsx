import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MolduraSistema, useAreasLsl, type LinkLslProps } from "@/compartilhado";
import { LayoutDashboard, DollarSign, Vote, Shield, Crown, UserRound } from "lucide-react";

const LinkRR = ({ href, className, title, onClick, children }: LinkLslProps) => (
  <Link to={href} className={className} title={title} onClick={onClick}>{children}</Link>
);

/** Portal do associado na moldura única da plataforma. */
export default function AssociateLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const areas = useAreasLsl(supabase, user?.id);

  const navegar = (href: string) => {
    if (href.startsWith("/formacao") || href.startsWith("/atendimento")) return false;
    navigate(href);
    return true;
  };

  return (
    <MolduraSistema
      sistema="governanca" titulo="Portal do Associado" subtitulo="Lar de Seu Luiz" iconeSistema={Crown}
      grupos={[{
        rotulo: "Associado",
        itens: [
          { href: "/meu-painel", rotulo: "Meu painel", icone: LayoutDashboard },
          { href: "/meu-painel/contribuicoes", rotulo: "Contribuições", icone: DollarSign },
          { href: "/meu-painel/assembleias", rotulo: "Assembleias", icone: Vote },
          { href: "/meu-painel/meus-dados", rotulo: "Meus dados e LGPD", icone: Shield },
          { href: "/app/perfil", rotulo: "Meu perfil", icone: UserRound },
        ],
      }]}
      ativo={(href) => (href === "/meu-painel" ? pathname === href : pathname.startsWith(href))}
      Link={LinkRR} areas={areas} navegar={navegar}
      usuario={{ nome: areas?.nome || user?.email?.split("@")[0] || "", papel: "Associado", foto: areas?.foto }}
      aoAbrirPerfil={() => navigate("/app/perfil")}
      aoSair={async () => { await signOut(); navigate("/login"); }}
    >
      {children}
    </MolduraSistema>
  );
}
