import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

interface QuestionRow {
  id: string;
  question: string;
  helper: string | null;
  answer_type: string;
  choices: string[] | null;
  audience_type: string;
  audience_value: string | null;
  cadence: string;
  active_from: string;
  active_to: string | null;
  is_active: boolean;
  display_order: number;
}

interface SummaryRow {
  answer: string;
  count: number;
  people: { user_id: string; name: string | null }[];
}

const ANSWER_TYPES = ['choices', 'short_text', 'number', 'date'];
const AUDIENCES = ['everyone', 'workspace', 'tier'];
const CADENCES = ['once', 'weekly'];

/** Admin → Content → Questions. Write a question, it shows on Home, answers land on profiles. */
export function AdminQuestionsTab() {
  const [rows, setRows] = useState<QuestionRow[] | null>(null);
  const [summary, setSummary] = useState<Record<string, SummaryRow[]>>({});
  const [draft, setDraft] = useState({
    question: '',
    helper: '',
    answer_type: 'choices',
    choices: '',
    audience_type: 'everyone',
    audience_value: '',
    cadence: 'once',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('home_questions')
      .select('*')
      .order('display_order')
      .order('created_at');
    if (error) {
      toast({ title: 'Could not load questions', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((data || []) as unknown as QuestionRow[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!draft.question.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('home_questions').insert({
      question: draft.question.trim(),
      helper: draft.helper.trim() || null,
      answer_type: draft.answer_type,
      choices:
        draft.answer_type === 'choices'
          ? draft.choices.split(',').map((c) => c.trim()).filter(Boolean)
          : [],
      audience_type: draft.audience_type,
      audience_value: draft.audience_type === 'everyone' ? null : draft.audience_value.trim() || null,
      cadence: draft.cadence,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    setDraft({ ...draft, question: '', helper: '', choices: '' });
    load();
  };

  const toggle = async (row: QuestionRow) => {
    const { error } = await supabase
      .from('home_questions')
      .update({ is_active: !row.is_active })
      .eq('id', row.id);
    if (error) {
      toast({ title: 'Could not update', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const loadSummary = async (id: string) => {
    const { data, error } = await supabase.rpc('get_question_summary' as never, { _question_id: id } as never);
    if (error) {
      toast({ title: 'Could not load answers', description: error.message, variant: 'destructive' });
      return;
    }
    setSummary((s) => ({ ...s, [id]: (data as unknown as SummaryRow[]) || [] }));
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="text-[15px] font-semibold">New question</h3>
        <div className="space-y-2">
          <Label htmlFor="q-text">Question</Label>
          <Input id="q-text" className="min-h-11 text-base" value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="q-helper">Helper line (optional)</Label>
          <Input id="q-helper" className="min-h-11 text-base" value={draft.helper} onChange={(e) => setDraft({ ...draft, helper: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="q-type">Answer type</Label>
            <select id="q-type" className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" value={draft.answer_type} onChange={(e) => setDraft({ ...draft, answer_type: e.target.value })}>
              {ANSWER_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="q-aud">Audience</Label>
            <select id="q-aud" className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" value={draft.audience_type} onChange={(e) => setDraft({ ...draft, audience_type: e.target.value })}>
              {AUDIENCES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="q-cad">Cadence</Label>
            <select id="q-cad" className="h-11 w-full rounded-md border border-input bg-background px-3 text-base" value={draft.cadence} onChange={(e) => setDraft({ ...draft, cadence: e.target.value })}>
              {CADENCES.map((t) => <option key={t} value={t}>{t === 'once' ? 'ask once' : 'ask weekly'}</option>)}
            </select>
          </div>
        </div>
        {draft.audience_type !== 'everyone' && (
          <div className="space-y-2">
            <Label htmlFor="q-audval">{draft.audience_type === 'workspace' ? 'Workspace (Pest, Fiber, Life)' : 'Tier or role'}</Label>
            <Input id="q-audval" className="min-h-11 text-base" value={draft.audience_value} onChange={(e) => setDraft({ ...draft, audience_value: e.target.value })} />
          </div>
        )}
        {draft.answer_type === 'choices' && (
          <div className="space-y-2">
            <Label htmlFor="q-choices">Choices, comma separated</Label>
            <Input id="q-choices" className="min-h-11 text-base" value={draft.choices} onChange={(e) => setDraft({ ...draft, choices: e.target.value })} />
          </div>
        )}
        <Button className="min-h-11" disabled={saving || !draft.question.trim()} onClick={create}>
          Add question
        </Button>
      </Card>

      {rows === null ? (
        <Skeleton className="h-32 w-full rounded-[var(--radius)]" />
      ) : rows.length === 0 ? (
        <Card className="p-4">
          <p className="text-[13px] text-muted-foreground">No questions yet. Write one above and it appears on Home.</p>
        </Card>
      ) : (
        rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{r.question}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {r.answer_type.replace('_', ' ')} · {r.audience_type}
                  {r.audience_value ? ` ${r.audience_value}` : ''} · {r.cadence === 'once' ? 'ask once' : 'ask weekly'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">{r.is_active ? 'Active' : 'Off'}</span>
                <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} aria-label="Active" />
              </div>
            </div>

            <Button variant="ghost" className="mt-2 min-h-11 px-0 text-[13px]" onClick={() => loadSummary(r.id)}>
              Show answers
            </Button>

            {summary[r.id] && (
              <div className="mt-2 space-y-2">
                {summary[r.id].length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">No answers yet.</p>
                ) : (
                  summary[r.id].map((s) => (
                    <div key={s.answer} className="border-t border-border/40 pt-2">
                      <p className="text-[13px] font-medium tabular-nums">
                        {s.answer || '—'} · {s.count}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {(s.people || []).map((p) => p.name || 'Unnamed').join(', ')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

export default AdminQuestionsTab;
