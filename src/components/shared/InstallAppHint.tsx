import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const DISMISS_KEY = 'summit_install_hint_dismissed';

/**
 * Pass 140 — one quiet line for phone browsers where Summit is not installed
 * yet. Dismissible, and the dismissal is remembered on that device.
 */
export function InstallAppHint() {
  const [dismissed, setDismissed] = useState(true);

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    const isPhone =
      window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(max-width: 1023px)').matches;
    if (!isPhone) return;
    setDismissed(false);
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
      <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">
        Add Summit to your home screen.{' '}
        <span className="text-foreground">
          {isIOS ? 'Tap Share, then Add to Home Screen.' : 'Open the browser menu, then Install app.'}
        </span>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install hint"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
