import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { cn } from '@/lib/utils';

interface ReadReceipt {
  user_id: string;
  read_at: string;
}

interface ProfileInfo {
  full_name: string;
  avatar_url: string | null;
}

interface ReadReceiptsProps {
  messageId: string;
  profileMap: Record<string, ProfileInfo>;
  isLastInGroup?: boolean;
}

export function ReadReceipts({ messageId, profileMap, isLastInGroup }: ReadReceiptsProps) {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<ReadReceipt[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('chat_read_receipts')
        .select('user_id, read_at')
        .eq('message_id', messageId);
      if (data) setReceipts(data.filter(r => r.user_id !== user?.id));
    };
    fetch();
  }, [messageId, user?.id]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`read-${messageId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_read_receipts', filter: `message_id=eq.${messageId}` },
        (payload) => {
          const newReceipt = payload.new as ReadReceipt;
          if (newReceipt.user_id !== user?.id) {
            setReceipts(prev => {
              if (prev.some(r => r.user_id === newReceipt.user_id)) return prev;
              return [...prev, newReceipt];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [messageId, user?.id]);

  if (!isLastInGroup || receipts.length === 0) return null;

  const displayReceipts = showAll ? receipts : receipts.slice(0, 5);
  const remaining = receipts.length - 5;

  return (
    <div className="flex items-center gap-0.5 ml-[52px] mt-0.5 mb-1">
      <span className="text-[10px] text-muted-foreground/50 mr-1">Seen</span>
      <div className="flex -space-x-1.5">
        {displayReceipts.map(r => {
          const p = profileMap[r.user_id];
          return (
            <div
              key={r.user_id}
              title={p?.full_name || 'Someone'}
              className="w-4 h-4 rounded-full overflow-hidden border border-card ring-0"
            >
              <UserAvatar
                avatarUrl={p?.avatar_url || null}
                fullName={p?.full_name || '?'}
                size="xs"
              />
            </div>
          );
        })}
      </div>
      {!showAll && remaining > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground ml-1"
        >
          +{remaining}
        </button>
      )}
    </div>
  );
}
