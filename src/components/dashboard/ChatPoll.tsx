import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { BarChart3, Lock } from 'lucide-react';

interface PollData {
  id: string;
  question: string;
  options: string[];
  created_by: string;
  is_closed: boolean;
}

interface Vote {
  poll_id: string;
  user_id: string;
  option_index: number;
}

export function ChatPoll({ messageId, profileMap }: { messageId: string; profileMap: Record<string, { full_name: string }> }) {
  const { user, role } = useAuth();
  const [poll, setPoll] = useState<PollData | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: pollData } = await supabase
        .from('chat_polls')
        .select('*')
        .eq('message_id', messageId)
        .maybeSingle();

      if (!pollData) { setLoading(false); return; }

      const options = Array.isArray(pollData.options)
        ? (pollData.options as string[])
        : [];

      setPoll({ ...pollData, options });

      const { data: votesData } = await supabase
        .from('chat_poll_votes')
        .select('poll_id, user_id, option_index')
        .eq('poll_id', pollData.id);

      const votesList = votesData || [];
      setVotes(votesList);
      const mine = votesList.find(v => v.user_id === user?.id);
      setMyVote(mine ? mine.option_index : null);
      setLoading(false);
    };
    fetch();
  }, [messageId, user?.id]);

  // Realtime votes
  useEffect(() => {
    if (!poll) return;
    const channel = supabase
      .channel(`poll-votes-${poll.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_poll_votes', filter: `poll_id=eq.${poll.id}` }, async () => {
        const { data } = await supabase.from('chat_poll_votes').select('poll_id, user_id, option_index').eq('poll_id', poll.id);
        const votesList = data || [];
        setVotes(votesList);
        const mine = votesList.find(v => v.user_id === user?.id);
        setMyVote(mine ? mine.option_index : null);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [poll?.id, user?.id]);

  if (loading || !poll) return null;

  const totalVotes = votes.length;
  const hasVoted = myVote !== null;
  const canClose = role === 'admin' || role === 'manager' || poll.created_by === user?.id;

  const handleVote = async (idx: number) => {
    if (!user || poll.is_closed) return;

    if (myVote === idx) {
      // Remove vote
      await supabase.from('chat_poll_votes').delete().eq('poll_id', poll.id).eq('user_id', user.id);
      setMyVote(null);
      setVotes(prev => prev.filter(v => v.user_id !== user.id));
    } else if (hasVoted) {
      // Change vote
      await supabase.from('chat_poll_votes').update({ option_index: idx }).eq('poll_id', poll.id).eq('user_id', user.id);
      setMyVote(idx);
      setVotes(prev => prev.map(v => v.user_id === user.id ? { ...v, option_index: idx } : v));
    } else {
      // New vote
      await supabase.from('chat_poll_votes').insert({ poll_id: poll.id, user_id: user.id, option_index: idx });
      setMyVote(idx);
      setVotes(prev => [...prev, { poll_id: poll.id, user_id: user.id, option_index: idx }]);
    }
  };

  const handleClose = async () => {
    await supabase.from('chat_polls').update({ is_closed: true }).eq('id', poll.id);
    setPoll(prev => prev ? { ...prev, is_closed: true } : null);
  };

  return (
    <div className="mt-2 p-3 bg-muted/40 border border-border/50 rounded-lg max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{poll.question}</span>
        {poll.is_closed && <Lock className="w-3 h-3 text-muted-foreground" />}
      </div>

      <div className="space-y-1.5">
        {poll.options.map((option, idx) => {
          const count = votes.filter(v => v.option_index === idx).length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = myVote === idx;

          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={poll.is_closed}
              className={cn(
                "relative w-full text-left px-3 py-2 rounded-md text-sm transition-all overflow-hidden",
                isMyVote
                  ? "border-2 border-primary/50 bg-primary/5"
                  : "border border-border/50 hover:border-primary/30",
                poll.is_closed && "cursor-default opacity-80"
              )}
            >
              {/* Progress bar background */}
              {(hasVoted || poll.is_closed) && (
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all duration-500",
                    isMyVote ? "bg-primary/15" : "bg-muted/60"
                  )}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className={cn("font-medium", isMyVote && "text-primary")}>{option}</span>
                {(hasVoted || poll.is_closed) && (
                  <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-muted-foreground">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        {canClose && !poll.is_closed && (
          <button onClick={handleClose} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            Close poll
          </button>
        )}
      </div>
    </div>
  );
}

// Poll creation modal
export function PollCreator({ onSubmit, onClose }: { onSubmit: (question: string, options: string[]) => void; onClose: () => void }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    const trimmedQ = question.trim();
    const trimmedOpts = options.map(o => o.trim()).filter(o => o);
    if (!trimmedQ || trimmedOpts.length < 2) return;
    onSubmit(trimmedQ, trimmedOpts);
  };

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-xl p-4 z-20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Create Poll
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">Cancel</button>
      </div>

      <input
        type="text"
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="Ask a question..."
        className="w-full bg-muted/60 border border-border/50 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 mb-3"
        autoFocus
      />

      <div className="space-y-2 mb-3">
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={opt}
              onChange={e => { const next = [...options]; next[idx] = e.target.value; setOptions(next); }}
              placeholder={`Option ${idx + 1}`}
              className="flex-1 bg-muted/40 border border-border/50 rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(idx)} className="text-xs text-muted-foreground hover:text-destructive">✕</button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        {options.length < 6 && (
          <button onClick={addOption} className="text-xs text-primary hover:underline">+ Add option</button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
          className="ml-auto px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Poll
        </button>
      </div>
    </div>
  );
}
