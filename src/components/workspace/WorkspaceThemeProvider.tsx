import { useEffect, type ReactNode } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAppearance } from '@/hooks/useAppearance';

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

/** Pest — dotted grid at 6% white, 22px spacing. */
const DOTS =
  'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)';
/** Pest, light appearance — the same dotted grid at 5% black. */
const DOTS_LIGHT = 'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)';
/** Fiber — fine line grid at 4% white, 44px cells. */
const LINES =
  'linear-gradient(to right, rgba(61,220,151,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(61,220,151,0.08) 1px, transparent 1px)';
/** Fiber, light appearance — the same grid at 5% black. */
const LINES_LIGHT =
  'linear-gradient(to right, rgba(16,140,95,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,140,95,0.10) 1px, transparent 1px)';
/** Life — soft paper grain at 3% on the light surface. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23g)' opacity='0.03'/%3E%3C/svg%3E\")";


/**
 * Pass 76 — Mono. One near-black palette across the three products. A
 * workspace owns its identity accent (wordmark trinity, active tab, progress,
 * hero art) and its signature texture; everything else is white, near-black
 * and one hairline border.
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
  /** Buttons: white on the dark products, near-black label. */
  primary: string;
  primaryDeep: string;
  primaryForeground: string;
  /** Identity accent for the workspace-owned spots. */
  workspaceAccent: string;
  wordmark: { bg: string; accent: string; outline: string; letters: string };
  texture: string;
  textureSize: string;
};

const MONO_DARK = {
  mode: 'dark' as const,
  background: '220 22% 6%',
  surface: '220 21% 9%',
  surfaceElevated: '221 21% 13%',
  surfaceSunken: '220 24% 4%',
  foreground: '213 20% 97%',
  secondaryText: '218 15% 75%',
  muted: '217 10% 54%',
  border: '220 18% 18%',
  borderSubtle: '220 18% 18%',
  borderStrong: '220 17% 24%',
  primary: '213 20% 97%',
  primaryDeep: '213 20% 97%',
  primaryForeground: '220 22% 6%',
};

const PALETTES: Record<'pest' | 'fiber' | 'life', Palette> = {
  pest: {
    ...MONO_DARK,
    workspaceAccent: '193 100% 55%',
    wordmark: { bg: '#0B0D12', accent: '#5AD1FF', outline: '#FFFFFF', letters: '#FFFFFF' },
    texture: DOTS,
    textureSize: '22px 22px',
  },
  fiber: {
    ...MONO_DARK,
    workspaceAccent: '155 90% 48%',
    wordmark: { bg: '#0B0D12', accent: '#3DDC97', outline: '#FFFFFF', letters: '#FFFFFF' },
    texture: LINES,
    textureSize: '28px 28px',
  },
  life: {
    mode: 'light',
    background: '0 0% 100%',
    surface: '220 12% 97%',
    surfaceElevated: '0 0% 100%',
    surfaceSunken: '220 12% 95%',
    foreground: '220 22% 6%',
    secondaryText: '220 10% 32%',
    muted: '220 8% 45%',
    border: '220 12% 88%',
    borderSubtle: '220 12% 91%',
    borderStrong: '220 10% 78%',
    primary: '220 22% 6%',
    primaryDeep: '220 22% 6%',
    primaryForeground: '0 0% 100%',
    workspaceAccent: '256 88% 58%',
    wordmark: { bg: '#FFFFFF', accent: '#6B3BF5', outline: '#FFFFFF', letters: '#0B0D12' },
    texture: GRAIN,
    textureSize: '120px 120px',
  },
};

/** Pass 83 — the Light palette. Same token names, daylight values. */
const MONO_LIGHT = {
  mode: 'light' as const,
  background: '220 20% 97%',
  surface: '0 0% 100%',
  surfaceElevated: '0 0% 100%',
  surfaceSunken: '220 20% 95%',
  foreground: '220 22% 6%',
  secondaryText: '219 13% 34%',
  muted: '218 11% 54%',
  border: '218 15% 91%',
  borderSubtle: '218 15% 91%',
  borderStrong: '216 15% 82%',
  primary: '220 22% 6%',
  primaryDeep: '220 22% 6%',
  primaryForeground: '0 0% 100%',
};

/** The light-appearance twin of a dark workspace palette. */
function lightVariant(p: Palette): Palette {
  return {
    ...p,
    ...MONO_LIGHT,
    wordmark: { ...p.wordmark, bg: '#FFFFFF', outline: '#0B0D12', letters: '#0B0D12' },
    texture: p.texture === LINES ? LINES_LIGHT : DOTS_LIGHT,
  };
}

/** The dark-appearance twin of a light workspace palette. */
function darkVariant(p: Palette): Palette {
  return {
    ...p,
    ...MONO_DARK,
    wordmark: { ...p.wordmark, bg: '#0B0D12', outline: '#FFFFFF', letters: '#FFFFFF' },
    texture: p.texture === GRAIN ? DOTS : p.texture,
  };
}



/**
 * Applies the active workspace's theme as CSS variables on <html>.
 * Switching workspaces re-themes the app with no reload.
 */
export function WorkspaceThemeProvider({ children }: { children: ReactNode }) {
  const { active } = useWorkspace();
  const { mode: appearance } = useAppearance();
  const theme = ((active as unknown as { theme?: WorkspaceTheme } | null)?.theme || {}) as WorkspaceTheme;
  const vertical = (active?.vertical || 'Pest').toLowerCase();

  useEffect(() => {
    const root = document.documentElement;
    const set = (name: string, value?: string) => {
      if (value) root.style.setProperty(name, value);
      else root.style.removeProperty(name);
    };

    const key = (vertical === 'fiber' || vertical === 'life' ? vertical : 'pest') as keyof typeof PALETTES;
    // Every workspace follows the resolved appearance, which follows the phone
    // by default. The workspace keeps its identity accent and texture.
    const base = PALETTES[key];
    const p =
      appearance === 'light'
        ? base.mode === 'light'
          ? base
          : lightVariant(base)
        : base.mode === 'dark'
          ? base
          : darkVariant(base);


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

    // Actions: white on the dark products, near-black inside Life.
    set('--primary', p.primary);
    set('--accent', p.primary);
    set('--primary-deep', p.primaryDeep);
    set('--primary-foreground', p.primaryForeground);
    set('--accent-foreground', p.primaryForeground);
    // Identity accent: focus ring, active tab, wordmark, progress.
    set('--ring', p.workspaceAccent);
    set('--workspace-accent', p.workspaceAccent);
    // Mono has no gradient and no glow.
    set('--gradient-ice', `hsl(${p.primary})`);
    set('--gradient-hero', `hsl(${p.surface})`);
    set('--gradient-primary', `hsl(${p.primary})`);
    set('--glow-ice', 'none');

    set('--wordmark-bg', p.wordmark.bg);
    set('--wordmark-accent', p.wordmark.accent);
    set('--wordmark-outline', p.wordmark.outline);
    set('--wordmark-letters', p.wordmark.letters);

    set('--workspace-texture', p.texture);
    set('--workspace-texture-size', p.textureSize);
    set('--workspace-texture-opacity', '1');

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
      root.style.removeProperty('--wordmark-outline');
      root.style.removeProperty('--wordmark-letters');
      delete root.dataset.workspace;
      delete root.dataset.workspaceHeadings;
    };
  }, [vertical, theme.headings, appearance]);


  return <>{children}</>;
}
