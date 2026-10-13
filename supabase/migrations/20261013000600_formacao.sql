-- =====================================================================
-- Fase 6 · Formação
-- Cursos, turmas, módulos, aulas, matrículas, progresso, presença,
-- avaliações, calendário de estudos, biblioteca, avisos e páginas de inscrição.
-- Regras sensíveis (inscrição, presença, correção de avaliação) ficam em
-- funções do banco, para que o navegador não decida sozinho.
-- =====================================================================

create table public.cursos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  descricao_longa text,
  categoria text,
  publico text not null default 'todos' check (publico in ('todos', 'voluntarios')),
  situacao text not null default 'rascunho' check (situacao in ('rascunho', 'publicado', 'arquivado')),
  inscricoes_abertas boolean not null default true,
  exige_aprovacao boolean not null default false,
  linhas_estudo text[] not null default '{}',
  topicos text[] not null default '{}',
  inicio date,
  fim date,
  horario text,
  facilitadores text,
  duracao_minutos int,
  capa_url text,
  miniatura_url text,
  pagina_inscricao boolean not null default false,
  area_id uuid references public.areas(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger cursos_atualizado before update on public.cursos for each row execute function public.tocar_atualizado_em();

create table public.turmas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos(id) on delete cascade,
  nome text not null,
  vagas_tipo text not null default 'ilimitada' check (vagas_tipo in ('ilimitada', 'limitada')),
  vagas_max int check (vagas_max is null or vagas_max > 0),
  link_encontro text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index turmas_curso_idx on public.turmas(curso_id);
create trigger turmas_atualizado before update on public.turmas for each row execute function public.tocar_atualizado_em();

create table public.modulos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos(id) on delete cascade,
  titulo text not null,
  descricao text,
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index modulos_curso_idx on public.modulos(curso_id, ordem);
create trigger modulos_atualizado before update on public.modulos for each row execute function public.tocar_atualizado_em();

create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.modulos(id) on delete cascade,
  titulo text not null,
  descricao text,
  video_url text,
  miniatura_url text,
  embed_url text,
  embed_titulo text,
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index aulas_modulo_idx on public.aulas(modulo_id, ordem);
create trigger aulas_atualizado before update on public.aulas for each row execute function public.tocar_atualizado_em();

create table public.anexos (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas(id) on delete cascade,
  nome text not null,
  url text not null,
  tipo text,
  criado_em timestamptz not null default now()
);
create index anexos_aula_idx on public.anexos(aula_id);

create table public.matriculas (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  curso_id uuid not null references public.cursos(id) on delete cascade,
  turma_id uuid references public.turmas(id) on delete set null,
  situacao text not null default 'pendente' check (situacao in ('pendente', 'aprovada', 'recusada', 'cancelada', 'concluida')),
  decidido_por uuid references public.pessoas(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (pessoa_id, curso_id)
);
create index matriculas_curso_idx on public.matriculas(curso_id, situacao);
create trigger matriculas_atualizado before update on public.matriculas for each row execute function public.tocar_atualizado_em();

create table public.progresso_aulas (
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  aula_id uuid not null references public.aulas(id) on delete cascade,
  concluida_em timestamptz not null default now(),
  primary key (pessoa_id, aula_id)
);

create table public.links_presenca (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  url_destino text,
  expira_em timestamptz not null,
  criado_por uuid references public.pessoas(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table public.presencas (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas(id) on delete cascade,
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  situacao text not null default 'presente' check (situacao in ('presente', 'ausente', 'justificada')),
  forma text not null default 'link' check (forma in ('link', 'chamada', 'migracao')),
  link_id uuid references public.links_presenca(id) on delete set null,
  observacao text,
  registrado_por uuid references public.pessoas(id) on delete set null,
  registrado_em timestamptz not null default now(),
  unique (aula_id, pessoa_id)
);
create index presencas_pessoa_idx on public.presencas(pessoa_id);

create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos(id) on delete cascade,
  titulo text not null,
  descricao text,
  situacao text not null default 'rascunho' check (situacao in ('rascunho', 'publicada', 'arquivada')),
  posicao text not null default 'fim_do_curso' check (posicao in ('depois_do_modulo', 'antes_do_modulo', 'fim_do_curso', 'entre_aulas')),
  modulo_id uuid references public.modulos(id) on delete set null,
  depois_da_aula_id uuid references public.aulas(id) on delete set null,
  obrigatoria boolean not null default false,
  nota_minima numeric not null default 70,
  max_tentativas int,
  tempo_limite_minutos int,
  embaralhar_questoes boolean not null default false,
  embaralhar_alternativas boolean not null default false,
  mostrar_respostas text not null default 'apos_aprovacao' check (mostrar_respostas in ('sempre', 'nunca', 'apos_aprovacao')),
  criado_por uuid references public.pessoas(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger avaliacoes_atualizado before update on public.avaliacoes for each row execute function public.tocar_atualizado_em();

create table public.questoes (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  tipo text not null check (tipo in ('multipla_escolha', 'verdadeiro_falso', 'multiplas_respostas', 'ordenacao', 'lacuna', 'dissertativa')),
  enunciado text not null,
  alternativas jsonb,
  resposta_correta text,
  explicacao text,
  ordem int not null default 0,
  revisar boolean not null default false,
  gerada_por_ia boolean not null default false,
  criado_em timestamptz not null default now()
);
create index questoes_avaliacao_idx on public.questoes(avaliacao_id, ordem);

create table public.avaliacao_fontes (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  tipo text not null,
  aula_id uuid references public.aulas(id) on delete set null,
  arquivo text,
  texto text
);

create table public.tentativas (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  numero int not null default 1,
  iniciada_em timestamptz not null default now(),
  enviada_em timestamptz,
  nota numeric,
  aprovada boolean,
  tempo_segundos int,
  respostas jsonb not null default '[]'::jsonb,   -- [{questao_id, resposta, correta, pontos}]
  unique (avaliacao_id, pessoa_id, numero)
);

create table public.calendario_estudos (
  id uuid primary key default gen_random_uuid(),
  codigo_curso text not null,
  data date,
  rotulo_data text not null,
  ordem int not null default 0,
  roteiro text not null default '',
  tema text not null default '',
  modulo text not null default '',
  facilitador text not null default '',
  tipo text not null default 'aula',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index calendario_codigo_idx on public.calendario_estudos(codigo_curso, ordem);
create trigger calendario_atualizado before update on public.calendario_estudos for each row execute function public.tocar_atualizado_em();

create table public.livros (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  autor text not null,
  espirito text,
  descricao text,
  capa_url text,
  pdf_url text,
  etiquetas text[] not null default '{}',
  linhas_estudo text[] not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger livros_atualizado before update on public.livros for each row execute function public.tocar_atualizado_em();

create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  categoria text not null default 'geral',
  ativo boolean not null default true,
  inicio timestamptz,
  fim timestamptz,
  criado_por uuid references public.pessoas(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table public.paginas_inscricao (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  titulo text not null,
  subtitulo text,
  info_dia text,
  info_horario text,
  info_formato text,
  info_extra text,
  texto_livre text,
  curso_ids uuid[] not null default '{}',
  mostrar_capas boolean not null default true,
  ativa boolean not null default true,
  capa_url text,
  grupo_whatsapp text,
  texto_agradecimento text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger paginas_inscricao_atualizado before update on public.paginas_inscricao for each row execute function public.tocar_atualizado_em();

-- =====================================================================
-- Funções
-- =====================================================================
create or replace function public.tem_matricula(p_curso uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matriculas
     where curso_id = p_curso and pessoa_id = public.pessoa_atual() and situacao in ('aprovada', 'concluida')
  )
$$;

create or replace function public.curso_da_aula(p_aula uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select m.curso_id from public.aulas a join public.modulos m on m.id = a.modulo_id where a.id = p_aula
$$;

create or replace function public.gere_formacao()
returns boolean language sql stable security definer set search_path = public as $$
  select public.tem_permissao('formacao.gerir') or public.tem_permissao('formacao.acompanhar')
$$;

-- Inscrição com todas as regras no banco: curso publicado e aberto, público compatível,
-- turma com vaga. Fica aprovada direto quando o curso não exige aprovação.
create or replace function public.inscrever_em_curso(p_curso uuid, p_turma uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_pessoa uuid := public.pessoa_atual();
  c public.cursos%rowtype;
  t public.turmas%rowtype;
  v_ocupadas int;
  v_situacao text;
begin
  if v_pessoa is null then raise exception 'Entre na sua conta para se inscrever.'; end if;
  select * into c from public.cursos where id = p_curso;
  if not found or c.situacao <> 'publicado' then raise exception 'Curso não encontrado.'; end if;
  if not c.inscricoes_abertas then raise exception 'As inscrições deste curso estão encerradas.'; end if;
  if c.publico = 'voluntarios' and public.estagio_atual(v_pessoa) is distinct from 'voluntario' then
    raise exception 'Este curso é só para voluntários da casa.';
  end if;

  if p_turma is null then
    select * into t from public.turmas where curso_id = p_curso order by criado_em limit 1;
  else
    select * into t from public.turmas where id = p_turma and curso_id = p_curso;
  end if;
  if t.id is not null and t.vagas_tipo = 'limitada' then
    select count(*) into v_ocupadas from public.matriculas where turma_id = t.id and situacao in ('pendente', 'aprovada');
    if v_ocupadas >= coalesce(t.vagas_max, 0) then raise exception 'As vagas desta turma acabaram.'; end if;
  end if;

  v_situacao := case when c.exige_aprovacao then 'pendente' else 'aprovada' end;
  insert into public.matriculas (pessoa_id, curso_id, turma_id, situacao)
  values (v_pessoa, p_curso, t.id, v_situacao)
  on conflict (pessoa_id, curso_id) do update
    set situacao = case when public.matriculas.situacao in ('cancelada') then excluded.situacao else public.matriculas.situacao end,
        turma_id = coalesce(public.matriculas.turma_id, excluded.turma_id)
  returning situacao into v_situacao;
  return v_situacao;
end $$;

-- Presença por link: exige login e matrícula; o link expira.
create or replace function public.confirmar_presenca(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_pessoa uuid := public.pessoa_atual();
  l public.links_presenca%rowtype;
  v_curso uuid;
begin
  if v_pessoa is null then raise exception 'Entre na sua conta para confirmar a presença.'; end if;
  select * into l from public.links_presenca where token = p_token;
  if not found then raise exception 'Link de presença inválido.'; end if;
  if l.expira_em < now() then raise exception 'Este link de presença já expirou.'; end if;
  v_curso := public.curso_da_aula(l.aula_id);
  if not exists (select 1 from public.matriculas where curso_id = v_curso and pessoa_id = v_pessoa and situacao in ('aprovada', 'concluida')) then
    raise exception 'Você não está matriculado neste curso.';
  end if;
  insert into public.presencas (aula_id, pessoa_id, situacao, forma, link_id)
  values (l.aula_id, v_pessoa, 'presente', 'link', l.id)
  on conflict (aula_id, pessoa_id) do update set situacao = 'presente', forma = 'link', link_id = excluded.link_id, registrado_em = now();
  return jsonb_build_object('aula_id', l.aula_id, 'url_destino', l.url_destino);
end $$;

-- Questões de uma avaliação, sem as respostas corretas
create or replace function public.questoes_para_responder(p_avaliacao uuid)
returns table (id uuid, tipo text, enunciado text, alternativas jsonb, ordem int)
language plpgsql stable security definer set search_path = public as $$
declare v_curso uuid;
begin
  select curso_id into v_curso from public.avaliacoes where avaliacoes.id = p_avaliacao and situacao = 'publicada';
  if v_curso is null or not (public.tem_matricula(v_curso) or public.gere_formacao()) then
    raise exception 'Avaliação indisponível.';
  end if;
  return query select q.id, q.tipo, q.enunciado, q.alternativas, q.ordem from public.questoes q where q.avaliacao_id = p_avaliacao order by q.ordem;
end $$;

-- Correção no banco. p_respostas: {"<questao_id>": "<resposta>"}
create or replace function public.enviar_avaliacao(p_avaliacao uuid, p_respostas jsonb, p_tempo_segundos int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_pessoa uuid := public.pessoa_atual();
  a public.avaliacoes%rowtype;
  q record;
  v_total int := 0; v_certas int := 0; v_numero int; v_nota numeric; v_lista jsonb := '[]'::jsonb;
  v_resp text; v_ok boolean;
begin
  select * into a from public.avaliacoes where id = p_avaliacao and situacao = 'publicada';
  if not found or not public.tem_matricula(a.curso_id) then raise exception 'Avaliação indisponível.'; end if;
  select coalesce(max(numero), 0) + 1 into v_numero from public.tentativas where avaliacao_id = p_avaliacao and pessoa_id = v_pessoa;
  if a.max_tentativas is not null and v_numero > a.max_tentativas then raise exception 'Você já usou todas as tentativas.'; end if;

  for q in select * from public.questoes where avaliacao_id = p_avaliacao and tipo <> 'dissertativa' loop
    v_total := v_total + 1;
    v_resp := p_respostas ->> q.id::text;
    v_ok := v_resp is not null and lower(trim(v_resp)) = lower(trim(q.resposta_correta));
    if v_ok then v_certas := v_certas + 1; end if;
    v_lista := v_lista || jsonb_build_object('questao_id', q.id, 'resposta', v_resp, 'correta', v_ok, 'pontos', case when v_ok then 1 else 0 end);
  end loop;

  v_nota := case when v_total = 0 then 100 else round(100.0 * v_certas / v_total, 1) end;
  insert into public.tentativas (avaliacao_id, pessoa_id, numero, enviada_em, nota, aprovada, tempo_segundos, respostas)
  values (p_avaliacao, v_pessoa, v_numero, now(), v_nota, v_nota >= a.nota_minima, p_tempo_segundos, v_lista);

  return jsonb_build_object('nota', v_nota, 'aprovada', v_nota >= a.nota_minima, 'certas', v_certas, 'total', v_total, 'tentativa', v_numero);
end $$;

revoke execute on function public.tem_matricula(uuid), public.curso_da_aula(uuid), public.gere_formacao(),
  public.inscrever_em_curso(uuid, uuid), public.confirmar_presenca(text), public.questoes_para_responder(uuid),
  public.enviar_avaliacao(uuid, jsonb, int) from public, anon;
grant execute on function public.tem_matricula(uuid), public.curso_da_aula(uuid), public.gere_formacao(),
  public.inscrever_em_curso(uuid, uuid), public.confirmar_presenca(text), public.questoes_para_responder(uuid),
  public.enviar_avaliacao(uuid, jsonb, int) to authenticated;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.cursos enable row level security;
alter table public.turmas enable row level security;
alter table public.modulos enable row level security;
alter table public.aulas enable row level security;
alter table public.anexos enable row level security;
alter table public.matriculas enable row level security;
alter table public.progresso_aulas enable row level security;
alter table public.links_presenca enable row level security;
alter table public.presencas enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.questoes enable row level security;
alter table public.avaliacao_fontes enable row level security;
alter table public.tentativas enable row level security;
alter table public.calendario_estudos enable row level security;
alter table public.livros enable row level security;
alter table public.avisos enable row level security;
alter table public.paginas_inscricao enable row level security;

-- Catálogo público
create policy cursos_ler_publico on public.cursos for select to anon using (situacao = 'publicado');
create policy cursos_ler on public.cursos for select to authenticated using (situacao = 'publicado' or public.gere_formacao());
create policy cursos_gerir on public.cursos for all to authenticated using (public.tem_permissao('formacao.gerir')) with check (public.tem_permissao('formacao.gerir'));

create policy turmas_ler_publico on public.turmas for select to anon using (exists (select 1 from public.cursos c where c.id = curso_id and c.situacao = 'publicado'));
create policy turmas_ler on public.turmas for select to authenticated using (true);
create policy turmas_gerir on public.turmas for all to authenticated using (public.tem_permissao('formacao.gerir')) with check (public.tem_permissao('formacao.gerir'));

create policy modulos_ler_publico on public.modulos for select to anon using (exists (select 1 from public.cursos c where c.id = curso_id and c.situacao = 'publicado'));
create policy modulos_ler on public.modulos for select to authenticated using (true);
create policy modulos_gerir on public.modulos for all to authenticated using (public.tem_permissao('formacao.gerir')) with check (public.tem_permissao('formacao.gerir'));

-- Conteúdo: matriculados e equipe da Formação
create policy aulas_ler on public.aulas for select to authenticated using (public.tem_matricula(public.curso_da_aula(id)) or public.gere_formacao());
create policy aulas_gerir on public.aulas for all to authenticated using (public.tem_permissao('formacao.gerir')) with check (public.tem_permissao('formacao.gerir'));
create policy anexos_ler on public.anexos for select to authenticated using (public.tem_matricula(public.curso_da_aula(aula_id)) or public.gere_formacao());
create policy anexos_gerir on public.anexos for all to authenticated using (public.tem_permissao('formacao.gerir')) with check (public.tem_permissao('formacao.gerir'));

-- Matrículas: inscrição só pela função; a pessoa vê e cancela as suas
create policy matriculas_ler on public.matriculas for select to authenticated using (pessoa_id = public.pessoa_atual() or public.gere_formacao());
create policy matriculas_cancelar on public.matriculas for update to authenticated
  using (pessoa_id = public.pessoa_atual()) with check (pessoa_id = public.pessoa_atual() and situacao = 'cancelada');
create policy matriculas_gerir on public.matriculas for all to authenticated using (public.tem_permissao('formacao.gerir')) with check (public.tem_permissao('formacao.gerir'));

-- Progresso: a própria pessoa marca aulas do curso em que está matriculada
create policy progresso_ler on public.progresso_aulas for select to authenticated using (pessoa_id = public.pessoa_atual() or public.gere_formacao());
create policy progresso_marcar on public.progresso_aulas for insert to authenticated
  with check (pessoa_id = public.pessoa_atual() and public.tem_matricula(public.curso_da_aula(aula_id)));
create policy progresso_desmarcar on public.progresso_aulas for delete to authenticated using (pessoa_id = public.pessoa_atual());

-- Presença: equipe gera links e faz chamada; a pessoa vê as suas
create policy links_gerir on public.links_presenca for all to authenticated using (public.gere_formacao()) with check (public.gere_formacao());
create policy presencas_ler on public.presencas for select to authenticated using (pessoa_id = public.pessoa_atual() or public.gere_formacao());
create policy presencas_gerir on public.presencas for all to authenticated using (public.gere_formacao()) with check (public.gere_formacao());

-- Avaliações: questões com gabarito só para a equipe
create policy avaliacoes_ler on public.avaliacoes for select to authenticated using ((situacao = 'publicada' and public.tem_matricula(curso_id)) or public.gere_formacao());
create policy avaliacoes_gerir on public.avaliacoes for all to authenticated using (public.tem_permissao('formacao.gerir')) with check (public.tem_permissao('formacao.gerir'));
create policy questoes_gerir on public.questoes for all to authenticated using (public.gere_formacao()) with check (public.tem_permissao('formacao.gerir'));
create policy fontes_gerir on public.avaliacao_fontes for all to authenticated using (public.tem_permissao('formacao.gerir')) with check (public.tem_permissao('formacao.gerir'));
create policy tentativas_ler on public.tentativas for select to authenticated using (pessoa_id = public.pessoa_atual() or public.gere_formacao());

-- Calendário, biblioteca, páginas de inscrição: públicos
create policy calendario_ler on public.calendario_estudos for select to anon, authenticated using (true);
create policy calendario_gerir on public.calendario_estudos for all to authenticated using (public.tem_permissao('formacao.gerir')) with check (public.tem_permissao('formacao.gerir'));
create policy livros_ler on public.livros for select to anon, authenticated using (true);
create policy livros_gerir on public.livros for all to authenticated using (public.tem_permissao('formacao.gerir')) with check (public.tem_permissao('formacao.gerir'));
create policy paginas_ler on public.paginas_inscricao for select to anon, authenticated using (ativa);
create policy paginas_gerir on public.paginas_inscricao for all to authenticated using (public.tem_permissao('formacao.gerir')) with check (public.tem_permissao('formacao.gerir'));

-- Avisos: para quem está logado
create policy avisos_ler on public.avisos for select to authenticated using (ativo and (inicio is null or inicio <= now()) and (fim is null or fim > now()) or public.tem_permissao('formacao.gerir'));
create policy avisos_gerir on public.avisos for all to authenticated using (public.tem_permissao('formacao.gerir')) with check (public.tem_permissao('formacao.gerir'));
