import { motion } from "framer-motion";
import SectionReveal from "./SectionReveal";

const secretarias = [
  { icon: "🧭", name: "Diretoria Geral", desc: "Coordenação executiva e estratégica da casa", gradient: "sec-icon-primary" },
  { icon: "🫂", name: "Acolhimento", desc: "Recepção, atendimento fraterno e orientação", gradient: "sec-icon-secondary" },
  { icon: "📖", name: "Formação", desc: "Pilar doutrinário e educativo do Lar", gradient: "sec-icon-accent" },
  { icon: "🎨", name: "Cultura e Artes", desc: "Música, arte e sensibilidade a serviço da espiritualidade", gradient: "sec-icon-destructive" },
  { icon: "🥳", name: "Social", desc: "Eventos, caridade e ações solidárias", gradient: "sec-icon-mint" },
  { icon: "🕊️", name: "Mediúnica", desc: "Reuniões mediúnicas, passes e atendimentos espirituais", gradient: "sec-icon-plum" },
  { icon: "🏗️", name: "Infraestrutura", desc: "Manutenção, patrimônio e logística", gradient: "sec-icon-slate" },
  { icon: "💰", name: "Financeira", desc: "Gestão financeira e prestação de contas", gradient: "sec-icon-emerald" },
  { icon: "📣", name: "Comunicação", desc: "Divulgação, redes sociais e identidade visual", gradient: "sec-icon-sky" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const SectionSecretarias = () => (
  <SectionReveal id="secretarias">
    <div className="site-container">
      <span className="site-section__badge">Nossa Casa</span>
      <h2 className="site-section__title">Secretarias e Áreas de Trabalho</h2>
      <p className="site-section__lead">
        Cada secretaria é um braço de serviço dedicado a manter nossa casa viva e acolhedora.
      </p>

      <motion.div
        className="sec-grid"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
      >
        {secretarias.map((s) => (
          <motion.article key={s.name} className="sec-card" variants={item}>
            <div className={`sec-icon ${s.gradient}`}>{s.icon}</div>
            <div className="sec-body">
              <div className="sec-name">{s.name}</div>
              <div className="sec-coord">{s.desc}</div>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </div>
  </SectionReveal>
);

export default SectionSecretarias;
