import { useLocation, useNavigate } from 'react-router-dom';
import { PHONE_BAR } from '@/lib/appNav';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { cn } from '@/lib/utils';

/**
 * Phone bottom bar: three destinations, nothing else. The bar sits above the
 * iOS home indicator (safe area plus a 10px gap) so it clears the swipe area.
 * Everything else is reached from the workspace control in the header.
 */
export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount, markRead } = useUnreadChat();

  const isActive = (path: string) =>
    path === '/app' ? location.pathname === '/app' : location.pathname.startsWith(path);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        {PHONE_BAR.map((item) => {
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
              <span className="text-xs font-medium">{item.label}</span>
              {item.path === '/app/chat' && unreadCount > 0 && (
                <span className="absolute right-[24%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
