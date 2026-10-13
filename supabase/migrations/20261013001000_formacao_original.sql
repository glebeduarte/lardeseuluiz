-- Gerado por scripts/modulos/gerar_schema.py a partir de backups/formacao/schema
create schema if not exists formacao;
set local search_path = formacao, public, extensions;
create type formacao.app_role as enum ('admin', 'student');
create type formacao.assessment_position_type as enum ('after_module', 'before_module', 'end_of_course', 'between_lessons');
create type formacao.assessment_show_answers as enum ('always', 'never', 'on_pass');
create type formacao.assessment_status as enum ('draft', 'published', 'archived');
create type formacao.question_type as enum ('multiple_choice', 'true_false', 'multiple_answer', 'ordering', 'fill_blank', 'essay');
create type formacao.user_role as enum ('admin', 'student');
create type formacao.user_type as enum ('frequentador', 'trabalhador');
create table formacao.announcements (
  id uuid default gen_random_uuid() not null,
  title text not null,
  description text,
  category text default 'geral'::text not null,
  is_active boolean default true not null,
  starts_at timestamp with time zone default now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  created_by uuid,
  constraint announcements_pkey PRIMARY KEY (id)
);
create table formacao.assessment_answers (
  id uuid default gen_random_uuid() not null,
  attempt_id uuid not null,
  question_id uuid not null,
  answer_given text,
  is_correct boolean,
  points_earned numeric default 0,
  constraint assessment_answers_pkey PRIMARY KEY (id)
);
create table formacao.assessment_attempts (
  id uuid default gen_random_uuid() not null,
  assessment_id uuid not null,
  user_id uuid not null,
  attempt_number integer default 1 not null,
  started_at timestamp with time zone default now() not null,
  submitted_at timestamp with time zone,
  score integer,
  passed boolean,
  time_spent_seconds integer,
  constraint assessment_attempts_pkey PRIMARY KEY (id)
);
create table formacao.assessment_content_sources (
  id uuid default gen_random_uuid() not null,
  assessment_id uuid not null,
  source_type text not null,
  lesson_id uuid,
  file_path text,
  content_text text,
  constraint assessment_content_sources_pkey PRIMARY KEY (id)
);
create table formacao.assessment_questions (
  id uuid default gen_random_uuid() not null,
  assessment_id uuid not null,
  question_type formacao.question_type default 'multiple_choice'::question_type not null,
  statement text not null,
  alternatives jsonb,
  correct_answer text,
  explanation text,
  order_index integer default 0 not null,
  needs_review boolean default false not null,
  ai_generated boolean default false not null,
  created_at timestamp with time zone default now() not null,
  constraint assessment_questions_pkey PRIMARY KEY (id)
);
create table formacao.assessments (
  id uuid default gen_random_uuid() not null,
  course_id uuid not null,
  title text not null,
  description text,
  status formacao.assessment_status default 'draft'::assessment_status not null,
  position_type formacao.assessment_position_type default 'end_of_course'::assessment_position_type not null,
  position_module_id uuid,
  position_lesson_after_id uuid,
  requires_completion boolean default true not null,
  passing_score integer default 70 not null,
  max_attempts integer,
  time_limit_minutes integer,
  shuffle_questions boolean default true not null,
  shuffle_alternatives boolean default true not null,
  show_answers_after formacao.assessment_show_answers default 'on_pass'::assessment_show_answers not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint assessments_pkey PRIMARY KEY (id)
);
create table formacao.attachments (
  id uuid default gen_random_uuid() not null,
  lesson_id uuid not null,
  name text not null,
  url text not null,
  type text,
  created_at timestamp with time zone default now() not null,
  constraint attachments_pkey PRIMARY KEY (id)
);
create table formacao.attendance_links (
  id uuid default gen_random_uuid() not null,
  lesson_id uuid not null,
  token uuid default gen_random_uuid() not null,
  created_by uuid not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now(),
  redirect_url text,
  constraint attendance_links_pkey PRIMARY KEY (id),
  constraint attendance_links_token_key UNIQUE (token)
);
create table formacao.attendance_records (
  id uuid default gen_random_uuid() not null,
  link_id uuid not null,
  lesson_id uuid not null,
  user_id uuid not null,
  confirmed_at timestamp with time zone default now(),
  ip_address text,
  constraint attendance_records_lesson_id_user_id_key UNIQUE (lesson_id, user_id),
  constraint attendance_records_pkey PRIMARY KEY (id)
);
create table formacao.books (
  id uuid default gen_random_uuid() not null,
  title text not null,
  author text not null,
  spirit text,
  description text,
  cover_url text,
  pdf_url text,
  tags text[] default '{}'::text[],
  study_lines text[] default '{}'::text[],
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint books_pkey PRIMARY KEY (id)
);
create table formacao.class_groups (
  id uuid default gen_random_uuid() not null,
  course_id uuid not null,
  name text default 'Turma 1'::text not null,
  vacancy_type text default 'unlimited'::text not null,
  max_students integer,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint class_groups_pkey PRIMARY KEY (id)
);
create table formacao.courses (
  id uuid default gen_random_uuid() not null,
  title text not null,
  description text,
  thumbnail_url text,
  cover_url text,
  status text default 'draft'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  category text default 'trabalhadores'::text,
  audience text default 'ambos'::text not null,
  study_lines text[] default '{}'::text[] not null,
  enrollment_open boolean default true not null,
  long_description text,
  learning_topics text[] default '{}'::text[],
  start_date date,
  end_date date,
  schedule text,
  facilitator text,
  estimated_duration_minutes integer,
  registration_page_enabled boolean default false not null,
  constraint courses_audience_check CHECK ((audience = ANY (ARRAY['trabalhadores'::text, 'frequentadores'::text, 'ambos'::text]))),
  constraint courses_category_check CHECK ((category = ANY (ARRAY['formacoes'::text, 'cursos_extras'::text, 'materiais'::text]))),
  constraint courses_pkey PRIMARY KEY (id),
  constraint courses_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);
