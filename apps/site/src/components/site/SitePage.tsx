import type { ReactNode } from "react";
import { PaginaSite } from "@/components/inicio/Pagina";

// Moldura das páginas internas do site. Usa o mesmo desenho da página inicial.
// "tag" fica por compatibilidade e não aparece mais (sem rótulos acima dos títulos).
const SitePage = ({ titulo, intro, documento, children, foto, fotoAlt, acoes }: {
  titulo: string; tag?: string; intro?: ReactNode; documento: string; children: ReactNode;
  foto?: string | null; fotoAlt?: string; acoes?: ReactNode;
}) => (
  <PaginaSite documento={documento} titulo={titulo} intro={intro} foto={foto} fotoAlt={fotoAlt} acoes={acoes}>
    {children}
  </PaginaSite>
);

export default SitePage;
