import { useEffect, useRef, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

const SUGGESTIONS = [
  'What time is the next meeting?',
  "What's my manager's number?",
  'Where do I find the pay scales?',
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AskSummitPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, streaming]);

  const send = async (question: string) => {
    const text = question.trim();
    if (!text || streaming) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setStreaming(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('You need to sign in again.');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-summit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'The assistant is unavailable right now.');
      }

      setMessages(m => [...m, { role: 'assistant', content: '' }]);

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
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              answer += delta;
              setMessages(m => {
                const copy = [...m];
                copy[copy.length - 1] = { role: 'assistant', content: answer };
                return copy;
              });
            }
          } catch {
            // ignore partial chunk
          }
        }
      }

      if (!answer) {
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: 'assistant',
            content: "I don't have that — ask your manager.",
          };
          return copy;
        });
      }
    } catch (err) {
      setMessages(m => (m[m.length - 1]?.role === 'assistant' && !m[m.length - 1].content ? m.slice(0, -1) : m));
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  return (
    <AppLayout>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <header className="mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Ask Summit</h1>
              <p className="text-sm text-muted-foreground">
                Answers about the schedule, the team, training, and your own pay.
              </p>
            </div>
          </div>
        </header>

        <div className={cn(CARD, 'p-4 sm:p-5')}>
          {/* Messages */}
          <div className="min-h-[45vh] space-y-4">
            {messages.length === 0 ? (
              <div className="py-8 text-center">
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
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words',
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background/60 border border-white/[0.06] text-foreground'
                    )}
                  >
                    {m.content || (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
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
              placeholder="Ask a question..."
              className="flex-1 resize-none max-h-32 rounded-xl bg-background/50 border border-white/[0.08] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button
              onClick={() => send(input)}
              disabled={streaming || !input.trim()}
              size="icon"
              className="h-10 w-10 rounded-xl flex-shrink-0"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