create table formacao.dashboard_config (
  id uuid default gen_random_uuid() not null,
  hero_image_url text,
  hero_title text default 'Olá, {name}! 👋'::text,
  hero_subtitle text default 'Continue sua jornada de aprendizado'::text,
  announcement_enabled boolean default false,
  announcement_text text,
  announcement_type text default 'info'::text,
  show_hero boolean default true,
  show_filters boolean default true,
  show_search boolean default true,
  sections_order text[] default ARRAY['enrolled'::text, 'catalog'::text],
  custom_css text,
  updated_at timestamp with time zone default now(),
  updated_by uuid,
  constraint dashboard_config_pkey PRIMARY KEY (id)
);
create table formacao.email_campaigns (
  id uuid default gen_random_uuid() not null,
  subject text not null,
  html_content text not null,
  recipients_count integer default 0 not null,
  sent_count integer default 0 not null,
  failed_count integer default 0 not null,
  status text default 'sent'::text not null,
  recipient_emails text[] default '{}'::text[] not null,
  recipient_names text[] default '{}'::text[] not null,
  sent_by uuid,
  created_at timestamp with time zone default now() not null,
  constraint email_campaigns_pkey PRIMARY KEY (id)
);
create table formacao.email_daily_usage (
  id uuid default gen_random_uuid() not null,
  usage_date date default CURRENT_DATE not null,
  sent_count integer default 0 not null,
  daily_limit integer default 100 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint email_daily_usage_pkey PRIMARY KEY (id),
  constraint email_daily_usage_usage_date_key UNIQUE (usage_date)
);
create table formacao.email_logs (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  email_to text not null,
  email_type text not null,
  subject text not null,
  status text default 'pending'::text not null,
  resend_id text,
  error_message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now() not null,
  sent_at timestamp with time zone,
  constraint email_logs_pkey PRIMARY KEY (id)
);
create table formacao.email_queue (
  id uuid default gen_random_uuid() not null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  html_content text not null,
  email_type text default 'bulk_email'::text not null,
  campaign_id uuid,
  status text default 'queued'::text not null,
  scheduled_for date,
  sent_at timestamp with time zone,
  error_message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint email_queue_pkey PRIMARY KEY (id)
);
create table formacao.email_templates (
  id uuid default gen_random_uuid() not null,
  template_key text not null,
  name text not null,
  subject text not null,
  html_content text not null,
  description text,
  variables text[] default '{}'::text[],
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint email_templates_pkey PRIMARY KEY (id),
  constraint email_templates_template_key_key UNIQUE (template_key)
);
create table formacao.enrollments (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  course_id uuid not null,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  class_group_id uuid not null,
  constraint enrollments_pkey PRIMARY KEY (id),
  constraint enrollments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
  constraint enrollments_user_id_course_id_key UNIQUE (user_id, course_id)
);
create table formacao.esde_calendar_entries (
  id uuid default gen_random_uuid() not null,
  course_code text default 'ESDE_I'::text not null,
  date_label text not null,
  sort_order integer default 0 not null,
  roteiro text default ''::text not null,
  tema text default ''::text not null,
  modulo text default ''::text not null,
  facilitador text default ''::text not null,
  tipo text default 'aula'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint esde_calendar_entries_pkey PRIMARY KEY (id)
);
create table formacao.lesson_progress (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  lesson_id uuid not null,
  completed boolean default false not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  constraint lesson_progress_pkey PRIMARY KEY (id),
  constraint lesson_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id),
  constraint lesson_progress_user_lesson_unique UNIQUE (user_id, lesson_id)
);
create table formacao.lessons (
  id uuid default gen_random_uuid() not null,
  module_id uuid not null,
  title text not null,
  description text,
  video_url text,
  thumbnail_url text,
  order_index integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  embed_url text,
  embed_title text,
  constraint lessons_pkey PRIMARY KEY (id)
);
create table formacao.modules (
  id uuid default gen_random_uuid() not null,
  course_id uuid not null,
  title text not null,
  description text,
  order_index integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint modules_pkey PRIMARY KEY (id)
);
create table formacao.notifications (
  id uuid default gen_random_uuid() not null,
  type text not null,
  title text not null,
  description text not null,
  related_id uuid,
  is_read boolean default false not null,
  created_at timestamp with time zone default now() not null,
  constraint notifications_pkey PRIMARY KEY (id)
);
create table formacao.profiles (
  id uuid not null,
  full_name text not null,
  email text not null,
  phone text,
  role formacao.user_role default 'student'::user_role not null,
  avatar_url text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  user_type formacao.user_type default 'frequentador'::user_type not null,
  last_activity_at timestamp with time zone default now(),
  inactivity_reminder_sent_at timestamp with time zone,
  must_change_password boolean default false not null,
  constraint profiles_pkey PRIMARY KEY (id)
);
create table formacao.registration_pages (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  title text not null,
  subtitle text,
  info_day text,
  info_time text,
  info_format text,
  info_extra text,
  free_text text,
  course_ids uuid[] default '{}'::uuid[] not null,
  show_course_covers boolean default true not null,
  is_active boolean default true not null,
  cover_url text,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  whatsapp_group_url text,
  thanks_text text,
  constraint registration_pages_pkey PRIMARY KEY (id),
  constraint registration_pages_slug_key UNIQUE (slug)
);
create table formacao.user_roles (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  role formacao.app_role not null,
  created_at timestamp with time zone default now() not null,
  constraint user_roles_pkey PRIMARY KEY (id),
  constraint user_roles_user_id_role_key UNIQUE (user_id, role)
);
alter table formacao.assessment_answers add constraint assessment_answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE;
alter table formacao.assessment_answers add constraint assessment_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE;
alter table formacao.assessment_attempts add constraint assessment_attempts_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
alter table formacao.assessment_attempts add constraint assessment_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
alter table formacao.assessment_content_sources add constraint assessment_content_sources_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
alter table formacao.assessment_content_sources add constraint assessment_content_sources_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;
alter table formacao.assessment_questions add constraint assessment_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
alter table formacao.assessments add constraint assessments_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
alter table formacao.assessments add constraint assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table formacao.assessments add constraint assessments_position_lesson_after_id_fkey FOREIGN KEY (position_lesson_after_id) REFERENCES lessons(id) ON DELETE SET NULL;
alter table formacao.assessments add constraint assessments_position_module_id_fkey FOREIGN KEY (position_module_id) REFERENCES modules(id) ON DELETE SET NULL;
alter table formacao.attachments add constraint attachments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
alter table formacao.attendance_links add constraint attendance_links_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
alter table formacao.attendance_records add constraint attendance_records_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
alter table formacao.attendance_records add constraint attendance_records_link_id_fkey FOREIGN KEY (link_id) REFERENCES attendance_links(id) ON DELETE CASCADE;
alter table formacao.attendance_records add constraint attendance_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table formacao.class_groups add constraint class_groups_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
alter table formacao.email_logs add constraint email_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table formacao.email_queue add constraint email_queue_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id);
alter table formacao.enrollments add constraint enrollments_class_group_id_fkey FOREIGN KEY (class_group_id) REFERENCES class_groups(id);
alter table formacao.enrollments add constraint enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
alter table formacao.enrollments add constraint enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table formacao.lesson_progress add constraint lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
alter table formacao.lesson_progress add constraint lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table formacao.lessons add constraint lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE;
alter table formacao.modules add constraint modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
CREATE INDEX idx_email_logs_created_at ON formacao.email_logs USING btree (created_at DESC);
CREATE INDEX idx_email_logs_email_type ON formacao.email_logs USING btree (email_type);
CREATE INDEX idx_email_logs_user_id ON formacao.email_logs USING btree (user_id);
CREATE OR REPLACE FUNCTION formacao.check_class_group_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'formacao', 'public', 'extensions'
AS $function$
DECLARE
  _vacancy_type TEXT;
  _max_students INT;
  _current_count INT;
  _course_id UUID;
