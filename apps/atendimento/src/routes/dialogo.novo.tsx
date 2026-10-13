import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ConsulenteFormFields, emptyConsulenteForm, type ConsulenteForm } from "@/components/ConsulenteForm";
import { toTitleCaseName } from "@/lib/text";
import { maskPhone, formatDateISOToBR } from "@/lib/masks";

function hojeBR() {
  const d = new Date();
  return formatDateISOToBR(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
  );
}

export const Route = createFileRoute("/dialogo/novo")({
  component: () => (
    <RequireAuth roles={["dialogador", "admin"]}>
      <NovoConsulente />
    </RequireAuth>
  ),
});

function NovoConsulente() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

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
      dialogador_id: f.dialogador_id ?? user?.id,
    };
    const { data, error } = await supabase.from("consulentes").insert(payload).select().single();
    if (error) { setBusy(false); toast.error(error.message); return; }

    setBusy(false);
    toast.success(
      f.encaminhamento_maca
        ? "Consulente cadastrado. O acolhimento fará a designação da maca."
        : "Consulente cadastrado",
    );
    navigate({ to: "/consulentes/$id", params: { id: data.id } });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Novo Diálogo</h1>
      <ConsulenteFormFields
        initial={{ ...emptyConsulenteForm, data_dialogo: hojeBR(), dialogador_id: user?.id ?? null }}
        busy={busy}
        onSubmit={submit}
        onCancel={() => navigate({ to: "/consulentes" })}
      />
    </div>
  );
}
