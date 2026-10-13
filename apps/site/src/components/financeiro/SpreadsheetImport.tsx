import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, ArrowRight, Check, AlertTriangle } from "lucide-react";

export interface FieldMapping {
  key: string;
  label: string;
  required: boolean;
  transform?: (value: any) => any;
}

interface SpreadsheetImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FieldMapping[];
  onImport: (rows: Record<string, any>[]) => Promise<{ success: number; errors: number }>;
}

const PREVIEW_ROWS = 5;

export default function SpreadsheetImport({ open, onOpenChange, title, fields, onImport }: SpreadsheetImportProps) {
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "result">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRawData([]);
    setMapping({});
    setResult(null);
    setFileName("");
    setImporting(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(file.type) && !["xlsx", "xls", "csv"].includes(ext || "")) {
      toast.error("Formato não suportado. Use .xlsx, .xls ou .csv");
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (json.length < 2) {
          toast.error("A planilha precisa ter ao menos 1 linha de cabeçalho e 1 de dados");
          return;
        }

        const fileHeaders = (json[0] as string[]).map(h => String(h || "").trim());
        setHeaders(fileHeaders);
        setRawData(json.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== "")));

        // Auto-map by fuzzy matching
        const autoMap: Record<string, string> = {};
        fields.forEach(field => {
          const match = fileHeaders.find(h => {
            const hLower = h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
            const fLower = field.label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
            const kLower = field.key.toLowerCase().replace(/_/g, " ");
            return hLower === fLower || hLower === kLower || hLower.includes(fLower) || fLower.includes(hLower);
          });
          if (match) autoMap[field.key] = match;
        });
        setMapping(autoMap);
        setStep("mapping");
      } catch {
        toast.error("Erro ao ler o arquivo");
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  }, [fields]);

  const requiredMapped = fields.filter(f => f.required).every(f => mapping[f.key]);

  const getMappedPreview = () => {
    return rawData.slice(0, PREVIEW_ROWS).map(row => {
      const obj: Record<string, any> = {};
      fields.forEach(field => {
        const colName = mapping[field.key];
        if (colName) {
          const colIdx = headers.indexOf(colName);
          obj[field.key] = colIdx >= 0 ? row[colIdx] : null;
        } else {
          obj[field.key] = null;
        }
      });
      return obj;
    });
  };

  const getMappedRows = (): Record<string, any>[] => {
    return rawData.map(row => {
      const obj: Record<string, any> = {};
      fields.forEach(field => {
        const colName = mapping[field.key];
        if (colName) {
          const colIdx = headers.indexOf(colName);
          let value = colIdx >= 0 ? row[colIdx] : null;
          if (field.transform && value != null) {
            value = field.transform(value);
          }
          obj[field.key] = value;
        }
      });
      return obj;
    }).filter(obj => {
      // Filter out rows where all required fields are empty
      return fields.filter(f => f.required).every(f => obj[f.key] != null && obj[f.key] !== "");
    });
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const rows = getMappedRows();
      if (rows.length === 0) {
        toast.error("Nenhuma linha válida para importar");
        setImporting(false);
        return;
      }
      const res = await onImport(rows);
      setResult(res);
      setStep("result");
    } catch (err: any) {
      toast.error(err.message || "Erro na importação");
    }
    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-4">
          {["Upload", "Mapear", "Revisar"].map((label, i) => {
            const stepMap = ["upload", "mapping", "preview"];
            const currentIdx = stepMap.indexOf(step === "result" ? "preview" : step);
            const done = i < currentIdx || step === "result";
            const active = i === currentIdx;
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <div className="w-6 h-px bg-border" />}
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                  done ? "bg-secondary/10 text-secondary" : active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}>
                  {done ? <Check className="w-3 h-3" /> : <span className="w-4 text-center">{i + 1}</span>}
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-foreground">Arraste ou clique para selecionar</p>
            <p className="text-sm text-muted-foreground mt-1">Formatos: .xlsx, .xls, .csv</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4" />
              <span>{fileName}</span>
              <Badge variant="outline">{rawData.length} linhas</Badge>
            </div>

            <p className="text-sm">Associe cada coluna da planilha ao campo correspondente:</p>

            <div className="space-y-3">
              {fields.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 text-sm font-medium text-foreground flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Select
                    value={mapping[field.key] || ""}
                    onValueChange={v => setMapping(m => ({ ...m, [field.key]: v === "__none__" ? "" : v }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="— Ignorar —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Ignorar —</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {!requiredMapped && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4" />
                Mapeie todos os campos obrigatórios (*) para continuar
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={() => setStep("preview")} disabled={!requiredMapped}>Pré-visualizar</Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Prévia das primeiras {Math.min(PREVIEW_ROWS, rawData.length)} linhas ({getMappedRows().length} linhas válidas no total):
            </p>

            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {fields.filter(f => mapping[f.key]).map(f => (
                      <TableHead key={f.key} className="text-xs whitespace-nowrap">{f.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getMappedPreview().map((row, i) => (
                    <TableRow key={i}>
                      {fields.filter(f => mapping[f.key]).map(f => (
                        <TableCell key={f.key} className="text-sm">
                          {row[f.key] != null ? String(row[f.key]) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("mapping")}>Voltar</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importando..." : `Importar ${getMappedRows().length} registros`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === "result" && result && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: "hsl(var(--secondary) / 0.1)" }}>
              <Check className="w-8 h-8" style={{ color: "hsl(var(--secondary))" }} />
            </div>
            <div>
              <p className="text-lg font-semibold">Importação concluída!</p>
              <p className="text-sm text-muted-foreground mt-1">
                <span style={{ color: "hsl(var(--secondary))" }}>{result.success} importados</span>
                {result.errors > 0 && <> · <span className="text-destructive">{result.errors} erros</span></>}
              </p>
            </div>
            <Button onClick={() => handleClose(false)} className="w-full">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
