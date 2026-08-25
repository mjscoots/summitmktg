import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { SW_UPDATE_EVENT, applyServiceWorkerUpdate } from '@/lib/registerSW';

/** Plain "new version available" bar. Shown only when a newer build is waiting. */
export function UpdatePrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onUpdate = () => setVisible(true);
    window.addEventListener(SW_UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(SW_UPDATE_EVENT, onUpdate);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-card/95 px-4 py-3 shadow-xl backdrop-blur-sm">
        <p className="text-sm text-foreground">New version available</p>
        <button
          type="button"
          onClick={applyServiceWorkerUpdate}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          Reload
        </button>
      </div>
    </div>
  );
}
