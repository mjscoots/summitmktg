import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Send, Loader2, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

const SUGGESTIONS = [
  'What time is the next meeting?',
  "What's my manager's number?",
  'Where do I find the pay scales?',
];

type Mode = 'ask' | 'practice';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ThreadRow {
  id: string;
  mode: string;
  title: string | null;
  last_at: string;
  message_count: number;
}

export default function AskSummitPage() {
  const { activeVertical } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>('ask');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [practiceEnded, setPracticeEnded] = useState(false);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const threadRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  const loadThreads = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const { data } = await (supabase as any).rpc('get_person_threads', { _user_id: uid });
    const list = ((data?.threads || []) as ThreadRow[]).filter(t => t.mode === 'ask');
    setThreads(list);
  };

  useEffect(() => {
    void loadThreads();
  }, []);

  // Opened from the playbook or from search: start with that line.
  const seedRef = useRef(false);
  useEffect(() => {
    if (seedRef.current) return;
    const practice = params.get('practice');
    const question = params.get('q');
    if (!practice && !question) return;
    seedRef.current = true;
    if (practice) setMode('practice');
    params.delete('practice');
    params.delete('q');
    setParams(params, { replace: true });
    window.setTimeout(() => void send(practice || question || '', practice ? 'practice' : 'ask'), 0);
  }, [params, setParams]);

  const openThread = async (id: string) => {
    const { data } = await (supabase as any).rpc('get_thread_messages', { _thread_id: id });
    const msgs = ((data?.messages || []) as ChatMessage[]).map(m => ({ role: m.role, content: m.content }));
    setMode('ask');
    setPracticeEnded(false);
    setMessages(msgs);
    setThreadId(id);
    threadRef.current = id;
  };

  const newThread = () => {
    setMessages([]);
    setInput('');
    setThreadId(null);
    threadRef.current = null;
    setPracticeEnded(false);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, streaming]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (streaming) return;
    setMode(next);
    setMessages([]);
    setInput('');
    setPracticeEnded(false);
    setThreadId(null);
    threadRef.current = null;
  };

  const startNewPractice = () => {
    setMessages([]);
    setInput('');
    setPracticeEnded(false);
  };

  const stream = async (payload: Record<string, unknown>, onDelta: (answer: string) => void) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('You need to sign in again.');

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-summit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        thread_id: threadRef.current,
        active_vertical: activeVertical,
      }),
    });

    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'The assistant is unavailable right now.');
    }

    const returnedThread = res.headers.get('X-Thread-Id');
    if (returnedThread) {
      threadRef.current = returnedThread;
      setThreadId(returnedThread);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payloadLine = line.slice(6).trim();
        if (payloadLine === '[DONE]') continue;
        try {
          const json = JSON.parse(payloadLine);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            answer += delta;
            onDelta(answer);
          }
        } catch {
          // ignore partial chunk
        }
      }
    }

    return answer;
  };

  const send = async (question: string, modeOverride?: Mode) => {
    const activeMode = modeOverride ?? mode;
    const text = question.trim();
    if (!text || streaming || practiceEnded) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setStreaming(true);

    try {
      setMessages(m => [...m, { role: 'assistant', content: '' }]);

      const answer = await stream({ messages: next, mode: activeMode }, answer =>
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: answer };
          return copy;
        })
      );

      if (!answer) {
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: 'assistant',
            content: activeMode === 'ask' ? "I don't have that - ask your manager." : '...',
          };
          return copy;
        });
      }
    } catch (err) {
      setMessages(m => (m[m.length - 1]?.role === 'assistant' && !m[m.length - 1].content ? m.slice(0, -1) : m));
      toast.error(err instanceof Error ? err.message : 'That request failed. Try asking again.');
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
      void loadThreads();
    }
  };

  const endPractice = async () => {
    if (streaming || messages.length === 0 || practiceEnded) return;
    setStreaming(true);
    setPracticeEnded(true);

    try {
      setMessages(m => [...m, { role: 'assistant', content: '' }]);

      const answer = await stream({ messages, mode: 'practice', finish: true }, answer =>
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: answer };
          return copy;
        })
      );

      if (!answer) {
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: 'No feedback available for this session.' };
          return copy;
        });
      }
    } catch (err) {
      setMessages(m => (m[m.length - 1]?.role === 'assistant' && !m[m.length - 1].content ? m.slice(0, -1) : m));
      toast.error(err instanceof Error ? err.message : 'That request failed. Try asking again.');
    } finally {
      setStreaming(false);
    }
  };

  const isPractice = mode === 'practice';
  const composerDisabled = streaming || (isPractice && practiceEnded);

  return (
    <AppLayout>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <PageHeader
          title="Ask Summit"
          context={
            isPractice
              ? 'Practice working a door. The AI plays the homeowner.'
              : 'Answers about the schedule, the team, training, and your own pay.'
          }
          className="mb-5"
        />

        <div className="mb-5">
          <div className="inline-flex rounded-xl border border-white/[0.08] bg-background/40 p-1">
            <button
              onClick={() => switchMode('ask')}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                mode === 'ask' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Ask
            </button>
            <button
              onClick={() => switchMode('practice')}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                mode === 'practice' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Practice
            </button>
          </div>
        </div>

        {!isPractice && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button onClick={newThread} variant="outline" size="sm" className="min-h-11 rounded-xl">
              New thread
            </Button>
            {threads.map(t => (
              <button
                key={t.id}
                onClick={() => openThread(t.id)}
                className={cn(
                  'max-w-[220px] truncate rounded-xl border px-3 py-2 text-left text-xs transition-colors min-h-11',
                  t.id === threadId
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-white/[0.08] bg-background/40 text-muted-foreground hover:text-foreground'
                )}
              >
                {t.title || 'Thread'}
              </button>
            ))}
          </div>
        )}

        <div className={cn(CARD, 'p-4 sm:p-5')}>
          {/* Messages */}
          <div className="min-h-[45vh] space-y-4">
            {messages.length === 0 ? (
              <div className="py-8 text-center">
                {isPractice ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Knock - the AI will answer the door as a homeowner. Say your opener to start.
                    </p>
                    <button
                      onClick={() => send('*knock knock*')}
                      className="px-3 py-2 rounded-xl text-xs font-medium border border-white/[0.08] bg-background/40 text-foreground/80 hover:bg-background/70 hover:text-foreground transition-colors"
                    >
                      Knock on the door
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Ask a question. If it isn't in the app's data, it'll tell you to ask your manager.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="px-3 py-2 rounded-xl text-xs font-medium border border-white/[0.08] bg-background/40 text-foreground/80 hover:bg-background/70 hover:text-foreground transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              messages.map((m, i) => {
                const isFeedback = isPractice && practiceEnded && i === messages.length - 1 && m.role === 'assistant';
                return (
                  <div
                    key={i}
                    className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words',
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : isFeedback
                          ? 'bg-background/60 border border-primary/30 text-foreground'
                          : 'bg-background/60 border border-white/[0.06] text-foreground'
                      )}
                    >
                      {isFeedback && (
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-1">
                          Feedback
                        </div>
                      )}
                      {m.content || (
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          {isPractice && practiceEnded ? (
            <div className="mt-4 border-t border-white/[0.06] pt-3 flex justify-center">
              <Button onClick={startNewPractice} variant="secondary" className="rounded-xl">
                Start new practice
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex items-end gap-2 border-t border-white/[0.06] pt-3">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={isPractice ? 'Say something to the homeowner...' : 'Your manager can read this to help you.'}
                disabled={composerDisabled}
                className="flex-1 resize-none max-h-32 rounded-xl bg-background/50 border border-white/[0.08] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              />
              <Button
                onClick={() => send(input)}
                disabled={composerDisabled || !input.trim()}
                size="icon"
                className="h-10 w-10 rounded-xl flex-shrink-0"
              >
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
              {isPractice && (
                <Button
                  onClick={endPractice}
                  disabled={streaming || messages.length === 0}
                  variant="outline"
                  className="h-10 rounded-xl flex-shrink-0 px-3 text-xs"
                >
                  End practice
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
