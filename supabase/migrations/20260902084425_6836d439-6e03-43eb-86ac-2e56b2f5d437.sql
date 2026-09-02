-- Fiber rules are for signed in Fiber members only; anonymous callers have no business here.
REVOKE ALL ON public.fiber_rules FROM anon;

-- Allow the read only console role to execute the ladder function so the rep vs
-- leader behaviour can be verified without granting it any write ability.
GRANT EXECUTE ON FUNCTION public.fiber_ladder() TO supabase_read_only_user;