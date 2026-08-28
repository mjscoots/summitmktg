import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createTasksFromRookieForm, createTasksFromManagerForm } from '@/hooks/usePriorityTasks';
import { ActionItemsField } from '@/components/shared/ActionItemsField';
import { PrepForm } from '@/components/one-on-one-prep/PrepForm';
import { ManagerPrepForm, ManagerPrepFormData, initialManagerPrepFormData } from '@/components/one-on-one-prep/ManagerPrepForm';
import { WeekContextCard } from '@/components/one-on-one-prep/WeekContextCard';
import { RepFactsCard } from '@/components/one-on-one-prep/RepFactsCard';
import { PrepRosterView } from '@/components/one-on-one-prep/PrepRosterView';
import { usePrepRoster, PrepRosterPerson, nextYearLabel } from '@/hooks/usePrepRoster';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { PageHeader } from '@/components/layout/PageHeader';
import type { PrepRep } from '@/hooks/useOneOnOnePrep';

export interface PrepFormData {
  week_description: string;
  big_win: string;
  completed_challenge: string;
  upcoming_activities: string;
  pitch_work_needed: string;
  weekly_mission: string;
  commitment: string;
  focus_area: string;
}

const initialFormData: PrepFormData = {
  week_description: '',
  big_win: '',
  completed_challenge: '',
  upcoming_activities: '',
  pitch_work_needed: '',
  weekly_mission: '',
  commitment: '',
  focus_area: '',
};

export default function OneOnOnePrepPage() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') === 'manager' ? 'manager' : 'rookie') as 'rookie' | 'manager';

  const { groups, total, loggedIds, owedCount, loading, search, setSearch, markLogged, refresh } = usePrepRoster(mode);

  const [person, setPerson] = useState<PrepRosterPerson | null>(null);
  const [formData, setFormData] = useState<PrepFormData>(initialFormData);
  const [mgrFormData, setMgrFormData] = useState<ManagerPrepFormData>(initialManagerPrepFormData);
  const [submitting, setSubmitting] = useState(false);

  const openPerson = (p: PrepRosterPerson) => {
    setPerson(p);
    setFormData(initialFormData);
    setMgrFormData(initialManagerPrepFormData);
  };

  const formRep = person
    ? ({ user_id: person.user_id, full_name: person.full_name, team_name: person.team_name } as PrepRep)
    : null;

  const handleSubmitRookie = async () => {
    if (!user?.id || !person || !profile) return;
    const required = ['week_description', 'big_win', 'completed_challenge', 'upcoming_activities', 'pitch_work_needed', 'weekly_mission'] as const;
    for (const field of required) {
      if (!formData[field].trim()) {
        toast.error('Please fill out all fields');
        return;
      }
    }
    setSubmitting(true);
    try {
      const { data: submission, error } = await supabase
        .from('weekly_one_on_ones_rookie')
        .insert({
          rookie_name: person.full_name,
          rookie_user_id: person.user_id,
          manager_name: profile.full_name,
          team: person.team_name || '',
          week_description: formData.week_description,
          big_win: formData.big_win,
          completed_challenge: formData.completed_challenge,
          upcoming_activities: formData.upcoming_activities,
          pitch_work_needed: formData.pitch_work_needed,
          weekly_mission: formData.weekly_mission,
          commitment: formData.commitment.trim() || null,
          focus_area: formData.focus_area || null,
          submitted_by: user.id,
          submitted_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) throw error;

      await createTasksFromRookieForm(
        person.user_id, submission.id, user.id,
        formData.pitch_work_needed, formData.weekly_mission
      );
      try {
        await (supabase as any).rpc('award_training_points', { p_user_id: person.user_id, p_points: 50 });
      } catch {}

      markLogged(person.user_id);
      toast.success(`1:1 saved for ${person.full_name}`);
      setPerson(null);
      void refresh();
    } catch (err) {
      console.error('Error submitting 1:1:', err);
      toast.error('Failed to save. Your form data is preserved, try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitManager = async () => {
    if (!user?.id || !person || !profile) return;
    const required = ['rep_relationship', 'obstacles_encountered', 'obstacles_review', 'completed_mission', 'weekly_mission', 'recruit_goal', 'gethawx_review', 'training_progress_check', 'interview_forms_check', 'upcoming_events', 'manager_improvement'] as const;
    for (const field of required) {
      if (!mgrFormData[field].trim()) {
        toast.error('Please fill out all fields');
        return;
      }
    }
    setSubmitting(true);
    try {
      const { data: submission, error } = await supabase
        .from('weekly_one_on_ones_manager')
        .insert({
          manager_name: person.full_name,
          manager_user_id: person.user_id,
          interviewer_name: profile.full_name,
          team: person.team_name || '',
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
          commitment: mgrFormData.commitment.trim() || null,
          focus_area: mgrFormData.focus_area || null,
          submitted_by: user.id,
          submitted_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) throw error;

      await createTasksFromManagerForm(
        person.user_id, submission.id, user.id,
        mgrFormData.weekly_mission, mgrFormData.recruit_goal
      );
      try {
        await (supabase as any).rpc('award_training_points', { p_user_id: person.user_id, p_points: 50 });
      } catch {}

      markLogged(person.user_id);
      toast.success(`Manager 1:1 saved for ${person.full_name}`);
      setPerson(null);
      void refresh();
    } catch (err) {
      console.error('Error submitting manager 1:1:', err);
      toast.error('Failed to save. Your form data is preserved, try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 py-6 pb-28">
        <PageBackButton to="/app/forms" label="Forms" />
        <PageHeader
          title="Prep this week's one on one"
          context={total > 0 ? `${owedCount} of ${total} not logged this week` : undefined}
          className="mb-6 mt-2"
        />
        <PrepRosterView
          groups={groups}
          loggedIds={loggedIds}
          loading={loading}
          search={search}
          setSearch={setSearch}
          onSelect={openPerson}
        />
      </div>

      <Sheet open={!!person} onOpenChange={(open) => { if (!open) setPerson(null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {person && formRep ? (
            <>
              <SheetHeader className="mb-4 text-left">
                <SheetTitle className="text-base">{person.full_name}</SheetTitle>
                <p className="text-[12px] text-muted-foreground">
                  {person.is_vet ? 'Vet' : 'Rookie'} · {nextYearLabel(person.rep_year)} for 2027
                  {person.team_name ? ` · ${person.team_name}` : ''}
                </p>
              </SheetHeader>

              <RepFactsCard userId={person.user_id} mode={mode} />
              <div className="h-3" />
              <WeekContextCard userId={person.user_id} />

              <div className="mt-4">
                {mode === 'manager' ? (
                  <ManagerPrepForm
                    rep={formRep}
                    formData={mgrFormData}
                    setFormData={setMgrFormData}
                    onSubmit={handleSubmitManager}
                    submitting={submitting}
                  />
                ) : (
                  <PrepForm
                    rep={formRep}
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmitRookie}
                    submitting={submitting}
                  />
                )}
              </div>

              <div className="px-1 pb-10">
                <h3 className="mb-1 text-sm font-semibold text-foreground">Action items</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Saved instantly. {person.full_name.split(' ')[0]} sees these on their Home page.
                </p>
                <ActionItemsField
                  source="one-on-one"
                  assignees={[{ user_id: person.user_id, full_name: person.full_name }]}
                  defaultAssignee={person.user_id}
                />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
