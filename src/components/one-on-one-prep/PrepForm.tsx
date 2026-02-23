import { PrepRep } from '@/hooks/useOneOnOnePrep';
import { PrepFormData } from '@/pages/app/OneOnOnePrepPage';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight } from 'lucide-react';

interface PrepFormProps {
  rep: PrepRep;
  formData: PrepFormData;
  setFormData: React.Dispatch<React.SetStateAction<PrepFormData>>;
  onSubmit: () => void;
  submitting: boolean;
  nextRepName?: string;
}

export function PrepForm({
  rep,
  formData,
  setFormData,
  onSubmit,
  submitting,
  nextRepName,
}: PrepFormProps) {
  const update = (field: keyof PrepFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4 space-y-5">
      {/* Auto-filled header */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Rookie:</span>
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
            Describe your week in 1 sentence <span className="text-destructive">*</span>
          </Label>
          <Textarea
            value={formData.week_description}
            onChange={e => update('week_description', e.target.value)}
            placeholder="One sentence summary of the week"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            What was a big win you had this week? <span className="text-destructive">*</span>
          </Label>
          <Textarea
            value={formData.big_win}
            onChange={e => update('big_win', e.target.value)}
            placeholder="Describe biggest win this week"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            Did you complete the challenge from last week? <span className="text-destructive">*</span>
          </Label>
          <RadioGroup
            value={formData.completed_challenge}
            onValueChange={v => update('completed_challenge', v)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Yes" id="prep-yes" />
              <Label htmlFor="prep-yes" className="cursor-pointer text-sm">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id="prep-no" />
              <Label htmlFor="prep-no" className="cursor-pointer text-sm">No</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            Review any activities coming up <span className="text-destructive">*</span>
          </Label>
          <Textarea
            value={formData.upcoming_activities}
            onChange={e => update('upcoming_activities', e.target.value)}
            placeholder="Upcoming activities and previous mission review"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            What does the rep need to work on in their pitch? <span className="text-destructive">*</span>
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Remember the compliment sandwich: praise, correction, praise.
          </p>
          <p className="text-[10px] text-primary font-medium">
            📋 This will become a daily task in their Today's Priorities
          </p>
          <Textarea
            value={formData.pitch_work_needed}
            onChange={e => update('pitch_work_needed', e.target.value)}
            placeholder="Praise → Correction → Praise"
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">
            Give a mission to complete for the week? <span className="text-destructive">*</span>
          </Label>
          <p className="text-[10px] text-primary font-medium">
            📋 This will become a daily task in their Today's Priorities
          </p>
          <Textarea
            value={formData.weekly_mission}
            onChange={e => update('weekly_mission', e.target.value)}
            placeholder="What is the mission for next week?"
            rows={2}
          />
        </div>
      </div>

      {/* Submit */}
      <Button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full"
        size="lg"
      >
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
