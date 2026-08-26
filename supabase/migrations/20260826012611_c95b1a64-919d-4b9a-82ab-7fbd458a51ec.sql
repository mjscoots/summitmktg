CREATE TABLE IF NOT EXISTS public.reactivation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text,
  vertical text,
  worked_under text,
  notes text,
  status text NOT NULL DEFAULT 'open',
  reset_row_id uuid REFERENCES public.access_reset_2027(id) ON DELETE SET NULL,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.reactivation_requests TO authenticated;
GRANT ALL ON public.reactivation_requests TO service_role;

ALTER TABLE public.reactivation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactivation own read" ON public.reactivation_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "reactivation own insert" ON public.reactivation_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reactivation staff read" ON public.reactivation_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "reactivation staff write" ON public.reactivation_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_reactivation_updated_at
  BEFORE UPDATE ON public.reactivation_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_reactivation_status ON public.reactivation_requests(status);

-- What the signed-in person is allowed to see right now.
CREATE OR REPLACE FUNCTION public.get_my_access_state()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'archived', COALESCE(p.archived, false),
    'alumni', COALESCE(p.alumni, false),
    'approved', COALESCE(p.approved, false),
    'has_role', EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()),
    'in_reset', EXISTS (SELECT 1 FROM public.access_reset_2027 a
                         WHERE a.user_id = auth.uid() AND a.restored_at IS NULL),
    'reset_reason', (SELECT a.reason FROM public.access_reset_2027 a
                      WHERE a.user_id = auth.uid() AND a.restored_at IS NULL LIMIT 1),
    'request_status', (SELECT rr.status FROM public.reactivation_requests rr
                        WHERE rr.user_id = auth.uid()
                        ORDER BY rr.created_at DESC LIMIT 1)
  )
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.submit_reactivation_request(
  _full_name text, _phone text, _vertical text, _worked_under text, _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _archived boolean; _row uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in');
  END IF;
  SELECT COALESCE(archived, false) INTO _archived FROM public.profiles WHERE user_id = auth.uid();
  IF _archived THEN
    RETURN jsonb_build_object('success', false, 'error', 'This account is no longer active.');
  END IF;
  IF COALESCE(trim(_full_name), '') = '' OR COALESCE(trim(_phone), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Name and phone are required');
  END IF;
  IF EXISTS (SELECT 1 FROM public.reactivation_requests
              WHERE user_id = auth.uid() AND status = 'open') THEN
    RETURN jsonb_build_object('success', true, 'already', true);
  END IF;

  SELECT id INTO _row FROM public.access_reset_2027
   WHERE user_id = auth.uid() AND restored_at IS NULL LIMIT 1;

  INSERT INTO public.reactivation_requests
    (user_id, full_name, phone, vertical, worked_under, notes, reset_row_id)
  VALUES (auth.uid(), trim(_full_name), trim(_phone), _vertical, _worked_under, _notes, _row);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Admin -> People -> Restore access.
CREATE OR REPLACE FUNCTION public.get_access_reset_rows(_search text DEFAULT NULL)
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, email text, roles text[], status text,
  direct_manager text, team_name text, rank_name text, vertical text, region_id uuid,
  reason text, was_archived boolean, last_active_at timestamptz, revenue_to_date numeric,
  restored_at timestamptz, request_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.user_id, a.full_name, a.email, a.roles::text[], a.status,
         a.direct_manager, t.name, rk.name, a.vertical, a.region_id,
         a.reason, a.was_archived, p.last_active_at, p.revenue_to_date,
         a.restored_at,
         (SELECT rr.id FROM public.reactivation_requests rr
           WHERE rr.user_id = a.user_id AND rr.status = 'open'
           ORDER BY rr.created_at DESC LIMIT 1)
  FROM public.access_reset_2027 a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  LEFT JOIN public.teams t ON t.id = a.team_id
  LEFT JOIN public.ranks rk ON rk.id = a.rank_id
  WHERE (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
    AND (_search IS NULL OR a.full_name ILIKE '%' || _search || '%'
         OR a.email ILIKE '%' || _search || '%')
  ORDER BY a.full_name
$$;

CREATE OR REPLACE FUNCTION public.restore_access(
  _user_id uuid,
  _role app_role DEFAULT NULL,
  _manager text DEFAULT NULL,
  _owner_override boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE snap record; use_role app_role; use_manager text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
  END IF;

  SELECT * INTO snap FROM public.access_reset_2027
   WHERE user_id = _user_id AND restored_at IS NULL LIMIT 1;
  IF snap IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No reset row for this person');
  END IF;

  IF snap.reason = 'parks_removed' THEN
    IF NOT public.has_role(auth.uid(), 'owner') OR NOT _owner_override THEN
      RETURN jsonb_build_object('success', false, 'error', 'Removed — owner override required');
    END IF;
  END IF;

  use_role := COALESCE(_role, (snap.roles)[1]::app_role, 'rookie'::app_role);
  use_manager := COALESCE(NULLIF(trim(COALESCE(_manager, '')), ''), snap.direct_manager);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, use_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles
     SET approved = true,
         archived = false,
         archived_at = NULL,
         archived_reason = NULL,
         status = COALESCE(snap.status::user_status, 'active'::user_status),
         direct_manager = use_manager,
         team_id = COALESCE(team_id, snap.team_id),
         rank_id = COALESCE(rank_id, snap.rank_id),
         region_id = COALESCE(region_id, snap.region_id)
   WHERE user_id = _user_id;

  UPDATE public.access_reset_2027
     SET restored_at = now(), restored_by = auth.uid()
   WHERE id = snap.id;

  UPDATE public.reactivation_requests
     SET status = 'restored', decided_by = auth.uid(), decided_at = now()
   WHERE user_id = _user_id AND status = 'open';

  PERFORM public.write_audit('restore_access', 'profile', _user_id::text, snap.full_name,
                             'role', NULL, use_role::text);

  RETURN jsonb_build_object('success', true, 'role', use_role::text, 'manager', use_manager);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_reactivation_requests()
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, phone text, vertical text,
  worked_under text, notes text, status text, reset_row_id uuid, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.user_id, r.full_name, r.phone, r.vertical,
         r.worked_under, r.notes, r.status, r.reset_row_id, r.created_at
  FROM public.reactivation_requests r
  WHERE (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
    AND r.status = 'open'
  ORDER BY r.created_at
$$;

CREATE OR REPLACE FUNCTION public.dismiss_reactivation_request(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
  END IF;
  UPDATE public.reactivation_requests
     SET status = 'dismissed', decided_by = auth.uid(), decided_at = now()
   WHERE id = _id;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_access_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_reactivation_request(text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_access_reset_rows(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_access(uuid, app_role, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_reactivation_requests() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dismiss_reactivation_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_access_state() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_reactivation_request(text, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_access_reset_rows(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_access(uuid, app_role, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_reactivation_requests() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dismiss_reactivation_request(uuid) TO authenticated, service_role;