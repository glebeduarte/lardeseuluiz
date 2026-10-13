import SiteNav from "@/components/site/SiteNav";
import SiteHero from "@/components/site/SiteHero";
import SectionHorarios from "@/components/site/SectionHorarios";
import SectionMissao from "@/components/site/SectionMissao";
import SectionEventos from "@/components/site/SectionEventos";
import SectionAtendimento from "@/components/site/SectionAtendimento";
import SectionSobre from "@/components/site/SectionSobre";
import SectionFormacao from "@/components/site/SectionFormacao";
import SectionProgramacao from "@/components/site/SectionProgramacao";
import SectionContato from "@/components/site/SectionContato";
import SiteFooter from "@/components/site/SiteFooter";
import CookieBanner from "@/components/site/CookieBanner";

const Index = () => (
  <div className="site-root">
    <SiteNav />
    <SiteHero />
    <SectionHorarios />
    <SectionMissao />
    <SectionEventos />
    <SectionAtendimento />
    <SectionFormacao />
    <SectionSobre />
    <SectionProgramacao />
    <SectionContato />
    <SiteFooter />
    <CookieBanner />
  </div>
);

export default Index;
