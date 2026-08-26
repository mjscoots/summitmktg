CREATE OR REPLACE FUNCTION public.get_my_workspaces()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _res jsonb; _active text; _staff boolean;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('workspaces','[]'::jsonb); END IF;

  SELECT active_vertical INTO _active FROM public.profiles WHERE user_id = _uid;
  _staff := public.has_role(_uid,'owner') OR public.has_role(_uid,'admin');

  SELECT jsonb_build_object(
    'active_vertical', _active,
    'workspaces', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'vertical', v.vertical,
        'slug', v.slug,
        'name', v.name,
        'short_name', v.short_name,
        'unit', v.unit,
        'accent_token', v.accent_token,
        'theme', COALESCE(v.theme, '{}'::jsonb),
        'status', v.status,
        'display_order', v.display_order,
        'is_president', (v.president_user_id = _uid),
        'president_name', (SELECT pp.full_name FROM public.profiles pp WHERE pp.user_id = v.president_user_id),
        'membership_status', COALESCE(e.status, CASE WHEN _staff THEN 'active' ELSE NULL END),
        'reject_reason', e.reject_reason,
        'approvers', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'user_id', aid,
            'name', (SELECT ap.full_name FROM public.profiles ap WHERE ap.user_id = aid),
            'decision', (SELECT va.decision FROM public.vertical_application_approvals va
                          WHERE va.approver_user_id = aid
                            AND va.application_id = (SELECT a.id FROM public.vertical_applications a
                                                      WHERE a.user_id = _uid AND a.vertical = v.vertical
                                                      ORDER BY a.created_at DESC LIMIT 1))
          ))
          FROM unnest(v.required_approver_ids) AS aid
        ), '[]'::jsonb)
      ) ORDER BY v.display_order)
      FROM public.verticals v
      LEFT JOIN public.rep_vertical_enrollments e ON e.user_id = _uid AND e.vertical = v.vertical
    ), '[]'::jsonb)
  ) INTO _res;

  RETURN _res;
END;
$function$;