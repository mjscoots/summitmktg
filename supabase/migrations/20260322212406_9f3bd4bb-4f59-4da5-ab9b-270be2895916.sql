
-- Add last_position (seconds) to video_progress for resume-where-left-off
ALTER TABLE public.video_progress 
ADD COLUMN IF NOT EXISTS last_position real DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration real DEFAULT 0;

-- Create rep_logistics table for summer arrival/car/travel tracking
CREATE TABLE IF NOT EXISTS public.rep_logistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  arrival_date date,
  car_status text NOT NULL DEFAULT 'unknown',
  travel_status text NOT NULL DEFAULT 'unknown',
  notes text DEFAULT '',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rep_logistics ENABLE ROW LEVEL SECURITY;

-- RLS: managers/admins can manage all, users can view own
CREATE POLICY "Users can view own logistics" ON public.rep_logistics
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Managers can manage all logistics" ON public.rep_logistics
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));
