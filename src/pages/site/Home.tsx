import { Link } from "react-router-dom";
import { ArrowRight, HeartHandshake, Mail, MapPin, MessageCircle } from "lucide-react";
import { SiteLayout, Secao } from "@/components/site/SiteLayout";
import { Programacao } from "@/components/site/Programacao";
import { ListaEventos } from "@/components/site/Agenda";
import { FormContato } from "@/components/site/Contato";
import { Button } from "@/components/ui/button";
import { hojeISO, useEventos, useProjetos, useSiteConfig } from "@/lib/site";

const PILARES = [
  { titulo: "Fé raciocinada", texto: "Estudo e prática do Espiritismo à luz da ciência, da filosofia e da religião." },
  { titulo: "Caridade ativa", texto: "Amor ao próximo expresso em obras concretas de amparo e serviço." },
  { titulo: "Reforma íntima", texto: "Despertar da consciência para o autocuidado e a evolução espiritual." },
  { titulo: "Ação social", texto: "Projetos comunitários voltados a famílias em vulnerabilidade social." },
];

export default function Home() {
  const proximas = useEventos({ desde: hojeISO(), limite: 6 });
  const projetos = useProjetos();
  const { data: cfg } = useSiteConfig();

  return (
    <SiteLayout>
      <section className="border-b bg-card">
        <div className="container grid gap-10 py-16 md:py-24 lg:grid-cols-[1.3fr_1fr] items-center">
          <div className="flex flex-col gap-6">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Casa espiritualista · Pium · Nísia Floresta/RN</span>
            <h1 className="text-4xl md:text-6xl font-semibold leading-[1.05]">Um lugar de luz, acolhimento e amor.</h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Aqui, toda pessoa encontra orientação, amparo espiritual e fraternidade, sem distinção de raça, crença ou condição.
              Todas as atividades são gratuitas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/atendimentos">Quero receber atendimento</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/#programacao">Ver horários</Link></Button>
            </div>
          </div>
          <figure className="rounded-lg border-l-4 border-lsl-dourado bg-background p-6 flex flex-col gap-3" style={{ borderRadius: 0 }}>
            <blockquote className="font-display text-2xl leading-snug">"Fora da caridade não há salvação."</blockquote>
            <figcaption className="text-sm text-muted-foreground">Allan Kardec, O Evangelho segundo o Espiritismo, cap. XV</figcaption>
          </figure>
        </div>
      </section>

      <Secao id="programacao" eyebrow="Quando estamos abertos" titulo="Programação semanal"
        intro="Atividades abertas ao público e gratuitas. O Diálogo Fraterno é sempre o primeiro passo para quem chega pela primeira vez.">
        <Programacao />
      </Secao>

      <Secao eyebrow="Agenda" titulo="Próximas palestras e eventos" tom="card">
        <ListaEventos eventos={proximas.data} vazio="As próximas datas serão publicadas em breve." />
        <Link to="/agenda" className="flex items-center gap-1 text-primary hover:underline w-fit">
          Ver agenda completa <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Secao>

      <Secao id="missao" eyebrow="Nossa razão de existir" titulo="A missão da casa"
        intro="Atendimento fraterno por meio da explanação do Evangelho à luz dos ensinamentos de Jesus, para esclarecer, orientar e amparar todos que buscam ajuda.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILARES.map((p) => (
            <div key={p.titulo} className="flex flex-col gap-2 border-t-2 border-primary pt-4" style={{ borderRadius: 0 }}>
              <h3 className="text-lg font-semibold">{p.titulo}</h3>
              <p className="text-sm text-muted-foreground">{p.texto}</p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao id="acoes" eyebrow="Faça parte" titulo="Ações sociais" tom="card"
        intro="Toda a arrecadação volta para a comunidade. Participe como voluntário ou apoie as ações.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projetos.data?.map((p) => (
            <Link key={p.id} to={`/projetos/${p.slug}`} className="group rounded-lg border bg-background p-5 flex flex-col gap-3 hover:border-primary transition-colors">
              <h3 className="text-xl font-semibold group-hover:text-primary">{p.nome}</h3>
              {p.resumo && <p className="text-sm text-muted-foreground flex-1">{p.resumo}</p>}
              {p.etiquetas.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.etiquetas.map((t) => <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{t}</span>)}
                </div>
              )}
              <span className="flex items-center gap-1 text-sm text-primary">Saiba mais <ArrowRight className="h-4 w-4" aria-hidden /></span>
            </Link>
          ))}
        </div>
      </Secao>

      <Secao eyebrow="Para você que busca ajuda" titulo="Como funciona o atendimento"
        intro="Os atendimentos são gratuitos, por ordem de chegada, sem agendamento. Venha em um dos dias de trabalho.">
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ["Chegue em um dia de atendimento", "Terças, sextas e sábados quinzenais. Não é preciso marcar."],
            ["Converse no Diálogo Fraterno", "Um voluntário escuta você em sigilo e indica o atendimento mais adequado."],
            ["Siga o tratamento indicado", "Passes, atendimento nas macas ou outro encaminhamento, com acompanhamento da casa."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-lg border bg-card p-5 flex flex-col gap-2">
              <span className="font-display text-3xl text-primary tabular-nums">{i + 1}</span>
              <h3 className="text-lg font-semibold">{t}</h3>
              <p className="text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
        <Link to="/atendimentos" className="flex items-center gap-1 text-primary hover:underline w-fit">
          Conheça cada atendimento <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Secao>

      <Secao id="cursos" eyebrow="Formação" titulo="Estudar na casa"
        intro="Cursos gratuitos de estudo da Doutrina Espírita, com aulas presenciais e on-line.">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a href="/formacao/" className="flex items-center gap-1 text-primary hover:underline">Área de Formação <ArrowRight className="h-4 w-4" aria-hidden /></a>
          <a href="/formacao/esde/calendario" className="flex items-center gap-1 text-primary hover:underline">Calendário do ESDE <ArrowRight className="h-4 w-4" aria-hidden /></a>
        </div>
      </Secao>

      <Secao id="voluntariado" eyebrow="Voluntariado" titulo="Quer servir na casa?" tom="card"
        intro="O voluntariado começa com uma conversa no Acolhimento, segue com um curso de preparação e um período de estágio acompanhado.">
        <div>
          <Button asChild size="lg" variant="secondary">
            <Link to="/voluntariado"><HeartHandshake className="h-5 w-5" aria-hidden /> Quero ser voluntário</Link>
          </Button>
        </div>
      </Secao>

      <Secao id="contato" eyebrow="Venha nos visitar" titulo="Como chegar e falar com a casa">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-5">
            {cfg?.endereco && (
              <div className="flex gap-3"><MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden /><span>{cfg.endereco}</span></div>
            )}
            {cfg?.whatsapp_exibicao && (
              <div className="flex gap-3">
                <MessageCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="flex flex-col">
                  <a href={`https://wa.me/${cfg.whatsapp}`} target="_blank" rel="noreferrer" className="hover:underline">{cfg.whatsapp_exibicao}</a>
                  {cfg.whatsapp_horario && <span className="text-sm text-muted-foreground">{cfg.whatsapp_horario}</span>}
                </div>
              </div>
            )}
            {cfg?.email && (
              <div className="flex gap-3"><Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden /><span className="select-all break-all">{cfg.email}</span></div>
            )}
          </div>
          <div className="rounded-lg border bg-card p-5">
            <FormContato />
          </div>
        </div>
      </Secao>
    </SiteLayout>
  );
}
