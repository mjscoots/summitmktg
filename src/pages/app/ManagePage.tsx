import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { Swords, FileText, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

const GRID_PATTERN =
  "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]";

type ManageTab = 'overview' | 'forms';

export default function ManagePage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  const [activeTab, setActiveTab] = useState<ManageTab>('overview');

  if (!isManager) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">This page is for managers only.</p>
        </div>
      </AppLayout>
    );
  }

  const TABS: { id: ManageTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'forms', label: 'Forms' },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <PageBackButton to="/app" label="Dashboard" />

        {/* Hero Banner */}
        <div className="relative h-24 rounded-xl overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/25 via-teal-500/15 to-primary/20" />
          <div className={cn('absolute inset-0 opacity-50', GRID_PATTERN)} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight drop-shadow-sm">
              MANAGE
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Leadership tools and performance controls
            </p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex justify-center mb-6">
          <div className="p-1 bg-muted/50 rounded-xl border border-border/30">
            <div className="flex">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-8 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 text-center",
                    activeTab === tab.id
                      ? "bg-card text-foreground shadow-md border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Overview card */}
            <button
              onClick={() => navigate('/app/war-room')}
              className={cn(
                'group relative w-full p-6 bg-card rounded-xl text-left overflow-hidden',
                'border-2 border-border/50 cursor-pointer',
                'transition-all duration-300 hover:scale-[1.01]',
                'hover:border-orange-500/40',
                'hover:shadow-[0_0_30px_-10px_rgba(249,115,22,0.4)]'
              )}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-orange-500/15 group-hover:bg-orange-500/25 text-orange-400 transition-colors">
                  <Swords className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground group-hover:text-foreground transition-colors">Overview</h2>
                  <p className="text-sm text-muted-foreground">View team metrics and performance statistics</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {activeTab === 'forms' && (
          <div className="space-y-6">
            <button
              onClick={() => navigate('/app/forms')}
              className={cn(
                'group relative w-full p-6 bg-card rounded-xl text-left overflow-hidden',
                'border-2 border-border/50 cursor-pointer',
                'transition-all duration-300 hover:scale-[1.01]',
                'hover:border-blue-500/40',
                'hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.4)]'
              )}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/15 group-hover:bg-blue-500/25 text-blue-400 transition-colors">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground group-hover:text-foreground transition-colors">Forms</h2>
                  <p className="text-sm text-muted-foreground">Interview forms and weekly check-ins</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Featured: Pitch Approvals / Rep Videos */}
        <div className="mt-8">
          <button
            onClick={() => navigate('/app/pitch-approvals')}
            className={cn(
              'group relative w-full p-8 rounded-2xl text-center overflow-hidden cursor-pointer',
              'border-2 border-purple-500/30',
              'transition-all duration-500',
              'hover:border-purple-500/60',
              'hover:shadow-[0_0_60px_-15px_rgba(139,92,246,0.5)]',
            )}
            style={{
              background: 'linear-gradient(135deg, hsl(270 60% 15% / 0.6), hsl(270 50% 20% / 0.3), hsl(270 60% 15% / 0.6))',
            }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, hsl(270 70% 60% / 0.15) 0%, transparent 70%)',
              }}
            />
            <div className="relative z-10">
              <div className="mx-auto w-14 h-14 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                <Video className="w-7 h-7 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">Pitch Approvals & Rep Videos</h2>
              <p className="text-sm text-muted-foreground">Review pitch submissions and all rep video recordings</p>
            </div>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
