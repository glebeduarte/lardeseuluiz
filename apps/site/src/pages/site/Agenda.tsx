import { motion } from "framer-motion";
import SitePage from "@/components/site/SitePage";
import { hojeISO, MESES, MESES_LONGOS, usePalestras, useEventosSite } from "@/lib/site-dados";

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 24 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true, margin: "-40px" as const },
  transition: { duration: 0.6, delay },
});

const corDoDia = (dia: string) =>
  /sex/i.test(dia)
    ? { bg: "hsl(var(--secondary-muted))", dia: "hsl(var(--secondary))", mes: "hsl(var(--secondary-light))" }
    : /s[áa]b/i.test(dia)
      ? { bg: "hsl(var(--accent-muted))", dia: "hsl(var(--accent-dark))", mes: "hsl(var(--accent-dark))" }
      : { bg: "hsl(var(--primary-muted))", dia: "hsl(var(--primary))", mes: "hsl(var(--primary-light))" };

type Item = { id: string; data: string; titulo: string; meta: string; dia: string };

const Agenda = () => {
  const hoje = hojeISO();
  const { data: palestras = [], isLoading } = usePalestras({ desde: hoje });
  const { data: eventos = [] } = useEventosSite(hoje);

  const itens: Item[] = [
    ...palestras.map((p) => ({
      id: p.id, data: p.data, dia: p.dia_semana, titulo: p.tema,
      meta: ["Palestra", p.hora !== "-" ? p.hora : null, p.palestrante !== "-" ? p.palestrante : null].filter(Boolean).join(" • "),
    })),
    ...eventos.map((e) => ({
      id: e.id, data: e.event_date, dia: new Date(e.event_date + "T12:00").toLocaleDateString("pt-BR", { weekday: "short" }),
      titulo: e.title, meta: [e.start_time, e.speaker, e.location].filter(Boolean).join(" • "),
    })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  const porMes = itens.reduce<Record<string, Item[]>>((acc, it) => {
    const chave = it.data.slice(0, 7);
    (acc[chave] ??= []).push(it);
    return acc;
  }, {});

  return (
    <SitePage documento="Agenda" tag="Programação" titulo="Agenda de palestras e eventos"
      intro="Palestras públicas e eventos da casa. Todas as atividades são gratuitas e abertas a todos.">
      <section className="site-programacao">
        <div className="site-programacao__inner">
          {isLoading && <p className="site-palestra__meta">Carregando a agenda…</p>}
          {!isLoading && itens.length === 0 && (
            <div className="site-prog-palestras"><p className="site-palestra__meta">As próximas datas serão publicadas em breve.</p></div>
          )}
          {Object.entries(porMes).map(([chave, lista], i) => {
            const [ano, mes] = chave.split("-");
            return (
              <motion.div key={chave} className="pg-mes" {...reveal(i * 0.05)}>
                <div className="site-prog-palestras">
                  <div className="site-prog-palestras__title">🎤 {MESES_LONGOS[Number(mes) - 1]} de {ano}</div>
                  <div className="site-palestras-grid">
                    {lista.map((it) => {
                      const c = corDoDia(it.dia);
                      return (
                        <div key={it.id} className="site-palestra-item">
                          <div className="site-palestra-date" style={{ background: c.bg }}>
                            <div className="site-palestra-date__day" style={{ color: c.dia }}>{it.data.slice(8, 10)}</div>
                            <div className="site-palestra-date__mon" style={{ color: c.mes }}>{MESES[Number(mes) - 1]}</div>
                          </div>
                          <div>
                            <div className="site-palestra__title">{it.titulo}</div>
                            <div className="site-palestra__meta">{it.meta}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </SitePage>
  );
};

export default Agenda;
