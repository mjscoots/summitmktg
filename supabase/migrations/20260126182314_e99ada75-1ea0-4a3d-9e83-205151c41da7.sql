-- Fix: Restrict signup_logs access to admins only (remove manager access)
-- This prevents managers from viewing sensitive PII of all employees

-- Drop the existing manager policy that exposes sensitive data
DROP POLICY IF EXISTS "Managers can view signup logs" ON public.signup_logs;

-- Delete the default access code that was inserted during migration
-- Admins must set a new code using set_access_code() function
DELETE FROM public.access_codes WHERE description LIKE '%Default%' OR description LIKE '%change immediately%';