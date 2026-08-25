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
