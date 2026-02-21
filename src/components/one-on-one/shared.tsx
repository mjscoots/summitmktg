import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Loader2, User, UserCheck, X, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserAutocomplete } from '@/components/one-on-one/UserAutocomplete';
import { createTasksFromRookieForm, createTasksFromManagerForm } from '@/hooks/usePriorityTasks';

// ── Shared Types ──────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
}

export interface RookieFormData {
  rookie_name: string;
  rookie_user_id: string | null;
  manager_name: string;
  team: string;
  week_description: string;
  big_win: string;
  completed_challenge: string;
  upcoming_activities: string;
  pitch_work_needed: string;
  weekly_mission: string;
}

export interface ManagerFormData {
  manager_name: string;
  manager_user_id: string | null;
  interviewer_name: string;
  team: string;
  rep_relationship: string;
  obstacles_encountered: string;
  obstacles_review: string;
  completed_mission: string;
  weekly_mission: string;
  recruit_goal: string;
  gethawx_review: string;
  training_progress_check: string;
  interview_forms_check: string;
  upcoming_events: string;
  team_development: string[];
  system_utilization_rating: number;
  manager_improvement: string;
}

export interface ResponseItem {
  id: string;
  form_type: 'rookie' | 'manager';
  team: string;
  submitted_at: string;
  rookie_name?: string;
  manager_name?: string;
  interviewer_name?: string;
  week_description?: string;
  system_utilization_rating?: number;
}

/** Full response row from either table, used for the detail modal. */
export interface ResponseDetail extends ResponseItem {
  big_win?: string;
  completed_challenge?: string;
  upcoming_activities?: string;
  pitch_work_needed?: string;
  weekly_mission?: string;
  rep_relationship?: string;
  obstacles_encountered?: string;
  obstacles_review?: string;
  completed_mission?: string;
  recruit_goal?: string;
  gethawx_review?: string;
  training_progress_check?: string;
  interview_forms_check?: string;
  upcoming_events?: string;
  team_development?: string[];
  manager_improvement?: string;
}

export interface FormProfile {
  full_name: string;
}

// ── Initial Form Data ─────────────────────────────────────────

export const initialRookieForm: RookieFormData = {
  rookie_name: '',
  rookie_user_id: null,
  manager_name: '',
  team: '',
  week_description: '',
  big_win: '',
  completed_challenge: '',
  upcoming_activities: '',
  pitch_work_needed: '',
  weekly_mission: ''
};

export const initialManagerForm: ManagerFormData = {
  manager_name: '',
  manager_user_id: null,
  interviewer_name: '',
  team: '',
  rep_relationship: '',
  obstacles_encountered: '',
  obstacles_review: '',
  completed_mission: '',
  weekly_mission: '',
  recruit_goal: '',
  gethawx_review: '',
  training_progress_check: '',
  interview_forms_check: '',
  upcoming_events: '',
  team_development: [],
  system_utilization_rating: 5,
  manager_improvement: ''
};

// ── Rookie-Manager 1:1 Form ──────────────────────────────────

