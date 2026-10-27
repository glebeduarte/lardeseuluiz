import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Ticket, ChevronRight, ShoppingBag } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { CabecalhoPagina } from "@/compartilhado";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { db } from "@/lib/acoes";
import { dataBR, erroAmigavel, reais, RIFA_COR, RIFA_STATUS, type Rifa } from "@/lib/rifas";
import GuardaRifas from "@/components/rifa/GuardaRifas";

const LinkRR = ({ href, className, children }: { href: string; className: string; children: React.ReactNode }) => <Link to={href} className={className}>{children}</Link>;

const slugDe = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

type Resumo = { raffle_id: string; status: string; amount: number; raffle_tickets: { ativo: boolean }[] };

function RifasGestaoConteudo() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [nova, setNova] = useState(false);
  const [f, setF] = useState({ title: "", prize: "", ticket_price: "10", total_numbers: "100", draw_date: "" });
  const [salvando, setSalvando] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["rifas-gestao"],
    queryFn: async () => {
      const [{ data: rifas, error }, { data: pedidos }] = await Promise.all([
        db.from("raffles").select("*").order("created_at", { ascending: false }),
        db.from("raffle_orders").select("raffle_id, status, amount, raffle_tickets(ativo)").neq("status", "cancelado"),
      ]);
      if (error) throw error;
      return { rifas: (rifas ?? []) as Rifa[], pedidos: (pedidos ?? []) as Resumo[] };
    },
  });

  const numeros = (id: string, st?: string) => (data?.pedidos ?? []).filter((p) => p.raffle_id === id && (!st || p.status === st))
    .reduce((s, p) => s + p.raffle_tickets.filter((t) => t.ativo).length, 0);
  const arrecadado = (id: string) => (data?.pedidos ?? []).filter((p) => p.raffle_id === id && p.status === "pago").reduce((s, p) => s + Number(p.amount), 0);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    const base = slugDe(f.title) || "rifa";
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: r, error } = await db.from("raffles").insert({
      slug, title: f.title.trim(), prize: f.prize.trim(), ticket_price: Number(f.ticket_price.replace(",", ".")),
      total_numbers: Number(f.total_numbers), draw_date: f.draw_date || null, pix_name: "LAR DE SEU LUIZ",
    }).select("id").single();
    setSalvando(false);
    if (error) return toast.error(erroAmigavel(error));
    qc.invalidateQueries({ queryKey: ["rifas-gestao"] });
    setNova(false);
    toast.success("Rifa criada. Complete a chave PIX e abra as vendas.");
    navigate(`/app/rifas/${r.id}?aba=configurar`);
  };

  const rifas = data?.rifas ?? [];

  return (
    <AppLayout>
      <CabecalhoPagina titulo="Rifas" Link={LinkRR}
        descricao="Crie a rifa, acompanhe as reservas, confirme os PIX recebidos e registre o sorteio."
        acoes={<>
          <Button variant="outline" asChild><Link to="/app/rifas/vender"><ShoppingBag className="w-4 h-4 mr-2" /> Vender números</Link></Button>
          <Button onClick={() => setNova(true)}><Plus className="w-4 h-4 mr-2" /> Nova rifa</Button>
        </>} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : rifas.length === 0 ? (
        <Card><CardContent className="py-12 text-center space-y-3">
          <Ticket className="w-10 h-10 mx-auto text-primary" />
          <p className="font-['Playfair_Display'] text-xl">Nenhuma rifa ainda</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Comece criando a rifa com o prêmio, o preço e a quantidade de números. Depois você cadastra a chave PIX e abre as vendas.</p>
          <Button onClick={() => setNova(true)}><Plus className="w-4 h-4 mr-2" /> Criar a primeira rifa</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {rifas.map((r) => {
            const vendidos = numeros(r.id, "pago"), reservados = numeros(r.id, "reservado");
            const pct = Math.round(((vendidos + reservados) / r.total_numbers) * 100);
            return (
              <Link key={r.id} to={`/app/rifas/${r.id}`} className="group">
                <Card className="transition-colors group-hover:border-primary/40">
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#ffc116] text-[#0f1f3d] flex items-center justify-center shrink-0"><Ticket className="w-6 h-6" /></div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-['Playfair_Display'] text-lg font-bold">{r.title}</span>
                        <Badge variant="outline" className={RIFA_COR[r.status]}>{RIFA_STATUS[r.status]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.prize} · {reais(r.ticket_price)} o número{r.draw_date ? ` · sorteio em ${dataBR(r.draw_date)}` : ""}</p>
                      <div className="h-2 rounded-full bg-muted overflow-hidden max-w-md"><div className="h-full bg-[#ffc116]" style={{ width: `${pct}%` }} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center sm:text-right">
                      <div><div className="text-xl font-bold text-emerald-700">{vendidos}</div><div className="text-xs text-muted-foreground">pagos</div></div>
                      <div><div className="text-xl font-bold text-amber-700">{reservados}</div><div className="text-xs text-muted-foreground">esperando PIX</div></div>
                      <div><div className="text-xl font-bold">{reais(arrecadado(r.id))}</div><div className="text-xs text-muted-foreground">arrecadado</div></div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground hidden sm:block" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={nova} onOpenChange={setNova}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-['Playfair_Display']">Nova rifa</DialogTitle>
            <DialogDescription>Só o essencial agora. Chave PIX, regras e foto você completa na próxima tela.</DialogDescription>
          </DialogHeader>
          <form onSubmit={criar} className="grid gap-4">
            <div className="grid gap-2"><Label>Nome da rifa</Label><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex.: Rifa da Sopa Solidária" /></div>
            <div className="grid gap-2"><Label>Prêmio</Label><Input required value={f.prize} onChange={(e) => setF({ ...f, prize: e.target.value })} placeholder="Ex.: Cesta de Natal" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Preço de cada número (R$)</Label><Input required inputMode="decimal" value={f.ticket_price} onChange={(e) => setF({ ...f, ticket_price: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Quantidade de números</Label><Input required type="number" min={10} max={10000} value={f.total_numbers} onChange={(e) => setF({ ...f, total_numbers: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>Data do sorteio</Label><Input type="date" value={f.draw_date} onChange={(e) => setF({ ...f, draw_date: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNova(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>{salvando ? "Criando..." : "Criar rifa"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}


/** Só a coordenação das rifas abre esta tela; vendedores são levados para a tela de venda. */
export default function RifasGestao() {
  return <GuardaRifas><RifasGestaoConteudo /></GuardaRifas>;
}
