import { SiteLayout, Secao } from "@/components/site/SiteLayout";
import { ListaEventos } from "@/components/site/Agenda";
import { hojeISO, useEventos, type Evento } from "@/lib/site";

export default function AgendaPagina() {
  const { data } = useEventos({ desde: hojeISO() });
  const porMes = new Map<string, Evento[]>();
  for (const e of data ?? []) {
    const m = new Date(e.data + "T12:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const mes = m.charAt(0).toUpperCase() + m.slice(1);
    porMes.set(mes, [...(porMes.get(mes) ?? []), e]);
  }

  return (
    <SiteLayout>
      <Secao eyebrow="Agenda" titulo="Palestras e eventos" intro="Programação aberta ao público. Acompanhe também nas redes sociais da casa.">
        {data && porMes.size === 0 && <ListaEventos eventos={[]} vazio="As próximas datas serão publicadas em breve." />}
        {!data && <ListaEventos eventos={undefined} />}
        {[...porMes.entries()].map(([mes, eventos]) => (
          <div key={mes} className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold">{mes}</h2>
            <ListaEventos eventos={eventos} />
          </div>
        ))}
      </Secao>
    </SiteLayout>
  );
}
