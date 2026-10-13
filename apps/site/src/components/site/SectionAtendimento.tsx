import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import iconDialogo from "@/assets/icon-dialogo.png";
import iconPasses from "@/assets/icon-passes.png";
import iconCura from "@/assets/icon-cura.png";
import iconDesobsessao from "@/assets/icon-desobsessao.png";

const atendimentos = [
  {
    icon: iconDialogo,
    name: "Diálogo Fraterno",
    desc: "Espaço de escuta ativa e acolhimento. O Diálogo Fraterno é o ponto de partida para toda pessoa que busca atendimento no Lar. Em sigilo e fraternidade, você é ouvido, orientado e encaminhado para o serviço mais adequado às suas necessidades.",
    badge: "primeiro-passo",
    badgeLabel: "Primeiro Passo",
    highlight: true,
    iconBg: "hsl(209, 72%, 38%)",
  },
  {
    icon: iconPasses,
    name: "Passes",
    desc: "Atendimento espiritual com imposição de mãos, realizado por médiuns devidamente preparados. Promove equilíbrio e alívio espiritual.",
    badge: "gratuito",
    badgeLabel: "Gratuito",
    iconBg: "hsl(0, 60%, 40%)",
  },
  {
    icon: iconCura,
    name: "Tratamento Espiritual",
    desc: "Atendimento espiritual individualizado com trabalho mediúnico de equilíbrio e harmonização, realizado em ambiente adequado e com equipe preparada.",
    badge: "agendado",
    badgeLabel: "Agendado",
    iconBg: "hsl(178, 62%, 30%)",
  },
  {
    icon: iconDesobsessao,
    name: "Atendimento de Desobsessão",
    desc: "Trabalho mediúnico especializado realizado pela equipe da Secretaria Mediúnica para equilíbrio e harmonização espiritual do perispírito.",
    badge: "agendado",
    badgeLabel: "Com avaliação",
    iconBg: "hsl(45, 100%, 48%)",
  },
];

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" as const },
  transition: { duration: 0.7, delay },
});

const SectionAtendimento = () => (
  <section className="site-atendimento" id="atendimento">
    <div className="site-atendimento__inner">
      <motion.div {...reveal()}>
        <div className="site-tag site-tag--light">
          <span className="site-tag__bar" />
          Para Você que Busca Ajuda
        </div>
        <h2 className="site-atendimento__title">Atendimentos da Casa</h2>
        <p className="site-atendimento__sub">
          Todos os atendimentos são gratuitos e abertos a qualquer pessoa — sem distinção de religião, raça ou condição social. Você se cadastra e recebe orientação sobre como e quando ser atendido.
        </p>
      </motion.div>

      <div className="site-atendimento__grid">
        {atendimentos.map((a, i) => (
          <motion.div
            key={a.name}
            className={`site-atend-card ${a.highlight ? "site-atend-card--highlight" : ""}`}
            {...reveal((i + 1) * 0.1)}
          >
            <div
              className="site-atend-card__icon"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: `${a.iconBg}14`,
                border: `2px solid ${a.iconBg}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <img
                src={a.icon}
                alt={a.name}
                style={{ width: 32, height: 32, objectFit: "contain" }}
              />
            </div>
            <div className="site-atend-card__name">{a.name}</div>
            <div className="site-atend-card__desc">{a.desc}</div>
            <span className={`site-atend-card__badge site-atend-card__badge--${a.badge}`}>
              {a.badgeLabel}
            </span>
            <Link to="/atendimentos" className="site-atend-card__link">
              Saiba como funciona →
            </Link>
          </motion.div>
        ))}
      </div>

      <motion.div className="site-atend-cta" {...reveal()}>
        <div className="site-atend-cta__text-block">
          <div className="site-atend-cta__title">
            Todos os atendimentos começam pelo Diálogo Fraterno.
          </div>
          <div className="site-atend-cta__text">
            Venha nos visitar nos dias de trabalho — o atendimento é por ordem de chegada, gratuito e sem necessidade de agendamento prévio.
          </div>
        </div>
        <Link to="/atendimentos" className="site-btn-inscricao">
          Quero receber atendimento →
        </Link>
      </motion.div>
    </div>
  </section>
);

export default SectionAtendimento;
