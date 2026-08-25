-- ============ PROFILE COMPLETENESS + ALUMNI ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS shirt_size text,
  ADD COLUMN IF NOT EXISTS alumni boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_alumni ON public.profiles(alumni) WHERE alumni = true;

-- ============ SEASON HUB ============
ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS housing_notes text,
  ADD COLUMN IF NOT EXISTS travel_notes text;

CREATE TABLE IF NOT EXISTS public.season_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES public.seasons(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.season_checklist_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.season_checklist_items TO authenticated;
GRANT ALL ON public.season_checklist_items TO service_role;
ALTER TABLE public.season_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_read_authenticated" ON public.season_checklist_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist_manage_admin" ON public.season_checklist_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_season_checklist_updated
  BEFORE UPDATE ON public.season_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ BACKUP SNAPSHOTS ============
CREATE TABLE IF NOT EXISTS public.backup_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  file_bytes bigint NOT NULL DEFAULT 0,
  table_count integer NOT NULL DEFAULT 0,
  row_count integer NOT NULL DEFAULT 0,
  trigger_source text NOT NULL DEFAULT 'cron',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.backup_snapshots TO authenticated;
GRANT ALL ON public.backup_snapshots TO service_role;
ALTER TABLE public.backup_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backups_read_admin" ON public.backup_snapshots
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- ============ AUDIT LOG ============
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_label text,
  field text,
  before_value text,
  after_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_read_owner" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE OR REPLACE FUNCTION public.write_audit(
  _action text, _entity_type text, _entity_id text, _entity_label text,
  _field text, _before text, _after text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  SELECT full_name INTO _name FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  INSERT INTO public.audit_log(actor_id, actor_name, action, entity_type, entity_id, entity_label, field, before_value, after_value)
  VALUES (auth.uid(), COALESCE(_name, 'system'), _action, _entity_type, _entity_id, _entity_label, _field, _before, _after);
END; $$;

REVOKE ALL ON FUNCTION public.write_audit(text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;

-- role changes
CREATE OR REPLACE FUNCTION public.audit_user_roles() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _label text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO _label FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
    PERFORM public.write_audit('role_granted','user_role', NEW.user_id::text, _label, 'role', NULL, NEW.role::text);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      SELECT full_name INTO _label FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
      PERFORM public.write_audit('role_changed','user_role', NEW.user_id::text, _label, 'role', OLD.role::text, NEW.role::text);
    END IF;
    RETURN NEW;
  ELSE
    SELECT full_name INTO _label FROM public.profiles WHERE user_id = OLD.user_id LIMIT 1;
    PERFORM public.write_audit('role_revoked','user_role', OLD.user_id::text, _label, 'role', OLD.role::text, NULL);
    RETURN OLD;
  END IF;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles();

-- profile archive / restore / alumni / deletion
CREATE OR REPLACE FUNCTION public.audit_profiles() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit('profile_deleted','profile', OLD.user_id::text, OLD.full_name, NULL, OLD.status::text, NULL);
    RETURN OLD;
  END IF;
  IF NEW.archived IS DISTINCT FROM OLD.archived THEN
    PERFORM public.write_audit(
      CASE WHEN NEW.archived THEN 'profile_archived' ELSE 'profile_restored' END,
      'profile', NEW.user_id::text, NEW.full_name, 'archived',
      OLD.archived::text, NEW.archived::text);
  END IF;
  IF NEW.alumni IS DISTINCT FROM OLD.alumni THEN
    PERFORM public.write_audit(
      CASE WHEN NEW.alumni THEN 'alumni_set' ELSE 'alumni_cleared' END,
      'profile', NEW.user_id::text, NEW.full_name, 'alumni',
      OLD.alumni::text, NEW.alumni::text);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
  AFTER UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_profiles();

-- lead reassignment / deletion
CREATE OR REPLACE FUNCTION public.audit_recruiting_leads() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _before text; _after text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit('lead_deleted','lead', OLD.id::text, OLD.first_name, NULL, OLD.status, NULL);
    RETURN OLD;
  END IF;
  IF NEW.claimed_by IS DISTINCT FROM OLD.claimed_by THEN
    SELECT full_name INTO _before FROM public.profiles WHERE user_id = OLD.claimed_by LIMIT 1;
    SELECT full_name INTO _after FROM public.profiles WHERE user_id = NEW.claimed_by LIMIT 1;
    PERFORM public.write_audit('lead_reassigned','lead', NEW.id::text, NEW.first_name, 'claimed_by',
      COALESCE(_before,'unclaimed'), COALESCE(_after,'unclaimed'));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_recruiting_leads ON public.recruiting_leads;
CREATE TRIGGER trg_audit_recruiting_leads
  AFTER UPDATE OR DELETE ON public.recruiting_leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_recruiting_leads();

-- owner-only audit reader with filters
CREATE OR REPLACE FUNCTION public.get_audit_log(_action text DEFAULT NULL, _entity text DEFAULT NULL, _days integer DEFAULT 30, _limit integer DEFAULT 200)
RETURNS TABLE(id uuid, actor_name text, action text, entity_type text, entity_label text, field text, before_value text, after_value text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.actor_name, a.action, a.entity_type, a.entity_label, a.field, a.before_value, a.after_value, a.created_at
  FROM public.audit_log a
  WHERE public.has_role(auth.uid(), 'owner')
    AND (_action IS NULL OR a.action = _action)
    AND (_entity IS NULL OR a.entity_type = _entity)
    AND a.created_at > now() - (COALESCE(_days,30) || ' days')::interval
  ORDER BY a.created_at DESC
  LIMIT LEAST(COALESCE(_limit,200), 500);
$$;

REVOKE ALL ON FUNCTION public.get_audit_log(text,text,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_log(text,text,integer,integer) TO authenticated;

-- alumni / archive state setter (admin+owner)
CREATE OR REPLACE FUNCTION public.set_roster_state(_user_id uuid, _state text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _state = 'active' THEN
    UPDATE public.profiles SET archived = false, alumni = false, archived_at = NULL, archived_reason = NULL WHERE user_id = _user_id;
  ELSIF _state = 'archived' THEN
    UPDATE public.profiles SET archived = true, alumni = false, archived_at = now() WHERE user_id = _user_id;
  ELSIF _state = 'alumni' THEN
    UPDATE public.profiles SET archived = true, alumni = true, archived_at = now(), archived_reason = COALESCE(archived_reason,'alumni') WHERE user_id = _user_id;
  ELSE
    RAISE EXCEPTION 'invalid state';
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.set_roster_state(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_roster_state(uuid, text) TO authenticated;

-- profile completeness for team directory
CREATE OR REPLACE FUNCTION public.get_incomplete_profiles()
RETURNS TABLE(user_id uuid, full_name text, missing text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.full_name,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN COALESCE(p.avatar_url,'') = '' THEN 'photo' END,
      CASE WHEN COALESCE(p.phone,'') = '' THEN 'phone' END,
      CASE WHEN COALESCE(p.emergency_contact_phone,'') = '' THEN 'emergency contact' END,
      CASE WHEN COALESCE(p.shirt_size,'') = '' THEN 'shirt size' END
    ], NULL)
  FROM public.profiles p
  WHERE p.archived = false AND p.alumni = false
    AND (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
    AND (COALESCE(p.avatar_url,'') = '' OR COALESCE(p.phone,'') = ''
         OR COALESCE(p.emergency_contact_phone,'') = '' OR COALESCE(p.shirt_size,'') = '');
$$;

REVOKE ALL ON FUNCTION public.get_incomplete_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_incomplete_profiles() TO authenticated;

-- season hub payload
CREATE OR REPLACE FUNCTION public.get_season_hub()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', s.id, 'name', s.name, 'starts_on', s.starts_on, 'ends_on', s.ends_on,
    'housing_notes', s.housing_notes, 'travel_notes', s.travel_notes,
    'checklist', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'label', c.label) ORDER BY c.sort_order)
                           FROM public.season_checklist_items c
                           WHERE c.is_active AND (c.season_id = s.id OR c.season_id IS NULL)), '[]'::jsonb),
    'roster', COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', p.user_id, 'full_name', p.full_name,
                                                           'avatar_url', p.avatar_url, 'office_name', p.office_name)
                                         ORDER BY p.full_name)
                        FROM public.profiles p
                        WHERE p.archived = false AND p.alumni = false AND p.approved = true), '[]'::jsonb)
  ) END
  FROM (SELECT * FROM public.seasons WHERE starts_on > CURRENT_DATE ORDER BY starts_on ASC LIMIT 1) s;
$$;

REVOKE ALL ON FUNCTION public.get_season_hub() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_season_hub() TO authenticated;