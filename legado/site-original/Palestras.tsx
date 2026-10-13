import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DIAS_SEMANA: Record<number, string> = {
  0: "DOM", 1: "SEG", 2: "TER", 3: "QUA", 4: "QUI", 5: "SEX", 6: "SAB",
};

interface PalestraForm {
  data: Date | undefined;
  hora: string;
  palestrante: string;
  tema: string;
}

const emptyPalestra: PalestraForm = { data: undefined, hora: "", palestrante: "", tema: "" };

interface PalestraRow {
  id: string;
  dia_semana: string;
  data: string;
  hora: string;
  palestrante: string;
  tema: string;
}

export default function Palestras() {
  const [palestras, setPalestras] = useState<PalestraForm[]>([{ ...emptyPalestra }]);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<PalestraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("palestras")
      .select("*")
      .order("data", { ascending: true });
    if (!error && data) setRows(data as PalestraRow[]);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Cadastro de Palestras — Lar de Seu Luiz";
    fetchAll();
  }, []);

  const addPalestra = () => setPalestras((p) => [...p, { ...emptyPalestra }]);
  const removePalestra = (i: number) => setPalestras((p) => p.filter((_, idx) => idx !== i));

  const updateField = (i: number, field: keyof PalestraForm, value: any) => {
    setPalestras((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };

  const handleSave = async () => {
    for (const p of palestras) {
      if (!p.data || !p.tema.trim()) {
        toast.error("Preencha ao menos a data e o tema de cada palestra.");
        return;
      }
    }

    setSaving(true);
    const records = palestras.map((p) => ({
      dia_semana: DIAS_SEMANA[p.data!.getDay()],
      data: format(p.data!, "yyyy-MM-dd"),
      hora: p.hora.trim() || "-",
      palestrante: p.palestrante.trim() || "-",
      tema: p.tema.trim(),
    }));
    const { error } = await supabase.from("palestras").insert(records);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Palestras salvas com sucesso!");
      setPalestras([{ ...emptyPalestra }]);
      fetchAll();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta palestra?")) return;
    setDeleting(id);
    const { error } = await supabase.from("palestras").delete().eq("id", id);
    setDeleting(null);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Palestra excluída!");
      fetchAll();
    }
  };

  const formatDayMonth = (dateStr: string) => {
    const d = parse(dateStr, "yyyy-MM-dd", new Date());
    return format(d, "dd");
  };

  const mesAtual = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

  const copyTable = async () => {
    const table = document.getElementById("palestras-table");
    if (!table) return;
    try {
      const blob = new Blob([table.outerHTML], { type: "text/html" });
      await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
      setCopied(true);
      toast.success("Tabela copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <header className="bg-[hsl(213,73%,38%)] text-white py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Cadastro de Palestras
          </h1>
          <p className="mt-2 text-white/80 text-lg">Lar de Seu Luiz</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-12">
        {/* ── FORMULÁRIO ── */}
        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Nova(s) Palestra(s)
          </h2>

          <div className="space-y-6">
            {palestras.map((p, i) => (
              <div key={i} className="rounded-lg border bg-card p-4 space-y-3 relative">
                {palestras.length > 1 && (
                  <button
                    onClick={() => removePalestra(i)}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Data */}
                  <div className="space-y-1">
                    <Label>Data *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !p.data && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {p.data ? format(p.data, "dd/MM/yyyy") : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={p.data}
                          onSelect={(d) => updateField(i, "data", d)}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    {p.data && (
                      <span className="text-xs text-muted-foreground">
                        {DIAS_SEMANA[p.data.getDay()]}
                      </span>
                    )}
                  </div>

                  {/* Hora */}
                  <div className="space-y-1">
                    <Label>Hora</Label>
                    <Input
                      placeholder='Ex: 18h (deixe vazio para "-")'
                      value={p.hora}
                      onChange={(e) => updateField(i, "hora", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Palestrante */}
                  <div className="space-y-1">
                    <Label>Palestrante(s)</Label>
                    <Input
                      placeholder='Deixe vazio para "-"'
                      value={p.palestrante}
                      onChange={(e) => updateField(i, "palestrante", e.target.value)}
                    />
                  </div>

                  {/* Tema */}
                  <div className="space-y-1">
                    <Label>Tema *</Label>
                    <Input
                      placeholder="Tema da palestra"
                      value={p.tema}
                      onChange={(e) => updateField(i, "tema", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <Button variant="outline" onClick={addPalestra}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar outra palestra
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar todas as palestras"}
            </Button>
          </div>
        </section>

        {/* ── TABELA DO MÊS ── */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-xl font-semibold capitalize" style={{ fontFamily: "'Playfair Display', serif" }}>
              Programação
            </h2>
            {rows.length > 0 && (
              <Button variant="outline" size="sm" onClick={copyTable}>
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Copiado!" : "Copiar tabela"}
              </Button>
            )}
          </div>

          {loading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma palestra cadastrada para este mês.</p>
          ) : (
            <div className="overflow-auto rounded-lg border">
              <table
                id="palestras-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#2C3E6B", color: "#fff" }}>
                    {["Dia", "Data", "Hora", "Palestrante", "Tema", ""].map((h, idx) => (
                      <th
                        key={idx}
                        style={{
                          padding: "10px 12px",
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: "13px",
                          borderRight: idx < 4 ? "1px solid rgba(255,255,255,0.15)" : "none",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const bg = i % 2 === 0 ? "#e8edf4" : "#ffffff";
                    const borderStyle = "1px solid #c5cdd8";
                    return (
                      <tr
                        key={r.id}
                        style={{
                          backgroundColor: bg,
                        }}
                      >
                        <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, borderRight: borderStyle, borderBottom: borderStyle, whiteSpace: "nowrap" }}>{r.dia_semana}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", borderRight: borderStyle, borderBottom: borderStyle, whiteSpace: "nowrap" }}>{formatDayMonth(r.data)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", borderRight: borderStyle, borderBottom: borderStyle, whiteSpace: "nowrap" }}>{r.hora}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", borderRight: borderStyle, borderBottom: borderStyle }}>{r.palestrante}</td>
                        <td style={{ padding: "8px 12px", textAlign: "left", borderRight: borderStyle, borderBottom: borderStyle, fontWeight: r.tema !== "-" ? 600 : 400 }}>
                          {r.tema}
                        </td>
                        <td style={{ padding: "4px 8px", textAlign: "center", borderBottom: borderStyle }}>
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting === r.id}
                            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                            title="Excluir palestra"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
