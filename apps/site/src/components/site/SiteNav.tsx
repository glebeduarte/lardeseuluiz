import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import logoLSL from "@/assets/logo-lsl.png";

const links = [
  { href: "#horarios", label: "Horários" },
  { href: "#missao", label: "Nossa Missão" },
  { href: "#eventos", label: "Eventos" },
  { href: "/atendimentos", label: "Atendimento", isRoute: true },
  { href: "#sobre", label: "A Instituição" },
  { href: "#contato", label: "Contato" },
];

const SiteNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleAnchorClick = (e: React.MouseEvent, hash: string) => {
    e.preventDefault();
    setMenuOpen(false);
    if (location.pathname !== "/") {
      navigate("/" + hash);
    } else {
      const el = document.getElementById(hash.replace("#", ""));
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className={`site-nav ${scrolled ? "site-nav--scrolled" : ""}`}
      aria-label="Navegação principal"
    >
      <Link className="site-nav__brand" to="/">
        <img src={logoLSL} alt="Lar de Seu Luiz" className="site-nav__logo-img" />
        <span className="site-nav__name">
          Lar de Seu Luiz
          <span className="site-nav__subtitle">Centro Espiritualista • Nísia Floresta/RN</span>
        </span>
      </Link>

      <ul className={`site-nav__links ${menuOpen ? "site-nav__links--open" : ""}`}>
        {links.map((l) => (
          <li key={l.href}>
            {l.isRoute ? (
              <Link to={l.href} onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ) : (
              <a href={l.href} onClick={(e) => handleAnchorClick(e, l.href)}>
                {l.label}
              </a>
            )}
          </li>
        ))}
        <li>
          <Link to="/atendimentos" className="site-nav__cta" onClick={() => setMenuOpen(false)}>
            Quero receber atendimento
          </Link>
        </li>
      </ul>

      <button
        className="site-nav__toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
        type="button"
      >
        <span className={`site-nav__hamburger ${menuOpen ? "open" : ""}`} />
      </button>
    </nav>
  );
};

export default SiteNav;
