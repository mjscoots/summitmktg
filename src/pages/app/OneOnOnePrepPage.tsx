import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOneOnOnePrep, PrepRep } from '@/hooks/useOneOnOnePrep';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { createTasksFromRookieForm } from '@/hooks/usePriorityTasks';
import { RepSelectionList } from '@/components/one-on-one-prep/RepSelectionList';
import { TrainingDataPanel } from '@/components/one-on-one-prep/TrainingDataPanel';
import { PrepForm } from '@/components/one-on-one-prep/PrepForm';
import { ArrowLeft, ArrowRight, Save, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const DRAFT_PREFIX = 'one-on-one-draft-';

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
  const {
    reps, needsAttention, onTrack, teamName,
    loading, lastMonday, lastSunday, refresh,
  } = useOneOnOnePrep();

  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [completedRepIds, setCompletedRepIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<PrepFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'data' | 'form'>('data');

  const selectedRep = reps.find(r => r.user_id === selectedRepId) || null;
  const currentIndex = selectedRep ? reps.indexOf(selectedRep) : -1;
  const prevRep = currentIndex > 0 ? reps[currentIndex - 1] : null;
  const nextRep = currentIndex < reps.length - 1 ? reps[currentIndex + 1] : null;

  // Load draft on rep selection
  useEffect(() => {
    if (!selectedRepId) return;
    const draft = localStorage.getItem(DRAFT_PREFIX + selectedRepId);
    if (draft) {
      try {
        setFormData(JSON.parse(draft));
      } catch { setFormData(initialFormData); }
    } else {
      setFormData(initialFormData);
    }
  }, [selectedRepId]);

  // Auto-save draft every 30s
  useEffect(() => {
    if (!selectedRepId) return;
    const interval = setInterval(() => {
      const hasContent = Object.values(formData).some(v => v.trim().length > 0);
      if (hasContent) {
        localStorage.setItem(DRAFT_PREFIX + selectedRepId, JSON.stringify(formData));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedRepId, formData]);

  const handleSelectRep = (userId: string) => {
    setSelectedRepId(userId);
    setMobilePanel('data');
  };

  const handleBack = () => setSelectedRepId(null);

  const handleSubmit = async () => {
    if (!user?.id || !selectedRep || !profile) return;
    // Validate
    const required = ['week_description', 'big_win', 'completed_challenge', 'upcoming_activities', 'pitch_work_needed', 'weekly_mission'] as const;
    for (const field of required) {
      if (!formData[field].trim()) {
        toast.error('Please fill out all fields');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Get team name for the rep
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

      // Create priority tasks
      const tasksCreated = await createTasksFromRookieForm(
        selectedRep.user_id,
        submission.id,
        user.id,
        formData.pitch_work_needed,
        formData.weekly_mission
      );

      // Clear draft
      localStorage.removeItem(DRAFT_PREFIX + selectedRepId);

      // Mark completed
      setCompletedRepIds(prev => new Set([...prev, selectedRep.user_id]));

      toast.success(`1:1 submitted for ${selectedRep.full_name}! ${tasksCreated} tasks created.`);

      // Auto-advance
      if (nextRep) {
        setSelectedRepId(nextRep.user_id);
      } else {
        setSelectedRepId(null);
        toast.success('🎉 All 1:1s completed!');
      }
    } catch (err) {
      console.error('Error submitting 1:1:', err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveDraft = () => {
    if (!selectedRepId) return;
    localStorage.setItem(DRAFT_PREFIX + selectedRepId, JSON.stringify(formData));
    toast.success('Draft saved');
  };

  if (!selectedRep) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">
              Monday 1:1 Prep — {teamName}
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
            <PrepForm
              rep={selectedRep}
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              submitting={submitting}
              nextRepName={nextRep?.full_name}
            />
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
