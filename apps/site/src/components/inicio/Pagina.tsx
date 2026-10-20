import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import CookieBanner from "@/components/site/CookieBanner";
import jardim from "@/assets/hero-bg.jpg";
import "./inicio.css";
import "./paginas.css";

// Peças das páginas internas do site, no mesmo desenho da página inicial:
// o cartão com o sol do logo ao lado de uma foto, seções com título e explicação lado a lado,
// listas com marcadores em forma de sol e o convite final em azul.

export const surgir = (atraso = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" as const },
  transition: { duration: 0.6, delay: atraso, ease: [0.22, 1, 0.36, 1] as const },
});

export function PaginaSite({ documento, titulo, intro, foto, fotoAlt, acoes, children }: {
  documento: string; titulo: string; intro?: ReactNode; foto?: string | null; fotoAlt?: string; acoes?: ReactNode; children: ReactNode;
}) {
  useEffect(() => {
    document.title = `${documento} | Lar de Seu Luiz`;
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [documento]);

  return (
    <div className="site-root ini-pagina">
      <SiteNav solida />
      <main className="ini">
        <section className="ini-cabeca" aria-labelledby="ini-pagina-titulo">
          <motion.div className="ini-cabeca__cartao" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="ini-sol ini-cabeca__sol" aria-hidden="true" />
            <h1 id="ini-pagina-titulo" className="ini-display ini-display--pagina">{titulo}</h1>
            {intro && <p className="ini-cabeca__intro">{intro}</p>}
            {acoes && <div className="ini-cabeca__acoes">{acoes}</div>}
          </motion.div>
          <div className="ini-cabeca__foto">
            <img src={foto || jardim} alt={fotoAlt ?? "O jardim do Lar de Seu Luiz"} width={1200} height={800} />
          </div>
        </section>
        {children}
      </main>
      <SiteFooter />
      <CookieBanner />
    </div>
  );
}

export function Secao({ id, titulo, intro, fundo = "chao", children, estreita }: {
  id?: string; titulo: string; intro?: ReactNode; fundo?: "chao" | "papel" | "teal-claro"; children?: ReactNode; estreita?: boolean;
}) {
  return (
    <section id={id} className={`ini-secao ini-secao--${fundo}`} aria-label={titulo}>
      <div className={`ini-secao__cabeca${intro ? "" : " ini-secao__cabeca--so"}`}>
        <motion.h2 className="ini-titulo" {...surgir()}>{titulo}</motion.h2>
        {intro && <motion.div className="ini-corpo" {...surgir(0.08)}>{intro}</motion.div>}
      </div>
      {children && <div className={estreita ? "ini-secao__corpo ini-secao__corpo--estreito" : "ini-secao__corpo"}>{children}</div>}
    </section>
  );
}

export type ItemSol = { id: string; marca: ReactNode; titulo: ReactNode; lado?: ReactNode; texto?: ReactNode; destaque?: boolean; extra?: ReactNode };

export function ListaSol({ itens, colunas = 2 }: { itens: ItemSol[]; colunas?: 1 | 2 }) {
  return (
    <ul className={`ini-lista${colunas === 1 ? " ini-lista--uma" : ""}`}>
      {itens.map((x, i) => (
        <motion.li key={x.id} className="ini-lista__item" {...surgir(Math.min(i, 6) * 0.04)}>
          <span className={`ini-lista__sol${x.destaque ? " ini-lista__sol--hoje" : ""}`} aria-hidden="true">{x.marca}</span>
          <div>
            <div className="ini-lista__linha">
              <strong>{x.titulo}</strong>
              {x.lado && <span>{x.lado}</span>}
            </div>
            {x.texto && <p>{x.texto}</p>}
            {x.extra}
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

export function ConviteFinal({ titulo, texto, botao, para, externo, extra, foto, fotoAlt }: {
  titulo: string; texto: ReactNode; botao: string; para: string; externo?: boolean; extra?: ReactNode; foto?: string; fotoAlt?: string;
}) {
  return (
    <section className="ini-final" aria-label={titulo}>
      <div className="ini-final__foto">
        <img src={foto ?? jardim} alt={fotoAlt ?? "O jardim do Lar de Seu Luiz"} width={800} height={800} loading="lazy" />
      </div>
      <motion.div className="ini-final__texto" {...surgir()}>
        <h2 className="ini-titulo">{titulo}</h2>
        <p className="ini-corpo">{texto}</p>
        <div className="ini-final__botoes">
          {externo
            ? <a href={para} className="ini-botao ini-botao--ouro" target="_blank" rel="noopener noreferrer">{botao}</a>
            : <Link to={para} className="ini-botao ini-botao--ouro">{botao}</Link>}
          {extra}
        </div>
      </motion.div>
    </section>
  );
}
