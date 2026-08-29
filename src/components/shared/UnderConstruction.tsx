/**
 * One quiet card for any surface whose data source has never been loaded.
 * Honest by design: no fake zeros, no not-set rows, no empty shells.
 */
export function UnderConstruction({ className }: { className?: string }) {
  return (
    <div
      className={
        'rounded-2xl border border-border/60 bg-card/50 px-5 py-6 text-center ' + (className ?? '')
      }
    >
      <p className="text-sm text-muted-foreground">This page is still being built</p>
    </div>
  );
}

export default UnderConstruction;
