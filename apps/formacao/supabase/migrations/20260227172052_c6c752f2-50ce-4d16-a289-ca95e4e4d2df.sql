
-- 1. Create class_groups (turmas) table
CREATE TABLE public.class_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Turma 1',
  vacancy_type TEXT NOT NULL DEFAULT 'unlimited',
  max_students INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage class_groups" ON public.class_groups FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view class_groups" ON public.class_groups FOR SELECT USING (true);

CREATE TRIGGER update_class_groups_updated_at
BEFORE UPDATE ON public.class_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add class_group_id to enrollments (nullable initially for migration)
ALTER TABLE public.enrollments ADD COLUMN class_group_id UUID REFERENCES public.class_groups(id);

-- 3. Create default "Turma 1" for every existing course
INSERT INTO public.class_groups (course_id, name)
SELECT id, 'Turma 1' FROM public.courses;

-- 4. Link existing enrollments to their course's default turma
UPDATE public.enrollments e
SET class_group_id = cg.id
FROM public.class_groups cg
WHERE cg.course_id = e.course_id;

-- 5. Make class_group_id NOT NULL now that all rows have values
ALTER TABLE public.enrollments ALTER COLUMN class_group_id SET NOT NULL;

-- 6. Create auto-close trigger: when turma reaches capacity, close the course
CREATE OR REPLACE FUNCTION public.check_class_group_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _vacancy_type TEXT;
  _max_students INT;
  _current_count INT;
  _course_id UUID;
BEGIN
  SELECT cg.vacancy_type, cg.max_students, cg.course_id
  INTO _vacancy_type, _max_students, _course_id
  FROM public.class_groups cg
  WHERE cg.id = NEW.class_group_id;

  IF _vacancy_type = 'limited' AND _max_students IS NOT NULL THEN
    SELECT COUNT(*) INTO _current_count
    FROM public.enrollments
    WHERE class_group_id = NEW.class_group_id AND status = 'approved';

    IF _current_count >= _max_students THEN
      UPDATE public.courses SET enrollment_open = false WHERE id = _course_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_capacity_after_enrollment
AFTER INSERT ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.check_class_group_capacity();
