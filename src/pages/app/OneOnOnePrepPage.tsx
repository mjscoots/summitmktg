import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOneOnOnePrep, PrepRep } from '@/hooks/useOneOnOnePrep';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { createTasksFromRookieForm, createTasksFromManagerForm } from '@/hooks/usePriorityTasks';
import { RepSelectionList } from '@/components/one-on-one-prep/RepSelectionList';
import { TrainingDataPanel } from '@/components/one-on-one-prep/TrainingDataPanel';
import { PrepForm } from '@/components/one-on-one-prep/PrepForm';
import { ManagerPrepForm, ManagerPrepFormData, initialManagerPrepFormData } from '@/components/one-on-one-prep/ManagerPrepForm';
import { ArrowLeft, ArrowRight, Save, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const DRAFT_PREFIX = 'one-on-one-draft-';
const MGR_DRAFT_PREFIX = 'one-on-one-mgr-draft-';

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

export default function OneOnOnePrepPage() {
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') === 'manager' ? 'manager' : 'rookie') as 'rookie' | 'manager';

  const {
    reps, needsAttention, onTrack, teamName,
    loading, lastMonday, lastSunday, refresh,
  } = useOneOnOnePrep(mode);

  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [completedRepIds, setCompletedRepIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<PrepFormData>(initialFormData);
  const [mgrFormData, setMgrFormData] = useState<ManagerPrepFormData>(initialManagerPrepFormData);
  const [submitting, setSubmitting] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'data' | 'form'>('data');

  const draftPrefix = mode === 'manager' ? MGR_DRAFT_PREFIX : DRAFT_PREFIX;

  const selectedRep = reps.find(r => r.user_id === selectedRepId) || null;
  const currentIndex = selectedRep ? reps.indexOf(selectedRep) : -1;
  const prevRep = currentIndex > 0 ? reps[currentIndex - 1] : null;
  const nextRep = currentIndex < reps.length - 1 ? reps[currentIndex + 1] : null;

  // Load draft on rep selection
  useEffect(() => {
    if (!selectedRepId) return;
    const draft = localStorage.getItem(draftPrefix + selectedRepId);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (mode === 'manager') setMgrFormData(parsed);
        else setFormData(parsed);
      } catch {
        if (mode === 'manager') setMgrFormData(initialManagerPrepFormData);
        else setFormData(initialFormData);
      }
    } else {
      if (mode === 'manager') setMgrFormData(initialManagerPrepFormData);
      else setFormData(initialFormData);
    }
  }, [selectedRepId, mode]);

  // Auto-save draft every 30s
  useEffect(() => {
    if (!selectedRepId) return;
    const data = mode === 'manager' ? mgrFormData : formData;
    const interval = setInterval(() => {
      const hasContent = Object.values(data).some(v =>
        typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : false
      );
      if (hasContent) {
        localStorage.setItem(draftPrefix + selectedRepId, JSON.stringify(data));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedRepId, formData, mgrFormData, mode]);

  const handleSelectRep = (userId: string) => {
    setSelectedRepId(userId);
    setMobilePanel('data');
  };

  const handleBack = () => setSelectedRepId(null);

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

      const tasksCreated = await createTasksFromRookieForm(
        selectedRep.user_id, submission.id, user.id,
        formData.pitch_work_needed, formData.weekly_mission
      );

      localStorage.removeItem(draftPrefix + selectedRepId);
      setCompletedRepIds(prev => new Set([...prev, selectedRep.user_id]));
      toast.success(`1:1 submitted for ${selectedRep.full_name}! ${tasksCreated} tasks created.`);
      advanceToNext();
    } catch (err) {
      console.error('Error submitting 1:1:', err);
      toast.error('Failed to submit. Please try again.');
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

      const tasksCreated = await createTasksFromManagerForm(
        selectedRep.user_id, submission.id, user.id,
        mgrFormData.weekly_mission, mgrFormData.recruit_goal
      );

      localStorage.removeItem(draftPrefix + selectedRepId);
      setCompletedRepIds(prev => new Set([...prev, selectedRep.user_id]));
      toast.success(`Manager 1:1 submitted for ${selectedRep.full_name}! ${tasksCreated} tasks created.`);
      advanceToNext();
    } catch (err) {
      console.error('Error submitting manager 1:1:', err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const advanceToNext = () => {
    if (nextRep) {
      setSelectedRepId(nextRep.user_id);
    } else {
      setSelectedRepId(null);
      toast.success('🎉 All 1:1s completed!');
    }
  };

  const saveDraft = () => {
    if (!selectedRepId) return;
    const data = mode === 'manager' ? mgrFormData : formData;
    localStorage.setItem(draftPrefix + selectedRepId, JSON.stringify(data));
    toast.success('Draft saved');
  };

  const modeLabel = mode === 'manager' ? 'Manager' : 'Rookie';

  if (!selectedRep) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">
              {modeLabel} 1:1 Prep — {teamName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Week of {format(lastMonday, 'MMM d')} – {format(lastSunday, 'MMM d, yyyy')}
            </p>
          </div>
          <RepSelectionList
            needsAttention={needsAttention}
            onTrack={onTrack}
            completedRepIds={completedRepIds}
            onSelect={handleSelectRep}
            loading={loading}
            totalReps={reps.length}
            completedCount={completedRepIds.size}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-card/50">
          <button onClick={handleBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to roster
          </button>
          <span className="text-xs text-muted-foreground">
            {completedRepIds.size} of {reps.length} completed
          </span>
        </div>

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
          {/* Data panel */}
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

          {/* Form panel */}
          <div className={cn(
            'overflow-y-auto flex-1',
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
            onClick={() => prevRep && setSelectedRepId(prevRep.user_id)}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">{prevRep?.full_name.split(' ')[0] || 'Prev'}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={saveDraft}>
              <Save className="w-3.5 h-3.5 mr-1" /> Draft
            </Button>
            {nextRep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRepId(nextRep.user_id)}
              >
                <SkipForward className="w-3.5 h-3.5 mr-1" /> Skip
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={!nextRep}
            onClick={() => nextRep && setSelectedRepId(nextRep.user_id)}
          >
            <span className="hidden sm:inline">{nextRep?.full_name.split(' ')[0] || 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
