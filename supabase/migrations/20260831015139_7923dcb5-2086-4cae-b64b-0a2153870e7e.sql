DROP FUNCTION IF EXISTS public.dark_rep_radar(uuid);
DROP FUNCTION IF EXISTS public.manager_stack_board(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_conversations()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _rows jsonb;
  _dms jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.display_order, x.label), '[]'::jsonb)
  INTO _rows
  FROM (
    SELECT v.slug,
           v.label,
           v.icon,
           v.color,
           v.display_order,
           CASE WHEN v.slug LIKE 'team-%' THEN 'team' ELSE 'channel' END AS kind,
           false AS is_pinned,
           NULL::text AS avatar_url,
           NULL::uuid AS other_user_id,
           (SELECT c3.cover_image_path FROM public.chat_channels c3 WHERE c3.slug = v.slug) AS cover_image_path,
           (SELECT c4.vertical FROM public.chat_channels c4 WHERE c4.slug = v.slug) AS vertical,
           EXISTS (SELECT 1 FROM public.chat_channel_mutes mu WHERE mu.user_id = _uid AND mu.channel = v.slug) AS is_muted,
           lm.content AS last_content,
           lm.created_at AS last_at,
           CASE WHEN lm.is_ai THEN 'Summit AI' ELSE lp.full_name END AS last_sender,
           (SELECT count(*)::int FROM public.chat_messages m
             WHERE m.channel = v.slug
               AND m.user_id <> _uid
               AND m.created_at > COALESCE(
                     (SELECT r.last_read_at FROM public.chat_read_state r
                      WHERE r.user_id = _uid AND r.channel = v.slug),
                     (SELECT r2.last_read_at FROM public.chat_read_state r2
                      WHERE r2.user_id = _uid AND r2.channel = 'general'),
                     now())
           ) AS unread
    FROM public.visible_chat_channels(_uid) v
    LEFT JOIN LATERAL (
      SELECT m.content, m.created_at, m.user_id, m.is_ai
      FROM public.chat_messages m
      WHERE m.channel = v.slug
      ORDER BY m.created_at DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN public.profiles lp ON lp.user_id = lm.user_id
  ) x;

  SELECT COALESCE(jsonb_agg(row_to_json(d)::jsonb ORDER BY d.last_at DESC NULLS LAST, d.label), '[]'::jsonb)
  INTO _dms
  FROM (
    SELECT c.slug,
           COALESCE(op.full_name, c.label) AS label,
           'MessageSquare'::text AS icon,
           'text-foreground'::text AS color,
           900 AS display_order,
           'dm'::text AS kind,
           false AS is_pinned,
           op.avatar_url,
           other.uid AS other_user_id,
           NULL::text AS cover_image_path,
           NULL::text AS vertical,
           EXISTS (SELECT 1 FROM public.chat_channel_mutes mu WHERE mu.user_id = _uid AND mu.channel = c.slug) AS is_muted,
           lm.content AS last_content,
           lm.created_at AS last_at,
           lp.full_name AS last_sender,
           (SELECT count(*)::int FROM public.chat_messages m
             WHERE m.channel = c.slug
               AND m.user_id <> _uid
               AND m.created_at > COALESCE(
                     (SELECT r.last_read_at FROM public.chat_read_state r
                      WHERE r.user_id = _uid AND r.channel = c.slug),
                     '-infinity'::timestamptz)
           ) AS unread
    FROM public.chat_channels c
    CROSS JOIN LATERAL (
      SELECT (SELECT u FROM unnest(c.member_ids) u WHERE u <> _uid LIMIT 1) AS uid
    ) other
    LEFT JOIN public.profiles op ON op.user_id = other.uid
    LEFT JOIN LATERAL (
      SELECT m.content, m.created_at, m.user_id
      FROM public.chat_messages m
      WHERE m.channel = c.slug
      ORDER BY m.created_at DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN public.profiles lp ON lp.user_id = lm.user_id
    WHERE c.kind = 'dm'
      AND c.is_active = true
      AND (_uid = ANY (c.member_ids) OR public.is_chat_staff(_uid))
  ) d;

  _rows := _rows || _dms;

  RETURN jsonb_build_object(
    'conversations', _rows,
    'total_unread', (
      SELECT COALESCE(sum((c->>'unread')::int), 0)
      FROM jsonb_array_elements(_rows) c
      WHERE COALESCE((c->>'is_muted')::boolean, false) = false
    )
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversations() TO authenticated;
