import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '👀', '🎉', '💯', '👏'];

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: 'Frequent', emojis: ['👍', '❤️', '😂', '🔥', '👀', '🎉', '💯', '👏', '✅', '🙌'] },
  { label: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '🤣', '😅', '😊', '😎', '🤩', '🥳', '😤', '😢', '🤔', '🫡', '🤝'] },
  { label: 'Gestures', emojis: ['👍', '👎', '👊', '✊', '🤞', '🫶', '💪', '🙏', '👋', '🤙', '✌️', '🫰'] },
  { label: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❤️‍🔥'] },
  { label: 'Objects', emojis: ['⭐', '💎', '🏆', '🎯', '📈', '💰', '🛡️', '⚡', '🚀', '💡', '🔔', '📌'] },
];

interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

interface MessageReactionsProps {
  messageId: string;
  profileMap: Record<string, { full_name: string }>;
}

export function MessageReactions({ messageId, profileMap }: MessageReactionsProps) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Fetch reactions for this message
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

  // Realtime subscription for this message's reactions
  useEffect(() => {
    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_reactions', filter: `message_id=eq.${messageId}` },
        () => {
          // Re-fetch on any change
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

  // Close picker on outside click
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

    // Optimistic update
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

    if (hasReacted) {
      const { error } = await supabase
        .from('chat_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
      if (error) {
        console.error('Delete reaction error:', error);
        toast.error('Failed to remove reaction');
      }
    } else {
      const { error } = await supabase
        .from('chat_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji });
      if (error) {
        console.error('Insert reaction error:', error);
        toast.error('Failed to add reaction');
      }
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
    <div className="flex items-center gap-1 flex-wrap mt-1 ml-[52px]">
      {/* Existing reactions */}
      {reactions.map(reaction => {
        const hasReacted = reaction.users.includes(user?.id || '');
        return (
          <button
            key={reaction.emoji}
            onClick={() => toggleReaction(reaction.emoji)}
            title={getTooltip(reaction)}
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs border transition-all duration-150",
              "hover:bg-muted/80",
              hasReacted
                ? "bg-primary/10 border-primary/40 text-primary"
                : "bg-muted/40 border-border/50 text-muted-foreground"
            )}
          >
            <span className="text-sm leading-none">{reaction.emoji}</span>
            <span className="font-medium tabular-nums text-[11px]">{reaction.count}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={cn(
            "inline-flex items-center justify-center w-7 h-7 rounded-md border transition-all duration-150",
            "border-transparent text-muted-foreground/40",
            "hover:border-border/50 hover:bg-muted/40 hover:text-muted-foreground",
            reactions.length === 0 && "opacity-0 group-hover/msg:opacity-100"
          )}
          title="Add Reaction"
        >
          <SmilePlus className="w-4 h-4" />
        </button>

        {/* Emoji picker */}
        {showPicker && (
          <div className="absolute bottom-full mb-2 left-0 z-50 bg-card border border-border rounded-xl shadow-xl w-[280px] max-h-[320px] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Quick bar */}
            <div className="flex gap-0.5 p-2 border-b border-border/50 bg-muted/30">
              {QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Categories */}
            <div className="overflow-y-auto max-h-[240px] p-2">
              {EMOJI_CATEGORIES.map(cat => (
                <div key={cat.label} className="mb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
                    {cat.label}
                  </p>
                  <div className="grid grid-cols-8 gap-0.5">
                    {cat.emojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(emoji)}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-lg transition-colors"
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
