import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, Check, Clock, Copy, MessageCircle, Plus, QrCode, Shuffle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GradeNumeros, { escolherAoAcaso, type Situacao } from "@/components/rifa/GradeNumeros";
import { db } from "@/lib/acoes";
import { erroAmigavel, linkWhats, mensagemCobranca, pad, pixCopiaECola, reais, useRifaPublica, type Reserva } from "@/lib/rifas";
import "./rifa.css";

// Venda feita por voluntário ou pela coordenação: escolhe os números, anota o comprador e diz se já recebeu.
export default function VendaRapida({ rifaId, slug, total, preco, maximo, coordenacao, aoConcluir }: {
  rifaId: string; slug?: string; total: number; preco: number; maximo: number; coordenacao?: boolean; aoConcluir?: () => void;
}) {
  const qc = useQueryClient();
  const { data: pub } = useRifaPublica(slug ?? undefined);
  const [slugAtual] = useState(slug);
  const ocupados = useMemo(() => new Map<number, Situacao>((pub?.numeros ?? []).map(([n, s]) => [n, s])), [pub]);
  const [escolhidos, setEscolhidos] = useState<Set<number>>(new Set());
  const [digitados, setDigitados] = useState("");
  const [buscar, setBuscar] = useState("");
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  // Como o comprador paga: PIX na hora (QR Code na tela), dinheiro com o vendedor ou depois
  const [forma, setForma] = useState<"pix" | "dinheiro" | "depois">("pix");
  const recebido = forma === "dinheiro";
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState<(Reserva & { nome: string; tel: string }) | null>(null);

  const daDigitacao = digitados.split(/[^0-9]+/).map(Number).filter((n) => n >= 1 && n <= total);
  const lista = [...new Set([...escolhidos, ...daDigitacao])].sort((a, b) => a - b);

  const alternar = (n: number) => setEscolhidos((s) => {
    const novo = new Set(s);
    if (novo.has(n)) novo.delete(n); else if (novo.size < maximo) novo.add(n);
    return novo;
  });

  // Comprador que já sabe o número: digita e adiciona, sem procurar na grade
  const adicionarDigitado = () => {
    const n = Number(buscar.replace(/\D/g, ""));
    if (!n || n < 1 || n > total) return toast.error(`Digite um número de 1 a ${total}.`);
    if (ocupados.has(n)) return toast.error(`O número ${pad(n, total)} já está ${ocupados.get(n) === "p" ? "vendido" : "reservado"}.`);
    if (escolhidos.has(n)) { setBuscar(""); return; }
    if (escolhidos.size >= maximo) return toast.error(`No máximo ${maximo} números por venda.`);
    setEscolhidos((x) => new Set([...x, n]));
    setBuscar("");
  };

  const vender = async () => {
    setEnviando(true);
    const { data, error } = await db.rpc("rifa_vender", { p_raffle: rifaId, p_numeros: lista, p_nome: nome, p_telefone: tel, p_recebido: recebido });
    setEnviando(false);
    qc.invalidateQueries({ queryKey: ["rifa-publica", slugAtual] });
    qc.invalidateQueries({ queryKey: ["minhas-rifas-venda"] });
    if (error) return toast.error(erroAmigavel(error));
    setFeito({ ...(data as Reserva), nome, tel });
    toast.success("Venda registrada.");
  };

  if (feito) {
    const nums = feito.numeros.map((n) => pad(n, total)).join(", ");
    const primeiro = feito.nome.split(" ")[0];
    const msg = feito.status === "pago" || recebido
      ? `Olá, ${primeiro}! Seus números na rifa do Lar de Seu Luiz estão garantidos: ${nums}. Código ${feito.codigo}. Boa sorte!`
      : mensagemCobranca({ nome: feito.nome, codigo: feito.codigo, titulo: pub?.titulo ?? "rifa do Lar de Seu Luiz", numeros: feito.numeros, total, valor: Number(feito.valor),
          chave: pub?.pix_chave ?? null, recebedor: pub?.pix_nome ?? null, cidade: pub?.pix_cidade ?? null, slug: slugAtual });
    const novaVenda = () => { setFeito(null); setEscolhidos(new Set()); setDigitados(""); setNome(""); setTel(""); setForma("pix"); };
    const mostrarPix = forma === "pix" && feito.status !== "pago";
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <div className="rounded-2xl bg-emerald-50 text-emerald-900 p-4">
          <p className="font-semibold">Venda registrada: código {feito.codigo}</p>
          <p className="text-sm">{feito.nome} · {nums} · {reais(feito.valor)}
            {feito.status === "pago" ? " · pago" : recebido ? " · você recebeu, falta repassar à coordenação" : forma === "pix" ? " · aguardando o PIX" : " · vai pagar depois"}</p>
        </div>
        {mostrarPix && (
          <PixVenda chave={pub?.pix_chave ?? null} nome={pub?.pix_nome ?? null} cidade={pub?.pix_cidade ?? null}
            valor={Number(feito.valor)} codigo={feito.codigo} telefone={feito.tel} primeiro={primeiro} nums={nums} titulo={pub?.titulo ?? "rifa do Lar de Seu Luiz"} />
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant={mostrarPix ? "outline" : "default"}><a href={linkWhats(feito.tel, msg)} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4 mr-2" /> Mandar os números ao comprador</a></Button>
          <Button variant="outline" onClick={novaVenda}>Nova venda</Button>
          {aoConcluir && <Button variant="ghost" onClick={aoConcluir}>Fechar</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 min-w-0">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 min-w-0">
        <Label className="text-base">1. Escolha os números</Label>
        {slug ? (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input value={buscar} onChange={(e) => setBuscar(e.target.value)} inputMode="numeric" placeholder="Digite um número, ex.: 1234" className="h-11"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarDigitado(); } }} aria-label="Digitar número" />
              <Button type="button" className="h-11" onClick={adicionarDigitado} disabled={!buscar.trim()}><Plus className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Adicionar</span></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEscolhidos((s) => new Set([...s, ...escolherAoAcaso(total, ocupados, s, 1)]))}><Shuffle className="w-4 h-4 mr-1" /> Um ao acaso</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setEscolhidos((s) => new Set([...s, ...escolherAoAcaso(total, ocupados, s, 5)]))}><Shuffle className="w-4 h-4 mr-1" /> Cinco ao acaso</Button>
            </div>
            <p className="text-[13px] text-muted-foreground">Ou toque nos números livres. Use as faixas para ver outros números.</p>
            <GradeNumeros total={total} ocupados={ocupados} selecionados={escolhidos} aoTocar={alternar} />
          </>
        ) : (
          <Input value={digitados} onChange={(e) => setDigitados(e.target.value)} placeholder="Digite os números separados por vírgula, ex.: 7, 12, 45" />
        )}
      </div>

      {lista.length > 0 && (
        <div className="rounded-2xl bg-[#fff8e0] p-4 space-y-2">
          <p className="text-sm"><strong>{lista.length}</strong> {lista.length === 1 ? "número escolhido" : "números escolhidos"} · <strong>{reais(lista.length * preco)}</strong></p>
          <div className="flex flex-wrap gap-1.5">
            {lista.map((n) => (
              <button key={n} type="button" onClick={() => { setEscolhidos((x) => { const y = new Set(x); y.delete(n); return y; }); }}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-semibold tabular-nums shadow-sm" aria-label={`Tirar ${pad(n, total)}`}>
                {pad(n, total)}<X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <Label className="text-base">2. Dados do comprador</Label>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="grid gap-2" id="vr-comprador"><Label htmlFor="vr-nome">Nome</Label><Input id="vr-nome" value={nome} onChange={(e) => setNome(e.target.value)} className="h-11" autoComplete="off" /></div>
          <div className="grid gap-2"><Label htmlFor="vr-tel">WhatsApp</Label><Input id="vr-tel" value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" placeholder="(84) 99999-9999" className="h-11" autoComplete="off" /></div>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <Label className="text-base">3. Pagamento</Label>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Forma de pagamento">
          {([
            ["pix", "PIX agora", QrCode],
            ["dinheiro", "Dinheiro comigo", Banknote],
            ["depois", "Paga depois", Clock],
          ] as const).map(([v, r, Icone]) => (
            <button key={v} type="button" role="radio" aria-checked={forma === v} onClick={() => setForma(v)}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 text-[13px] font-semibold leading-tight text-center border-2 transition-colors ${forma === v ? "border-[#0059b1] bg-[#e3eefb] text-[#003c7f]" : "border-transparent bg-muted/60 text-foreground"}`}>
              <Icone className="w-5 h-5" />{r}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground">
          {forma === "pix" ? "Depois de registrar, aparece o QR Code do PIX com o valor e o código da venda para o comprador pagar na hora."
            : forma === "dinheiro" ? (coordenacao ? "O pedido entra como pago." : "Fica marcado como recebido por você, até a coordenação confirmar o repasse.")
            : "Os números ficam reservados e o comprador recebe o PIX pelo WhatsApp para pagar depois."}
        </p>
      </div>
      <Button className="h-12 w-full sm:w-auto sm:justify-self-start" onClick={vender} disabled={enviando || lista.length === 0 || nome.trim().length < 3 || tel.replace(/\D/g, "").length < 10}>
        <Check className="w-4 h-4 mr-2" /> {enviando ? "Registrando..." : `Registrar venda${lista.length ? ` de ${reais(lista.length * preco)}` : ""}`}
      </Button>
      {lista.length > 0 && (nome.trim().length < 3 || tel.replace(/\D/g, "").length < 10) && (
        <p className="text-[13px] text-muted-foreground -mt-3">Preencha o nome e o WhatsApp do comprador para registrar.</p>
      )}

      {/* Celular: resumo fixo embaixo enquanto escolhe os números */}
      {lista.length > 0 && (
        <>
          <div className="h-20 sm:hidden" aria-hidden="true" />
          <div className="rifa-barra-venda sm:hidden fixed inset-x-0 bottom-0 z-[46] bg-white border-t border-border shadow-[0_-6px_24px_rgba(15,31,61,.12)] px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold tabular-nums">{lista.length} {lista.length === 1 ? "número" : "números"} · {reais(lista.length * preco)}</div>
              <div className="text-[12px] text-muted-foreground truncate tabular-nums">{lista.map((n) => pad(n, total)).join(", ")}</div>
            </div>
            {nome.trim().length >= 3 && tel.replace(/\D/g, "").length >= 10 ? (
              <Button className="h-12 px-5" onClick={vender} disabled={enviando}><Check className="w-4 h-4 mr-1" />{enviando ? "..." : "Registrar"}</Button>
            ) : (
              <Button className="h-12 px-5" onClick={() => { document.getElementById("vr-comprador")?.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => document.getElementById("vr-nome")?.focus(), 350); }}>Comprador</Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** QR Code do PIX para o comprador pagar na hora, lendo a tela do vendedor. O código da venda vai no PIX. */
export function PixVenda({ chave, nome, cidade, valor, codigo, telefone, primeiro, nums, titulo }: {
  chave: string | null; nome: string | null; cidade: string | null; valor: number; codigo: string; telefone: string; primeiro: string; nums: string; titulo: string;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const codigoPix = chave ? pixCopiaECola({ chave, nome: nome || "LAR DE SEU LUIZ", cidade: cidade || "NISIA FLORESTA", valor, identificador: codigo }) : null;
  useEffect(() => {
    if (!codigoPix) return;
    QRCode.toDataURL(codigoPix, { margin: 1, width: 520, color: { dark: "#0f1f3d", light: "#ffffff" } }).then(setQr).catch(() => setQr(null));
  }, [codigoPix]);
  if (!codigoPix) return <p className="text-sm rounded-2xl bg-amber-50 text-amber-900 p-4">A chave PIX da rifa ainda não foi cadastrada. Peça para a coordenação preencher em Configurar.</p>;
  const copiar = async () => {
    try { await navigator.clipboard.writeText(codigoPix); toast.success("Código PIX copiado."); } catch { toast.error("Não consegui copiar."); }
  };
  const mensagem = `Olá, ${primeiro}! Para pagar seus números (${nums}) da ${titulo}, use o PIX copia e cola abaixo. O valor é ${reais(valor)}.\n\n${codigoPix}`;
  return (
    <div className="rounded-3xl border-2 border-[#ffc116] bg-white p-4 sm:p-5 grid gap-3 justify-items-center text-center">
      <p className="text-sm font-semibold text-[#7a5200] uppercase tracking-wide">Mostre para o comprador ler</p>
      <div className="w-full max-w-[280px] aspect-square rounded-2xl bg-white p-2 shadow-[inset_0_0_0_2px_#e3eaf3] grid place-items-center">
        {qr ? <img src={qr} alt="QR Code do PIX" className="w-full h-auto" /> : <span className="text-sm text-muted-foreground">Gerando QR Code…</span>}
      </div>
      <p className="font-['Playfair_Display'] text-4xl font-bold text-[#003c7f] tabular-nums leading-none">{reais(valor)}</p>
      <p className="text-[13px] text-muted-foreground">Código da venda <strong className="text-foreground">{codigo}</strong>. Ele vai junto no PIX, para a coordenação achar o pagamento.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        <Button variant="outline" className="h-11" onClick={copiar}><Copy className="w-4 h-4 mr-2" /> Copiar PIX</Button>
        <Button asChild className="h-11"><a href={linkWhats(telefone, mensagem)} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4 mr-2" /> Mandar PIX no WhatsApp</a></Button>
      </div>
    </div>
  );
}
