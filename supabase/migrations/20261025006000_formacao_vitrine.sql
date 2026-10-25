-- Formação: campos da vitrine do aluno (Início em estilo streaming).
--   tagline         frase curta que aparece no destaque e no cartaz ("Estude a Doutrina Espírita do começo")
--   featured        o curso entra nos destaques do topo do Início
--   featured_order  ordem dos destaques (menor primeiro)
--   trailer_url     vídeo de apresentação (YouTube ou Google Drive), aberto no botão "Ver apresentação"
alter table formacao.courses
  add column if not exists tagline text,
  add column if not exists featured boolean not null default false,
  add column if not exists featured_order integer not null default 0,
  add column if not exists trailer_url text;

comment on column formacao.courses.tagline is 'Frase curta da vitrine do aluno (até 120 caracteres).';
comment on column formacao.courses.featured is 'Aparece nos destaques do topo do Início do aluno.';
comment on column formacao.courses.featured_order is 'Ordem nos destaques; menor primeiro.';
comment on column formacao.courses.trailer_url is 'Vídeo de apresentação do curso (YouTube ou Google Drive).';

alter table formacao.courses drop constraint if exists courses_tagline_tamanho;
alter table formacao.courses add constraint courses_tagline_tamanho check (tagline is null or char_length(tagline) <= 120);

-- Começa com o ESDE I e o ESDE II em destaque, que são as formações contínuas abertas
update formacao.courses set featured = true, featured_order = case title when 'ESDE I' then 1 when 'ESDE II' then 2 else featured_order end
 where title in ('ESDE I', 'ESDE II') and not featured;

notify pgrst, 'reload schema';
