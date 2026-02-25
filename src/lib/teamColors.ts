// Each team gets a unique color identity used across avatars, profiles, tree nodes, etc.

export interface TeamColor {
  /** Tailwind bg class for avatar fallback */
  bg: string;
  /** Tailwind text class */
  text: string;
  /** Tailwind bg/10 tint for badges/cards */
  bgTint: string;
  /** Tailwind bg/15 for badges */
  bgBadge: string;
  /** HSL string for inline styles (without hsl() wrapper) */
  hsl: string;
}

const TEAM_COLORS: Record<string, TeamColor> = {
  'quality control': {
    bg: 'bg-cyan-500',
    text: 'text-cyan-400',
    bgTint: 'bg-cyan-500/10',
    bgBadge: 'bg-cyan-500/15',
    hsl: '188 95% 43%',
  },
  'minions': {
    bg: 'bg-amber-500',
    text: 'text-amber-400',
    bgTint: 'bg-amber-500/10',
    bgBadge: 'bg-amber-500/15',
    hsl: '38 92% 50%',
  },
  'legion mafia': {
    bg: 'bg-red-500',
    text: 'text-red-400',
    bgTint: 'bg-red-500/10',
    bgBadge: 'bg-red-500/15',
    hsl: '0 84% 60%',
  },
  'paper route': {
    bg: 'bg-violet-500',
    text: 'text-violet-400',
    bgTint: 'bg-violet-500/10',
    bgBadge: 'bg-violet-500/15',
    hsl: '258 90% 66%',
  },
  'apex': {
    bg: 'bg-orange-500',
    text: 'text-orange-400',
    bgTint: 'bg-orange-500/10',
    bgBadge: 'bg-orange-500/15',
    hsl: '25 95% 53%',
  },
  'atlas': {
    bg: 'bg-emerald-500',
    text: 'text-emerald-400',
    bgTint: 'bg-emerald-500/10',
    bgBadge: 'bg-emerald-500/15',
    hsl: '160 84% 39%',
  },
  'altitude': {
    bg: 'bg-pink-500',
    text: 'text-pink-400',
    bgTint: 'bg-pink-500/10',
    bgBadge: 'bg-pink-500/15',
    hsl: '330 81% 60%',
  },
};

const DEFAULT_COLOR: TeamColor = {
  bg: 'bg-slate-500',
  text: 'text-slate-400',
  bgTint: 'bg-slate-500/10',
  bgBadge: 'bg-slate-500/15',
  hsl: '215 16% 47%',
};

export function getTeamColor(teamName?: string | null): TeamColor {
  if (!teamName) return DEFAULT_COLOR;
  return TEAM_COLORS[teamName.toLowerCase().trim()] ?? DEFAULT_COLOR;
}

export function getTeamColorBySlug(slug?: string | null): TeamColor {
  if (!slug) return DEFAULT_COLOR;
  const key = slug.toLowerCase().replace(/-/g, ' ').trim();
  return TEAM_COLORS[key] ?? DEFAULT_COLOR;
}
