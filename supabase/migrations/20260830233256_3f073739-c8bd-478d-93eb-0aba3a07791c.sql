-- Pass 142: manager stacks board, filtered by ISP.

CREATE TABLE public.rep_carrier_ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  carrier_id uuid NOT NULL REFERENCES public.carriers(id) ON DELETE CASCADE,
  rank_id uuid NOT NULL REFERENCES public.ranks(id),
  set_by uuid,
  set_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, carrier_id)
);

GRANT SELECT, INSERT, UPDATE ON public.rep_carrier_ranks TO authenticated;
GRANT ALL ON public.rep_carrier_ranks TO service_role;
ALTER TABLE public.rep_carrier_ranks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rank_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  carrier_id uuid REFERENCES public.carriers(id) ON DELETE SET NULL,
  old_rank_id uuid REFERENCES public.ranks(id),
  new_rank_id uuid REFERENCES public.ranks(id),
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reverted_at timestamptz,
  reverted_by uuid
);

GRANT SELECT ON public.rank_change_log TO authenticated;
GRANT ALL ON public.rank_change_log TO service_role;
ALTER TABLE public.rank_change_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_rank_change_log_changed_at ON public.rank_change_log (changed_at DESC);

-- Scope check: owner/admin anyone, manager only their own downline.
CREATE OR REPLACE FUNCTION public.can_set_rep_rank(_target uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR _target IS NULL THEN RETURN false; END IF;
  IF public.has_role(_uid,'admin') OR public.has_role(_uid,'owner') THEN RETURN true; END IF;
  IF NOT public.is_manager_tier(_uid) THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _target
      AND COALESCE(p.archived,false) = false
      AND COALESCE(p.status::text,'') <> 'nlc'
      AND (p.manager_id = _uid OR public.is_in_my_downline(p.user_id))
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_set_rep_rank(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_set_rep_rank(uuid) TO authenticated;

CREATE POLICY "Reps read own carrier ranks" ON public.rep_carrier_ranks
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_set_rep_rank(user_id));

CREATE POLICY "Leaders insert carrier ranks in scope" ON public.rep_carrier_ranks
FOR INSERT TO authenticated
WITH CHECK (public.can_set_rep_rank(user_id));

CREATE POLICY "Leaders update carrier ranks in scope" ON public.rep_carrier_ranks
FOR UPDATE TO authenticated
USING (public.can_set_rep_rank(user_id))
WITH CHECK (public.can_set_rep_rank(user_id));

CREATE POLICY "Staff and leaders read rank log" ON public.rank_change_log
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'owner')
  OR public.can_set_rep_rank(user_id)
);

-- Log writers
CREATE OR REPLACE FUNCTION public.log_rep_carrier_rank_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.rank_id IS NOT DISTINCT FROM OLD.rank_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.rank_change_log (user_id, carrier_id, old_rank_id, new_rank_id, changed_by)
  VALUES (NEW.user_id, NEW.carrier_id,
          CASE WHEN TG_OP = 'UPDATE' THEN OLD.rank_id ELSE NULL END,
          NEW.rank_id, COALESCE(NEW.set_by, auth.uid()));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_rep_carrier_rank
AFTER INSERT OR UPDATE ON public.rep_carrier_ranks
FOR EACH ROW EXECUTE FUNCTION public.log_rep_carrier_rank_change();

CREATE OR REPLACE FUNCTION public.log_profile_rank_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.rank_id IS NOT DISTINCT FROM OLD.rank_id THEN RETURN NEW; END IF;
  INSERT INTO public.rank_change_log (user_id, carrier_id, old_rank_id, new_rank_id, changed_by)
  VALUES (NEW.user_id, NULL, OLD.rank_id, NEW.rank_id, auth.uid());
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_profile_rank
AFTER UPDATE OF rank_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_profile_rank_change();

CREATE OR REPLACE FUNCTION public.touch_rep_carrier_rank()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_touch_rep_carrier_rank
BEFORE UPDATE ON public.rep_carrier_ranks
FOR EACH ROW EXECUTE FUNCTION public.touch_rep_carrier_rank();

