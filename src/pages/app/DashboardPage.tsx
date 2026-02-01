import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { AnnouncementsFeed } from '@/components/dashboard/AnnouncementsFeed';
import { WeeklySchedule } from '@/components/dashboard/WeeklySchedule';
import { CommandBar } from '@/components/dashboard/CommandBar';
import { AICoachChat } from '@/components/dashboard/AICoachChat';
import { Bell, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { role, isLoading } = useAuth();
  const isManager = role === 'manager' || role === 'admin';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Dashboard Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {isManager ? 'MANAGER' : 'ROOKIE'}{' '}
            <span className={isManager ? 'text-blue-400' : 'text-green-400'}>HOME</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {isManager ? 'Lead your team to the summit' : 'Your status and action hub'}
          </p>
        </div>

        {/* Command Bar - Left Aligned */}
        <CommandBar streak={0} signedThisWeek={0} />

        {/* Announcements + Weekly Calendar Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Announcements Panel */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className={cn(
                "w-5 h-5",
                isManager ? "text-blue-400" : "text-green-400"
              )} />
              <h2 className="font-semibold text-foreground">Announcements</h2>
            </div>
            <AnnouncementsFeed />
          </div>

          {/* Weekly Calendar */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className={cn(
                "w-5 h-5",
                isManager ? "text-blue-400" : "text-green-400"
              )} />
              <h2 className="font-semibold text-foreground">Weekly Calendar</h2>
            </div>
            <WeeklySchedule />
          </div>
        </div>
      </div>

      {/* AI Coach Chat */}
      <AICoachChat />
    </AppLayout>
  );
}
