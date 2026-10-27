import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Maximize2, Trophy } from "lucide-react";
import { db, useNomesPessoas } from "@/lib/acoes";
import { erroAmigavel, pad, type Pedido, type Rifa } from "@/lib/rifas";
import logo from "@/compartilhado/logo-lsl.png";
import "@/components/rifa/rifa-sorteio.css";
import GuardaRifas from "@/components/rifa/GuardaRifas";

// Tela do sorteio, para projetar na casa: mostra quem vendeu, quantos números concorrem
// e faz o sorteio pela ferramenta (o número é escolhido ao acaso no banco, entre os pagos).

type Resultado = { numero: number; comprador: string | null; vendedor: string | null; canal: string | null; concorrendo?: number };

const nomeCurto = (nome?: string | null) => {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 2) return partes.join(" ");
  return `${partes[0]} ${partes[partes.length - 1]}`;
};

function RifaTelaSorteioConteudo() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["rifa-tela-sorteio", id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: rifa, error }, { data: pedidos }, { data: vendedores }] = await Promise.all([
        db.from("raffles").select("*").eq("id", id).maybeSingle(),
        db.from("raffle_orders").select("*, raffle_tickets(number, ativo)").eq("raffle_id", id),
        db.from("raffle_sellers").select("person_id").eq("raffle_id", id),
      ]);
      if (error) throw error;
      return { rifa: rifa as Rifa | null, pedidos: (pedidos ?? []) as Pedido[], vendedores: (vendedores ?? []) as { person_id: string }[] };
    },
  });
  const nomesQ = useNomesPessoas([...(data?.vendedores ?? []).map((v) => v.person_id), ...(data?.pedidos ?? []).map((p) => p.seller_person_id)]);
  const nomes = nomesQ.data ?? {};

  const [fase, setFase] = useState<"pronto" | "confirmar" | "girando" | "resultado">("pronto");
  const [mostrando, setMostrando] = useState<number | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const rifa = data?.rifa;
  const pedidos = data?.pedidos ?? [];
  const pagos = useMemo(() => pedidos.filter((p) => p.status === "pago")
    .flatMap((p) => (p.raffle_tickets ?? []).filter((t) => t.ativo).map((t) => t.number)).sort((a, b) => a - b), [pedidos]);
  const pendentes = pedidos.filter((p) => p.status === "reservado").length;

  // Quem vendeu: cada vendedora com os números pagos que vendeu, mais o que veio pelo site
  const porVendedor = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of data?.vendedores ?? []) m.set(v.person_id, 0);
    let site = 0;
    for (const p of pedidos) {
      if (p.status !== "pago") continue;
      const q = (p.raffle_tickets ?? []).filter((t) => t.ativo).length;
      if (p.seller_person_id) m.set(p.seller_person_id, (m.get(p.seller_person_id) ?? 0) + q);
      else site += q;
    }
    const lista = [...m.entries()].map(([pid, q]) => ({ nome: nomes[pid]?.full_name ?? "", q }))
      .filter((x) => x.nome).sort((a, b) => b.q - a.q || a.nome.localeCompare(b.nome));
    return { lista, site };
  }, [data?.vendedores, pedidos, nomes]);

  // Resultado já registrado (abrir a tela depois do sorteio)
  const jaSorteado: Resultado | null = useMemo(() => {
    if (!rifa || rifa.status !== "sorteada" || rifa.winner_number == null) return null;
    const p = pedidos.find((x) => x.id === rifa.winner_order_id);
    return { numero: rifa.winner_number, comprador: p?.buyer_name ?? null, canal: p?.channel ?? null,
      vendedor: p?.seller_person_id ? nomes[p.seller_person_id]?.full_name ?? null : null };
  }, [rifa, pedidos, nomes]);

  const sortear = async () => {
    if (!rifa) return;
    setErro(null);
    setFase("girando");
    const { data: r, error } = await db.rpc("rifa_sortear", { p_raffle: rifa.id, p_notas: null });
    if (error) { setErro(erroAmigavel(error)); setFase("pronto"); return; }
    const res = r as Resultado;
    const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const fim = () => { setMostrando(res.numero); setResultado(res); setFase("resultado"); qc.invalidateQueries({ queryKey: ["rifa-gestao", id] }); };
    if (reduzir || pagos.length < 2) return fim();
    // Os números passam rápido e vão desacelerando até parar no sorteado
    let passo = 0;
    const total = 34;
    const girar = () => {
      passo++;
      if (passo >= total) return fim();
      setMostrando(pagos[Math.floor(Math.random() * pagos.length)]);
      timer.current = window.setTimeout(girar, 50 + Math.pow(passo / total, 3) * 420);
    };
    girar();
  };

  const telaCheia = () => { document.documentElement.requestFullscreen?.().catch(() => undefined); };

  if (isLoading) return <div className="sorteio"><p className="sorteio__aviso">Carregando...</p></div>;
  if (!rifa) return <div className="sorteio"><p className="sorteio__aviso">Rifa não encontrada.</p></div>;

  const final = resultado ?? (fase === "pronto" ? jaSorteado : null);
  const numeroNaTela = fase === "girando" ? mostrando : final?.numero ?? null;

  return (
    <div className="sorteio">
      <header className="sorteio__topo">
        <img src={logo} alt="Lar de Seu Luiz" className="sorteio__logo" />
        <div className="sorteio__titulo">
          <h1>{rifa.title}</h1>
          <p>Prêmio: {rifa.prize}</p>
        </div>
        <div className="sorteio__acoes">
          <button type="button" onClick={telaCheia} aria-label="Tela cheia" title="Tela cheia"><Maximize2 /></button>
          <Link to={`/app/rifas/${rifa.id}?aba=sorteio`} aria-label="Voltar para a gestão" title="Voltar"><ArrowLeft /></Link>
        </div>
      </header>

      <main className="sorteio__palco">
        <section className="sorteio__centro" aria-live="polite">
          {numeroNaTela == null ? (
            <>
              <p className="sorteio__rotulo">Concorrem</p>
              <p className="sorteio__concorrem">{pagos.length} <span>{pagos.length === 1 ? "número pago" : "números pagos"}</span></p>
            </>
          ) : (
            <>
              <p className="sorteio__rotulo">{fase === "girando" ? "Sorteando" : "Número sorteado"}</p>
              <p className={`sorteio__numero${fase === "girando" ? " sorteio__numero--girando" : ""}`}>{pad(numeroNaTela, rifa.total_numbers)}</p>
              {fase !== "girando" && final && (
                <div className="sorteio__ganhador">
                  <p className="sorteio__nome">{final.comprador ? nomeCurto(final.comprador) : "Número sem pedido pago"}</p>
                  {final.comprador && <p className="sorteio__vendido">{final.vendedor ? `Vendido por ${final.vendedor}` : "Comprado pelo site"}</p>}
                </div>
              )}
            </>
          )}

          {rifa.status !== "sorteada" && fase === "pronto" && (
            <div className="sorteio__comando">
              {pendentes > 0 && <p className="sorteio__alerta">{pendentes} {pendentes === 1 ? "pedido ainda espera" : "pedidos ainda esperam"} PIX e {pendentes === 1 ? "fica" : "ficam"} de fora. Confirme ou libere antes de sortear.</p>}
              {erro && <p className="sorteio__alerta">{erro}</p>}
              <button type="button" className="sorteio__botao" disabled={pagos.length === 0} onClick={() => setFase("confirmar")}>
                <Trophy /> Sortear agora
              </button>
            </div>
          )}
          {fase === "confirmar" && (
            <div className="sorteio__comando">
              <p className="sorteio__confirma">O número sai entre os {pagos.length} pagos e o resultado fica registrado. Não dá para sortear de novo.</p>
              <div className="sorteio__duplo">
                <button type="button" className="sorteio__botao sorteio__botao--sec" onClick={() => setFase("pronto")}>Voltar</button>
                <button type="button" className="sorteio__botao" onClick={sortear}><Trophy /> Confirmar e sortear</button>
              </div>
            </div>
          )}
        </section>

        <aside className="sorteio__vendedores">
          <h2>Quem vendeu</h2>
          {porVendedor.lista.length === 0 && porVendedor.site === 0 ? (
            <p className="sorteio__vazio">Nenhum número pago ainda.</p>
          ) : (
            <ul>
              {porVendedor.lista.map((v) => (
                <li key={v.nome} className={final?.vendedor === v.nome && fase !== "girando" ? "destaque" : ""}>
                  <span>{v.nome}</span><b>{v.q}</b>
                </li>
              ))}
              {porVendedor.site > 0 && (
                <li className={final && !final.vendedor && final.comprador && fase !== "girando" ? "destaque" : ""}><span>Pelo site</span><b>{porVendedor.site}</b></li>
              )}
            </ul>
          )}
          <p className="sorteio__obrigado">Obrigado a cada pessoa que vendeu e comprou. Toda a arrecadação vai para o Lar de Seu Luiz.</p>
        </aside>
      </main>
    </div>
  );
}


/** Só a coordenação das rifas abre esta tela; vendedores são levados para a tela de venda. */
export default function RifaTelaSorteio() {
  return <GuardaRifas><RifaTelaSorteioConteudo /></GuardaRifas>;
}
