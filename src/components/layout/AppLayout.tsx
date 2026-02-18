import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { StatusBar } from './StatusBar';
import { AdminBadge } from '@/components/admin/AdminBadge';
import { Mountain } from 'lucide-react';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { FeedbackButton } from '@/components/dashboard/FeedbackButton';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isManager = role === 'manager' || role === 'admin';
  useSmartNotifications();

  return (
    <ThemeProvider initialRole={isManager ? 'manager' : 'rookie'}>
      <SidebarProvider defaultOpen={true}>
        <AdminBadge />
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Desktop top bar with status + notifications */}
            <header className="hidden lg:flex sticky top-0 z-40 h-12 items-center justify-between px-4 border-b border-border/30 bg-background/80 backdrop-blur-sm">
              <div /> {/* Spacer */}
              <div className="flex items-center gap-3">
                <StatusBar />
                <NotificationBell />
              </div>
            </header>

            {/* Mobile header */}
            <header className="lg:hidden sticky top-0 z-40 border-b border-border/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="w-8 h-8" />
                  {/* Clickable Summit Logo */}
                  <button
                    onClick={() => navigate('/app')}
                    className="flex items-center gap-2 px-2 py-1 rounded-md transition-all duration-200 hover:bg-white/10 active:scale-95 cursor-pointer"
                  >
                    <Mountain className="w-4 h-4 text-primary" />
                    <span className="text-sm font-black tracking-tight hover:text-primary transition-colors">SUMMIT</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBar />
                  <NotificationBell />
                </div>
              </div>
            </header>

            <main className="flex-1">
              {children}
            </main>
            <FeedbackButton />
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
