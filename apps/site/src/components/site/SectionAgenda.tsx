import SectionReveal from "./SectionReveal";

const events = [
  { day: "TER", time: "20h", title: "Palestra Pública", badge: "Semanal" },
  { day: "QUI", time: "20h", title: "Diálogo Fraterno", badge: "Agendamento" },
  { day: "SAB", time: "09h", title: "Evangelização Infantil", badge: "Semanal" },
  { day: "SAB", time: "15h", title: "Grupo de Leitura", badge: "Mensal" },
];

const SectionAgenda = () => (
  <SectionReveal id="agenda">
    <div className="site-container">
      <span className="site-section__badge">Agenda</span>
      <h2 className="site-section__title">Programação Semanal</h2>
      <p className="site-section__lead">
        Confira nossos horários e participe das atividades. Todas as atividades públicas são gratuitas.
      </p>

      <div className="site-agenda-grid">
        {events.map((e) => (
          <div key={e.title} className="site-agenda-card">
            <div className="site-agenda-card__day">{e.day}</div>
            <div className="site-agenda-card__body">
              <div className="site-agenda-card__time">{e.time}</div>
              <div className="site-agenda-card__title">{e.title}</div>
            </div>
            <span className="badge badge-teal">{e.badge}</span>
          </div>
        ))}
      </div>
    </div>
  </SectionReveal>
);

export default SectionAgenda;
