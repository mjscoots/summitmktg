import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SUMMIT_REACTIONS = [
  { emoji: '🔥', label: 'Close' },
  { emoji: '💰', label: 'Big Money' },
  { emoji: '🧠', label: 'Smart' },
  { emoji: '⚔️', label: 'Warrior' },
  { emoji: '🚀', label: 'Momentum' },
];

const ALL_EMOJIS: { label: string; emojis: string[] }[] = [
  { label: 'Summit', emojis: ['🔥', '💰', '🧠', '⚔️', '🚀', '💪', '👑', '🏆'] },
  { label: 'Popular', emojis: ['👍', '😂', '❤️', '👏', '💯', '🎉', '👀', '✅', '🙌'] },
  { label: 'Gestures', emojis: ['👍', '👎', '👊', '✊', '🤞', '🫶', '💪', '🙏', '👋', '🤙', '✌️'] },
  { label: 'Objects', emojis: ['⭐', '💎', '🏆', '🎯', '📈', '💰', '🛡️', '⚡', '🚀', '💡', '🔔'] },
];

interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

interface MessageReactionsProps {
  messageId: string;
  profileMap: Record<string, { full_name: string }>;
  messageAuthorId?: string;
  isOwnMessage?: boolean;
}

export function MessageReactions({ messageId, profileMap, messageAuthorId, isOwnMessage = false }: MessageReactionsProps) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPicker, setShowPicker] = useState<'quick' | 'full' | false>(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReactions = async () => {
      const { data, error } = await supabase
        .from('chat_reactions')
        .select('emoji, user_id')
        .eq('message_id', messageId);

      if (error || !data) return;

      const grouped: Record<string, string[]> = {};
      data.forEach(r => {
        if (!grouped[r.emoji]) grouped[r.emoji] = [];
        grouped[r.emoji].push(r.user_id);
      });

      setReactions(
        Object.entries(grouped).map(([emoji, users]) => ({
          emoji,
          users,
          count: users.length,
        }))
      );
    };

    fetchReactions();
  }, [messageId]);

  useEffect(() => {
    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_reactions', filter: `message_id=eq.${messageId}` },
        () => {
          supabase
            .from('chat_reactions')
            .select('emoji, user_id')
            .eq('message_id', messageId)
            .then(({ data }) => {
              if (!data) return;
              const grouped: Record<string, string[]> = {};
              data.forEach(r => {
                if (!grouped[r.emoji]) grouped[r.emoji] = [];
                grouped[r.emoji].push(r.user_id);
              });
              setReactions(
                Object.entries(grouped).map(([emoji, users]) => ({
                  emoji,
                  users,
                  count: users.length,
                }))
              );
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPicker]);

  const toggleReaction = async (emoji: string) => {
    if (!user) return;

    const existing = reactions.find(r => r.emoji === emoji);
    const hasReacted = existing?.users.includes(user.id);

    setReactions(prev => {
      if (hasReacted) {
        return prev
          .map(r =>
            r.emoji === emoji
              ? { ...r, users: r.users.filter(u => u !== user.id), count: r.count - 1 }
              : r
          )
          .filter(r => r.count > 0);
      } else {
        const existingReaction = prev.find(r => r.emoji === emoji);
        if (existingReaction) {
          return prev.map(r =>
            r.emoji === emoji
              ? { ...r, users: [...r.users, user.id], count: r.count + 1 }
              : r
          );
        }
        return [...prev, { emoji, users: [user.id], count: 1 }];
      }
    });

    try {
      if (hasReacted) {
        const { error } = await supabase
          .from('chat_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chat_reactions')
          .insert({ message_id: messageId, user_id: user.id, emoji });
        if (error) throw error;
        // Award reaction points (non-blocking)
        if (messageAuthorId) {
          (supabase.rpc as any)('award_reaction_points', {
            _reactor_user_id: user.id,
            _author_user_id: messageAuthorId,
            _message_id: messageId,
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Reaction error:', err);
      toast('Failed to react — try again', { duration: 2000 });
    }

    setShowPicker(false);
  };

  const getTooltip = (reaction: Reaction) => {
    const names = reaction.users.map(uid => {
      if (uid === user?.id) return 'You';
      return profileMap[uid]?.full_name || 'Someone';
    });
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} and ${names.length - 2} others`;
  };

  return (
    <div className={cn(
      "flex items-center gap-1 flex-wrap",
      reactions.length > 0 ? "-mt-1 mb-1" : "mt-0",
      isOwnMessage ? "justify-end" : "justify-start",
      isOwnMessage ? "mr-1" : "ml-1"
    )}>
      {reactions.map(reaction => {
        const hasReacted = reaction.users.includes(user?.id || '');
        return (
          <button
            key={reaction.emoji}
            onClick={() => toggleReaction(reaction.emoji)}
            title={getTooltip(reaction)}
            className={cn(
              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all duration-150",
              "hover:scale-110 active:scale-95",
              hasReacted
                ? "bg-primary/15 border-primary/40 text-primary shadow-sm"
                : "bg-muted/80 border-border/40 text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="text-xs leading-none">{reaction.emoji}</span>
            <span className="font-semibold tabular-nums text-[10px]">{reaction.count}</span>
          </button>
        );
      })}

      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowPicker(showPicker ? false : 'quick')}
          className={cn(
            "inline-flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-150",
            "border-transparent text-muted-foreground/30",
            "hover:border-border/50 hover:bg-muted/60 hover:text-muted-foreground",
            reactions.length === 0 && "opacity-0 group-hover/msg:opacity-100"
          )}
          title="Add Reaction"
        >
          <SmilePlus className="w-3.5 h-3.5" />
        </button>

        {/* Summit quick reactions */}
        {showPicker === 'quick' && (
          <div className={cn(
            "absolute bottom-full mb-2 z-50 bg-card border border-border/50 rounded-full shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150",
            isOwnMessage ? "right-0" : "left-0"
          )}>
            <div className="flex items-center gap-0.5 p-1">
              {SUMMIT_REACTIONS.map(r => (
                <button
                  key={r.emoji}
                  onClick={() => toggleReaction(r.emoji)}
                  title={r.label}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-base transition-all hover:scale-125 active:scale-90"
                >
                  {r.emoji}
                </button>
              ))}
              <button
                onClick={() => setShowPicker('full')}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
                title="More"
              >
                <SmilePlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Full picker */}
        {showPicker === 'full' && (
          <div className={cn(
            "absolute bottom-full mb-2 z-50 bg-card border border-border/50 rounded-xl shadow-2xl w-[260px] max-h-[280px] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150",
            isOwnMessage ? "right-0" : "left-0"
          )}>
            <div className="overflow-y-auto max-h-[240px] p-2">
              {ALL_EMOJIS.map(cat => (
                <div key={cat.label} className="mb-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 px-1">
                    {cat.label}
                  </p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {cat.emojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(emoji)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-base transition-all hover:scale-110"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
