import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { useUnreadChat } from '@/hooks/useUnreadChat';

export default function ChatPage() {
  const { markRead } = useUnreadChat();

  useEffect(() => {
    markRead();
    return () => { markRead(); };
  }, [markRead]);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-56px)] flex flex-col">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 pt-2 sm:px-4">
            <PageBackButton to="/app" label="Dashboard" />
          </div>
          <div className="flex-1 min-h-0 px-0 sm:px-2 pb-2">
            <CommunityChat />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
