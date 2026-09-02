import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { VerticalApplicationForm } from './VerticalApplicationForm';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type Answer = 'Fiber' | 'Life' | 'Off this winter' | 'Not sure yet';

const ANSWERS: Answer[] = ['Fiber', 'Life', 'Off this winter', 'Not sure yet'];

interface State {
  answer: Answer | null;
  is_pest_member: boolean;
}

/**
 * One-time winter plan prompt for active pest members.
 * Fiber opens the fiber application, Life records interest, the rest just record.
 */
export function WinterPlanCard() {
  const { refresh } = useWorkspace();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<Answer | null>(null);
  const [showFiberForm, setShowFiberForm] = useState(false);
  const [showLifeNote, setShowLifeNote] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_winter_plan' as never);
    const res = data as unknown as State | null;
    setState(res ?? { answer: null, is_pest_member: false });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const choose = async (answer: Answer) => {
    setBusy(answer);
    const { data, error } = await supabase.rpc('set_my_winter_plan' as never, {
      _answer: answer,
    } as never);
    setBusy(null);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({
        title: 'Could not save',
        description: res?.error || error?.message || 'Try again.',
        variant: 'destructive',
      });
      return;
    }
    setState((s) => (s ? { ...s, answer } : s));
    if (answer === 'Fiber') setShowFiberForm(true);
    if (answer === 'Life') {
      setShowLifeNote(true);
      refresh();
    }
  };

  if (!state || !state.is_pest_member) return null;
  if (state.answer && !showFiberForm && !showLifeNote) return null;

  return (
    <div className="glass-card mb-5 rounded-[var(--radius)] p-5">
      <h2 className="text-[15px] font-semibold text-foreground">Winter plan</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Pest season ends in a few weeks. Tell us what you plan to do this winter.
      </p>

      {!state.answer && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ANSWERS.map((a) => (
            <Button
              key={a}
              variant="outline"
              className="min-h-11 justify-start"
              disabled={busy !== null}
              onClick={() => choose(a)}
            >
              {busy === a ? <Loader2 className="h-4 w-4 animate-spin" /> : a}
            </Button>
          ))}
        </div>
      )}

      {showFiberForm && (
        <div className="mt-4 border-t border-border pt-4">
          <VerticalApplicationForm
            vertical="Fiber"
            name="Summit Fiber"
            prefillFromProfile
            onDone={() => {
              setShowFiberForm(false);
              refresh();
            }}
            onCancel={() => setShowFiberForm(false)}
          />
        </div>
      )}

      {showLifeNote && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-[13px] text-muted-foreground">
            Recorded. Summit Life is opening soon - you will get access when it opens.
          </p>
          <Button variant="ghost" className="mt-2 min-h-11" onClick={() => setShowLifeNote(false)}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
