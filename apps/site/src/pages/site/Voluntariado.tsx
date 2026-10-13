import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import SitePage from "@/components/site/SitePage";
import { supabase } from "@/integrations/supabase/client";
import { useProjetos } from "@/lib/site-dados";

const etapas = [
  { titulo: "Conversa no Acolhimento", texto: "Você conta seu interesse e conhece como a casa funciona." },
  { titulo: "Curso de preparação", texto: "Formação sobre o trabalho voluntário na casa espírita, na Área de Formação." },
  { titulo: "Estágio acompanhado", texto: "Um período servindo com um voluntário experiente ao seu lado." },
  { titulo: "Integração", texto: "Você passa a fazer parte de uma secretaria ou ação social." },
];

const AREAS = ["Acolhimento", "Atendimento espiritual", "Evangelização", "Ações sociais", "Comunicação", "Infraestrutura", "Outra"];

const Voluntariado = () => {
  const { data: projetos = [] } = useProjetos();
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

          {enviado ? (
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
