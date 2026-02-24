
-- =============================================
-- 1. downline_edges: organizational relationship edge table
-- =============================================
CREATE TABLE public.downline_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL,
  child_user_id uuid NOT NULL,
  edge_type text NOT NULL DEFAULT 'manages' CHECK (edge_type IN ('manages', 'recruited')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_user_id, child_user_id, edge_type)
);

-- RLS
ALTER TABLE public.downline_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all edges"
  ON public.downline_edges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view edges"
  ON public.downline_edges FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view own edges"
  ON public.downline_edges FOR SELECT
  USING (auth.uid() = child_user_id OR auth.uid() = parent_user_id);

-- Index for fast lookups
CREATE INDEX idx_downline_edges_parent ON public.downline_edges (parent_user_id);
CREATE INDEX idx_downline_edges_child ON public.downline_edges (child_user_id);

-- Enable realtime for edge changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.downline_edges;

-- =============================================
-- 2. Seed downline_edges from existing direct_manager data
-- =============================================
INSERT INTO public.downline_edges (parent_user_id, child_user_id, edge_type)
SELECT DISTINCT
  manager.user_id AS parent_user_id,
  child.user_id AS child_user_id,
  'manages' AS edge_type
FROM public.profiles child
INNER JOIN public.profiles manager ON child.direct_manager = manager.full_name
WHERE child.direct_manager IS NOT NULL
  AND child.status <> 'nlc'
  AND child.user_id <> manager.user_id
ON CONFLICT DO NOTHING;

-- =============================================
-- 3. assignment_conflicts: track sync conflicts
-- =============================================
CREATE TABLE public.assignment_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conflict_type text NOT NULL CHECK (conflict_type IN ('manager_conflict', 'needs_manager', 'missing_team')),
  old_manager_id uuid,
  new_manager_id uuid,
  old_team_id uuid,
  new_team_id uuid,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

ALTER TABLE public.assignment_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage conflicts"
  ON public.assignment_conflicts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view conflicts"
  ON public.assignment_conflicts FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role));

-- =============================================
-- 4. scheduling_requests: 1:1 meeting scheduling
-- =============================================
CREATE TABLE public.scheduling_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  proposed_times jsonb NOT NULL DEFAULT '[]',
  chosen_time timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'reschedule_requested', 'completed', 'cancelled')),
  form_type text NOT NULL DEFAULT 'weekly_1on1',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE public.scheduling_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduling requests"
  ON public.scheduling_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Authenticated users can create scheduling requests"
  ON public.scheduling_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Participants can update scheduling requests"
  ON public.scheduling_requests FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Admins can manage all scheduling requests"
  ON public.scheduling_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_scheduling_requests_requester ON public.scheduling_requests (requester_id);
CREATE INDEX idx_scheduling_requests_recipient ON public.scheduling_requests (recipient_id);
CREATE INDEX idx_scheduling_requests_status ON public.scheduling_requests (status);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduling_requests;

-- =============================================
-- 5. New RPC: get_downline_from_edges (replaces text-based direct_manager lookup)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_downline_from_edges(_manager_user_id uuid)
RETURNS TABLE(
  profile_id uuid,
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  role app_role,
  direct_manager text,
  team_name text,
  status user_status,
  last_active_at timestamptz,
  is_active_now boolean,
  time_this_week_minutes integer,
  depth integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE downline AS (
    -- Direct reports from edge table
    SELECT
      e.child_user_id AS uid,
      1 AS lvl
    FROM downline_edges e
    WHERE e.parent_user_id = _manager_user_id
      AND e.edge_type = 'manages'

    UNION ALL

    -- Recursive reports
    SELECT
      e.child_user_id AS uid,
      d.lvl + 1 AS lvl
    FROM downline_edges e
    INNER JOIN downline d ON e.parent_user_id = d.uid
    WHERE e.edge_type = 'manages'
      AND d.lvl < 10
  )
  SELECT
    p.id AS profile_id,
    p.user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    COALESCE(get_user_role(p.user_id), 'rookie') AS role,
    p.direct_manager,
    t.name AS team_name,
    p.status,
    p.last_active_at,
    p.is_active_now,
    COALESCE(p.time_this_week_minutes, 0) AS time_this_week_minutes,
    dl.lvl AS depth
  FROM downline dl
  INNER JOIN profiles p ON p.user_id = dl.uid
  LEFT JOIN teams t ON p.team_id = t.id
  WHERE p.status <> 'nlc'
  ORDER BY dl.lvl, p.full_name;
END;
$$;

-- Seed conflicts for users missing manager or team
INSERT INTO public.assignment_conflicts (user_id, conflict_type)
SELECT p.user_id, 'needs_manager'
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
WHERE p.direct_manager IS NULL
  AND p.status = 'active'
  AND ur.role = 'rookie'
ON CONFLICT DO NOTHING;

INSERT INTO public.assignment_conflicts (user_id, conflict_type)
SELECT p.user_id, 'missing_team'
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
WHERE p.team_id IS NULL
  AND p.status = 'active'
  AND ur.role = 'rookie'
ON CONFLICT DO NOTHING;
