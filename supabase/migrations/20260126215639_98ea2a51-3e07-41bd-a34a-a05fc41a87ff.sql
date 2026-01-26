-- Fix 1: Add RLS to rate_limits table to prevent data inspection
-- This table is only used by edge functions via service_role, so we deny all access

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No SELECT policy means no one can read (service_role bypasses RLS)
-- Add explicit deny-all policies for extra safety
CREATE POLICY "No public access to rate limits"
ON public.rate_limits
FOR ALL
TO public
USING (false);

-- Fix 2: Restrict manager profile access to only see rookies (their oversight responsibility)
-- Drop the overly permissive manager policy
DROP POLICY IF EXISTS "Managers can view all active profiles" ON public.profiles;

-- Create more restrictive policy: managers can see rookie profiles only
CREATE POLICY "Managers can view rookie profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND status <> 'nlc'::user_status
  AND (
    -- Manager can see their own profile
    user_id = auth.uid()
    -- Or profiles of users who are rookies
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = profiles.user_id 
      AND ur.role = 'rookie'::app_role
    )
  )
);