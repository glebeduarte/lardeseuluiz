import { Fragment, type ReactNode } from "react";

// Mostra texto escrito no jeito do WhatsApp: *negrito*, _itálico_, ~riscado~, linhas com • ou - viram lista,
// linha inteira em *negrito* vira título e linha em branco separa parágrafos. Emojis passam como estão.
// Monta elementos React (sem HTML cru), então o texto nunca vira código na página.

const INVISIVEIS = /[​-‍⁠﻿]/g;
const MARCADOR = /^\s*(?:[•●▪◦\-–*]\s+|\d{1,3}[.)]\s+)/;

/** Aplica negrito, itálico e riscado dentro de uma linha. */
export function inlineWhats(texto: string, chave = "t"): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
  let ultimo = 0, i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    const ini = m.index;
    const antes = texto[ini - 1], depois = texto[ini + m[0].length];
    const dentro = m[0].slice(1, -1);
    // Como no WhatsApp: a marca não pode estar colada em letra/número por fora nem ter espaço por dentro
    // (evita pegar e-mails e @perfis__com_traço)
    if ((antes && /[\p{L}\p{N}_*~]/u.test(antes)) || (depois && /[\p{L}\p{N}]/u.test(depois)) || /^\s|\s$/.test(dentro)) {
      re.lastIndex = ini + 1;
      continue;
    }
    if (ini > ultimo) out.push(texto.slice(ultimo, ini));
    const miolo = m[0].slice(1, -1);
    const filhos = inlineWhats(miolo, `${chave}-${i}`);
    const k = `${chave}-${i++}`;
    if (m[0][0] === "*") out.push(<strong key={k}>{filhos}</strong>);
    else if (m[0][0] === "_") out.push(<em key={k}>{filhos}</em>);
    else out.push(<s key={k}>{filhos}</s>);
    ultimo = ini + m[0].length;
  }
  if (ultimo < texto.length) out.push(texto.slice(ultimo));
  return out;
}

/** Linha inteira em negrito (ex.: "*Para a mesa*" ou "🍰 *Para a mesa*") funciona como título. */
export function ehTitulo(linha: string) {
  const t = linha.replace(INVISIVEIS, "").trim();
  return /^[^\p{L}\p{N}*]*\*[^*]+\*[^\p{L}\p{N}*]*$/u.test(t);
}

/** Tira o marcador de lista do começo da linha ("• ", "- ", "1. "). */
export const semMarcador = (linha: string) => linha.replace(INVISIVEIS, "").replace(MARCADOR, "").trim();

export default function TextoWhats({ texto, className }: { texto: string | null | undefined; className?: string }) {
  const linhas = (texto ?? "").replace(INVISIVEIS, "").replace(/\r/g, "").split("\n");
  const blocos: ReactNode[] = [];
  let lista: string[] = [];
  let paragrafo: string[] = [];
  const fecharLista = () => {
    if (!lista.length) return;
    const k = `l${blocos.length}`;
    blocos.push(<ul key={k} className="texto-whats__lista">{lista.map((l, i) => <li key={i}>{inlineWhats(l, `${k}-${i}`)}</li>)}</ul>);
    lista = [];
  };
  const fecharParagrafo = () => {
    if (!paragrafo.length) return;
    const k = `p${blocos.length}`;
    blocos.push(<p key={k}>{paragrafo.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{inlineWhats(l, `${k}-${i}`)}</Fragment>)}</p>);
    paragrafo = [];
  };
  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (!linha) { fecharLista(); fecharParagrafo(); continue; }
    if (MARCADOR.test(linha) && !ehTitulo(linha)) { fecharParagrafo(); lista.push(semMarcador(linha)); continue; }
    fecharLista();
    if (ehTitulo(linha)) { fecharParagrafo(); blocos.push(<p key={`h${blocos.length}`} className="texto-whats__titulo">{inlineWhats(linha, `h${blocos.length}`)}</p>); continue; }
    paragrafo.push(linha);
  }
  fecharLista(); fecharParagrafo();
  if (!blocos.length) return null;
  return <div className={`texto-whats${className ? ` ${className}` : ""}`}>{blocos}</div>;
}
