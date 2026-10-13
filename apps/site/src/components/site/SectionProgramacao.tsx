import { motion } from "framer-motion";
import WeeklyCalendar from "@/components/site/WeeklyCalendar";

const palestras = [
  { day: "03", mon: "Jul", title: "Não julgueis para não serdes julgados", meta: "Sexta 18h • Glebe Duarte", color: "secondary" },
  { day: "07", mon: "Jul", title: "A prece que transforma", meta: "Terça 15h30 • Giovana Aranha" },
  { day: "10", mon: "Jul", title: "Espelhos da alma: aquilo que criticamos nos outros revela quem somos?", meta: "Sexta 18h • Bruno Félix", color: "secondary" },
  { day: "11", mon: "Jul", title: "A verdadeira riqueza: tesouros que o tempo não destrói", meta: "Sábado 16h • Otávio Cabral", color: "accent" },
  { day: "14", mon: "Jul", title: "Meu Reino não é deste mundo: onde temos colocado nossa esperança?", meta: "Terça 15h30 • Ana Dorotéa Vieira" },
  { day: "17", mon: "Jul", title: "Cansado de sofrer: o amor como caminho de volta para si", meta: "Sexta 18h • Rayssa Souza", color: "secondary" },
  { day: "21", mon: "Jul", title: "Jesus: ontem, hoje e sempre!", meta: "Terça 15h30 • Cesar Rocha" },
  { day: "24", mon: "Jul", title: "Bem-aventurados os brandos e pacíficos", meta: "Sexta 18h • Thiago Lins", color: "secondary" },
  { day: "25", mon: "Jul", title: "Bem-aventurados os brandos e pacíficos", meta: "Sábado 16h • Thiago Lins", color: "accent" },
  { day: "28", mon: "Jul", title: "A cada um segundo suas obras: responsabilidade e escolhas", meta: "Terça 15h30 • Sandra Borba" },
  { day: "31", mon: "Jul", title: "Harmonia, natureza e espiritualidade", meta: "Sexta 18h • Arthur Freitas", color: "secondary" },
];

const colorMap: Record<string, { bg: string; dayColor: string; monColor: string }> = {
  default:   { bg: "hsl(var(--primary-muted))", dayColor: "hsl(var(--primary))", monColor: "hsl(var(--primary-light))" },
  secondary: { bg: "hsl(var(--secondary-muted))", dayColor: "hsl(var(--secondary))", monColor: "hsl(var(--secondary-light))" },
  accent:    { bg: "hsl(var(--accent-muted))", dayColor: "hsl(var(--accent-dark))", monColor: "hsl(var(--accent-dark))" },
};

const SectionProgramacao = () => (
  <section className="site-programacao" id="programacao">
    <div className="site-programacao__inner">
      {/* Calendário semanal visual */}
      <WeeklyCalendar />

      {/* Grade de Palestras */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        <div className="site-prog-palestras" style={{ marginTop: 48 }}>
          <div className="site-prog-palestras__title">🎤 Próximas Palestras — Julho</div>
          <div className="site-palestras-grid">
            {palestras.map((p) => {
              const c = colorMap[p.color || "default"];
              return (
                <div key={p.day + p.mon} className="site-palestra-item">
                  <div className="site-palestra-date" style={{ background: c.bg }}>
                    <div className="site-palestra-date__day" style={{ color: c.dayColor }}>{p.day}</div>
                    <div className="site-palestra-date__mon" style={{ color: c.monColor }}>{p.mon}</div>
                  </div>
                  <div>
                    <div className="site-palestra__title">{p.title}</div>
                    <div className="site-palestra__meta">{p.meta}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="site-prog-note">
            📌 Programação atualizada periodicamente. Acompanhe nossas redes sociais para novidades.
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default SectionProgramacao;
