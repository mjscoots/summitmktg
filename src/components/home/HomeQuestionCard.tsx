import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface OpenQuestion {
  id: string;
  question: string;
  helper: string | null;
  answer_type: 'choices' | 'short_text' | 'number' | 'date';
  choices: string[];
  period: string;
  link_key: string | null;
}

/**
 * One open question at a time on the home screen. Skippable — it comes back on
 * the next login. Answers land on the person's profile.
 */
export function HomeQuestionCard() {
  const [q, setQ] = useState<OpenQuestion | null>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_open_home_question' as never);
    setQ((data as unknown as OpenQuestion | null) ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (answer: string, skip = false) => {
    if (!q) return;
    setBusy(true);
    const { error } = await supabase.rpc('answer_home_question' as never, {
      _question_id: q.id,
      _answer: answer || null,
      _period: q.period,
      _skip: skip,
    } as never);
    setBusy(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    setQ(null);
  };

  if (!q || dismissed) return null;

  return (
    <div className="glass-card mb-5 rounded-[var(--radius)] p-5">
      <h2 className="text-[15px] font-semibold text-foreground">{q.question}</h2>
      {q.helper && <p className="mt-1 text-[13px] text-muted-foreground">{q.helper}</p>}

      {q.answer_type === 'choices' ? (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(q.choices || []).map((c) => (
            <Button
              key={c}
              variant="outline"
              className="min-h-11 justify-start"
              disabled={busy}
              onClick={() => save(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <Input
            className="min-h-11 text-base"
            type={q.answer_type === 'number' ? 'number' : q.answer_type === 'date' ? 'date' : 'text'}
            value={value}
            onChange={(ev) => setValue(ev.target.value)}
            placeholder="Your answer"
          />
          <Button className="min-h-11" disabled={busy || !value.trim()} onClick={() => save(value.trim())}>
            Save
          </Button>
        </div>
      )}

      <button
        className="mt-3 min-h-11 text-[13px] text-muted-foreground hover:text-foreground"
        onClick={() => setDismissed(true)}
        disabled={busy}
      >
        Skip for now
      </button>
    </div>
  );
}
