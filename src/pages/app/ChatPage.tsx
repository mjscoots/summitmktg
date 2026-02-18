import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';

export default function ChatPage() {
  return (
    <AppLayout>
      <div className="h-[calc(100vh-56px)] px-0 sm:px-4 sm:py-3">
        <CommunityChat />
      </div>
    </AppLayout>
  );
}