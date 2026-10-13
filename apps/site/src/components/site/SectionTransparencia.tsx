import SectionReveal from "./SectionReveal";

const SectionTransparencia = () => (
  <SectionReveal id="transparencia" className="site-section--light">
    <div className="site-container">
      <span className="site-section__badge">Transparência</span>
      <h2 className="site-section__title">Prestação de Contas</h2>
      <p className="site-section__lead">
        A transparência é um dos nossos valores fundamentais. Todos os balancetes e atas estão disponíveis para consulta dos associados.
      </p>

      <div className="site-transparency-grid">
        <div className="site-transparency-card">
          <span className="site-transparency-card__icon">📊</span>
          <h3>Balancetes Mensais</h3>
          <p>Relatórios financeiros aprovados pelo Conselho Fiscal, com receitas e despesas detalhadas.</p>
        </div>
        <div className="site-transparency-card">
          <span className="site-transparency-card__icon">📝</span>
          <h3>Atas de Assembleia</h3>
          <p>Registros das assembleias gerais ordinárias e extraordinárias, disponíveis para consulta.</p>
        </div>
        <div className="site-transparency-card">
          <span className="site-transparency-card__icon">📋</span>
          <h3>Estatuto Social</h3>
          <p>Documento constitutivo com regras de funcionamento, direitos e deveres dos associados.</p>
        </div>
      </div>
    </div>
  </SectionReveal>
);

export default SectionTransparencia;
