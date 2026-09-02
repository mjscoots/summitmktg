import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  disablePush,
  enablePush,
  isIOSSafari,
  isStandalone,
  pushOptedIn,
  pushSupported,
} from '@/lib/push';

/**
 * Pass 147 - the one place a person turns real push on. Off by default, the
 * browser is only asked for permission on tap, and a refusal says its line
 * once instead of asking again.
 */
export function PushToggle() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const supported = pushSupported();

  useEffect(() => {
    setOn(pushOptedIn());
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      setNote('Notifications are blocked for this site. Turn them back on in your browser settings.');
    }
  }, []);

  const needsHomeScreen = isIOSSafari() && !isStandalone();

  const handleToggle = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);

    if (on) {
      const ok = await disablePush();
      setOn(false);
      setBusy(false);
      if (ok) toast.success('Push notifications turned off');
      else toast.error('Could not turn push off');
      return;
    }

    if (needsHomeScreen) {
      setNote('On iPhone, add Summit to your home screen first, then turn this on from the installed app.');
      setBusy(false);
      return;
    }

    const result = await enablePush();
    setBusy(false);

    if (result === 'enabled') {
      setOn(true);
      toast.success('Push notifications turned on');
      return;
    }
    if (result === 'denied') {
      setNote('Notifications are blocked for this site. Turn them back on in your browser settings.');
      return;
    }
    if (result === 'unsupported') {
      setNote('This browser does not support push notifications.');
      return;
    }
    setNote('Could not turn push on. Try again in a moment.');
  };

  return (
    <div className="rounded-lg px-2 py-3">
      <div className="flex items-center justify-between">
        <div className="mr-4 min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Push notifications</p>
          <p className="text-xs text-muted-foreground">
            Buzz this device even when Summit is closed
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {busy && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <Switch
            checked={on}
            onCheckedChange={handleToggle}
            disabled={busy || !supported}
            aria-label="Push notifications"
          />
        </div>
      </div>
      {!supported && (
        <p className="mt-2 text-xs text-muted-foreground">
          This browser does not support push notifications.
        </p>
      )}
      {supported && needsHomeScreen && !on && (
        <p className="mt-2 text-xs text-muted-foreground">
          On iPhone, push works once Summit is added to the home screen.
        </p>
      )}
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
