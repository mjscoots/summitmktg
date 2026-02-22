import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';

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
        { event: '*', schema: 'public', table: 'chat_read_receipts', filter: `message_id=eq.${messageId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReceipt = payload.new as ReadReceipt;
            if (newReceipt.user_id !== user?.id) {
              setReceipts(prev => {
                if (prev.some(r => r.user_id === newReceipt.user_id)) return prev;
                return [...prev, newReceipt];
              });
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [messageId, user?.id]);

  if (!isLastInGroup || receipts.length === 0) return null;

  const displayReceipts = receipts.slice(0, 5);
  const remaining = receipts.length - 5;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-0.5 ml-[52px] mt-0.5 mb-1 group/seen cursor-pointer hover:opacity-80 transition-opacity">
          <span className="text-[10px] text-muted-foreground/50 group-hover/seen:text-muted-foreground transition-colors mr-1">
            Seen
          </span>
          <div className="flex -space-x-1.5">
            {displayReceipts.map(r => {
              const p = profileMap[r.user_id];
              return (
                <div
                  key={r.user_id}
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
          {remaining > 0 && (
            <span className="text-[10px] text-muted-foreground/50 group-hover/seen:text-muted-foreground ml-1">
              +{remaining}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-0"
        align="start"
        side="top"
        sideOffset={4}
      >
        <div className="px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">
              Seen by {receipts.length}
            </span>
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto py-1">
          {receipts.map(r => {
            const p = profileMap[r.user_id];
            return (
              <div key={r.user_id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40">
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  <UserAvatar
                    avatarUrl={p?.avatar_url || null}
                    fullName={p?.full_name || '?'}
                    size="xs"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-foreground truncate block">
                    {p?.full_name || 'Someone'}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                  {format(new Date(r.read_at), 'h:mm a')}
                </span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
