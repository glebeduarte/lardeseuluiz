import { Link } from "react-router-dom";
import logoLSL from "@/assets/logo-lsl.png";
import "@/components/inicio/inicio.css";

// Rodapé do site: o logo oficial no canto e os links agrupados, compacto.
const SiteFooter = () => (
  <footer className="ini-rodape ini-pagina">
    <div className="ini-rodape__grade">
      <div className="ini-rodape__marca">
        <img src={logoLSL} alt="Lar de Seu Luiz" width={64} height={78} />
        <div>
          <p>Casa espiritualista na Colônia do Pium, Nísia Floresta/RN. Todos os serviços são gratuitos.</p>
          <p><a href="https://wa.me/5584991432639" target="_blank" rel="noopener noreferrer">WhatsApp (84) 99143-2639</a> · <a href="mailto:contato@lardeseuluiz.com.br">contato@lardeseuluiz.com.br</a></p>
        </div>
      </div>
      <nav aria-label="A casa">
        <h2>A casa</h2>
        <ul>
          <li><a href="/#semana">Horários</a></li>
          <li><Link to="/agenda">Agenda</Link></li>
          <li><Link to="/a-casa">Quem somos</Link></li>
          <li><a href="/#visite">Como chegar</a></li>
        </ul>
      </nav>
      <nav aria-label="Participe">
        <h2>Participe</h2>
        <ul>
          <li><Link to="/atendimentos">Atendimentos</Link></li>
          <li><a href="/#acoes">Ações sociais</a></li>
          <li><Link to="/voluntariado">Seja voluntário</Link></li>
          <li><a href="/formacao/">Cursos</a></li>
        </ul>
      </nav>
      <nav aria-label="Transparência">
        <h2>Transparência</h2>
        <ul>
          <li><Link to="/a-casa#transparencia">Documentos</Link></li>
          <li><Link to="/privacidade">Privacidade e LGPD</Link></li>
          <li><a href="https://www.instagram.com/lardeseuluiz/" target="_blank" rel="noopener noreferrer">Instagram</a></li>
          <li><a href="https://www.youtube.com/@LardeSeuLuiz" target="_blank" rel="noopener noreferrer">YouTube</a></li>
        </ul>
      </nav>
    </div>

    <div className="ini-rodape__fim">
      <p>
        © 2025–2026 Lar de Seu Luiz. Organização religiosa sem fins lucrativos.
        {" "}Foto do litoral de Nísia Floresta: <a href="https://commons.wikimedia.org/wiki/File:N%C3%ADsia_Floresta_-_State_of_Rio_Grande_do_Norte,_Brazil_-_panoramio_(1).jpg">Luiz Henrique</a>, <a href="https://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>.
      </p>
      <Link to="/login" className="ini-rodape__entrar">Entrar</Link>
    </div>
  </footer>
);

export default SiteFooter;
