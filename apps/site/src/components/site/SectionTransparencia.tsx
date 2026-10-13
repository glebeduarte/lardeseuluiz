import { useQuery } from "@tanstack/react-query";
import SectionReveal from "./SectionReveal";
import { supabase } from "@/integrations/supabase/client";

// Documentos marcados como públicos em /app/documentos aparecem aqui para download.
const useDocumentosPublicos = () => useQuery({
  queryKey: ["site-documentos-publicos"],
  queryFn: async () => {
    const { data } = await supabase.from("documents").select("id, title, file_url, doc_type, reference_date").eq("is_public", true).order("reference_date", { ascending: false });
    return data ?? [];
  },
});

const SectionTransparencia = () => {
  const { data: documentos = [] } = useDocumentosPublicos();
  return (
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

      {documentos.length > 0 && (
        <ul className="site-transparency-docs" style={{ marginTop: 32, display: "grid", gap: 8 }}>
          {documentos.map((d) => (
            <li key={d.id}>
              <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="ds-btn ds-btn-outline ds-btn-sm">📄 {d.title}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  </SectionReveal>
  );
};

export default SectionTransparencia;
