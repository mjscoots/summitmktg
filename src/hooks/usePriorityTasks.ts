import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PriorityTask {
  id: string;
  user_id: string;
  task_type: 'pitch_work' | 'weekly_mission' | 'manager_mission' | 'recruit_goal';
  task_title: string;
  task_description: string;
  source_form_type: 'rookie_1_on_1' | 'manager_1_on_1';
  source_form_id: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  is_completed: boolean;
  completed_at: string | null;
  recurs_daily: boolean;
  is_active: boolean;
}

export function usePriorityTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PriorityTask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    if (!user?.id) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      // Get active tasks for current user
      const { data: taskData, error } = await supabase
        .from('user_priority_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get creator names
      const creatorIds = [...new Set(taskData?.map(t => t.created_by) || [])];
      const { data: creators } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', creatorIds);

      const creatorMap = new Map(creators?.map(c => [c.user_id, c.full_name]) || []);

      const tasksWithNames: PriorityTask[] = (taskData || []).map(t => ({
        ...t,
        task_type: t.task_type as PriorityTask['task_type'],
        source_form_type: t.source_form_type as PriorityTask['source_form_type'],
        created_by_name: creatorMap.get(t.created_by) || 'Unknown'
      }));

      setTasks(tasksWithNames);
    } catch (error) {
      console.error('Error loading priority tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user?.id]);

  const toggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_priority_tasks')
        .update({
          is_completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, is_completed: !currentStatus, completed_at: !currentStatus ? new Date().toISOString() : null }
          : t
      ));

      return true;
    } catch (error) {
      console.error('Error toggling task:', error);
      return false;
    }
  };

  return {
    tasks,
    loading,
    refresh: loadTasks,
    toggleTaskCompletion
  };
}

// Helper to create tasks from 1:1 form submission
export async function createTasksFromRookieForm(
  rookieUserId: string,
  formId: string,
  createdBy: string,
  pitchWorkNeeded: string,
  weeklyMission: string
) {
  // First deactivate old tasks for this rookie from rookie 1:1 forms
  await supabase
    .from('user_priority_tasks')
    .update({ is_active: false, replaced_at: new Date().toISOString() })
    .eq('user_id', rookieUserId)
    .eq('source_form_type', 'rookie_1_on_1')
    .eq('is_active', true);

  const tasks = [];

  // Create pitch work task
  if (pitchWorkNeeded?.trim()) {
    tasks.push({
      user_id: rookieUserId,
      task_type: 'pitch_work' as const,
      task_title: 'Work on Pitch',
      task_description: pitchWorkNeeded,
      source_form_type: 'rookie_1_on_1' as const,
      source_form_id: formId,
      created_by: createdBy,
      is_completed: false,
      recurs_daily: true,
      is_active: true
    });
  }

  // Create weekly mission task
  if (weeklyMission?.trim()) {
    tasks.push({
      user_id: rookieUserId,
      task_type: 'weekly_mission' as const,
      task_title: 'Weekly Mission',
      task_description: weeklyMission,
      source_form_type: 'rookie_1_on_1' as const,
      source_form_id: formId,
      created_by: createdBy,
      is_completed: false,
      recurs_daily: true,
      is_active: true
    });
  }

  if (tasks.length > 0) {
    const { error } = await supabase.from('user_priority_tasks').insert(tasks);
    if (error) throw error;
  }

  return tasks.length;
}

export async function createTasksFromManagerForm(
  managerUserId: string,
  formId: string,
  createdBy: string,
  weeklyMission: string,
  recruitGoal: string
) {
  // First deactivate old tasks for this manager from manager 1:1 forms
  await supabase
    .from('user_priority_tasks')
    .update({ is_active: false, replaced_at: new Date().toISOString() })
    .eq('user_id', managerUserId)
    .eq('source_form_type', 'manager_1_on_1')
    .eq('is_active', true);

  const tasks = [];

  // Create weekly mission task
  if (weeklyMission?.trim()) {
    tasks.push({
      user_id: managerUserId,
      task_type: 'manager_mission' as const,
      task_title: "This Week's Mission",
      task_description: weeklyMission,
      source_form_type: 'manager_1_on_1' as const,
      source_form_id: formId,
      created_by: createdBy,
      is_completed: false,
      recurs_daily: true,
      is_active: true
    });
  }

  // Create recruit goal task
  if (recruitGoal?.trim()) {
    tasks.push({
      user_id: managerUserId,
      task_type: 'recruit_goal' as const,
      task_title: 'Recruiting Goal',
      task_description: `Goal: ${recruitGoal} new recruits this week`,
      source_form_type: 'manager_1_on_1' as const,
      source_form_id: formId,
      created_by: createdBy,
      is_completed: false,
      recurs_daily: true,
      is_active: true
    });
  }

  if (tasks.length > 0) {
    const { error } = await supabase.from('user_priority_tasks').insert(tasks);
    if (error) throw error;
  }

  return tasks.length;
}
