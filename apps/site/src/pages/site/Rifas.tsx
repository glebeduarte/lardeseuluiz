import { Link } from "react-router-dom";
import { PaginaSite, Secao } from "@/components/inicio/Pagina";
import { dataBR, reais, RIFA_STATUS, useRifasPublicas } from "@/lib/rifas";
import jardim from "@/assets/hero-bg.jpg";
import "@/components/rifa/rifa.css";

// Lista pública das rifas da casa.
export default function Rifas() {
  const { data: rifas = [], isLoading } = useRifasPublicas();
  return (
    <PaginaSite documento="Rifas" titulo="Rifas solidárias"
      intro="Toda a arrecadação vai para as ações sociais e a manutenção do Lar. Escolha seus números, pague pelo PIX e acompanhe o sorteio.">
      <Secao titulo={isLoading ? "Carregando…" : rifas.length ? "Rifas da casa" : "Nenhuma rifa aberta agora"} fundo="papel"
        intro={!isLoading && !rifas.length ? "Quando houver uma rifa nova, ela aparece aqui." : undefined}>
        <ul className="ini-arquivo">
          {rifas.map((r) => {
            const pct = Math.round((r.vendidos / r.total) * 100);
            return (
              <li key={r.slug}>
                <Link to={`/rifas/${r.slug}`} className="ini-arquivo__linha" style={{ gridTemplateColumns: "72px minmax(0,1fr) auto" }}>
                  <img src={r.capa || jardim} alt="" width={72} height={72} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />
                  <span className="ini-arquivo__texto">
                    <strong>{r.titulo}</strong>
                    <em>{r.premio} · {reais(r.preco)} o número{r.data_sorteio ? ` · sorteio em ${dataBR(r.data_sorteio)}` : ""}</em>
                    <span className="rifa-progresso" style={{ marginTop: 10, maxWidth: 360 }}><span style={{ width: `${pct}%` }} /></span>
                  </span>
                  <span className="ini-arquivo__meta"><span className="ini-selo">{RIFA_STATUS[r.status]}</span></span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Secao>
    </PaginaSite>
  );
}
