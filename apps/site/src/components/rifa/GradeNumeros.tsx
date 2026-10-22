import { useMemo, useState } from "react";
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
  const porPagina = total > 200 ? 100 : total;
  const paginas = Math.ceil(total / porPagina);
  const [pagina, setPagina] = useState(0);
  const inicio = pagina * porPagina + 1;
  const fim = Math.min(total, inicio + porPagina - 1);

  const faixas = useMemo(() => Array.from({ length: paginas }, (_, i) => {
    const a = i * porPagina + 1, b = Math.min(total, a + porPagina - 1);
    let livres = 0;
    for (let n = a; n <= b; n++) if (!ocupados.has(n)) livres++;
    return { a, b, livres };
  }), [paginas, porPagina, total, ocupados]);

  return (
    <div className="rifa-grade">
      {paginas > 1 && (
        <div className="rifa-grade__faixas" role="tablist" aria-label="Faixa de números">
          {faixas.map((f, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === pagina} className={i === pagina ? "ativo" : ""} onClick={() => setPagina(i)}>
              {pad(f.a, total)} a {pad(f.b, total)}<small>{f.livres} livres</small>
            </button>
          ))}
        </div>
      )}
      <div className="rifa-grade__numeros">
        {Array.from({ length: fim - inicio + 1 }, (_, i) => {
          const n = inicio + i;
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
