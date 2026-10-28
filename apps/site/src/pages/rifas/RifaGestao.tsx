import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, MessageCircle, Plus, Search, Trash2, Undo2, Unlock, Trophy, UserPlus } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { CabecalhoPagina } from "@/compartilhado";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BuscaPessoa from "@/components/acoes/BuscaPessoa";
import GradeNumeros, { type Situacao } from "@/components/rifa/GradeNumeros";
import VendaRapida from "@/components/rifa/VendaRapida";
import { db, useNomesPessoas, type PessoaBasica } from "@/lib/acoes";
import { dataBR, erroAmigavel, linkWhats, mensagemCobranca, pad, PEDIDO_COR, PEDIDO_STATUS, reais, RIFA_COR, RIFA_STATUS, slugRifa, type Pedido, type Rifa, type RifaStatus } from "@/lib/rifas";
import "@/components/rifa/rifa.css";
import GuardaRifas from "@/components/rifa/GuardaRifas";

const LinkRR = ({ href, className, children }: { href: string; className: string; children: React.ReactNode }) => <Link to={href} className={className}>{children}</Link>;
type Vendedor = { raffle_id: string; person_id: string; quota: number | null };
type Filtro = "reservado" | "repassar" | "pago" | "cancelado" | "todos";
const POR_PAGINA = 20;

