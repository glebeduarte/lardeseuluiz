import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import CookieBanner from "@/components/site/CookieBanner";

// Moldura das páginas internas do site, no mesmo padrão visual da página de Atendimentos.
const SitePage = ({ titulo, tag, intro, documento, children }: {
  titulo: string; tag: string; intro?: ReactNode; documento: string; children: ReactNode;
}) => {
  useEffect(() => {
    document.title = `${documento} | Lar de Seu Luiz`;
    window.scrollTo(0, 0);
  }, [documento]);

  return (
    <div className="site-root">
      <SiteNav />
      <section className="atd-hero">
        <div className="atd-hero__inner">
          <motion.div initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="site-tag site-tag--light">
              <span className="site-tag__bar" />
              {tag}
            </div>
            <h1 className="atd-hero__title">{titulo}</h1>
            {intro && <p className="atd-hero__sub">{intro}</p>}
          </motion.div>
        </div>
      </section>
      {children}
      <SiteFooter />
      <CookieBanner />
    </div>
  );
};

export default SitePage;
