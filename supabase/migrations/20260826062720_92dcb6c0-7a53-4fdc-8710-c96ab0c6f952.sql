-- =========================================================
-- 1. CHAT UPLOADS: private bucket policies
-- =========================================================
CREATE OR REPLACE FUNCTION public.chat_attachment_readable(_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    (storage.foldername(_object_name))[1] = auth.uid()::text
    OR public.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.content LIKE '%' || _object_name
    )
  );
$$;
REVOKE ALL ON FUNCTION public.chat_attachment_readable(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_attachment_readable(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can view chat uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public can view chat uploads" ON storage.objects;
DROP POLICY IF EXISTS "Chat members can read chat uploads" ON storage.objects;
CREATE POLICY "Chat members can read chat uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-uploads' AND public.chat_attachment_readable(name));

DROP POLICY IF EXISTS "Authenticated users can upload chat files" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
-- 2. SECURITY DEFINER EXECUTE GRANTS
-- =========================================================
DO $$
DECLARE
  r record;
  keep_anon text[] := ARRAY[
    'get_public_calc','get_public_counters','get_public_cover_content',
    'get_public_fiber_stacks','get_public_industry','get_public_setting',
    'get_recruiting_content','get_recruiting_proof','get_ticket_config',
    'get_ticket_series_status','resolve_source_code','validate_access_code',
    'has_role','is_staff','is_manager_tier','is_paired_manager_of',
    'is_vertical_lead','region_lead_of','is_president_of_vertical'
  ];
  internal_only text[] := ARRAY[
    'open_lead_on_departure','resolve_person_by_name','sync_staff_workspace_access',
    'chat_attachment_readable'
  ];
BEGIN
  FOR r IN
    SELECT p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           (p.prorettype = 'trigger'::regtype) AS is_trigger
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', r.proname, r.args);

    IF r.is_trigger OR r.proname = ANY(internal_only) THEN
      CONTINUE;
    END IF;

    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);

    IF r.proname = ANY(keep_anon) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon', r.proname, r.args);
    END IF;
  END LOOP;
END;
$$;

-- Staff-only routines that lacked an in-body caller check
CREATE OR REPLACE FUNCTION public.get_unresolved_manager_links()
RETURNS TABLE(user_id uuid, full_name text, email text, legacy_manager text, legacy_recruiter text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT p.user_id, p.full_name, p.email, p.direct_manager,
         coalesce(nullif(p.recruited_by_name,''), p.recruiter)
    FROM public.profiles p
   WHERE NOT p.archived
     AND public.is_staff(auth.uid())
     AND (
       (coalesce(p.direct_manager, '') <> '' AND p.manager_id IS NULL)
       OR (coalesce(nullif(p.recruited_by_name,''), p.recruiter, '') <> '' AND p.recruiter_id IS NULL)
     )
   ORDER BY p.full_name;
$$;
REVOKE ALL ON FUNCTION public.get_unresolved_manager_links() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unresolved_manager_links() TO authenticated, service_role;

-- =========================================================
-- 3. RLS WITHOUT POLICY: documented as service-only
-- =========================================================
COMMENT ON TABLE public.backup_job_tokens IS
  'Internal only. RLS is enabled with no policies on purpose: only the service role (weekly backup edge function) may read or write these tokens. No Data API grants for anon or authenticated.';

-- =========================================================
-- 4. PUBLIC FORM HARDENING
-- =========================================================
CREATE OR REPLACE FUNCTION public.submission_client_key()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE _h json; _ip text;
BEGIN
  BEGIN
    _h := current_setting('request.headers', true)::json;
  EXCEPTION WHEN others THEN
    _h := NULL;
  END;
  _ip := coalesce(
    split_part(coalesce(_h ->> 'x-forwarded-for', ''), ',', 1),
    ''
  );
  IF coalesce(_ip, '') = '' THEN _ip := coalesce(auth.uid()::text, 'unknown'); END IF;
  RETURN btrim(_ip);
END;
$$;
REVOKE ALL ON FUNCTION public.submission_client_key() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submission_client_key() TO service_role;

CREATE OR REPLACE FUNCTION public.valid_public_email(_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _email IS NOT NULL AND length(_email) <= 254
     AND _email ~ '^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$';
$$;

CREATE OR REPLACE FUNCTION public.valid_public_phone(_phone text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _phone IS NOT NULL AND length(_phone) <= 30
     AND length(regexp_replace(_phone, '[^0-9]', '', 'g')) BETWEEN 10 AND 15;
$$;

-- applications
CREATE OR REPLACE FUNCTION public.harden_application_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE _existing uuid;
BEGIN
  NEW.full_name := btrim(NEW.full_name);
  NEW.email := lower(btrim(NEW.email));
  NEW.phone := btrim(NEW.phone);

  IF coalesce(NEW.full_name,'') = '' OR length(NEW.full_name) > 120
     OR NOT public.valid_public_email(NEW.email)
     OR NOT public.valid_public_phone(NEW.phone)
     OR length(coalesce(NEW.city_state,'')) > 120
     OR length(coalesce(NEW.previous_company,'')) > 120
     OR length(coalesce(NEW.referral_source,'')) > 2000
     OR length(coalesce(NEW.notes,'')) > 2000 THEN
    RAISE EXCEPTION 'That did not go through. Check the phone and email and try again.';
  END IF;

  IF auth.uid() IS NULL AND NOT public.check_rate_limit(
       'public-form:' || public.submission_client_key(), 5, 3600) THEN
    RAISE EXCEPTION 'That did not go through. Check the phone and email and try again.';
  END IF;

  SELECT a.id INTO _existing
    FROM public.applications a
   WHERE a.created_at > now() - interval '24 hours'
     AND (lower(a.email) = NEW.email
          OR regexp_replace(coalesce(a.phone,''), '[^0-9]', '', 'g')
             = regexp_replace(NEW.phone, '[^0-9]', '', 'g'))
   ORDER BY a.created_at DESC
   LIMIT 1;

  IF _existing IS NOT NULL THEN
    UPDATE public.applications
       SET full_name = NEW.full_name,
           email = NEW.email,
           phone = NEW.phone,
           city_state = coalesce(NEW.city_state, city_state),
           referral_source = coalesce(NEW.referral_source, referral_source),
           years_experience = coalesce(NEW.years_experience, years_experience),
           previous_company = coalesce(NEW.previous_company, previous_company),
           application_type = coalesce(NEW.application_type, application_type),
           vertical = coalesce(NEW.vertical, vertical),
           source_type = coalesce(NEW.source_type, source_type),
           source_code = coalesce(NEW.source_code, source_code),
           referrer_user_id = coalesce(NEW.referrer_user_id, referrer_user_id),
           partner_id = coalesce(NEW.partner_id, partner_id)
     WHERE id = _existing;
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS harden_application_submission ON public.applications;
CREATE TRIGGER harden_application_submission
BEFORE INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.harden_application_submission();

-- vet leads
CREATE OR REPLACE FUNCTION public.harden_vet_lead_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE _existing uuid;
BEGIN
  NEW.full_name := btrim(NEW.full_name);
  NEW.email := lower(btrim(NEW.email));
  NEW.phone := btrim(NEW.phone);

  IF coalesce(NEW.full_name,'') = '' OR length(NEW.full_name) > 120
     OR NOT public.valid_public_email(NEW.email)
     OR NOT public.valid_public_phone(NEW.phone)
     OR length(coalesce(NEW.current_company,'')) > 120
     OR length(coalesce(NEW.years_d2d,'')) > 120
     OR length(coalesce(NEW.markets,'')) > 2000
     OR length(coalesce(NEW.best_time_to_call,'')) > 120
     OR length(coalesce(NEW.notes,'')) > 2000 THEN
    RAISE EXCEPTION 'That did not go through. Check the phone and email and try again.';
  END IF;

  SELECT v.id INTO _existing
    FROM public.vet_leads v
   WHERE v.created_at > now() - interval '24 hours'
     AND (lower(v.email) = NEW.email
          OR regexp_replace(coalesce(v.phone,''), '[^0-9]', '', 'g')
             = regexp_replace(NEW.phone, '[^0-9]', '', 'g'))
   ORDER BY v.created_at DESC
   LIMIT 1;

  IF _existing IS NOT NULL THEN
    UPDATE public.vet_leads
       SET full_name = NEW.full_name,
           email = NEW.email,
           phone = NEW.phone,
           current_company = coalesce(NEW.current_company, current_company),
           years_d2d = coalesce(NEW.years_d2d, years_d2d),
           last_season_active_revenue = coalesce(NEW.last_season_active_revenue, last_season_active_revenue),
           markets = coalesce(NEW.markets, markets),
           best_time_to_call = coalesce(NEW.best_time_to_call, best_time_to_call),
           bid_requested = NEW.bid_requested OR bid_requested,
           updated_at = now()
     WHERE id = _existing;
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS harden_vet_lead_submission ON public.vet_leads;
CREATE TRIGGER harden_vet_lead_submission
BEFORE INSERT ON public.vet_leads
FOR EACH ROW EXECUTE FUNCTION public.harden_vet_lead_submission();

-- tickets (recruiting_leads inserted from the public ticket page)
CREATE OR REPLACE FUNCTION public.harden_recruiting_lead_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE _existing uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;

  NEW.first_name := btrim(NEW.first_name);
  NEW.phone := btrim(NEW.phone);

  IF coalesce(NEW.first_name,'') = '' OR length(NEW.first_name) > 120
     OR NOT public.valid_public_phone(NEW.phone)
     OR length(coalesce(NEW.city,'')) > 120
     OR length(coalesce(NEW.interest_reason,'')) > 2000
     OR length(coalesce(NEW.story,'')) > 2000
     OR length(coalesce(NEW.notes,'')) > 2000
     OR length(coalesce(NEW.ref_code,'')) > 60 THEN
    RAISE EXCEPTION 'That did not go through. Check the phone and email and try again.';
  END IF;

  IF NOT public.check_rate_limit(
       'public-form:' || public.submission_client_key(), 5, 3600) THEN
    RAISE EXCEPTION 'That did not go through. Check the phone and email and try again.';
  END IF;

  SELECT l.id INTO _existing
    FROM public.recruiting_leads l
   WHERE l.created_at > now() - interval '24 hours'
     AND regexp_replace(coalesce(l.phone,''), '[^0-9]', '', 'g')
         = regexp_replace(NEW.phone, '[^0-9]', '', 'g')
   ORDER BY l.created_at DESC
   LIMIT 1;

  IF _existing IS NOT NULL THEN
    UPDATE public.recruiting_leads
       SET first_name = NEW.first_name,
           phone = NEW.phone,
           city = coalesce(NEW.city, city),
           interest_reason = coalesce(NEW.interest_reason, interest_reason),
           ref_code = coalesce(NEW.ref_code, ref_code),
           vertical = coalesce(NEW.vertical, vertical),
           source_type = coalesce(NEW.source_type, source_type),
           source_code = coalesce(NEW.source_code, source_code),
           referrer_user_id = coalesce(NEW.referrer_user_id, referrer_user_id),
           partner_id = coalesce(NEW.partner_id, partner_id),
           last_activity_at = now()
     WHERE id = _existing;
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS harden_recruiting_lead_submission ON public.recruiting_leads;
CREATE TRIGGER harden_recruiting_lead_submission
BEFORE INSERT ON public.recruiting_leads
FOR EACH ROW EXECUTE FUNCTION public.harden_recruiting_lead_submission();
