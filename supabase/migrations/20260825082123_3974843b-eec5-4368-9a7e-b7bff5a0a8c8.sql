-- ============ 1. REP TRIAGE ============
CREATE TABLE public.rep_triage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  bucket text NOT NULL DEFAULT 'watch',
  note text,
  moved_by uuid,
  moved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rep_triage_bucket_check CHECK (bucket IN ('cut','watch','help','promote'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_triage TO authenticated;
GRANT ALL ON public.rep_triage TO service_role;
ALTER TABLE public.rep_triage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers manage rep triage" ON public.rep_triage
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_rep_triage_updated_at BEFORE UPDATE ON public.rep_triage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2. ACTION ITEMS ============
CREATE TABLE public.action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  assigned_to uuid NOT NULL,
  created_by uuid,
  due_date date,
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'open',
  completed_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT action_items_status_check CHECK (status IN ('open','done')),
  CONSTRAINT action_items_source_check CHECK (source IN ('manager-meeting','one-on-one','manual'))
);

CREATE INDEX idx_action_items_assignee_status ON public.action_items(assigned_to, status);
CREATE INDEX idx_action_items_due ON public.action_items(due_date) WHERE status = 'open';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_items TO authenticated;
GRANT ALL ON public.action_items TO service_role;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or staff read all action items" ON public.action_items
  FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Staff create action items" ON public.action_items
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'manager')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
      OR assigned_to = auth.uid()
    )
  );

CREATE POLICY "Assignee or staff update action items" ON public.action_items
  FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Creator or staff delete action items" ON public.action_items
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE TRIGGER update_action_items_updated_at BEFORE UPDATE ON public.action_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 3. CAR GROUPS ============
CREATE TABLE public.car_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_date date NOT NULL,
  car_name text NOT NULL,
  driver_user_id uuid,
  driver_name text,
  area text,
  published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_car_groups_date ON public.car_groups(group_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_groups TO authenticated;
GRANT ALL ON public.car_groups TO service_role;
ALTER TABLE public.car_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone reads published cars" ON public.car_groups
  FOR SELECT TO authenticated
  USING (
    published
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Managers manage cars" ON public.car_groups
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_car_groups_updated_at BEFORE UPDATE ON public.car_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.car_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_group_id uuid NOT NULL REFERENCES public.car_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (car_group_id, user_id)
);

CREATE INDEX idx_car_group_members_user ON public.car_group_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_group_members TO authenticated;
GRANT ALL ON public.car_group_members TO service_role;
ALTER TABLE public.car_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own seat or staff read all" ON public.car_group_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.car_groups g
      WHERE g.id = car_group_id AND g.published
    )
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Managers manage car seats" ON public.car_group_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- ============ 4. OVERDUE ACTION ITEM REMINDER ============
CREATE OR REPLACE FUNCTION public.notify_due_action_items()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  sent integer := 0;
  today_et date := (now() AT TIME ZONE 'America/New_York')::date;
BEGIN
  FOR r IN
    SELECT a.id, a.title, a.assigned_to, a.due_date
    FROM public.action_items a
    JOIN public.profiles p ON p.user_id = a.assigned_to AND p.archived = false
    WHERE a.status = 'open'
      AND a.notified_at IS NULL
      AND a.due_date IS NOT NULL
      AND a.due_date <= today_et
  LOOP
    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (
      r.assigned_to,
      'Action item due',
      r.title || ' — due ' || to_char(r.due_date, 'Mon DD'),
      '/app'
    );
    UPDATE public.action_items SET notified_at = now() WHERE id = r.id;
    sent := sent + 1;
  END LOOP;

  RETURN sent;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_due_action_items() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_due_action_items() TO authenticated, service_role;

SELECT cron.schedule(
  'summit-action-item-due',
  '5 13 * * *',
  $$SELECT public.notify_due_action_items();$$
);