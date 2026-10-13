import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SitePage from "@/components/site/SitePage";
import SectionSobre from "@/components/site/SectionSobre";
import SectionMissao from "@/components/site/SectionMissao";
import { supabase } from "@/integrations/supabase/client";

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 24 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true, margin: "-40px" as const },
  transition: { duration: 0.6, delay },
});

const ACasa = () => {
  const secretarias = useQuery({
    queryKey: ["site-secretarias"],
    queryFn: async () => {
      const { data } = await supabase.from("secretarias").select("id, name, description, icon").eq("is_active", true).order("name");
      return data ?? [];
    },
  });
  const documentos = useQuery({
    queryKey: ["site-documentos-publicos"],
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("id, title, description, file_url, doc_type").eq("is_public", true).order("reference_date", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <SitePage documento="A Casa" tag="A Instituição" titulo="Conheça o Lar de Seu Luiz"
      intro="Organização religiosa sem fins lucrativos, mantida pelo trabalho voluntário. Aqui você conhece nossa história, como a casa se organiza e onde estão os documentos públicos.">
      <SectionSobre />
      <SectionMissao />

      <section className="pg-secao pg-secao--clara" id="secretarias">
        <div className="pg-secao__inner">
          <motion.div className="site-section-header" {...reveal()}>
            <div className="site-tag site-tag--teal"><span className="site-tag__bar" />Como nos organizamos</div>
            <h2 className="site-section-title">Secretarias</h2>
            <p className="site-section-sub">Cada secretaria cuida de uma parte do trabalho da casa, com coordenação e voluntários próprios.</p>
          </motion.div>
          <div className="pg-cards">
            {(secretarias.data ?? []).map((s, i) => (
              <motion.div key={s.id} className="atd-dialogo__card" {...reveal(i * 0.05)}>
                <div className="atd-dialogo__card-icon">{s.icon ?? "📋"}</div>
                <div className="atd-dialogo__card-title">{s.name}</div>
                {s.description && <div className="atd-dialogo__card-desc">{s.description}</div>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="pg-secao pg-secao--branca" id="transparencia">
        <div className="pg-secao__inner">
          <motion.div className="site-section-header" {...reveal()}>
            <div className="site-tag site-tag--teal"><span className="site-tag__bar" />Transparência</div>
            <h2 className="site-section-title">Prestação de contas</h2>
            <p className="site-section-sub">
              Estatuto social, atas de assembleia e balancetes aprovados ficam disponíveis aqui. Os associados acessam também os documentos internos pela área restrita.
            </p>
          </motion.div>
          <div className="pg-cards">
            {(documentos.data ?? []).map((d, i) => (
              <motion.a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer" className="atd-dialogo__card" {...reveal(i * 0.05)}>
                <div className="atd-dialogo__card-icon">📄</div>
                <div className="atd-dialogo__card-title">{d.title}</div>
                {d.description && <div className="atd-dialogo__card-desc">{d.description}</div>}
              </motion.a>
            ))}
            {documentos.data && documentos.data.length === 0 && (
              <div className="atd-dialogo__card">
                <div className="atd-dialogo__card-icon">📋</div>
                <div className="atd-dialogo__card-title">Documentos em publicação</div>
                <div className="atd-dialogo__card-desc">Os documentos públicos estão sendo organizados e aparecerão aqui em breve.</div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="atd-cta-final">
        <div className="atd-cta-final__inner">
          <motion.div {...reveal()}>
            <h2 className="atd-cta-final__title">Quer servir na casa?</h2>
            <p className="atd-cta-final__sub">O voluntariado começa com uma conversa no Acolhimento, segue com um curso de preparação e um período de estágio acompanhado.</p>
            <Link to="/voluntariado" className="atd-cta-final__btn">Quero ser voluntário →</Link>
          </motion.div>
        </div>
      </section>
    </SitePage>
  );
};

export default ACasa;
