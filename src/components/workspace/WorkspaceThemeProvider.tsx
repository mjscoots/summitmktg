import { useEffect, type ReactNode } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface WorkspaceTheme {
  mode?: 'dark' | 'light';
  background?: string;
  surface?: string;
  foreground?: string;
  muted?: string;
  border?: string;
  accent?: string;
  accent_foreground?: string;
  texture?: 'none' | 'camo';
  headings?: 'serif';
  texture_opacity?: number;
}

/** HSL triplet -> hex, for the PWA theme-color meta tag and the wordmark knockout. */
function hslToHex(triplet: string): string | null {
  const parts = triplet.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  if ([h, s, l].some((n) => Number.isNaN(n))) return null;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(h / 60) % 6;
  const rgb = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][seg].map((v) => Math.round((v + m) * 255));
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
}

const CAMO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M20 30c30-18 52 8 78 2s44-22 66-6-4 40-26 44-40-6-56 8-40 12-52-4-10-34-10-44z'/%3E%3Cpath d='M120 140c26-14 48 6 66 0s26 22 6 34-58 6-74-2-24-24 2-32z'/%3E%3Cpath d='M0 150c22-10 40 10 34 26S6 196 0 184z'/%3E%3C/g%3E%3C/svg%3E\")";

/**
 * Pass 72 — the ice system. One coordinated palette, defined here so the three
 * products read as one organisation. A workspace owns its identity accent
 * (wordmark, active tab, hero art, switcher chip, focus ring); everything else
 * — buttons, links, progress — uses the brand ice on the dark workspaces.
 */
type Palette = {
  mode: 'dark' | 'light';
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSunken: string;
  foreground: string;
  secondaryText: string;
  muted: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  /** Buttons, links, progress. */
  primary: string;
  primaryDeep: string;
  primaryForeground: string;
  /** Identity accent for the five workspace-owned spots. */
  workspaceAccent: string;
  wordmark: { bg: string; accent: string; letters: string };
  heroGradient: string;
};

const ICE = '197 100% 68%';
const ICE_DEEP = '215 100% 56%';

const PALETTES: Record<'pest' | 'fiber' | 'life', Palette> = {
  pest: {
    mode: 'dark',
    background: '221 66% 11%',
    surface: '220 58% 15%',
    surfaceElevated: '220 55% 20%',
    surfaceSunken: '221 62% 9%',
    foreground: '217 100% 96%',
    secondaryText: '221 48% 81%',
    muted: '220 33% 62%',
    border: '219 47% 25%',
    borderSubtle: '219 47% 20%',
    borderStrong: '218 45% 33%',
    primary: ICE,
    primaryDeep: ICE_DEEP,
    primaryForeground: '221 66% 11%',
    workspaceAccent: ICE,
    wordmark: { bg: '#0A1630', accent: '#5AD1FF', letters: '#FFFFFF' },
    heroGradient: 'linear-gradient(160deg, hsl(220 58% 15%) 0%, hsl(221 66% 11%) 60%, hsl(215 60% 14%) 100%)',
  },
  fiber: {
    mode: 'dark',
    background: '168 41% 7%',
    surface: '163 40% 10%',
    surfaceElevated: '161 39% 14%',
    surfaceSunken: '168 45% 5%',
    foreground: '150 10% 96%',
    secondaryText: '155 20% 82%',
    muted: '155 14% 66%',
    border: '157 37% 19%',
    borderSubtle: '157 34% 15%',
    borderStrong: '157 35% 28%',
    primary: ICE,
    primaryDeep: ICE_DEEP,
    primaryForeground: '168 41% 7%',
    workspaceAccent: '154 69% 55%',
    wordmark: { bg: '#0B1A17', accent: '#3DDC97', letters: '#FFFFFF' },
    heroGradient: 'linear-gradient(160deg, hsl(163 40% 10%) 0%, hsl(168 41% 7%) 60%, hsl(160 45% 11%) 100%)',
  },
  life: {
    mode: 'light',
    background: '43 30% 95%',
    surface: '0 0% 100%',
    surfaceElevated: '43 24% 97%',
    surfaceSunken: '43 26% 92%',
    foreground: '221 51% 16%',
    secondaryText: '221 24% 34%',
    muted: '35 8% 38%',
    border: '38 15% 87%',
    borderSubtle: '38 15% 91%',
    borderStrong: '38 14% 78%',
    primary: '177 50% 33%',
    primaryDeep: '177 52% 26%',
    primaryForeground: '0 0% 100%',
    workspaceAccent: '177 50% 33%',
    wordmark: { bg: '#F7F5F0', accent: '#2A7F7B', letters: '#14213D' },
    heroGradient: 'linear-gradient(160deg, hsl(0 0% 100%) 0%, hsl(43 30% 95%) 100%)',
  },
};