BEGIN
  SELECT cg.vacancy_type, cg.max_students, cg.course_id
  INTO _vacancy_type, _max_students, _course_id
  FROM formacao.class_groups cg
  WHERE cg.id = NEW.class_group_id;

  IF _vacancy_type = 'limited' AND _max_students IS NOT NULL THEN
    SELECT COUNT(*) INTO _current_count
    FROM formacao.enrollments
    WHERE class_group_id = NEW.class_group_id AND status = 'approved';

    IF _current_count >= _max_students THEN
      UPDATE formacao.courses SET enrollment_open = false WHERE id = _course_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION formacao.create_enrollment_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'formacao', 'public', 'extensions'
AS $function$
DECLARE
  user_name TEXT;
  course_title TEXT;
BEGIN
  -- Only create notification for pending enrollments
  IF NEW.status = 'pending' THEN
    SELECT full_name INTO user_name FROM formacao.profiles WHERE id = NEW.user_id;
    SELECT title INTO course_title FROM formacao.courses WHERE id = NEW.course_id;
    
    INSERT INTO formacao.notifications (type, title, description, related_id)
    VALUES (
      'enrollment',
      'Nova Solicitação de Inscrição',
      COALESCE(user_name, 'Usuário') || ' solicitou inscrição no curso "' || COALESCE(course_title, 'Curso') || '"',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION formacao.create_user_registration_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'formacao', 'public', 'extensions'
AS $function$
BEGIN
  -- Only create notification for student registrations
  IF NEW.role = 'student' THEN
    INSERT INTO formacao.notifications (type, title, description, related_id)
    VALUES (
      'user_registration',
      'Novo Usuário Cadastrado',
      COALESCE(NEW.full_name, NEW.email) || ' se cadastrou na plataforma',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION formacao.get_daily_email_remaining()
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'formacao', 'public', 'extensions'
AS $function$
  SELECT COALESCE(100 - (SELECT sent_count FROM email_daily_usage WHERE usage_date = CURRENT_DATE), 100);
$function$
;

CREATE OR REPLACE FUNCTION formacao.get_user_role(user_id uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE
 SET search_path TO 'formacao', 'public', 'extensions'
AS $function$
  SELECT role FROM formacao.profiles WHERE id = user_id;
$function$
;

-- Correção: o papel não vem mais dos metadados do cadastro (qualquer pessoa podia se declarar admin).
CREATE OR REPLACE FUNCTION formacao.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'formacao', 'public', 'extensions' AS $function$
BEGIN
  INSERT INTO formacao.profiles (id, full_name, email, phone, role, user_type)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), NEW.email, NEW.raw_user_meta_data ->> 'phone', 'student', 'frequentador')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION formacao.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'formacao', 'public', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM formacao.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$
;

CREATE OR REPLACE FUNCTION formacao.increment_daily_email_usage(count integer DEFAULT 1)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'formacao', 'public', 'extensions'
AS $function$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO email_daily_usage (usage_date, sent_count)
  VALUES (CURRENT_DATE, count)
  ON CONFLICT (usage_date) 
  DO UPDATE SET sent_count = email_daily_usage.sent_count + count, updated_at = now()
  RETURNING sent_count INTO new_count;
  RETURN new_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION formacao.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'formacao', 'public', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM formacao.user_roles WHERE user_roles.user_id = is_admin.user_id AND role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION formacao.notify_enrollment_approved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'formacao', 'public', 'extensions'
AS $function$
BEGIN
  -- Notification via http disabled (extension not available)
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION formacao.prevent_profile_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'formacao', 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT formacao.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active AND NOT formacao.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change account activation';
  END IF;
  IF NEW.user_type IS DISTINCT FROM OLD.user_type AND NOT formacao.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change user type';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION formacao.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'formacao', 'public', 'extensions'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION formacao.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'formacao', 'public', 'extensions'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION formacao.update_user_last_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'formacao', 'public', 'extensions'
AS $function$
BEGIN
  UPDATE formacao.profiles
  SET last_activity_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON formacao.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON formacao.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON formacao.modules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON formacao.lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON formacao.email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER on_new_user_registration AFTER INSERT ON formacao.profiles FOR EACH ROW EXECUTE FUNCTION create_user_registration_notification();
CREATE TRIGGER on_new_enrollment AFTER INSERT ON formacao.enrollments FOR EACH ROW EXECUTE FUNCTION create_enrollment_notification();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON formacao.announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER on_enrollment_notify AFTER INSERT ON formacao.enrollments FOR EACH ROW EXECUTE FUNCTION notify_enrollment_approved();
CREATE TRIGGER on_lesson_progress_update_activity AFTER INSERT OR UPDATE ON formacao.lesson_progress FOR EACH ROW EXECUTE FUNCTION update_user_last_activity();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON formacao.books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_class_groups_updated_at BEFORE UPDATE ON formacao.class_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER check_capacity_after_enrollment AFTER INSERT ON formacao.enrollments FOR EACH ROW EXECUTE FUNCTION check_class_group_capacity();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON formacao.assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER esde_calendar_set_updated_at BEFORE UPDATE ON formacao.esde_calendar_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER prevent_profile_role_change_trg BEFORE UPDATE ON formacao.profiles FOR EACH ROW EXECUTE FUNCTION prevent_profile_role_change();
CREATE TRIGGER update_registration_pages_updated_at BEFORE UPDATE ON formacao.registration_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
alter table formacao.announcements enable row level security;
alter table formacao.assessment_answers enable row level security;
alter table formacao.assessment_attempts enable row level security;
alter table formacao.assessment_content_sources enable row level security;
alter table formacao.assessment_questions enable row level security;
alter table formacao.assessments enable row level security;
alter table formacao.attachments enable row level security;
alter table formacao.attendance_links enable row level security;
alter table formacao.attendance_records enable row level security;
alter table formacao.books enable row level security;
alter table formacao.class_groups enable row level security;
alter table formacao.courses enable row level security;
alter table formacao.dashboard_config enable row level security;
alter table formacao.email_campaigns enable row level security;
alter table formacao.email_daily_usage enable row level security;
alter table formacao.email_logs enable row level security;
alter table formacao.email_queue enable row level security;
alter table formacao.email_templates enable row level security;
alter table formacao.enrollments enable row level security;
alter table formacao.esde_calendar_entries enable row level security;
alter table formacao.lesson_progress enable row level security;
alter table formacao.lessons enable row level security;
alter table formacao.modules enable row level security;
alter table formacao.notifications enable row level security;
alter table formacao.profiles enable row level security;
alter table formacao.registration_pages enable row level security;
alter table formacao.user_roles enable row level security;
create policy "Admins can manage announcements" on formacao.announcements as permissive for all to public using (is_admin(auth.uid()));
create policy "Users can view active announcements" on formacao.announcements as permissive for select to public using (((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now()))));
create policy "Admins can view all answers" on formacao.assessment_answers as permissive for select to public using (is_admin(auth.uid()));
create policy "Students can manage own answers" on formacao.assessment_answers as permissive for all to public using ((EXISTS ( SELECT 1
   FROM assessment_attempts att
  WHERE ((att.id = assessment_answers.attempt_id) AND (att.user_id = auth.uid())))));
