import { useLocation, useNavigate } from 'react-router-dom';
import { phoneBar } from '@/lib/appNav';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { useComposerKeyboard } from '@/lib/composerKeyboard';
import { cn } from '@/lib/utils';

/**
 * Phone bottom bar: a floating pill inset from the screen edges, sitting above
 * the iOS home indicator. It hides while a chat composer is focused so the
 * input is always tappable. The active destination carries the workspace accent.
 */
export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount, markRead } = useUnreadChat();
  const { focused } = useComposerKeyboard();
  const { activeVertical } = useWorkspace();
  const items = phoneBar(activeVertical);

  const isActive = (path: string) =>
    path === '/app' ? location.pathname === '/app' : location.pathname.startsWith(path);

  if (focused) return null;

  return (
    <nav
      className="fixed left-0 right-0 z-40 px-4 lg:hidden"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      aria-label="Primary"
      data-phone-bar
    >
      <div
        className="mx-auto flex max-w-lg items-stretch gap-1 p-1.5"
        style={{
          background: 'hsl(var(--surface-elevated))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 16,
          boxShadow: 'var(--shadow-lift)',
        }}

      >
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => {
                if (item.path === '/app/chat') markRead();
                navigate(item.path);
              }}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[16px] py-1.5 transition-colors',
                active
                  ? 'bg-[hsl(var(--workspace-accent)/0.14)] text-[hsl(var(--workspace-accent))]'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-6 w-6" strokeWidth={active ? 2 : 1.75} />
              <span className="text-[11px] font-semibold leading-none">{item.label}</span>
              {item.path === '/app/chat' && unreadCount > 0 && (
                <span className="absolute right-[22%] top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
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
