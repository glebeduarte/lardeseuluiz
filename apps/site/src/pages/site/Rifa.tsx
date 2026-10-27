import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Shuffle, Search, Ticket, Gift, Check, MousePointerClick, UserRound, QrCode, BadgeCheck, Trophy } from "lucide-react";
import { PaginaSite, Secao, ListaSol } from "@/components/inicio/Pagina";
import GradeNumeros, { escolherAoAcaso, type Situacao } from "@/components/rifa/GradeNumeros";
import PixPagamento from "@/components/rifa/PixPagamento";
import { db } from "@/lib/acoes";
import { dataBR, erroAmigavel, pad, PEDIDO_STATUS, reais, useRifaPublica, type Reserva, type RifaPublica } from "@/lib/rifas";
import "@/components/rifa/rifa.css";
import TextoWhats, { ehTitulo, inlineWhats, semMarcador } from "@/components/rifa/TextoWhats";

type Guardada = Reserva & { nome: string; telefone: string; quando: string };
const CHAVE = (slug: string) => `lsl:rifa:${slug}`;
const lerGuardadas = (slug: string): Guardada[] => {
  try { return JSON.parse(localStorage.getItem(CHAVE(slug)) || "[]"); } catch { return []; }
};
const guardar = (slug: string, r: Guardada) => {
  try { localStorage.setItem(CHAVE(slug), JSON.stringify([r, ...lerGuardadas(slug)].slice(0, 10))); } catch { /* sem armazenamento */ }
};
const mascaraTel = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
};

export default function Rifa() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: rifa, isLoading } = useRifaPublica(slug);

  if (isLoading) return <PaginaSite documento="Rifa" titulo="Carregando a rifa…"><div className="ini-secao" /></PaginaSite>;
  if (!rifa) {
    return (
      <PaginaSite documento="Rifa" titulo="Rifa não encontrada" intro="Essa rifa pode ter terminado ou mudado de endereço."
        acoes={<Link to="/rifas" className="ini-botao">Ver as rifas da casa</Link>}><div /></PaginaSite>
    );
  }
  // Endereço antigo: leva para o atual, sem quebrar links já divulgados
  if (rifa.slug !== slug) return <Navigate to={`/rifas/${rifa.slug}`} replace />;
  return <RifaAberta rifa={rifa} />;
}