create policy "Admins can view all attempts" on formacao.assessment_attempts as permissive for select to public using (is_admin(auth.uid()));
create policy "Students can manage own attempts" on formacao.assessment_attempts as permissive for all to public using ((user_id = auth.uid()));
create policy "Admins can manage content sources" on formacao.assessment_content_sources as permissive for all to public using (is_admin(auth.uid()));
create policy "Admins can manage questions" on formacao.assessment_questions as permissive for all to public using (is_admin(auth.uid()));
create policy "Students can view questions of published assessments" on formacao.assessment_questions as permissive for select to public using ((EXISTS ( SELECT 1
   FROM (assessments a
     JOIN enrollments e ON ((e.course_id = a.course_id)))
  WHERE ((a.id = assessment_questions.assessment_id) AND (a.status = 'published'::assessment_status) AND (e.user_id = auth.uid()) AND (e.status = 'approved'::text)))));
create policy "Admins can manage assessments" on formacao.assessments as permissive for all to public using (is_admin(auth.uid()));
create policy "Students can view published assessments of enrolled courses" on formacao.assessments as permissive for select to public using (((status = 'published'::assessment_status) AND (EXISTS ( SELECT 1
   FROM enrollments e
  WHERE ((e.course_id = assessments.course_id) AND (e.user_id = auth.uid()) AND (e.status = 'approved'::text))))));
