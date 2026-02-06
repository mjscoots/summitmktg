-- Create table for Rookie-Manager 1:1 forms
CREATE TABLE public.weekly_one_on_ones_rookie (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rookie_name TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  team TEXT NOT NULL,
  week_description TEXT NOT NULL,
  big_win TEXT NOT NULL,
  completed_challenge TEXT NOT NULL CHECK (completed_challenge IN ('Yes', 'No')),
  upcoming_activities TEXT NOT NULL,
  pitch_work_needed TEXT NOT NULL,
  weekly_mission TEXT NOT NULL,
  submitted_by UUID NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Manager 1:1 forms
CREATE TABLE public.weekly_one_on_ones_manager (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_name TEXT NOT NULL,
  interviewer_name TEXT NOT NULL,
  team TEXT NOT NULL,
  rep_relationship TEXT NOT NULL,
  obstacles_encountered TEXT NOT NULL,
  obstacles_review TEXT NOT NULL,
  completed_mission TEXT NOT NULL CHECK (completed_mission IN ('Yes', 'No')),
  weekly_mission TEXT NOT NULL,
  recruit_goal TEXT NOT NULL,
  gethawx_review TEXT NOT NULL,
  training_progress_check TEXT NOT NULL,
  interview_forms_check TEXT NOT NULL,
  upcoming_events TEXT NOT NULL,
  team_development JSONB NOT NULL DEFAULT '[]',
  system_utilization_rating INTEGER NOT NULL CHECK (system_utilization_rating >= 1 AND system_utilization_rating <= 10),
  manager_improvement TEXT NOT NULL,
  submitted_by UUID NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.weekly_one_on_ones_rookie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_one_on_ones_manager ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rookie 1:1
CREATE POLICY "Managers can insert rookie 1:1 forms"
  ON public.weekly_one_on_ones_rookie
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all rookie 1:1 forms"
  ON public.weekly_one_on_ones_rookie
  FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update rookie 1:1 forms"
  ON public.weekly_one_on_ones_rookie
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete rookie 1:1 forms"
  ON public.weekly_one_on_ones_rookie
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for manager 1:1
CREATE POLICY "Managers can insert manager 1:1 forms"
  ON public.weekly_one_on_ones_manager
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all manager 1:1 forms"
  ON public.weekly_one_on_ones_manager
  FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update manager 1:1 forms"
  ON public.weekly_one_on_ones_manager
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete manager 1:1 forms"
  ON public.weekly_one_on_ones_manager
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for filtering
CREATE INDEX idx_rookie_1on1_team ON public.weekly_one_on_ones_rookie(team);
CREATE INDEX idx_rookie_1on1_submitted_at ON public.weekly_one_on_ones_rookie(submitted_at DESC);
CREATE INDEX idx_manager_1on1_team ON public.weekly_one_on_ones_manager(team);
CREATE INDEX idx_manager_1on1_submitted_at ON public.weekly_one_on_ones_manager(submitted_at DESC);