import { useEffect } from 'react';
import { CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { Button } from '@/components/ui/button';

export default function ChatPage() {
  const { unreadCount, markRead, setViewing } = useUnreadChat();

  useEffect(() => {
    setViewing(true);
    window.scrollTo({ top: 0, behavior: 'auto' });
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'auto' });
    return () => {
      markRead();
      setViewing(false);
    };
  }, [markRead, setViewing]);

  return (
    <AppLayout fullHeight>
      <div className="h-full flex flex-col overflow-hidden" style={{ height: '100%', maxHeight: '100dvh' }}>
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-1.5">
          <span className="micro-label truncate">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => {
              markRead();
              toast.success('Chat marked as read');
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <CommunityChat />
        </div>
      </div>
    </AppLayout>
  );
}
