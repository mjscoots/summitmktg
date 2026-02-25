import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { MomentumStrip } from '@/components/warroom/MomentumStrip';
import { MomentumMetrics } from '@/components/warroom/MomentumMetrics';
import { LiveLeaderboardSnapshot } from '@/components/warroom/LiveLeaderboardSnapshot';
import { DailyCheckIn } from '@/components/warroom/DailyCheckIn';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Swords, Trophy, Target, Zap, Activity, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type WarRoomTab = 'pulse' | 'team' | 'leaderboard';

export default function WarRoomPage() {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const isManager = role === 'manager' || role === 'admin';
  const firstName = profile?.full_name?.split(' ')[0] || 'Soldier';

  const handleCheckInSubmit = async (content: string) => {
    if (!user) return;
    try {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        content,
        channel: 'general',
      });
      toast.success('Check-in posted to community!');
    } catch {
      toast.error('Failed to post check-in');
    }
  };

  const TABS: { id: WarRoomTab; label: string; icon: typeof Activity; path?: string }[] = [
    { id: 'pulse', label: 'Pulse', icon: Activity },
    { id: 'team', label: 'Team', icon: Users, path: '/app/team' },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, path: '/app/leaderboard' },
  ];

  return (
    <AppLayout>
      {/* Momentum Strip — always on top */}
      <MomentumStrip />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <PageBackButton to="/app" label="Dashboard" />

        {/* Hero */}
        <div className="relative h-28 rounded-xl overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-red-950 via-red-900/60 to-orange-900/40" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
          <div className="absolute inset-0 flex items-center px-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30">
                <Swords className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  WAR ROOM
                </h1>
                <p className="text-xs text-white/50">
                  It's game day, {firstName}. Execute or get left behind.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Bar — Pulse / Team / Leaderboard */}
        <div className="p-1 bg-muted/50 rounded-xl mb-6 border border-border/30">
          <div className="flex">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => tab.path ? navigate(tab.path) : undefined}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold rounded-lg transition-all duration-200",
                    tab.id === 'pulse'
                      ? "bg-card text-foreground shadow-md shadow-primary/10 border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", tab.id === 'pulse' && "text-primary")} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Check-In */}
        <div className="mb-5">
          <DailyCheckIn onSubmit={handleCheckInSubmit} />
        </div>

        {/* Metrics + Leaderboard side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MomentumMetrics />
          <LiveLeaderboardSnapshot />
        </div>

        {/* Quick action cards */}
        {isManager && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
            {[
              { icon: Users, label: 'My Team', path: '/app/team', color: 'text-primary' },
              { icon: Trophy, label: 'Leaderboard', path: '/app/leaderboard', color: 'text-yellow-500' },
              { icon: Target, label: 'Sign a Rep', path: '/app/interviews', color: 'text-emerald-400' },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border/40 hover:border-border transition-all hover:scale-[1.02] group"
              >
                <item.icon className={cn('w-5 h-5', item.color, 'group-hover:scale-110 transition-transform')} />
                <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
