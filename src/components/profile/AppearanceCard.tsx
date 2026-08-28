import { Sun } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppearance } from '@/hooks/useAppearance';
import type { AppearancePref } from '@/lib/appearance';

const OPTIONS: { key: AppearancePref; label: string }[] = [
  { key: 'dark', label: 'Dark' },
  { key: 'light', label: 'Light' },
  { key: 'system', label: 'System' },
];

/**
 * Pass 83 — Appearance. Reps knock in daylight, so Light is back. The choice is
 * saved on the profile so it follows them to any device.
 */
export function AppearanceCard() {
  const { preference, setPreference } = useAppearance();

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <h3 className="mb-1 flex items-center gap-2 font-semibold text-foreground">
        <Sun className="h-4 w-4 text-primary" />
        Appearance
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Light is easier to read on a doorstep in the sun. Life keeps its light look either way.
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Appearance"
      >
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            role="radio"
            aria-checked={preference === o.key}
            onClick={async () => {
              await setPreference(o.key);
              toast(`Appearance set to ${o.label.toLowerCase()}`);
            }}
            className={cn(
              'min-h-11 rounded-full border px-5 text-[14px]',
              preference === o.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AppearanceCard;
