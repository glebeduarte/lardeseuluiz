import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

// Cursos abertos vêm da Área de Formação (mesmo banco, área "formacao"); sem cursos publicados, mostra os programas fixos.
const cursosFixos = [
  { id: "esde", title: "ESDE", desc: "Estudo Sistematizado da Doutrina Espírita — curso fundamental de 2 anos.", icon: "📘", href: "/formacao/" },
  { id: "dialogo", title: "Diálogo Fraterno", desc: "Formação de atendentes fraternos para acolhimento e orientação.", icon: "💬", href: "/formacao/" },
  { id: "evangelizacao", title: "Evangelização", desc: "Capacitação de evangelizadores infantojuvenis com metodologia lúdica.", icon: "🧒", href: "/formacao/" },
];
const ICONES = ["📘", "💬", "🧒", "📖", "🕊️", "✨"];

const SectionFormacao = () => {
  const { data } = useQuery({
    queryKey: ["site-cursos-abertos"],
    queryFn: async () => {
      const { data } = await supabase.schema("formacao" as never).from("courses")
        .select("id, title, description, audience")
        .eq("status", "published").eq("enrollment_open", true).neq("audience", "trabalhadores").limit(6);
      return (data ?? []) as { id: string; title: string; description: string | null }[];
    },
  });
  const cursos = data && data.length > 0
    ? data.map((c, i) => ({ id: c.id, title: c.title, desc: c.description ?? "", icon: ICONES[i % ICONES.length], href: `/formacao/inscricao/curso/${c.id}` }))
    : cursosFixos;

  return (
    <section className="pg-secao pg-secao--branca" id="formacao">
      <div className="pg-secao__inner">
        <motion.div className="site-section-header" initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <div className="site-tag site-tag--teal"><span className="site-tag__bar" />Cursos & Formação</div>
          <h2 className="site-section-title">Aprendizado Contínuo</h2>
          <p className="site-section-sub">
            Programas de formação doutrinária para voluntários e frequentadores que desejam aprofundar seus conhecimentos.
          </p>
        </motion.div>
        <div className="pg-cards">
          {cursos.map((c, i) => (
            <motion.a key={c.id} href={c.href} className="atd-dialogo__card" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}>
              <div className="atd-dialogo__card-icon">{c.icon}</div>
              <div className="atd-dialogo__card-title">{c.title}</div>
              <div className="atd-dialogo__card-desc">{c.desc}</div>
            </motion.a>
          ))}
        </div>
        <div style={{ marginTop: 32 }}>
          <a href="/formacao/" className="ds-btn ds-btn-primary">Ver todos os cursos na Área de Formação →</a>
        </div>
      </div>
    </section>
  );
};

export default SectionFormacao;
