import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOneOnOnePrep, PrepRep } from '@/hooks/useOneOnOnePrep';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfWeek } from 'date-fns';
import { createTasksFromRookieForm, createTasksFromManagerForm } from '@/hooks/usePriorityTasks';
import { RepSelectionList } from '@/components/one-on-one-prep/RepSelectionList';
import { TrainingDataPanel } from '@/components/one-on-one-prep/TrainingDataPanel';
import { PrepForm } from '@/components/one-on-one-prep/PrepForm';
import { ManagerPrepForm, ManagerPrepFormData, initialManagerPrepFormData } from '@/components/one-on-one-prep/ManagerPrepForm';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { ArrowLeft, ArrowRight, SkipForward, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRepOrder } from '@/hooks/useRepOrder';

export interface PrepFormData {
  week_description: string;
  big_win: string;
  completed_challenge: string;
  upcoming_activities: string;
  pitch_work_needed: string;
  weekly_mission: string;
}

const initialFormData: PrepFormData = {
  week_description: '',
  big_win: '',
  completed_challenge: '',
  upcoming_activities: '',
  pitch_work_needed: '',
  weekly_mission: '',
};

/** Get current PST Monday as ISO string */
function getPSTMondayISO(): string {
  const now = new Date();
  // Convert to PST
  const pst = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const monday = startOfWeek(pst, { weekStartsOn: 1 });
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

export default function OneOnOnePrepPage() {
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = (searchParams.get('mode') === 'manager' ? 'manager' : 'rookie') as 'rookie' | 'manager';
  const repFromUrl = searchParams.get('rep');

  const {
    reps, needsAttention, onTrack, teamName,
    loading, lastMonday, lastSunday, refresh,
  } = useOneOnOnePrep(mode);

  const allReps = [...needsAttention, ...onTrack];
  const { orderedReps, reorder, resetToDefault } = useRepOrder(user?.id, allReps);

  const [selectedRepId, setSelectedRepId] = useState<string | null>(repFromUrl);
  const [completedRepIds, setCompletedRepIds] = useState<Set<string>>(new Set());
  const [loadingCompleted, setLoadingCompleted] = useState(true);
  const [existingForSelectedRep, setExistingForSelectedRep] = useState(false);
  const [formData, setFormData] = useState<PrepFormData>(initialFormData);
  const [mgrFormData, setMgrFormData] = useState<ManagerPrepFormData>(initialManagerPrepFormData);
  const [submitting, setSubmitting] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'data' | 'form'>('data');

  // Use orderedReps for ALL navigation, but skip completed reps
  const incompleteReps = orderedReps.filter(r => !completedRepIds.has(r.user_id));
  const selectedRep = orderedReps.find(r => r.user_id === selectedRepId) || null;
  const currentIncompleteIndex = selectedRep ? incompleteReps.findIndex(r => r.user_id === selectedRep.user_id) : -1;
  const prevRep = currentIncompleteIndex > 0 ? incompleteReps[currentIncompleteIndex - 1] : null;
  const nextRep = currentIncompleteIndex < incompleteReps.length - 1 ? incompleteReps[currentIncompleteIndex + 1] : null;

  // ── Load completed rep IDs from database ──
  const fetchCompletedReps = useCallback(async () => {
    if (!user?.id) return;
    setLoadingCompleted(true);
    try {
      const weekStart = getPSTMondayISO();

      if (mode === 'rookie') {
        const { data } = await supabase
          .from('weekly_one_on_ones_rookie')
          .select('rookie_user_id')
          .eq('submitted_by', user.id)
          .gte('created_at', weekStart);
        const ids = new Set((data || []).map(r => r.rookie_user_id).filter(Boolean) as string[]);
        setCompletedRepIds(ids);
      } else {
        const { data } = await supabase
          .from('weekly_one_on_ones_manager')
          .select('manager_user_id')
          .eq('submitted_by', user.id)
          .gte('created_at', weekStart);
        const ids = new Set((data || []).map(r => r.manager_user_id).filter(Boolean) as string[]);
        setCompletedRepIds(ids);
      }
    } catch (err) {
      console.error('Failed to load completed 1:1s:', err);
    } finally {
      setLoadingCompleted(false);
    }
  }, [user?.id, mode]);

  useEffect(() => { fetchCompletedReps(); }, [fetchCompletedReps]);

  // ── Check if selected rep already has a submission this week ──
  useEffect(() => {
    if (!selectedRepId || !user?.id) {
      setExistingForSelectedRep(false);
      return;
    }
    setExistingForSelectedRep(completedRepIds.has(selectedRepId));
  }, [selectedRepId, completedRepIds, user?.id]);

  // ── Restore rep from URL on load ──
  useEffect(() => {
    if (repFromUrl && orderedReps.length > 0 && !selectedRepId) {
      const found = orderedReps.find(r => r.user_id === repFromUrl);
      if (found) setSelectedRepId(found.user_id);
    }
  }, [repFromUrl, reps]);

  // ── Reset form when switching reps ──
  useEffect(() => {
    if (!selectedRepId) return;
    if (mode === 'manager') setMgrFormData(initialManagerPrepFormData);
    else setFormData(initialFormData);
  }, [selectedRepId, mode]);

  const handleSelectRep = (userId: string) => {
    setSelectedRepId(userId);
    setMobilePanel('data');
    // Persist in URL
    const params = new URLSearchParams(searchParams);
    params.set('rep', userId);
    setSearchParams(params, { replace: true });
  };

  const handleBack = () => {
    setSelectedRepId(null);
    const params = new URLSearchParams(searchParams);
    params.delete('rep');
    setSearchParams(params, { replace: true });
  };

  const handleSubmitRookie = async () => {
    if (!user?.id || !selectedRep || !profile) return;
    const required = ['week_description', 'big_win', 'completed_challenge', 'upcoming_activities', 'pitch_work_needed', 'weekly_mission'] as const;
    for (const field of required) {
      if (!formData[field].trim()) {
        toast.error('Please fill out all fields');
        return;
      }
    }

    setSubmitting(true);
    try {
      let teamNameForForm = selectedRep.team_name || teamName || '';
      const { data: submission, error } = await supabase
        .from('weekly_one_on_ones_rookie')
        .insert({
          rookie_name: selectedRep.full_name,
          rookie_user_id: selectedRep.user_id,
          manager_name: profile.full_name,
          team: teamNameForForm,
          week_description: formData.week_description,
          big_win: formData.big_win,
          completed_challenge: formData.completed_challenge,
          upcoming_activities: formData.upcoming_activities,
          pitch_work_needed: formData.pitch_work_needed,
          weekly_mission: formData.weekly_mission,
          submitted_by: user.id,
          submitted_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      // DB save confirmed — now create tasks
      await createTasksFromRookieForm(
        selectedRep.user_id, submission.id, user.id,
        formData.pitch_work_needed, formData.weekly_mission
      );

      // Award points
      try {
        await (supabase as any).rpc('award_training_points', {
          p_user_id: selectedRep.user_id,
          p_points: 50,
        });
      } catch {}

      // Update local completed set immediately + refetch from DB
      setCompletedRepIds(prev => new Set([...prev, selectedRep.user_id]));
      toast.success(`✅ 1:1 saved for ${selectedRep.full_name}`);

      // Refetch from DB to ensure consistency
      fetchCompletedReps();

      advanceToNext();
    } catch (err) {
      console.error('Error submitting 1:1:', err);
      toast.error('Failed to save. Your form data is preserved — try again.');
      // Form data NOT cleared on failure
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitManager = async () => {
    if (!user?.id || !selectedRep || !profile) return;
    const required = ['rep_relationship', 'obstacles_encountered', 'obstacles_review', 'completed_mission', 'weekly_mission', 'recruit_goal', 'gethawx_review', 'training_progress_check', 'interview_forms_check', 'upcoming_events', 'manager_improvement'] as const;
    for (const field of required) {
      if (!mgrFormData[field].trim()) {
        toast.error('Please fill out all fields');
        return;
      }
    }

    setSubmitting(true);
    try {
      let teamNameForForm = selectedRep.team_name || teamName || '';
      const { data: submission, error } = await supabase
        .from('weekly_one_on_ones_manager')
        .insert({
          manager_name: selectedRep.full_name,
          manager_user_id: selectedRep.user_id,
          interviewer_name: profile.full_name,
          team: teamNameForForm,
          rep_relationship: mgrFormData.rep_relationship,
          obstacles_encountered: mgrFormData.obstacles_encountered,
          obstacles_review: mgrFormData.obstacles_review,
          completed_mission: mgrFormData.completed_mission,
          weekly_mission: mgrFormData.weekly_mission,
          recruit_goal: mgrFormData.recruit_goal,
          gethawx_review: mgrFormData.gethawx_review,
          training_progress_check: mgrFormData.training_progress_check,
          interview_forms_check: mgrFormData.interview_forms_check,
          upcoming_events: mgrFormData.upcoming_events,
          team_development: mgrFormData.team_development,
          system_utilization_rating: mgrFormData.system_utilization_rating,
          manager_improvement: mgrFormData.manager_improvement,
          submitted_by: user.id,
          submitted_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      await createTasksFromManagerForm(
        selectedRep.user_id, submission.id, user.id,
        mgrFormData.weekly_mission, mgrFormData.recruit_goal
      );

      try {
        await (supabase as any).rpc('award_training_points', {
          p_user_id: selectedRep.user_id,
          p_points: 50,
        });
      } catch {}

      setCompletedRepIds(prev => new Set([...prev, selectedRep.user_id]));
      toast.success(`✅ Manager 1:1 saved for ${selectedRep.full_name}`);
      fetchCompletedReps();
      advanceToNext();
    } catch (err) {
      console.error('Error submitting manager 1:1:', err);
      toast.error('Failed to save. Your form data is preserved — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const advanceToNext = () => {
    if (nextRep) {
      handleSelectRep(nextRep.user_id);
    } else {
      handleBack();
      toast.success('🎉 All 1:1s completed!');
    }
  };

  const handleResetOrder = async () => {
    await resetToDefault();
    toast.success('Reset to alphabetical order');
  };

  const modeLabel = mode === 'manager' ? 'Manager' : 'Rookie';

  if (!selectedRep) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <PageBackButton to="/app/forms" label="Forms" />
          <div className="mb-6 mt-2">
            <h1 className="text-xl font-bold text-foreground">
              {modeLabel} 1:1 Prep — {teamName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Week of {format(lastMonday, 'MMM d')} – {format(lastSunday, 'MMM d, yyyy')}
            </p>
          </div>
          <RepSelectionList
            orderedReps={orderedReps}
            completedRepIds={completedRepIds}
            onSelect={handleSelectRep}
            onReorder={reorder}
            onReset={handleResetOrder}
            loading={loading || loadingCompleted}
            totalReps={orderedReps.length}
            completedCount={completedRepIds.size}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-3rem)]">

        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-card/50">
          <button onClick={handleBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to roster
          </button>
          <span className="text-xs text-muted-foreground">
            {completedRepIds.size} of {orderedReps.length} completed
          </span>
        </div>

        {/* Duplicate warning */}
        {existingForSelectedRep && (
          <div className="mx-4 mt-2 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
            <span className="text-yellow-600 dark:text-yellow-400">
              You already submitted a 1:1 for <strong>{selectedRep.full_name}</strong> this week. Submitting again will create a duplicate.
            </span>
          </div>
        )}

        {/* Mobile panel toggle */}
        {isMobile && (
          <div className="flex border-b border-border/30">
            <button
              onClick={() => setMobilePanel('data')}
              className={cn(
                'flex-1 py-2 text-xs font-medium text-center transition-colors',
                mobilePanel === 'data' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              )}
            >
              📊 Training Data
            </button>
            <button
              onClick={() => setMobilePanel('form')}
              className={cn(
                'flex-1 py-2 text-xs font-medium text-center transition-colors',
                mobilePanel === 'form' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              )}
            >
              📝 1:1 Form
            </button>
          </div>
        )}

        {/* Split screen */}
        <div className="flex-1 flex overflow-hidden">
          <div className={cn(
            'overflow-y-auto border-r border-border/20',
            isMobile
              ? mobilePanel === 'data' ? 'w-full' : 'hidden'
              : 'w-[40%] min-w-[320px]'
          )}>
            <TrainingDataPanel
              rep={selectedRep}
              lastMonday={lastMonday}
              lastSunday={lastSunday}
            />
          </div>

          <div className={cn(
            'overflow-y-auto flex-1 relative',
            isMobile
              ? mobilePanel === 'form' ? 'w-full' : 'hidden'
              : ''
          )}>
            {mode === 'manager' ? (
              <ManagerPrepForm
                rep={selectedRep}
                formData={mgrFormData}
                setFormData={setMgrFormData}
                onSubmit={handleSubmitManager}
                submitting={submitting}
                nextRepName={nextRep?.full_name}
              />
            ) : (
              <PrepForm
                rep={selectedRep}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmitRookie}
                submitting={submitting}
                nextRepName={nextRep?.full_name}
              />
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 bg-card/50">
          <Button
            variant="ghost"
            size="sm"
            disabled={!prevRep}
            onClick={() => prevRep && handleSelectRep(prevRep.user_id)}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">{prevRep?.full_name.split(' ')[0] || 'Prev'}</span>
          </Button>

          <div className="flex items-center gap-2">
            {nextRep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectRep(nextRep.user_id)}
              >
                <SkipForward className="w-3.5 h-3.5 mr-1" /> Skip
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={!nextRep}
            onClick={() => nextRep && handleSelectRep(nextRep.user_id)}
          >
            <span className="hidden sm:inline">{nextRep?.full_name.split(' ')[0] || 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
