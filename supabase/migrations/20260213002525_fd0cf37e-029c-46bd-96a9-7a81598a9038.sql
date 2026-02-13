-- Allow managers to update profiles of other users (needed for member editing)
CREATE POLICY "Managers can update team profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND NOT has_role(user_id, 'admin'::app_role)
);