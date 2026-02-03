import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { role } = useAuth();
  const isManager = role === 'manager' || role === 'admin';

  return (
    <ThemeProvider initialRole={isManager ? 'manager' : 'rookie'}>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile header with sidebar trigger */}
            <header className="lg:hidden sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SidebarTrigger />
                  <h1 className="text-lg font-black tracking-tight">
                    SUMMIT <span className={isManager ? "text-blue-400" : "text-green-400"}>MKTG</span>
                  </h1>
                </div>
                <NotificationBell />
              </div>
            </header>
            {/* Desktop notification bell - fixed position */}
            <div className="hidden lg:flex fixed top-4 right-6 z-50">
              <NotificationBell />
            </div>
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
