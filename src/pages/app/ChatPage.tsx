import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { markChatRead } from '@/hooks/useUnreadChat';

export default function ChatPage() {
  useEffect(() => {
    markChatRead();
    return () => { markChatRead(); };
  }, []);
  return (
    <AppLayout>
      <div className="h-[calc(100vh-56px)] flex flex-col px-0 sm:px-4 sm:py-3">
        <div className="px-4 pt-2 sm:px-0">
          <PageBackButton to="/app" label="Dashboard" />
        </div>
        <div className="flex-1 min-h-0">
          <CommunityChat />
        </div>
      </div>
    </AppLayout>
  );
}