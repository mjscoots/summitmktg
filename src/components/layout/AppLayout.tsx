import { ReactNode } from 'react';
import { WhatsNewTour } from '@/components/onboarding/WhatsNewTour';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
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
        <div className={cn("min-h-screen flex w-full bg-background summit-atmosphere", fullHeight && "h-[100dvh] max-h-[100dvh]")}>
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Desktop top bar with status + notifications */}
            <header className="hidden lg:flex sticky top-0 z-40 h-12 items-center justify-between px-4 border-b border-border/30 bg-background/80 backdrop-blur-md">
              <div /> {/* Spacer */}
              <div className="flex items-center gap-3">
                <StatusBar />
                <NotificationBell />
              </div>
            </header>

            {/* Mobile header */}
            <header className="lg:hidden sticky top-0 z-40 border-b border-border/30 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 px-2 py-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <SidebarTrigger className="w-8 h-8 bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary border border-primary/20 rounded-lg shadow-sm" />
                  <button
                    onClick={() => navigate('/app')}
                    className="flex items-center gap-1 px-1.5 py-1 rounded-md transition-all duration-200 hover:bg-white/10 active:scale-95 cursor-pointer"
                  >
                    <Mountain className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-black tracking-tight hover:text-primary transition-colors">SUMMIT</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 overflow-visible">
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
