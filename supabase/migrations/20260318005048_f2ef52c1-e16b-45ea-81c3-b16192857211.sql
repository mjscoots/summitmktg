-- Remove the admin policy that lets admins see all pipelines
DROP POLICY IF EXISTS "Admins can view all pipelines" ON public.recruit_pipeline;