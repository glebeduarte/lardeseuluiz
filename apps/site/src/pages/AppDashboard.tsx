import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Pencil, Trash2, Link2, Download, Search } from "lucide-react";
import * as XLSX from "xlsx";

interface Associate {
  id: string;
  full_name: string;
  email: string | null;
  category: string;
  status: string;
  join_date: string;
  phone: string | null;
  cpf: string | null;
  user_id: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
}

const categoryLabels: Record<string, string> = {
  fundador: "Fundador", efetivo: "Efetivo", colaborador: "Colaborador", frequentador: "Frequentador"
};
const statusLabels: Record<string, string> = {
  ativo: "Ativo", inadimplente: "Inadimplente", afastado: "Afastado", desligado: "Desligado"
};

const CHART_COLORS = [
  "hsl(210, 100%, 35%)", "hsl(44, 100%, 54%)", "hsl(211, 100%, 25%)", "hsl(43, 100%, 43%)",
  "hsl(210, 60%, 57%)", "hsl(220, 14%, 42%)"
];

const emptyForm = { full_name: "", email: "", phone: "", cpf: "", category: "frequentador", status: "ativo" };

const AppDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState({ totalAssociates: 0, active: 0, inadimplente: 0, totalContributions: 0, totalExpenses: 0 });
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [linkAssocId, setLinkAssocId] = useState<string | null>(null);
  const [linkUserId, setLinkUserId] = useState("");

  // Filters
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Chart data
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyFinance, setMonthlyFinance] = useState<{ month: string; receitas: number; despesas: number }[]>([]);
  const [sessionsData, setSessionsData] = useState<{ month: string; atendimentos: number }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    const [assocRes, contribRes, expRes, sessRes, profRes] = await Promise.all([
      supabase.from("associates").select("*").order("full_name"),
      supabase.from("contributions").select("amount, reference_month, paid_at"),
      supabase.from("expenses").select("amount, expense_date"),
      supabase.from("spiritual_sessions").select("scheduled_date, session_status"),
      supabase.from("profiles").select("id, user_id, full_name, email"),
    ]);
    const assocs = (assocRes.data || []) as Associate[];
    setAssociates(assocs);
    setProfiles((profRes.data || []) as Profile[]);

    const contribs = contribRes.data || [];
    const exps = expRes.data || [];
    const totalContrib = contribs.reduce((s: number, c: any) => s + Number(c.amount), 0);
    const totalExp = exps.reduce((s: number, e: any) => s + Number(e.amount), 0);

    setStats({
      totalAssociates: assocs.length,
      active: assocs.filter(a => a.status === "ativo").length,
      inadimplente: assocs.filter(a => a.status === "inadimplente").length,
      totalContributions: totalContrib,
      totalExpenses: totalExp,
    });

    const catCount: Record<string, number> = {};
    assocs.forEach(a => { catCount[a.category] = (catCount[a.category] || 0) + 1; });
    setCategoryData(Object.entries(catCount).map(([k, v]) => ({ name: categoryLabels[k] || k, value: v })));

    const months: Record<string, { receitas: number; despesas: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { receitas: 0, despesas: 0 };
    }
    contribs.forEach((c: any) => {
      const m = c.reference_month?.substring(0, 7);
      if (m && months[m]) months[m].receitas += Number(c.amount);
    });
    exps.forEach((e: any) => {
      const m = e.expense_date?.substring(0, 7);
      if (m && months[m]) months[m].despesas += Number(e.amount);
    });
    setMonthlyFinance(Object.entries(months).map(([k, v]) => ({
      month: new Date(k + "-01").toLocaleDateString("pt-BR", { month: "short" }),
      ...v
    })));

    const sesMonths: Record<string, number> = {};
    Object.keys(months).forEach(k => { sesMonths[k] = 0; });
    (sessRes.data || []).forEach((s: any) => {
      const m = s.scheduled_date?.substring(0, 7);
      if (m && sesMonths[m] !== undefined) sesMonths[m]++;
    });
    setSessionsData(Object.entries(sesMonths).map(([k, v]) => ({
      month: new Date(k + "-01").toLocaleDateString("pt-BR", { month: "short" }),
      atendimentos: v
    })));

    setLoading(false);
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  // CREATE
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("associates").insert({
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      cpf: form.cpf || null,
      category: form.category as any,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Associado cadastrado!");
    setCreateOpen(false);
    setForm({ ...emptyForm });
    fetchData();
  };

  // EDIT
  const openEdit = (a: Associate) => {
    setEditId(a.id);
    setForm({ full_name: a.full_name, email: a.email || "", phone: a.phone || "", cpf: a.cpf || "", category: a.category, status: a.status });
    setEditOpen(true);
  };
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    const { error } = await supabase.from("associates").update({
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      cpf: form.cpf || null,
      category: form.category as any,
      status: form.status as any,
    }).eq("id", editId);
    if (error) { toast.error(error.message); return; }
    toast.success("Associado atualizado!");
    setEditOpen(false);
    setEditId(null);
    setForm({ ...emptyForm });
    fetchData();
  };

  // DELETE
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("associates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Associado removido!");
    fetchData();
  };

  // LINK user
  const openLink = (a: Associate) => {
    setLinkAssocId(a.id);
    setLinkUserId(a.user_id || "");
    setLinkOpen(true);
  };
  const handleLink = async () => {
    if (!linkAssocId) return;
    const { error } = await supabase.from("associates").update({
      user_id: linkUserId || null,
    }).eq("id", linkAssocId);
    if (error) { toast.error(error.message); return; }
    toast.success(linkUserId ? "Usuário vinculado!" : "Vínculo removido!");
    setLinkOpen(false);
    fetchData();
  };

  if (authLoading || loading) return (
    <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AppLayout>
  );

  const fmtCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const balance = stats.totalContributions - stats.totalExpenses;

  const statCards = [
    { label: "Associados", value: stats.totalAssociates, color: "hsl(var(--primary))", muted: "hsl(var(--primary-muted))", icon: "👥" },
    { label: "Ativos", value: stats.active, color: "hsl(142 64% 38%)", muted: "hsl(142 50% 95%)", icon: "✅" },
    { label: "Inadimplentes", value: stats.inadimplente, color: "hsl(var(--destructive))", muted: "hsl(var(--destructive-muted))", icon: "⚠️" },
    { label: "Saldo", value: fmtCurrency(balance), color: balance >= 0 ? "hsl(var(--accent-dark))" : "hsl(var(--destructive))", muted: balance >= 0 ? "hsl(var(--accent-muted))" : "hsl(var(--destructive-muted))", icon: "💰" },
  ];

  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    const p = profiles.find(p => p.user_id === userId);
    return p ? (p.full_name || p.email || userId.substring(0, 8)) : userId.substring(0, 8);
  };

  // Available profiles not yet linked
  const linkedUserIds = new Set(associates.filter(a => a.user_id).map(a => a.user_id!));
  const availableProfiles = profiles.filter(p => !linkedUserIds.has(p.user_id) || p.user_id === associates.find(a => a.id === linkAssocId)?.user_id);
  // Filtered associates
  const filteredAssociates = associates.filter(a => {
    const text = filterText.toLowerCase();
    const matchesText = !text || a.full_name.toLowerCase().includes(text) || (a.email?.toLowerCase().includes(text)) || (a.phone?.toLowerCase().includes(text));
    const matchesCat = filterCategory === "all" || a.category === filterCategory;
    const matchesStatus = filterStatus === "all" || a.status === filterStatus;
    return matchesText && matchesCat && matchesStatus;
  });

  const handleExport = (format: "csv" | "xlsx" | "txt") => {
    const rows = filteredAssociates.map(a => ({
      Nome: a.full_name,
      Email: a.email || "",
      Telefone: a.phone || "",
      CPF: a.cpf || "",
      Categoria: categoryLabels[a.category] || a.category,
      Situação: statusLabels[a.status] || a.status,
      Ingresso: new Date(a.join_date).toLocaleDateString("pt-BR"),
    }));

    if (format === "txt") {
      const header = Object.keys(rows[0] || {}).join("\t");
      const body = rows.map(r => Object.values(r).join("\t")).join("\n");
      const blob = new Blob([header + "\n" + body], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = "associados.txt"; link.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Associados");
      XLSX.writeFile(wb, format === "csv" ? "associados.csv" : "associados.xlsx");
    }
    toast.success(`Exportado como ${format.toUpperCase()}`);
  };

  const renderAssociateForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2"><Label>Nome completo *</Label><Input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} /></div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            <option value="frequentador">Frequentador</option>
            <option value="colaborador">Colaborador</option>
            <option value="efetivo">Efetivo</option>
            <option value="fundador">Fundador</option>
          </select>
        </div>
      </div>
      {editId && (
        <div className="space-y-2">
          <Label>Situação</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="ativo">Ativo</option>
            <option value="inadimplente">Inadimplente</option>
            <option value="afastado">Afastado</option>
            <option value="desligado">Desligado</option>
          </select>
        </div>
      )}
      <Button type="submit" className="w-full">{submitLabel}</Button>
    </form>
  );

  const today = new Date();
  const userName = user?.email?.split("@")[0] || "diretoria";

  return (
    <AppLayout>
      {/* Hero / welcome banner */}
      <div
        className="relative overflow-hidden rounded-2xl mb-8 px-7 py-7 sm:px-8 sm:py-8 text-white"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-dark)) 100%)" }}
      >
        <div className="absolute -right-10 -top-16 w-72 h-72 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="absolute right-24 -bottom-24 w-56 h-56 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[13px] text-white/80">Bem-vindo(a) de volta,</div>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold capitalize mt-1">{userName}</h1>
            <p className="text-sm text-white/75 mt-1">Painel da Diretoria · Centro Espiritualista Lar de Seu Luiz</p>
          </div>
          <div className="text-right">
            <div className="font-['Playfair_Display'] text-4xl font-bold leading-none">{today.getDate()}</div>
            <div className="text-[12px] text-white/80 mt-1 capitalize">
              {today.toLocaleDateString("pt-BR", { weekday: "long" })} · {today.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => (
          <Card key={s.label} className="border-0 border-t-[3px]" style={{ borderTopColor: s.color, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base" style={{ background: s.muted }}>
                  <span>{s.icon}</span>
                </div>
              </div>
              <div className="text-2xl sm:text-[32px] font-bold mt-2 leading-tight" style={{ color: s.color }}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 rounded-sm" style={{ background: "hsl(var(--accent))" }} />
        <h2 className="font-['Playfair_Display'] text-xl font-bold text-foreground">Visão Geral</h2>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }} className="border-0">
          <CardHeader><CardTitle className="text-base">Receitas vs Despesas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyFinance}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                <Legend />
                <Bar dataKey="receitas" fill="hsl(210, 100%, 35%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="hsl(44, 100%, 54%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }} className="border-0">
          <CardHeader><CardTitle className="text-base">Associados por Categoria</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm">Sem dados</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-0" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <CardHeader><CardTitle className="text-base">Atendimentos por Mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={sessionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="atendimentos" stroke="hsl(210, 100%, 35%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(44, 100%, 54%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="font-['Playfair_Display']">Associados</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button variant="outline" size="sm" onClick={() => {
                  const el = document.getElementById("export-menu");
                  if (el) el.classList.toggle("hidden");
                }}>
                  <Download className="w-4 h-4 mr-1" /> Exportar
                </Button>
                <div id="export-menu" className="hidden absolute right-0 mt-1 bg-card border rounded-md shadow-lg z-10">
                  <button className="block w-full text-left px-4 py-2 text-sm hover:bg-muted" onClick={() => { handleExport("csv"); document.getElementById("export-menu")?.classList.add("hidden"); }}>CSV</button>
                  <button className="block w-full text-left px-4 py-2 text-sm hover:bg-muted" onClick={() => { handleExport("xlsx"); document.getElementById("export-menu")?.classList.add("hidden"); }}>Excel (.xlsx)</button>
                  <button className="block w-full text-left px-4 py-2 text-sm hover:bg-muted" onClick={() => { handleExport("txt"); document.getElementById("export-menu")?.classList.add("hidden"); }}>Texto (.txt)</button>
                </div>
              </div>
              <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) setForm({ ...emptyForm }); }}>
                <DialogTrigger asChild><Button size="sm">+ Novo associado</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Cadastrar Associado</DialogTitle></DialogHeader>
                  {renderAssociateForm(handleAdd, "Salvar")}
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou telefone..."
                className="pl-9"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
              />
            </div>
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="all">Todas categorias</option>
              {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">Todas situações</option>
              {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAssociates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{associates.length === 0 ? "Nenhum associado cadastrado ainda." : "Nenhum associado encontrado com os filtros aplicados."}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Usuário Vinculado</TableHead>
                    <TableHead>Ingresso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssociates.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-semibold">{a.full_name}</div>
                        {a.email && <div className="text-xs text-muted-foreground">{a.email}</div>}
                      </TableCell>
                      <TableCell><span className={`pill pill-${a.category}`}>{categoryLabels[a.category] || a.category}</span></TableCell>
                      <TableCell><span className={`pill pill-${a.status}`}>{statusLabels[a.status] || a.status}</span></TableCell>
                      <TableCell>
                        {a.user_id ? (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{getUserName(a.user_id)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{new Date(a.join_date).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openLink(a)} title="Vincular usuário">
                            <Link2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir associado?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir <strong>{a.full_name}</strong>? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={v => { setEditOpen(v); if (!v) { setEditId(null); setForm({ ...emptyForm }); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Associado</DialogTitle></DialogHeader>
          {renderAssociateForm(handleEdit, "Atualizar")}
        </DialogContent>
      </Dialog>

      {/* Link User Dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Usuário</DialogTitle>
            <DialogDescription>Selecione um usuário do sistema para vincular a este associado. Isso permite que o associado acesse o Portal do Associado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select value={linkUserId} onValueChange={setLinkUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum (desvincular) —</SelectItem>
                  {availableProfiles.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email || p.user_id.substring(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancelar</Button>
              <Button onClick={() => { if (linkUserId === "none") setLinkUserId(""); handleLink(); }}>Salvar Vínculo</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AppDashboard;
