// Each team gets a unique color identity used across avatars, profiles, tree nodes, etc.
// All teams now use blue-spectrum tones to match the brand palette.

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
    bg: 'bg-sky-600',
    text: 'text-sky-400',
    bgTint: 'bg-sky-600/10',
    bgBadge: 'bg-sky-600/15',
    hsl: '199 89% 48%',
  },
  'minions': {
    bg: 'bg-blue-500',
    text: 'text-blue-400',
    bgTint: 'bg-blue-500/10',
    bgBadge: 'bg-blue-500/15',
    hsl: '217 91% 60%',
  },
  'legion mafia': {
    bg: 'bg-indigo-500',
    text: 'text-indigo-400',
    bgTint: 'bg-indigo-500/10',
    bgBadge: 'bg-indigo-500/15',
    hsl: '239 84% 67%',
  },
  'paper route': {
    bg: 'bg-blue-600',
    text: 'text-blue-300',
    bgTint: 'bg-blue-600/10',
    bgBadge: 'bg-blue-600/15',
    hsl: '216 89% 53%',
  },
  'apex': {
    bg: 'bg-cyan-600',
    text: 'text-cyan-400',
    bgTint: 'bg-cyan-600/10',
    bgBadge: 'bg-cyan-600/15',
    hsl: '188 78% 41%',
  },
  'atlas': {
    bg: 'bg-sky-500',
    text: 'text-sky-300',
    bgTint: 'bg-sky-500/10',
    bgBadge: 'bg-sky-500/15',
    hsl: '199 89% 48%',
  },
  'altitude': {
    bg: 'bg-blue-400',
    text: 'text-blue-300',
    bgTint: 'bg-blue-400/10',
    bgBadge: 'bg-blue-400/15',
    hsl: '213 94% 68%',
  },
};

const DEFAULT_COLOR: TeamColor = {
  bg: 'bg-slate-600',
  text: 'text-slate-400',
  bgTint: 'bg-slate-600/10',
  bgBadge: 'bg-slate-600/15',
  hsl: '215 20% 45%',
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