/**
 * Applies the active workspace's theme as CSS variables on <html>.
 * Switching workspaces re-themes the app with no reload.
 */
export function WorkspaceThemeProvider({ children }: { children: ReactNode }) {
  const { active } = useWorkspace();
  const theme = ((active as unknown as { theme?: WorkspaceTheme } | null)?.theme || {}) as WorkspaceTheme;
  const vertical = (active?.vertical || 'Pest').toLowerCase();

  useEffect(() => {
    const root = document.documentElement;
    const set = (name: string, value?: string) => {
      if (value) root.style.setProperty(name, value);
      else root.style.removeProperty(name);
    };

    const key = (vertical === 'fiber' || vertical === 'life' ? vertical : 'pest') as keyof typeof PALETTES;
    const p = PALETTES[key];

    // Lets workspace-scoped CSS target the active product.
    root.dataset.workspace = key;

    const light = p.mode === 'light';
    root.classList.toggle('light-workspace', light);
    // Tells the role theme to keep its hands off colours a workspace owns.
    root.dataset.workspaceTheme = '1';

    set('--background', p.background);
    set('--card', p.surface);
    set('--popover', p.surface);
    set('--secondary', p.surfaceElevated);
    set('--muted', p.surfaceElevated);
    set('--input', p.surface);
    set('--foreground', p.foreground);
    set('--card-foreground', p.foreground);
    set('--popover-foreground', p.foreground);
    set('--secondary-foreground', p.foreground);
    set('--muted-foreground', p.muted);
    set('--surface', p.surface);
    set('--surface-elevated', p.surfaceElevated);
    set('--surface-sunken', p.surfaceSunken);
    set('--text-primary', p.foreground);
    set('--text-secondary', p.secondaryText);
    set('--text-muted', p.muted);
    set('--border', p.border);
    set('--border-subtle', p.borderSubtle);
    set('--border-strong', p.borderStrong);

    // Sidebar chrome follows the workspace.
    set('--sidebar-background', light ? p.surface : p.background);
    set('--sidebar-foreground', p.secondaryText);
    set('--sidebar-primary', p.primary);
    set('--sidebar-primary-foreground', p.primaryForeground);
    set('--sidebar-accent', light ? p.background : p.surfaceElevated);
    set('--sidebar-accent-foreground', p.foreground);
    set('--sidebar-border', p.borderSubtle);
    set('--sidebar-ring', p.workspaceAccent);

    // Actions and links: brand ice on the dark products, teal inside Life.
    set('--primary', p.primary);
    set('--accent', p.primary);
    set('--primary-deep', p.primaryDeep);
    set('--primary-foreground', p.primaryForeground);
    set('--accent-foreground', p.primaryForeground);
    // Identity accent: focus ring, active tab, wordmark, hero, switcher chip.
    set('--ring', p.workspaceAccent);
    set('--workspace-accent', p.workspaceAccent);
    set('--gradient-ice', `linear-gradient(135deg, hsl(${p.primary}), hsl(${p.primaryDeep}))`);
    set('--gradient-hero', p.heroGradient);

    set('--wordmark-bg', p.wordmark.bg);
    set('--wordmark-accent', p.wordmark.accent);
    set('--wordmark-letters', p.wordmark.letters);

    const texture = theme.texture === 'camo' ? CAMO : 'none';
    set('--workspace-texture', texture);
    set('--workspace-texture-opacity', String(theme.texture_opacity ?? 0));

    // A workspace may ask for serif headings; body type never changes.
    if (theme.headings === 'serif') root.dataset.workspaceHeadings = 'serif';
    else delete root.dataset.workspaceHeadings;

    const meta = document.querySelector('meta[name="theme-color"]');
    const hex = hslToHex(p.background);
    if (meta && hex) meta.setAttribute('content', hex);

    return () => {
      root.classList.remove('light-workspace');
      root.style.removeProperty('--wordmark-bg');
      root.style.removeProperty('--wordmark-accent');
      root.style.removeProperty('--wordmark-letters');
      delete root.dataset.workspace;
      delete root.dataset.workspaceHeadings;
    };
  }, [vertical, theme.texture, theme.texture_opacity, theme.headings]);

  return <>{children}</>;
}
