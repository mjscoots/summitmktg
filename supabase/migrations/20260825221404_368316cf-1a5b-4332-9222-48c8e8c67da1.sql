CREATE OR REPLACE FUNCTION public.get_the_stack()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _out jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RETURN jsonb_build_object('verticals','[]'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'owner', (SELECT jsonb_build_object('user_id',p.user_id,'full_name',p.full_name,'avatar_url',p.avatar_url)
                FROM public.profiles p
                JOIN public.user_roles r ON r.user_id = p.user_id AND r.role = 'owner'
               WHERE COALESCE(p.archived,false) = false
               ORDER BY p.created_at LIMIT 1),
    'verticals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'vertical', vp.vertical,
        'label', vp.label,
        'lead', (SELECT jsonb_build_object('user_id',p.user_id,'full_name',p.full_name,'avatar_url',p.avatar_url)
                   FROM public.profiles p
                  WHERE p.vertical = vp.vertical AND COALESCE(p.runs_vertical,false) = true
                    AND COALESCE(p.archived,false) = false
                  ORDER BY p.full_name LIMIT 1),
        'total_reps', (SELECT COUNT(*) FROM public.profiles p
                        WHERE p.vertical = vp.vertical AND COALESCE(p.archived,false) = false
                          AND COALESCE(p.approved,false) = true),
        'regions', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', g.id,
            'name', g.name,
            'lead', (SELECT jsonb_build_object('user_id',lp.user_id,'full_name',lp.full_name,'avatar_url',lp.avatar_url)
                       FROM public.profiles lp WHERE lp.user_id = g.lead_user_id),
            'rep_count', (SELECT COUNT(*) FROM public.profiles p
                           WHERE p.region_id = g.id AND COALESCE(p.archived,false) = false),
            'managers', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'user_id', m.user_id,
                'full_name', m.full_name,
                'avatar_url', m.avatar_url,
                'reps', COALESCE((
                  SELECT jsonb_agg(jsonb_build_object(
                    'user_id', d.user_id,
                    'full_name', d.full_name,
                    'partner_name', (SELECT pt.name FROM public.rep_vertical_enrollments e
                                      JOIN public.partners pt ON pt.id = e.partner_id
                                     WHERE e.user_id = d.user_id AND e.vertical = vp.vertical LIMIT 1)
                  ) ORDER BY d.full_name)
                  FROM public.profiles d
                  WHERE d.direct_manager = m.user_id::text AND COALESCE(d.archived,false) = false
                ), '[]'::jsonb)
              ) ORDER BY m.full_name)
              FROM public.profiles m
              WHERE m.region_id = g.id
                AND COALESCE(m.archived,false) = false
                AND COALESCE(m.runs_vertical,false) = false
                AND m.user_id IS DISTINCT FROM g.lead_user_id
                AND EXISTS (SELECT 1 FROM public.user_roles r
                             WHERE r.user_id = m.user_id AND r.role IN ('manager','admin'))
            ), '[]'::jsonb)
          ) ORDER BY g.name)
          FROM public.regions g
          WHERE g.vertical = vp.vertical AND g.active = true
        ), '[]'::jsonb),
        'managers', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'user_id', m.user_id,
            'full_name', m.full_name,
            'avatar_url', m.avatar_url,
            'accepting', COALESCE(m.accepting_new_reps,false),
            'capacity', m.mentee_capacity,
            'region_name', (SELECT g.name FROM public.regions g WHERE g.id = m.region_id),
            'mentee_count', (SELECT COUNT(*) FROM public.rep_vertical_enrollments e
                              WHERE e.paired_manager = m.user_id AND e.vertical = vp.vertical),
            'rep_count', (SELECT COUNT(*) FROM public.profiles d
                           WHERE d.direct_manager = m.user_id::text AND COALESCE(d.archived,false) = false)
          ) ORDER BY m.full_name)
          FROM public.profiles m
          WHERE m.vertical = vp.vertical
            AND COALESCE(m.archived,false) = false
            AND COALESCE(m.runs_vertical,false) = false
            AND m.region_id IS NULL
            AND EXISTS (SELECT 1 FROM public.user_roles r
                         WHERE r.user_id = m.user_id AND r.role IN ('manager','admin'))
        ), '[]'::jsonb)
      ) ORDER BY vp.display_order)
      FROM public.vertical_paths vp
    ), '[]'::jsonb)
  ) INTO _out;

  RETURN _out;
END;
$$;
