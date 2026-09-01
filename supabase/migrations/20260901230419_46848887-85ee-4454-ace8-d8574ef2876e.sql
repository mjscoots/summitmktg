-- ============================================================
-- Pass 149: four-room chat structure and acceptance-only membership
-- ============================================================

-- ---------- 1. Backfill Pest membership BEFORE the default is removed ----------
INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, activated_at, approved_at)
SELECT p.user_id, 'Pest', 'active', now(), now()
FROM public.profiles p
WHERE p.archived = false
  AND COALESCE(p.active_vertical, 'Pest') = 'Pest'
  AND NOT EXISTS (
    SELECT 1 FROM public.rep_vertical_enrollments e
    WHERE e.user_id = p.user_id AND e.vertical = 'Pest'
  );

-- ---------- 2. Membership is only ever a row ----------
CREATE OR REPLACE FUNCTION public.is_vertical_member(_user uuid, _vertical text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user IS NULL OR _vertical IS NULL THEN false
    WHEN EXISTS (SELECT 1 FROM public.rep_vertical_enrollments e
                  WHERE e.user_id = _user AND e.vertical = _vertical)
      THEN (SELECT e.status IN ('approved','onboarding','active','paused')
              FROM public.rep_vertical_enrollments e
             WHERE e.user_id = _user AND e.vertical = _vertical)
    WHEN public.has_role(_user,'owner') OR public.has_role(_user,'admin') THEN true
    ELSE false
  END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_workspaces()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _res jsonb; _active text; _staff boolean;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('workspaces','[]'::jsonb); END IF;

  SELECT COALESCE(active_vertical, 'Pest') INTO _active FROM public.profiles WHERE user_id = _uid;
  _staff := public.has_role(_uid,'owner') OR public.has_role(_uid,'admin');

  SELECT jsonb_build_object(
    'active_vertical', COALESCE(_active, 'Pest'),
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
        'membership_status', COALESCE(
          e.status,
          CASE WHEN _staff THEN 'active' ELSE NULL END),
        'reject_reason', e.reject_reason,
        'request_status', (SELECT a.status FROM public.vertical_applications a
                            WHERE a.user_id = _uid AND a.vertical = v.vertical
                            ORDER BY a.created_at DESC LIMIT 1),
        'request_reviewed_at', (SELECT a.reviewed_at FROM public.vertical_applications a
                            WHERE a.user_id = _uid AND a.vertical = v.vertical
                            ORDER BY a.created_at DESC LIMIT 1),
        'approvers', '[]'::jsonb
      ) ORDER BY v.display_order)
      FROM public.verticals v
      LEFT JOIN public.rep_vertical_enrollments e ON e.user_id = _uid AND e.vertical = v.vertical
    ), '[]'::jsonb)
  ) INTO _res;

  RETURN _res;
END;
$function$;

-- ---------- 3. The four rooms ----------
-- The owner already renamed the company room to Summit Trinity (slug general),
-- so it is promoted in place and its message history is untouched.
UPDATE public.chat_channels
   SET label = 'Summit Trinity', vertical = NULL, display_order = 0, is_active = true
 WHERE slug = 'general';

UPDATE public.chat_channels
   SET display_order = 1, vertical = NULL
 WHERE slug = 'announcements';

INSERT INTO public.chat_channels (slug, label, icon, color, display_order, kind, vertical, is_active)
VALUES
  ('summit-pest',  'Summit Pest',  'Hash', 'text-muted-foreground', 2, 'channel', 'Pest',  true),
  ('summit-fiber', 'Summit Fiber', 'Hash', 'text-muted-foreground', 3, 'channel', 'Fiber', true),
  ('summit-life',  'Summit Life',  'Hash', 'text-muted-foreground', 4, 'channel', 'Life',  true)
ON CONFLICT (slug) DO UPDATE
  SET label = EXCLUDED.label,
      vertical = EXCLUDED.vertical,
      display_order = EXCLUDED.display_order,
      is_active = true;

