import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ticket, MessageCircle, QrCode, Unlock } from "lucide-react";
import { MolduraSimples, CabecalhoPagina, useAreasLsl } from "@/compartilhado";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import VendaRapida, { PixVenda } from "@/components/rifa/VendaRapida";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/acoes";
import { erroAmigavel, linkWhats, pad, PEDIDO_COR, PEDIDO_STATUS, reais, useRifaPublica, type Pedido } from "@/lib/rifas";

const LinkRR = ({ href, className, children }: { href: string; className: string; children: React.ReactNode }) => <Link to={href} className={className}>{children}</Link>;
type MinhaRifa = { id: string; slug: string; titulo: string; premio: string; preco: number; status: string; cota: number | null; vendidos: number; a_repassar: number; total?: number; max?: number };

// Tela do voluntário vendedor: escolhe a rifa, registra a venda pelo celular e acompanha o que vendeu.
export default function RifaVender() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const areas = useAreasLsl(supabase, user?.id);
  const qc = useQueryClient();
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate("/login?voltar=/app/rifas/vender"); }, [loading, user, navigate]);

  const { data: rifas = [], isLoading } = useQuery({
    queryKey: ["minhas-rifas-venda"],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: minhas }, { data: todas }] = await Promise.all([
        db.rpc("minhas_rifas_venda"),
        db.from("raffles").select("id, slug, title, prize, ticket_price, total_numbers, max_per_order, status").eq("status", "vendendo"),
      ]);
      const base = new Map<string, MinhaRifa>();
      for (const r of (todas ?? []) as { id: string; slug: string; title: string; prize: string; ticket_price: number; total_numbers: number; max_per_order: number; status: string }[]) {
        base.set(r.id, { id: r.id, slug: r.slug, titulo: r.title, premio: r.prize, preco: r.ticket_price, status: r.status, cota: null, vendidos: 0, a_repassar: 0, total: r.total_numbers, max: r.max_per_order });
      }
      for (const m of (minhas ?? []) as MinhaRifa[]) base.set(m.id, { ...base.get(m.id), ...m });
      return [...base.values()].filter((r) => r.status === "vendendo");
    },
  });
  const { data: detalhes } = useQuery({
    queryKey: ["rifa-venda-detalhe", sel],
    enabled: !!sel,
    queryFn: async () => {
      const { data } = await db.from("raffles").select("total_numbers, max_per_order").eq("id", sel).maybeSingle();
      return data as { total_numbers: number; max_per_order: number } | null;
    },
  });
  const { data: vendas = [] } = useQuery({
    queryKey: ["minhas-vendas-rifa", sel],
    enabled: !!sel && !!areas,
    queryFn: async () => {
      const { data } = await db.from("raffle_orders").select("*, raffle_tickets(number, ativo)").eq("raffle_id", sel).eq("channel", "vendedor")
        .order("created_at", { ascending: false }).limit(50);
      return (data ?? []) as Pedido[];
    },
  });

  useEffect(() => { if (!sel && rifas.length === 1) setSel(rifas[0].id); }, [rifas, sel]);
  const rifa = rifas.find((r) => r.id === sel);
  const total = detalhes?.total_numbers ?? rifa?.total ?? 0;
  const { data: pub } = useRifaPublica(rifa?.slug);
  const [pixAberto, setPixAberto] = useState<string | null>(null);

  const liberar = async (p: Pedido) => {
    const { error } = await db.rpc("rifa_liberar", { p_pedido: p.id, p_motivo: "Liberado pelo vendedor" });
    if (error) return toast.error(erroAmigavel(error));
    toast.success("Números liberados.");
    qc.invalidateQueries({ queryKey: ["minhas-vendas-rifa", sel] });
    qc.invalidateQueries({ queryKey: ["minhas-rifas-venda"] });
  };

  return (
    <MolduraSimples sistema="governanca" areas={areas} aoSair={async () => { await signOut(); navigate("/login"); }} usuario={{ nome: areas?.nome, foto: areas?.foto }}
      navegar={(h) => { if (h.startsWith("/formacao") || h.startsWith("/atendimento")) return false; navigate(h); return true; }}>
      <div className="rifa-vender-pagina max-w-3xl mx-auto min-w-0">
        <CabecalhoPagina titulo="Vender números da rifa" Link={LinkRR} voltar={{ href: "/app/perfil", rotulo: "Meu perfil" }}
          descricao="Escolha os números com o comprador, anote o nome e o WhatsApp e diga se já recebeu o dinheiro." />

        {isLoading ? <p className="text-sm text-muted-foreground text-center py-10">Carregando...</p> : rifas.length === 0 ? (
          <Card><CardContent className="py-12 text-center space-y-2">
            <Ticket className="w-10 h-10 mx-auto text-primary" />
            <p className="font-['Playfair_Display'] text-xl">Nenhuma rifa para vender agora</p>
            <p className="text-sm text-muted-foreground">Quando a coordenação colocar você como vendedor de uma rifa aberta, ela aparece aqui.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-6">
            {rifas.length > 1 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {rifas.map((r) => (
                  <button key={r.id} type="button" onClick={() => setSel(r.id)}
                    className={`text-left rounded-3xl p-5 transition-colors ${sel === r.id ? "bg-[#fff3cc]" : "bg-white hover:bg-[#eef4fb]"}`}>
                    <div className="font-['Playfair_Display'] text-lg font-bold">{r.titulo}</div>
                    <div className="text-sm text-muted-foreground">{r.premio} · {reais(r.preco)} o número</div>
                  </button>
                ))}
              </div>
            )}

            {rifa && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <Card><CardContent className="p-4 sm:p-5"><div className="text-xl sm:text-2xl font-bold tabular-nums">{rifa.vendidos}{rifa.cota ? <span className="text-base text-muted-foreground"> de {rifa.cota}</span> : null}</div><div className="text-sm text-muted-foreground">números que você vendeu</div></CardContent></Card>
                  <Card><CardContent className="p-4 sm:p-5"><div className="text-xl sm:text-2xl font-bold text-amber-700 tabular-nums">{reais(rifa.a_repassar)}</div><div className="text-sm text-muted-foreground">recebido, a repassar</div></CardContent></Card>
                </div>
                <Card className="overflow-hidden">
                  <CardHeader className="p-4 sm:p-6"><CardTitle className="font-['Playfair_Display'] text-xl">{rifa.titulo}</CardTitle><CardDescription>{reais(rifa.preco)} o número</CardDescription></CardHeader>
                  <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                    {total > 0 && <VendaRapida key={rifa.id} rifaId={rifa.id} slug={rifa.slug} total={total} preco={Number(rifa.preco)} maximo={detalhes?.max_per_order ?? rifa.max ?? 50}
                      aoConcluir={() => qc.invalidateQueries({ queryKey: ["minhas-vendas-rifa", sel] })} />}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4 sm:p-6"><CardTitle className="font-['Playfair_Display'] text-lg">Minhas vendas</CardTitle></CardHeader>
                  <CardContent className="space-y-2 p-4 pt-0 sm:p-6 sm:pt-0">
                    {vendas.length === 0 && <p className="text-sm text-muted-foreground">Você ainda não registrou vendas nesta rifa.</p>}
                    {vendas.map((p) => {
                      const nums = (p.raffle_tickets ?? []).filter((t) => p.status === "cancelado" || t.ativo).map((t) => t.number).sort((a, b) => a - b);
                      return (
                        <div key={p.id} className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-2xl bg-muted/50 p-3 sm:p-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{p.buyer_name} <Badge variant="outline" className={`ml-1 ${PEDIDO_COR[p.status]}`}>{p.status === "reservado" && p.received_by_seller ? "A repassar" : PEDIDO_STATUS[p.status]}</Badge></div>
                            <div className="text-sm text-muted-foreground">{p.code} · {nums.map((n) => pad(n, total)).join(", ")} · {reais(p.amount)}</div>
                          </div>
                          <Button variant="outline" size="icon" asChild><a href={linkWhats(p.buyer_phone)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp do comprador"><MessageCircle className="w-4 h-4" /></a></Button>
                          {p.status === "reservado" && !p.received_by_seller && (
                            <Button variant={pixAberto === p.id ? "default" : "outline"} size="sm" onClick={() => setPixAberto((x) => (x === p.id ? null : p.id))}><QrCode className="w-4 h-4 mr-1" /> PIX</Button>
                          )}
                          {p.status === "reservado" && <Button variant="ghost" size="sm" onClick={() => liberar(p)}><Unlock className="w-4 h-4 mr-1" /> Liberar</Button>}
                          {pixAberto === p.id && (
                            <div className="basis-full">
                              <PixVenda chave={pub?.pix_chave ?? null} nome={pub?.pix_nome ?? null} cidade={pub?.pix_cidade ?? null} valor={Number(p.amount)} codigo={p.code}
                                telefone={p.buyer_phone} primeiro={p.buyer_name.split(" ")[0]} nums={nums.map((n) => pad(n, total)).join(", ")} titulo={pub?.titulo ?? rifa.titulo} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </MolduraSimples>
  );
}
