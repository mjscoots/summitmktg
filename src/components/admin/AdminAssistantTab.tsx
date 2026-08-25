import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Loader2, MessageSquare, Sparkles, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingList } from '@/components/shared/LoadingList';
import { cn } from '@/lib/utils';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

interface FaqRow {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  published: boolean;
  display_order: number;
}

interface LogRow {
  id: string;
  user_id: string;
  question: string;
  answer: string | null;
  role_at_ask: string | null;
  created_at: string;
}

export function AdminAssistantTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, { question: string; answer: string }>>({});

  const load = async () => {
    setLoading(true);
    const [f, l, p] = await Promise.all([
      supabase.from('assistant_faq').select('*').order('display_order').order('created_at'),
      supabase.from('assistant_logs').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('user_id, full_name'),
    ]);
    setFaqs((f.data as FaqRow[]) ?? []);
    setLogs((l.data as LogRow[]) ?? []);
    setNames(new Map((p.data ?? []).map((r: any) => [r.user_id, r.full_name])));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addFaq = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('assistant_faq').insert({
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      display_order: faqs.length,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewQuestion('');
    setNewAnswer('');
    toast.success('Added to the assistant');
    load();
  };

  const saveFaq = async (row: FaqRow) => {
    const edit = edits[row.id];
    if (!edit) return;
    const { error } = await supabase
      .from('assistant_faq')
      .update({ question: edit.question.trim(), answer: edit.answer.trim() })
      .eq('id', row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEdits(e => {
      const copy = { ...e };
      delete copy[row.id];
      return copy;
    });
    toast.success('Saved');
    load();
  };

  const togglePublished = async (row: FaqRow) => {
    const { error } = await supabase
      .from('assistant_faq')
      .update({ published: !row.published })
      .eq('id', row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };

  const removeFaq = async (row: FaqRow) => {
    const { error } = await supabase.from('assistant_faq').delete().eq('id', row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Removed');
    load();
  };

  return (
    <div className="space-y-4">
      {/* FAQ editor */}
      <div className={cn(CARD, 'p-4')}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Ask Summit knowledge</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Question and answer pairs the assistant is allowed to use. Anything not here, and not already in the
          app's data, gets "I don't have that — ask your manager."
        </p>

        <div className="space-y-2">
          <Input
            value={newQuestion}
            onChange={e => setNewQuestion(e.target.value)}
            placeholder="Question — e.g. When is rent due?"
            className="bg-background/60 border-white/[0.08]"
          />
          <textarea
            value={newAnswer}
            onChange={e => setNewAnswer(e.target.value)}
            rows={2}
            placeholder="Answer"
            className="w-full rounded-lg bg-background/60 border border-white/[0.08] px-3 py-2 text-sm text-foreground resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={addFaq}
              disabled={saving || !newQuestion.trim() || !newAnswer.trim()}
              size="sm"
              className="gap-1.5 rounded-xl"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingList rows={4} />
      ) : (
        <div className={cn(CARD, 'divide-y divide-white/[0.05] overflow-hidden')}>
          {faqs.map(row => {
            const edit = edits[row.id];
            return (
              <div key={row.id} className="p-4 space-y-2">
                <Input
                  value={edit ? edit.question : row.question}
                  onChange={e =>
                    setEdits(s => ({
                      ...s,
                      [row.id]: { question: e.target.value, answer: (s[row.id]?.answer ?? row.answer) },
                    }))
                  }
                  className="bg-background/60 border-white/[0.08] text-sm"
                />
                <textarea
                  value={edit ? edit.answer : row.answer}
                  onChange={e =>
                    setEdits(s => ({
                      ...s,
                      [row.id]: { question: s[row.id]?.question ?? row.question, answer: e.target.value },
                    }))
                  }
                  rows={2}
                  className="w-full rounded-lg bg-background/60 border border-white/[0.08] px-3 py-2 text-sm text-foreground resize-none"
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => togglePublished(row)}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full',
                      row.published ? 'bg-primary/15 text-primary' : 'bg-white/[0.06] text-muted-foreground'
                    )}
                  >
                    {row.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {row.published ? 'Live' : 'Hidden'}
                  </button>
                  <div className="flex items-center gap-2">
                    {edit && (
                      <Button onClick={() => saveFaq(row)} size="sm" className="gap-1.5 rounded-xl h-8">
                        <Save className="w-3.5 h-3.5" /> Save
                      </Button>
                    )}
                    <Button
                      onClick={() => removeFaq(row)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {faqs.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No answers added yet.
            </p>
          )}
        </div>
      )}

      {/* Recent questions */}
      <div className={cn(CARD, 'overflow-hidden')}>
        <div className="p-4 border-b border-white/[0.06] flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Recent questions</h3>
          <span className="text-xs text-muted-foreground">last {logs.length}</span>
        </div>
        <div className="divide-y divide-white/[0.05] max-h-[480px] overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-xs font-medium text-foreground truncate">
                  {names.get(log.user_id) || 'Team member'}
                  {log.role_at_ask ? <span className="text-muted-foreground"> · {log.role_at_ask}</span> : null}
                </span>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-foreground">{log.question}</p>
              {log.answer && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{log.answer}</p>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No questions asked yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
