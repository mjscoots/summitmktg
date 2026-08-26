-- Staff workspace access: owner/admin get every workspace, president gets their own.
CREATE OR REPLACE FUNCTION public.sync_staff_workspace_access(_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Owners and admins: active in every vertical, including coming_soon.
  INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, activated_at, approved_at)
  SELECT ur.user_id, v.vertical, 'active', now(), now()
  FROM public.user_roles ur
  CROSS JOIN public.verticals v
  WHERE ur.role IN ('owner', 'admin')
    AND (_user_id IS NULL OR ur.user_id = _user_id)
  ON CONFLICT (user_id, vertical) DO UPDATE
    SET status = 'active',
        activated_at = COALESCE(public.rep_vertical_enrollments.activated_at, now()),
        approved_at = COALESCE(public.rep_vertical_enrollments.approved_at, now()),
        rejected_at = NULL,
        reject_reason = NULL,
        updated_at = now()
    WHERE public.rep_vertical_enrollments.status <> 'active';

  -- Presidents: active in the vertical they run.
  INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, activated_at, approved_at)
  SELECT v.president_user_id, v.vertical, 'active', now(), now()
  FROM public.verticals v
  WHERE v.president_user_id IS NOT NULL
    AND (_user_id IS NULL OR v.president_user_id = _user_id)
  ON CONFLICT (user_id, vertical) DO UPDATE
    SET status = 'active',
        activated_at = COALESCE(public.rep_vertical_enrollments.activated_at, now()),
        approved_at = COALESCE(public.rep_vertical_enrollments.approved_at, now()),
        rejected_at = NULL,
        reject_reason = NULL,
        updated_at = now()
    WHERE public.rep_vertical_enrollments.status <> 'active';
END;
$$;

REVOKE ALL ON FUNCTION public.sync_staff_workspace_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_staff_workspace_access(uuid) TO service_role;

-- Trigger: role granted or changed
CREATE OR REPLACE FUNCTION public.tg_staff_access_on_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_staff_workspace_access(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_access_on_role ON public.user_roles;
CREATE TRIGGER staff_access_on_role
AFTER INSERT OR UPDATE OF role ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.tg_staff_access_on_role();

-- Trigger: new vertical, or president assigned/changed
CREATE OR REPLACE FUNCTION public.tg_staff_access_on_vertical()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_staff_workspace_access(NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_access_on_vertical ON public.verticals;
CREATE TRIGGER staff_access_on_vertical
AFTER INSERT OR UPDATE OF president_user_id ON public.verticals
FOR EACH ROW EXECUTE FUNCTION public.tg_staff_access_on_vertical();

-- Backfill existing staff
SELECT public.sync_staff_workspace_access(NULL);