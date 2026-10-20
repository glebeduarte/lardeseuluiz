import { PaginaSite, Secao } from "@/components/inicio/Pagina";

const itens: [string, string][] = [
  ["Quais dados guardamos", "Nome e contatos de quem cria conta, envia mensagem ou se inscreve em cursos e ações. Nos atendimentos, as informações registradas no Diálogo Fraterno, que podem incluir dados de saúde."],
  ["Para que usamos", "Para organizar cursos, inscrições, atendimentos e ações sociais, e para falar com você sobre eles. Não vendemos nem compartilhamos dados com terceiros."],
  ["Quem tem acesso", "Somente os voluntários que precisam da informação para o trabalho. As fichas de atendimento são vistas apenas pela equipe do atendimento, e cada médium vê apenas os consulentes da própria maca."],
  ["Uma conta só", "Site, Área de Formação e Atendimento usam a mesma conta. Seus dados de cadastro ficam no seu perfil e são atualizados em todas as áreas."],
  ["Dados de crianças", "Só com autorização do responsável legal, que pode acompanhar e pedir correção ou exclusão."],
  ["Seus direitos", "Você pode ver e corrigir seus dados no seu perfil, retirar consentimentos e pedir a exclusão do cadastro pelo contato da casa."],
  ["Cookies", "Usamos apenas o necessário para manter você conectado. Não usamos cookies de publicidade."],
];

const Privacidade = () => (
  <PaginaSite documento="Privacidade" titulo="Privacidade e proteção de dados"
    intro="Cuidamos das informações de quem frequenta a casa com o mesmo zelo com que cuidamos das pessoas.">
    <Secao id="lgpd" titulo="Como cuidamos dos seus dados" fundo="papel"
      intro="Encarregado de dados: Direção do Lar de Seu Luiz, pelo e-mail contato@lardeseuluiz.com.br.">
      <ul className="ini-cartoes">
        {itens.map(([t, d]) => (
          <li key={t}><div className="ini-cartao"><strong>{t}</strong><p>{d}</p></div></li>
        ))}
      </ul>
    </Secao>
  </PaginaSite>
);

export default Privacidade;
