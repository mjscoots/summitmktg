import { ReactNode } from 'react';
import { WhatsNewTour } from '@/components/onboarding/WhatsNewTour';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { StatusBar } from './StatusBar';
import { ImpersonationBanner } from './ImpersonationBanner';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { cn } from '@/lib/utils';
import { isManagerOrAbove } from '@/lib/roles';
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceThemeProvider } from '@/components/workspace/WorkspaceThemeProvider';
import { MobileBottomNav } from './MobileBottomNav';
import { WorkspaceSheet } from './WorkspaceSheet';



interface AppLayoutProps {
  children: ReactNode;
  fullHeight?: boolean;
}

export function AppLayout({ children, fullHeight }: AppLayoutProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isManager = isManagerOrAbove(role);
  useSmartNotifications();

  return (
    <ThemeProvider initialRole={isManager ? 'manager' : 'rookie'}>
      <WorkspaceProvider>
        <WorkspaceThemeProvider>
        <SidebarProvider defaultOpen={true}>
          <ImpersonationBanner />
          <div className={cn("min-h-screen flex w-full summit-atmosphere app-topo-bg bg-background", fullHeight && "h-[100dvh] max-h-[100dvh]")}>
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              {/* Desktop top bar */}
              <header className="hidden lg:flex sticky top-0 z-40 h-14 items-center justify-between border-b border-border/60 bg-background/80 px-5 backdrop-blur-xl">
                <WorkspaceLabel />
                <div className="flex items-center gap-3">
                  <GlobalSearch />
                  <StatusBar />
                  <NotificationBell />
                </div>
              </header>

              {/* Mobile header — the workspace control replaces the sidebar */}
              <header className="lg:hidden sticky top-0 z-40 border-b border-border/60 bg-background/85 px-3 py-2 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <WorkspaceSheet />
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 overflow-visible">
                    <button
                      onClick={() => navigate('/app/ask')}
                      className="inline-flex min-h-11 items-center rounded-xl px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Ask
                    </button>
                    <GlobalSearch />
                    <StatusBar />
                    <NotificationBell />
                  </div>
                </div>
              </header>

              <main className={cn("flex-1 overflow-x-hidden pb-[84px] lg:pb-0", fullHeight && "min-h-0 overflow-hidden")}>
                {children}
              </main>
              <MobileBottomNav />

              <WhatsNewTour />

            </div>
          </div>
        </SidebarProvider>
        </WorkspaceThemeProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  );
}

function WorkspaceLabel({ mobile }: { mobile?: boolean }) {
  const { active } = useWorkspace();
  const label = active?.name || 'Summit';
  if (mobile) {
    return (
      <span className="text-[13px] font-black tracking-tight text-foreground transition-colors hover:text-primary">
        {label.toUpperCase()}
      </span>
    );
  }
  return <span className="text-[13px] font-medium text-muted-foreground">{label}</span>;
}
