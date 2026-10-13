import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import SitePage from "@/components/site/SitePage";
import { useProjeto } from "@/lib/site-dados";
import ProximasEdicoes from "@/components/site/ProximasEdicoes";

const WHATSAPP = "5584991432639";

const Projeto = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: p, isLoading } = useProjeto(slug);

  if (isLoading) {
    return <SitePage documento="Ações sociais" tag="Ações Sociais" titulo="Carregando…"><div className="pg-secao" /></SitePage>;
  }
  if (!p) {
    return (
      <SitePage documento="Ações sociais" tag="Ações Sociais" titulo="Ação não encontrada">
        <section className="pg-secao pg-secao--clara"><div className="pg-secao__inner"><a href="/#eventos" className="ds-btn ds-btn-outline">Ver todas as ações sociais</a></div></section>
      </SitePage>
    );
  }

  const texto = p.content || p.description || p.summary || "";
  const msg = encodeURIComponent(`Olá! Gostaria de participar da ação "${p.name}" do Lar de Seu Luiz.`);

  return (
    <SitePage documento={p.name} tag="Ações Sociais" titulo={p.name} intro={p.summary ?? undefined}>
      <section className="pg-secao pg-secao--clara">
        <div className="pg-secao__inner pg-secao__inner--estreito">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {p.cover_url && <img src={p.cover_url} alt={p.name} className="pg-capa" />}
            <div className="site-evento-card__tags" style={{ marginBottom: 24 }}>
              {p.schedule && <span className="site-tag-pill">🗓️ {p.schedule}</span>}
              {p.tags.map((t) => <span key={t} className="site-tag-pill">{t}</span>)}
            </div>
            <div className="pg-texto">{texto.split(/\n{2,}/).map((par, i) => <p key={i}>{par}</p>)}</div>
            <ProximasEdicoes projetoId={p.id} slug={p.slug} />
          </motion.div>
        </div>
      </section>

      <section className="atd-cta-final">
        <div className="atd-cta-final__inner">
          <h2 className="atd-cta-final__title">Quer participar?</h2>
          <p className="atd-cta-final__sub">Toda a arrecadação volta para a comunidade. Você pode ajudar como voluntário, doando ou divulgando.</p>
          {p.accepts_volunteers && (
            <Link to={`/voluntariado`} className="atd-cta-final__btn" style={{ marginRight: 12 }}>Quero ser voluntário →</Link>
          )}
          <a href={`https://wa.me/${WHATSAPP}?text=${msg}`} target="_blank" rel="noopener noreferrer" className="atd-cta-final__btn">Falar pelo WhatsApp</a>
        </div>
      </section>
    </SitePage>
  );
};

export default Projeto;
