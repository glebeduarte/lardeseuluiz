import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, ArrowUpRight } from "lucide-react";
import { PaginaSite, Secao, ListaSol, ConviteFinal, surgir } from "@/components/inicio/Pagina";
import { supabase } from "@/integrations/supabase/client";

const finalidades = [
  { titulo: "Estudo e difusão do Espiritismo", texto: "Promover a pesquisa, a prática e a divulgação dos ensinamentos de Jesus, com base na Codificação de Allan Kardec." },
  { titulo: "Formação espiritual e comunicação", texto: "Atividades espiritualistas cristãs que buscam a transformação moral da humanidade e a valorização do ser humano." },
  { titulo: "Despertar da consciência", texto: "Tratamento por meio da autocompreensão, da reforma íntima e do autocuidado espiritual." },
  { titulo: "Ação social comunitária", texto: "Atividades educacionais, culturais, de saúde e campanhas para famílias em vulnerabilidade, inspiradas na caridade cristã." },
];

const valores = [
  { titulo: "Ética e transparência", texto: "Relatórios financeiros publicados, assembleias abertas e prestação de contas regular." },
  { titulo: "Gratuidade total", texto: "Toda atividade doutrinária, espiritual e social é gratuita, como pede o princípio espírita." },
  { titulo: "Universalidade", texto: "Atendemos a todos, sem distinção de raça, cor, credo ou classe social." },
  { titulo: "Fé racional", texto: "Estudo baseado no tríplice aspecto do Espiritismo: ciência, filosofia e religião." },
  { titulo: "Evolução contínua", texto: "O aperfeiçoamento moral como caminho para a paz individual e coletiva." },
  { titulo: "Independência", texto: "Preservamos nossa independência administrativa e nossa missão espiritual." },
];

type Sec = { id: string; name: string; description: string | null };