function RifaGestaoConteudo() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const aba = params.get("aba") ?? "pedidos";
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["rifa-gestao", id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: rifa, error }, { data: pedidos }, { data: vendedores }, { data: projetos }] = await Promise.all([
        db.from("raffles").select("*").eq("id", id).maybeSingle(),
        db.from("raffle_orders").select("*, raffle_tickets(number, ativo)").eq("raffle_id", id).order("created_at", { ascending: false }),
        db.from("raffle_sellers").select("*").eq("raffle_id", id),
        db.from("projects").select("id, name, cover_url").order("display_order"),
      ]);
      if (error) throw error;
      return {
        rifa: rifa as Rifa | null, pedidos: (pedidos ?? []) as Pedido[], vendedores: (vendedores ?? []) as Vendedor[],
        projetos: (projetos ?? []) as { id: string; name: string; cover_url: string | null }[],
      };
    },
  });
  const atualizar = () => { qc.invalidateQueries({ queryKey: ["rifa-gestao", id] }); qc.invalidateQueries({ queryKey: ["rifas-gestao"] }); };
  const nomes = useNomesPessoas([...(data?.vendedores ?? []).map((v) => v.person_id), ...(data?.pedidos ?? []).map((p) => p.seller_person_id)]);

  if (isLoading) return <AppLayout><p className="text-sm text-muted-foreground text-center py-16">Carregando...</p></AppLayout>;
  const rifa = data?.rifa;
  if (!rifa) return <AppLayout><CabecalhoPagina titulo="Rifa não encontrada" Link={LinkRR} voltar={{ href: "/app/rifas", rotulo: "Rifas" }} /></AppLayout>;

  const pedidos = data!.pedidos;
  const ativos = pedidos.filter((p) => p.status !== "cancelado");
  const conta = (st: string) => ativos.filter((p) => p.status === st).reduce((s, p) => s + (p.raffle_tickets ?? []).filter((t) => t.ativo).length, 0);
  const pagos = conta("pago"), reservados = conta("reservado");
  const arrecadado = ativos.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.amount), 0);
  const aReceber = ativos.filter((p) => p.status === "reservado").reduce((s, p) => s + Number(p.amount), 0);
  const linkPublico = `${window.location.origin}/rifas/${rifa.slug}`;

  return (
    <AppLayout>
      <CabecalhoPagina Link={LinkRR} voltar={{ href: "/app/rifas", rotulo: "Rifas" }}
        titulo={rifa.title}
        descricao={<>{rifa.prize} · {reais(rifa.ticket_price)} o número · {rifa.total_numbers} números{rifa.draw_date ? ` · sorteio em ${dataBR(rifa.draw_date)}` : ""} <Badge variant="outline" className={`ml-1 ${RIFA_COR[rifa.status]}`}>{RIFA_STATUS[rifa.status]}</Badge></>}
        acoes={<>
          <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(linkPublico); toast.success("Link da rifa copiado. Cole no WhatsApp para divulgar."); }}><Copy className="w-4 h-4 mr-2" /> Copiar link</Button>
          <Button variant="outline" asChild><a href={`/rifas/${rifa.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" /> Ver página</a></Button>
        </>} />

      {rifa.status === "rascunho" && (
        <div className="mb-6 rounded-2xl bg-amber-50 text-amber-900 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <span>A rifa ainda está em preparação e não aparece no site. Confira a chave PIX e abra as vendas.</span>
          <Button size="sm" onClick={() => setParams({ aba: "configurar" }, { replace: true })}>Configurar e abrir vendas</Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Numero rotulo="Números pagos" valor={String(pagos)} cor="text-emerald-700" />
        <Numero rotulo="Esperando PIX" valor={String(reservados)} cor="text-amber-700" />
        <Numero rotulo="Livres" valor={String(rifa.total_numbers - pagos - reservados)} />
        <Numero rotulo="Arrecadado" valor={reais(arrecadado)} detalhe={aReceber ? `${reais(aReceber)} a confirmar` : undefined} />
      </div>

      <Tabs value={aba} onValueChange={(v) => setParams({ aba: v }, { replace: true })}>
        <TabsList className="flex-wrap h-auto rounded-full p-1">
          <TabsTrigger value="pedidos" className="rounded-full">Pedidos</TabsTrigger>
          <TabsTrigger value="numeros" className="rounded-full">Números</TabsTrigger>
          <TabsTrigger value="vendedores" className="rounded-full">Vendedores</TabsTrigger>
          <TabsTrigger value="sorteio" className="rounded-full">Sorteio</TabsTrigger>
          <TabsTrigger value="configurar" className="rounded-full">Configurar</TabsTrigger>
        </TabsList>
        <TabsContent value="pedidos" className="mt-5"><AbaPedidos rifa={rifa} pedidos={pedidos} nomes={nomes.data ?? {}} atualizar={atualizar} /></TabsContent>
        <TabsContent value="numeros" className="mt-5"><AbaNumeros rifa={rifa} pedidos={pedidos} /></TabsContent>
        <TabsContent value="vendedores" className="mt-5"><AbaVendedores rifa={rifa} vendedores={data!.vendedores} pedidos={pedidos} nomes={nomes.data ?? {}} atualizar={atualizar} /></TabsContent>
        <TabsContent value="sorteio" className="mt-5"><AbaSorteio rifa={rifa} pedidos={pedidos} atualizar={atualizar} /></TabsContent>
        <TabsContent value="configurar" className="mt-5"><AbaConfigurar rifa={rifa} projetos={data!.projetos} atualizar={atualizar} /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function Numero({ rotulo, valor, cor, detalhe }: { rotulo: string; valor: string; cor?: string; detalhe?: string }) {
  return (
    <Card><CardContent className="p-5">
      <div className={`text-2xl font-bold ${cor ?? ""}`}>{valor}</div>
      <div className="text-sm text-muted-foreground">{rotulo}</div>
      {detalhe && <div className="text-xs text-amber-700 mt-1">{detalhe}</div>}
    </CardContent></Card>
  );
}

const numerosDo = (p: Pedido) => (p.raffle_tickets ?? []).filter((t) => p.status === "cancelado" || t.ativo).map((t) => t.number).sort((a, b) => a - b);

/* ───── Pedidos ───── */
function AbaPedidos({ rifa, pedidos, nomes, atualizar }: { rifa: Rifa; pedidos: Pedido[]; nomes: Record<string, PessoaBasica>; atualizar: () => void }) {
  const [filtro, setFiltro] = useState<Filtro>("reservado");
  const [busca, setBusca] = useState("");
  const [liberar, setLiberar] = useState<Pedido | null>(null);
  const [motivo, setMotivo] = useState("");
  const [lancar, setLancar] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [remover, setRemover] = useState<Pedido | null>(null);
  const [motivoRemocao, setMotivoRemocao] = useState("");
  const [pagina, setPagina] = useState(1);
  useEffect(() => { setPagina(1); }, [filtro, busca]);
  // Remover venda (apagar de vez) é só para quem criou a rifa
  const { data: meuId } = useQuery({ queryKey: ["meu-uid"], queryFn: async () => (await db.auth.getUser()).data.user?.id ?? null });
  const souCriador = !!rifa.created_by && rifa.created_by === meuId;

  const repassar = pedidos.filter((p) => p.status === "reservado" && p.received_by_seller);
  const contagem: Record<Filtro, number> = {
    reservado: pedidos.filter((p) => p.status === "reservado").length, repassar: repassar.length,
    pago: pedidos.filter((p) => p.status === "pago").length, cancelado: pedidos.filter((p) => p.status === "cancelado").length, todos: pedidos.length,
  };
  const q = busca.trim().toLowerCase();
  const lista = pedidos
    .filter((p) => filtro === "todos" ? true : filtro === "repassar" ? p.status === "reservado" && p.received_by_seller : p.status === filtro)
    .filter((p) => !q || p.buyer_name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.buyer_phone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "§")
      || numerosDo(p).some((n) => String(n) === q));
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const visiveis = lista.slice(inicio, inicio + POR_PAGINA);
  const irPara = (n: number) => { setPagina(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const marcarPago = async (p: Pedido, pago = true) => {
    setOcupado(p.id);
    const { error } = await db.rpc("rifa_marcar_pago", { p_pedido: p.id, p_pago: pago });
    setOcupado(null);
    if (error) return toast.error(erroAmigavel(error));
    toast.success(pago ? `Pagamento de ${p.buyer_name} confirmado.` : "Pagamento desfeito; o pedido voltou a esperar o PIX.");
    atualizar();
  };
  const confirmarLiberar = async () => {
    if (!liberar) return;
    const { error } = await db.rpc("rifa_liberar", { p_pedido: liberar.id, p_motivo: motivo });
    if (error) return toast.error(erroAmigavel(error));
    toast.success("Números liberados. Eles voltaram a ficar disponíveis.");
    setLiberar(null); setMotivo(""); atualizar();
  };

  const confirmarRemover = async () => {
    if (!remover) return;
    const { error } = await db.rpc("rifa_remover_pedido", { p_pedido: remover.id, p_motivo: motivoRemocao });
    if (error) return toast.error(erroAmigavel(error));
    toast.success(`Venda ${remover.code} removida. Os números voltaram a ficar livres.`);
    setRemover(null); setMotivoRemocao(""); atualizar();
  };

  const FILTROS: [Filtro, string][] = [["reservado", "Esperando PIX"], ["repassar", "Com vendedor, a repassar"], ["pago", "Pagos"], ["cancelado", "Liberados"], ["todos", "Todos"]];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map(([f, r]) => (
          <button key={f} type="button" onClick={() => setFiltro(f)}
            className={`h-10 rounded-full px-4 text-sm font-semibold transition-colors ${filtro === f ? "bg-[#003c7f] text-white" : "bg-white text-foreground hover:bg-[#eef4fb]"}`}>
            {r} <span className="opacity-70">{contagem[f]}</span>
          </button>
        ))}
        <div className="flex-1" />
        {rifa.status === "vendendo" && <Button onClick={() => setLancar(true)}><Plus className="w-4 h-4 mr-2" /> Lançar venda</Button>}
      </div>
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-10" placeholder="Buscar por nome, código, WhatsApp ou número" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {lista.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          {filtro === "reservado" ? "Nenhum pedido esperando PIX agora." : "Nenhum pedido aqui."}
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {visiveis.map((p) => {
            const nums = numerosDo(p);
            const vendedor = p.seller_person_id ? nomes[p.seller_person_id]?.full_name : null;
            const msg = p.status === "pago"
              ? `Olá, ${p.buyer_name.split(" ")[0]}! Confirmamos o pagamento da reserva ${p.code} na ${rifa.title}. Seus números: ${nums.map((n) => pad(n, rifa.total_numbers)).join(", ")}. Boa sorte!`
              : mensagemCobranca({ nome: p.buyer_name, codigo: p.code, titulo: rifa.title, numeros: nums, total: rifa.total_numbers, valor: Number(p.amount),
                  chave: rifa.pix_key, recebedor: rifa.pix_name, cidade: rifa.pix_city, slug: rifa.slug });
            return (
              <Card key={p.id}>
                <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-base">{p.buyer_name}</span>
                      <Badge variant="outline" className={PEDIDO_COR[p.status]}>{PEDIDO_STATUS[p.status]}</Badge>
                      {p.status === "reservado" && p.received_by_seller && <Badge variant="outline" className="bg-sky-100 text-sky-800 border-sky-300">Vendedor recebeu</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      <span className="font-mono font-semibold text-foreground">{p.code}</span>
                      <a className="underline" href={linkWhats(p.buyer_phone, msg)} target="_blank" rel="noopener noreferrer">{p.buyer_phone}</a>
                      <span>{p.channel === "site" ? "Pelo site" : `Vendido por ${vendedor ?? "voluntário"}`}</span>
                      <span>{new Date(p.created_at).toLocaleDateString("pt-BR")}</span>
                      {p.cancel_reason && <span>Motivo: {p.cancel_reason}</span>}
                    </div>
                    <div className={`rifa-chips${p.status === "pago" ? " rifa-chips--pago" : ""}`} style={{ opacity: p.status === "cancelado" ? 0.5 : 1 }}>
                      {nums.map((n) => <span key={n} style={{ height: 32, minWidth: 40, fontSize: 14 }}>{pad(n, rifa.total_numbers)}</span>)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <span className="text-lg font-bold mr-2">{reais(p.amount)}</span>
                    {p.status === "reservado" && (
                      <Button onClick={() => marcarPago(p)} disabled={ocupado === p.id} className="bg-emerald-700 hover:bg-emerald-800"><Check className="w-4 h-4 mr-2" /> Confirmar pagamento</Button>
                    )}
                    {p.status === "pago" && <Button variant="outline" onClick={() => marcarPago(p, false)} disabled={ocupado === p.id}><Undo2 className="w-4 h-4 mr-2" /> Desfazer</Button>}
                    {p.status === "cancelado" ? null : (
                      <Button variant="outline" asChild title={p.status === "reservado" ? "Manda os números, o valor e o PIX copia e cola" : "Manda a confirmação com os números"}>
                        <a href={linkWhats(p.buyer_phone, msg)} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="w-4 h-4 mr-2" /> {p.status === "reservado" ? "Cobrar com PIX" : "Confirmar no WhatsApp"}
                        </a>
                      </Button>
                    )}
                    {p.status !== "cancelado" && <Button variant="ghost" onClick={() => setLiberar(p)}><Unlock className="w-4 h-4 mr-2" /> Liberar</Button>}
                    {souCriador && rifa.winner_order_id !== p.id && (
                      <Button variant="ghost" className="text-red-700 hover:text-red-800 hover:bg-red-50" onClick={() => setRemover(p)}><Trash2 className="w-4 h-4 mr-2" /> Remover venda</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button variant="outline" onClick={() => irPara(paginaAtual - 1)} disabled={paginaAtual === 1}><ChevronLeft className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Anterior</span></Button>
              <span className="text-sm text-muted-foreground text-center">
                {inicio + 1} a {Math.min(inicio + POR_PAGINA, lista.length)} de {lista.length}
                <span className="block text-xs">Página {paginaAtual} de {totalPaginas}</span>
              </span>
              <Button variant="outline" onClick={() => irPara(paginaAtual + 1)} disabled={paginaAtual === totalPaginas}><span className="hidden sm:inline">Próxima</span><ChevronRight className="w-4 h-4 sm:ml-1" /></Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!liberar} onOpenChange={(v) => !v && setLiberar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Playfair_Display']">Liberar os números?</DialogTitle>
            <DialogDescription>
              Os números {liberar ? numerosDo(liberar).map((n) => pad(n, rifa.total_numbers)).join(", ") : ""} de {liberar?.buyer_name} voltam a ficar livres para outras pessoas.
              {liberar?.status === "pago" ? " Atenção: este pedido já está pago." : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2"><Label>Motivo (opcional)</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: não pagou, desistiu" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiberar(null)}>Voltar</Button>
            <Button variant="destructive" onClick={confirmarLiberar}>Liberar números</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!remover} onOpenChange={(v) => !v && setRemover(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Playfair_Display']">Remover a venda {remover?.code}?</DialogTitle>
            <DialogDescription>
              A venda de {remover?.buyer_name} sai da rifa e os números {remover ? numerosDo(remover).map((n) => pad(n, rifa.total_numbers)).join(", ") : ""} voltam a ficar livres.
              Ela deixa de aparecer nos pedidos e nos totais. Use para vendas de teste ou lançadas por engano; para quem desistiu, prefira Liberar.
              {remover?.status === "pago" ? " Atenção: esta venda está marcada como paga." : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2"><Label>Motivo (opcional)</Label><Input value={motivoRemocao} onChange={(e) => setMotivoRemocao(e.target.value)} placeholder="Ex.: venda de teste" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemover(null)}>Voltar</Button>
            <Button variant="destructive" onClick={confirmarRemover}>Remover venda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lancar} onOpenChange={setLancar}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-['Playfair_Display']">Lançar venda</DialogTitle>
            <DialogDescription>Para vendas feitas na casa ou por telefone. Se o dinheiro já foi recebido, o pedido entra como pago.</DialogDescription>
          </DialogHeader>
          <VendaRapida rifaId={rifa.id} slug={rifa.slug} total={rifa.total_numbers} preco={Number(rifa.ticket_price)} maximo={rifa.max_per_order} coordenacao
            aoConcluir={() => { setLancar(false); atualizar(); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───── Números ───── */
function AbaNumeros({ rifa, pedidos }: { rifa: Rifa; pedidos: Pedido[] }) {
  const { ocupados, dono } = useMemo(() => {
    const o = new Map<number, Situacao>(); const d = new Map<number, Pedido>();
    for (const p of pedidos) if (p.status !== "cancelado") for (const t of p.raffle_tickets ?? []) if (t.ativo) { o.set(t.number, p.status === "pago" ? "p" : "r"); d.set(t.number, p); }
    return { ocupados: o, dono: d };
  }, [pedidos]);
  const [ver, setVer] = useState<number | null>(null);
  const p = ver ? dono.get(ver) : null;
  return (
    <Card><CardContent className="p-5 space-y-4">
      <p className="text-sm text-muted-foreground">Toque num número reservado ou vendido para ver de quem é.</p>
      <GradeNumeros total={rifa.total_numbers} ocupados={ocupados} aoTocar={(n) => setVer(n)} rotuloOcupado destaque={rifa.winner_number} />
      {ver && (
        <div className="rounded-2xl bg-muted/60 p-4 text-sm">
          <strong>Número {pad(ver, rifa.total_numbers)}:</strong>{" "}
          {p ? <>{p.buyer_name} · {p.buyer_phone} · {PEDIDO_STATUS[p.status]} · pedido {p.code}</> : "livre"}
        </div>
      )}
    </CardContent></Card>
  );
}

/* ───── Vendedores ───── */
function AbaVendedores({ rifa, vendedores, pedidos, nomes, atualizar }: { rifa: Rifa; vendedores: Vendedor[]; pedidos: Pedido[]; nomes: Record<string, PessoaBasica>; atualizar: () => void }) {
  const [pessoa, setPessoa] = useState<PessoaBasica | null>(null);
  const [cota, setCota] = useState("");
  const [repasse, setRepasse] = useState<{ v: Vendedor; pedidos: Pedido[]; valor: number } | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const adicionar = async () => {
    if (!pessoa) return;
    const { error } = await db.from("raffle_sellers").insert({ raffle_id: rifa.id, person_id: pessoa.id, quota: cota ? Number(cota) : null });
    if (error) return toast.error(error.code === "23505" ? "Essa pessoa já é vendedora desta rifa." : erroAmigavel(error));
    toast.success(`${pessoa.full_name} agora pode vender números pelo celular.`);
    setPessoa(null); setCota(""); atualizar();
  };
  const remover = async (v: Vendedor) => {
    const { error } = await db.from("raffle_sellers").delete().eq("raffle_id", v.raffle_id).eq("person_id", v.person_id);
    if (error) return toast.error(erroAmigavel(error));
    atualizar();
  };
  const linkVenda = `${window.location.origin}/app/rifas/vender`;
  const qtdNums = (ps: Pedido[]) => ps.reduce((s, p) => s + (p.raffle_tickets ?? []).filter((t) => t.ativo).length, 0);
  const soma = (ps: Pedido[]) => ps.reduce((s, p) => s + Number(p.amount), 0);

  // Prestação de contas: o que cada vendedor vendeu, o que já entregou e o que ainda está com ele
  const contas = vendedores.map((v) => {
    const dele = pedidos.filter((p) => p.seller_person_id === v.person_id && p.status !== "cancelado");
    const entregues = dele.filter((p) => p.status === "pago");
    const comEle = dele.filter((p) => p.status === "reservado" && p.received_by_seller);
    const aReceber = dele.filter((p) => p.status === "reservado" && !p.received_by_seller);
    return { v, dele, numeros: qtdNums(dele), vendido: soma(dele), entregue: soma(entregues), comEle, comEleValor: soma(comEle), aReceber, aReceberValor: soma(aReceber) };
  });
  const tot = contas.reduce((t, c) => ({ vendido: t.vendido + c.vendido, entregue: t.entregue + c.entregue, comEles: t.comEles + c.comEleValor, aReceber: t.aReceber + c.aReceberValor, numeros: t.numeros + c.numeros }),
    { vendido: 0, entregue: 0, comEles: 0, aReceber: 0, numeros: 0 });

  const confirmarRepasse = async () => {
    if (!repasse) return;
    setConfirmando(true);
    let falhas = 0;
    for (const p of repasse.pedidos) {
      const { error } = await db.rpc("rifa_marcar_pago", { p_pedido: p.id, p_pago: true });
      if (error) falhas++;
    }
    setConfirmando(false);
    const nome = nomes[repasse.v.person_id]?.full_name?.split(" ")[0] ?? "vendedor";
    if (falhas) toast.error(`${falhas} pedido(s) não foram confirmados. Confira na aba Pedidos.`);
    else toast.success(`Repasse de ${reais(repasse.valor)} de ${nome} confirmado.`);
    setRepasse(null); atualizar();
  };

  const mensagemCobrar = (c: (typeof contas)[number]) => {
    const primeiro = nomes[c.v.person_id]?.full_name?.split(" ")[0] ?? "";
    const linhas = [
      `Olá, ${primeiro}! Tudo bem? Passando para acertarmos as vendas da ${rifa.title}.`,
      "",
      `Pelo sistema, você está com ${reais(c.comEleValor)} recebidos dos compradores:`,
      ...c.comEle.map((p) => `• ${p.buyer_name.split(" ")[0]} (${p.code}): ${reais(Number(p.amount))}`),
    ];
    if (c.aReceberValor > 0) linhas.push("", `E ainda faltam ${reais(c.aReceberValor)} de compradores que não pagaram.`);
    linhas.push("", rifa.pix_key ? `Pode fazer o repasse pelo PIX ${rifa.pix_key} ou entregar na Casa. Obrigado pela ajuda!` : "Pode entregar na Casa. Obrigado pela ajuda!");
    return linhas.join("\n");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4 min-w-0">
        {vendedores.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Resumo rotulo="Vendido pelos vendedores" valor={reais(tot.vendido)} nota={`${tot.numeros} números`} />
            <Resumo rotulo="Já entregue" valor={reais(tot.entregue)} cor="text-emerald-700" />
            <Resumo rotulo="Com os vendedores" valor={reais(tot.comEles)} cor="text-amber-700" nota="falta repassar" />
            <Resumo rotulo="Compradores devendo" valor={reais(tot.aReceber)} cor="text-muted-foreground" />
          </div>
        )}
        <Card>
          <CardHeader><CardTitle className="font-['Playfair_Display'] text-lg">Prestação de contas</CardTitle>
            <CardDescription>Cada vendedor registra as vendas pelo celular e marca quando recebeu o dinheiro. O valor fica "com o vendedor" até a coordenação confirmar o repasse.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {vendedores.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhum vendedor ainda. Adicione ao lado.</p>}
            {contas.map((c) => {
              const tel = nomes[c.v.person_id]?.phone;
              return (
                <div key={c.v.person_id} className="rounded-2xl bg-muted/50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{nomes[c.v.person_id]?.full_name ?? "Vendedor"}</div>
                      <div className="text-sm text-muted-foreground lining-nums">
                        {c.numeros} {c.numeros === 1 ? "número" : "números"}{c.v.quota ? ` de ${c.v.quota}` : ""} · {reais(c.vendido)} vendidos
                      </div>
                    </div>
                    {tel && <Button variant="outline" size="icon" asChild><a href={linkWhats(tel, `Olá! Você está como vendedor da ${rifa.title}. Para registrar as vendas, entre em ${linkVenda}`)} target="_blank" rel="noopener noreferrer" aria-label="Enviar link de venda pelo WhatsApp"><MessageCircle className="w-4 h-4" /></a></Button>}
                    <Button variant="ghost" size="icon" onClick={() => remover(c.v)} aria-label="Tirar vendedor" disabled={c.dele.length > 0} title={c.dele.length > 0 ? "Vendedor com vendas não pode ser retirado" : "Tirar vendedor"}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  {c.dele.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-card px-2 py-2"><div className="text-[12px] text-muted-foreground">Entregue</div><div className="font-semibold text-emerald-700 lining-nums">{reais(c.entregue)}</div></div>
                      <div className="rounded-xl bg-card px-2 py-2"><div className="text-[12px] text-muted-foreground">Com ele</div><div className={`font-semibold lining-nums ${c.comEleValor ? "text-amber-700" : ""}`}>{reais(c.comEleValor)}</div></div>
                      <div className="rounded-xl bg-card px-2 py-2"><div className="text-[12px] text-muted-foreground">Comprador deve</div><div className="font-semibold text-muted-foreground lining-nums">{reais(c.aReceberValor)}</div></div>
                    </div>
                  )}
                  {(c.comEleValor > 0 || c.aReceberValor > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {c.comEleValor > 0 && (
                        <Button size="sm" onClick={() => setRepasse({ v: c.v, pedidos: c.comEle, valor: c.comEleValor })}><Check className="w-4 h-4 mr-1" /> Recebi {reais(c.comEleValor)}</Button>
                      )}
                      {tel && (
                        <Button size="sm" variant="outline" asChild><a href={linkWhats(tel, mensagemCobrar(c))} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4 mr-1" /> Cobrar repasse</a></Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      <Card className="self-start">
        <CardHeader><CardTitle className="font-['Playfair_Display'] text-lg">Adicionar vendedor</CardTitle>
          <CardDescription>A pessoa precisa ter login na plataforma. Ela passa a ver só a tela de venda: escolhe os números, preenche o comprador e acompanha o que vendeu.</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2"><Label>Pessoa</Label><BuscaPessoa valor={pessoa} onEscolher={setPessoa} /></div>
          <div className="grid gap-2"><Label>Cota de números (opcional)</Label><Input type="number" min={1} value={cota} onChange={(e) => setCota(e.target.value)} placeholder="Ex.: 20" /></div>
          <Button onClick={adicionar} disabled={!pessoa}><UserPlus className="w-4 h-4 mr-2" /> Adicionar</Button>
          <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(linkVenda); toast.success("Link de venda copiado."); }}><Copy className="w-4 h-4 mr-2" /> Copiar link de venda</Button>
        </CardContent>
      </Card>

      <Dialog open={!!repasse} onOpenChange={(v) => !v && setRepasse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Playfair_Display']">Confirmar repasse de {repasse ? reais(repasse.valor) : ""}?</DialogTitle>
            <DialogDescription>
              {repasse ? `${nomes[repasse.v.person_id]?.full_name ?? "O vendedor"} entregou o dinheiro destes pedidos. Eles passam a contar como pagos:` : ""}
            </DialogDescription>
          </DialogHeader>
          <ul className="text-sm space-y-1 max-h-60 overflow-y-auto">
            {repasse?.pedidos.map((p) => (
              <li key={p.id} className="flex justify-between gap-3"><span>{p.buyer_name} <span className="text-muted-foreground">({p.code})</span></span><span className="lining-nums">{reais(Number(p.amount))}</span></li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepasse(null)}>Cancelar</Button>
            <Button onClick={confirmarRepasse} disabled={confirmando}>{confirmando ? "Confirmando..." : "Confirmar repasse"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Resumo({ rotulo, valor, nota, cor }: { rotulo: string; valor: string; nota?: string; cor?: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/70 px-4 py-3">
      <div className="text-[12px] text-muted-foreground leading-tight">{rotulo}</div>
      <div className={`text-lg font-bold lining-nums ${cor ?? ""}`}>{valor}</div>
      {nota && <div className="text-[12px] text-muted-foreground">{nota}</div>}
    </div>
  );
}

/* ───── Sorteio ───── */
function AbaSorteio({ rifa, pedidos, atualizar }: { rifa: Rifa; pedidos: Pedido[]; atualizar: () => void }) {
  const [numero, setNumero] = useState("");
  const [notas, setNotas] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const pendentes = pedidos.filter((p) => p.status === "reservado").length;
  const ganhador = rifa.winner_order_id ? pedidos.find((p) => p.id === rifa.winner_order_id) : null;
  const n = Number(numero);
  const dono = pedidos.find((p) => p.status !== "cancelado" && (p.raffle_tickets ?? []).some((t) => t.ativo && t.number === n));

  const registrar = async () => {
    const { error } = await db.rpc("rifa_registrar_sorteio", { p_raffle: rifa.id, p_numero: n, p_notas: notas });
    if (error) return toast.error(erroAmigavel(error));
    toast.success("Sorteio registrado. O resultado já aparece na página da rifa.");
    setConfirmar(false); atualizar();
  };

  if (rifa.status === "sorteada") {
    return (
      <Card><CardContent className="p-6 space-y-4">
        <div className="rifa-ganhou">
          <b>{pad(rifa.winner_number ?? 0, rifa.total_numbers)}</b>
          <div>
            <p><strong>Número sorteado em {rifa.drawn_at ? new Date(rifa.drawn_at).toLocaleString("pt-BR") : ""}</strong></p>
            <p>{ganhador ? `${ganhador.buyer_name} · ${ganhador.buyer_phone} · pedido ${ganhador.code}` : "Este número não estava pago."}</p>
            {rifa.draw_notes && <p className="text-sm" style={{ color: "#cfe0f5" }}>{rifa.draw_notes}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild><Link to={`/app/rifas/${rifa.id}/sorteio`}><Trophy className="w-4 h-4 mr-2" /> Mostrar na tela</Link></Button>
        {ganhador && <Button asChild><a href={linkWhats(ganhador.buyer_phone, `Olá, ${ganhador.buyer_name.split(" ")[0]}! O número ${pad(rifa.winner_number ?? 0, rifa.total_numbers)} foi sorteado na ${rifa.title} e é seu. Parabéns! Vamos combinar a entrega do prêmio: ${rifa.prize}.`)} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4 mr-2" /> Avisar o ganhador</a></Button>}
        </div>
      </CardContent></Card>
    );
  }

  return (
    <div className="grid gap-4">
    <Card>
      <CardHeader><CardTitle className="font-['Playfair_Display'] text-lg">Sortear pela ferramenta</CardTitle>
        <CardDescription>Abra a tela do sorteio no projetor ou na TV. Ela mostra quem vendeu, quantos números pagos concorrem e sorteia um deles ao acaso.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 max-w-xl">
        {pendentes > 0 && <p className="rounded-2xl bg-amber-50 text-amber-900 px-4 py-3 text-sm">Ainda há {pendentes} {pendentes === 1 ? "pedido esperando" : "pedidos esperando"} PIX. Só números pagos concorrem: confirme ou libere esses pedidos antes do sorteio.</p>}
        <div><Button asChild><Link to={`/app/rifas/${rifa.id}/sorteio`}><Trophy className="w-4 h-4 mr-2" /> Abrir a tela do sorteio</Link></Button></div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle className="font-['Playfair_Display'] text-lg">Ou registre um sorteio feito à mão</CardTitle>
        <CardDescription>Se o sorteio for feito na casa de outro jeito, digite o número sorteado. O resultado aparece na página da rifa.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 max-w-xl">
        {rifa.status === "vendendo" && <p className="text-sm text-muted-foreground">Dica: em Configurar, mude a situação para "Vendas encerradas" antes de sortear, para ninguém reservar no meio do sorteio.</p>}
        <div className="grid gap-2"><Label>Número sorteado</Label><Input type="number" min={1} max={rifa.total_numbers} value={numero} onChange={(e) => setNumero(e.target.value)} className="text-2xl font-bold h-14 max-w-[200px]" /></div>
        {numero && n >= 1 && n <= rifa.total_numbers && (
          <p className="text-sm">{dono ? (dono.status === "pago" ? `Este número é de ${dono.buyer_name} (pago).` : `Este número está reservado por ${dono.buyer_name}, mas ainda não foi pago.`) : "Este número não foi vendido."}</p>
        )}
        <div className="grid gap-2"><Label>Como foi o sorteio (opcional)</Label><Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ex.: sorteado na reunião de sábado, com a presença de..." /></div>
        <div><Button onClick={() => setConfirmar(true)} disabled={!n || n < 1 || n > rifa.total_numbers}><Trophy className="w-4 h-4 mr-2" /> Registrar resultado</Button></div>
      </CardContent>
      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-['Playfair_Display']">Confirmar o número {pad(n || 0, rifa.total_numbers)}?</DialogTitle>
            <DialogDescription>O resultado fica público na página da rifa e a rifa passa para "Sorteada".</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmar(false)}>Voltar</Button><Button onClick={registrar}>Confirmar resultado</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
}

/* ───── Configurar ───── */
function AbaConfigurar({ rifa, projetos, atualizar }: { rifa: Rifa; projetos: { id: string; name: string; cover_url: string | null }[]; atualizar: () => void }) {
  const [f, setF] = useState(rifa);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => setF(rifa), [rifa]);
  const set = <K extends keyof Rifa>(k: K, v: Rifa[K]) => setF((x) => ({ ...x, [k]: v }));

  const salvar = async (status?: RifaStatus) => {
    if ((status ?? f.status) === "vendendo" && !f.pix_key?.trim()) return toast.error("Cadastre a chave PIX antes de abrir as vendas.");
    const qtd = Number(f.total_numbers);
    if (!Number.isInteger(qtd) || qtd < 10 || qtd > 10000) return toast.error("A quantidade de números vai de 10 a 10.000.");
    if (qtd < rifa.total_numbers) {
      // Diminuir só pode até o maior número já reservado ou vendido
      const { data: maior } = await db.from("raffle_tickets").select("number").eq("raffle_id", rifa.id).eq("ativo", true)
        .order("number", { ascending: false }).limit(1).maybeSingle();
      const m = (maior as { number: number } | null)?.number ?? 0;
      if (qtd < m) return toast.error(`O número ${pad(m, rifa.total_numbers)} já está reservado ou vendido. A quantidade não pode ficar abaixo de ${m}.`);
    }
    const slug = slugRifa(f.slug || "");
    if (slug.length < 3) return toast.error("O endereço da página precisa de pelo menos 3 letras.");
    setSalvando(true);
    const { error } = await db.from("raffles").update({
      slug, title: f.title, prize: f.prize, prize_items: (f.prize_items ?? []).map((x) => x.trim()).filter(Boolean), prize_value: f.prize_value || null, description: f.description || null, cover_url: f.cover_url || null,
      ticket_price: Number(String(f.ticket_price).replace(",", ".")), total_numbers: Number(f.total_numbers), max_per_order: Number(f.max_per_order),
      pix_key: f.pix_key || null, pix_name: f.pix_name || null, pix_city: f.pix_city || null, whatsapp: f.whatsapp || null,
      draw_date: f.draw_date || null, draw_place: f.draw_place || null, rules: f.rules || null, authorization_note: f.authorization_note || null,
      project_id: f.project_id || null, status: status ?? f.status, updated_at: new Date().toISOString(),
    }).eq("id", rifa.id);
    setSalvando(false);
    if (error) return toast.error(erroAmigavel(error));
    toast.success(status === "vendendo" ? "Vendas abertas. A rifa já aparece no site." : status === "encerrada" ? "Vendas encerradas." : slug !== rifa.slug ? "Rifa salva com o endereço novo. O antigo continua levando para ela." : "Rifa salva.");
    atualizar();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card><CardContent className="p-6 grid gap-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Nome da rifa</Label><Input value={f.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Prêmio (nome curto)</Label><Input value={f.prize} onChange={(e) => set("prize", e.target.value)} /></div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rifa-endereco">Endereço da página</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex flex-1 items-stretch rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
              <span className="hidden sm:flex items-center px-3 text-sm text-muted-foreground bg-muted border-r border-input whitespace-nowrap">{window.location.host}/rifas/</span>
              <input id="rifa-endereco" value={f.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                onBlur={() => set("slug", slugRifa(f.slug || ""))} className="flex-1 min-w-0 h-10 px-3 text-sm bg-transparent outline-none" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            </div>
            <Button type="button" variant="outline" onClick={() => set("slug", slugRifa(f.title))} disabled={!f.title.trim()}>Usar o nome da rifa</Button>
          </div>
          <p className="text-[13px] text-muted-foreground">
            {slugRifa(f.slug || "") !== rifa.slug
              ? <>Depois de salvar, o link passa a ser <strong className="text-foreground break-all">{window.location.host}/rifas/{slugRifa(f.slug || "")}</strong>. Quem abrir o link antigo é levado para o novo.</>
              : <>Só letras sem acento, números e hífen. Se mudar, os links antigos continuam funcionando.</>}
            {(rifa.slugs_antigos?.length ?? 0) > 0 && <> Endereços antigos que ainda abrem esta rifa: {rifa.slugs_antigos!.join(", ")}.</>}
          </p>
        </div>
        <div className="grid sm:grid-cols-[1fr_220px] gap-3">
          <div className="grid gap-2"><Label>O que o prêmio inclui (um item por linha)</Label>
            <p className="text-xs text-muted-foreground -mt-1">Aceita a formatação do WhatsApp: *negrito*, _itálico_ e emojis. Uma linha só em *negrito* vira título de grupo.</p>
            <Textarea rows={10} value={(f.prize_items ?? []).join("\n")} onChange={(e) => set("prize_items", e.target.value.split("\n"))} placeholder={"Corte\nTratamento\nMaquiagem"} /></div>
          <div className="grid gap-2 content-start"><Label>Valor do prêmio (opcional)</Label><Input value={f.prize_value ?? ""} onChange={(e) => set("prize_value", e.target.value)} placeholder="Ex.: Mais de R$ 1.000" /></div>
        </div>
        <div className="grid gap-2"><Label>Explicação para quem compra</Label>
          <p className="text-xs text-muted-foreground -mt-1">Pode colar o texto do WhatsApp: *negrito*, _itálico_, linhas com • viram lista e linha em branco separa parágrafos.</p>
          <Textarea rows={6} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Para que vai o dinheiro, como é o prêmio..." /></div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="grid gap-2"><Label>Preço do número (R$)</Label><Input inputMode="decimal" value={String(f.ticket_price)} onChange={(e) => set("ticket_price", e.target.value as unknown as number)} /></div>
          <div className="grid gap-2"><Label>Quantidade de números</Label><Input type="number" min={10} max={10000} value={f.total_numbers} onChange={(e) => set("total_numbers", Number(e.target.value))} />
            <div className="flex flex-wrap gap-1.5">
              {[100, 500, 1000].map((mais) => (
                <button key={mais} type="button" className="h-8 px-3 rounded-full border text-xs font-medium hover:bg-muted"
                  onClick={() => set("total_numbers", Math.min(10000, Number(f.total_numbers || 0) + mais))}>+{mais}</button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Vai de 1 até esse número. Pode aumentar a qualquer momento; os números já vendidos continuam iguais.</p>
          </div>
          <div className="grid gap-2"><Label>Máximo por pedido</Label><Input type="number" min={1} max={500} value={f.max_per_order} onChange={(e) => set("max_per_order", Number(e.target.value))} /></div>
        </div>
        <div className="rounded-2xl bg-[#fff8e0] p-4 grid gap-3">
          <p className="font-semibold">Pagamento por PIX</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-2"><Label>Chave PIX</Label><Input value={f.pix_key ?? ""} onChange={(e) => set("pix_key", e.target.value)} placeholder="E-mail, CNPJ, +5584999999999 ou chave aleatória" /></div>
            <div className="grid gap-2"><Label>Nome de quem recebe</Label><Input value={f.pix_name ?? ""} onChange={(e) => set("pix_name", e.target.value)} placeholder="LAR DE SEU LUIZ" /></div>
            <div className="grid gap-2"><Label>Cidade</Label><Input value={f.pix_city ?? ""} onChange={(e) => set("pix_city", e.target.value)} /></div>
            <div className="grid gap-2"><Label>WhatsApp para comprovantes</Label><Input value={f.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(84) 99143-2639" /></div>
          </div>
          <p className="text-xs text-muted-foreground">Telefone como chave vai com +55 e DDD. Confira se o nome e a cidade batem com o cadastro da chave no banco.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Data do sorteio</Label><Input type="date" value={f.draw_date ?? ""} onChange={(e) => set("draw_date", e.target.value)} /></div>
          <div className="grid gap-2"><Label>Onde será o sorteio</Label><Input value={f.draw_place ?? ""} onChange={(e) => set("draw_place", e.target.value)} placeholder="Ex.: no Lar, depois da palestra de sábado" /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Ação social ligada (opcional)</Label>
            <select className="flex h-12 w-full rounded-xl border border-input bg-background px-3 text-sm" value={f.project_id ?? ""}
              onChange={(e) => { const p = projetos.find((x) => x.id === e.target.value); setF((x) => ({ ...x, project_id: e.target.value || null, cover_url: x.cover_url || p?.cover_url || null })); }}>
              <option value="">Nenhuma</option>
              {projetos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid gap-2"><Label>Foto (endereço da imagem)</Label><Input value={f.cover_url ?? ""} onChange={(e) => set("cover_url", e.target.value)} placeholder="Usa a foto da ação, se ligada" /></div>
        </div>
        <div className="grid gap-2"><Label>Regras</Label>
          <p className="text-xs text-muted-foreground -mt-1">Mesma formatação do WhatsApp. Linhas com • ou números viram lista.</p>
          <Textarea rows={6} value={f.rules ?? ""} onChange={(e) => set("rules", e.target.value)} placeholder="Regras próprias desta rifa, um parágrafo por regra. O passo a passo (reserva, PIX, sorteio) já aparece sozinho na página." /></div>
        <div className="grid gap-2"><Label>Autorização (aparece na página)</Label><Input value={f.authorization_note ?? ""} onChange={(e) => set("authorization_note", e.target.value)} placeholder="Ex.: Certificado de Autorização SPA/MF nº ..." /></div>
        <div><Button onClick={() => salvar()} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button></div>
      </CardContent></Card>

      <Card className="h-fit"><CardHeader><CardTitle className="font-['Playfair_Display'] text-lg">Situação</CardTitle>
        <CardDescription>{RIFA_STATUS[rifa.status]}</CardDescription></CardHeader>
        <CardContent className="grid gap-2">
          {rifa.status === "rascunho" && <Button onClick={() => salvar("vendendo")} disabled={salvando}>Abrir as vendas</Button>}
          {rifa.status === "vendendo" && <Button variant="outline" onClick={() => salvar("encerrada")} disabled={salvando}>Encerrar as vendas</Button>}
          {rifa.status === "encerrada" && <Button variant="outline" onClick={() => salvar("vendendo")} disabled={salvando}>Reabrir as vendas</Button>}
          {rifa.status === "vendendo" && <Button variant="ghost" onClick={() => salvar("rascunho")} disabled={salvando}>Tirar do site</Button>}
          <p className="text-xs text-muted-foreground mt-2">Rifas em preparação não aparecem no site. Com as vendas encerradas, a página continua no ar, mas ninguém reserva mais números.</p>
        </CardContent>
      </Card>
    </div>
  );
}


/** Só a coordenação das rifas abre esta tela; vendedores são levados para a tela de venda. */
export default function RifaGestao() {
  return <GuardaRifas><RifaGestaoConteudo /></GuardaRifas>;
}
