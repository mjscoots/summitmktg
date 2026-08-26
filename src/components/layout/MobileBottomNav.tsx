import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, GraduationCap, MessageCircle, DollarSign, Building2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { WorkspacePanel } from '@/components/workspace/WorkspacePanel';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { cn } from '@/lib/utils';

const ITEMS = [
  { label: 'Home', path: '/app', icon: Home },
  { label: 'Training', path: '/app/training', icon: GraduationCap },
  { label: 'Chat', path: '/app/chat', icon: MessageCircle },
  { label: 'Money', path: '/app/money', icon: DollarSign },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount, markRead } = useUnreadChat();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (path: string) =>
    path === '/app' ? location.pathname === '/app' : location.pathname.startsWith(path);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        {ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => {
                if (item.path === '/app/chat') markRead();
                navigate(item.path);
              }}
              className={cn(
                'relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.path === '/app/chat' && unreadCount > 0 && (
                <span className="absolute right-[22%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          );
        })}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors',
                location.pathname.startsWith('/app/industries')
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Building2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="text-[10px] font-medium">Industries</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle className="text-[15px]">Workspaces</SheetTitle>
            </SheetHeader>
            <div className="mt-3 pb-6">
              <WorkspacePanel onNavigate={() => setSheetOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
