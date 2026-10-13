# Plano de evolução — UX/UI v2

Organizado em 5 fases. Cada fase é entregável por si só; começo pela integridade dos dados, porque ela contamina todos os indicadores.

## Fase 1 — Integridade da sessão (P0)

- [ ] Impedir criação de sessão em dia que não seja terça ou sábado (validação no banco + na interface).
- [ ] Derivar o rótulo do dia (Terça/Sábado) da data real, nunca de valor fixo.
- [ ] Limpar os 16 registros de atendimento em dias inválidos (listo antes de apagar, para conferência).
- [ ] Restringir sábados às datas quinzenais oficiais já cadastradas.
- [ ] Novo estado visível "Pendente de lançamento" para sessão válida sem nenhum registro, exibida no topo da lista de Atendimentos.

## Fase 2 — Lançamento retroativo (P0)

- [ ] Campo **Data do diálogo** no formulário de Novo Diálogo (padrão: hoje, editável, restrito a datas válidas).
- [ ] Renomear "Atendimento do dia" para **Lançar sessão**, começando pela escolha da data da sessão (só terças/sábados, pendentes em destaque).
- [ ] Data selecionada sempre visível no cabeçalho da maca, sem ambiguidade sobre o que está sendo gravado.
- [ ] Detecção de duplicidade no cadastro: ao digitar nome ou telefone, avisar "cadastro parecido existe" e oferecer abrir o existente.
- [ ] Validação de telefone (10/11 dígitos) e data de nascimento (data real, não futura).
- [ ] Rodapé da maca com "último salvamento por X às Y".

## Fase 3 — Lotação, designação e privacidade

- [ ] Tela de designação: filtrar macas pelo dia e pelo tipo de encaminhamento (Passe / Interna / Externa); esconder as demais.
- [ ] Mostrar ocupação "7/10" em cada maca (designação, grid do Acolhimento e cartão administrativo).
- [ ] Aviso amarelo a partir de 9 e bloqueio real do 11º consulente.
- [ ] Botão de voltar/cancelar na designação; botão "Maca" passa a se chamar "Designar maca".
- [ ] Alertas sensíveis: checagem de papel no servidor (admin/dialogador) para o banner do Início e para a aba de Relatórios.
- [ ] Exportação de alertas sensíveis com confirmação explícita, justificativa e registro de quem exportou, quando e por quê.
- [ ] Mudança de papel em Usuários com confirmação, desfazer temporário e log.

## Fase 4 — Mobile e telas de trabalho

- [ ] Atalhos do dashboard: reduzir a 2–3 ações nomeadas, com rótulo também no celular.
- [ ] Consulentes vira lista de cartões no mobile; enquanto tabela, congelar coluna de nome e trazer ações para dentro da tela.
- [ ] Paginação/filtros na lista de Consulentes (situação, maca, dia) e busca.
- [ ] Corrigir botão Salvar escondido atrás da barra inferior nos formulários.
- [ ] Lançar sessão: destacar apenas **Presente** e **Falta**; demais estados em menu secundário; ação "marcar todos como presente"; rascunho automático.
- [ ] Cartões de inativos explicam por que não têm ações (depende de novo diálogo).
- [ ] Modal Editar maca: cabeçalho/rodapé fixos, rolagem correta, "Remover maca" isolado do "Salvar".

## Fase 5 — Linguagem, números e acabamento

- [ ] Glossário fechado: Diálogo / Atendimento na maca / Interna / Externa — um nome só por conceito, em todos os lugares.
- [ ] Um único destino de criação com um nome só (hoje são quatro variações).
- [ ] Terminar a troca Recepção → Acolhimento (rotas e badges) e padronizar papéis com acento e capitalização, exibidos uma vez por tela.
- [ ] Formato único de data, com dia da semana escrito por extenso; nada de ISO cru.
- [ ] Início em dois modos: **modo sessão** em dia de atendimento, **modo espera** fora dele, com a próxima sessão em destaque.
- [ ] "Macas disponíveis: 72" vira "Vagas livres na terça: 72 de 140", com barra de ocupação; gráfico com escala até 10 e linha de limite.
- [ ] Contadores explicados: "5ª de 8 sessões do ciclo"; conciliar contagem do cartão (4) com o detalhe (7 = 4 ativos + 3 inativos).
- [ ] Textos do Acolhimento corrigidos: acolhimento designa maca, quem registra presença é o médium.
- [ ] "Reativar" informa o destino, exige confirmação e bloqueia sem diálogo novo; "Encerrar ciclo" vira "Encerrar acompanhamento (sem alta)" com motivo.
- [ ] "Excluir cadastro" isolado, com confirmação por digitação do nome.
- [ ] Relatórios: abas na URL, filtro de período, KPIs deixam de parecer clicáveis, "Em mais de uma maca" reposicionada como consulta; novas visões "Sessões pendentes de lançamento" e "Macas próximas do limite".
- [ ] Macas: alerta para maca sem médium, busca/filtro, campo próprio de finalidade (caso Branca - Grávidas) e seletor de cor amigável.
- [ ] Acessibilidade: nomes acessíveis no hambúrguer, logo e campos; esqueletos de carregamento no lugar de "Carregando...".
- [ ] Remover/redirecionar a rota morta `/consulentes/novo`; corrigir breadcrumb "Dashboard > Dashboard".
- [ ] Limpeza de duplicatas (consulentes e usuários) e ordenação alfabética no seletor de dialogador.

## Notas técnicas

- Validação de dia útil de atendimento como trigger no banco, além da checagem na interface, para blindar contra qualquer caminho de escrita.
- Bloqueio de lotação também no banco (contagem de designações ativas por maca).
- Acesso a dados sensíveis via função de servidor com verificação de papel, não apenas condição de renderização.
