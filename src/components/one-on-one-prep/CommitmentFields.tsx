import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export const FOCUS_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: 'skill', label: 'Mind', hint: 'skill' },
  { value: 'desire', label: 'Heart', hint: 'desire' },
  { value: 'activity', label: 'Feet', hint: 'activity' },
];

interface CommitmentFieldsProps {
  commitment: string;
  focusArea: string;
  onCommitmentChange: (value: string) => void;
  onFocusChange: (value: string) => void;
}

/** Manager-only: one commitment sentence carried to the next 1:1, plus the mind/heart/feet pick. */
export function CommitmentFields({ commitment, focusArea, onCommitmentChange, onFocusChange }: CommitmentFieldsProps) {
  return (
    <div className="space-y-4 rounded-[10px] border border-border bg-card/50 p-3">
      <div className="space-y-1.5">
        <Label className="text-sm">What did they commit to this week?</Label>
        <p className="text-[10px] text-muted-foreground">One sentence. Shows at the top of the next 1:1.</p>
        <Textarea value={commitment} onChange={e => onCommitmentChange(e.target.value)} rows={2} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Mind, heart, or feet? <span className="text-muted-foreground">(optional)</span></Label>
        <div className="flex flex-wrap gap-2">
          {FOCUS_OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => onFocusChange(focusArea === o.value ? '' : o.value)}
              className={cn(
                'min-h-11 rounded-[8px] border px-4 text-sm font-medium transition-colors',
                focusArea === o.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {o.label} <span className="text-[11px] opacity-70">{o.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
