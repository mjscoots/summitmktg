import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { AnnouncementsFeed } from '@/components/dashboard/AnnouncementsFeed';
import { WeeklySchedule } from '@/components/dashboard/WeeklySchedule';
import { CommandBar } from '@/components/dashboard/CommandBar';
import { AICoachChat } from '@/components/dashboard/AICoachChat';
import { Bell, Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Generate static stars once
const generateStars = (count: number) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.5,
    opacity: Math.random() * 0.3 + 0.05,
    delay: Math.random() * 3,
  }));
};

const STARS = generateStars(60);

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
      {/* Subtle Starry Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {STARS.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: `hsl(217 91% 60% / ${star.opacity})`,
            }}
          />
        ))}
        {/* Very subtle radial gradient */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,hsl(217_91%_60%/0.15)_0%,transparent_50%)]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Dashboard Title */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/15">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {isManager ? 'Manager' : 'Rookie'} Home
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {isManager ? 'Lead your team to the summit' : 'Your status and action hub'}
          </p>
        </div>

        {/* Command Bar */}
        <CommandBar streak={0} signedThisWeek={0} />

        {/* Announcements + Weekly Calendar Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Announcements Panel */}
          <div className="bg-card rounded-xl border border-border/50 p-5 card-hover">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">Announcements</h2>
            </div>
            <AnnouncementsFeed />
          </div>

          {/* Weekly Calendar */}
          <div className="bg-card rounded-xl border border-border/50 p-5 card-hover">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
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
