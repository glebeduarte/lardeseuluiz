import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { BarraSistemas, iniciaisLsl, type AreasLsl, type SistemaLsl } from "./BarraSistemas";
import "./lsl-moldura.css";

// Moldura única das áreas logadas: barra de sistemas no topo, barra lateral azul da Governança e o conteúdo.
// Cada app só informa os itens do seu menu e como abrir um link interno.

export interface ItemMenuLsl {
  href: string;
  rotulo: string;
  icone: ComponentType<{ className?: string }>;
  /** Link para outra área (recarrega a página). */
  externo?: boolean;
  selo?: number | string | null;
}
export interface GrupoMenuLsl { rotulo?: string; itens: ItemMenuLsl[] }

export interface LinkLslProps { href: string; className: string; title?: string; onClick?: () => void; children: ReactNode }

export interface MolduraSistemaProps {
  sistema: SistemaLsl;
  /** Nome da área na barra lateral, ex.: "Governança". */
  titulo: string;
  subtitulo?: string;
  iconeSistema: ComponentType<{ className?: string }>;
  grupos: GrupoMenuLsl[];
  /** Diz se um item está ativo (o app conhece a rota atual). */
  ativo: (href: string) => boolean;
  /** Link do roteador do app para itens internos. */
  Link: ComponentType<LinkLslProps>;
  areas: AreasLsl | null;
  usuario: { nome: string; papel?: string; foto?: string | null };
  aoAbrirPerfil?: () => void;
  aoSair: () => void;
  /** Botões extras no rodapé da barra lateral (ex.: Visualizar como). Recebe se está recolhida. */
  rodape?: (recolhida: boolean) => ReactNode;
  /** Faixas acima do conteúdo (simulação, avisos). */
  avisos?: ReactNode;
  /** Itens à direita da barra de sistemas (ex.: sino de avisos). */
  extraBarra?: ReactNode;
  navegar?: (href: string) => boolean;
  larguraTotal?: boolean;
  versao?: string;
  children: ReactNode;
}

const CHAVE_RECOLHIDA = "lsl:lateral-recolhida";

export function MolduraSistema(p: MolduraSistemaProps) {
  const [recolhida, setRecolhida] = useState(() => {
    try { return localStorage.getItem(CHAVE_RECOLHIDA) === "1"; } catch { return false; }
  });
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(CHAVE_RECOLHIDA, recolhida ? "1" : "0"); } catch { /* sem armazenamento */ }
  }, [recolhida]);

  const fechar = () => setAberta(false);
  const Icone = p.iconeSistema;
  const L = p.Link;

  return (
    <>
      <BarraSistemas atual={p.sistema} areas={p.areas} nome={p.usuario.nome} foto={p.usuario.foto}
        menuAberto={aberta} aoAlternarMenu={() => setAberta((v) => !v)} navegar={p.navegar} extra={p.extraBarra} />

      <div className={`lsl-sombra${aberta ? " lsl-sombra--aberta" : ""}`} onClick={fechar} />

      <aside className={`lsl-lateral${recolhida ? " lsl-lateral--recolhida" : ""}${aberta ? " lsl-lateral--aberta" : ""}`}>
        <div className="lsl-lateral__topo">
          <div className="lsl-lateral__icone-sistema"><Icone /></div>
          {!recolhida && (
            <div className="lsl-lateral__sistema">
              <strong>{p.titulo}</strong>
              <small>{p.subtitulo ?? "Lar de Seu Luiz"}</small>
            </div>
          )}
        </div>

        <button type="button" className="lsl-lateral__usuario" onClick={() => { fechar(); p.aoAbrirPerfil?.(); }} title="Abrir meu perfil"
          style={recolhida ? { justifyContent: "center", padding: "12px 8px" } : undefined}>
          <span className="lsl-avatar">{p.usuario.foto ? <img src={p.usuario.foto} alt="" /> : iniciaisLsl(p.usuario.nome)}</span>
          {!recolhida && (
            <div>
              <strong>{p.usuario.nome}</strong>
              <small>{p.usuario.papel ? `${p.usuario.papel} · ` : ""}Ver perfil</small>
            </div>
          )}
        </button>

        <nav className="lsl-lateral__nav">
          {p.grupos.filter((g) => g.itens.length > 0).map((g, i) => (
            <div key={g.rotulo || i}>
              {!recolhida && g.rotulo && <div className="lsl-lateral__grupo-titulo">{g.rotulo}</div>}
              <div className="lsl-lateral__itens">
                {g.itens.map((item) => {
                  const IconeItem = item.icone;
                  const classe = `lsl-item${!item.externo && p.ativo(item.href) ? " lsl-item--ativo" : ""}`;
                  const conteudo = (
                    <>
                      <IconeItem />
                      {!recolhida && <span>{item.rotulo}</span>}
                      {!recolhida && item.selo ? <span className="lsl-item__selo">{item.selo}</span> : null}
                    </>
                  );
                  return item.externo ? (
                    <a key={item.href} href={item.href} className={classe} title={recolhida ? item.rotulo : undefined} onClick={fechar}>{conteudo}</a>
                  ) : (
                    <L key={item.href} href={item.href} className={classe} title={recolhida ? item.rotulo : undefined} onClick={fechar}>{conteudo}</L>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="lsl-lateral__rodape">
          {p.rodape?.(recolhida)}
          <button type="button" className="lsl-item" onClick={p.aoSair} title={recolhida ? "Sair" : undefined}>
            <LogOut /> {!recolhida && <span>Sair</span>}
          </button>
          <button type="button" className="lsl-item lsl-lateral__recolher" onClick={() => setRecolhida((v) => !v)} title={recolhida ? "Expandir" : undefined}>
            {recolhida ? <ChevronsRight /> : <><ChevronsLeft /><span>Recolher</span></>}
          </button>
          {!recolhida && <div className="lsl-lateral__versao">Centro Espiritualista<br />Lar de Seu Luiz{p.versao ? ` · ${p.versao}` : ""}</div>}
        </div>
      </aside>

      <div className={`lsl-corpo${recolhida ? " lsl-corpo--recolhida" : ""}`}>
        {p.avisos}
        <main className={`lsl-conteudo${p.larguraTotal ? " lsl-conteudo--total" : ""}`}>{p.children}</main>
      </div>
    </>
  );
}

/** Página só com a barra de sistemas, sem barra lateral (ex.: perfil para quem não é da gestão). */
export function MolduraSimples({ sistema, areas, usuario, navegar, children, avisos }: {
  sistema: SistemaLsl; areas: AreasLsl | null; usuario?: { nome?: string | null; foto?: string | null };
  navegar?: (href: string) => boolean; children: ReactNode; avisos?: ReactNode;
}) {
  return (
    <>
      <BarraSistemas atual={sistema} areas={areas} nome={usuario?.nome} foto={usuario?.foto} navegar={navegar} />
      <div className="lsl-corpo lsl-corpo--sem-lateral">
        {avisos}
        <main className="lsl-conteudo">{children}</main>
      </div>
    </>
  );
}
