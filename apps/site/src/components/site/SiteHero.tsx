import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import logoLSL from "@/assets/logo-lsl.png";
import heroBg from "@/assets/hero-bg.jpg";

const SiteHero = () => (
  <section className="site-hero" id="top">
    <div className="site-hero__bg" style={{ backgroundImage: `url(${heroBg})` }} />
    <div className="site-hero__pattern" />
    <div className="site-hero__orb site-hero__orb--1" />
    <div className="site-hero__orb site-hero__orb--2" />
    <div className="site-hero__orb site-hero__orb--3" />
    <div className="site-hero__motif" />

    <div className="site-hero__content">
      <motion.div
        className="site-hero__eyebrow"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="site-hero__eyebrow-dot" />
        Centro Espiritualista — Pium — Nísia Floresta/RN
      </motion.div>

      <motion.img
        src={logoLSL}
        alt="Lar de Seu Luiz"
        className="site-hero__logo"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
      />

      <motion.h1
        className="site-hero__title"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2 }}
      >
        Um lugar de <em>Luz</em>,<br />
        Acolhimento e Amor
      </motion.h1>

      <motion.p
        className="site-hero__sub"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.35 }}
      >
        Aqui, todo ser humano — independente de raça, crença ou condição — encontra
        orientação, amparo espiritual e fraternidade genuína.
      </motion.p>

      <motion.p
        className="site-hero__verse"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.45 }}
      >
        "Fora da Caridade não há Salvação." — Allan Kardec
      </motion.p>

      <motion.div
        className="site-hero__btns"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.55 }}
      >
        <Link to="/atendimentos" className="site-btn-primary">
          Quero receber atendimento
        </Link>
        <a href="#horarios" className="site-btn-ghost">
          Ver Horários →
        </a>
      </motion.div>
    </div>

    <div
      className="site-hero__scroll"
      onClick={() => document.getElementById("horarios")?.scrollIntoView({ behavior: "smooth" })}
    >
      <span>Rolar</span>
      <div className="site-hero__scroll-arrow" />
    </div>
  </section>
);

export default SiteHero;