create policy "Admins can manage attachments" on formacao.attachments as permissive for all to public using (is_admin(auth.uid()));
create policy "Users can view attachments of enrolled courses" on formacao.attachments as permissive for select to public using (((EXISTS ( SELECT 1
   FROM ((lessons l
     JOIN modules m ON ((m.id = l.module_id)))
     JOIN enrollments e ON ((e.course_id = m.course_id)))
  WHERE ((l.id = attachments.lesson_id) AND (e.user_id = auth.uid()) AND (e.status = 'approved'::text)))) OR is_admin(auth.uid())));
create policy "Admins can manage attendance links" on formacao.attendance_links as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
create policy "Admins can delete attendance records" on formacao.attendance_records as permissive for delete to public using (has_role(auth.uid(), 'admin'::app_role));
create policy "Admins can read all attendance records" on formacao.attendance_records as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
create policy "Service role inserts attendance records" on formacao.attendance_records as permissive for insert to service_role with check (true);
create policy "Users can read own attendance records" on formacao.attendance_records as permissive for select to authenticated using ((user_id = auth.uid()));
create policy "Admins can delete books" on formacao.books as permissive for delete to public using (is_admin(auth.uid()));
create policy "Admins can insert books" on formacao.books as permissive for insert to public with check (is_admin(auth.uid()));
create policy "Admins can update books" on formacao.books as permissive for update to public using (is_admin(auth.uid()));
create policy "Books are viewable by everyone" on formacao.books as permissive for select to public using (true);
create policy "Admins can manage class_groups" on formacao.class_groups as permissive for all to public using (is_admin(auth.uid()));
create policy "Anyone can view class_groups" on formacao.class_groups as permissive for select to public using (true);
create policy "Admins can manage courses" on formacao.courses as permissive for all to public using (is_admin(auth.uid()));
create policy "Anyone can view published courses" on formacao.courses as permissive for select to public using (((status = 'published'::text) OR is_admin(auth.uid())));
create policy "Admins can manage dashboard config" on formacao.dashboard_config as permissive for all to public using (is_admin(auth.uid()));
create policy "Authenticated users can view dashboard config" on formacao.dashboard_config as permissive for select to authenticated using (true);
create policy "Admins can manage email campaigns" on formacao.email_campaigns as permissive for all to public using (is_admin(auth.uid()));
create policy "Admins can view email usage" on formacao.email_daily_usage as permissive for select to public using (is_admin(auth.uid()));
create policy "Service role can manage email usage" on formacao.email_daily_usage as permissive for all to service_role using (true) with check (true);
create policy "Admins can view all email logs" on formacao.email_logs as permissive for select to public using (is_admin(auth.uid()));
create policy "Service role can insert email logs" on formacao.email_logs as permissive for insert to service_role with check (true);
create policy "Service role can update email logs" on formacao.email_logs as permissive for update to service_role using (true) with check (true);
create policy "Admins can view email queue" on formacao.email_queue as permissive for select to public using (is_admin(auth.uid()));
create policy "Service role can manage email queue" on formacao.email_queue as permissive for all to service_role using (true) with check (true);
create policy "Admins can manage email templates" on formacao.email_templates as permissive for all to public using (is_admin(auth.uid()));
create policy "Admins can manage enrollments" on formacao.enrollments as permissive for all to public using (is_admin(auth.uid()));
create policy "Users can request enrollment" on formacao.enrollments as permissive for insert to public with check (((user_id = auth.uid()) OR is_admin(auth.uid())));
create policy "Users can view their enrollments" on formacao.enrollments as permissive for select to public using (((user_id = auth.uid()) OR is_admin(auth.uid())));
create policy "Admins can manage esde calendar" on formacao.esde_calendar_entries as permissive for all to public using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Anyone can view esde calendar" on formacao.esde_calendar_entries as permissive for select to public using (true);
create policy "Admins can view all progress" on formacao.lesson_progress as permissive for select to public using (is_admin(auth.uid()));
create policy "Users can manage their progress" on formacao.lesson_progress as permissive for all to public using ((user_id = auth.uid()));
create policy "Admins can manage lessons" on formacao.lessons as permissive for all to public using (is_admin(auth.uid()));
create policy "Users can view lessons of enrolled courses" on formacao.lessons as permissive for select to public using (((EXISTS ( SELECT 1
   FROM (modules m
     JOIN enrollments e ON ((e.course_id = m.course_id)))
  WHERE ((m.id = lessons.module_id) AND (e.user_id = auth.uid()) AND (e.status = 'approved'::text)))) OR is_admin(auth.uid())));
