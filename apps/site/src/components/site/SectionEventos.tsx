import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, ArrowRight } from "lucide-react";
import { useProjetos } from "@/lib/site-dados";



const SectionEventos = () => {
  const { data: eventos = [] } = useProjetos();
  return (
  <section className="site-eventos" id="eventos">
    <motion.div
      className="site-section-header"
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
    >
      <div className="site-tag site-tag--teal">
        <span className="site-tag__bar" />
        Faça Parte
      </div>
      <h2 className="site-section-title">Eventos & Ações Sociais</h2>
      <p className="site-section-sub">
        Como instituição sem fins lucrativos, toda nossa arrecadação retorna à comunidade. Participe e ajude a transformar vidas.
      </p>
    </motion.div>

    <div className="site-eventos__grid">
      {eventos.map((e, i) => (
        <motion.div
          key={e.id}
          className="site-evento-card"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: (i + 1) * 0.1 }}
        >
          <div
            className="site-evento-card__cover"
            style={{
              backgroundImage: e.cover_url ? `url(${e.cover_url})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-label={e.name}
          />
          <div className="site-evento-card__body">
            <div className="site-evento-card__name">{e.name}</div>
            <div className="site-evento-card__desc">{e.summary ?? e.description}</div>
            <div className="site-evento-card__tags">
              {e.tags.map((t) => (
                <span key={t} className="site-tag-pill">{t}</span>
              ))}
            </div>
            <Link to={`/projetos/${e.slug}`} className="site-evento-card__action" style={{ marginTop: 16 }}>
              Saber mais <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      ))}
    </div>

    <motion.div
      className="site-eventos-cta"
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
    >
      <div className="site-eventos-cta__icon">
        <Heart size={40} strokeWidth={1.5} />
      </div>
      <div className="site-eventos-cta__content">
        <div className="site-eventos-cta__title">
          "Fora da caridade não há salvação."
        </div>
        <div className="site-eventos-cta__sub">— Allan Kardec</div>
        <div className="site-eventos-cta__text">
          Cada gesto de amor transforma vidas — inclusive a sua. Participe dos nossos eventos, doe seu tempo, compartilhe sua energia. Juntos, fazemos a diferença.
        </div>
      </div>
      <a href="https://wa.me/5584991432639?text=Olá!%20Gostaria%20de%20participar%20dos%20eventos%20e%20ações%20sociais%20do%20Lar%20de%20Seu%20Luiz." className="site-eventos-cta__btn" target="_blank" rel="noopener noreferrer">
        Quero Participar
      </a>
    </motion.div>
  </section>
  );
};

export default SectionEventos;
