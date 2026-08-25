import { useEffect, useState } from 'react';
import { Smartphone, Share, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'summit_install_hint_dismissed';

export function InstallAppHint() {
  const [dismissed, setDismissed] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  useEffect(() => {
    if (isStandalone) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    setDismissed(false);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isStandalone]);

  if (dismissed || isStandalone) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="relative rounded-2xl border border-white/[0.06] bg-card/60 p-4 backdrop-blur-sm sm:p-5">
      <button
        onClick={dismiss}
        aria-label="Dismiss install hint"
        className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground">
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Add Summit to your home screen</h3>
          {isIOS ? (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              In Safari, tap <Share className="inline h-3.5 w-3.5" /> Share, then
              <span className="text-foreground">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Install it for full-screen access and faster launches.
            </p>
          )}

          {!isIOS && deferredPrompt && (
            <Button
              size="sm"
              className="mt-3 gap-2"
              onClick={async () => {
                deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                setDeferredPrompt(null);
                dismiss();
              }}>
              <Download className="h-4 w-4" />
              Install
            </Button>
          )}
          {!isIOS && !deferredPrompt && (
            <p className="mt-1 text-xs text-muted-foreground">
              In Chrome, open the menu and choose Install app / Add to Home screen.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
