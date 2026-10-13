import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import SitePage from "@/components/site/SitePage";
import { supabase } from "@/integrations/supabase/client";
import { useProjetos } from "@/lib/site-dados";
import JornadaVoluntario, { useProximoCiclo } from "@/components/site/JornadaVoluntario";
import { useAuth } from "@/hooks/useAuth";
import { dataCurta } from "@/lib/chamamento";

const etapas = [
  { titulo: "Chamamento e entrevista", texto: "Depois da reunião pública, procure a recepção. A Secretaria de Acolhimento conversa com você sobre motivação, disponibilidade e áreas de interesse." },
  { titulo: "Curso O Trabalho Voluntário na Casa Espírita", texto: "Um sábado pela manhã de formação, integração e acolhimento, com testemunhos de quem já serve na casa." },
  { titulo: "Estágio de 8 semanas", texto: "Com um tutor ao seu lado, você conhece na prática a recepção, o apoio logístico e a organização dos espaços." },
  { titulo: "Avaliação final", texto: "Uma conversa fraterna com o tutor e os coordenadores sobre o caminho percorrido." },
  { titulo: "Integração oficial", texto: "Boas-vindas na roda de preparação antes da reunião pública e inclusão na escala de trabalho." },
];

const AREAS = ["Acolhimento", "Atendimento espiritual", "Evangelização", "Ações sociais", "Comunicação", "Infraestrutura", "Outra"];

const Voluntariado = () => {
  const { data: projetos = [] } = useProjetos();
  const { data: ciclo } = useProximoCiclo();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", interest_area: "", message: "", project_id: "" });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const { error } = await supabase.from("volunteer_submissions").insert({
      name: form.name, email: form.email, phone: form.phone || null, interest_area: form.interest_area || null,
      message: form.message || null, ...(form.project_id ? { project_id: form.project_id } : {}),
    } as never);
    setEnviando(false);
    if (error) return toast.error("Não foi possível enviar agora. Tente de novo ou fale pelo WhatsApp.");
    setEnviado(true);
  };

  return (
    <SitePage documento="Seja voluntário" tag="Faça Parte" titulo="Seja voluntário"
      intro="O trabalho voluntário é a essência da nossa casa. Veja como funciona e deixe seu contato: a coordenação do Acolhimento fala com você.">
      <section className="pg-secao pg-secao--clara">
        <div className="pg-secao__inner pg-secao__inner--estreito">
          <div className="pg-etapas">
            {etapas.map((et, i) => (
              <motion.div key={et.titulo} className="pg-etapa" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}>
                <div className="pg-etapa__num">{i + 1}</div>
                <div><h3>{et.titulo}</h3><p>{et.texto}</p></div>
              </motion.div>
            ))}
          </div>

          {ciclo && (
            <div className="pg-grupo" style={{ background: "hsl(var(--primary) / 0.06)", borderColor: "hsl(var(--primary) / 0.2)", marginBottom: 32 }}>
              <div>
                <div className="pg-grupo__titulo">Próximo ciclo: {ciclo.name}</div>
                <div className="pg-edicao__info">
                  {[ciclo.interviews_until && `Entrevistas até ${dataCurta(ciclo.interviews_until)}`, ciclo.course_on && `curso no sábado ${dataCurta(ciclo.course_on)}`, ciclo.integration_on && `integração em ${dataCurta(ciclo.integration_on)}`].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
          )}

          <JornadaVoluntario />

          {user ? null : enviado ? (
            <p className="pg-ok">✅ Obrigado pelo interesse! Entraremos em contato em breve.</p>
          ) : (
            <form className="pg-form" onSubmit={enviar}>
              <div className="field">
                <label className="field-label">Nome *</label>
                <input className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="pg-form__linha">
                <div className="field">
                  <label className="field-label">E-mail *</label>
                  <input className="field-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="field">
                  <label className="field-label">WhatsApp</label>
                  <input className="field-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="pg-form__linha">
                <div className="field">
                  <label className="field-label">Área de interesse</label>
                  <select className="field-select" value={form.interest_area} onChange={(e) => setForm({ ...form, interest_area: e.target.value })}>
                    <option value="">Selecione</option>
                    {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Ação social (opcional)</label>
                  <select className="field-select" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                    <option value="">Nenhuma em especial</option>
                    {projetos.filter((p) => p.accepts_volunteers).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Mensagem</label>
                <textarea className="field-textarea" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Conte um pouco sobre você e sua disponibilidade" />
              </div>
              <button className="ds-btn ds-btn-primary ds-btn-lg" type="submit" disabled={enviando}>
                {enviando ? "Enviando..." : "✦ Quero ser voluntário"}
              </button>
            </form>
          )}
        </div>
      </section>
    </SitePage>
  );
};

export default Voluntariado;
