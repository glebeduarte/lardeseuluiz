import { Link } from "react-router-dom";
import { SiteLayout, Secao } from "@/components/site/SiteLayout";
import { useCursosPublicados } from "@/lib/formacao";

export default function Cursos() {
  const { data, isLoading } = useCursosPublicados();
  return (
    <SiteLayout>
      <Secao eyebrow="Formação" titulo="Cursos da casa"
        intro="Estudo da Doutrina Espírita e preparação para o trabalho voluntário. Todos os cursos são gratuitos.">
        {isLoading && <p className="text-muted-foreground">Carregando cursos…</p>}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((c) => (
            <Link key={c.id} to={`/cursos/${c.id}`} className="group rounded-lg border bg-card overflow-hidden flex flex-col hover:border-primary transition-colors">
              {(c.miniatura_url || c.capa_url) && (
                <img src={c.miniatura_url || c.capa_url!} alt="" loading="lazy" className="aspect-video w-full object-cover bg-muted" />
              )}
              <div className="p-5 flex flex-col gap-2 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {c.publico === "voluntarios" && <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs text-secondary">Para voluntários</span>}
                  {!c.inscricoes_abertas && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inscrições encerradas</span>}
                </div>
                <h2 className="text-lg font-semibold leading-snug group-hover:text-primary">{c.titulo}</h2>
                {c.descricao && <p className="text-sm text-muted-foreground line-clamp-3">{c.descricao}</p>}
                {c.horario && <p className="text-sm text-muted-foreground mt-auto pt-2">{c.horario}</p>}
              </div>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link to="/calendario/esde" className="text-primary hover:underline">Calendário do ESDE</Link>
          <Link to="/biblioteca" className="text-primary hover:underline">Biblioteca</Link>
        </div>
      </Secao>
    </SiteLayout>
  );
}
