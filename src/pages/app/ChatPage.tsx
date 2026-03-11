import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';
import { useUnreadChat } from '@/hooks/useUnreadChat';

export default function ChatPage() {
  const { markRead, setViewing } = useUnreadChat();

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
        <div className="flex-1 min-h-0">
          <CommunityChat />
        </div>
      </div>
    </AppLayout>
  );
}
