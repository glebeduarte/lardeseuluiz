import SectionReveal from "./SectionReveal";

const SectionQuemSomos = () => (
  <SectionReveal id="quem-somos" className="site-section--light">
    <div className="site-container">
      <span className="site-section__badge">Quem Somos</span>
      <h2 className="site-section__title">
        Um lar de <em>acolhimento</em> e fraternidade
      </h2>
      <p className="site-section__lead">
        Fundado em 2025, o Lar de Seu Luiz é um centro espírita dedicado ao
        estudo da Doutrina Espírita, à prática da caridade e ao desenvolvimento
        espiritual de todos os que buscam a luz do conhecimento e do amor.
      </p>

      <div className="site-values">
        {[
          { icon: "💡", title: "Missão", text: "Promover o estudo, a prática e a difusão da Doutrina Espírita, acolhendo a todos com amor e fraternidade." },
          { icon: "🌟", title: "Visão", text: "Ser referência de acolhimento espiritual, contribuindo para a transformação moral da sociedade." },
          { icon: "🤝", title: "Valores", text: "Caridade, fraternidade, estudo, trabalho voluntário, transparência e respeito à diversidade." },
        ].map((v) => (
          <div key={v.title} className="site-value-card">
            <span className="site-value-card__icon">{v.icon}</span>
            <h3>{v.title}</h3>
            <p>{v.text}</p>
          </div>
        ))}
      </div>
    </div>
  </SectionReveal>
);

export default SectionQuemSomos;
