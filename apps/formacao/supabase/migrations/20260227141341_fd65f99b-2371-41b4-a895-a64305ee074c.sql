
-- Create email_campaigns table to track sent campaigns
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sent',
  recipient_emails TEXT[] NOT NULL DEFAULT '{}',
  recipient_names TEXT[] NOT NULL DEFAULT '{}',
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Only admins can manage campaigns
CREATE POLICY "Admins can manage email campaigns"
  ON public.email_campaigns
  FOR ALL
  USING (is_admin(auth.uid()));
