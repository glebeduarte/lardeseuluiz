import { motion } from "framer-motion";
import iconFe from "@/assets/icon-fe-racional.png";
import iconPasses from "@/assets/icon-passes.png";
import iconEvolucao from "@/assets/icon-evolucao.png";
import iconUniversalidade from "@/assets/icon-universalidade.png";

const pillars = [
  { icon: iconFe, name: "Fé Racional", desc: "Estudo e prática do Espiritismo à luz da ciência, filosofia e religião" },
  { icon: iconPasses, name: "Caridade Ativa", desc: "Amor ao próximo expresso em obras concretas de amparo e serviço" },
  { icon: iconEvolucao, name: "Reforma Íntima", desc: "Despertar da consciência para o autocuidado e evolução espiritual" },
  { icon: iconUniversalidade, name: "Ação Social", desc: "Projetos comunitários voltados a famílias em vulnerabilidade social" },
];

const finalidades = [
  { num: "I", color: "b", text: <><strong>Estudo e difusão do Espiritismo</strong> — promover a pesquisa, prática e divulgação dos ensinamentos de Jesus, baseados na Codificação de Allan Kardec.</> },
  { num: "II", color: "t", text: <><strong>Formação espiritual e comunicação</strong> — atividades espiritualistas cristãs que visem à transformação moral da humanidade e valorização do ser humano.</> },
  { num: "III", color: "g", text: <><strong>Despertar da consciência</strong> — tratamento por meio da autocompreensão, reforma íntima e autocuidado espiritual.</> },
  { num: "IV", color: "r", text: <><strong>Ação social comunitária</strong> — atividades educacionais, culturais, de saúde e campanhas para famílias em vulnerabilidade, inspiradas nos princípios da caridade cristã.</> },
];

const reveal = (delay = 0, direction: "up" | "left" = "up") => ({
  initial: { opacity: 0, ...(direction === "left" ? { x: -40 } : { y: 36 }) },
  whileInView: { opacity: 1, x: 0, y: 0 },
  viewport: { once: true, margin: "-40px" as const },
  transition: { duration: 0.7, delay },
});

const SectionMissao = () => (
  <section className="site-missao" id="missao">
    <div className="site-missao__inner">
      <div className="site-missao__grid">
        {/* Left */}
        <div>
          <motion.div {...reveal()}>
            <div className="site-tag site-tag--dark">
              <span className="site-tag__bar" />
              Nossa Razão de Existir
            </div>
            <h2 className="site-missao__title">
              A <em>Missão</em> da Casa
            </h2>
          </motion.div>

          <motion.div {...reveal(0.1)}>
            <p className="site-missao__text">
              O Lar de Seu Luiz é uma casa espiritualista dedicada ao{" "}
              <strong>atendimento fraterno</strong>, por meio da explanação do Evangelho à
              luz dos ensinamentos de Jesus, visando esclarecer, orientar e amparar todos
              que buscam ajuda — seja por ensinamentos, passes, diálogos fraternos ou
              fluidificação da água.
            </p>
          </motion.div>

          <motion.div {...reveal(0.2)}>
            <blockquote className="site-missao__quote">
              "Levando a todos os consulentes o alívio de suas dores — sejam elas físicas,
              morais ou espirituais — sem distinção de raça, cor, credo ou condição social."
              <footer style={{ fontSize: ".8rem", marginTop: 8, fontStyle: "normal", opacity: 0.7 }}>
                — Estatuto Social do LSL, Art. 4°
              </footer>
            </blockquote>
          </motion.div>

          <motion.div className="site-missao__pillars" {...reveal(0.3)}>
            {pillars.map((p) => (
              <div key={p.name} className="site-pillar">
                <img src={p.icon} alt={p.name} style={{ width: 36, height: 36, objectFit: "contain" }} />
                <div className="site-pillar__name">{p.name}</div>
                <div className="site-pillar__desc">{p.desc}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right */}
        <div>
          <motion.div {...reveal(0, "left")}>
            <div className="site-finalidades__title">
              Nossas Finalidades — Art. 5° do Estatuto
            </div>
          </motion.div>
          {finalidades.map((f, i) => (
            <motion.div key={f.num} className="site-finalidade" {...reveal((i + 1) * 0.1, "left")}>
              <div className={`site-finalidade__num site-finalidade__num--${f.color}`}>{f.num}</div>
              <div className="site-finalidade__text">{f.text}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default SectionMissao;
