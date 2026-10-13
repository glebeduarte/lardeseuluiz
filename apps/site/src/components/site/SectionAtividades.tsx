import { motion } from "framer-motion";
import SectionReveal from "./SectionReveal";

const atividades = [
  { icon: "📚", title: "Estudo Sistematizado", desc: "ESDE e grupos de estudo da Doutrina Espírita, abertos a todos os níveis." },
  { icon: "🙏", title: "Passes e Vibrações", desc: "Sessões de passe espiritual e prece coletiva para equilíbrio e renovação." },
  { icon: "👶", title: "Evangelização Infantil", desc: "Atividades lúdicas e educativas com base nos valores espíritas para crianças." },
  { icon: "💬", title: "Palestras Públicas", desc: "Palestras semanais sobre temas doutrinários, abertas à comunidade." },
  { icon: "🤲", title: "Diálogo Fraterno", desc: "Atendimento individual com escuta acolhedora e orientação espiritual." },
  { icon: "📖", title: "Grupo de Leitura", desc: "Leitura e reflexão coletiva das obras de Allan Kardec e autores espíritas." },
];

const SectionAtividades = () => (
  <SectionReveal id="atividades" className="site-section--light">
    <div className="site-container">
      <span className="site-section__badge">Atividades</span>
      <h2 className="site-section__title">O que fazemos</h2>
      <p className="site-section__lead">
        Reuniões, passes, evangelização e cursos — tudo com amor e dedicação ao próximo.
      </p>

      <div className="site-activities-grid">
        {atividades.map((a, i) => (
          <motion.div
            key={a.title}
            className="site-activity-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <span className="site-activity-card__icon">{a.icon}</span>
            <h3>{a.title}</h3>
            <p>{a.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </SectionReveal>
);

export default SectionAtividades;
