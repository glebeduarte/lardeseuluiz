import { Link, useParams } from "react-router-dom";
import { PaginaSite, Secao, ConviteFinal } from "@/components/inicio/Pagina";
import { useProjeto } from "@/lib/site-dados";
import ProximasEdicoes from "@/components/site/ProximasEdicoes";

const WHATSAPP = "5584991432639";

const Projeto = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: p, isLoading } = useProjeto(slug);

  if (isLoading) return <PaginaSite documento="Ações sociais" titulo="Carregando…"><div className="ini-secao" /></PaginaSite>;
  if (!p) {
    return (
      <PaginaSite documento="Ações sociais" titulo="Ação não encontrada" intro="Essa ação pode ter mudado de endereço."
        acoes={<a href="/#acoes" className="ini-botao">Ver todas as ações sociais</a>}>
        <div />
      </PaginaSite>
    );
  }

  const texto = p.content || p.description || p.summary || "";
  const msg = encodeURIComponent(`Olá! Gostaria de participar da ação "${p.name}" do Lar de Seu Luiz.`);

  return (
    <PaginaSite documento={p.name} titulo={p.name} intro={p.summary ?? undefined} foto={p.cover_url} fotoAlt={p.name}
      acoes={p.whatsapp_group_url
        ? <a href={p.whatsapp_group_url} target="_blank" rel="noopener noreferrer" className="ini-botao">Entrar no grupo da ação</a>
        : <a href={`https://wa.me/${WHATSAPP}?text=${msg}`} target="_blank" rel="noopener noreferrer" className="ini-botao">Falar pelo WhatsApp</a>}>

      <Secao titulo="Sobre a ação" fundo="papel" estreita intro={
        <div className="ini-selos" style={{ marginBottom: 0 }}>
          {p.schedule && <span className="ini-selo ini-selo--ouro">{p.schedule}</span>}
          {p.tags.map((t) => <span key={t} className="ini-selo">{t}</span>)}
        </div>
      }>
        <div className="ini-texto">{texto.split(/\n{2,}/).map((par, i) => <p key={i}>{par}</p>)}</div>
        <ProximasEdicoes projetoId={p.id} slug={p.slug} grupoWhatsapp={p.whatsapp_group_url} />
      </Secao>

      <ConviteFinal foto="/imagens/dia-criancas-event.jpg" fotoAlt="Crianças brincando no Dia das Crianças" titulo="Quer participar?" para="/voluntariado" botao={p.accepts_volunteers ? "Quero ser voluntário" : "Conhecer o voluntariado"}
        texto="Toda a arrecadação volta para a comunidade. Você pode ajudar como voluntário, doando ou divulgando."
        extra={<>
          <a href={`https://wa.me/${WHATSAPP}?text=${msg}`} target="_blank" rel="noopener noreferrer" className="ini-botao ini-botao--claro">Falar pelo WhatsApp</a>
          <Link to="/#acoes" className="ini-botao ini-botao--claro">Outras ações</Link>
        </>} />
    </PaginaSite>
  );
};

export default Projeto;
