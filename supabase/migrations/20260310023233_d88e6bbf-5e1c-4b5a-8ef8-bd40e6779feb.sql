
-- Create priority enum
CREATE TYPE public.todo_priority AS ENUM ('urgent', 'high', 'medium', 'low');

-- Create todo_items table
CREATE TABLE public.todo_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  priority todo_priority NOT NULL DEFAULT 'medium',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID,
  assigned_by_name TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.todo_items ENABLE ROW LEVEL SECURITY;

-- Users can manage their own todos
CREATE POLICY "Users can manage own todos" ON public.todo_items
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can view todos assigned to them
CREATE POLICY "Users can view assigned todos" ON public.todo_items
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Authenticated users can insert todos for others (assignments)
CREATE POLICY "Users can assign todos to others" ON public.todo_items
  FOR INSERT TO authenticated
  WITH CHECK (assigned_by = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.todo_items;
