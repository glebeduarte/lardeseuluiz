import SectionReveal from "./SectionReveal";

const cursos = [
  { title: "ESDE", desc: "Estudo Sistematizado da Doutrina Espírita — curso fundamental de 2 anos.", icon: "📘" },
  { title: "Diálogo Fraterno", desc: "Formação de atendentes fraternos para acolhimento e orientação.", icon: "💬" },
  { title: "Evangelização", desc: "Capacitação de evangelizadores infantojuvenis com metodologia lúdica.", icon: "🧒" },
];

const SectionFormacao = () => (
  <SectionReveal id="formacao" className="site-section--light">
    <div className="site-container">
      <span className="site-section__badge">Cursos & Formação</span>
      <h2 className="site-section__title">Aprendizado Contínuo</h2>
      <p className="site-section__lead">
        Programas de formação doutrinária para voluntários e frequentadores que desejam aprofundar seus conhecimentos.
      </p>

      <div className="site-courses-grid">
        {cursos.map((c) => (
          <div key={c.title} className="site-course-card">
            <span className="site-course-card__icon">{c.icon}</span>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            <a href="#contato" className="ds-btn ds-btn-outline ds-btn-sm">
              Saiba mais →
            </a>
          </div>
        ))}
      </div>
    </div>
  </SectionReveal>
);

export default SectionFormacao;
