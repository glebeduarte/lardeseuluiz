import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SectionReveal from "./SectionReveal";

const steps = [
  { step: "01", title: "Interesse", desc: "Preencha o formulário de interesse abaixo ou compareça à casa." },
  { step: "02", title: "Acolhimento", desc: "Conheça nossas atividades e participe como frequentador por um período." },
  { step: "03", title: "Formação", desc: "Participe dos cursos de formação doutrinária oferecidos pela casa." },
  { step: "04", title: "Integração", desc: "Escolha uma secretaria e comece a servir como voluntário efetivo." },
];

const areas = ["Acolhimento", "Formação Doutrinária", "Cultura", "Social", "Infraestrutura", "Comunicação"];

const SectionVoluntario = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", interest_area: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { toast.error("Nome e e-mail são obrigatórios."); return; }
    setLoading(true);
    const { error } = await supabase.from("volunteer_submissions").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      interest_area: form.interest_area || null,
      message: form.message.trim() || null,
    });
    setLoading(false);
    if (error) { toast.error("Erro ao enviar. Tente novamente."); return; }
    toast.success("Interesse registrado com sucesso!");
    setSubmitted(true);
  };

  return (
    <SectionReveal id="voluntario">
      <div className="site-container">
        <span className="site-section__badge">Seja Voluntário</span>
        <h2 className="site-section__title">Venha Fazer Parte</h2>
        <p className="site-section__lead">O trabalho voluntário é a essência da nossa casa. Conheça as etapas para se tornar um colaborador.</p>

        <div className="site-steps">
          {steps.map((s, i) => (
            <div key={s.step} className="site-step">
              <div className="site-step__marker">
                <div className="site-step__number">{s.step}</div>
                {i < steps.length - 1 && <div className="site-step__line" />}
              </div>
              <div className="site-step__content"><h3>{s.title}</h3><p>{s.desc}</p></div>
            </div>
          ))}
        </div>

        {submitted ? (
          <div className="site-volunteer-cta" style={{ textAlign: "center" }}>
            <p style={{ fontSize: "1.1rem", color: "hsl(var(--secondary))", fontWeight: 600 }}>✅ Obrigado pelo interesse! Entraremos em contato em breve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="site-contact-form" style={{ maxWidth: 540, margin: "2rem auto 0" }}>
            <div className="field">
              <label className="field-label">Nome *</label>
              <input className="field-input" placeholder="Seu nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="field">
                <label className="field-label">E-mail *</label>
                <input className="field-input" type="email" placeholder="seu@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="field">
                <label className="field-label">Telefone</label>
                <input className="field-input" placeholder="(11) 99999-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Área de interesse</label>
              <select className="field-select" value={form.interest_area} onChange={e => setForm(f => ({ ...f, interest_area: e.target.value }))}>
                <option value="">Selecione uma área</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Mensagem</label>
              <textarea className="field-textarea" placeholder="Conte um pouco sobre você..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            </div>
            <button className="ds-btn ds-btn-primary ds-btn-lg" type="submit" disabled={loading}>
              {loading ? "Enviando..." : "✦ Quero ser voluntário"}
            </button>
          </form>
        )}
      </div>
    </SectionReveal>
  );
};

export default SectionVoluntario;
