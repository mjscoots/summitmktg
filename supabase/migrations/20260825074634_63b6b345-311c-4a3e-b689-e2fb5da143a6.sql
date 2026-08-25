-- ============ REP HOUSING ============
CREATE TABLE public.rep_housing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  monthly_cost numeric,
  location text,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_housing TO authenticated;
GRANT ALL ON public.rep_housing TO service_role;

ALTER TABLE public.rep_housing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own housing" ON public.rep_housing
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins manage housing" ON public.rep_housing
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_rep_housing_updated_at
  BEFORE UPDATE ON public.rep_housing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REP COMMISSION ============
CREATE TABLE public.rep_commission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  pay_scale text NOT NULL DEFAULT 'rookie',
  signs integer NOT NULL DEFAULT 0,
  avg_account_value numeric,
  active_revenue numeric,
  rate_override numeric,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rep_commission_pay_scale_check CHECK (pay_scale IN ('rookie', 'veteran', 'marketing'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_commission TO authenticated;
GRANT ALL ON public.rep_commission TO service_role;

ALTER TABLE public.rep_commission ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own commission" ON public.rep_commission
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins manage commission" ON public.rep_commission
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_rep_commission_updated_at
  BEFORE UPDATE ON public.rep_commission
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ASSISTANT FAQ ============
CREATE TABLE public.assistant_faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  published boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_faq TO authenticated;
GRANT ALL ON public.assistant_faq TO service_role;

ALTER TABLE public.assistant_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed in users read published faq" ON public.assistant_faq
  FOR SELECT TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins manage faq" ON public.assistant_faq
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_assistant_faq_updated_at
  BEFORE UPDATE ON public.assistant_faq
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ASSISTANT LOGS ============
CREATE TABLE public.assistant_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question text NOT NULL,
  answer text,
  role_at_ask text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.assistant_logs TO authenticated;
GRANT ALL ON public.assistant_logs TO service_role;

ALTER TABLE public.assistant_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own assistant logs" ON public.assistant_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE INDEX idx_assistant_logs_created_at ON public.assistant_logs (created_at DESC);
CREATE INDEX idx_rep_housing_user ON public.rep_housing (user_id);
CREATE INDEX idx_rep_commission_user ON public.rep_commission (user_id);