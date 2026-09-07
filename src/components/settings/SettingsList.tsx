import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Lock, Palette, Bell, User } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/**
 * The Settings list. Profile, Appearance with its two children, Notifications
 * and Account. Used on the More screen and on the standalone Settings page so a
 * deep link shows the same rows. The tiles here are neutral grey so Settings
 * reads as its own zone.
 */
export function SettingsList() {
  const navigate = useNavigate();
  const [lookOpen, setLookOpen] = useState(false);

  const row =
    'press flex min-h-[60px] w-full items-center gap-4 rounded bg-card px-5 text-left transition-colors hover:bg-secondary';
  const tile =
    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-secondary text-muted-foreground';

  return (
    <div className="space-y-2">
      <button onClick={() => navigate('/app/profile')} className={row}>
        <span className={tile}>
          <User className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <span className="flex-1 truncate text-[15px] text-foreground">Profile</span>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>

      <Collapsible open={lookOpen} onOpenChange={setLookOpen}>
        <CollapsibleTrigger className={row}>
          <span className={tile}>
            <Palette className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <span className="flex-1 truncate text-[15px] text-foreground">Appearance</span>
          <ChevronRight
            className={
              'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ' +
              (lookOpen ? 'rotate-90' : '')
            }
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:collapse-open data-[state=closed]:collapse-closed">
          <div className="mt-2 space-y-2 pl-4">
            <button onClick={() => navigate('/app/appearance')} className={row + ' pl-[64px]'}>
              <span className="flex-1 truncate text-[15px] text-foreground">App look</span>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/app/chat-look')}
              className={row + ' pl-[64px]'}
            >
              <span className="flex-1 truncate text-[15px] text-foreground">Chat look</span>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <button onClick={() => navigate('/app/notifications')} className={row}>
        <span className={tile}>
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <span className="flex-1 truncate text-[15px] text-foreground">Notifications</span>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>

      <button onClick={() => navigate('/app/account')} className={row}>
        <span className={tile}>
          <Lock className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <span className="flex-1 truncate text-[15px] text-foreground">Account</span>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
}

export default SettingsList;
