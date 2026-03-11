import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { Wrench, FileText, Calendar, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lazy, Suspense } from 'react';

const LazyFormsContent = lazy(() => import('./FormsPage').then(m => ({ default: m.default })));
const LazyCalendarContent = lazy(() => import('./CalendarPage').then(m => ({ default: m.default })));
const LazyLinksContent = lazy(() => import('./LinksPage').then(m => ({ default: m.default })));

type OpTab = 'forms' | 'calendar' | 'resources';

const tabs: { id: OpTab; label: string; icon: React.ComponentType<{ className?: string }>; managerOnly?: boolean }[] = [
  { id: 'forms', label: 'Forms', icon: FileText, managerOnly: true },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'resources', label: 'Resources', icon: Link2 },
];

export default function OperationsPage() {
  const { role } = useAuth();
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  
  const availableTabs = tabs.filter(t => !t.managerOnly || isManager);
  const [activeTab, setActiveTab] = useState<OpTab>(isManager ? 'forms' : 'calendar');

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <PageBackButton to="/app" label="Dashboard" />

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/10 border border-primary/20 shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)]">
            <Wrench className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Operations</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-[52px] mb-8">
          Operational tools for running your team
        </p>

        {/* Tab Bar */}
        <div className="flex gap-3 mb-8">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border',
                  activeTab === tab.id
                    ? 'bg-white/[0.06] border-primary/40 text-foreground shadow-[0_0_16px_-6px_hsl(var(--primary)/0.35)]'
                    : 'bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] hover:-translate-y-0.5'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content - rendered full-width, each sub-page has its own AppLayout-like content */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
        {activeTab === 'forms' && isManager && <FormsEmbed />}
        {activeTab === 'calendar' && <CalendarEmbed />}
        {activeTab === 'resources' && <LinksEmbed />}
      </Suspense>
    </AppLayout>
  );
}

// These embed components render the page content without AppLayout wrapper
// We use a simple approach: import and render content directly

function FormsEmbed() {
  // Render FormsPage content inline - it already has AppLayout, so we need the content only
  // For now, redirect approach - render the actual page content
  const { default: FormsPageContent } = { default: lazy(() => import('./FormsPage')) };
  return null; // placeholder - we'll use a different approach
}

function CalendarEmbed() {
  return null;
}

function LinksEmbed() {
  return null;
}
