import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Lock, Heart, Gift } from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import CookieBanner from "@/components/site/CookieBanner";
import WeeklyCalendar from "@/components/site/WeeklyCalendar";
import iconCura from "@/assets/icon-cura.png";
import iconPasses from "@/assets/icon-passes.png";
import iconDesobsessao from "@/assets/icon-desobsessao.png";
import iconDialogo from "@/assets/icon-dialogo.png";

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 36 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true, margin: "-40px" as const },
  transition: { duration: 0.7, delay },
});

const servicos = [
  {
    icon: iconCura,
    name: "Tratamento Espiritual",
    desc: "Atendimento espiritual individualizado com trabalho mediúnico de equilíbrio e harmonização. Realizado em ambiente adequado com equipe preparada. Indicado para pessoas que buscam equilíbrio físico, emocional e espiritual.",
    dias: "Terças-feiras · 17h às 18h30 | Sábados quinzenais · 16h30 às 19h",
    badge: "Agendado via Diálogo Fraterno",
    badgeColor: "gold",
  },
  {
    icon: iconPasses,
    name: "Passes",
    desc: "Atendimento espiritual com imposição de mãos, realizado por médiuns devidamente preparados. Promove equilíbrio e alívio espiritual.",
    dias: "Terças-feiras · 17h às 18h30 | Sextas-feiras · 17h às 18h45 | Sábados quinzenais · 17h às 19h",
    badge: "Gratuito",
    badgeColor: "teal",
  },
  {
    icon: iconDesobsessao,
    name: "Atendimento de Desobsessão",
    desc: "Trabalho mediúnico especializado realizado pela equipe da Secretaria Mediúnica, para equilíbrio e harmonização espiritual do perispírito. Realizado nas sessões de sexta-feira.",
    dias: "Sextas-feiras · 15h30 às 18h45",
    badge: "Com avaliação prévia",
    badgeColor: "gold",
  },
  {
    icon: iconDialogo,
    name: "Diálogo Fraterno",
    desc: "Espaço de escuta ativa para quem precisa ser ouvido, orientado e amparado. Disponível em todos os dias de trabalho aberto ao público.",
    dias: "Terças · 14h–15h15 | Sextas · 15h30–16h | Sábados · 14h30–15h45",
    badge: "Gratuito · Aberto a Todos",
    badgeColor: "teal",
  },
];

const AtendimentosPublic = () => {
  useEffect(() => {
    document.title = "Atendimentos | Lar de Seu Luiz";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="site-root">
      <SiteNav />

      {/* Hero */}
      <section className="atd-hero">
        <div className="atd-hero__inner">
          <motion.div {...reveal()}>
            <div className="site-tag site-tag--light">
              <span className="site-tag__bar" />
              Para Você que Busca Ajuda
            </div>
            <h1 className="atd-hero__title">Como funcionam os atendimentos</h1>
            <p className="atd-hero__sub">
              Todos os atendimentos no Lar de Seu Luiz são gratuitos, sigilosos e abertos a qualquer pessoa — sem distinção de religião, raça ou condição social. Nenhum julgamento. Nenhuma cobrança. Só acolhimento.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Seção 1 - Diálogo Fraterno */}
      <section className="atd-dialogo">
        <div className="atd-dialogo__inner">
          <motion.div {...reveal()}>
            <div className="site-tag site-tag--teal">
              <span className="site-tag__bar" />
              O Primeiro Passo
            </div>
            <h2 className="atd-dialogo__title">O Diálogo Fraterno</h2>
            <div className="atd-dialogo__text">
              <p>
                Toda pessoa que busca atendimento no Lar de Seu Luiz começa pelo Diálogo Fraterno — um espaço de escuta ativa, acolhimento e orientação individual.
              </p>
              <p>
                Em ambiente privativo e sigiloso, você tem a oportunidade de expor livremente suas dificuldades, dúvidas e necessidades. Nossos atendentes, preparados e orientados pelos princípios do Evangelho à luz da Doutrina Espírita, ouvem com respeito, sem julgamentos e sem impor crenças.
              </p>
              <p>
                A partir desse diálogo, você é orientado sobre o tipo de atendimento mais adequado para sua situação — seja um passe, tratamento espiritual ou acompanhamento espiritual.
              </p>
            </div>
          </motion.div>

          <div className="atd-dialogo__cards">
            {[
              { Icon: Lock, title: "Sigiloso", desc: "Tudo que é dito permanece entre você e o atendente" },
              { Icon: Heart, title: "Sem julgamentos", desc: "Acolhemos independente de crença ou situação" },
              { Icon: Gift, title: "Gratuito", desc: "Como todo serviço da casa" },
            ].map((item, i) => (
              <motion.div key={item.title} className="atd-dialogo__card" {...reveal((i + 1) * 0.12)}>
                <div className="atd-dialogo__card-icon">
                  <item.Icon size={28} strokeWidth={1.75} />
                </div>
                <div className="atd-dialogo__card-title">{item.title}</div>
                <div className="atd-dialogo__card-desc">{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção 2 - Tipos de atendimento */}
      <section className="atd-servicos">
        <div className="atd-servicos__inner">
          <motion.div {...reveal()}>
            <div className="site-tag site-tag--light">
              <span className="site-tag__bar" />
              Nossos Serviços
            </div>
            <h2 className="atd-servicos__title">O que oferecemos</h2>
          </motion.div>

          <div className="atd-servicos__grid">
            {servicos.map((s, i) => (
              <motion.div key={s.name} className="atd-servico-card" {...reveal((i + 1) * 0.1)}>
                <div className="atd-servico-card__icon">
                  <img src={s.icon} alt={s.name} style={{ width: 40, height: 40, objectFit: "contain" }} />
                </div>
                <div className="atd-servico-card__name">{s.name}</div>
                <div className="atd-servico-card__desc">{s.desc}</div>
                <div className="atd-servico-card__dias">{s.dias}</div>
                <span className={`atd-servico-card__badge atd-servico-card__badge--${s.badgeColor}`}>
                  {s.badge}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção 3 - Calendário Semanal */}
      <WeeklyCalendar />

      {/* Seção 4 - CTA final */}
      <section className="atd-cta-final">
        <div className="atd-cta-final__inner">
          <motion.div {...reveal()}>
            <h2 className="atd-cta-final__title">Dê o primeiro passo.</h2>
            <p className="atd-cta-final__sub">
              Venha nos visitar. Não precisamos saber sua religião, sua história ou sua crença. Basta chegar — e deixar que o acolhimento faça o resto.
            </p>
            <a href="/#contato" className="atd-cta-final__btn">
              Ver como chegar →
            </a>
            <p className="atd-cta-final__address">
              Rua da Mata, s/n – Colônia do Pium, Nísia Floresta/RN · (84) 99143-2639
            </p>
          </motion.div>
        </div>
      </section>

      <SiteFooter />
      <CookieBanner />
    </div>
  );
};

export default AtendimentosPublic;
