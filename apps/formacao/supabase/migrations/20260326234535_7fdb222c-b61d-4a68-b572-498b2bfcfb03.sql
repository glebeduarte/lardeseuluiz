-- Fix lesson 6-8: remove lesson-guide wrapper and fix callout classes
UPDATE lessons SET description = replace(replace(replace(replace(replace(replace(replace(replace(
  description,
  '<div class="lesson-guide">', ''),
  'callout-spirit', 'callout-tip'),
  '<span class="callout-icon">🙏</span>', ''),
  '<span class="callout-icon">✍️</span>', ''),
  '<span class="callout-icon">💡</span>', ''),
  '<span class="affirmation-icon">amental</span>', ''),
  '<span class="affirmation-icon">🙏</span>', ''),
  '<hr class="divider" />', '<hr>')
WHERE module_id = '6406c963-cd6d-4883-9db2-08c10db81e4e' AND order_index IN (6,7,8);

-- Fix callout labels to match design system uppercase pattern
UPDATE lessons SET description = replace(replace(
  description,
  '<strong>Para o trabalhador espírita</strong>', '<strong>💡 OLHAR ESPÍRITA</strong>'),
  '<strong>Perguntas para reflexão pessoal</strong>', '<strong>🎯 PERGUNTAS PARA REFLEXÃO PESSOAL</strong>')
WHERE module_id = '6406c963-cd6d-4883-9db2-08c10db81e4e' AND order_index IN (6,7,8);

-- Fix callout inner div wrapper (remove extra nested div)
UPDATE lessons SET description = replace(replace(
  description,
  E'callout-tip">\n<div>\n<strong>', E'callout-tip">\n<strong>'),
  E'callout-exercise">\n<div>\n<strong>', E'callout-exercise">\n<strong>')
WHERE module_id = '6406c963-cd6d-4883-9db2-08c10db81e4e' AND order_index IN (6,7,8);