export function RookieManagerForm({
  teams,
  profile,
  userId
}: {
  teams: Team[];
  profile: FormProfile | null;
  userId?: string;
}) {
  const [formData, setFormData] = useState<RookieFormData>({
    ...initialRookieForm,
    manager_name: profile?.full_name || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleRookieNameChange = (name: string, userId: string | null) => {
    setFormData(prev => ({ ...prev, rookie_name: name, rookie_user_id: userId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!formData.rookie_user_id) {
      toast.error('Please select a valid rookie from the suggestions');
      return;
    }
    setSubmitting(true);
    try {
      const { data: submission, error } = await supabase
        .from('weekly_one_on_ones_rookie')
        .insert({
          rookie_name: formData.rookie_name,
          rookie_user_id: formData.rookie_user_id,
          manager_name: formData.manager_name,
          team: formData.team,
          week_description: formData.week_description,
          big_win: formData.big_win,
          completed_challenge: formData.completed_challenge,
          upcoming_activities: formData.upcoming_activities,
          pitch_work_needed: formData.pitch_work_needed,
          weekly_mission: formData.weekly_mission,
          submitted_by: userId,
          submitted_at: new Date().toISOString()
        })
        .select('id')
        .single();
      if (error) throw error;
      const tasksCreated = await createTasksFromRookieForm(
        formData.rookie_user_id,
        submission.id,
        userId,
        formData.pitch_work_needed,
        formData.weekly_mission
      );
      toast.success(`Rookie 1:1 submitted! ${tasksCreated} tasks created for ${formData.rookie_name}`);
      setFormData({ ...initialRookieForm, manager_name: profile?.full_name || '' });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          1 on 1 Weekly Interviews for Rookies
        </h2>
        <p className="text-sm text-muted-foreground">
          Keep these to 30 minutes or less. The primary purpose is to maintain consistent communication.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="rookie_name">
            Name of Rookie <span className="text-destructive">*</span>
          </Label>
          <UserAutocomplete
            id="rookie_name"
            value={formData.rookie_name}
            selectedUserId={formData.rookie_user_id}
            onChange={handleRookieNameChange}
            placeholder="Start typing rookie's name..."
            filterRole="rookie"
            required
          />
          <p className="text-xs text-muted-foreground">
            Tasks will be automatically created for this rookie based on your responses
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="manager_name">
            Name of Manager <span className="text-destructive">*</span>
          </Label>
          <Input
            id="manager_name"
            value={formData.manager_name}
            onChange={e => setFormData({ ...formData, manager_name: e.target.value })}
            placeholder="Enter manager's full name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="team">
            What Team system are they apart of? <span className="text-destructive">*</span>
          </Label>
          <select
            id="team"
            value={formData.team}
            onChange={e => setFormData({ ...formData, team: e.target.value })}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            required
          >
            <option value="">Select your team</option>
            {teams.map(team => (
              <option key={team.id} value={team.name}>{team.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="week_description">
            Describe your week in 1 sentence <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="week_description"
            value={formData.week_description}
            onChange={e => setFormData({ ...formData, week_description: e.target.value })}
            placeholder="One sentence summary of the week"
            rows={2}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="big_win">
            What was a big win you had this week? <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="big_win"
            value={formData.big_win}
            onChange={e => setFormData({ ...formData, big_win: e.target.value })}
            placeholder="Describe your biggest win this week"
            rows={3}
            required
          />
        </div>

        <div className="space-y-3">
          <Label>
            Did you complete the challenge from last week? <span className="text-destructive">*</span>
          </Label>
          <RadioGroup
            value={formData.completed_challenge}
            onValueChange={value => setFormData({ ...formData, completed_challenge: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Yes" id="challenge-yes" />
              <Label htmlFor="challenge-yes" className="cursor-pointer">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id="challenge-no" />
              <Label htmlFor="challenge-no" className="cursor-pointer">No</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="upcoming_activities">
            Review any activities coming up <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Check to see if they accomplished their mission from the previous week?
          </p>
          <Textarea
            id="upcoming_activities"
            value={formData.upcoming_activities}
            onChange={e => setFormData({ ...formData, upcoming_activities: e.target.value })}
            placeholder="List upcoming activities and review previous mission"
            rows={3}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pitch_work_needed">
            What does the rep need to work on in their pitch? <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Remember the compliment sandwich: praise, correction, praise.
          </p>
          <p className="text-xs text-primary font-medium">
            📋 This will become a daily task in their Today's Priorities
          </p>
          <Textarea
            id="pitch_work_needed"
            value={formData.pitch_work_needed}
            onChange={e => setFormData({ ...formData, pitch_work_needed: e.target.value })}
            placeholder="Praise → Correction → Praise"
            rows={4}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weekly_mission">
            Give a mission to complete for the week? <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-primary font-medium">
            📋 This will become a daily task in their Today's Priorities
          </p>
          <Textarea
            id="weekly_mission"
            value={formData.weekly_mission}
            onChange={e => setFormData({ ...formData, weekly_mission: e.target.value })}
            placeholder="What is the mission for next week?"
            rows={3}
            required
          />
        </div>

        <div className="pt-4">
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Rookie 1:1 Form'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ── Manager 1:1 Form ─────────────────────────────────────────

export function ManagerForm({
  teams,
  profile,
  userId
}: {
  teams: Team[];
  profile: FormProfile | null;
  userId?: string;
}) {
  const [formData, setFormData] = useState<ManagerFormData>({
    ...initialManagerForm,
    interviewer_name: profile?.full_name || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleManagerNameChange = (name: string, userId: string | null) => {
    setFormData(prev => ({ ...prev, manager_name: name, manager_user_id: userId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!formData.manager_user_id) {
      toast.error('Please select a valid manager from the suggestions');
      return;
    }
    setSubmitting(true);
    try {
      const { data: submission, error } = await supabase
        .from('weekly_one_on_ones_manager')
        .insert({
          manager_name: formData.manager_name,
          manager_user_id: formData.manager_user_id,
          interviewer_name: formData.interviewer_name,
          team: formData.team,
          rep_relationship: formData.rep_relationship,
          obstacles_encountered: formData.obstacles_encountered,
          obstacles_review: formData.obstacles_review,
          completed_mission: formData.completed_mission,
          weekly_mission: formData.weekly_mission,
          recruit_goal: formData.recruit_goal,
          gethawx_review: formData.gethawx_review,
          training_progress_check: formData.training_progress_check,
          interview_forms_check: formData.interview_forms_check,
          upcoming_events: formData.upcoming_events,
          team_development: formData.team_development,
          system_utilization_rating: formData.system_utilization_rating,
          manager_improvement: formData.manager_improvement,
          submitted_by: userId,
          submitted_at: new Date().toISOString()
        })
        .select('id')
        .single();
      if (error) throw error;
      const tasksCreated = await createTasksFromManagerForm(
        formData.manager_user_id,
        submission.id,
        userId,
        formData.weekly_mission,
        formData.recruit_goal
      );
      toast.success(`Manager 1:1 submitted! ${tasksCreated} tasks created for ${formData.manager_name}`);
      setFormData({ ...initialManagerForm, interviewer_name: profile?.full_name || '' });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTeamDevelopment = (option: string) => {
    setFormData(prev => ({
      ...prev,
      team_development: prev.team_development.includes(option)
        ? prev.team_development.filter(item => item !== option)
        : [...prev.team_development, option]
    }));
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          1 on 1 Manager Form
        </h2>
        <p className="text-sm text-muted-foreground">
          Maintain consistent one-on-one interviews with managers and key team members.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="manager_name_mgr">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <UserAutocomplete
            id="manager_name_mgr"
            value={formData.manager_name}
            selectedUserId={formData.manager_user_id}
            onChange={handleManagerNameChange}
            placeholder="Start typing manager's name..."
            filterRole="manager"
            required
          />
          <p className="text-xs text-muted-foreground">
            Tasks will be automatically created for this manager based on your responses
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="interviewer_name">
            Name of Manager <span className="text-destructive">*</span>
          </Label>
          <Input
            id="interviewer_name"
            value={formData.interviewer_name}
            onChange={e => setFormData({ ...formData, interviewer_name: e.target.value })}
            placeholder="Person conducting the 1:1"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="team_mgr">
            What Team system are you part of? <span className="text-destructive">*</span>
          </Label>
          <select
            id="team_mgr"
            value={formData.team}
            onChange={e => setFormData({ ...formData, team: e.target.value })}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            required
          >
            <option value="">Choose</option>
            {teams.map(team => (
              <option key={team.id} value={team.name}>{team.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rep_relationship">
            Ask about their relationship with their reps. <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="rep_relationship"
            value={formData.rep_relationship}
            onChange={e => setFormData({ ...formData, rep_relationship: e.target.value })}
            rows={3}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="obstacles_encountered">
            What obstacles did you encounter this week? How do we solve them? <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="obstacles_encountered"
            value={formData.obstacles_encountered}
            onChange={e => setFormData({ ...formData, obstacles_encountered: e.target.value })}
            rows={4}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="obstacles_review">
            Review the obstacles we talked about last week. <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Refer to the answers from last week in the Responses tab.
          </p>
          <Textarea
            id="obstacles_review"
            value={formData.obstacles_review}
            onChange={e => setFormData({ ...formData, obstacles_review: e.target.value })}
            rows={3}
            required
          />
        </div>

        <div className="space-y-3">
          <Label>
            Did you complete your mission last week? <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Refer to the answers from last week in the Responses tab.
          </p>
          <RadioGroup
            value={formData.completed_mission}
            onValueChange={value => setFormData({ ...formData, completed_mission: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Yes" id="mission-yes" />
              <Label htmlFor="mission-yes" className="cursor-pointer">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id="mission-no" />
              <Label htmlFor="mission-no" className="cursor-pointer">No</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="weekly_mission_mgr">
            This week's mission: <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-primary font-medium">
            📋 This will become a daily task in their Today's Priorities
          </p>
          <Textarea
            id="weekly_mission_mgr"
            value={formData.weekly_mission}
            onChange={e => setFormData({ ...formData, weekly_mission: e.target.value })}
            rows={3}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recruit_goal">
            What is your goal for new recruits this week? <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-primary font-medium">
            📋 This will become a daily task in their Today's Priorities
          </p>
          <Input
            id="recruit_goal"
            value={formData.recruit_goal}
            onChange={e => setFormData({ ...formData, recruit_goal: e.target.value })}
            placeholder="Number of recruits or specific goal"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gethawx_review">
            Review onboarded percentage on Gethawx <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="gethawx_review"
            value={formData.gethawx_review}
            onChange={e => setFormData({ ...formData, gethawx_review: e.target.value })}
            rows={2}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="training_progress_check">
            Check Reps Training Progress <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="training_progress_check"
            value={formData.training_progress_check}
            onChange={e => setFormData({ ...formData, training_progress_check: e.target.value })}
            rows={2}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interview_forms_check">
            Check Interview Forms <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="interview_forms_check"
            value={formData.interview_forms_check}
            onChange={e => setFormData({ ...formData, interview_forms_check: e.target.value })}
            rows={2}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="upcoming_events">
            Review any current events every week coming up. <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">Review Calendar</p>
          <Textarea
            id="upcoming_events"
            value={formData.upcoming_events}
            onChange={e => setFormData({ ...formData, upcoming_events: e.target.value })}
            rows={3}
            required
          />
        </div>

        <div className="space-y-3">
          <Label>
            What are you doing for team development? <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">Select one or more</p>
          <div className="flex flex-wrap gap-4">
            {['Recruiting', 'Posting', 'Training'].map(option => (
              <label key={option} className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={formData.team_development.includes(option)}
                  onCheckedChange={() => toggleTeamDevelopment(option)}
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>
            On a scale of 1-10 how well are you and your downline utilizing the system? <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setFormData({ ...formData, system_utilization_rating: num })}
                className={cn(
                  "w-10 h-10 rounded-lg border-2 font-semibold transition-all",
                  formData.system_utilization_rating === num
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="manager_improvement">
            What can I do to be a better manager? <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="manager_improvement"
            value={formData.manager_improvement}
            onChange={e => setFormData({ ...formData, manager_improvement: e.target.value })}
            rows={4}
            required
          />
        </div>

        <div className="pt-4">
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Manager 1:1 Form'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ── Responses Tab ─────────────────────────────────────────────

export function ResponsesTab({ teams }: { teams: Team[] }) {
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    formType: 'all',
    team: 'all',
    dateRange: 'all'
  });
  const [selectedResponse, setSelectedResponse] = useState<ResponseDetail | null>(null);

  useEffect(() => {
    loadResponses();
  }, []);

  const loadResponses = async () => {
    setLoading(true);
    try {
      const [rookieRes, managerRes] = await Promise.all([
        supabase.from('weekly_one_on_ones_rookie').select('*').order('submitted_at', { ascending: false }),
        supabase.from('weekly_one_on_ones_manager').select('*').order('submitted_at', { ascending: false })
      ]);

      const combined: ResponseItem[] = [
        ...(rookieRes.data || []).map((r) => ({ ...r, form_type: 'rookie' as const })),
        ...(managerRes.data || []).map((r) => ({ ...r, form_type: 'manager' as const }))
      ].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

      setResponses(combined);
    } catch (error) {
      console.error('Error loading responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResponses = responses.filter(r => {
    if (filters.formType !== 'all' && r.form_type !== filters.formType) return false;
    if (filters.team !== 'all' && r.team !== filters.team) return false;
    if (filters.dateRange !== 'all') {
      const submittedDate = new Date(r.submitted_at);
      const now = new Date();
      if (filters.dateRange === 'this_week') {
        if (submittedDate < startOfWeek(now, { weekStartsOn: 0 })) return false;
      } else if (filters.dateRange === 'last_week') {
        const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
        const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
        if (submittedDate < lastWeekStart || submittedDate > lastWeekEnd) return false;
      } else if (filters.dateRange === 'this_month') {
        if (submittedDate < startOfMonth(now)) return false;
      }
    }
    return true;
  });

  const uniqueTeams = [...new Set(responses.map(r => r.team))];

  const clearFilters = () => {
    setFilters({ formType: 'all', team: 'all', dateRange: 'all' });
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5 min-w-[150px]">
            <Label className="text-xs text-muted-foreground">Form Type</Label>
            <select
              value={filters.formType}
              onChange={e => setFilters({ ...filters, formType: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Forms</option>
              <option value="rookie">Rookie 1:1's</option>
              <option value="manager">Manager 1:1's</option>
            </select>
          </div>

          <div className="space-y-1.5 min-w-[150px]">
            <Label className="text-xs text-muted-foreground">Team</Label>
            <select
              value={filters.team}
              onChange={e => setFilters({ ...filters, team: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Teams</option>
              {uniqueTeams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 min-w-[150px]">
            <Label className="text-xs text-muted-foreground">Date Range</Label>
            <select
              value={filters.dateRange}
              onChange={e => setFilters({ ...filters, dateRange: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Time</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="this_month">This Month</option>
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={clearFilters} className="h-9">
            <X className="w-3.5 h-3.5 mr-1.5" />
            Clear
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Showing {filteredResponses.length} of {responses.length} responses
        </p>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredResponses.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No responses found matching your filters.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredResponses.map(response => (
            <Card
              key={response.id}
              className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedResponse(response as ResponseDetail)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    response.form_type === 'rookie' ? "bg-green-500/10" : "bg-blue-500/10"
                  )}>
                    {response.form_type === 'rookie'
                      ? <User className="w-4 h-4 text-green-500" />
                      : <UserCheck className="w-4 h-4 text-blue-500" />
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        response.form_type === 'rookie'
                          ? "bg-green-500/10 text-green-500"
                          : "bg-blue-500/10 text-blue-500"
                      )}>
                        {response.form_type === 'rookie' ? 'Rookie 1:1' : 'Manager 1:1'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {response.team}
                      </span>
                    </div>
                    {response.form_type === 'rookie' ? (
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{response.rookie_name}</span>
                        {' '}&middot;{' '}
                        <span className="text-muted-foreground">Manager: {response.manager_name}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{response.manager_name}</span>
                        {' '}&middot;{' '}
                        <span className="text-muted-foreground">Interviewer: {response.interviewer_name}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(response.submitted_at), 'MMM d, yyyy')}
                  </div>
                  {response.form_type === 'manager' && response.system_utilization_rating && (
                    <span className="text-xs font-medium text-primary">
                      Rating: {response.system_utilization_rating}/10
                    </span>
                  )}
                </div>
              </div>

              {response.week_description && (
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                  {response.week_description}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {selectedResponse && (
        <ResponseDetailModal
          response={selectedResponse}
          onClose={() => setSelectedResponse(null)}
        />
      )}
    </div>
  );
}

// ── Response Detail Modal ─────────────────────────────────────

export function ResponseDetailModal({ response, onClose }: { response: ResponseDetail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-lg",
                response.form_type === 'rookie' ? "bg-green-500/10" : "bg-blue-500/10"
              )}>
                {response.form_type === 'rookie'
                  ? <User className="w-5 h-5 text-green-500" />
                  : <UserCheck className="w-5 h-5 text-blue-500" />
                }
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {response.form_type === 'rookie' ? 'Rookie 1:1 Response' : 'Manager 1:1 Response'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(response.submitted_at), 'MMMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {response.form_type === 'rookie' ? (
              <>
                <DetailRow label="Rookie Name" value={response.rookie_name} />
                <DetailRow label="Manager Name" value={response.manager_name} />
                <DetailRow label="Team" value={response.team} />
                <DetailRow label="Week Description" value={response.week_description} />
                <DetailRow label="Big Win" value={response.big_win} />
                <DetailRow label="Completed Last Week's Challenge" value={response.completed_challenge} />
                <DetailRow label="Upcoming Activities" value={response.upcoming_activities} />
                <DetailRow label="Pitch Work Needed" value={response.pitch_work_needed} />
                <DetailRow label="Weekly Mission" value={response.weekly_mission} />
              </>
            ) : (
              <>
                <DetailRow label="Manager Name" value={response.manager_name} />
                <DetailRow label="Interviewer" value={response.interviewer_name} />
                <DetailRow label="Team" value={response.team} />
                <DetailRow label="Rep Relationship" value={response.rep_relationship} />
                <DetailRow label="Obstacles Encountered" value={response.obstacles_encountered} />
                <DetailRow label="Last Week's Obstacles Review" value={response.obstacles_review} />
                <DetailRow label="Completed Last Week's Mission" value={response.completed_mission} />
                <DetailRow label="This Week's Mission" value={response.weekly_mission} />
                <DetailRow label="Recruit Goal" value={response.recruit_goal} />
                <DetailRow label="Gethawx Review" value={response.gethawx_review} />
                <DetailRow label="Training Progress Check" value={response.training_progress_check} />
                <DetailRow label="Interview Forms Check" value={response.interview_forms_check} />
                <DetailRow label="Upcoming Events" value={response.upcoming_events} />
                <DetailRow label="Team Development" value={Array.isArray(response.team_development) ? response.team_development.join(', ') : response.team_development} />
                <DetailRow label="System Utilization Rating" value={response.system_utilization_rating ? `${response.system_utilization_rating}/10` : undefined} />
                <DetailRow label="Manager Improvement Suggestions" value={response.manager_improvement} />
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Detail Row ────────────────────────────────────────────────

export function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="border-b border-border pb-3">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}
