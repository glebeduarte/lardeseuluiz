import { SiteLayout, Secao } from "@/components/site/SiteLayout";
import { useSiteConfig } from "@/lib/site";

export default function Privacidade() {
  const { data: cfg } = useSiteConfig();
  const itens: [string, string][] = [
    ["Quais dados guardamos", "Nome e contatos de quem cria conta, envia mensagem ou se inscreve em cursos e ações. Nos atendimentos, as informações registradas no Diálogo Fraterno, que podem incluir dados de saúde."],
    ["Para que usamos", "Para organizar cursos, inscrições, atendimentos e ações sociais, e para falar com você sobre eles. Não vendemos nem compartilhamos dados com terceiros."],
    ["Quem tem acesso", "Somente os voluntários que precisam da informação para o trabalho. Fichas de atendimento são vistas apenas pela equipe do atendimento, e cada acesso fica registrado."],
    ["Dados de crianças", "Só com autorização do responsável legal, que pode acompanhar e pedir correção ou exclusão."],
    ["Seus direitos", "Você pode ver e corrigir seus dados na Minha área, retirar consentimentos e pedir a exclusão do cadastro pelo contato da casa."],
    ["Cookies", "Usamos apenas o necessário para manter você conectado. Não usamos cookies de publicidade."],
  ];
  return (
    <SiteLayout>
      <Secao eyebrow="LGPD" titulo="Privacidade e proteção de dados"
        intro="Cuidamos das informações de quem frequenta a casa com o mesmo zelo com que cuidamos das pessoas.">
        <dl className="grid gap-6 max-w-3xl">
          {itens.map(([t, d]) => (
            <div key={t} className="flex flex-col gap-1">
              <dt className="text-lg font-semibold">{t}</dt>
              <dd className="text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
        {cfg?.email && <p className="text-sm text-muted-foreground">Encarregado de dados: Direção do Lar de Seu Luiz, pelo e-mail <span className="select-all">{cfg.email}</span>.</p>}
      </Secao>
    </SiteLayout>
  );
}
