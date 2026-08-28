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
      className="celebrate-wash fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 px-6 text-center animate-in fade-in duration-200"
    >
      <p className="text-[11px] font-black tracking-[0.3em]" style={{ color: 'hsl(var(--celebrate-warm))' }}>Signed</p>
      <p className="celebrate-text celebrate-in text-4xl font-black tracking-tight sm:text-5xl">{firstName}</p>
      {signedCount !== null && (
        <p className="text-sm text-foreground/70">
          {signedCount} {signedCount === 1 ? 'sign' : 'signs'} this season
        </p>
      )}
      <button
        onClick={onDismiss}
        className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
      >
        Tap to close
      </button>
    </div>
  );

}
