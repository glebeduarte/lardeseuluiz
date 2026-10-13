import { useQuery } from "@tanstack/react-query";
import { SiteLayout, Secao } from "@/components/site/SiteLayout";
import { supabase } from "@/lib/supabase";
import { useSiteConfig } from "@/lib/site";

const FINALIDADES = [
  ["Estudo e difusão do Espiritismo", "Promover a pesquisa, a prática e a divulgação dos ensinamentos de Jesus, com base na Codificação de Allan Kardec."],
  ["Formação espiritual e comunicação", "Atividades espiritualistas cristãs voltadas à transformação moral e à valorização do ser humano."],
  ["Despertar da consciência", "Tratamento por meio da autocompreensão, da reforma íntima e do autocuidado espiritual."],
  ["Ação social comunitária", "Atividades educacionais, culturais, de saúde e campanhas para famílias em vulnerabilidade."],
];

const VALORES = [
  ["Ética e transparência", "Relatórios financeiros publicados, assembleias abertas e prestação de contas regular."],
  ["Gratuidade total", "Toda atividade doutrinária, espiritual e social é gratuita."],
  ["Universalidade", "Atendemos a todos, sem distinção de raça, cor, credo ou classe social."],
  ["Independência", "Não nos envolvemos em questões político-partidárias ou alheias à nossa missão."],
];

export default function ACasa() {
  const { data: cfg } = useSiteConfig();
  const secretarias = useQuery({
    queryKey: ["secretarias-publicas"],
    queryFn: async () => {
      const { data } = await supabase.from("areas").select("id, nome, descricao, resumo").eq("tipo", "secretaria").eq("ativa", true).order("ordem");
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      <Secao eyebrow="Transparência institucional" titulo="A instituição"
        intro={`Organização religiosa sem fins lucrativos, fundada em ${cfg?.fundacao ?? "setembro de 2025"}, registrada em cartório, com CNPJ e Estatuto Social aprovado em Assembleia Geral. Nenhum dirigente recebe remuneração: todo recurso é destinado aos objetivos da casa.`}>
        <div className="grid gap-6 md:grid-cols-2">
          {FINALIDADES.map(([t, d], i) => (
            <div key={t} className="flex gap-4">
              <span className="font-display text-2xl text-primary w-8 shrink-0">{["I", "II", "III", "IV"][i]}</span>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">{t}</h2>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Finalidades conforme o Art. 5º do Estatuto Social.</p>
      </Secao>

      <Secao eyebrow="Como trabalhamos" titulo="Nossos valores" tom="card">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALORES.map(([t, d]) => (
            <div key={t} className="flex flex-col gap-2 border-t-2 border-secondary pt-4" style={{ borderRadius: 0 }}>
              <h3 className="font-semibold">{t}</h3>
              <p className="text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao eyebrow="Organização" titulo="Secretarias de trabalho"
        intro="A casa se organiza em secretarias, cada uma com voluntários e uma coordenação.">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {secretarias.data?.map((s) => (
            <li key={s.id} className="rounded-lg border bg-card px-4 py-3 font-medium">{s.nome}</li>
          ))}
        </ul>
      </Secao>

      <Secao eyebrow="Documentos" titulo="Prestação de contas" tom="card"
        intro="Estatuto Social, Ata de Fundação e relatórios financeiros serão publicados aqui com a migração da Governança. Até lá, solicite pelo contato.">
        <span />
      </Secao>
    </SiteLayout>
  );
}
