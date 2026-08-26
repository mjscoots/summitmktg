CREATE OR REPLACE FUNCTION public.enroll_vertical_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _app RECORD;
  _vert text;
BEGIN
  IF NEW.status = 'active' AND COALESCE(OLD.status::text,'') <> 'active' AND NEW.email IS NOT NULL THEN
    SELECT * INTO _app FROM public.applications
      WHERE lower(email) = lower(NEW.email) AND vertical IS NOT NULL
      ORDER BY created_at DESC LIMIT 1;

    IF _app.id IS NOT NULL AND EXISTS (SELECT 1 FROM public.verticals WHERE vertical = _app.vertical) THEN
      _vert := _app.vertical;
      INSERT INTO public.rep_vertical_enrollments
        (user_id, vertical, status, source_type, source_code, referrer_user_id, partner_id)
      VALUES (NEW.user_id, _vert, 'approved', _app.source_type, _app.source_code,
              _app.referrer_user_id, _app.partner_id)
      ON CONFLICT (user_id, vertical) DO UPDATE
        SET status = CASE WHEN public.rep_vertical_enrollments.status IN ('interested','applied')
                          THEN 'approved' ELSE public.rep_vertical_enrollments.status END,
            updated_at = now();
    ELSE
      _vert := 'Pest';
      INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status)
      VALUES (NEW.user_id, 'Pest', 'approved')
      ON CONFLICT (user_id, vertical) DO NOTHING;
    END IF;

    NEW.active_vertical := COALESCE(NEW.active_vertical, _vert);
  END IF;
  RETURN NEW;
END;
$function$;