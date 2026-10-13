import { motion } from "framer-motion";
import feijoadaAsset from "@/assets/feijoada-event.jpg.asset.json";
import diaCriancasAsset from "@/assets/dia-criancas-event.jpg.asset.json";
import natalCriancasAsset from "@/assets/natal-criancas-event.jpg.asset.json";
import saudeLarAsset from "@/assets/saude-lar-event.jpg.asset.json";
import sopaAsset from "@/assets/sopa-solidaria.jpg.asset.json";
import { Heart, ArrowRight } from "lucide-react";

const eventos = [
  {
    image: feijoadaAsset.url,
    name: "Feijoada do Lar de Seu Luiz",
    desc: "Evento gastronômico e solidário com opções tradicional e vegana. Toda a renda é revertida para os projetos sociais da casa.",
    tags: ["Solidário", "Vegana e tradicional", "Renda revertida"],
    action: "Saber mais",
  },
  {
    image: sopaAsset.url,
    name: "Sopa Solidária",
    desc: "Nas terças-feiras, um grupo de voluntários prepara cerca de 100 sopas para serem distribuídas na comunidade local, semanalmente. Você também pode fazer parte deste grupo.",
    tags: ["Ação social", "Comunidade", "Terças"],
    action: "Saber mais",
  },
  {
    image: diaCriancasAsset.url,
    name: "Dia das Crianças",
    desc: "Celebração especial para as crianças da comunidade com brincadeiras, lanches, presentes e muita alegria fraternal.",
    tags: ["Ação social", "Comunidade"],
    action: "Saber mais",
  },
  {
    image: natalCriancasAsset.url,
    name: "Natal das Crianças",
    desc: "Evento natalino com distribuição de presentes, lanches e atividades lúdicas para crianças em situação de vulnerabilidade.",
    tags: ["Natal solidário", "Presentes", "Comunidade"],
    action: "Saber mais",
  },
  {
    image: saudeLarAsset.url,
    name: "Saúde no Lar",
    desc: "Ação de saúde e bem-estar com atendimentos, orientação e cuidados voltados à comunidade local.",
    tags: ["Saúde", "Bem-estar", "Gratuito"],
    action: "Saber mais",
  },
];

const SectionEventos = () => (
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
          key={e.name}
          className="site-evento-card"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: (i + 1) * 0.1 }}
        >
          <div
            className="site-evento-card__cover"
            style={{
              backgroundImage: `url(${e.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-label={e.name}
          />
          <div className="site-evento-card__body">
            <div className="site-evento-card__name">{e.name}</div>
            <div className="site-evento-card__desc">{e.desc}</div>
            <div className="site-evento-card__tags">
              {e.tags.map((t) => (
                <span key={t} className="site-tag-pill">{t}</span>
              ))}
            </div>
            <a href="#contato" className="site-evento-card__action" style={{ marginTop: 16 }}>
              {e.action} <ArrowRight size={14} />
            </a>
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

export default SectionEventos;
