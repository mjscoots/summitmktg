import { cn } from '@/lib/utils';

export type InsigniaRole = 'rookie' | 'vet' | 'manager' | 'admin' | 'owner';

interface RankInsigniaProps {
  role?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

const GOLD = '#D4AF37';

function normalizeRole(role?: string | null): InsigniaRole | null {
  if (!role) return null;
  const r = role.toLowerCase();
  if (r === 'owner') return 'owner';
  if (r === 'admin') return 'admin';
  if (r === 'manager') return 'manager';
  if (r === 'vet' || r === 'veteran') return 'vet';
  if (r === 'rookie') return 'rookie';
  return null;
}

/**
 * Minimal gold-line SVG rank insignia — thin 1.5px strokes, currentColor.
 * Distinguishes rookie / vet / manager / admin (owner reuses admin's mark with a crown).
 */
export function RankInsignia({ role, size = 'sm', className }: RankInsigniaProps) {
  const normalized = normalizeRole(role);
  if (!normalized) return null;

  const dim = size === 'md' ? 16 : 12;
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  const commonProps = {
    width: dim,
    height: dim,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: GOLD,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const marks: Record<InsigniaRole, JSX.Element> = {
    // Rookie — single chevron
    rookie: (
      <svg {...commonProps}>
        <path d="M6 14 L12 8 L18 14" />
      </svg>
    ),
    // Vet — double chevron
    vet: (
      <svg {...commonProps}>
        <path d="M6 10 L12 5 L18 10" />
        <path d="M6 16 L12 11 L18 16" />
      </svg>
    ),
    // Manager — chevron with underline bar
    manager: (
      <svg {...commonProps}>
        <path d="M6 12 L12 7 L18 12" />
        <path d="M7 17 L17 17" />
      </svg>
    ),
    // Admin — diamond outline
    admin: (
      <svg {...commonProps}>
        <path d="M12 4 L19 12 L12 20 L5 12 Z" />
      </svg>
    ),
    // Owner — diamond with crown tick
    owner: (
      <svg {...commonProps}>
        <path d="M12 6 L18 12 L12 18 L6 12 Z" />
        <path d="M9 6 L12 3 L15 6" />
      </svg>
    ),
  };

  return (
    <span
      role="img"
      aria-label={`${label} rank insignia`}
      title={label}
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
    >
      {marks[normalized]}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Pass 140 — the seven real ranks. One geometric mark each, drawn in the
   workspace accent. A person with no rank gets no mark and no placeholder.
   ───────────────────────────────────────────────────────────── */

/** Position of a rank name inside the seven-rank ladder, or null. */
export function rankStep(rankName?: string | null): number | null {
  if (!rankName) return null;
  const name = rankName.toLowerCase();
  if (name.startsWith('tier 1')) return 1;
  if (name.startsWith('tier 2')) return 2;
  if (name.startsWith('tier 3')) return 3;
  if (name.startsWith('tier 4')) return 4;
  if (name.startsWith('team lead')) return 5;
  if (name.startsWith('manager')) return 6;
  if (name.startsWith('org stack')) return 7;
  return null;
}

/** The short label a rep reads on a tap, taken from the rank name itself. */
export function rankShortLabel(rankName: string): string {
  return rankName.split('·')[0].trim() || rankName;
}

const STEP_MARKS: Record<number, JSX.Element> = {
  // Tiers 1 to 4 count bars.
  1: <path d="M5 17 L19 17" />,
  2: (
    <>
      <path d="M5 18 L19 18" />
      <path d="M5 13 L19 13" />
    </>
  ),
  3: (
    <>
      <path d="M5 19 L19 19" />
      <path d="M5 14 L19 14" />
      <path d="M5 9 L19 9" />
    </>
  ),
  4: (
    <>
      <path d="M5 20 L19 20" />
      <path d="M5 15.5 L19 15.5" />
      <path d="M5 11 L19 11" />
      <path d="M5 6.5 L19 6.5" />
    </>
  ),
  // Leadership ranks step up to chevrons, then a framed chevron.
  5: <path d="M5 16 L12 8 L19 16" />,
  6: (
    <>
      <path d="M5 12 L12 5 L19 12" />
      <path d="M5 19 L12 12 L19 19" />
    </>
  ),
  7: (
    <>
      <path d="M12 4 L20 12 L12 20 L4 12 Z" />
      <path d="M8.5 13 L12 9.5 L15.5 13" />
    </>
  ),
};

/**
 * Renders the mark for a real rank name. Returns nothing when the person has no
 * rank or the name is not one of the seven ladder ranks.
 */
export function RankMark({
  rankName,
  size = 'sm',
  className,
}: {
  rankName?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const step = rankStep(rankName);
  if (!step || !rankName) return null;

  const dim = size === 'md' ? 16 : 13;
  const label = rankShortLabel(rankName);

  return (
    <span
      role="img"
      aria-label={`Rank ${label}`}
      title={label}
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill="none"
        stroke="hsl(var(--workspace-accent))"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {STEP_MARKS[step]}
      </svg>
    </span>
  );
}
