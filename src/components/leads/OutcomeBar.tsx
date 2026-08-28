import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { NEXT_CALL_PRESETS, RESIGN_OUTCOMES, inDays, leadActions } from '@/hooks/useLeads';

interface Props {
  leadId: string;
  nextCallAt?: string | null;
  onChanged?: () => void;
}

/** One tap logs an outcome; the picker sets the next call. */
export default function OutcomeBar({ leadId, nextCallAt, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [custom, setCustom] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const logOutcome = async (value: string, kind: 'call' | 'text') => {
    setBusy(true);
    const { error } = await leadActions.log(leadId, kind, value, note.trim() || null, null);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setNote('');
      toast.success('Outcome logged');
      onChanged?.();
    }
  };

  const setNextCall = async (iso: string) => {
    setBusy(true);
    const { error } = await leadActions.log(leadId, 'note', null, null, iso);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setShowCustom(false);
      setCustom('');
      toast.success('Next call set');
      onChanged?.();
    }
  };

  return (
    <div className="rounded-[var(--radius)] border border-border/60 bg-surface p-3">
      <p className="micro-label mb-2">Log an outcome</p>
      <div className="grid grid-cols-2 gap-2">
        {RESIGN_OUTCOMES.map((o) => (
          <button
            key={o.value}
            disabled={busy}
            onClick={() => logOutcome(o.value, o.kind)}
            className={cn(
              'min-h-11 rounded-xl border px-2 text-[13px] font-semibold disabled:opacity-60',
              o.value === 'signed'
                ? 'celebrate-card text-foreground'
                : 'border-border/60 bg-background/50 text-foreground hover:border-primary/40'
            )}
          >
            {o.label}
          </button>
        ))}

      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Note (optional)"
        className="mt-2 w-full resize-y rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-[13px] outline-none focus:border-primary/40"
      />

      <p className="micro-label mb-2 mt-4">Next call</p>
      <div className="flex flex-wrap gap-2">
        {NEXT_CALL_PRESETS.map((p) => (
          <button
            key={p.label}
            disabled={busy}
            onClick={() => setNextCall(inDays(p.days))}
            className="min-h-11 rounded-xl border border-border/60 bg-background/50 px-3 text-[13px] font-semibold text-foreground hover:border-primary/40 disabled:opacity-60"
          >
            {p.label}
          </button>
        ))}
        <button
          disabled={busy}
          onClick={() => setShowCustom((v) => !v)}
          className={cn(
            'min-h-11 rounded-xl border px-3 text-[13px] font-semibold disabled:opacity-60',
            showCustom ? 'border-primary/40 text-primary' : 'border-border/60 bg-background/50 text-foreground'
          )}
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <div className="mt-2 flex gap-2">
          <Input
            type="datetime-local"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-11 text-[13px]"
          />
          <button
            disabled={busy || !custom}
            onClick={() => setNextCall(new Date(custom).toISOString())}
            className="min-h-11 shrink-0 rounded-xl bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            Set
          </button>
        </div>
      )}
      {nextCallAt && (
        <p className="mt-2 text-[12px] text-muted-foreground">
          Next call {new Date(nextCallAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
