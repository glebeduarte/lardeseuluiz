-- Formação original dentro da plataforma unificada: arquivos, login único e correções de segurança.

-- Buckets com os mesmos nomes do sistema original
insert into storage.buckets (id, name, public) values ('course-assets', 'course-assets', true), ('lesson-attachments', 'lesson-attachments', false)
on conflict (id) do nothing;

create policy "formacao: admins enviam course-assets" on storage.objects for insert to authenticated
  with check (bucket_id = 'course-assets' and formacao.is_admin(auth.uid()));
create policy "formacao: admins alteram course-assets" on storage.objects for update to authenticated
  using (bucket_id = 'course-assets' and formacao.is_admin(auth.uid()));
create policy "formacao: admins removem course-assets" on storage.objects for delete to authenticated
  using (bucket_id = 'course-assets' and formacao.is_admin(auth.uid()));
create policy "formacao: admins enviam anexos" on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-attachments' and formacao.is_admin(auth.uid()));
create policy "formacao: admins alteram anexos" on storage.objects for update to authenticated
  using (bucket_id = 'lesson-attachments' and formacao.is_admin(auth.uid()));
create policy "formacao: admins removem anexos" on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-attachments' and formacao.is_admin(auth.uid()));
create policy "formacao: matriculados leem anexos" on storage.objects for select to authenticated
  using (bucket_id = 'lesson-attachments' and (formacao.is_admin(auth.uid()) or exists (
    select 1 from formacao.attachments a join formacao.lessons l on l.id = a.lesson_id join formacao.modules m on m.id = l.module_id
    join formacao.enrollments e on e.course_id = m.course_id
    where position(objects.name in a.url) > 0 and e.user_id = auth.uid() and e.status = 'approved')));

-- Os vínculos com profiles acompanham a troca de id quando a conta antiga é religada
do $$
declare r record;
begin
  for r in select c.conname, c.conrelid::regclass as tabela, pg_get_constraintdef(c.oid) as def
             from pg_constraint c where c.contype = 'f' and c.confrelid = 'formacao.profiles'::regclass loop
    execute format('alter table %s drop constraint %I', r.tabela, r.conname);
    execute format('alter table %s add constraint %I %s on update cascade', r.tabela, r.conname, r.def);
  end loop;
end $$;

-- Login único: a conta nova recebe o perfil da Formação; se havia perfil antigo com o mesmo e-mail,
-- ele passa a usar o id da conta nova (matrículas, progresso, presenças e avaliações acompanham).
create or replace function formacao.religar_conta(p_uid uuid, p_email text, p_nome text default null, p_telefone text default null)
returns void language plpgsql security definer set search_path = formacao, public as $$
declare v_antigo uuid;
begin
  if exists (select 1 from formacao.profiles where id = p_uid) then return; end if;
  select id into v_antigo from formacao.profiles
   where lower(email) = lower(p_email) order by last_activity_at desc nulls last limit 1;
  if v_antigo is not null then
    alter table formacao.profiles disable trigger prevent_profile_role_change_trg;
    update formacao.profiles set id = p_uid, email = p_email where id = v_antigo;
    alter table formacao.profiles enable trigger prevent_profile_role_change_trg;
    update formacao.user_roles set user_id = p_uid where user_id = v_antigo;
    update formacao.announcements set created_by = p_uid where created_by = v_antigo;
    update formacao.attendance_links set created_by = p_uid where created_by = v_antigo;
    update formacao.registration_pages set created_by = p_uid where created_by = v_antigo;
    update formacao.email_campaigns set sent_by = p_uid where sent_by = v_antigo;
    update formacao.dashboard_config set updated_by = p_uid where updated_by = v_antigo;
  else
    insert into formacao.profiles (id, full_name, email, phone, role, user_type)
    values (p_uid, coalesce(nullif(p_nome, ''), p_email), p_email, p_telefone, 'student', 'frequentador');
  end if;
end $$;
revoke execute on function formacao.religar_conta(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.modulos_nova_conta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform formacao.religar_conta(new.id, new.email, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'phone');
  return new;
end $$;
revoke execute on function public.modulos_nova_conta() from public, anon, authenticated;
create trigger modulos_nova_conta after insert on auth.users for each row execute function public.modulos_nova_conta();

select formacao.religar_conta(u.id, u.email, u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'phone') from auth.users u;

-- Correção: quem cria o próprio perfil só pode ser aluno
alter policy "Allow insert for new users" on formacao.profiles
  with check ((auth.uid() = id) and role = 'student'::formacao.user_role);

-- Importação dos dados antigos: função temporária protegida por token (aplicada à parte, revogada ao final).
