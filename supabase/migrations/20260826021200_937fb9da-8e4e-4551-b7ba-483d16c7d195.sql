ALTER TABLE public.verticals
  ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Pest: existing dark blue institutional theme
UPDATE public.verticals SET theme = jsonb_build_object(
  'mode','dark',
  'background','216 60% 5%',
  'surface','218 45% 10%',
  'foreground','210 20% 96%',
  'muted','215 15% 62%',
  'border','216 30% 18%',
  'accent','217 90% 53%',
  'texture','none',
  'texture_opacity',0
) WHERE vertical = 'Pest';

-- Fiber: dark green, optional faint camo texture
UPDATE public.verticals SET theme = jsonb_build_object(
  'mode','dark',
  'background','150 30% 5%',
  'surface','152 26% 10%',
  'foreground','140 15% 95%',
  'muted','145 10% 62%',
  'border','150 20% 18%',
  'accent','152 55% 42%',
  'texture','camo',
  'texture_opacity',0.05
) WHERE vertical = 'Fiber';

-- Life: light theme
UPDATE public.verticals SET theme = jsonb_build_object(
  'mode','light',
  'background','0 0% 100%',
  'surface','220 20% 97%',
  'foreground','220 25% 12%',
  'muted','220 10% 40%',
  'border','220 15% 88%',
  'accent','220 65% 45%',
  'texture','none',
  'texture_opacity',0
) WHERE vertical = 'Life';

CREATE OR REPLACE FUNCTION public.set_vertical_theme(_vertical text, _theme jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT (
    public.has_role(_uid, 'owner') OR public.has_role(_uid, 'admin')
    OR EXISTS (SELECT 1 FROM public.verticals v WHERE v.vertical = _vertical AND v.president_user_id = _uid)
  ) THEN
    RAISE EXCEPTION 'Not allowed to change this workspace theme';
  END IF;
  UPDATE public.verticals SET theme = _theme WHERE vertical = _vertical;
END;
$$;

REVOKE ALL ON FUNCTION public.set_vertical_theme(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_vertical_theme(text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_workspaces()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _res jsonb; _active text;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('workspaces','[]'::jsonb); END IF;

  SELECT active_vertical INTO _active FROM public.profiles WHERE user_id = _uid;

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
        'membership_status', e.status,
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