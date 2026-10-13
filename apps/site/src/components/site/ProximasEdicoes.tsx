import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { db, dataLongaBR, hoje, useMinhaPessoa, CANDIDATURA_LABEL, type Edicao, type CandidaturaStatus } from "@/lib/acoes";

/** Próximas edições de uma ação social no site. Quem tem conta pede para participar e acompanha no perfil. */
export default function ProximasEdicoes({ projetoId, slug }: { projetoId: string; slug: string }) {
  const qc = useQueryClient();
  const { user, simulacao } = useAuth();
  const { data: eu } = useMinhaPessoa(user?.id, simulacao?.personId);
  const [aberta, setAberta] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");

  const { data: edicoes = [] } = useQuery({
    queryKey: ["site-edicoes", projetoId],
    queryFn: async () => {
      const { data } = await db.from("project_editions").select("*").eq("project_id", projetoId)
        .in("status", ["planejada", "inscricoes_abertas"]).gte("starts_on", hoje()).order("starts_on").limit(4);
      return (data ?? []) as Edicao[];
    },
  });

  const { data: minhas = {} } = useQuery({
    queryKey: ["site-minhas-candidaturas", eu?.id, edicoes.map((e) => e.id).join(",")],
    enabled: !!eu && edicoes.length > 0,
    queryFn: async () => {
      const { data } = await db.from("edition_applications").select("edition_id, status").eq("person_id", eu!.id).in("edition_id", edicoes.map((e) => e.id));
      const m: Record<string, CandidaturaStatus> = {};
      for (const c of (data ?? []) as { edition_id: string; status: CandidaturaStatus }[]) m[c.edition_id] = c.status;
      return m;
    },
  });

  const candidatar = useMutation({
    mutationFn: async (edicaoId: string) => {
      const { error } = await db.from("edition_applications").insert({ edition_id: edicaoId, person_id: eu!.id, message: mensagem.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => { setAberta(null); setMensagem(""); qc.invalidateQueries({ queryKey: ["site-minhas-candidaturas"] }); },
  });

  if (edicoes.length === 0) return null;
  const voltar = encodeURIComponent(`/projetos/${slug}`);

  return (
    <div>
      <h2 className="pg-edicoes__titulo">Próximas datas</h2>
      <div className="pg-edicoes">
        {edicoes.map((e) => {
          const minha = minhas[e.id];
          const abertas = e.status === "inscricoes_abertas";
          return (
            <div key={e.id} className="pg-edicao">
              <div>
                <div className="pg-edicao__data">{dataLongaBR(e.starts_on)}{e.start_time ? `, ${e.start_time}` : ""}</div>
                <div className="pg-edicao__info">{[e.location, e.volunteers_needed ? `${e.volunteers_needed} voluntários` : null].filter(Boolean).join(" · ")}</div>
              </div>
              {minha ? (
                <span className="pg-edicao__status">
                  {minha === "pendente" ? "✅ Pedido enviado. A coordenação vai confirmar." : `Sua participação: ${CANDIDATURA_LABEL[minha].toLowerCase()}`}
                </span>
              ) : !abertas ? (
                <span className="pg-edicao__info">Inscrições em breve</span>
              ) : !user ? (
                <Link to={`/login?voltar=${voltar}`} className="ds-btn ds-btn-outline ds-btn-sm">Entrar para participar</Link>
              ) : aberta === e.id ? null : (
                <button type="button" className="ds-btn ds-btn-primary ds-btn-sm" onClick={() => setAberta(e.id)} disabled={!eu}>Quero participar</button>
              )}
              {aberta === e.id && !minha && (
                <div className="pg-edicao__msg">
                  <textarea className="field-textarea" rows={2} placeholder="Opcional: como você gostaria de ajudar? Algum horário?"
                    value={mensagem} onChange={(ev) => setMensagem(ev.target.value)} />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" className="ds-btn ds-btn-primary ds-btn-sm" disabled={candidatar.isPending} onClick={() => candidatar.mutate(e.id)}>
                      {candidatar.isPending ? "Enviando..." : "Enviar pedido"}
                    </button>
                    <button type="button" className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => setAberta(null)}>Cancelar</button>
                  </div>
                  {candidatar.isError && <p className="field-error">Não foi possível enviar. Tente de novo.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {user && <p className="pg-edicao__info" style={{ marginTop: 12 }}>Seus pedidos e escalas aparecem em <Link to="/app/perfil" style={{ textDecoration: "underline" }}>Meu perfil</Link>.</p>}
    </div>
  );
}
