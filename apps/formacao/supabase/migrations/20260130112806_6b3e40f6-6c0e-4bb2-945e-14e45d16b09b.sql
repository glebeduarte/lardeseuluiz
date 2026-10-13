-- Create email_templates table for storing editable email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  description TEXT,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can manage email templates"
ON public.email_templates
FOR ALL
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default templates
INSERT INTO public.email_templates (template_key, name, subject, description, variables, html_content) VALUES
(
  'welcome',
  'Email de Boas-vindas',
  'Bem-vindo(a) ao Lar Seu Luiz - Formação!',
  'Enviado automaticamente quando um novo usuário se cadastra na plataforma.',
  ARRAY['{{full_name}}', '{{dashboard_url}}'],
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🌟 Bem-vindo(a)!</h1>
    </div>
    <div style="background-color: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
        Olá, <strong>{{full_name}}</strong>! 👋
      </p>
      <p style="font-size: 16px; color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
        É com grande alegria que lhe damos as boas-vindas à plataforma de formação do <strong>Lar Seu Luiz</strong>!
      </p>
      <p style="font-size: 16px; color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
        Aqui você encontrará cursos e materiais de estudo que irão auxiliar no seu desenvolvimento espiritual e no trabalho voluntário.
      </p>
      <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 16px;">📚 Próximos passos:</h3>
        <ul style="color: #6b7280; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Explore os cursos disponíveis</li>
          <li>Solicite sua inscrição nos cursos de interesse</li>
          <li>Acompanhe seu progresso na plataforma</li>
        </ul>
      </div>
      <div style="text-align: center; margin-top: 32px;">
        <a href="{{dashboard_url}}" 
           style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Acessar Plataforma
        </a>
      </div>
      <p style="font-size: 14px; color: #9ca3af; margin-top: 32px; text-align: center;">
        Com carinho,<br>
        <strong>Equipe Lar Seu Luiz</strong>
      </p>
    </div>
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px;">
      Este email foi enviado automaticamente. Por favor, não responda.
    </p>
  </div>
</body>
</html>'
),
(
  'enrollment_approved',
  'Inscrição Aprovada',
  'Sua inscrição foi aprovada! 🎉',
  'Enviado quando a inscrição de um aluno em um curso é aprovada.',
  ARRAY['{{full_name}}', '{{course_title}}', '{{course_url}}'],
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Inscrição Aprovada!</h1>
    </div>
    <div style="background-color: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
        Olá, <strong>{{full_name}}</strong>! 👋
      </p>
      <p style="font-size: 16px; color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
        Temos uma ótima notícia! Sua inscrição no curso <strong>{{course_title}}</strong> foi aprovada.
      </p>
      <p style="font-size: 16px; color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
        Você já pode acessar todo o conteúdo do curso e começar seus estudos.
      </p>
      <div style="text-align: center; margin-top: 32px;">
        <a href="{{course_url}}" 
           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Acessar Curso
        </a>
      </div>
      <p style="font-size: 14px; color: #9ca3af; margin-top: 32px; text-align: center;">
        Com carinho,<br>
        <strong>Equipe Lar Seu Luiz</strong>
      </p>
    </div>
  </div>
</body>
</html>'
),
(
  'new_content',
  'Novo Conteúdo Disponível',
  'Novo conteúdo disponível no seu curso! 📚',
  'Enviado quando novo conteúdo é adicionado a um curso.',
  ARRAY['{{full_name}}', '{{course_title}}', '{{lesson_title}}', '{{course_url}}'],
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">📚 Novo Conteúdo!</h1>
    </div>
    <div style="background-color: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
        Olá, <strong>{{full_name}}</strong>! 👋
      </p>
      <p style="font-size: 16px; color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
        Uma nova aula foi adicionada ao curso <strong>{{course_title}}</strong>:
      </p>
      <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="color: #374151; margin: 0; font-size: 18px; font-weight: 600;">{{lesson_title}}</p>
      </div>
      <div style="text-align: center; margin-top: 32px;">
        <a href="{{course_url}}" 
           style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Ver Aula
        </a>
      </div>
      <p style="font-size: 14px; color: #9ca3af; margin-top: 32px; text-align: center;">
        Com carinho,<br>
        <strong>Equipe Lar Seu Luiz</strong>
      </p>
    </div>
  </div>
</body>
</html>'
);