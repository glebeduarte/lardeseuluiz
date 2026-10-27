// Cópia gerada por scripts/sincronizar-compartilhado.mjs. Edite em compartilhado/design.
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Globe, Landmark, GraduationCap, HeartPulse, LogOut, Menu, UserRound, X } from "lucide-react";
import logo from "./logo-lsl.png";

// Barra fina no topo de todas as áreas logadas: Site, Governança, Formação, Atendimento e Meu perfil.
// Mostra só as áreas que a conta pode abrir (função public.minhas_areas no banco).

export type SistemaLsl = "site" | "governanca" | "formacao" | "atendimento" | "perfil";

export interface AreasLsl {
  logado: boolean;
  governanca?: boolean;
  gestao?: boolean;
  formacao?: boolean;
  formacao_admin?: boolean;
  atendimento?: boolean;
  /** Pessoa marcada como voluntário da Casa. */
  voluntario?: boolean;
  /** Administrador geral da Governança. */
  admin?: boolean;
  nome?: string | null;
  foto?: string | null;
}

// O cliente Supabase de cada app tem tipos próprios; aqui só usamos schema("public").rpc("minhas_areas").
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClienteSupabase = any;

const CHAVE = "lsl:areas";

export function useAreasLsl(cliente: ClienteSupabase, usuarioId?: string | null) {
  const [areas, setAreas] = useState<AreasLsl | null>(() => {
    try {
      const salvo = sessionStorage.getItem(CHAVE);
      const v = salvo ? JSON.parse(salvo) : null;
      return v && v.usuario === usuarioId ? (v.areas as AreasLsl) : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (!usuarioId) return;
    let vivo = true;
    cliente.schema("public").rpc("minhas_areas").then(({ data }: { data: AreasLsl | null }) => {
      if (!vivo || !data) return;
      setAreas(data as AreasLsl);
      try { sessionStorage.setItem(CHAVE, JSON.stringify({ usuario: usuarioId, areas: data })); } catch { /* sem armazenamento */ }
    });
    return () => { vivo = false; };
  }, [cliente, usuarioId]);
  return areas;
}

export function iniciaisLsl(nome?: string | null) {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : partes[0]?.[1] ?? "")).toUpperCase() || "?";
}

export interface BarraSistemasProps {
  atual: SistemaLsl;
  areas: AreasLsl | null;
  /** Nome e foto mostrados no botão do perfil (se não vier, usa o que veio do banco). */
  nome?: string | null;
  foto?: string | null;
  /** Abre e fecha a barra lateral no celular. */
  menuAberto?: boolean;
  aoAlternarMenu?: () => void;
  /** Navegação interna do app atual (evita recarregar a página). Retorne true se tratou o link. */
  navegar?: (href: string) => boolean;
  extra?: ReactNode;
  /** Quando vem, o botão do perfil abre um menu com "Meu perfil" e "Sair". */
  aoSair?: () => void;
}

export function BarraSistemas({ atual, areas, nome, foto, menuAberto, aoAlternarMenu, navegar, extra, aoSair }: BarraSistemasProps) {
  const [menuPerfil, setMenuPerfil] = useState(false);
  useEffect(() => {
    if (!menuPerfil) return;
    const fechar = (e: Event) => { if (!(e.target as HTMLElement)?.closest?.(".lsl-barra__perfil-area")) setMenuPerfil(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuPerfil(false); };
    document.addEventListener("pointerdown", fechar);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fechar); document.removeEventListener("keydown", esc); };
  }, [menuPerfil]);
  const abas: { id: SistemaLsl; rotulo: string; curto: string; href: string; icone: typeof Globe; mostrar: boolean }[] = [
    { id: "site", rotulo: "Site", curto: "Site", href: "/", icone: Globe, mostrar: true },
    { id: "governanca", rotulo: "Governança", curto: "Gestão", href: "/app", icone: Landmark, mostrar: !!areas?.governanca },
    { id: "formacao", rotulo: "Formação", curto: "Cursos", href: areas?.formacao_admin ? "/formacao/admin" : "/formacao/dashboard", icone: GraduationCap, mostrar: areas?.formacao !== false },
    { id: "atendimento", rotulo: "Atendimento", curto: "Macas", href: "/atendimento/", icone: HeartPulse, mostrar: !!areas?.atendimento },
  ];
  const clicar = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (navegar?.(href)) e.preventDefault();
  };
  const nomeExibido = nome || areas?.nome || "Meu perfil";
  const fotoExibida = foto ?? areas?.foto;

  return (
    <header className="lsl-barra" role="navigation" aria-label="Sistemas do Lar de Seu Luiz">
      {aoAlternarMenu && (
        <button type="button" className="lsl-barra__menu" onClick={aoAlternarMenu} aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}>
          {menuAberto ? <X size={21} /> : <Menu size={21} />}<em>Menu</em>
        </button>
      )}
      <a href="/" className="lsl-barra__marca" onClick={clicar("/")}>
        <img src={logo} alt="" />
        <span>Lar de Seu Luiz</span>
      </a>
      <nav className="lsl-barra__abas">
        {abas.filter((a) => a.mostrar || a.id === atual).map((a) => {
          const Icone = a.icone;
          return (
            <a key={a.id} href={a.href} onClick={clicar(a.href)} title={a.rotulo}
              className={`lsl-barra__aba${a.id === atual ? " lsl-barra__aba--ativa" : ""}`} aria-current={a.id === atual ? "page" : undefined}>
              <Icone /><span>{a.rotulo}</span><em>{a.curto}</em>
            </a>
          );
        })}
      </nav>
      <div className="lsl-barra__fim">
        {extra}
        {aoSair ? (
          <div className="lsl-barra__perfil-area">
            <button type="button" onClick={() => setMenuPerfil((v) => !v)} aria-expanded={menuPerfil} aria-haspopup="menu"
              className={`lsl-barra__perfil${atual === "perfil" ? " lsl-barra__perfil--ativo" : ""}`} title="Meu perfil e sair">
              <span className="lsl-avatar">{fotoExibida ? <img src={fotoExibida} alt="" /> : iniciaisLsl(nomeExibido)}</span>
              <span>Meu perfil</span>
              <em>Perfil</em>
            </button>
            {menuPerfil && (
              <div className="lsl-barra__perfil-menu" role="menu">
                <div className="lsl-barra__perfil-nome">{nomeExibido}</div>
                <a href="/app/perfil" role="menuitem" onClick={(e) => { setMenuPerfil(false); clicar("/app/perfil")(e); }}><UserRound />Meu perfil</a>
                <button type="button" role="menuitem" onClick={() => { setMenuPerfil(false); aoSair(); }}><LogOut />Sair</button>
              </div>
            )}
          </div>
        ) : (
          <a href="/app/perfil" onClick={clicar("/app/perfil")} className={`lsl-barra__perfil${atual === "perfil" ? " lsl-barra__perfil--ativo" : ""}`} title="Meu perfil">
            <span className="lsl-avatar">{fotoExibida ? <img src={fotoExibida} alt="" /> : iniciaisLsl(nomeExibido)}</span>
            <span>Meu perfil</span>
            <em>Perfil</em>
          </a>
        )}
      </div>
    </header>
  );
}
