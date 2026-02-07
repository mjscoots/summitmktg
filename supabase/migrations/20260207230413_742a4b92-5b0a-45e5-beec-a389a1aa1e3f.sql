-- Create task types enum
CREATE TYPE public.priority_task_type AS ENUM ('pitch_work', 'weekly_mission', 'manager_mission', 'recruit_goal');

-- Create source form type enum  
CREATE TYPE public.source_form_type AS ENUM ('rookie_1_on_1', 'manager_1_on_1');

-- Create user_priority_tasks table for auto-generated tasks from 1:1 forms
CREATE TABLE public.user_priority_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_type public.priority_task_type NOT NULL,
  task_title TEXT NOT NULL,
  task_description TEXT NOT NULL,
  source_form_type public.source_form_type NOT NULL,
  source_form_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  recurs_daily BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  replaced_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX idx_user_priority_tasks_user_id ON public.user_priority_tasks(user_id);
CREATE INDEX idx_user_priority_tasks_active ON public.user_priority_tasks(user_id, is_active);
CREATE INDEX idx_user_priority_tasks_source ON public.user_priority_tasks(user_id, source_form_type, is_active);

-- Enable RLS
ALTER TABLE public.user_priority_tasks ENABLE ROW LEVEL SECURITY;

-- Users can view their own tasks
CREATE POLICY "Users can view own priority tasks"
ON public.user_priority_tasks
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own tasks (mark complete)
CREATE POLICY "Users can update own priority tasks"
ON public.user_priority_tasks
FOR UPDATE
USING (auth.uid() = user_id);

-- Managers can create tasks for others
CREATE POLICY "Managers can create priority tasks"
ON public.user_priority_tasks
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Managers can update tasks they created (deactivate old tasks)
CREATE POLICY "Managers can update tasks they created"
ON public.user_priority_tasks
FOR UPDATE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

-- Managers can view tasks for their team members
CREATE POLICY "Managers can view team priority tasks"
ON public.user_priority_tasks
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add rookie_user_id column to weekly_one_on_ones_rookie table
ALTER TABLE public.weekly_one_on_ones_rookie 
ADD COLUMN IF NOT EXISTS rookie_user_id UUID;

-- Add manager_user_id column to weekly_one_on_ones_manager table  
ALTER TABLE public.weekly_one_on_ones_manager 
ADD COLUMN IF NOT EXISTS manager_user_id UUID;