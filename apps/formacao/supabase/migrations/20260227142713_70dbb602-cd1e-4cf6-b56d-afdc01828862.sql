
-- Table to track daily email usage
CREATE TABLE public.email_daily_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  sent_count integer NOT NULL DEFAULT 0,
  daily_limit integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(usage_date)
);

ALTER TABLE public.email_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email usage" ON public.email_daily_usage
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage email usage" ON public.email_daily_usage
  FOR ALL USING (true) WITH CHECK (true);

-- Email queue for scheduled/pending emails
CREATE TABLE public.email_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  html_content text NOT NULL,
  email_type text NOT NULL DEFAULT 'bulk_email',
  campaign_id uuid REFERENCES public.email_campaigns(id),
  status text NOT NULL DEFAULT 'queued',
  scheduled_for date,
  sent_at timestamp with time zone,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email queue" ON public.email_queue
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage email queue" ON public.email_queue
  FOR ALL USING (true) WITH CHECK (true);

-- Function to get remaining emails for today
CREATE OR REPLACE FUNCTION public.get_daily_email_remaining()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(100 - (SELECT sent_count FROM email_daily_usage WHERE usage_date = CURRENT_DATE), 100);
$$;

-- Function to increment daily usage
CREATE OR REPLACE FUNCTION public.increment_daily_email_usage(count integer DEFAULT 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;
