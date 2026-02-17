import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';

export default function ChatPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 h-[calc(100vh-80px)]">
        <CommunityChat />
      </div>
    </AppLayout>
  );
}
