import { motion } from "framer-motion";
import iconEtica from "@/assets/icon-etica.png";
import iconGratuidade from "@/assets/icon-gratuidade.png";
import iconUniversalidade from "@/assets/icon-universalidade.png";
import iconFeRacional from "@/assets/icon-fe-racional.png";
import iconEvolucao from "@/assets/icon-evolucao.png";
import iconIndependencia from "@/assets/icon-independencia.png";

const valores = [
  { icon: iconEtica, title: "Ética e Transparência", desc: "Relatórios financeiros publicados, assembleias abertas e prestação de contas regular." },
  { icon: iconGratuidade, title: "Gratuidade Total", desc: "Toda atividade doutrinária, espiritual e social é gratuita, conforme princípio espírita." },
  { icon: iconUniversalidade, title: "Universalidade", desc: "Atendemos a todos sem distinção de raça, cor, credo ou classe social." },
  { icon: iconFeRacional, title: "Fé Racional", desc: "Estudo baseado na tríplice aspecto: ciência, filosofia e religião." },
  { icon: iconEvolucao, title: "Evolução Contínua", desc: "Aperfeiçoamento moral como caminho para a paz individual e coletiva." },
  { icon: iconIndependencia, title: "Independência", desc: "Preservamos nossa independência administrativa e missão espiritual." },
];

const reveal = (delay = 0, dir: "up" | "right" = "up") => ({
  initial: { opacity: 0, ...(dir === "right" ? { x: 40 } : { y: 36 }) },
  whileInView: { opacity: 1, x: 0, y: 0 },
  viewport: { once: true, margin: "-40px" as const },
  transition: { duration: 0.7, delay },
});

const SectionSobre = () => (
  <section className="site-sobre" id="sobre">
    <div className="site-sobre__inner">
      <motion.div className="site-section-header" style={{ marginBottom: 48 }} {...reveal()}>
        <div className="site-tag site-tag--teal">
          <span className="site-tag__bar" />
          Transparência Institucional
        </div>
        <h2 className="site-section-title">A Nossa Instituição</h2>
      </motion.div>

      <div className="site-sobre__two-col">
        {/* Coluna A — Texto + Dados */}
        <motion.div {...reveal()}>
          <p className="site-sobre__text">
            Fundado em <strong>12 de setembro de 2025</strong>, o Lar de Seu Luiz é uma organização religiosa sem fins
            lucrativos, registrada em cartório, com CNPJ e Estatuto Social aprovado em Assembleia Geral. Localizado na{" "}
            <strong>Colônia do Pium, Nísia Floresta/RN</strong>.
          </p>
          <p className="site-sobre__text">
            Toda a nossa atuação é pautada pelos princípios da <strong>ética, transparência e gratuidade</strong>.
            Nenhum dirigente recebe remuneração — todo recurso é destinado integralmente aos objetivos da instituição.
          </p>
          <p className="site-sobre__text">
            Não nos envolvemos em questões ideológicas, político-partidárias ou quaisquer outras que não guardem
            pertinência com nossa missão espiritual e social.
          </p>

          <div className="site-sobre__stats">
            <div className="site-stat-box">
              <div className="site-stat-box__num">Set/2025</div>
              <div className="site-stat-box__lbl">Data de fundação</div>
            </div>
            <div className="site-stat-box">
              <div className="site-stat-box__num">100%</div>
              <div className="site-stat-box__lbl">Gratuito — todas as atividades</div>
            </div>
            <div className="site-stat-box">
              <div className="site-stat-box__num">9</div>
              <div className="site-stat-box__lbl">Secretarias de trabalho</div>
            </div>
            <div className="site-stat-box">
              <div className="site-stat-box__num">CNPJ</div>
              <div className="site-stat-box__lbl">Organização registrada</div>
            </div>
          </div>
        </motion.div>

        {/* Coluna B — Nossos Valores */}
        <motion.div {...reveal(0.15, "right")}>
          <div className="site-tag site-tag--teal" style={{ marginBottom: 24 }}>
            <span className="site-tag__bar" />
            Nossos Valores
          </div>
          <div className="site-valores-list">
            {valores.map((v, i) => (
              <motion.div
                key={v.title}
                className="site-valor-item"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i + 1) * 0.08 }}
              >
                <img src={v.icon} alt={v.title} style={{ width: 38, height: 38, objectFit: "contain", flexShrink: 0 }} />
                <div>
                  <div className="site-valor-item__title">{v.title}</div>
                  <div className="site-valor-item__desc">{v.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default SectionSobre;
