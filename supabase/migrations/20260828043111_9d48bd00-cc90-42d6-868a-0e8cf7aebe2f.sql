CREATE POLICY "onboarding_marks_self_write" ON public.onboarding_marks
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "onboarding_marks_self_update" ON public.onboarding_marks
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.onboarding_marks TO authenticated;
GRANT ALL ON public.onboarding_marks TO service_role;