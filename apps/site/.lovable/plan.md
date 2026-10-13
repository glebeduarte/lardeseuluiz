# Fase 6 — Limpeza final da unificação em Pessoas

Encontrei mais dependências do que o plano original previa. Para fazer com segurança, vou dividir em **6a (não-destrutivo)** e **6b (destrutivo, com sua aprovação explícita)**.

## Tabelas ainda usando `associate_id`
- `assembly_attendees`
- `votes`
- `lgpd_consents`
- `data_requests`
- `secretaria_members`, `spiritual_sessions`, `contributions` (já têm `person_id` desde a Fase 5; o código ainda usa `associate_id`)

## Código ainda lendo `associates` / `profiles`
- `AppDashboard`, `Financeiro`, `Atendimentos`, `SecretariaDetalhe`, `AssembleiaDetalhe`, `LGPD`, `MeuPainel`
- `associate/MinhasContribuicoes`, `associate/MeusDados`

---

## Fase 6a — Extensão + refatoração (sem dropar nada)

**Migration:**
- Adiciona coluna `person_id uuid REFERENCES people(id)` em `assembly_attendees`, `votes`, `lgpd_consents`, `data_requests`
- Faz backfill via CPF (preferencial) ou e-mail, igual à Fase 5
- Cria índices em cada nova coluna
- Mantém `associate_id` por enquanto (compatibilidade)

**Refatoração de código (tudo para ler/escrever em `people` + `person_id`):**
- `AppDashboard.tsx` — lista de associados, mutações
- `Financeiro.tsx` — formulário de contribuição usa pessoas
- `Atendimentos.tsx` — assistido vira pessoa
- `SecretariaDetalhe.tsx` — membros vinculados a pessoas
- `AssembleiaDetalhe.tsx` — presenças e votos por pessoa
- `LGPD.tsx` — consentimentos por pessoa
- `MeuPainel.tsx`, `associate/MinhasContribuicoes.tsx`, `associate/MeusDados.tsx` — buscar pessoa do usuário via `people.user_id`

## Fase 6b — Destruição (após validar 6a em uso real)

**Migration destrutiva (rodada só depois que você validar):**
- `ALTER TABLE … DROP COLUMN associate_id` em todas as 7 tabelas dependentes
- `DROP TABLE public.associates`
- Tornar `person_id` `NOT NULL` nas tabelas que exigirem
- Consolidar `profiles` em `people`: migrar `avatar_url`/campos próprios para `people`, atualizar `handle_new_user` para parar de escrever em `profiles`, `DROP TABLE public.profiles`
- Atualizar `src/pages/Usuarios.tsx` (e qualquer leitura restante de `profiles`)

---

## Recomendação

Executo **Fase 6a agora** (seguro, reversível, mantém o sistema funcionando). Depois você usa o sistema por alguns dias e me autoriza a Fase 6b quando estiver confiante.

Confirma esse caminho?
