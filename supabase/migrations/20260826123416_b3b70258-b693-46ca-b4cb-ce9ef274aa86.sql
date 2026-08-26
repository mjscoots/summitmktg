CREATE OR REPLACE FUNCTION public.set_person_lifecycle(_user_id uuid, _vertical text, _new_status text, _reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _v text := coalesce(_vertical, 'Pest');
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
          OR public.is_president_of(auth.uid(), _v)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _new_status NOT IN ('applied','approved','onboarding','active','paused','departed','archived') THEN
    RAISE EXCEPTION 'unknown lifecycle status: %', _new_status;
  END IF;

  IF _new_status IN ('departed','archived') THEN
    DELETE FROM public.rep_vertical_enrollments
     WHERE user_id = _user_id AND vertical = _v;
  ELSIF _new_status = 'paused' THEN
    UPDATE public.rep_vertical_enrollments
       SET updated_at = now()
     WHERE user_id = _user_id AND vertical = _v;
  ELSE
    INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, activated_at, applied_at, approved_at)
    VALUES (_user_id, _v,
            CASE WHEN _new_status = 'applied' THEN 'interested' ELSE _new_status END,
            CASE WHEN _new_status = 'active' THEN now() ELSE NULL END,
            CASE WHEN _new_status = 'applied' THEN now() ELSE NULL END,
            CASE WHEN _new_status IN ('approved','active','onboarding') THEN now() ELSE NULL END)
    ON CONFLICT (user_id, vertical) DO UPDATE
      SET status = CASE WHEN _new_status = 'applied' THEN 'interested' ELSE _new_status END,
          activated_at = CASE WHEN _new_status = 'active' THEN coalesce(public.rep_vertical_enrollments.activated_at, now())
                              ELSE public.rep_vertical_enrollments.activated_at END,
          approved_at = CASE WHEN _new_status IN ('approved','active','onboarding')
                              THEN coalesce(public.rep_vertical_enrollments.approved_at, now())
                              ELSE public.rep_vertical_enrollments.approved_at END,
          updated_at = now();
  END IF;

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

  IF _new_status = 'departed' THEN
    PERFORM public.open_lead_on_departure(_user_id, _reason);
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_person_lifecycle(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_person_lifecycle(uuid, text, text, text) TO authenticated, service_role;