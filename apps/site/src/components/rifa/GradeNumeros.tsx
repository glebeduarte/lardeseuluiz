import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pad } from "@/lib/rifas";
import "./rifa.css";

export type Situacao = "r" | "p";

// Grade de números da rifa. Em rifas grandes, mostra de 100 em 100 com abas de faixa.
export default function GradeNumeros({ total, ocupados, selecionados, aoTocar, destaque, rotuloOcupado }: {
  total: number;
  ocupados: Map<number, Situacao>;
  selecionados?: Set<number>;
  aoTocar: (n: number) => void;
  /** Número ganhador, quando a rifa já foi sorteada. */
  destaque?: number | null;
  /** No modo de gestão, números ocupados também são clicáveis (para ver o pedido). */
  rotuloOcupado?: boolean;
}) {
  // Para quem compra, os números ocupados ficam ocultos por padrão: aparecem primeiro os disponíveis.
  // Na gestão (rotuloOcupado), a grade mostra tudo.
  const [mostrarOcupados, setMostrarOcupados] = useState(!!rotuloOcupado);
  const visiveis = useMemo(() => {
    const out: number[] = [];
    for (let n = 1; n <= total; n++) {
      if (mostrarOcupados || !ocupados.has(n) || selecionados?.has(n) || n === destaque) out.push(n);
    }
    return out;
  }, [total, ocupados, selecionados, destaque, mostrarOcupados]);
  const qtdOcupados = ocupados.size;

  const porPagina = visiveis.length > 200 ? 100 : Math.max(1, visiveis.length);
  const paginas = Math.max(1, Math.ceil(visiveis.length / porPagina));
  const [pagina, setPagina] = useState(0);
  useEffect(() => { if (pagina > paginas - 1) setPagina(Math.max(0, paginas - 1)); }, [pagina, paginas]);
  const naPagina = visiveis.slice(pagina * porPagina, (pagina + 1) * porPagina);

  const faixas = useMemo(() => Array.from({ length: paginas }, (_, i) => {
    const fatia = visiveis.slice(i * porPagina, (i + 1) * porPagina);
    const livres = fatia.filter((n) => !ocupados.has(n)).length;
    return { a: fatia[0] ?? 1, b: fatia[fatia.length - 1] ?? 1, livres };
  }), [paginas, porPagina, visiveis, ocupados]);

  // Faixas: setas, arrastar com o mouse e rolar com a roda; a faixa escolhida fica sempre à vista
  const trilho = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ x: number; inicio: number; moveu: boolean } | null>(null);
  useEffect(() => {
    const t = trilho.current;
    const el = t?.querySelector<HTMLElement>(`[data-faixa="${pagina}"]`);
    // Rola só o trilho das faixas (sem mexer na rolagem da página)
    if (t && el) t.scrollTo({ left: el.offsetLeft - (t.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [pagina]);
  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const roda = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) { el.scrollLeft += e.deltaY; e.preventDefault(); }
    };
    el.addEventListener("wheel", roda, { passive: false });
    return () => el.removeEventListener("wheel", roda);
  }, [paginas]);

  return (
    <div className="rifa-grade">
      {!rotuloOcupado && qtdOcupados > 0 && (
        <label className="rifa-grade__mostrar">
          <input type="checkbox" checked={mostrarOcupados} onChange={(e) => { setMostrarOcupados(e.target.checked); setPagina(0); }} />
          <span>Mostrar os números já vendidos ou reservados ({qtdOcupados})</span>
        </label>
      )}
      {paginas > 1 && (
        <div className="rifa-grade__navegar">
          <button type="button" className="rifa-grade__seta" onClick={() => setPagina((p) => Math.max(0, p - 1))} disabled={pagina === 0} aria-label="Faixa anterior"><ChevronLeft /></button>
          <div ref={trilho} className="rifa-grade__faixas" role="tablist" aria-label="Faixa de números"
            onPointerDown={(e) => { if (e.pointerType !== "mouse") return; arrasto.current = { x: e.clientX, inicio: trilho.current!.scrollLeft, moveu: false }; }}
            onPointerMove={(e) => {
              const a = arrasto.current; if (!a || !trilho.current) return;
              const dx = e.clientX - a.x;
              if (Math.abs(dx) > 4) { a.moveu = true; trilho.current.classList.add("arrastando"); }
              trilho.current.scrollLeft = a.inicio - dx;
            }}
            onPointerUp={() => { setTimeout(() => { arrasto.current = null; }, 0); trilho.current?.classList.remove("arrastando"); }}
            onPointerLeave={() => { arrasto.current = null; trilho.current?.classList.remove("arrastando"); }}
            onClickCapture={(e) => { if (arrasto.current?.moveu) { e.stopPropagation(); e.preventDefault(); } }}>
            {faixas.map((f, i) => (
              <button key={i} type="button" role="tab" data-faixa={i} aria-selected={i === pagina} className={i === pagina ? "ativo" : ""} onClick={() => setPagina(i)}>
                {pad(f.a, total)} a {pad(f.b, total)}<small>{f.livres} livres</small>
              </button>
            ))}
          </div>
          <button type="button" className="rifa-grade__seta" onClick={() => setPagina((p) => Math.min(paginas - 1, p + 1))} disabled={pagina === paginas - 1} aria-label="Próxima faixa"><ChevronRight /></button>
        </div>
      )}
      <div className="rifa-grade__numeros">
        {naPagina.length === 0 && <p className="rifa-grade__vazio">Todos os números já foram vendidos ou reservados.</p>}
        {naPagina.map((n) => {
          const s = ocupados.get(n);
          const escolhido = selecionados?.has(n);
          const classe = n === destaque ? "ganhador" : escolhido ? "escolhido" : s === "p" ? "vendido" : s === "r" ? "reservado" : "livre";
          const desativado = !!s && !rotuloOcupado;
          const titulo = n === destaque ? "Número sorteado" : s === "p" ? "Vendido" : s === "r" ? "Reservado" : escolhido ? "Escolhido por você" : "Livre";
          return (
            <button key={n} type="button" className={`rifa-num rifa-num--${classe}`} disabled={desativado}
              aria-pressed={escolhido} aria-label={`Número ${pad(n, total)}: ${titulo}`} title={titulo} onClick={() => aoTocar(n)}>
              {pad(n, total)}
            </button>
          );
        })}
      </div>
      <div className="rifa-grade__legenda" aria-hidden="true">
        <span><i className="rifa-num--livre" />Livre</span>
        <span><i className="rifa-num--escolhido" />Escolhido</span>
        <span><i className="rifa-num--reservado" />Reservado</span>
        <span><i className="rifa-num--vendido" />Vendido</span>
      </div>
    </div>
  );
}

/** Sorteia, entre os livres, a quantidade pedida (para quem não quer escolher um por um). */
export function escolherAoAcaso(total: number, ocupados: Map<number, Situacao>, ja: Set<number>, quantos: number) {
  const livres: number[] = [];
  for (let n = 1; n <= total; n++) if (!ocupados.has(n) && !ja.has(n)) livres.push(n);
  const out: number[] = [];
  while (out.length < quantos && livres.length) out.push(livres.splice(Math.floor(Math.random() * livres.length), 1)[0]);
  return out;
}
