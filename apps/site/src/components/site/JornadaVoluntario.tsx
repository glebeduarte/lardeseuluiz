import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/acoes";
import { AREAS_INTERESSE, ETAPA_LABEL, ETAPAS_JORNADA, dataCurta, proximoPasso, type Ciclo, type MinhaJornada } from "@/lib/chamamento";

export function useMinhaJornada(habilitado = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["minha-jornada", user?.id],
    enabled: !!user && habilitado,
    queryFn: async () => ((await db.rpc("minha_jornada")).data ?? null) as MinhaJornada,
  });
}

export function useProximoCiclo() {
  return useQuery({
    queryKey: ["proximo-ciclo"],
    queryFn: async () => {
      const { data } = await db.from("volunteer_cycles").select("*").neq("status", "encerrado").order("starts_on").limit(3);
      const hoje = new Date().toISOString().slice(0, 10);
      return ((data ?? []) as Ciclo[]).find((c) => (c.course_on ?? c.starts_on) >= hoje) ?? null;
    },
  });
}

/** Bloco do site (Seja voluntário): mostra a jornada de quem já começou ou deixa iniciar com a própria conta. */
export default function JornadaVoluntario() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: jornada, isLoading } = useMinhaJornada();
  const [f, setF] = useState({ areas: [] as string[], disponibilidade: "", motivacao: "" });
  const iniciar = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("chamamento_me_candidatar", { p_areas: f.areas, p_disponibilidade: f.disponibilidade, p_motivacao: f.motivacao });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["minha-jornada"] }),
  });

  if (!user) {
    return (
      <p className="pg-edicao__info" style={{ marginBottom: 24 }}>
        Já tem conta na plataforma? <Link to="/login?voltar=/voluntariado" style={{ textDecoration: "underline" }}>Entre</Link> para iniciar a sua jornada e acompanhar cada etapa pelo seu perfil.
      </p>
    );
  }
  if (isLoading) return null;

  const aberta = jornada && !["desligado", "colaborador"].includes(jornada.etapa);
  if (aberta) {
    const idx = ETAPAS_JORNADA.findIndex((e) => e.etapa === jornada.etapa);
    return (
      <div className="pg-form" style={{ marginBottom: 32 }}>
        <div className="pg-edicao__data">Sua jornada de voluntário</div>
        <div className="site-evento-card__tags">
          {ETAPAS_JORNADA.map((e, i) => (
            <span key={e.etapa} className="site-tag-pill" style={i === idx ? { background: "hsl(var(--secondary))", color: "hsl(var(--primary-dark))", fontWeight: 700 } : i < idx ? { opacity: 0.6 } : undefined}>
              {i < idx ? "✓ " : ""}{e.curto}
            </span>
          ))}
        </div>
        <p className="pg-ok" style={{ fontSize: "0.98rem", color: "hsl(var(--primary))" }}>{ETAPA_LABEL[jornada.etapa]}</p>
        <p className="pg-edicao__info" style={{ fontSize: "0.92rem" }}>{proximoPasso(jornada)}</p>
        <Link to="/app/perfil?aba=jornada" className="ds-btn ds-btn-outline ds-btn-sm" style={{ justifySelf: "start" }}>Ver no meu perfil</Link>
      </div>
    );
  }

  return (
    <form className="pg-form" style={{ marginBottom: 32 }} onSubmit={(e) => { e.preventDefault(); iniciar.mutate(); }}>
      <div className="pg-edicao__data">Iniciar a minha jornada</div>
      <p className="pg-edicao__info">Com a sua conta, a Secretaria de Acolhimento recebe o pedido e você acompanha cada etapa pelo perfil.</p>
      <div className="field">
        <label className="field-label">Onde você gostaria de servir?</label>
        <div className="site-evento-card__tags">
          {AREAS_INTERESSE.map((a) => {
            const marcado = f.areas.includes(a);
            return (
              <button type="button" key={a} className="site-tag-pill" aria-pressed={marcado}
                style={marcado ? { background: "hsl(var(--primary))", color: "white" } : undefined}
                onClick={() => setF({ ...f, areas: marcado ? f.areas.filter((x) => x !== a) : [...f.areas, a] })}>{a}</button>
            );
          })}
        </div>
      </div>
      <div className="field">
        <label className="field-label">Disponibilidade</label>
        <input className="field-input" placeholder="Ex.: terças à noite e sábados de manhã" value={f.disponibilidade} onChange={(e) => setF({ ...f, disponibilidade: e.target.value })} />
      </div>
      <div className="field">
        <label className="field-label">O que te motiva a servir?</label>
        <textarea className="field-textarea" value={f.motivacao} onChange={(e) => setF({ ...f, motivacao: e.target.value })} />
      </div>
      {iniciar.isError && <p className="field-error">{(iniciar.error as Error).message || "Não foi possível enviar agora."}</p>}
      <button className="ds-btn ds-btn-primary ds-btn-lg" type="submit" disabled={iniciar.isPending}>{iniciar.isPending ? "Enviando..." : "✦ Iniciar minha jornada"}</button>
      {jornada && <p className="pg-edicao__info">Sua última jornada terminou em {dataCurta(jornada.criado_em)}. Você pode começar de novo.</p>}
    </form>
  );
}
