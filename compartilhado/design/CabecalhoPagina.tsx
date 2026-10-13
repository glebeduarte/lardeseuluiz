import type { ComponentType, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import "./lsl-moldura.css";

// Cabeçalho padrão das páginas internas (igual ao da Governança): título em Playfair, descrição e ações à direita.
export function CabecalhoPagina({ titulo, descricao, acoes, voltar, Link }: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  /** Link "voltar" acima do título. */
  voltar?: { href: string; rotulo: string };
  /** Link do roteador do app (se não vier, usa <a>). */
  Link?: ComponentType<{ href: string; className: string; children: ReactNode }>;
}) {
  const L = Link ?? (({ href, className, children }: { href: string; className: string; children: ReactNode }) => <a href={href} className={className}>{children}</a>);
  return (
    <div className="lsl-cabecalho">
      <div style={{ minWidth: 0 }}>
        {voltar && <L href={voltar.href} className="lsl-cabecalho__voltar"><ArrowLeft />{voltar.rotulo}</L>}
        <h1 className="lsl-cabecalho__titulo">{titulo}</h1>
        {descricao && <p className="lsl-cabecalho__descricao">{descricao}</p>}
      </div>
      {acoes && <div className="lsl-cabecalho__acoes">{acoes}</div>}
    </div>
  );
}
