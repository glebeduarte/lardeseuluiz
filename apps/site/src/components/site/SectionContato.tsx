import { motion } from "framer-motion";
import { Instagram, Youtube } from "lucide-react";
import iconLocal from "@/assets/icon-local.png";
import iconWhatsapp from "@/assets/icon-whatsapp.png";
import iconEmail from "@/assets/icon-email.png";

const reveal = (delay = 0, dir: "up" | "right" = "up") => ({
  initial: { opacity: 0, ...(dir === "right" ? { x: 40 } : { y: 36 }) },
  whileInView: { opacity: 1, x: 0, y: 0 },
  viewport: { once: true, margin: "-40px" as const },
  transition: { duration: 0.7, delay },
});

const SectionContato = () => (
  <section className="site-contato" id="contato">
    <div className="site-contato__inner">
      <motion.div className="site-section-header" style={{ marginBottom: 0 }} {...reveal()}>
        <div className="site-tag site-tag--teal">
          <span className="site-tag__bar" />
          Venha Nos Visitar
        </div>
      </motion.div>

      <div className="site-contato__grid" style={{ marginTop: 40 }}>
        <div>
          <motion.h2 className="site-contato__title" {...reveal()}>
            Como Chegar<br />e nos Contatar
          </motion.h2>
          <motion.p className="site-contato__sub" {...reveal()}>
            Estamos de portas abertas. Venha como você é — sem julgamentos, sem cobranças, sem requisitos. A casa é sua.
          </motion.p>

          <motion.div className="site-contato__items" {...reveal()}>
            <div className="site-contato-item">
              <img src={iconLocal} alt="Endereço" style={{ width: 36, height: 36, objectFit: "contain" }} />
              <div>
                <div className="site-contato-item__label">Endereço</div>
                <div className="site-contato-item__value">Rua da Mata, s/n</div>
                <div className="site-contato-item__sub">Nísia Floresta/RN · CEP 59164-000 · Brasil</div>
              </div>
            </div>
            <div className="site-contato-item">
              <img src={iconWhatsapp} alt="WhatsApp" style={{ width: 36, height: 36, objectFit: "contain" }} />
              <div>
                <div className="site-contato-item__label">WhatsApp</div>
                <div className="site-contato-item__value">
                  <a href="https://wa.me/5584991432639" style={{ color: "hsl(var(--secondary))" }} target="_blank" rel="noopener noreferrer">
                    (84) 99143-2639
                  </a>
                </div>
                <div className="site-contato-item__sub">Seg a Sáb, das 9h às 18h</div>
              </div>
            </div>
            <div className="site-contato-item">
              <img src={iconEmail} alt="E-mail" style={{ width: 36, height: 36, objectFit: "contain" }} />
              <div>
                <div className="site-contato-item__label">E-mail</div>
                <div className="site-contato-item__value">contato@lardeseuluiz.com.br</div>
              </div>
            </div>
          </motion.div>

          <motion.div className="site-horarios-resumo" {...reveal()}>
            <div className="site-horarios-resumo__title">🕐 Funcionamento</div>
            <div className="site-horarios-resumo__row">
              <div className="site-horarios-resumo__dia">Terças</div>
              <div className="site-horarios-resumo__ativ">Tratamento Espiritual e Atendimento — 14h às 18h30</div>
            </div>
            <div className="site-horarios-resumo__row">
              <div className="site-horarios-resumo__dia">Quintas</div>
              <div className="site-horarios-resumo__ativ">ESDE Online (Google Meet) — 19h30 às 21h</div>
            </div>
            <div className="site-horarios-resumo__row">
              <div className="site-horarios-resumo__dia">Sextas</div>
              <div className="site-horarios-resumo__ativ">Desobsessão e Atendimento — 15h30 às 18h45</div>
            </div>
            <div className="site-horarios-resumo__row">
              <div className="site-horarios-resumo__dia">Sábados</div>
              <div className="site-horarios-resumo__ativ">Tratamento Espiritual Quinzenal — 14h30 às 19h</div>
            </div>
            <div className="site-horarios-resumo__row">
              <div className="site-horarios-resumo__dia">Sábados</div>
              <div className="site-horarios-resumo__ativ">CaFÉ & AMor (mensal) — 16h às 18h</div>
            </div>
          </motion.div>

          <motion.div {...reveal()}>
            <div style={{ fontSize: ".78rem", fontWeight: 700, color: "hsl(var(--neutral-600))", letterSpacing: ".06em", textTransform: "uppercase" as const, marginBottom: 12 }}>
              Redes Sociais
            </div>
            <div className="site-social-links">
              <a href="https://www.instagram.com/lardeseuluiz/" className="site-social-btn" title="Instagram" target="_blank" rel="noopener noreferrer"><Instagram size={20} /></a>
              <a href="https://www.youtube.com/@LardeSeuLuiz" className="site-social-btn" title="YouTube" target="_blank" rel="noopener noreferrer"><Youtube size={20} /></a>
              <a href="mailto:contato@lardeseuluiz.com.br" className="site-social-btn" title="E-mail"><img src={iconEmail} alt="E-mail" style={{ width: 20, height: 20, objectFit: "contain" }} /></a>
            </div>
          </motion.div>
        </div>

        <motion.div className="site-contato__map" {...reveal(0, "right")}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3943.5!2d-35.209!3d-6.08!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zUnVhIGRhIE1hdGEsIE7DrXNpYSBGbG9yZXN0YSAtIFJO!5e0!3m2!1spt-BR!2sbr!4v1"
            width="100%"
            height="100%"
            style={{ border: 0, borderRadius: 24, minHeight: 460 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Localização do Lar de Seu Luiz"
          />
        </motion.div>
      </div>
    </div>
  </section>
);

export default SectionContato;
