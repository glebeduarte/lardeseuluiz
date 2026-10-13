import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, Loader2, ShieldAlert } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { registrarAuditoria } from "@/lib/auditoria";
import { useConfirm } from "@/components/ConfirmDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/exportar")({
  head: () => ({
    meta: [
      { title: "Exportar dados de consulentes — Sistema de Macas" },
      { name: "description", content: "Exporte todos os dados cadastrados dos consulentes em planilha Excel." },
    ],
  }),
  component: () => (
    <RequireAuth roles={["admin"]}>
      <ExportarPage />
    </RequireAuth>
  ),
});

function ExportarPage() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [justificativa, setJustificativa] = useState("");
  const confirm = useConfirm();
  const justificativaOk = justificativa.trim().length >= 10;

  async function fetchAll<T>(table: string): Promise<T[]> {
    const pageSize = 1000;
    let from = 0;
    const rows: T[] = [];
    for (;;) {
      const { data, error } = await supabase
        .from(table as never)
        .select("*")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rows.push(...(data as T[]));
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return rows;
  }

  async function handleExport() {
    if (!justificativaOk) {
      toast.error("Informe o motivo da exportação (mínimo 10 caracteres).");
      return;
    }
    const ok = await confirm({
      title: "Exportar dados sensíveis?",
      description:
        "A planilha contém dados pessoais e observações dos consulentes. A exportação será registrada com seu nome, data/hora e a justificativa informada.",
      tone: "danger",
      confirmLabel: "Exportar mesmo assim",
    });
    if (!ok) return;
    setLoading(true);
    try {
      setProgress("Buscando consulentes...");
      const consulentes = await fetchAll<Record<string, unknown>>("consulentes");

      setProgress("Buscando observações...");
      const observacoes = await fetchAll<Record<string, unknown>>("consulente_observacoes");

      setProgress("Buscando designações...");
      const designacoes = await fetchAll<Record<string, unknown>>("designacoes");

      setProgress("Buscando presenças...");
      const presencas = await fetchAll<Record<string, unknown>>("presencas");

      setProgress("Buscando sessões...");
      const sessoes = await fetchAll<Record<string, unknown>>("sessoes");

      setProgress("Buscando macas...");
      const macas = await fetchAll<Record<string, unknown>>("macas");

      setProgress("Buscando perfis...");
      const profiles = await fetchAll<Record<string, unknown>>("profiles");

      setProgress("Gerando planilha...");

      // Lookups para enriquecer as abas
      const profileById = new Map(profiles.map((p) => [p.id as string, p]));
      const macaById = new Map(macas.map((m) => [m.id as string, m]));
      const consulenteById = new Map(consulentes.map((c) => [c.id as string, c]));
      const sessaoById = new Map(sessoes.map((s) => [s.id as string, s]));
      const designacaoById = new Map(designacoes.map((d) => [d.id as string, d]));

      const nomeUser = (id: unknown) => {
        if (!id) return "";
        const p = profileById.get(id as string);
        return (p?.nome as string) || (p?.email as string) || (id as string);
      };

      // Aba 1: Consulentes (todos os campos + dialogador + nº atendimentos)
      const consulentesSheet = consulentes.map((c) => {
        const totalAtend = presencas.filter((p) => {
          const d = designacaoById.get(p.designacao_id as string);
          return d && d.consulente_id === c.id && ["presente", "atendimento_distancia"].includes(p.status as string);
        }).length;
        return {
          ...c,
          dialogador_nome: nomeUser(c.dialogador_id),
          alta_by_nome: nomeUser(c.alta_by),
          total_atendimentos_realizados: totalAtend,
        };
      });

      // Aba 2: Observações (enriquecidas)
      const observacoesSheet = observacoes.map((o) => {
        const c = consulenteById.get(o.consulente_id as string);
        return {
          ...o,
          consulente_nome: (c?.nome as string) || "",
          autor_nome: nomeUser(o.autor_id),
        };
      });

      // Aba 3: Designações
      const designacoesSheet = designacoes.map((d) => {
        const c = consulenteById.get(d.consulente_id as string);
        const m = macaById.get(d.maca_id as string);
        return {
          ...d,
          consulente_nome: (c?.nome as string) || "",
          maca_numero: m?.numero ?? "",
          maca_nome: (m?.nome as string) || "",
          maca_dia: (m?.dia as string) || "",
          maca_categoria: (m?.categoria as string) || "",
          dialogador_nome: nomeUser(d.dialogador_id),
          reactivated_by_nome: nomeUser(d.reactivated_by),
        };
      });

      // Aba 4: Presenças
      const presencasSheet = presencas.map((p) => {
        const d = designacaoById.get(p.designacao_id as string);
        const c = d ? consulenteById.get(d.consulente_id as string) : undefined;
        const s = sessaoById.get(p.sessao_id as string);
        const m = d ? macaById.get(d.maca_id as string) : undefined;
        return {
          ...p,
          sessao_data: (s?.data as string) || "",
          sessao_tipo: (s?.tipo as string) || "",
          consulente_nome: (c?.nome as string) || "",
          maca_numero: m?.numero ?? "",
          maca_nome: (m?.nome as string) || "",
          created_by_nome: nomeUser(p.created_by),
          updated_by_nome: nomeUser(p.updated_by),
        };
      });

      // Aba 5: Sessões, Aba 6: Macas
      const sessoesSheet = sessoes;
      const macasSheet = macas;

      const wb = XLSX.utils.book_new();
      const addSheet = (name: string, rows: Record<string, unknown>[]) => {
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
      };

      addSheet("Consulentes", consulentesSheet);
      addSheet("Observacoes", observacoesSheet);
      addSheet("Designacoes", designacoesSheet);
      addSheet("Presencas", presencasSheet);
      addSheet("Sessoes", sessoesSheet as Record<string, unknown>[]);
      addSheet("Macas", macasSheet as Record<string, unknown>[]);

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      XLSX.writeFile(wb, `consulentes-completo-${stamp}.xlsx`);

      await registrarAuditoria({
        acao: "exportacao_consulentes",
        alvo: "consulentes",
        justificativa: justificativa.trim(),
        detalhe: {
          total_consulentes: consulentes.length,
          total_observacoes: observacoes.length,
          total_presencas: presencas.length,
        },
      });

      setProgress("");
      setJustificativa("");
      toast.success(`Exportação concluída — ${consulentes.length} consulentes`, {
        description: "A ação foi registrada no log de auditoria.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Falha ao exportar", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-brand-blue-dark">Exportar dados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gera uma planilha Excel com <strong>todos os dados</strong> cadastrados dos consulentes,
          incluindo observações, designações, presenças, sessões e macas relacionadas.
        </p>
      </header>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-md flex items-center justify-center bg-brand-teal-muted text-brand-teal-dark shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground">Planilha completa (.xlsx)</h2>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc pl-5">
              <li>Aba <strong>Consulentes</strong> — todos os campos da ficha + dialogador + total de atendimentos</li>
              <li>Aba <strong>Observações</strong> — histórico completo com autor</li>
              <li>Aba <strong>Designações</strong> — todas as passagens em macas (ativas, concluídas, canceladas)</li>
              <li>Aba <strong>Presenças</strong> — cada marcação de sessão</li>
              <li>Aba <strong>Sessões</strong> e <strong>Macas</strong> — dados de referência</li>
            </ul>

            <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-800">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-sm font-semibold">Dados sensíveis</span>
              </div>
              <p className="text-xs text-amber-900/80">
                Informe por que precisa desta exportação. O motivo fica registrado junto com seu nome e o horário.
              </p>
              <Label htmlFor="justificativa" className="text-xs text-amber-900">
                Motivo da exportação
              </Label>
              <Textarea
                id="justificativa"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex.: conferência do cadastro para a reunião administrativa de setembro"
                rows={2}
                className="bg-white"
              />
              {!justificativaOk && justificativa.length > 0 && (
                <p className="text-xs text-amber-800">Descreva com pelo menos 10 caracteres.</p>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button onClick={handleExport} disabled={loading || !justificativaOk}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {loading ? "Exportando..." : "Exportar agora"}
              </Button>
              {progress && <span className="text-xs text-muted-foreground">{progress}</span>}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        A geração acontece no seu navegador — nenhum dado é enviado para terceiros.
      </p>
    </div>
  );
}