// As secretarias em volta da Diretoria Geral, como um sol com seus raios. No celular vira uma lista que abre ao toque.
function Organograma({ secretarias }: { secretarias: Sec[] }) {
  const centro = secretarias.find((s) => /diretoria/i.test(s.name));
  const roda = secretarias.filter((s) => s !== centro);
  const [sel, setSel] = useState<string | null>(null);
  const atual = secretarias.find((s) => s.id === sel) ?? centro ?? roda[0];
  if (!secretarias.length) return null;
  return (
    <div className="ini-orbita">
      <div className="ini-orbita__roda" role="list">
        <button type="button" role="listitem" className={`ini-orbita__centro${atual?.id === centro?.id ? " ativo" : ""}`}
          onClick={() => centro && setSel(centro.id)} aria-pressed={atual?.id === centro?.id}>
          {centro?.name ?? "Lar de Seu Luiz"}
        </button>
        {roda.map((s, i) => {
          const ang = (i / roda.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <button key={s.id} type="button" role="listitem" aria-pressed={atual?.id === s.id}
              className={`ini-orbita__item${atual?.id === s.id ? " ativo" : ""}`}
              style={{ left: `${50 + Math.cos(ang) * 41}%`, top: `${50 + Math.sin(ang) * 41}%` }}
              onClick={() => setSel(s.id)}>
              <span className="ini-orbita__ponto" aria-hidden="true" />{s.name}
            </button>
          );
        })}
      </div>
      {atual && (
        <div className="ini-orbita__painel" aria-live="polite">
          <h3 className="ini-lead">{atual.name}</h3>
          <p className="ini-corpo">{atual.description ?? "Uma das secretarias de trabalho da casa."}</p>
          <p className="ini-pequeno">{secretarias.length} secretarias trabalham juntas na casa.</p>
        </div>
      )}
      <ul className="ini-orbita__lista">
        {[...(centro ? [centro] : []), ...roda].map((s) => (
          <li key={s.id}>
            <details open={s.id === centro?.id}>
              <summary><span className="ini-orbita__ponto" aria-hidden="true" />{s.name}</summary>
              <p>{s.description ?? "Uma das secretarias de trabalho da casa."}</p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Doc = { id: string; title: string; description: string | null; file_url: string; doc_type: string | null; reference_date: string | null };
const TIPO_DOC: Record<string, string> = { estatuto: "Estatuto", ata: "Ata", balancete: "Balancete", relatorio: "Relatório", regimento: "Regimento" };

// Os documentos como um arquivo: uma linha por documento, com o tipo, a data e o link para abrir.
function Arquivo({ documentos }: { documentos?: Doc[] }) {
  if (!documentos) return null;
  if (documentos.length === 0) {
    const previstos = [
      { t: "Estatuto Social", d: "Aprovado na Assembleia Geral de constituição", tipo: "Estatuto" },
      { t: "Ata da Assembleia Geral de Constituição", d: "Fundação do Lar de Seu Luiz, em 12 de setembro de 2025", tipo: "Ata" },
      { t: "Relatórios financeiros", d: "Entradas, saídas e saldo de cada período, depois de aprovados", tipo: "Relatório" },
    ];
    return (
      <ul className="ini-arquivo">
        {previstos.map((x) => (
          <li key={x.t}>
            <div className="ini-arquivo__linha ini-arquivo__linha--breve">
              <span className="ini-arquivo__icone" aria-hidden="true"><FileText size={22} /></span>
              <span className="ini-arquivo__texto"><strong>{x.t}</strong><em>{x.d}</em></span>
              <span className="ini-arquivo__meta"><span className="ini-selo">{x.tipo}</span></span>
              <span className="ini-arquivo__abrir ini-arquivo__abrir--breve">Em publicação</span>
            </div>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="ini-arquivo">
      {documentos.map((d) => (
        <li key={d.id}>
          <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="ini-arquivo__linha">
            <span className="ini-arquivo__icone" aria-hidden="true"><FileText size={22} /></span>
            <span className="ini-arquivo__texto">
              <strong>{d.title}</strong>
              {d.description && <em>{d.description}</em>}
            </span>
            <span className="ini-arquivo__meta">
              {d.doc_type && <span className="ini-selo">{TIPO_DOC[d.doc_type] ?? d.doc_type}</span>}
              {d.reference_date && <span>{new Date(d.reference_date + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>}
            </span>
            <span className="ini-arquivo__abrir">Abrir <ArrowUpRight size={18} /></span>
          </a>
        </li>
      ))}
    </ul>
  );
}

const ACasa = () => {
  const secretarias = useQuery({
    queryKey: ["site-secretarias"],
    queryFn: async () => {
      const { data } = await supabase.from("secretarias").select("id, name, description, icon").eq("is_active", true).order("name");
      return data ?? [];
    },
  });
  const documentos = useQuery({
    queryKey: ["site-documentos-publicos"],
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("id, title, description, file_url, doc_type, reference_date").eq("is_public", true).order("reference_date", { ascending: false });
      return data ?? [];
    },
  });
  const qtd = secretarias.data?.length;

  return (
    <PaginaSite documento="A Casa" titulo="Conheça o Lar de Seu Luiz" foto="/imagens/saude-lar-event.jpg" fotoAlt="Voluntárias atendendo moradores na ação Saúde no Lar"
      intro="Organização religiosa sem fins lucrativos, mantida pelo trabalho voluntário. Aqui você conhece nossa história, como a casa se organiza e onde estão os documentos públicos.">

      <Secao titulo="Quem somos" fundo="papel" intro={<>
        <p>Fundado em 12 de setembro de 2025, o Lar de Seu Luiz é uma organização religiosa sem fins lucrativos, registrada em cartório, com CNPJ e Estatuto Social aprovado em Assembleia Geral, na Colônia do Pium, em Nísia Floresta/RN.</p>
        <p>Nenhum dirigente recebe remuneração: todo recurso vai para os objetivos da instituição. Não nos envolvemos em questões ideológicas ou político-partidárias.</p>
      </>}>
        <motion.blockquote className="ini-casa__frase" style={{ color: "var(--ini-azul-escuro)", maxWidth: "52ch", fontSize: 24 }} {...surgir()}>
          “Levar a todos os consulentes o alívio de suas dores, sejam elas físicas, morais ou espirituais, sem distinção de raça, cor, credo ou condição social.”
          <span style={{ display: "block", marginTop: 10, fontStyle: "normal", fontFamily: "var(--font-body)", fontSize: 16, color: "var(--ini-suave)" }}>Estatuto Social, Art. 4º</span>
        </motion.blockquote>
        <div className="ini-numeros">
          <div className="ini-numero"><b>2025</b><span>Ano de fundação</span></div>
          <div className="ini-numero"><b>100%</b><span>Das atividades são gratuitas</span></div>
          <div className="ini-numero"><b>{qtd ?? "9"}</b><span>Secretarias de trabalho</span></div>
          <div className="ini-numero"><b>CNPJ</b><span>Organização registrada</span></div>
        </div>
      </Secao>

      <Secao id="missao" titulo="Nossa missão" intro="O Lar é uma casa espiritualista dedicada ao atendimento fraterno, pela explanação do Evangelho à luz dos ensinamentos de Jesus. Nosso Estatuto, no Art. 5º, define quatro finalidades.">
        <ListaSol itens={finalidades.map((f, i) => ({ id: f.titulo, marca: ["I", "II", "III", "IV"][i], titulo: f.titulo, texto: f.texto }))} />
      </Secao>

      <Secao titulo="Nossos valores" fundo="papel"
        intro="Seis princípios que orientam cada decisão da casa, do atendimento à prestação de contas.">
        <ol className="ini-valores">
          {valores.map((v, i) => (
            <motion.li key={v.titulo} className="ini-valor" {...surgir(i * 0.05)}>
              <span className="ini-valor__sol" aria-hidden="true" />
              <h3 className="ini-valor__nome">{v.titulo}</h3>
              <p>{v.texto}</p>
            </motion.li>
          ))}
        </ol>
      </Secao>

      <Secao id="secretarias" titulo="Como nos organizamos" fundo="teal-claro"
        intro="A Diretoria Geral fica no centro e as secretarias giram em volta, cada uma com coordenação e voluntários próprios. Toque numa secretaria para saber o que ela faz.">
        <Organograma secretarias={secretarias.data ?? []} />
      </Secao>

      <Secao id="transparencia" titulo="Prestação de contas" fundo="papel"
        intro="Estatuto social, atas de assembleia e balancetes aprovados ficam disponíveis aqui. Os associados também acessam os documentos internos pela área restrita.">
        <Arquivo documentos={documentos.data} />
      </Secao>

      <ConviteFinal titulo="Quer servir na casa?" botao="Quero ser voluntário" para="/voluntariado"
        texto="O voluntariado começa com uma conversa no Acolhimento, segue com um curso de preparação e um estágio acompanhado."
        foto="/imagens/sopa-solidaria.jpg" fotoAlt="Voluntários preparando a Sopa Solidária" />
    </PaginaSite>
  );
};

export default ACasa;
