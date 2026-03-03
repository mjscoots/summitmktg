
CREATE TABLE public.one_on_one_rep_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL,
  rep_user_id UUID NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(manager_id, rep_user_id)
);

ALTER TABLE public.one_on_one_rep_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage own rep order"
ON public.one_on_one_rep_order
FOR ALL
TO authenticated
USING (manager_id = auth.uid())
WITH CHECK (manager_id = auth.uid());
