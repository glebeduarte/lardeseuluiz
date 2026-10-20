import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
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
      const { data } = await supabase.from("documents").select("id, title, description, file_url, doc_type").eq("is_public", true).order("reference_date", { ascending: false });
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

      <Secao titulo="Nossos valores" fundo="papel">
        <ul className="ini-cartoes">
          {valores.map((v) => <li key={v.titulo}><div className="ini-cartao"><strong>{v.titulo}</strong><p>{v.texto}</p></div></li>)}
        </ul>
      </Secao>

      <Secao id="secretarias" titulo="Como nos organizamos" fundo="teal-claro"
        intro="Cada secretaria cuida de uma parte do trabalho da casa, com coordenação e voluntários próprios.">
        <ul className="ini-cartoes">
          {(secretarias.data ?? []).map((s) => (
            <li key={s.id}><div className="ini-cartao"><span className="ini-cartao__marca" aria-hidden="true">{s.name.charAt(0)}</span><strong>{s.name}</strong>{s.description && <p>{s.description}</p>}</div></li>
          ))}
        </ul>
      </Secao>

      <Secao id="transparencia" titulo="Prestação de contas" fundo="papel"
        intro="Estatuto social, atas de assembleia e balancetes aprovados ficam disponíveis aqui. Os associados também acessam os documentos internos pela área restrita.">
        <ul className="ini-cartoes">
          {(documentos.data ?? []).map((d) => (
            <li key={d.id}><a href={d.file_url} target="_blank" rel="noopener noreferrer" className="ini-cartao">
              <span className="ini-cartao__marca"><FileText size={22} /></span><strong>{d.title}</strong>{d.description && <p>{d.description}</p>}
            </a></li>
          ))}
          {documentos.data && documentos.data.length === 0 && (
            <li><div className="ini-cartao"><span className="ini-cartao__marca"><FileText size={22} /></span><strong>Documentos em publicação</strong><p>Os documentos públicos estão sendo organizados e aparecem aqui em breve.</p></div></li>
          )}
        </ul>
      </Secao>

      <ConviteFinal titulo="Quer servir na casa?" botao="Quero ser voluntário" para="/voluntariado"
        texto="O voluntariado começa com uma conversa no Acolhimento, segue com um curso de preparação e um estágio acompanhado."
        foto="/imagens/sopa-solidaria.jpg" fotoAlt="Voluntários preparando a Sopa Solidária" />
    </PaginaSite>
  );
};

export default ACasa;
