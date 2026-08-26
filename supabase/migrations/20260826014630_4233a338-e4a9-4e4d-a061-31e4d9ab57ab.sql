-- 1. Real manager / recruiter links
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS manager_id uuid,
  ADD COLUMN IF NOT EXISTS recruiter_id uuid;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_recruiter_id_fkey
    FOREIGN KEY (recruiter_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_profiles_recruiter_id ON public.profiles(recruiter_id);

-- 2. Shared name resolver: exact -> first+last word -> nickname -> trigram >= 0.6
CREATE OR REPLACE FUNCTION public.resolve_person_by_name(_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  n text := public.norm_person_name(_name);
  _id uuid;
  _first text;
  _last text;
BEGIN
  IF n IS NULL OR n = '' THEN RETURN NULL; END IF;

  -- owner name variants
  IF n IN ('matt', 'matt joyce', 'mathew joyce', 'mathew daniel joyce', 'math joyce', 'matthew joyce') THEN
    SELECT p.user_id INTO _id FROM public.profiles p
      JOIN public.user_roles r ON r.user_id = p.user_id AND r.role = 'owner'
     LIMIT 1;
    IF _id IS NOT NULL THEN RETURN _id; END IF;
  END IF;

  SELECT user_id INTO _id FROM public.profiles
   WHERE public.norm_person_name(full_name) = n AND NOT archived LIMIT 1;
  IF _id IS NOT NULL THEN RETURN _id; END IF;

  _first := split_part(n, ' ', 1);
  _last  := regexp_replace(n, '^.* ', '');
  IF _last <> _first THEN
    SELECT user_id INTO _id FROM public.profiles
     WHERE NOT archived
       AND split_part(public.norm_person_name(full_name), ' ', 1) = _first
       AND regexp_replace(public.norm_person_name(full_name), '^.* ', '') = _last
     LIMIT 1;
    IF _id IS NOT NULL THEN RETURN _id; END IF;
  END IF;

  SELECT user_id INTO _id FROM public.profiles
   WHERE nickname IS NOT NULL AND public.norm_person_name(nickname) = n AND NOT archived LIMIT 1;
  IF _id IS NOT NULL THEN RETURN _id; END IF;

  SELECT user_id INTO _id FROM public.profiles
   WHERE NOT archived
     AND similarity(public.norm_person_name(full_name), n) >= 0.6
   ORDER BY similarity(public.norm_person_name(full_name), n) DESC
   LIMIT 1;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_person_by_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_person_by_name(text) TO authenticated, service_role;

-- 3. One-time backfill from the legacy text columns
UPDATE public.profiles p
   SET manager_id = public.resolve_person_by_name(p.direct_manager)
 WHERE p.manager_id IS NULL
   AND coalesce(p.direct_manager, '') <> ''
   AND public.resolve_person_by_name(p.direct_manager) IS DISTINCT FROM p.user_id;

UPDATE public.profiles p
   SET recruiter_id = coalesce(
         p.recruited_by_user_id,
         public.resolve_person_by_name(coalesce(nullif(p.recruited_by_name, ''), p.recruiter)))
 WHERE p.recruiter_id IS NULL
   AND (p.recruited_by_user_id IS NOT NULL
        OR coalesce(p.recruited_by_name, '') <> ''
        OR coalesce(p.recruiter, '') <> '');

UPDATE public.profiles SET recruiter_id = NULL WHERE recruiter_id = user_id;

-- 4. Unresolved review list for Admin -> People
CREATE OR REPLACE FUNCTION public.get_unresolved_manager_links()
RETURNS TABLE(user_id uuid, full_name text, email text, legacy_manager text, legacy_recruiter text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.email, p.direct_manager, coalesce(nullif(p.recruited_by_name,''), p.recruiter)
    FROM public.profiles p
   WHERE NOT p.archived
     AND (
       (coalesce(p.direct_manager, '') <> '' AND p.manager_id IS NULL)
       OR (coalesce(nullif(p.recruited_by_name,''), p.recruiter, '') <> '' AND p.recruiter_id IS NULL)
     )
     AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
   ORDER BY p.full_name;
$$;

REVOKE ALL ON FUNCTION public.get_unresolved_manager_links() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unresolved_manager_links() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_manager_link(_user_id uuid, _manager_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _manager_id = _user_id THEN RAISE EXCEPTION 'a person cannot manage themselves'; END IF;
  UPDATE public.profiles SET manager_id = _manager_id, updated_at = now() WHERE user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_manager_link(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_manager_link(uuid, uuid) TO authenticated, service_role;

-- 5. One lifecycle RPC: membership is the source of truth, legacy columns are synced
CREATE OR REPLACE FUNCTION public.set_person_lifecycle(
  _user_id uuid, _vertical text, _new_status text, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _v text := coalesce(_vertical, 'Pest');
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
          OR public.is_president_of(auth.uid(), _v)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _new_status NOT IN ('applied','approved','onboarding','active','paused','departed','archived') THEN
    RAISE EXCEPTION 'unknown lifecycle status: %', _new_status;
  END IF;

  INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, activated_at, applied_at, approved_at)
  VALUES (_user_id, _v,
          CASE WHEN _new_status IN ('departed','archived') THEN 'paused' ELSE _new_status END,
          CASE WHEN _new_status = 'active' THEN now() ELSE NULL END,
          CASE WHEN _new_status = 'applied' THEN now() ELSE NULL END,
          CASE WHEN _new_status IN ('approved','active','onboarding') THEN now() ELSE NULL END)
  ON CONFLICT (user_id, vertical) DO UPDATE
    SET status = CASE WHEN _new_status IN ('departed','archived') THEN 'paused' ELSE _new_status END,
        activated_at = CASE WHEN _new_status = 'active' THEN coalesce(public.rep_vertical_enrollments.activated_at, now())
                            ELSE public.rep_vertical_enrollments.activated_at END,
        approved_at = CASE WHEN _new_status IN ('approved','active','onboarding')
                            THEN coalesce(public.rep_vertical_enrollments.approved_at, now())
                            ELSE public.rep_vertical_enrollments.approved_at END,
        updated_at = now();

  -- keep the derived legacy columns in step for anything still reading them
  UPDATE public.profiles p SET
    approved = (_new_status IN ('approved','onboarding','active')),
    archived = (_new_status = 'archived'),
    archived_at = CASE WHEN _new_status = 'archived' THEN coalesce(p.archived_at, now()) ELSE NULL END,
    archived_reason = CASE WHEN _new_status = 'archived' THEN coalesce(_reason, p.archived_reason) ELSE p.archived_reason END,
    onboarding_status = CASE
      WHEN _new_status = 'onboarding' THEN 'in_progress'
      WHEN _new_status = 'active' THEN 'complete'
      ELSE 'pending' END,
    status = CASE
      WHEN _new_status = 'active' THEN 'active'::user_status
      WHEN _new_status = 'onboarding' THEN 'onboarded'::user_status
      WHEN _new_status = 'approved' THEN 'contract_signed'::user_status
      WHEN _new_status = 'applied' THEN 'pending'::user_status
      WHEN _new_status IN ('departed','archived') THEN 'nlc'::user_status
      ELSE p.status END,
    status_detail = coalesce(_reason, p.status_detail),
    updated_at = now()
  WHERE p.user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_person_lifecycle(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_person_lifecycle(uuid, text, text, text) TO authenticated, service_role;

-- 6. Archive replaces delete; hard delete is owner-only and only after a year archived
CREATE OR REPLACE FUNCTION public.archive_person(_user_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _v text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT coalesce(active_vertical, vertical, 'Pest') INTO _v FROM public.profiles WHERE user_id = _user_id;
  PERFORM public.set_person_lifecycle(_user_id, _v, 'archived', _reason);
END;
$$;

REVOKE ALL ON FUNCTION public.archive_person(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_person(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.owner_hard_delete_person(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _archived_at timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN RAISE EXCEPTION 'owner only'; END IF;
  SELECT archived_at INTO _archived_at FROM public.profiles WHERE user_id = _user_id AND archived;
  IF _archived_at IS NULL OR _archived_at > now() - interval '1 year' THEN
    RAISE EXCEPTION 'a person can only be deleted after a year archived';
  END IF;
  DELETE FROM public.profiles WHERE user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.owner_hard_delete_person(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_hard_delete_person(uuid) TO authenticated, service_role;

-- archiving creates or reopens the lead row designated to the manager (now via manager_id)
CREATE OR REPLACE FUNCTION public.ensure_lead_on_access_loss()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _mgr uuid; _mgr_name text;
BEGIN
  IF (NEW.archived AND NOT COALESCE(OLD.archived,false))
     OR (COALESCE(OLD.approved,false) AND NOT COALESCE(NEW.approved,false)) THEN

    _mgr := NEW.manager_id;
    IF _mgr IS NULL THEN
      _mgr := public.resolve_person_by_name(NEW.direct_manager);
    END IF;
    SELECT full_name INTO _mgr_name FROM public.profiles WHERE user_id = _mgr;

    INSERT INTO public.people_leads (profile_id, full_name, email, phone, source, roster_status,
                                     designated_to, designation_status, former_manager_name)
    VALUES (NEW.id, NEW.full_name, NEW.email, NEW.phone, 'roster', 'not_on_roster',
            _mgr, CASE WHEN _mgr IS NULL THEN 'free' ELSE 'designated' END,
            coalesce(_mgr_name, NEW.direct_manager))
    ON CONFLICT (profile_id) DO UPDATE
      SET designated_to = COALESCE(public.people_leads.designated_to, EXCLUDED.designated_to),
          designation_status = CASE
            WHEN public.people_leads.designated_to IS NOT NULL THEN public.people_leads.designation_status
            WHEN EXCLUDED.designated_to IS NOT NULL THEN 'designated'
            ELSE 'free' END,
          roster_status = 'not_on_roster',
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Staff access rule: owner/admin are active in every workspace, presidents in their own
CREATE OR REPLACE FUNCTION public.sync_staff_workspace_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, activated_at, approved_at)
  SELECT r.user_id, vp.vertical, 'active', now(), now()
    FROM public.user_roles r
    CROSS JOIN public.vertical_paths vp
   WHERE r.role IN ('owner','admin')
  ON CONFLICT (user_id, vertical) DO UPDATE
    SET status = 'active',
        activated_at = coalesce(public.rep_vertical_enrollments.activated_at, now()),
        approved_at = coalesce(public.rep_vertical_enrollments.approved_at, now()),
        updated_at = now();

  INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, activated_at, approved_at)
  SELECT p.user_id, p.vertical, 'active', now(), now()
    FROM public.profiles p
   WHERE p.runs_vertical AND p.vertical IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.vertical_paths vp WHERE vp.vertical = p.vertical)
  ON CONFLICT (user_id, vertical) DO UPDATE
    SET status = 'active',
        activated_at = coalesce(public.rep_vertical_enrollments.activated_at, now()),
        approved_at = coalesce(public.rep_vertical_enrollments.approved_at, now()),
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.sync_staff_workspace_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_staff_workspace_access() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_staff_workspace_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_staff_workspace_access();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS staff_access_on_role_change ON public.user_roles;
CREATE TRIGGER staff_access_on_role_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_staff_workspace_access();

DROP TRIGGER IF EXISTS staff_access_on_new_workspace ON public.vertical_paths;
CREATE TRIGGER staff_access_on_new_workspace
  AFTER INSERT OR UPDATE ON public.vertical_paths
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_staff_workspace_access();

SELECT public.sync_staff_workspace_access();