-- Board for the manager screen.
CREATE OR REPLACE FUNCTION public.manager_stack_board(_carrier_id uuid, _manager uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _staff boolean;
  _rows jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('rows', '[]'::jsonb); END IF;
  _staff := public.has_role(_uid,'admin') OR public.has_role(_uid,'owner');
  IF NOT _staff AND NOT public.is_manager_tier(_uid) THEN
    RETURN jsonb_build_object('rows', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.full_name), '[]'::jsonb) INTO _rows
  FROM (
    SELECT p.user_id, p.full_name, p.avatar_url,
           COALESCE(rcr.rank_id, p.rank_id) AS rank_id,
           r.name AS rank_name,
           (rcr.rank_id IS NOT NULL) AS carrier_specific,
           rcr.note,
           CASE WHEN s.confirmed THEN s.value ELSE NULL END AS stack_value,
           s.unit AS stack_unit,
           mp.full_name AS manager_name
    FROM public.profiles p
    LEFT JOIN public.rep_carrier_ranks rcr
      ON rcr.user_id = p.user_id AND rcr.carrier_id = _carrier_id
    LEFT JOIN public.ranks r ON r.id = COALESCE(rcr.rank_id, p.rank_id)
    LEFT JOIN public.carriers c ON c.id = _carrier_id
    LEFT JOIN public.rank_stacks s
      ON s.rank_id = COALESCE(rcr.rank_id, p.rank_id)
     AND s.carrier_id = _carrier_id
     AND s.vertical = c.vertical
    LEFT JOIN public.profiles mp ON mp.user_id = p.manager_id
    WHERE COALESCE(p.archived,false) = false
      AND COALESCE(p.status::text,'') <> 'nlc'
      AND (
        (_staff AND (_manager IS NULL OR p.manager_id = _manager))
        OR (NOT _staff AND (p.manager_id = _uid OR public.is_in_my_downline(p.user_id)))
      )
  ) t;

  RETURN jsonb_build_object('rows', _rows, 'staff', _staff);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.manager_stack_board(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manager_stack_board(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_rep_carrier_rank(_user_id uuid, _carrier_id uuid, _rank_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_set_rep_rank(_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
  END IF;
  IF _carrier_id IS NULL OR _rank_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pick a carrier and a rank');
  END IF;
  INSERT INTO public.rep_carrier_ranks (user_id, carrier_id, rank_id, set_by, note)
  VALUES (_user_id, _carrier_id, _rank_id, auth.uid(), NULLIF(btrim(COALESCE(_note,'')), ''))
  ON CONFLICT (user_id, carrier_id)
  DO UPDATE SET rank_id = EXCLUDED.rank_id, set_by = EXCLUDED.set_by,
                set_at = now(), note = EXCLUDED.note;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_rep_carrier_rank(uuid, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_rep_carrier_rank(uuid, uuid, uuid, text) TO authenticated;

-- Rep's own stacks, confirmed values only.
CREATE OR REPLACE FUNCTION public.my_stacks()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(t ORDER BY t.vertical, t.carrier_name), '[]'::jsonb)
  FROM (
    SELECT c.id AS carrier_id, c.name AS carrier_name, c.vertical,
           r.name AS rank_name,
           CASE WHEN s.confirmed THEN s.value ELSE NULL END AS stack_value,
           s.unit AS stack_unit
    FROM public.carriers c
    LEFT JOIN public.rep_carrier_ranks rcr
      ON rcr.carrier_id = c.id AND rcr.user_id = auth.uid()
    LEFT JOIN public.profiles p ON p.user_id = auth.uid()
    LEFT JOIN public.ranks r ON r.id = COALESCE(rcr.rank_id, p.rank_id)
    LEFT JOIN public.rank_stacks s
      ON s.rank_id = COALESCE(rcr.rank_id, p.rank_id)
     AND s.carrier_id = c.id AND s.vertical = c.vertical
    WHERE c.active = true AND auth.uid() IS NOT NULL
  ) t;
$$;

REVOKE EXECUTE ON FUNCTION public.my_stacks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_stacks() TO authenticated;

-- Change log lane for owner and admin.
CREATE OR REPLACE FUNCTION public.stack_change_log(_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(t ORDER BY t.changed_at DESC)
    FROM (
      SELECT l.id, l.changed_at, l.reverted_at,
             p.full_name AS person_name,
             b.full_name AS changed_by_name,
             c.name AS carrier_name, c.vertical,
             ro.name AS old_rank_name, rn.name AS new_rank_name
      FROM public.rank_change_log l
      LEFT JOIN public.profiles p ON p.user_id = l.user_id
      LEFT JOIN public.profiles b ON b.user_id = l.changed_by
      LEFT JOIN public.carriers c ON c.id = l.carrier_id
      LEFT JOIN public.ranks ro ON ro.id = l.old_rank_id
      LEFT JOIN public.ranks rn ON rn.id = l.new_rank_id
      ORDER BY l.changed_at DESC
      LIMIT GREATEST(COALESCE(_limit,100), 1)
    ) t
  ), '[]'::jsonb);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.stack_change_log(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stack_change_log(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.stack_changes_7d()
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN 0;
  END IF;
  RETURN (SELECT count(*) FROM public.rank_change_log WHERE changed_at > now() - interval '7 days');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.stack_changes_7d() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stack_changes_7d() TO authenticated;

CREATE OR REPLACE FUNCTION public.revert_stack_change(_log_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    DELETE FROM public.rep_carrier_ranks WHERE user_id = _l.user_id AND carrier_id = _l.carrier_id;
    INSERT INTO public.rank_change_log (user_id, carrier_id, old_rank_id, new_rank_id, changed_by)
    VALUES (_l.user_id, _l.carrier_id, _l.new_rank_id, NULL, _uid);
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
$$;

REVOKE EXECUTE ON FUNCTION public.revert_stack_change(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revert_stack_change(uuid) TO authenticated;
