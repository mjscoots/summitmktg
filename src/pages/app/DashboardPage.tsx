import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { AnnouncementsFeed } from '@/components/dashboard/AnnouncementsFeed';
import { WeeklySchedule } from '@/components/dashboard/WeeklySchedule';
import { CommandBar } from '@/components/dashboard/CommandBar';
import { AICoachChat } from '@/components/dashboard/AICoachChat';
import { Bell, Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

// Generate static stars once
const generateStars = (count: number) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.5 + 0.1,
    delay: Math.random() * 3,
  }));
};

const STARS = generateStars(80);

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
            className="absolute rounded-full animate-pulse"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: isManager 
                ? `rgba(59, 130, 246, ${star.opacity})` 
                : `rgba(34, 197, 94, ${star.opacity})`,
              animationDelay: `${star.delay}s`,
              animationDuration: '4s',
            }}
          />
        ))}
        {/* Subtle radial gradient */}
        <div className={cn(
          "absolute inset-0 opacity-20",
          isManager
            ? "bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15)_0%,transparent_50%)]"
            : "bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.15)_0%,transparent_50%)]"
        )} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Dashboard Title */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className={cn(
              "w-6 h-6",
              isManager ? "text-blue-400" : "text-green-400"
            )} />
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              {isManager ? 'MANAGER' : 'ROOKIE'}{' '}
              <span className={isManager ? 'text-blue-400' : 'text-green-400'}>HOME</span>
            </h1>
          </div>
          <p className="text-muted-foreground">
            {isManager ? 'Lead your team to the summit' : 'Your status and action hub'}
          </p>
        </div>

        {/* Command Bar */}
        <CommandBar streak={0} signedThisWeek={0} />

        {/* Announcements + Weekly Calendar Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Announcements Panel */}
          <div className={cn(
            "bg-card/80 backdrop-blur-sm rounded-xl border p-5 transition-all duration-300 hover:border-opacity-70",
            isManager 
              ? "border-blue-500/20 shadow-[0_0_30px_-15px_rgba(59,130,246,0.2)]" 
              : "border-green-500/20 shadow-[0_0_30px_-15px_rgba(34,197,94,0.2)]"
          )}>
            <div className="flex items-center gap-2 mb-4">
              <div className={cn(
                "p-2 rounded-lg",
                isManager ? "bg-blue-500/10" : "bg-green-500/10"
              )}>
                <Bell className={cn(
                  "w-5 h-5",
                  isManager ? "text-blue-400" : "text-green-400"
                )} />
              </div>
              <h2 className="font-bold text-foreground">Announcements</h2>
            </div>
            <AnnouncementsFeed />
          </div>

          {/* Weekly Calendar */}
          <div className={cn(
            "bg-card/80 backdrop-blur-sm rounded-xl border p-5 transition-all duration-300 hover:border-opacity-70",
            isManager 
              ? "border-blue-500/20 shadow-[0_0_30px_-15px_rgba(59,130,246,0.2)]" 
              : "border-green-500/20 shadow-[0_0_30px_-15px_rgba(34,197,94,0.2)]"
          )}>
            <div className="flex items-center gap-2 mb-4">
              <div className={cn(
                "p-2 rounded-lg",
                isManager ? "bg-blue-500/10" : "bg-green-500/10"
              )}>
                <Calendar className={cn(
                  "w-5 h-5",
                  isManager ? "text-blue-400" : "text-green-400"
                )} />
              </div>
              <h2 className="font-bold text-foreground">Weekly Calendar</h2>
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
