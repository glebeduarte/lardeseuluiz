import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { reais, useRifasPublicas } from "@/lib/rifas";
import "./popup-rifa.css";

// Aviso da rifa na página inicial. Só aparece enquanto houver rifa vendendo números;
// quem fechar não vê de novo por um dia. Leva direto para a página da rifa.

const IMAGEM_PADRAO = "/imagens/rifa-corrente-de-luz.jpg";
const CHAVE = (slug: string) => `lsl:popup-rifa:${slug}`;
const UM_DIA = 24 * 60 * 60 * 1000;

const fechadoHaPouco = (slug: string) => {
  try { return Date.now() - Number(localStorage.getItem(CHAVE(slug)) || 0) < UM_DIA; } catch { return false; }
};
const lembrarFechado = (slug: string) => {
  try { localStorage.setItem(CHAVE(slug), String(Date.now())); } catch { /* sem armazenamento */ }
};

export default function PopupRifa() {
  const { data: rifas } = useRifasPublicas();
  const rifa = (rifas ?? []).find((r) => r.status === "vendendo");
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!rifa || fechadoHaPouco(rifa.slug)) return;
    const t = setTimeout(() => setAberto(true), 1200);
    return () => clearTimeout(t);
  }, [rifa]);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", esc);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = antes; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  if (!rifa || !aberto) return null;
  const fechar = () => { lembrarFechado(rifa.slug); setAberto(false); };

  return (
    <div className="popup-rifa" role="dialog" aria-modal="true" aria-labelledby="popup-rifa-titulo" onClick={fechar}>
      <div className="popup-rifa__cartao" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="popup-rifa__fechar" onClick={fechar} aria-label="Fechar"><X /></button>
        <div className="popup-rifa__imagem"><img src={rifa.capa || IMAGEM_PADRAO} alt="" /></div>
        <div className="popup-rifa__corpo">
          <span className="popup-rifa__selo">Rifa solidária</span>
          <h2 id="popup-rifa-titulo">{rifa.titulo}</h2>
          <p>Toda a arrecadação vai para os reparos na Casa e para a continuidade das ações do Lar de Seu Luiz.</p>
          <ul className="popup-rifa__dados">
            <li><strong>{reais(rifa.preco)}</strong><span>por número</span></li>
            {rifa.data_sorteio && <li><strong>{rifa.data_sorteio.slice(8, 10)}/{rifa.data_sorteio.slice(5, 7)}</strong><span>sorteio no Lar</span></li>}
          </ul>
          <Link to={`/rifas/${rifa.slug}`} className="popup-rifa__botao" onClick={() => lembrarFechado(rifa.slug)}>Escolher meus números</Link>
          <button type="button" className="popup-rifa__depois" onClick={fechar}>Agora não</button>
        </div>
      </div>
    </div>
  );
}
