import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import CookieBanner from "@/components/site/CookieBanner";
import Inicio from "@/components/inicio/Inicio";
import "@/components/inicio/inicio.css";

const Index = () => (
  <div className="site-root ini-pagina">
    <SiteNav solida />
    <Inicio />
    <SiteFooter />
    <CookieBanner />
  </div>
);

export default Index;
