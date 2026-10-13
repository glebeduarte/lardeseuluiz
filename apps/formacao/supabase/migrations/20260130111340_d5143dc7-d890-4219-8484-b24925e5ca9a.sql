-- Create email_logs table to track all sent emails
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email_to TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resend_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view email logs
CREATE POLICY "Admins can view all email logs"
ON public.email_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Service role can insert logs (from edge functions)
CREATE POLICY "Service role can insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (true);

-- Service role can update logs
CREATE POLICY "Service role can update email logs"
ON public.email_logs
FOR UPDATE
USING (true);

-- Create index for faster queries
CREATE INDEX idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX idx_email_logs_email_type ON public.email_logs(email_type);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);