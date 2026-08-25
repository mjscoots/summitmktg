import { ReactNode } from 'react';
import { WhatsNewTour } from '@/components/onboarding/WhatsNewTour';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { StatusBar } from './StatusBar';
import { ImpersonationBanner } from './ImpersonationBanner';
import { Mountain } from 'lucide-react';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { cn } from '@/lib/utils';
import { isManagerOrAbove } from '@/lib/roles';


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
      <SidebarProvider defaultOpen={true}>
        <ImpersonationBanner />
        <div className={cn("min-h-screen flex w-full summit-atmosphere bg-background", fullHeight && "h-[100dvh] max-h-[100dvh]")}>
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Desktop top bar */}
            <header className="hidden lg:flex sticky top-0 z-40 h-14 items-center justify-between border-b border-border/60 bg-background/80 px-5 backdrop-blur-xl">
              <div /> {/* Spacer */}
              <div className="flex items-center gap-3">
                <GlobalSearch />
                <StatusBar />
                <NotificationBell />
              </div>
            </header>

            {/* Mobile header */}
            <header className="lg:hidden sticky top-0 z-40 border-b border-border/60 bg-background/85 px-3 py-2 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 flex-shrink-0">
                  <SidebarTrigger className="h-11 w-11 rounded-xl border border-primary/20 bg-primary/15 text-primary shadow-sm transition-colors hover:bg-primary/25 hover:text-primary" />
                  <button
                    onClick={() => navigate('/app')}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl px-2 transition-colors duration-180 hover:bg-foreground/5 active:scale-95"
                  >
                    <Mountain className="h-4 w-4 text-foreground" />
                    <span className="text-[13px] font-black tracking-tight text-foreground transition-colors hover:text-primary">SUMMIT</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 overflow-visible">
                  <GlobalSearch />
                  <StatusBar />
                  <NotificationBell />
                </div>
              </div>
            </header>

            <main className={cn("flex-1 overflow-x-hidden", fullHeight && "min-h-0 overflow-hidden")}>
              {children}
            </main>
            <WhatsNewTour />
            
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
