
-- Remove old category check constraint first
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_category_check;

-- Update ESDE and EDE courses to "formacoes" first
UPDATE courses 
SET category = 'formacoes' 
WHERE LOWER(title) LIKE '%esde%' OR LOWER(title) LIKE '%ede%';

-- Update all other courses to "cursos_extras"
UPDATE courses 
SET category = 'cursos_extras' 
WHERE category != 'formacoes' OR category IS NULL;

-- Now add the new constraint after data is updated
ALTER TABLE courses ADD CONSTRAINT courses_category_check 
CHECK (category IN ('formacoes', 'cursos_extras'));
