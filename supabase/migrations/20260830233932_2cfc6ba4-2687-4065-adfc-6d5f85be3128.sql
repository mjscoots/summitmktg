DELETE FROM public.rank_change_log WHERE new_rank_id IS NULL;
ALTER TABLE public.rank_change_log ALTER COLUMN new_rank_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.revert_stack_change(_log_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _l public.rank_change_log;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
  END IF;
  SELECT * INTO _l FROM public.rank_change_log WHERE id = _log_id;
  IF _l.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not found'); END IF;
  IF _l.reverted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already reverted');
  END IF;

  IF _l.carrier_id IS NULL THEN
    UPDATE public.profiles SET rank_id = _l.old_rank_id WHERE user_id = _l.user_id;
  ELSIF _l.old_rank_id IS NULL THEN
    -- There was no carrier stack before this change, so undoing it removes the
    -- override and the person falls back to their single rank. The original row
    -- is marked reverted below; no extra entry is written.
    DELETE FROM public.rep_carrier_ranks WHERE user_id = _l.user_id AND carrier_id = _l.carrier_id;
  ELSE
    UPDATE public.rep_carrier_ranks
       SET rank_id = _l.old_rank_id, set_by = _uid, set_at = now()
     WHERE user_id = _l.user_id AND carrier_id = _l.carrier_id;
  END IF;

  UPDATE public.rank_change_log
     SET reverted_at = now(), reverted_by = _uid
   WHERE id = _log_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.revert_stack_change(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revert_stack_change(uuid) TO authenticated;