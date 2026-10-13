import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileSpreadsheet } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import SpreadsheetImport, { FieldMapping } from "@/components/financeiro/SpreadsheetImport";

const expenseCategoryLabels: Record<string, string> = {
  manutencao: "Manutenção", material: "Material", evento: "Evento",
  projeto_social: "Projeto Social", administrativo: "Administrativo", outros: "Outros",
};

const contribFields: FieldMapping[] = [
  { key: "associate_name", label: "Nome do Associado", required: true },
  { key: "amount", label: "Valor", required: true, transform: (v) => parseFloat(String(v).replace(/[^\d.,]/g, "").replace(",", ".")) },
  { key: "reference_month", label: "Mês Referência", required: true },
  { key: "payment_method", label: "Método Pagamento", required: false },
  { key: "paid_at", label: "Data Pagamento", required: false },
];

const expenseFields: FieldMapping[] = [
  { key: "description", label: "Descrição", required: true },
  { key: "amount", label: "Valor", required: true, transform: (v) => parseFloat(String(v).replace(/[^\d.,]/g, "").replace(",", ".")) },
  { key: "category", label: "Categoria", required: false },
  { key: "expense_date", label: "Data", required: false },
  { key: "vendor", label: "Fornecedor", required: false },
];

const Financeiro = () => {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [associates, setAssociates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contribDialog, setContribDialog] = useState(false);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [importContribOpen, setImportContribOpen] = useState(false);
  const [importExpenseOpen, setImportExpenseOpen] = useState(false);
  const [contribForm, setContribForm] = useState({ person_id: "", amount: "", reference_month: "", payment_method: "" });
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "outros", expense_date: new Date().toISOString().split("T")[0], vendor: "" });

  const fetchData = async () => {
    setLoading(true);
    const [cRes, eRes, aRes] = await Promise.all([
      supabase.from("contributions").select("*, people:person_id(full_name)").order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("people").select("id, full_name").order("full_name"),
    ]);
    setContributions(cRes.data || []);
    setExpenses(eRes.data || []);
    setAssociates(aRes.data || []);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const totalIncome = contributions.reduce((s, c) => s + Number(c.amount), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpense;

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("contributions").insert({
      person_id: contribForm.person_id,
      amount: parseFloat(contribForm.amount),
      reference_month: contribForm.reference_month,
      payment_method: contribForm.payment_method || null,
      paid_at: new Date().toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Contribuição registrada!");
    setContribDialog(false);
    setContribForm({ person_id: "", amount: "", reference_month: "", payment_method: "" });
    fetchData();
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("expenses").insert({
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      category: expenseForm.category as any,
      expense_date: expenseForm.expense_date,
      vendor: expenseForm.vendor || null,
      created_by: user?.id,
      paid_at: new Date().toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Despesa registrada!");
    setExpenseDialog(false);
    setExpenseForm({ description: "", amount: "", category: "outros", expense_date: new Date().toISOString().split("T")[0], vendor: "" });
    fetchData();
  };

  const handleImportContributions = async (rows: Record<string, any>[]): Promise<{ success: number; errors: number }> => {
    let success = 0;
    let errors = 0;

    // Build name-to-id map for associates
    const nameMap = new Map<string, string>();
    associates.forEach((a: any) => {
      nameMap.set(a.full_name.toLowerCase().trim(), a.id);
    });

    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const inserts = batch
        .map(row => {
          const name = String(row.associate_name || "").toLowerCase().trim();
          const associateId = nameMap.get(name);
          if (!associateId || !row.amount || isNaN(row.amount)) return null;
          return {
            person_id: associateId,
            amount: row.amount,
            reference_month: String(row.reference_month || ""),
            payment_method: row.payment_method || null,
            paid_at: row.paid_at ? new Date(row.paid_at).toISOString() : new Date().toISOString(),
          };
        })
        .filter(Boolean);

      errors += batch.length - inserts.length;

      if (inserts.length > 0) {
        const { error, data } = await supabase.from("contributions").insert(inserts as any);
        if (error) {
          errors += inserts.length;
        } else {
          success += inserts.length;
        }
      }
    }

    fetchData();
    return { success, errors };
  };

  const handleImportExpenses = async (rows: Record<string, any>[]): Promise<{ success: number; errors: number }> => {
    let success = 0;
    let errors = 0;

    const validCategories = Object.keys(expenseCategoryLabels);
    const categoryMap = new Map<string, string>();
    Object.entries(expenseCategoryLabels).forEach(([k, v]) => {
      categoryMap.set(v.toLowerCase().trim(), k);
      categoryMap.set(k, k);
    });

    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const inserts = batch
        .map(row => {
          if (!row.description || !row.amount || isNaN(row.amount)) return null;
          const catRaw = String(row.category || "").toLowerCase().trim();
          const category = categoryMap.get(catRaw) || "outros";
          let expenseDate = row.expense_date;
          if (expenseDate) {
            try { expenseDate = new Date(expenseDate).toISOString().split("T")[0]; } catch { expenseDate = new Date().toISOString().split("T")[0]; }
          } else {
            expenseDate = new Date().toISOString().split("T")[0];
          }
          return {
            description: String(row.description),
            amount: row.amount,
            category: category as any,
            expense_date: expenseDate,
            vendor: row.vendor || null,
            created_by: user?.id,
            paid_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      errors += batch.length - inserts.length;

      if (inserts.length > 0) {
        const { error } = await supabase.from("expenses").insert(inserts as any);
        if (error) {
          errors += inserts.length;
        } else {
          success += inserts.length;
        }
      }
    }

    fetchData();
    return { success, errors };
  };

  const fmtCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  if (loading) return <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AppLayout>;

  return (
    <AppLayout>
      <h1 className="font-['Playfair_Display'] text-2xl font-bold mb-6">Financeiro</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="border-t-4" style={{ borderTopColor: "hsl(var(--secondary))" }}>
          <CardContent className="pt-5 pb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entradas</div>
            <div className="font-['Playfair_Display'] text-2xl font-bold mt-1" style={{ color: "hsl(var(--secondary))" }}>{fmtCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4" style={{ borderTopColor: "hsl(var(--destructive))" }}>
          <CardContent className="pt-5 pb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saídas</div>
            <div className="font-['Playfair_Display'] text-2xl font-bold mt-1" style={{ color: "hsl(var(--destructive))" }}>{fmtCurrency(totalExpense)}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4" style={{ borderTopColor: "hsl(var(--primary))" }}>
          <CardContent className="pt-5 pb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saldo</div>
            <div className="font-['Playfair_Display'] text-2xl font-bold mt-1" style={{ color: balance >= 0 ? "hsl(var(--secondary))" : "hsl(var(--destructive))" }}>{fmtCurrency(balance)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contributions">
        <TabsList className="mb-4">
          <TabsTrigger value="contributions">Contribuições</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
        </TabsList>

        {/* Contributions tab */}
        <TabsContent value="contributions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Contribuições</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setImportContribOpen(true)}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" /> Importar
                </Button>
                <Dialog open={contribDialog} onOpenChange={setContribDialog}>
                  <DialogTrigger asChild><Button size="sm">+ Nova contribuição</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Registrar Contribuição</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddContribution} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Associado *</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required value={contribForm.person_id} onChange={e => setContribForm(f => ({ ...f, person_id: e.target.value }))}>
                          <option value="">Selecione</option>
                          {associates.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Valor (R$) *</Label><Input type="number" step="0.01" required value={contribForm.amount} onChange={e => setContribForm(f => ({ ...f, amount: e.target.value }))} /></div>
                        <div className="space-y-2"><Label>Mês referência *</Label><Input type="month" required value={contribForm.reference_month} onChange={e => setContribForm(f => ({ ...f, reference_month: e.target.value }))} /></div>
                      </div>
                      <div className="space-y-2">
                        <Label>Método de pagamento</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={contribForm.payment_method} onChange={e => setContribForm(f => ({ ...f, payment_method: e.target.value }))}>
                          <option value="">Não informado</option>
                          <option value="pix">PIX</option>
                          <option value="dinheiro">Dinheiro</option>
                          <option value="transferencia">Transferência</option>
                        </select>
                      </div>
                      <Button type="submit" className="w-full">Registrar</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {contributions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma contribuição registrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Associado</TableHead><TableHead>Mês</TableHead><TableHead>Valor</TableHead><TableHead>Método</TableHead><TableHead>Data pgto</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {contributions.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{(c.people as any)?.full_name || "—"}</TableCell>
                          <TableCell className="text-sm">{c.reference_month}</TableCell>
                          <TableCell className="font-semibold" style={{ color: "hsl(var(--secondary))" }}>{fmtCurrency(Number(c.amount))}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.payment_method || "—"}</TableCell>
                          <TableCell className="text-sm">{c.paid_at ? new Date(c.paid_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses tab */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Despesas</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setImportExpenseOpen(true)}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" /> Importar
                </Button>
                <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
                  <DialogTrigger asChild><Button size="sm" variant="outline">+ Nova despesa</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Registrar Despesa</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddExpense} className="space-y-4">
                      <div className="space-y-2"><Label>Descrição *</Label><Input required value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Valor (R$) *</Label><Input type="number" step="0.01" required value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} /></div>
                        <div className="space-y-2"><Label>Data *</Label><Input type="date" required value={expenseForm.expense_date} onChange={e => setExpenseForm(f => ({ ...f, expense_date: e.target.value }))} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Categoria</Label>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
                            {Object.entries(expenseCategoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2"><Label>Fornecedor</Label><Input value={expenseForm.vendor} onChange={e => setExpenseForm(f => ({ ...f, vendor: e.target.value }))} /></div>
                      </div>
                      <Button type="submit" className="w-full">Registrar</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma despesa registrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Valor</TableHead><TableHead>Data</TableHead><TableHead>Fornecedor</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {expenses.map(ex => (
                        <TableRow key={ex.id}>
                          <TableCell className="font-medium">{ex.description}</TableCell>
                          <TableCell><span className="badge badge-grey">{expenseCategoryLabels[ex.category] || ex.category}</span></TableCell>
                          <TableCell className="font-semibold" style={{ color: "hsl(var(--destructive))" }}>{fmtCurrency(Number(ex.amount))}</TableCell>
                          <TableCell className="text-sm">{new Date(ex.expense_date).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ex.vendor || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialogs */}
      <SpreadsheetImport
        open={importContribOpen}
        onOpenChange={setImportContribOpen}
        title="Importar Contribuições"
        fields={contribFields}
        onImport={handleImportContributions}
      />
      <SpreadsheetImport
        open={importExpenseOpen}
        onOpenChange={setImportExpenseOpen}
        title="Importar Despesas"
        fields={expenseFields}
        onImport={handleImportExpenses}
      />
    </AppLayout>
  );
};

export default Financeiro;
