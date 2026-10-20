import { Link } from "react-router-dom";
import "@/components/inicio/inicio.css";

// Rodapé do site: o nome da casa montado em blocos com as cores do logo.
const BLOCOS: { letra: string; cor: string; altura: number }[] = [
  { letra: "L", cor: "#c0392b", altura: 100 }, { letra: "a", cor: "#c0392b", altura: 72 }, { letra: "r", cor: "#c0392b", altura: 84 },
  { letra: "d", cor: "#b07a00", altura: 92 }, { letra: "e", cor: "#b07a00", altura: 68 },
  { letra: "S", cor: "#176e69", altura: 96 }, { letra: "e", cor: "#176e69", altura: 74 }, { letra: "u", cor: "#176e69", altura: 64 },
  { letra: "L", cor: "#0059b1", altura: 100 }, { letra: "u", cor: "#0059b1", altura: 70 }, { letra: "i", cor: "#0059b1", altura: 88 }, { letra: "z", cor: "#0059b1", altura: 78 },
];
const PALAVRAS = [[0, 3], [3, 5], [5, 8], [8, 12]];

const SiteFooter = () => (
  <footer className="ini-rodape ini-pagina">
    <div className="ini-rodape__marca" role="img" aria-label="Lar de Seu Luiz">
      {PALAVRAS.map(([a, b], i) => (
        <div key={i} className="ini-rodape__palavra">
          {BLOCOS.slice(a, b).map((x, j) => (
            <span key={j} style={{ background: x.cor, height: `${x.altura}%` }} aria-hidden="true">{x.letra}</span>
          ))}
        </div>
      ))}
    </div>

    <div className="ini-rodape__grade">
      <div>
        <h2>A casa</h2>
        <ul>
          <li><a href="/#semana">Horários</a></li>
          <li><Link to="/agenda">Agenda</Link></li>
          <li><Link to="/a-casa">Quem somos</Link></li>
          <li><a href="/#visite">Como chegar</a></li>
        </ul>
      </div>
      <div>
        <h2>Participe</h2>
        <ul>
          <li><Link to="/atendimentos">Atendimentos</Link></li>
          <li><a href="/#acoes">Ações sociais</a></li>
          <li><Link to="/voluntariado">Seja voluntário</Link></li>
          <li><a href="/formacao/">Cursos</a></li>
        </ul>
      </div>
      <div>
        <h2>Transparência</h2>
        <ul>
          <li><Link to="/a-casa#transparencia">Estatuto Social</Link></li>
          <li><Link to="/a-casa#transparencia">Relatório financeiro</Link></li>
          <li><Link to="/a-casa#transparencia">Ata de fundação</Link></li>
          <li><Link to="/privacidade">Privacidade e LGPD</Link></li>
        </ul>
      </div>
      <div className="ini-rodape__contato">
        <h2>Fale com a gente</h2>
        <p>Rua da Mata, s/n, Colônia do Pium<br />Nísia Floresta/RN, CEP 59164-000</p>
        <p><a href="https://wa.me/5584991432639" target="_blank" rel="noopener noreferrer">WhatsApp (84) 99143-2639</a><br />
          <a href="mailto:contato@lardeseuluiz.com.br">contato@lardeseuluiz.com.br</a></p>
        <p><a href="https://www.instagram.com/lardeseuluiz/" target="_blank" rel="noopener noreferrer">Instagram</a> · <a href="https://www.youtube.com/@LardeSeuLuiz" target="_blank" rel="noopener noreferrer">YouTube</a></p>
      </div>
    </div>

    <div className="ini-rodape__fim">
      <p>© 2025–2026 Lar de Seu Luiz. Organização religiosa sem fins lucrativos. Todos os serviços são gratuitos.</p>
      <Link to="/login" className="ini-botao ini-botao--claro">Entrar</Link>
    </div>
    <p className="ini-rodape__creditos">
      Foto do litoral de Nísia Floresta: <a href="https://commons.wikimedia.org/wiki/File:N%C3%ADsia_Floresta_-_State_of_Rio_Grande_do_Norte,_Brazil_-_panoramio_(1).jpg">Luiz Henrique</a>, <a href="https://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>, via Wikimedia Commons.
    </p>
  </footer>
);

export default SiteFooter;
