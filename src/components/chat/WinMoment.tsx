import { useEffect } from 'react';

interface WinMomentProps {
  open: boolean;
  firstName: string;
  signedCount: number | null;
  onDismiss: () => void;
}

/** One restrained full-screen moment when a rep signs their own lead. */
export function WinMoment({ open, firstName, signedCount, onDismiss }: WinMomentProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Signed ${firstName}`}
      onClick={onDismiss}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 px-6 text-center animate-in fade-in duration-200"
      style={{ background: 'radial-gradient(circle at 50% 40%, hsl(43 74% 20% / 0.95) 0%, hsl(222 47% 4% / 0.98) 60%)' }}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-300/70">Signed</p>
      <p className="text-4xl font-black tracking-tight text-amber-200 sm:text-5xl">{firstName}</p>
      {signedCount !== null && (
        <p className="text-sm text-amber-100/60">
          {signedCount} {signedCount === 1 ? 'sign' : 'signs'} this season
        </p>
      )}
      <button
        onClick={onDismiss}
        className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100/40"
      >
        Tap to close
      </button>
    </div>
  );
}
