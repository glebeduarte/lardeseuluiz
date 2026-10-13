import { CabecalhoPagina } from '@/compartilhado';

interface PageHeroProps {
  title: string;
  description: string;
  /** Mantido por compatibilidade: as duas variantes agora usam o cabeçalho padrão da plataforma. */
  variant?: 'admin' | 'student';
}

/** Cabeçalho de página da Formação no padrão único da plataforma (igual ao da Governança). */
export function PageHero({ title, description }: PageHeroProps) {
  return <CabecalhoPagina titulo={title} descricao={description} />;
}
