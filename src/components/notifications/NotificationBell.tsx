import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Check, CheckCheck, Calendar } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [justCleared, setJustCleared] = useState(false);
  const prevCountRef = useRef(0);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, requestPushPermission } = useNotifications();

  useEffect(() => {
    if (prevCountRef.current > 0 && unreadCount === 0) {
      setJustCleared(true);
      const timer = setTimeout(() => setJustCleared(false), 600);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    if (!notification.is_read) await markAsRead(notification.id);
    if (notification.link) { navigate(notification.link); setIsOpen(false); }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestPushPermission();
    if (!granted) alert('Notifications blocked. Please enable them in your browser settings.');
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) markAllAsRead();
  };

  const hasNotifications = notifications.length > 0;
  const hasUnread = unreadCount > 0;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label={hasUnread ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          {hasUnread ? (
            <BellRing className="w-5 h-5 text-primary" />
          ) : (
            <Bell className={cn(
              "w-5 h-5 transition-colors",
              hasNotifications ? "text-foreground" : "text-muted-foreground"
            )} />
          )}
          {hasUnread && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-in zoom-in-50 duration-200" />
          )}
          {justCleared && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-out zoom-out-50 fade-out duration-500" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllAsRead}>
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">All caught up</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors",
                  !notification.is_read && "bg-primary/5"
                )}
              >
                <div className="flex gap-3">
                  <div className={cn(
                    "mt-0.5 p-1.5 rounded-full flex-shrink-0",
                    notification.event_id ? "bg-primary/10" : "bg-muted"
                  )}>
                    {notification.event_id ? (
                      <Calendar className="w-3 h-3 text-primary" />
                    ) : (
                      <Bell className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm truncate", !notification.is_read && "font-medium")}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && Notification.permission !== 'denied' && (
          <div className="p-3 border-t border-border">
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleEnableNotifications}>
              <Bell className="w-3 h-3 mr-2" />
              Enable push notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
