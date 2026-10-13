import { motion } from "framer-motion";

const horarios = [
  {
    variant: "terca",
    dia: "Terças-Feiras",
    atividade: "Tratamento Espiritual e Atendimento",
    desc: "Momento de acolhimento aberto ao público com diálogo fraterno, palestra, atendimento nas macas, passes individuais e fluidoterapia.",
    time: "🕐 14h às 18h30",
  },
  {
    variant: "gold",
    dia: "Quintas-Feiras • Online",
    atividade: "Estudo Doutrinário (ESDE)",
    desc: "Encontro dedicado ao estudo e aprofundamento da Doutrina Espírita, aberto a todos os trabalhadores da casa. Via Google Meet.",
    time: "🕐 19h30 às 21h",
  },
  {
    variant: "sexta",
    dia: "Sextas-Feiras",
    atividade: "Desobsessão e Atendimento Espiritual",
    desc: "Momento de acolhimento aberto ao público, com atendimentos de macas, diálogos fraternos, evangelho, palestra e passes.",
    time: "🕐 15h30 às 18h45",
  },
  {
    variant: "sabado",
    dia: "Sábados Quinzenais",
    atividade: "Tratamento Espiritual e Atendimento",
    desc: "Acolhimento aberto ao público com diálogo fraterno, palestra, atendimento nas macas, passes individuais e fluidoterapia.",
    time: "🕐 14h30 às 19h",
  },
  {
    variant: "terca",
    dia: "Sábados Mensais",
    atividade: "CaFÉ & AMor",
    desc: "Um canal sobre espiritualidade e psicologia voltado à expansão da consciência. Um espaço de diálogo entre mediunidade, autoconhecimento e maturidade emocional, integrando transformação e despertar.",
    time: "🕐 16h às 18h",
  },
];

const SectionHorarios = () => (
  <section className="site-horarios" id="horarios">
    <div className="site-horarios__inner">
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.7 }}
      >
        <div className="site-tag site-tag--light">
          <span className="site-tag__bar" />
          Quando Estamos Abertos
        </div>
        <h2 className="site-horarios__title">Programação Semanal</h2>
        <p className="site-horarios__sub">
          Todas as atividades públicas são abertas e gratuitas, conforme nossos princípios espíritas.
        </p>
      </motion.div>

      <div className="site-horarios__grid">
        {horarios.map((h, i) => (
          <motion.div
            key={h.atividade + h.dia}
            className={`site-horario-card site-horario-card--${h.variant}`}
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: (i + 1) * 0.1 }}
          >
            <div className="site-horario-card__dia">{h.dia}</div>
            <div className="site-horario-card__atividade">{h.atividade}</div>
            <div className="site-horario-card__desc">{h.desc}</div>
            <div className="site-horario-card__time">{h.time}</div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default SectionHorarios;
