import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Lock, Palette, Bell, User } from 'lucide-react';

/**
 * The Settings list. Profile, Appearance with its two children, Notifications
 * and Account. Used on the More screen and on the standalone Settings page so a
 * deep link shows the same rows.
 */
export function SettingsList() {
  const navigate = useNavigate();
  const [lookOpen, setLookOpen] = useState(false);

  const row = 'flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-secondary';

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      <button onClick={() => navigate('/app/profile')} className={row}>
        <User className="h-[18px] w-[18px] flex-shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="flex-1 truncate text-[15px] text-foreground">Profile</span>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>

      <button
        onClick={() => setLookOpen((v) => !v)}
        aria-expanded={lookOpen}
        className={row + ' border-t border-border'}
      >
        <Palette className="h-[18px] w-[18px] flex-shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="flex-1 truncate text-[15px] text-foreground">Appearance</span>
        {lookOpen ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}
      </button>
      {lookOpen && (
        <div className="border-t border-border bg-background/40">
          <button onClick={() => navigate('/app/appearance')} className={row + ' pl-11'}>
            <span className="flex-1 truncate text-[15px] text-foreground">App look</span>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </button>
          <button onClick={() => navigate('/app/chat-look')} className={row + ' border-t border-border pl-11'}>
            <span className="flex-1 truncate text-[15px] text-foreground">Chat look</span>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </button>
        </div>
      )}

      <button onClick={() => navigate('/app/notifications')} className={row + ' border-t border-border'}>
        <Bell className="h-[18px] w-[18px] flex-shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="flex-1 truncate text-[15px] text-foreground">Notifications</span>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>

      <button onClick={() => navigate('/app/account')} className={row + ' border-t border-border'}>
        <Lock className="h-[18px] w-[18px] flex-shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="flex-1 truncate text-[15px] text-foreground">Account</span>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
}

export default SettingsList;