-- ---------- 4. A room with an industry needs membership in that industry ----------
CREATE OR REPLACE FUNCTION public.visible_chat_channels(_user_id uuid)
RETURNS TABLE(slug text, label text, icon text, color text, display_order integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT t.name AS team_name
    FROM public.profiles p
    LEFT JOIN public.teams t ON t.id = p.team_id
    WHERE p.user_id = _user_id
    LIMIT 1
  ),
  mgr AS (
    SELECT (
      _user_id IS NOT NULL AND (
        public.has_role(_user_id, 'manager')
        OR public.has_role(_user_id, 'admin')
        OR public.has_role(_user_id, 'owner')
        OR public.is_effective_manager(_user_id)
      )
    ) AS ok
  )
  SELECT c.slug, c.label, c.icon, c.color, c.display_order
  FROM public.chat_channels c, mgr
  WHERE _user_id IS NOT NULL
    AND c.is_active = true
    AND c.slug <> 'ai-coach'
    AND COALESCE(c.kind,'channel') <> 'dm'
    AND (c.vertical IS NULL OR public.is_vertical_member(_user_id, c.vertical))
    AND (
      _user_id = ANY (COALESCE(c.member_ids, '{}'::uuid[]))
      OR (COALESCE(c.kind,'channel') = 'group' AND public.is_chat_admin(_user_id))
      OR (
        COALESCE(c.kind,'channel') <> 'group'
        AND (CASE
          WHEN public.is_staff_channel(c.slug) THEN mgr.ok
          WHEN c.slug LIKE 'team-%' THEN mgr.ok OR c.slug = public.team_channel_slug((SELECT team_name FROM me))
          ELSE true
        END)
      )
    )
  ORDER BY c.display_order, c.label
$function$;

-- ---------- 5. RLS follows the same test ----------
DROP POLICY IF EXISTS "Authenticated users can view active channels" ON public.chat_channels;
CREATE POLICY "Authenticated users can view active channels"
ON public.chat_channels FOR SELECT TO authenticated
USING (
  is_active = true
  AND (COALESCE(kind, 'channel') <> 'dm' OR auth.uid() = ANY (member_ids) OR public.is_chat_staff(auth.uid()))
  AND (vertical IS NULL OR public.is_vertical_member(auth.uid(), vertical))
);

DROP POLICY IF EXISTS "Authenticated users can view chat messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can view chat messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND public.can_read_channel(channel, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert chat messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can insert chat messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.can_read_channel(channel, auth.uid()));

-- ---------- 6. Who is waiting, and one tap to accept ----------
CREATE OR REPLACE FUNCTION public.people_awaiting_industry()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN NOT (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'))
      THEN '[]'::jsonb
    ELSE COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', p.user_id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'created_at', p.created_at,
        'manager_name', (SELECT m.full_name FROM public.profiles m WHERE m.user_id = p.manager_id)
      ) ORDER BY p.created_at DESC)
      FROM public.profiles p
      WHERE p.archived = false
        AND COALESCE(p.status::text,'') <> 'nlc'
        AND NOT EXISTS (
          SELECT 1 FROM public.rep_vertical_enrollments e
          WHERE e.user_id = p.user_id
            AND e.status IN ('approved','onboarding','active','paused')
        )
    ), '[]'::jsonb)
  END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_into_industry(_user_id uuid, _vertical text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'owner') OR public.has_role(_uid,'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the owner or an admin can accept someone into an industry.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.verticals v WHERE v.vertical = _vertical) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That industry does not exist.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'That person no longer has a profile.');
  END IF;

  INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, activated_at, approved_at)
  VALUES (_user_id, _vertical, 'active', now(), now())
  ON CONFLICT (user_id, vertical) DO UPDATE
    SET status = 'active',
        activated_at = COALESCE(public.rep_vertical_enrollments.activated_at, now()),
        approved_at = COALESCE(public.rep_vertical_enrollments.approved_at, now()),
        rejected_at = NULL,
        reject_reason = NULL,
        updated_at = now();

  UPDATE public.profiles
     SET active_vertical = _vertical,
         vertical = COALESCE(vertical, _vertical)
   WHERE user_id = _user_id;

  RETURN jsonb_build_object('success', true, 'vertical', _vertical);
END;
$function$;

-- ---------- 7. Privileges ----------
REVOKE ALL ON FUNCTION public.is_vertical_member(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_workspaces() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.visible_chat_channels(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.people_awaiting_industry() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_into_industry(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_vertical_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_workspaces() TO authenticated;
GRANT EXECUTE ON FUNCTION public.visible_chat_channels(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.people_awaiting_industry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_into_industry(uuid, text) TO authenticated;