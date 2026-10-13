import { Link } from "react-router-dom";
import logoLSL from "@/assets/logo-lsl.png";
import { Instagram, Mail, Youtube } from "lucide-react";

const SiteFooter = () => (
  <footer className="site-footer">
    <div className="site-footer__inner">
      <div className="site-footer__top">
        <div>
          <div className="site-footer__brand">
            <img src={logoLSL} alt="Lar de Seu Luiz" className="site-footer__logo-img" />
            <span className="site-footer__brand-text">
              Lar de Seu Luiz
              <span className="site-footer__brand-sub">Centro Espiritualista • Nísia Floresta/RN</span>
            </span>
          </div>
          <p className="site-footer__desc">
            Casa espiritualista aberta a todos, dedicada ao acolhimento fraterno, estudo da Doutrina Espírita e ação social. Todos os serviços são gratuitos.
          </p>
          <div className="site-footer__socials">
            <a href="https://www.instagram.com/lardeseuluiz/" className="site-footer__social" target="_blank" rel="noopener noreferrer"><Instagram size={18} /></a>
            <a href="https://www.youtube.com/@LardeSeuLuiz" className="site-footer__social" target="_blank" rel="noopener noreferrer"><Youtube size={18} /></a>
            <a href="mailto:contato@lardeseuluiz.com.br" className="site-footer__social"><Mail size={18} /></a>
          </div>
        </div>
        <div>
          <div className="site-footer__col-title">Navegação</div>
          <ul className="site-footer__links">
            <li><a href="/#horarios">Horários</a></li>
            <li><Link to="/agenda">Agenda</Link></li>
            <li><a href="/#missao">Nossa Missão</a></li>
            <li><a href="/#eventos">Ações Sociais</a></li>
            <li><Link to="/atendimentos">Atendimentos</Link></li>
            <li><Link to="/a-casa">A Casa</Link></li>
            <li><Link to="/voluntariado">Seja Voluntário</Link></li>
            <li><a href="/#contato">Contato</a></li>
          </ul>
        </div>
        <div>
          <div className="site-footer__col-title">Institucional</div>
          <ul className="site-footer__links">
            <li><Link to="/a-casa#transparencia">Estatuto Social</Link></li>
            <li><Link to="/a-casa#transparencia">Relatório Financeiro</Link></li>
            <li><Link to="/a-casa#transparencia">Ata de Fundação</Link></li>
            <li><Link to="/privacidade">Política de Privacidade</Link></li>
            <li><Link to="/login">Entrar / Meu perfil</Link></li>
            <li><a href="/formacao/">Plataforma de Cursos</a></li>
          </ul>
        </div>
      </div>

      <div className="site-footer__bottom">
        <div className="site-footer__copy">
          © 2025–2026 Lar de Seu Luiz · CNPJ registrado · Organização Religiosa sem fins lucrativos
        </div>
        <div className="site-footer__lgpd">
          <Link to="/privacidade">Política de Privacidade</Link> · <Link to="/privacidade#lgpd">LGPD</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
