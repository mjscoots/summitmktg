import { PrepRep } from '@/hooks/useOneOnOnePrep';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ManagerPrepFormData {
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

export const initialManagerPrepFormData: ManagerPrepFormData = {
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
  manager_improvement: '',
};

interface ManagerPrepFormProps {
  rep: PrepRep;
  formData: ManagerPrepFormData;
  setFormData: React.Dispatch<React.SetStateAction<ManagerPrepFormData>>;
  onSubmit: () => void;
  submitting: boolean;
  nextRepName?: string;
}

export function ManagerPrepForm({
  rep,
  formData,
  setFormData,
  onSubmit,
  submitting,
  nextRepName,
}: ManagerPrepFormProps) {
  const update = (field: keyof ManagerPrepFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTeamDevelopment = (option: string) => {
    setFormData(prev => ({
      ...prev,
      team_development: prev.team_development.includes(option)
        ? prev.team_development.filter(item => item !== option)
        : [...prev.team_development, option],
    }));
  };

  return (
    <div className="p-4 space-y-5">
      {/* Auto-filled header */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Manager:</span>
          <span className="font-medium text-foreground">{rep.full_name}</span>
        </div>
        {rep.team_name && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Team:</span>
            <span className="font-medium text-foreground">{rep.team_name}</span>
          </div>
        )}
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">
            Ask about their relationship with their reps. <span className="text-destructive">*</span>
          </Label>
          <Textarea value={formData.rep_relationship} onChange={e => update('rep_relationship', e.target.value)} rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            What obstacles did you encounter this week? How do we solve them? <span className="text-destructive">*</span>
          </Label>
          <Textarea value={formData.obstacles_encountered} onChange={e => update('obstacles_encountered', e.target.value)} rows={3} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            Review the obstacles we talked about last week. <span className="text-destructive">*</span>
          </Label>
          <p className="text-[10px] text-muted-foreground">Refer to the answers from last week in the Responses tab.</p>
          <Textarea value={formData.obstacles_review} onChange={e => update('obstacles_review', e.target.value)} rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            Did you complete your mission last week? <span className="text-destructive">*</span>
          </Label>
          <RadioGroup value={formData.completed_mission} onValueChange={v => update('completed_mission', v)} className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Yes" id="mgr-mission-yes" />
              <Label htmlFor="mgr-mission-yes" className="cursor-pointer text-sm">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id="mgr-mission-no" />
              <Label htmlFor="mgr-mission-no" className="cursor-pointer text-sm">No</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            This week's mission: <span className="text-destructive">*</span>
          </Label>
          <p className="text-[10px] text-primary font-medium">📋 This will become a daily task in their Today's Priorities</p>
          <Textarea value={formData.weekly_mission} onChange={e => update('weekly_mission', e.target.value)} rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            What is your goal for new recruits this week? <span className="text-destructive">*</span>
          </Label>
          <p className="text-[10px] text-primary font-medium">📋 This will become a daily task in their Today's Priorities</p>
          <Input value={formData.recruit_goal} onChange={e => update('recruit_goal', e.target.value)} placeholder="Number of recruits or specific goal" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            Review onboarded percentage on Gethawx <span className="text-destructive">*</span>
          </Label>
          <Textarea value={formData.gethawx_review} onChange={e => update('gethawx_review', e.target.value)} rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            Check Reps Training Progress <span className="text-destructive">*</span>
          </Label>
          <Textarea value={formData.training_progress_check} onChange={e => update('training_progress_check', e.target.value)} rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            Check Interview Forms <span className="text-destructive">*</span>
          </Label>
          <Textarea value={formData.interview_forms_check} onChange={e => update('interview_forms_check', e.target.value)} rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            Review any current events every week coming up. <span className="text-destructive">*</span>
          </Label>
          <p className="text-[10px] text-muted-foreground">Review Calendar</p>
          <Textarea value={formData.upcoming_events} onChange={e => update('upcoming_events', e.target.value)} rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            What are you doing for team development? <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-wrap gap-4 mt-1">
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

        <div className="space-y-1.5">
          <Label className="text-sm">
            On a scale of 1-10 how well are you and your downline utilizing the system? <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, system_utilization_rating: num }))}
                className={cn(
                  "w-9 h-9 rounded-lg border-2 font-semibold text-sm transition-all",
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

        <div className="space-y-1.5">
          <Label className="text-sm">
            What can you improve on as a manager? <span className="text-destructive">*</span>
          </Label>
          <Textarea value={formData.manager_improvement} onChange={e => update('manager_improvement', e.target.value)} rows={2} />
        </div>
      </div>

      {/* Submit */}
      <Button onClick={onSubmit} disabled={submitting} className="w-full" size="lg">
        {submitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
        ) : (
          <>
            Submit{nextRepName ? ` & Next: ${nextRepName.split(' ')[0]}` : ''}
            {nextRepName && <ArrowRight className="w-4 h-4 ml-2" />}
          </>
        )}
      </Button>
    </div>
  );
}
