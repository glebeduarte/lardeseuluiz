
-- Enums for assessment system
CREATE TYPE public.assessment_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.assessment_position_type AS ENUM ('after_module', 'before_module', 'end_of_course', 'between_lessons');
CREATE TYPE public.assessment_show_answers AS ENUM ('always', 'never', 'on_pass');
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'true_false', 'multiple_answer', 'ordering', 'fill_blank', 'essay');

-- Assessments table
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status assessment_status NOT NULL DEFAULT 'draft',
  position_type assessment_position_type NOT NULL DEFAULT 'end_of_course',
  position_module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  position_lesson_after_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  requires_completion BOOLEAN NOT NULL DEFAULT true,
  passing_score INTEGER NOT NULL DEFAULT 70,
  max_attempts INTEGER DEFAULT NULL,
  time_limit_minutes INTEGER DEFAULT NULL,
  shuffle_questions BOOLEAN NOT NULL DEFAULT true,
  shuffle_alternatives BOOLEAN NOT NULL DEFAULT true,
  show_answers_after assessment_show_answers NOT NULL DEFAULT 'on_pass',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessment questions
CREATE TABLE public.assessment_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_type question_type NOT NULL DEFAULT 'multiple_choice',
  statement TEXT NOT NULL,
  alternatives JSONB,
  correct_answer TEXT,
  explanation TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  needs_review BOOLEAN NOT NULL DEFAULT false,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessment attempts
CREATE TABLE public.assessment_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  score INTEGER,
  passed BOOLEAN,
  time_spent_seconds INTEGER
);

-- Assessment answers
CREATE TABLE public.assessment_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  answer_given TEXT,
  is_correct BOOLEAN,
  points_earned NUMERIC DEFAULT 0
);

-- Assessment content sources
CREATE TABLE public.assessment_content_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  file_path TEXT,
  content_text TEXT
);

-- Enable RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_content_sources ENABLE ROW LEVEL SECURITY;

-- RLS: assessments
CREATE POLICY "Admins can manage assessments" ON public.assessments FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Students can view published assessments of enrolled courses" ON public.assessments FOR SELECT USING (
  status = 'published' AND EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.course_id = assessments.course_id AND e.user_id = auth.uid() AND e.status = 'approved'
  )
);

-- RLS: assessment_questions
CREATE POLICY "Admins can manage questions" ON public.assessment_questions FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Students can view questions of published assessments" ON public.assessment_questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.assessments a
    JOIN public.enrollments e ON e.course_id = a.course_id
    WHERE a.id = assessment_questions.assessment_id AND a.status = 'published' AND e.user_id = auth.uid() AND e.status = 'approved'
  )
);

-- RLS: assessment_attempts
CREATE POLICY "Admins can view all attempts" ON public.assessment_attempts FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Students can manage own attempts" ON public.assessment_attempts FOR ALL USING (user_id = auth.uid());

-- RLS: assessment_answers
CREATE POLICY "Admins can view all answers" ON public.assessment_answers FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Students can manage own answers" ON public.assessment_answers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.assessment_attempts att WHERE att.id = assessment_answers.attempt_id AND att.user_id = auth.uid())
);

-- RLS: assessment_content_sources
CREATE POLICY "Admins can manage content sources" ON public.assessment_content_sources FOR ALL USING (is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
