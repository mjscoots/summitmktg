import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { phoneBar } from '@/lib/appNav';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { useComposerKeyboard } from '@/lib/composerKeyboard';
import { cn } from '@/lib/utils';

/**
 * Phone bottom bar: a floating pill inset from the screen edges, sitting above
 * the iOS home indicator. It hides while a chat composer is focused so the
 * input is always tappable. One accent tinted circle slides between tabs to
 * mark the active destination.
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

  const activeIndex = items.findIndex((item) => isActive(item.path));

  const rowRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  // The indicator follows the active tab, and follows it again after a resize.
  useLayoutEffect(() => {
    const measure = () => {
      const row = rowRef.current;
      const tab = tabRefs.current[activeIndex];
      if (!row || !tab) {
        setPill(null);
        return;
      }
      const rowBox = row.getBoundingClientRect();
      const tabBox = tab.getBoundingClientRect();
      setPill({ left: tabBox.left - rowBox.left, width: tabBox.width });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeIndex, items.length]);

  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, items.length);
  }, [items.length]);

  if (focused) return null;

  return (
    <nav
      className="fixed left-0 right-0 z-40 px-3 lg:hidden"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      aria-label="Primary"
      data-phone-bar
    >
      <div
        ref={rowRef}
        className="relative mx-auto flex max-w-lg items-stretch gap-0.5 rounded-full p-1.5 backdrop-blur-xl"
        style={{
          background: 'hsl(var(--surface-elevated) / 0.92)',
          border: '1px solid hsl(var(--border))',
          boxShadow: 'var(--shadow-lift)',
        }}
      >
        {pill && (
          <span
            aria-hidden
            className="tab-indicator pointer-events-none absolute rounded-full"
            style={{
              top: 6,
              bottom: 6,
              width: pill.width,
              transform: `translateX(${pill.left}px)`,
              background: 'hsl(var(--workspace-accent) / 0.14)',
            }}
          />
        )}

        {items.map((item, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={item.path}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              onClick={() => {
                if (item.path === '/app/chat') markRead();
                navigate(item.path);
              }}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'press relative z-[1] flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 py-1.5 transition-colors',
                active ? 'text-[hsl(var(--workspace-accent))]' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.75} />
              <span className="text-[11px] font-semibold leading-none">{item.label}</span>

              {item.path === '/app/chat' && unreadCount > 0 && (
                <span className="absolute right-[18%] top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
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
