import { useState } from "react";
import { motion } from "framer-motion";

const PX_PER_HOUR = 88;
const START_HOUR = 13;
const END_HOUR = 20;
const HOURS = [13, 14, 15, 16, 17, 18, 19, 20];

type ActivityType = "dialogo" | "palestra" | "passes" | "macas" | "desobsessao" | "cafe";

interface Block {
  label: string;
  sub?: string;
  type: ActivityType;
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  /** For side-by-side rendering: "left" | "right" | "full" */
  col?: "left" | "right" | "full";
}

const COLORS: Record<ActivityType, { main: string; text: string }> = {
  dialogo:     { main: "#1A5FA8", text: "#1A5FA8" },
  palestra:    { main: "#F5B800", text: "#7A5C00" },
  passes:      { main: "#1B7F79", text: "#1B7F79" },
  macas:       { main: "#9B6A00", text: "#9B6A00" },
  desobsessao: { main: "#1B7F79", text: "#1B7F79" },
  cafe:        { main: "#C2185B", text: "#C2185B" },
};

const DAY_COLORS = {
  terca:  "#1A5FA8",
  sexta:  "#1B7F79",
  sabado: "#F5B800",
  sabado_mensal: "#C2185B",
};

const tercas: Block[] = [
  { label: "Diálogo Fraterno", sub: "14h–15h15", type: "dialogo", startH: 14, startM: 0, endH: 15, endM: 15 },
  { label: "Abertura e Palestra", sub: "15h30–17h", type: "palestra", startH: 15, startM: 30, endH: 17, endM: 0 },
  { label: "Atend. Macas", sub: "17h–18h30", type: "macas", startH: 17, startM: 0, endH: 18, endM: 30, col: "left" },
  { label: "Passes", sub: "17h–18h30", type: "passes", startH: 17, startM: 0, endH: 18, endM: 30, col: "right" },
];

const sextas: Block[] = [
  { label: "Abertura e Diálogo Fraterno", sub: "16h–17h", type: "dialogo", startH: 16, startM: 0, endH: 17, endM: 0 },
  { label: "Estudo do Evangelho", sub: "17h–18h", type: "desobsessao", startH: 17, startM: 0, endH: 18, endM: 0 },
  { label: "Palestra", sub: "18h–19h", type: "palestra", startH: 18, startM: 0, endH: 19, endM: 0 },
  { label: "Atend. Macas", sub: "19h–20h", type: "macas", startH: 19, startM: 0, endH: 20, endM: 0, col: "left" },
  { label: "Passes", sub: "19h–20h", type: "passes", startH: 19, startM: 0, endH: 20, endM: 0, col: "right" },
];

const sabados: Block[] = [
  { label: "Diálogo Fraterno", sub: "14h30–15h45", type: "dialogo", startH: 14, startM: 30, endH: 15, endM: 45 },
  { label: "Abertura e Palestra", sub: "16h–17h30", type: "palestra", startH: 16, startM: 0, endH: 17, endM: 30 },
  { label: "Atend. Macas", sub: "17h30–19h", type: "macas", startH: 17, startM: 30, endH: 19, endM: 0, col: "left" },
  { label: "Passes", sub: "17h30–19h", type: "passes", startH: 17, startM: 30, endH: 19, endM: 0, col: "right" },
];

const sabadosMensais: Block[] = [
  { label: "Palestra e Discussão", sub: "16h–18h", type: "cafe", startH: 16, startM: 0, endH: 18, endM: 0 },
];

const days = [
  { key: "terca", label: "Terças-feiras", color: DAY_COLORS.terca, blocks: tercas },
  { key: "sexta", label: "Sextas-feiras", color: DAY_COLORS.sexta, blocks: sextas },
  { key: "sabado", label: "Sáb. Quinzenais", color: DAY_COLORS.sabado, blocks: sabados },
  { key: "sabado_mensal", label: "Sáb. Mensais", color: DAY_COLORS.sabado_mensal, blocks: sabadosMensais },
];

const legend = [
  { color: COLORS.dialogo.main, label: "Diálogo Fraterno" },
  { color: COLORS.passes.main, label: "Passes / Desobsessão" },
  { color: COLORS.palestra.main, label: "Palestra" },
  { color: COLORS.macas.main, label: "Tratamento Espiritual (Macas)" },
  { color: COLORS.cafe.main, label: "CaFÉ & AMor" },
];

function calcTop(h: number, m: number) {
  return (h + m / 60 - START_HOUR) * PX_PER_HOUR;
}
function calcHeight(b: Block) {
  const startDec = b.startH + b.startM / 60;
  const endDec = b.endH + b.endM / 60;
  return (endDec - startDec) * PX_PER_HOUR;
}

const GRID_HEIGHT = (END_HOUR - START_HOUR) * PX_PER_HOUR;

