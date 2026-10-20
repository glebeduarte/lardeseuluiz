import { Link } from "react-router-dom";
import { Lock, Heart, Gift, MessageCircle, HandHeart, BedSingle, Sparkles } from "lucide-react";
import { PaginaSite, Secao, ListaSol, ConviteFinal } from "@/components/inicio/Pagina";
import { SEMANA, diaDeHojeNoLar } from "@/components/inicio/agenda-casa";

const servicos = [
  {
    Icone: MessageCircle, nome: "Diálogo Fraterno", selo: "O primeiro passo",
    texto: "Escuta, acolhimento e orientação para quem precisa ser ouvido. Disponível em todos os dias de trabalho aberto ao público.",
    dias: "Terças, 14h às 15h15. Sextas, 15h30 às 16h. Sábados, 14h30 às 15h45.",
  },
  {
    Icone: HandHeart, nome: "Passes", selo: "Gratuito",
    texto: "Imposição de mãos feita por médiuns preparados. Promove equilíbrio e alívio espiritual.",
    dias: "Terças, 17h às 18h30. Sextas, 17h às 18h45. Sábados quinzenais, 17h às 19h.",
  },
  {
    Icone: BedSingle, nome: "Tratamento Espiritual", selo: "Marcado no Diálogo Fraterno",
    texto: "Atendimento individual nas macas, com trabalho mediúnico de equilíbrio e harmonização, para quem busca equilíbrio físico, emocional e espiritual.",
    dias: "Terças, 17h às 18h30. Sábados quinzenais, 16h30 às 19h.",
  },
  {
    Icone: Sparkles, nome: "Atendimento de Desobsessão", selo: "Com avaliação antes",
    texto: "Trabalho mediúnico feito pela equipe da Secretaria Mediúnica, para equilíbrio e harmonização espiritual do perispírito.",
    dias: "Sextas, 15h30 às 18h45.",
  },
];

const garantias = [
  { Icone: Lock, titulo: "Sigiloso", texto: "Tudo o que é dito fica entre você e quem te atende." },
  { Icone: Heart, titulo: "Sem julgamentos", texto: "Acolhemos qualquer pessoa, de qualquer crença ou situação." },
  { Icone: Gift, titulo: "Gratuito", texto: "Como todo serviço da casa. Nada é cobrado, nunca." },
];

const AtendimentosPublic = () => {
  const hoje = diaDeHojeNoLar();
  return (
    <PaginaSite documento="Atendimentos" titulo="Como funcionam os atendimentos"
      intro="Todos os atendimentos são gratuitos, sigilosos e abertos a qualquer pessoa, sem distinção de religião, raça ou condição social. Nenhum julgamento, nenhuma cobrança. Só acolhimento."
      acoes={<a href="/#visite" className="ini-botao">Ver como chegar</a>}>

      <Secao titulo="Tudo começa pelo Diálogo Fraterno" fundo="papel" intro={<>
        <p>Toda pessoa que chega ao Lar começa por uma conversa individual, em lugar reservado. Você conta suas dificuldades e dúvidas com liberdade.</p>
        <p>Quem te atende é preparado pelos princípios do Evangelho à luz da Doutrina Espírita: ouve com respeito e não impõe crenças. Depois da conversa, você sabe qual atendimento combina com o seu momento.</p>
      </>}>
        <ul className="ini-cartoes">
          {garantias.map(({ Icone, titulo, texto }) => (
            <li key={titulo}><div className="ini-cartao"><span className="ini-cartao__marca"><Icone size={22} /></span><strong>{titulo}</strong><p>{texto}</p></div></li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="O que oferecemos" intro="Cada atendimento tem seus dias e horários. Na dúvida, chegue no horário do Diálogo Fraterno.">
        <ListaSol colunas={2} itens={servicos.map((s, i) => ({
          id: s.nome, marca: <s.Icone size={24} />, destaque: i === 0,
          titulo: s.nome, texto: s.texto,
          extra: <div className="ini-selos" style={{ margin: "12px 0 0" }}><span className="ini-selo ini-selo--ouro">{s.selo}</span><span className="ini-selo">{s.dias}</span></div>,
        }))} />
      </Secao>

      <Secao titulo="A semana da casa" fundo="teal-claro" intro={<>Os dias em que a casa abre. As palestras de cada data estão na <Link to="/agenda" className="underline">agenda</Link>.</>}>
        <ListaSol itens={SEMANA.map((t) => ({
          id: t.id, destaque: t.dia === hoje, marca: t.rotuloDia.slice(0, 3),
          titulo: t.nome, lado: t.horario, texto: `${t.rotuloDia}${t.dia === hoje ? ", hoje" : ""}. ${t.descricao}`,
        }))} />
      </Secao>

      <ConviteFinal foto="/imagens/litoral-nisia-floresta.jpg" fotoAlt="Coqueiros na beira do mar em Nísia Floresta" titulo="Dê o primeiro passo" botao="Ver como chegar" para="/#visite"
        texto="Não precisamos saber sua religião, sua história ou sua crença. Basta chegar. Rua da Mata, s/n, Colônia do Pium, Nísia Floresta/RN."
        extra={<a href="https://wa.me/5584991432639" target="_blank" rel="noopener noreferrer" className="ini-botao ini-botao--claro">WhatsApp (84) 99143-2639</a>} />
    </PaginaSite>
  );
};

export default AtendimentosPublic;
