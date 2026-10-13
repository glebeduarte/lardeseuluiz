import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { registrarAuditoria } from "@/lib/auditoria";

export type ExportColumn<T> = {
  key: string;
  label: string;
  defaultOn?: boolean;
  getValue: (row: T) => string | number | null | undefined;
};

type Props<T> = {
  filename: string;
  columns: ExportColumn<T>[];
  rows: T[];
  disabled?: boolean;
  /** Exige confirmação explícita com justificativa e registra quem exportou. */
  sensivel?: boolean;
  /** Nome do conjunto de dados registrado na auditoria. */
  auditLabel?: string;
};

export function ExportRelatorioButton<T>({ filename, columns, rows, disabled, sensivel, auditLabel }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [formato, setFormato] = useState<"csv" | "xlsx">("xlsx");
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map((c) => [c.key, c.defaultOn !== false]))
  );

  const activeCols = useMemo(() => columns.filter((c) => selected[c.key]), [columns, selected]);

  function buildRows() {
    return rows.map((r) => {
      const obj: Record<string, string | number> = {};
      for (const c of activeCols) {
        const v = c.getValue(r);
        obj[c.label] = v === null || v === undefined ? "" : v;
      }
      return obj;
    });
  }

  function pedir(fmt: "csv" | "xlsx") {
    if (activeCols.length === 0) return toast.error("Selecione ao menos uma coluna.");
    if (rows.length === 0) return toast.error("Nenhum dado para exportar.");
    if (!sensivel) return fmt === "csv" ? exportCSV() : exportXLSX();
    setFormato(fmt);
    setOpen(false);
    setConfirmOpen(true);
  }

  async function confirmarSensivel() {
    if (justificativa.trim().length < 10) {
      return toast.error("Descreva a finalidade da exportação (mínimo de 10 caracteres).");
    }
    await registrarAuditoria({
      acao: "exportacao_dados_sensiveis",
      alvo: auditLabel ?? filename,
      justificativa: justificativa.trim(),
      detalhe: { registros: rows.length, colunas: activeCols.map((c) => c.label), formato },
    });
    setConfirmOpen(false);
    setJustificativa("");
    if (formato === "csv") exportCSV();
    else exportXLSX();
  }

  function exportXLSX() {
    if (activeCols.length === 0) return toast.error("Selecione ao menos uma coluna.");
    if (rows.length === 0) return toast.error("Nenhum dado para exportar.");
    const ws = XLSX.utils.json_to_sheet(buildRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    setOpen(false);
    toast.success("Planilha exportada.");
  }

  function exportCSV() {
    if (activeCols.length === 0) return toast.error("Selecione ao menos uma coluna.");
    if (rows.length === 0) return toast.error("Nenhum dado para exportar.");
    const ws = XLSX.utils.json_to_sheet(buildRows());
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
    toast.success("CSV exportado.");
  }

  const allOn = columns.every((c) => selected[c.key]);
  function toggleAll() {
    const next = !allOn;
    setSelected(Object.fromEntries(columns.map((c) => [c.key, next])));
  }

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <Download className="h-4 w-4" /> Exportar
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Colunas</span>
          <button type="button" onClick={toggleAll} className="text-xs text-brand-teal-dark hover:underline">
            {allOn ? "Desmarcar todas" : "Marcar todas"}
          </button>
        </div>
        <div className="max-h-60 overflow-auto space-y-1.5 pr-1">
          {columns.map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={!!selected[c.key]}
                onCheckedChange={(v) => setSelected((s) => ({ ...s, [c.key]: v === true }))}
              />
              {c.label}
            </label>
          ))}
        </div>
        <Separator className="my-3" />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1 gap-1" onClick={() => pedir("csv")}>
            <FileText className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" className="flex-1 gap-1" onClick={() => pedir("xlsx")}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
        {sensivel && (
          <p className="mt-2 text-[11px] text-amber-800">
            Dados sensíveis: a exportação exige justificativa e fica registrada.
          </p>
        )}
      </PopoverContent>
    </Popover>

    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar dados sensíveis</DialogTitle>
          <DialogDescription>
            Você está exportando {rows.length} registro{rows.length === 1 ? "" : "s"} com informações
            delicadas de consulentes. A exportação será registrada com seu nome, data e hora.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="justificativa-export">Para que será usada esta exportação?</Label>
          <Textarea
            id="justificativa-export"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Ex.: acompanhamento dos casos de risco pela coordenação do diálogo."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={confirmarSensivel}>Confirmar exportação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
