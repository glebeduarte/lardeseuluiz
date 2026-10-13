# Decisões do projeto

Registro das decisões que orientam a Plataforma LSL. Cada decisão tem data e motivo. Mudar uma decisão é registrar uma nova entrada, sem apagar a anterior.

## D01 · Sistema único (12/10/2026)
Governança, Atendimento e Formação, hoje três projetos no Lovable Cloud com bancos separados, passam a ser módulos de um único sistema, com um login, um banco e um repositório. A infraestrutura do Lovable deixa de ser usada.

## D02 · Base técnica (12/10/2026)
- **Frontend:** Vite, React 18, TypeScript, Tailwind CSS 3, shadcn/ui, react-router 6, TanStack Query.
- **Backend:** Supabase (Auth, Postgres com RLS, Storage, Edge Functions).
- **Hospedagem:** Vercel, como site estático.

Motivo: é a mesma base da Governança e da Formação, então telas e componentes existentes são reaproveitados com pouca adaptação. Site estático na Vercel não consome funções de servidor, o que mantém o custo perto de zero. A lógica que precisa de servidor (e-mail, IA, criação de contas) roda em Edge Functions do Supabase. O Atendimento, feito em TanStack Start, tem as telas portadas para react-router.

## D03 · Supabase em São Paulo (12/10/2026)
Projeto `LSL Plataforma` (ref `pbwyxunwteaocqssqpuv`), região `sa-east-1`. Menor latência para Natal e dados pessoais guardados no Brasil.

Plano gratuito durante a construção. Antes da primeira virada com dados reais, migrar para o plano Pro: o gratuito pausa após 7 dias sem uso e não tem backup diário, o que não serve para fichas de atendimento.

## D04 · Modelo de pessoas (12/10/2026)
- **Pessoa** existe independente de conta. Login é opcional.
- **Estágio na casa**, um por vez, com histórico: Frequentador ou Voluntário (antes chamado de trabalhador).
- **Vínculos**, vários ao mesmo tempo e independentes do estágio: Assistido (de um projeto social), Consulente (atendimento), Associado (estatuto: fundador, efetivo, colaborador), Colaborador financeiro.
- **Família** e **responsável legal** para menores.
- **Aluno** não é papel: é ter matrícula em curso.

## D05 · Cargos e funções (12/10/2026)
- **Cargos** só para voluntários, cumulativos e sempre ligados a uma área: Membro e Coordenador de uma secretaria, projeto ou equipe; Diretor vale para a casa. "Membro" existe só como cargo; a antiga função "Voluntário Geral" deixa de existir.
- **Funções** cumulativas, cada uma liberando telas e ações: Acolhimento, Dialogador, Médium de maca, Passista, Coordenador de passe, Monitor do ESDE, Evangelizador, Tutor de estágio, e outras criadas pela tela de configuração.
- A atribuição de função tem contexto opcional (por exemplo, a linha de trabalho espírita ou umbanda, ou uma maca específica), sem duplicar a função.
- **Admin da plataforma** é papel técnico, fora dos cargos. Não dá acesso automático a fichas sensíveis.

## D06 · Passagem a voluntário (12/10/2026)
Segue o Processo de Adesão de Novos Voluntários: chamamento, entrevista pelo Acolhimento, curso O Trabalho Voluntário na Casa Espírita, estágio de 8 semanas com tutor, integração oficial. A aprovação final é registrada pela Coordenação do Acolhimento com o parecer do tutor, e muda o estágio da pessoa para Voluntário.

## D07 · Ordem de entrega (12/10/2026)
Fundação, cópia das bases, núcleo, login, migração de pessoas e site primeiro. Depois os módulos, cada um com a própria virada: Formação, Atendimento, Governança (com o site). Por fim Chamamento, Ações sociais e encerramento do Lovable. As falhas dos sistemas atuais são corrigidas na versão nova, módulo a módulo.

## D08 · Dados pessoais fora do repositório (12/10/2026)
Nenhum dado pessoal, cópia de banco, senha ou chave entra no Git. Cópias das bases ficam em armazenamento privado. O repositório é privado.