create policy "Admins can manage modules" on formacao.modules as permissive for all to public using (is_admin(auth.uid()));
create policy "Users can view modules of enrolled courses" on formacao.modules as permissive for select to public using (((EXISTS ( SELECT 1
   FROM enrollments e
  WHERE ((e.course_id = modules.course_id) AND (e.user_id = auth.uid()) AND (e.status = 'approved'::text)))) OR is_admin(auth.uid())));
create policy "Admins can update notifications" on formacao.notifications as permissive for update to public using (is_admin(auth.uid()));
create policy "Admins can view notifications" on formacao.notifications as permissive for select to public using (is_admin(auth.uid()));
create policy "Service role can insert notifications" on formacao.notifications as permissive for insert to service_role with check (true);
create policy "Admins can delete profiles" on formacao.profiles as permissive for delete to public using (is_admin(auth.uid()));
create policy "Admins can update all profiles" on formacao.profiles as permissive for update to public using (is_admin(auth.uid()));
create policy "Admins can view all profiles" on formacao.profiles as permissive for select to public using (is_admin(auth.uid()));
create policy "Allow insert for new users" on formacao.profiles as permissive for insert to public with check ((auth.uid() = id));
create policy "Users can update their own profile" on formacao.profiles as permissive for update to public using ((auth.uid() = id));
create policy "Users can view their own profile" on formacao.profiles as permissive for select to public using ((auth.uid() = id));
create policy "Admins can manage registration pages" on formacao.registration_pages as permissive for all to authenticated using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Anyone can view active registration pages" on formacao.registration_pages as permissive for select to public using ((is_active OR is_admin(auth.uid())));
create policy "Admins can manage roles" on formacao.user_roles as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role));
create policy "Admins can view all roles" on formacao.user_roles as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
create policy "Users can view their own roles" on formacao.user_roles as permissive for select to authenticated using ((user_id = auth.uid()));
grant usage on schema formacao to anon, authenticated, service_role;
grant all on all tables in schema formacao to anon, authenticated, service_role;
grant all on all sequences in schema formacao to anon, authenticated, service_role;
grant execute on all functions in schema formacao to anon, authenticated, service_role;
alter default privileges in schema formacao grant all on tables to anon, authenticated, service_role;
alter default privileges in schema formacao grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema formacao grant execute on functions to anon, authenticated, service_role;
