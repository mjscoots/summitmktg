import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CommunityChat } from '@/components/dashboard/CommunityChat';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { MomentumStrip } from '@/components/warroom/MomentumStrip';
import { MomentumMetrics } from '@/components/warroom/MomentumMetrics';
import { LiveLeaderboardSnapshot } from '@/components/warroom/LiveLeaderboardSnapshot';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ChatPage() {
  const { markRead } = useUnreadChat();
  const isMobile = useIsMobile();

  useEffect(() => {
    markRead();
    return () => { markRead(); };
  }, [markRead]);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-56px)] flex flex-col">
        {/* Momentum Strip */}
        <MomentumStrip />
        
        <div className="flex-1 min-h-0 flex">
          {/* Main Feed */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 pt-2 sm:px-4">
              <PageBackButton to="/app" label="Dashboard" />
            </div>
            <div className="flex-1 min-h-0 px-0 sm:px-2 pb-2">
              <CommunityChat />
            </div>
          </div>
          
          {/* Right Sidebar - Metrics & Leaderboard */}
          {!isMobile && (
            <div className="w-56 flex-shrink-0 border-l border-border/20 p-3 space-y-3 overflow-y-auto bg-[hsl(220,16%,3%)]">
              <LiveLeaderboardSnapshot />
              <MomentumMetrics />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
