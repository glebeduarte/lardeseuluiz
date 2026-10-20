import { Link } from "react-router-dom";
import { PaginaSite, Secao, ListaSol, ConviteFinal } from "@/components/inicio/Pagina";
import { SEMANA, diaDeHojeNoLar } from "@/components/inicio/agenda-casa";
import { hojeISO, MESES, MESES_LONGOS, usePalestras, useEventosSite } from "@/lib/site-dados";

type Item = { id: string; data: string; titulo: string; meta: string; hora: string | null };

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const horaBonita = (h?: string | null) => {
  if (!h || h === "-") return null;
  const m = h.match(/(\d{1,2})\D?(\d{2})?/);
  return m ? `${Number(m[1])}h${m[2] && m[2] !== "00" ? m[2] : ""}` : h;
};

const Agenda = () => {
  const hoje = hojeISO();
  const { data: palestras = [], isLoading } = usePalestras({ desde: hoje });
  const { data: eventos = [] } = useEventosSite(hoje);
  const diaHoje = diaDeHojeNoLar();

  const itens: Item[] = [
    ...palestras.map((p) => ({
      id: p.id, data: p.data, titulo: p.tema, hora: horaBonita(p.hora),
      meta: ["Palestra", p.palestrante !== "-" ? `com ${p.palestrante}` : null].filter(Boolean).join(" "),
    })),
    ...eventos.map((e) => ({
      id: e.id, data: e.event_date, titulo: e.title, hora: horaBonita(e.start_time),
      meta: [e.speaker ? `com ${e.speaker}` : null, e.location].filter(Boolean).join(", ") || "Evento da casa",
    })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  const porMes = itens.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.data.slice(0, 7)] ??= []).push(it);
    return acc;
  }, {});

  return (
    <PaginaSite documento="Agenda" titulo="Agenda da casa"
      intro="Palestras públicas, eventos e os trabalhos de cada semana. Tudo é gratuito e aberto a todos."
      acoes={<Link to="/atendimentos" className="ini-botao">Como funciona o atendimento</Link>}>

      {isLoading && <Secao titulo="Carregando a agenda" />}
      {!isLoading && itens.length === 0 && (
        <Secao titulo="Próximas datas" intro="As próximas palestras e eventos serão publicados em breve." />
      )}
      {Object.entries(porMes).map(([chave, lista], i) => {
        const [ano, mes] = chave.split("-");
        return (
          <Secao key={chave} titulo={`${MESES_LONGOS[Number(mes) - 1]} de ${ano}`} fundo={i % 2 ? "chao" : "papel"}
            intro={`${lista.length} ${lista.length === 1 ? "encontro marcado" : "encontros marcados"}.`}>
            <ListaSol itens={lista.map((it) => {
              const d = new Date(`${it.data}T12:00:00`);
              return {
                id: it.id, destaque: it.data === hoje,
                marca: <><b>{it.data.slice(8, 10)}</b>{MESES[Number(mes) - 1]}</>,
                titulo: it.titulo, lado: it.hora ?? undefined,
                texto: `${it.data === hoje ? "Hoje" : DIAS[d.getDay()].replace(/^./, (c) => c.toUpperCase())}, ${d.getDate()} de ${MESES_LONGOS[d.getMonth()].toLowerCase()}. ${it.meta}.`,
              };
            })} />
          </Secao>
        );
      })}

      <Secao titulo="Toda semana" fundo="teal-claro" intro="Os trabalhos que acontecem sempre, mesmo sem palestra marcada.">
        <ListaSol itens={SEMANA.map((t) => ({
          id: t.id, destaque: t.dia === diaHoje, marca: t.rotuloDia.slice(0, 3),
          titulo: t.nome, lado: t.horario, texto: `${t.rotuloDia}. ${t.descricao}`,
        }))} />
      </Secao>

      <ConviteFinal foto="/imagens/saude-lar-event.jpg" fotoAlt="Voluntárias atendendo na ação Saúde no Lar" titulo="Venha num dia de trabalho" texto="Não precisa marcar. O atendimento começa pelo Diálogo Fraterno, por ordem de chegada."
        botao="Ver como chegar" para="/#visite" />
    </PaginaSite>
  );
};

export default Agenda;
