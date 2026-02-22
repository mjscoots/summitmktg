-- RLS Security Fixes
-- 1. calendar_events UPDATE/DELETE: restrict to creator or admin
-- 2. calendar_event_assignees INSERT: restrict to event owner or admin
-- 3. profiles UPDATE by managers: restrict to rookies only
-- 4. Protect approved field via BEFORE UPDATE trigger

-- =============================================================================
-- 1. calendar_events UPDATE — restrict to creator or admin
-- =============================================================================

DROP POLICY IF EXISTS "Managers can update calendar events" ON public.calendar_events;

CREATE POLICY "Managers can update own calendar events"
  ON public.calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- =============================================================================
-- 2. calendar_events DELETE — restrict to creator or admin
-- =============================================================================

DROP POLICY IF EXISTS "Managers can delete calendar events" ON public.calendar_events;

CREATE POLICY "Managers can delete own calendar events"
  ON public.calendar_events
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- =============================================================================
-- 3. calendar_event_assignees INSERT — restrict to event owner or admin
-- =============================================================================

DROP POLICY IF EXISTS "Managers can insert event assignments" ON public.calendar_event_assignees;

CREATE POLICY "Managers can insert event assignments"
  ON public.calendar_event_assignees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_events ce
      WHERE ce.id = event_id
        AND ce.manager_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- =============================================================================
-- 4. profiles UPDATE by managers — restrict to rookies only
-- =============================================================================

DROP POLICY IF EXISTS "Managers can update team profiles" ON public.profiles;

CREATE POLICY "Managers can update rookie profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND has_role(user_id, 'rookie'::app_role)
  );

-- =============================================================================
-- 5. Protect approved field via BEFORE UPDATE trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.protect_approved_field()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If approved is changing, only allow admins and service_role
  IF NEW.approved IS DISTINCT FROM OLD.approved THEN
    IF NOT has_role(auth.uid(), 'admin'::app_role)
       AND current_setting('role', true) IS DISTINCT FROM 'service_role'
    THEN
      NEW.approved := OLD.approved;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_approved_field
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_approved_field();
