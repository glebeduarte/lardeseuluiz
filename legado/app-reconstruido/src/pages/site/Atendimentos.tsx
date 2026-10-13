import { Link } from "react-router-dom";
import { SiteLayout, Secao } from "@/components/site/SiteLayout";
import { Programacao } from "@/components/site/Programacao";
import { Button } from "@/components/ui/button";

const ATENDIMENTOS = [
  {
    nome: "Diálogo Fraterno",
    selo: "Primeiro passo",
    texto:
      "Espaço de escuta e acolhimento. Em sigilo e fraternidade, você é ouvido, orientado e encaminhado ao atendimento mais adequado. Todo atendimento começa aqui.",
  },
  {
    nome: "Passes",
    selo: "Gratuito",
    texto: "Atendimento espiritual com imposição de mãos, realizado por médiuns preparados. Promove equilíbrio e alívio.",
  },
  {
    nome: "Tratamento espiritual nas macas",
    selo: "Por indicação",
    texto:
      "Atendimento individual com trabalho mediúnico de equilíbrio e harmonização, em ciclos de sessões, com acompanhamento até a alta.",
  },
  {
    nome: "Desobsessão",
    selo: "Com avaliação",
    texto: "Trabalho mediúnico especializado, conduzido pela Secretaria Mediúnica, para equilíbrio e harmonização espiritual.",
  },
  {
    nome: "Tratamento a distância",
    selo: "Por indicação",
    texto: "Para quem não pode comparecer, o tratamento pode ser feito a distância, por indicação do Diálogo Fraterno.",
  },
];

export default function Atendimentos() {
  return (
    <SiteLayout>
      <Secao eyebrow="Para você que busca ajuda" titulo="Atendimentos da casa"
        intro="Todos os atendimentos são gratuitos e abertos a qualquer pessoa, sem distinção de religião, raça ou condição social. O atendimento é por ordem de chegada, sem agendamento.">
        <div className="grid gap-4 md:grid-cols-2">
          {ATENDIMENTOS.map((a) => (
            <article key={a.nome} className="rounded-lg border bg-card p-5 flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">{a.selo}</span>
              <h2 className="text-xl font-semibold">{a.nome}</h2>
              <p className="text-sm text-muted-foreground">{a.texto}</p>
            </article>
          ))}
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          O atendimento espiritual não substitui tratamento médico ou psicológico. Continue seguindo as orientações dos profissionais de saúde que acompanham você.
        </p>
      </Secao>
      <Secao eyebrow="Dias e horários" titulo="Quando vir" tom="card">
        <Programacao />
        <div><Button asChild variant="outline"><Link to="/#contato">Tirar dúvidas pelo contato</Link></Button></div>
      </Secao>
    </SiteLayout>
  );
}
