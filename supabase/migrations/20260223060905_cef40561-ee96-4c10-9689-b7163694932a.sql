
-- Table to log every inactivity email sent
CREATE TABLE public.inactivity_email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_type TEXT NOT NULL, -- 'day_3_user', 'day_4_user', 'day_3_pillar', 'day_4_pillar'
  subject TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  days_inactive INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  returned_within_24h BOOLEAN DEFAULT false,
  returned_within_48h BOOLEAN DEFAULT false,
  returned_within_7d BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to track ongoing inactivity state per user
CREATE TABLE public.inactive_users_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  started_inactive_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  days_count INTEGER NOT NULL DEFAULT 0,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  email_day_3_sent BOOLEAN NOT NULL DEFAULT false,
  email_day_4_sent BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inactivity_email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inactive_users_log ENABLE ROW LEVEL SECURITY;

-- RLS: Admins and managers can read logs
CREATE POLICY "Admins can manage inactivity email log"
  ON public.inactivity_email_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view inactivity email log"
  ON public.inactivity_email_log FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can manage inactive users log"
  ON public.inactive_users_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view inactive users log"
  ON public.inactive_users_log FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role));

-- Index for quick lookups
CREATE INDEX idx_inactive_users_log_user_id ON public.inactive_users_log(user_id);
CREATE INDEX idx_inactivity_email_log_user_id ON public.inactivity_email_log(user_id);
CREATE INDEX idx_inactive_users_log_resolved ON public.inactive_users_log(resolved_at) WHERE resolved_at IS NULL;
