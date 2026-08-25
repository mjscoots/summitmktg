DROP POLICY IF EXISTS "Reps can read winback contact history" ON public.winback_contacts;
CREATE POLICY "Reps read own winback contact history"
ON public.winback_contacts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

DROP POLICY IF EXISTS "Authenticated users can view all roles" ON public.user_roles;
CREATE POLICY "Users read own role, staff read all"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));