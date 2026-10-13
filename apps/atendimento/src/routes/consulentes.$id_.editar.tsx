import { Skeleton } from "@/components/ui/skeleton";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { ConsulenteFormFields, type ConsulenteForm } from "@/components/ConsulenteForm";
import { toTitleCaseName } from "@/lib/text";
import { maskPhone, formatDateISOToBR } from "@/lib/masks";

export const Route = createFileRoute("/consulentes/$id_/editar")({
  component: () => (
    <RequireAuth roles={["admin", "dialogador"]}>
      <EditarConsulente />
    </RequireAuth>
  ),
});

function EditarConsulente() {
  const params = Route.useParams() as { id?: string; id_?: string };
  const id = params.id ?? params.id_;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const { data: c, isLoading } = useQuery({
    queryKey: ["consulente-edit", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error("Consulente não encontrado.");
      const { data, error } = await supabase.from("consulentes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!id) return <div>Consulente não encontrado.</div>;
  if (isLoading)
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Carregando cadastro">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  if (!c) return <div>Consulente não encontrado.</div>;

  const initial: ConsulenteForm = {
    nome: c.nome ?? "",
    data_dialogo: formatDateISOToBR(c.data_dialogo),
    data_nascimento: formatDateISOToBR(c.data_nascimento),
    telefone: c.telefone ?? "",
    conhece_doutrina: c.conhece_doutrina,
    evangelho_no_lar: c.evangelho_no_lar,
    pratica_religiosa: !!c.pratica_religiosa,
    pratica_religiosa_descricao: c.pratica_religiosa_descricao ?? "",
    motivo_saude_fisica: !!c.motivo_saude_fisica,
    motivo_saude_fisica_especificacao: c.motivo_saude_fisica_especificacao ?? "",
    motivo_saude_fisica_diagnostico: !!c.motivo_saude_fisica_diagnostico,
    motivo_saude_fisica_diagnostico_obs: c.motivo_saude_fisica_diagnostico_obs ?? "",
    motivo_saude_fisica_tratamento: !!c.motivo_saude_fisica_tratamento,
    motivo_saude_fisica_tratamento_obs: c.motivo_saude_fisica_tratamento_obs ?? "",
    motivo_saude_mental: !!c.motivo_saude_mental,
    motivo_saude_mental_especificacao: c.motivo_saude_mental_especificacao ?? "",
    motivo_saude_mental_diagnostico: !!c.motivo_saude_mental_diagnostico,
    motivo_saude_mental_diagnostico_obs: c.motivo_saude_mental_diagnostico_obs ?? "",
    motivo_saude_mental_tratamento: !!c.motivo_saude_mental_tratamento,
    motivo_saude_mental_tratamento_obs: c.motivo_saude_mental_tratamento_obs ?? "",
    motivo_saude_espiritual: !!c.motivo_saude_espiritual,
    motivo_saude_espiritual_especificacao: c.motivo_saude_espiritual_especificacao ?? "",
    motivo_conflitos_familiares: !!c.motivo_conflitos_familiares,

    uso_medicacoes: !!c.uso_medicacoes,
    uso_medicacoes_especificacao: c.uso_medicacoes_especificacao ?? "",
    ideias_suicidas: !!c.ideias_suicidas,
    ideacao_criminosa: !!c.ideacao_criminosa,
    uso_drogas: !!c.uso_drogas,
    uso_alcool: !!c.uso_alcool,
    uso_cigarro: !!c.uso_cigarro,
    conflito_genero: !!c.conflito_genero,
    encaminhamento_passes: !!c.encaminhamento_passes,
    encaminhamento_passes_qtd: c.encaminhamento_passes_qtd != null ? String(c.encaminhamento_passes_qtd) : "",
    encaminhamento_maca: !!c.encaminhamento_maca,
    encaminhamento_maca_categoria: (c.encaminhamento_maca_categoria as "interna" | "externa" | null) ?? "",
    indicacao_saude: !!c.indicacao_saude,
    indicacao_saude_texto: c.indicacao_saude_texto ?? "",
    indicacao_chakras: !!c.indicacao_chakras,
    indicacao_harmonizacao: !!c.indicacao_harmonizacao,
    indicacao_mediunidade: !!c.indicacao_mediunidade,
    indicacao_desobsessao_leve: !!c.indicacao_desobsessao_leve,
    indicacao_desobsessao: !!c.indicacao_desobsessao,
    outras_informacoes: c.outras_informacoes ?? "",
    dialogador_id: c.dialogador_id ?? null,
    trabalhador: !!(c as { trabalhador?: boolean }).trabalhador,
    tratamento_distancia: !!(c as { tratamento_distancia?: boolean }).tratamento_distancia,
    frequencia: ((c as { frequencia?: string }).frequencia as "semanal" | "quinzenal" | undefined) ?? "semanal",
  };

  const submit = async (f: ConsulenteForm) => {
    if (f.encaminhamento_maca && !f.encaminhamento_maca_categoria) {
      toast.error("Selecione se a maca é interna ou externa.");
      return;
    }
    setBusy(true);
    const payload = {
      ...f,
      nome: toTitleCaseName(f.nome),
      telefone: f.telefone?.trim() ? maskPhone(f.telefone) : null,
      data_nascimento: f.data_nascimento || null,
      data_dialogo: f.data_dialogo || null,
      encaminhamento_passes_qtd: f.encaminhamento_passes_qtd ? parseInt(f.encaminhamento_passes_qtd) : null,
      encaminhamento_maca_categoria: f.encaminhamento_maca_categoria || null,
    };
    const { error } = await supabase.from("consulentes").update(payload).eq("id", id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Consulente atualizado");
    navigate({ to: "/consulentes/$id", params: { id } });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Editar consulente</h1>
      <ConsulenteFormFields
        initial={initial}
        busy={busy}
        onSubmit={submit}
        onCancel={() => navigate({ to: "/consulentes/$id", params: { id } })}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