function RifaAberta({ rifa }: { rifa: RifaPublica }) {
  const qc = useQueryClient();
  const ocupados = useMemo(() => new Map<number, Situacao>(rifa.numeros.map(([n, s]) => [n, s])), [rifa.numeros]);
  const [escolhidos, setEscolhidos] = useState<Set<number>>(new Set());
  const [etapa, setEtapa] = useState<"escolher" | "dados" | "pagar">("escolher");
  const [qtd, setQtd] = useState(1);
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [reserva, setReserva] = useState<Guardada | null>(null);
  const [guardadas, setGuardadas] = useState<Guardada[]>(() => lerGuardadas(rifa.slug));
  const topo = useRef<HTMLDivElement>(null);

  // Se outra pessoa reservou um número escolhido aqui, tira da escolha.
  useEffect(() => {
    setEscolhidos((atual) => {
      const novo = new Set([...atual].filter((n) => !ocupados.has(n)));
      return novo.size === atual.size ? atual : novo;
    });
  }, [ocupados]);

  // Em preparação, só a coordenação vê a página: dá para testar a escolha, mas a reserva só funciona com as vendas abertas.
  const previa = rifa.status === "rascunho";
  const vendendo = rifa.status === "vendendo" || previa;
  const vendidos = rifa.numeros.length;
  const pct = Math.round((vendidos / rifa.total) * 100);
  const lista = [...escolhidos].sort((a, b) => a - b);
  const total = lista.length * Number(rifa.preco);
  const irTopo = () => window.setTimeout(() => topo.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

  const alternar = (n: number) => {
    if (!vendendo) return;
    setEscolhidos((s) => {
      const novo = new Set(s);
      if (novo.has(n)) novo.delete(n);
      else if (novo.size < rifa.max_por_pedido) novo.add(n);
      return novo;
    });
  };
  const aoAcaso = () => {
    const extra = escolherAoAcaso(rifa.total, ocupados, escolhidos, Math.min(qtd, rifa.max_por_pedido - escolhidos.size));
    setEscolhidos((s) => new Set([...s, ...extra]));
  };

  const reservar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const { data, error } = await db.rpc("rifa_reservar", { p_slug: rifa.slug, p_numeros: lista, p_nome: nome, p_telefone: tel });
    setEnviando(false);
    qc.invalidateQueries({ queryKey: ["rifa-publica", rifa.slug] });
    if (error) { setErro(erroAmigavel(error)); return; }
    const r: Guardada = { ...(data as Reserva), nome, telefone: tel, quando: new Date().toISOString() };
    guardar(rifa.slug, r);
    setGuardadas(lerGuardadas(rifa.slug));
    setReserva(r);
    setEscolhidos(new Set());
    setEtapa("pagar");
    irTopo();
  };

  const mensagem = (r: Guardada) =>
    `Olá! Fiz a reserva ${r.codigo} na ${rifa.titulo}, com os números ${r.numeros.map((n) => pad(n, rifa.total)).join(", ")}, no valor de ${reais(r.valor)}. Segue o comprovante do PIX. Nome: ${r.nome}.`;

  return (
    <PaginaSite documento={rifa.titulo} titulo={rifa.titulo} foto={rifa.capa} fotoAlt={rifa.premio}
      intro={<>Cada número custa <strong>{reais(rifa.preco)}</strong>.{rifa.data_sorteio ? ` Sorteio em ${dataBR(rifa.data_sorteio)}${rifa.local_sorteio ? `, ${rifa.local_sorteio}` : ""}.` : " A data do sorteio será divulgada aqui."}</>}
      extra={<CaixaPremio rifa={rifa} />}
      acoes={<>
        {vendendo && <a href="#numeros" className="ini-botao">Escolher meus números</a>}
        <a href="#como-funciona" className="ini-botao ini-botao--claro">Como funciona</a>
      </>}>

      <div ref={topo} />
      {previa && (
        <div className="rifa-previa" role="status">
          <strong>Prévia para a coordenação.</strong> Esta rifa ainda está em preparação e não aparece no site.
          Você pode testar a escolha dos números, mas a reserva só funciona depois de abrir as vendas em Governança › Rifas › Configurar.
        </div>
      )}
      {rifa.status === "sorteada" && rifa.ganhador && (
        <Secao titulo="Resultado do sorteio" fundo="papel">
          <div className="rifa-ganhou">
            <b>{pad(rifa.ganhador.numero, rifa.total)}</b>
            <div>
              <p><strong>Número sorteado: {pad(rifa.ganhador.numero, rifa.total)}</strong></p>
              <p>{rifa.ganhador.nome ? `Parabéns, ${rifa.ganhador.nome}! A coordenação entra em contato para a entrega do prêmio.` : "Este número não tinha sido vendido. A coordenação informa os próximos passos."}</p>
              {rifa.ganhador.data && <p className="ini-pequeno" style={{ color: "#cfe0f5" }}>Sorteio registrado em {dataBR(rifa.ganhador.data)}.</p>}
            </div>
          </div>
        </Secao>
      )}

      {etapa === "pagar" && reserva ? (
        <Secao titulo="Sua reserva está feita" fundo="papel" intro={<>
          <p>Os números ficam guardados no seu nome até a coordenação confirmar o pagamento. Guarde o código da reserva.</p>
          <p style={{ marginTop: 14 }}><span className="rifa-codigo">Código <strong>{reserva.codigo}</strong></span></p>
        </>}>
          <div style={{ display: "grid", gap: 28 }}>
            <div>
              <h3 className="ini-lead" style={{ marginBottom: 12 }}>Seus números</h3>
              <div className="rifa-chips">{reserva.numeros.map((n) => <span key={n}>{pad(n, rifa.total)}</span>)}</div>
            </div>
            <PixPagamento chave={rifa.pix_chave} nome={rifa.pix_nome} cidade={rifa.pix_cidade} valor={Number(reserva.valor)}
              codigo={reserva.codigo} whatsapp={rifa.whatsapp} mensagem={mensagem(reserva)} />
            <div><button type="button" className="ini-botao ini-botao--claro" onClick={() => { setEtapa("escolher"); setReserva(null); }}>Escolher mais números</button></div>
          </div>
        </Secao>
      ) : etapa === "dados" ? (
        <Secao titulo="Para quem são os números?" fundo="papel" estreita
          intro="Usamos seu nome e WhatsApp só para confirmar o pagamento e avisar sobre o sorteio.">
          <form className="rifa-form" onSubmit={reservar} style={{ maxWidth: 560 }}>
            <div>
              <p className="ini-pequeno" style={{ marginBottom: 8 }}>{lista.length} {lista.length === 1 ? "número" : "números"}, total de {reais(total)}</p>
              <div className="rifa-chips">{lista.map((n) => <span key={n}>{pad(n, rifa.total)}</span>)}</div>
            </div>
            <label>Seu nome completo
              <input value={nome} onChange={(e) => setNome(e.target.value)} required minLength={3} autoComplete="name" />
            </label>
            <label>Seu WhatsApp com DDD
              <input value={tel} onChange={(e) => setTel(mascaraTel(e.target.value))} required inputMode="tel" autoComplete="tel" placeholder="(84) 99999-9999" />
              <small>Com ele você também consulta a sua reserva depois.</small>
            </label>
            {erro && <p className="rifa-erro" role="alert">{erro}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button type="submit" className="ini-botao" disabled={enviando}>{enviando ? "Reservando…" : `Reservar e pagar ${reais(total)}`}</button>
              <button type="button" className="ini-botao ini-botao--claro" onClick={() => { setEtapa("escolher"); setErro(null); }}><ArrowLeft size={18} /> Voltar aos números</button>
            </div>
            {rifa.autorizacao && <p className="ini-pequeno">{rifa.autorizacao}</p>}
          </form>
        </Secao>
      ) : (
        <Secao id="numeros" titulo={vendendo ? "Escolha seus números" : "Números da rifa"} fundo="papel"
          intro={<>
            <p>{vendidos} de {rifa.total} números já têm dono ({pct}%). {vendendo ? `Toque nos números livres para escolher. Até ${rifa.max_por_pedido} por pedido.` : rifa.status === "encerrada" ? "As vendas já foram encerradas." : ""}</p>
            <div className="rifa-progresso" style={{ marginTop: 14 }}><span style={{ width: `${pct}%` }} /></div>
          </>}>
          {vendendo && (
            <div className="rifa-acaso">
              <span className="rifa-acaso__qtd">
                <button type="button" onClick={() => setQtd((q) => Math.max(1, q - 1))} aria-label="Menos">−</button>
                <span aria-live="polite">{qtd}</span>
                <button type="button" onClick={() => setQtd((q) => Math.min(rifa.max_por_pedido, q + 1))} aria-label="Mais">+</button>
              </span>
              <button type="button" className="ini-botao ini-botao--claro" onClick={aoAcaso}><Shuffle size={18} /> Escolher {qtd === 1 ? "um número" : `${qtd} números`} para mim</button>
            </div>
          )}
          <GradeNumeros total={rifa.total} ocupados={ocupados} selecionados={escolhidos} aoTocar={alternar}
            destaque={rifa.status === "sorteada" ? rifa.ganhador?.numero : null} />
        </Secao>
      )}

      <ComoFunciona rifa={rifa} />

      <ConsultaReserva rifa={rifa} guardadas={guardadas} mensagem={mensagem} />

      {etapa === "escolher" && lista.length > 0 && (
        <div className="rifa-barra" role="region" aria-label="Números escolhidos">
          <div className="rifa-barra__info">
            <strong>{lista.length} {lista.length === 1 ? "número" : "números"} · {reais(total)}</strong>
            <span>{lista.map((n) => pad(n, rifa.total)).join(", ")}</span>
          </div>
          <button type="button" className="rifa-barra__limpar" onClick={() => setEscolhidos(new Set())}>Limpar</button>
          <button type="button" className="ini-botao" onClick={() => { setEtapa("dados"); irTopo(); }}><Ticket size={18} /> Reservar</button>
        </div>
      )}
    </PaginaSite>
  );
}

function ConsultaReserva({ rifa, guardadas, mensagem }: { rifa: RifaPublica; guardadas: Guardada[]; mensagem: (r: Guardada) => string }) {
  const [codigo, setCodigo] = useState("");
  const [tel, setTel] = useState("");
  const [achada, setAchada] = useState<(Reserva & { nome: string }) | null | undefined>(undefined);
  const [buscando, setBuscando] = useState(false);

  const consultar = async (c: string, t: string) => {
    setBuscando(true);
    const { data } = await db.rpc("rifa_minha_reserva", { p_codigo: c, p_telefone: t });
    setBuscando(false);
    setAchada((data as (Reserva & { nome: string }) | null) ?? null);
  };

  return (
    <Secao id="minha-reserva" titulo="Consultar minha reserva" fundo="teal-claro"
      intro="Digite o código da reserva e o WhatsApp que você informou para ver se o pagamento já foi confirmado.">
      {guardadas.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p className="ini-pequeno" style={{ marginBottom: 8 }}>Reservas feitas neste aparelho:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {guardadas.map((g) => (
              <button key={g.codigo} type="button" className="ini-botao ini-botao--claro" onClick={() => consultar(g.codigo, g.telefone)}>
                {g.codigo} · {g.numeros.length} {g.numeros.length === 1 ? "número" : "números"}
              </button>
            ))}
          </div>
        </div>
      )}
      <form className="rifa-form" style={{ maxWidth: 560 }} onSubmit={(e) => { e.preventDefault(); consultar(codigo, tel); }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <label>Código da reserva<input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="R7XK2P" required /></label>
          <label>WhatsApp<input value={tel} onChange={(e) => setTel(mascaraTel(e.target.value))} inputMode="tel" placeholder="(84) 99999-9999" required /></label>
        </div>
        <div><button type="submit" className="ini-botao" disabled={buscando}><Search size={18} /> {buscando ? "Procurando…" : "Consultar"}</button></div>
      </form>
      {achada === null && <p className="rifa-erro" style={{ marginTop: 16, maxWidth: 560 }}>Não achei uma reserva com esse código e esse WhatsApp. Confira os dois e tente de novo.</p>}
      {achada && (
        <div style={{ marginTop: 20, display: "grid", gap: 12, maxWidth: 680 }}>
          <p className="ini-corpo"><strong>{achada.codigo}</strong>, em nome de {achada.nome}: <strong>{PEDIDO_STATUS[achada.status]}</strong>{achada.status === "pago" ? ". Boa sorte!" : achada.status === "reservado" ? `. Valor: ${reais(achada.valor)}.` : ". Esses números voltaram a ficar livres."}</p>
          <div className={`rifa-chips${achada.status === "pago" ? " rifa-chips--pago" : ""}`}>{(achada.numeros ?? []).map((n) => <span key={n}>{pad(n, rifa.total)}</span>)}</div>
          {achada.status === "reservado" && (
            <PixPagamento chave={rifa.pix_chave} nome={rifa.pix_nome} cidade={rifa.pix_cidade} valor={Number(achada.valor)} codigo={achada.codigo}
              whatsapp={rifa.whatsapp} mensagem={mensagem({ ...achada, telefone: tel, quando: "" })} />
          )}
        </div>
      )}
    </Secao>
  );
}

/* ───── Caixa do prêmio, no cabeçalho ───── */
function CaixaPremio({ rifa }: { rifa: RifaPublica }) {
  const itens = (rifa.itens_premio ?? []).filter(Boolean);
  return (
    <div className="rifa-premio" aria-label="O prêmio">
      <div className="rifa-premio__topo">
        <span className="rifa-premio__icone" aria-hidden="true"><Gift size={20} /></span>
        <span>O prêmio</span>
        {rifa.valor_premio && <span className="rifa-premio__valor">{rifa.valor_premio}</span>}
      </div>
      <strong className="rifa-premio__nome">{rifa.premio}</strong>
      {itens.length > 0 && (
        <ul className="rifa-premio__itens">
          {itens.map((item, n) => ehTitulo(item)
            ? <li key={n} className="rifa-premio__grupo">{inlineWhats(item.trim(), `g${n}`)}</li>
            : <li key={n}><Check size={18} aria-hidden="true" /><span>{inlineWhats(semMarcador(item), `i${n}`)}</span></li>)}
        </ul>
      )}
      <TextoWhats texto={rifa.descricao} className="rifa-premio__texto" />
    </div>
  );
}

/* ───── Como funciona e regras ───── */
function ComoFunciona({ rifa }: { rifa: RifaPublica }) {
  const quando = rifa.data_sorteio ? `em ${dataBR(rifa.data_sorteio)}${rifa.local_sorteio ? `, ${rifa.local_sorteio}` : ""}` : "em data que será divulgada nesta página";
  const passos = [
    { icone: MousePointerClick, titulo: "Escolha seus números", texto: `Cada número custa ${reais(rifa.preco)}. Você pode escolher até ${rifa.max_por_pedido} por pedido, tocando nos números livres ou deixando o sistema escolher para você.` },
    { icone: UserRound, titulo: "Reserve com seu nome e WhatsApp", texto: "Os números ficam guardados no seu nome e você recebe um código de reserva. Guarde esse código." },
    { icone: QrCode, titulo: "Pague pelo PIX", texto: "Use o QR Code ou o PIX copia e cola, que já vem com o valor exato. Depois mande o comprovante pelo WhatsApp, junto com o código da reserva." },
    { icone: BadgeCheck, titulo: "A coordenação confirma", texto: "Quando o PIX é conferido, sua reserva passa para pago. Você acompanha em \"Consultar minha reserva\", aqui embaixo. Reservas que não forem pagas podem ser liberadas para outras pessoas." },
    { icone: Trophy, titulo: "Sorteio presencial", texto: `O sorteio é feito no Lar de Seu Luiz, ${quando}, só entre os números pagos. O resultado sai nesta página e a pessoa sorteada recebe contato pelo WhatsApp.` },
  ];
  const temRegras = !!(rifa.regras ?? "").trim();
  return (
    <Secao id="como-funciona" titulo="Como funciona" fundo="chao"
      intro="Do número escolhido ao sorteio, em cinco passos.">
      <ListaSol colunas={1} itens={passos.map((p, i) => ({ id: p.titulo, marca: <p.icone size={24} />, destaque: i === 0, titulo: p.titulo, texto: p.texto }))} />
      {(temRegras || rifa.autorizacao) && (
        <div className="rifa-regras">
          <h3 className="ini-lead">Regras desta rifa</h3>
          <TextoWhats texto={rifa.regras} className="rifa-regras__texto" />
          <ul>
            <li>Toda a arrecadação vai para o Lar de Seu Luiz, organização religiosa sem fins lucrativos.</li>
            {rifa.autorizacao && <li>{rifa.autorizacao}</li>}
          </ul>
        </div>
      )}
    </Secao>
  );
}
