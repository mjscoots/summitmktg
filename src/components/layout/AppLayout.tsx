import { ReactNode } from 'react';
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
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceThemeProvider } from '@/components/workspace/WorkspaceThemeProvider';
import { MobileBottomNav } from './MobileBottomNav';
import { WorkspaceSheet } from './WorkspaceSheet';
import { Wordmark } from '@/components/brand/Wordmark';
import { useAppearanceSync } from '@/hooks/useAppearance';
import { VerticalRouteGuard } from '@/components/workspace/VerticalRouteGuard';



interface AppLayoutProps {
  children: ReactNode;
  fullHeight?: boolean;
}

export function AppLayout({ children, fullHeight }: AppLayoutProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isManager = isManagerOrAbove(role);
  useSmartNotifications();
  useAppearanceSync();

  return (
    <ThemeProvider initialRole={isManager ? 'manager' : 'rookie'}>
        <WorkspaceThemeProvider>
        <SidebarProvider defaultOpen={true}>
          <ImpersonationBanner />
          <div className={cn("min-h-screen flex w-full app-texture bg-background", fullHeight && "h-[100dvh] max-h-[100dvh]")}>
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              {/* Desktop top bar */}
              <header className="hidden lg:flex sticky top-0 z-40 h-14 items-center justify-between border-b border-border/60 bg-background/80 px-5 backdrop-blur-xl">
                <button onClick={() => navigate('/app')} className="flex items-center" aria-label="Summit home">
                  <Wordmark variant="compact" height={36} />
                </button>
                <div className="flex items-center gap-3">
                  <GlobalSearch />
                  <StatusBar />
                  <NotificationBell />
                </div>
              </header>

              {/* Mobile header — the workspace control replaces the sidebar */}
              <header className="lg:hidden sticky top-0 z-40 border-b border-border/60 bg-background/85 px-3 py-2 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <button onClick={() => navigate('/app')} className="flex flex-shrink-0 items-center" aria-label="Summit home">
                      {/* The wordmark is the brand: compact from 360px up, mark only on the narrowest phones. */}
                      <span className="hidden min-[360px]:flex">
                        <Wordmark variant="compact" height={30} />
                      </span>
                      <span className="flex min-[360px]:hidden">
                        <Wordmark variant="mark" height={28} />
                      </span>
                    </button>



                    <WorkspaceSheet />
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 overflow-visible">
                    <button
                      onClick={() => navigate('/app/ask')}
                      className="hidden min-[400px]:inline-flex min-h-11 items-center rounded-xl px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Ask
                    </button>

                    <GlobalSearch />
                    <StatusBar />
                    <NotificationBell />
                  </div>
                </div>
              </header>

              <WorkspaceScopedMain fullHeight={fullHeight}>{children}</WorkspaceScopedMain>
              <MobileBottomNav />



            </div>
          </div>
        </SidebarProvider>
        </WorkspaceThemeProvider>
    </ThemeProvider>
  );
}

/**
 * Remounts the whole screen when the workspace changes so no list, count or
 * query keeps data from the previous workspace.
 */
function WorkspaceScopedMain({ children, fullHeight }: { children: ReactNode; fullHeight?: boolean }) {
  const { activeVertical, epoch } = useWorkspace();
  return (
    <main
      key={`${activeVertical}:${epoch}`}
      className={cn('app-main-pad page-transition flex-1 overflow-x-hidden', fullHeight && 'min-h-0 overflow-hidden')}
      data-app-main
    >
      <VerticalRouteGuard>{children}</VerticalRouteGuard>
    </main>
  );
}
