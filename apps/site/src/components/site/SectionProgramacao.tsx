import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import WeeklyCalendar from "@/components/site/WeeklyCalendar";
import { hojeISO, MESES, usePalestras } from "@/lib/site-dados";

// Cor do cartão pelo dia da semana, como na grade original: terça azul, sexta teal, sábado dourado.
const corDoDia = (dia: string) => (/sex/i.test(dia) ? "secondary" : /s[áa]b/i.test(dia) ? "accent" : "default");
const DIAS: Record<string, string> = { SEG: "Segunda", TER: "Terça", QUA: "Quarta", QUI: "Quinta", SEX: "Sexta", SAB: "Sábado", "SÁB": "Sábado", DOM: "Domingo" };



const colorMap: Record<string, { bg: string; dayColor: string; monColor: string }> = {
  default:   { bg: "hsl(var(--primary-muted))", dayColor: "hsl(var(--primary))", monColor: "hsl(var(--primary-light))" },
  secondary: { bg: "hsl(var(--secondary-muted))", dayColor: "hsl(var(--secondary))", monColor: "hsl(var(--secondary-light))" },
  accent:    { bg: "hsl(var(--accent-muted))", dayColor: "hsl(var(--accent-dark))", monColor: "hsl(var(--accent-dark))" },
};

const SectionProgramacao = () => {
  const { data: palestras = [] } = usePalestras({ desde: hojeISO(), limite: 12 });
  return (
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
          <div className="site-prog-palestras__title">🎤 Próximas Palestras</div>
          <div className="site-palestras-grid">
            {palestras.map((p) => {
              const c = colorMap[corDoDia(p.dia_semana)];
              const [, mes, dia] = p.data.split("-");
              const meta = [DIAS[p.dia_semana.toUpperCase()] ?? p.dia_semana, p.hora !== "-" ? p.hora : null, p.palestrante !== "-" ? p.palestrante : null].filter(Boolean).join(" • ");
              return (
                <div key={p.id} className="site-palestra-item">
                  <div className="site-palestra-date" style={{ background: c.bg }}>
                    <div className="site-palestra-date__day" style={{ color: c.dayColor }}>{dia}</div>
                    <div className="site-palestra-date__mon" style={{ color: c.monColor }}>{MESES[Number(mes) - 1]}</div>
                  </div>
                  <div>
                    <div className="site-palestra__title">{p.tema}</div>
                    <div className="site-palestra__meta">{meta}</div>
                  </div>
                </div>
              );
            })}
            {palestras.length === 0 && <div className="site-palestra__meta">As próximas palestras serão publicadas em breve.</div>}
          </div>
          <div className="site-prog-note">
            📌 Programação atualizada periodicamente. <Link to="/agenda">Ver a agenda completa</Link>.
          </div>
        </div>
      </motion.div>
    </div>
  </section>
  );
};

export default SectionProgramacao;
