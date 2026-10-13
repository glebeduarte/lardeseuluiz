import { supabase } from "@/integrations/supabase/client";

export async function registrarAuditoria(params: {
  acao: string;
  alvo?: string | null;
  justificativa?: string | null;
  detalhe?: Record<string, unknown>;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const actor_id = userData.user?.id;
  if (!actor_id) return;
  await supabase.from("auditoria_acoes").insert({
    actor_id,
    acao: params.acao,
    alvo: params.alvo ?? null,
    justificativa: params.justificativa ?? null,
    detalhe: (params.detalhe ?? {}) as never,
  });
}