const ActivityBlock = ({ block }: { block: Block }) => {
  const top = calcTop(block.startH, block.startM);
  const height = calcHeight(block);
  const c = COLORS[block.type];
  const isSmall = height < 52;

  const colStyle: React.CSSProperties = {};
  if (block.col === "left") { colStyle.width = "48%"; colStyle.left = "0"; }
  else if (block.col === "right") { colStyle.width = "48%"; colStyle.right = "0"; colStyle.left = "auto"; }

  return (
    <div
      className="cal-block"
      style={{
        position: "absolute",
        top, height: Math.max(height, 28),
        left: 0, right: 0,
        borderLeft: `4px solid ${c.main}`,
        background: `${c.main}1A`,
        borderRadius: 8,
        padding: isSmall ? "4px 10px" : "8px 10px",
        display: "flex",
        flexDirection: isSmall ? "row" : "column",
        gap: isSmall ? 8 : 2,
        alignItems: isSmall ? "center" : "flex-start",
        overflow: "hidden",
        ...colStyle,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 13, color: c.text, lineHeight: 1.3, whiteSpace: "nowrap" }}>
        {block.label}
      </span>
      {block.sub && (
        <span style={{ fontSize: 11, color: `${c.text}B3`, lineHeight: 1.3 }}>
          {block.sub}
        </span>
      )}
    </div>
  );
};

const DayColumn = ({ day }: { day: typeof days[number] }) => (
  <div className="cal-day">
    <div className="cal-day__header" style={{ background: `${day.color}1F` }}>
      <span style={{ color: day.color }}>{day.label}</span>
    </div>
    <div className="cal-day__body" style={{ height: GRID_HEIGHT, position: "relative" }}>
      {day.blocks.map((b, i) => (
        <ActivityBlock key={i} block={b} />
      ))}
    </div>
  </div>
);

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 36 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true, margin: "-40px" as const },
  transition: { duration: 0.7, delay },
});

const WeeklyCalendar = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="atd-agenda">
      <div className="atd-agenda__inner">
        <motion.div {...reveal()}>
          <div className="site-tag site-tag--teal">
            <span className="site-tag__bar" />
            Agenda Semanal
          </div>
          <h2 className="atd-agenda__title">Quando estamos abertos</h2>
          <p className="atd-agenda__sub">
            Veja exatamente em que momento cada serviço acontece durante a semana.
          </p>
        </motion.div>

        {/* Desktop grid */}
        <motion.div className="cal-grid cal-grid--desktop" {...reveal(0.15)}>
          {/* Time axis */}
          <div className="cal-time-axis">
            <div className="cal-time-axis__header" />
            <div className="cal-time-axis__body" style={{ height: GRID_HEIGHT, position: "relative" }}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="cal-time-label"
                  style={{ position: "absolute", top: (h - START_HOUR) * PX_PER_HOUR - 8 }}
                >
                  {h}h
                </div>
              ))}
            </div>
          </div>
          {days.map((d) => (
            <DayColumn key={d.key} day={d} />
          ))}
          {/* Grid lines overlay */}
          <div className="cal-gridlines" style={{ height: GRID_HEIGHT }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="cal-gridline"
                style={{ top: (h - START_HOUR) * PX_PER_HOUR }}
              />
            ))}
          </div>
        </motion.div>

        {/* Mobile tabs */}
        <div className="cal-grid cal-grid--mobile">
          <div className="cal-tabs">
            {days.map((d, i) => (
              <button
                key={d.key}
                className={`cal-tab ${activeTab === i ? "cal-tab--active" : ""}`}
                style={activeTab === i ? { background: `${d.color}1F`, color: d.color, borderColor: d.color } : {}}
                onClick={() => setActiveTab(i)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <motion.div className="cal-mobile-col" key={activeTab} {...reveal(0.1)}>
            <div className="cal-mobile-grid">
              <div className="cal-time-axis">
                <div className="cal-time-axis__body" style={{ height: GRID_HEIGHT, position: "relative" }}>
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="cal-time-label"
                      style={{ position: "absolute", top: (h - START_HOUR) * PX_PER_HOUR - 8 }}
                    >
                      {h}h
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, position: "relative" }}>
                <div style={{ height: GRID_HEIGHT, position: "relative" }}>
                  {HOURS.map((h) => (
                    <div key={h} className="cal-gridline cal-gridline--mobile" style={{ top: (h - START_HOUR) * PX_PER_HOUR }} />
                  ))}
                  {days[activeTab].blocks.map((b, i) => (
                    <ActivityBlock key={i} block={b} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Legend */}
        <motion.div className="cal-legend" {...reveal(0.2)}>
          {legend.map((l) => (
            <div key={l.label} className="cal-legend__item">
              <span className="cal-legend__dot" style={{ background: l.color }} />
              <span className="cal-legend__label">{l.label}</span>
            </div>
          ))}
        </motion.div>

        <motion.p className="atd-agenda__nota" {...reveal(0.3)}>
          Todas as atividades são gratuitas e abertas ao público. O Diálogo Fraterno é sempre o primeiro passo para quem chega pela primeira vez.
        </motion.p>
      </div>
    </section>
  );
};

export default WeeklyCalendar;
