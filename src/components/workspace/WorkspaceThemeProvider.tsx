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

/**
 * Pass 76 - Mono. One near-black palette across the three products. A
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
  background: '30 9% 4%',
  surface: '30 11% 7%',
  surfaceElevated: '30 12% 10%',
  surfaceSunken: '30 10% 3%',
  foreground: '39 39% 93%',
  secondaryText: '37 13% 66%',
  muted: '33 8% 50%',
  border: '30 11% 15%',
  borderSubtle: '30 11% 15%',
  borderStrong: '30 9% 21%',
  primary: '15 88% 59%',
  primaryDeep: '15 88% 59%',
  primaryForeground: '30 9% 4%',
};

const PALETTES: Record<'pest' | 'fiber' | 'life', Palette> = {
  pest: {
    ...MONO_DARK,
    workspaceAccent: '15 88% 59%',
    wordmark: { bg: '#0C0B0A', accent: '#F2673A', outline: '#F4EFE6', letters: '#F4EFE6' },
    texture: 'none',
    textureSize: 'auto',
  },
  fiber: {
    ...MONO_DARK,
    workspaceAccent: '15 88% 59%',
    wordmark: { bg: '#0C0B0A', accent: '#F2673A', outline: '#F4EFE6', letters: '#F4EFE6' },
    texture: 'none',
    textureSize: 'auto',
  },
  life: {
    mode: 'light',
    background: '38 41% 95%',
    surface: '36 32% 91%',
    surfaceElevated: '38 41% 95%',
    surfaceSunken: '36 32% 91%',
    foreground: '30 9% 4%',
    secondaryText: '34 8% 33%',
    muted: '33 9% 40%',
    border: '37 24% 85%',
    borderSubtle: '37 24% 85%',
    borderStrong: '37 24% 80%',
    primary: '30 9% 4%',
    primaryDeep: '30 9% 4%',
    primaryForeground: '38 41% 95%',
    workspaceAccent: '17 82% 38%',
    wordmark: { bg: '#FFFFFF', accent: '#B23E12', outline: '#FFFFFF', letters: '#0C0B0A' },
    texture: 'none',
    textureSize: 'auto',
  },
};

/** Pass 83 - the Light palette. Same token names, daylight values. */
const MONO_LIGHT = {
  mode: 'light' as const,
  background: '38 41% 95%',
  surface: '38 41% 95%',
  surfaceElevated: '38 41% 95%',
  surfaceSunken: '36 32% 91%',
  foreground: '30 9% 4%',
  secondaryText: '34 8% 33%',
  muted: '33 9% 40%',
  border: '37 24% 85%',
  borderSubtle: '37 24% 85%',
  borderStrong: '37 24% 80%',
  primary: '30 9% 4%',
  primaryDeep: '30 9% 4%',
  primaryForeground: '38 41% 95%',
};

/** The light-appearance twin of a dark workspace palette. */
function lightVariant(p: Palette): Palette {
  return {
    ...p,
    ...MONO_LIGHT,
    wordmark: { ...p.wordmark, bg: '#FFFFFF', outline: '#0C0B0A', letters: '#0C0B0A' },
    texture: 'none',
  };
}

/** The dark-appearance twin of a light workspace palette. */
function darkVariant(p: Palette): Palette {
  return {
    ...p,
    ...MONO_DARK,
    wordmark: { ...p.wordmark, bg: '#0C0B0A', outline: '#F4EFE6', letters: '#F4EFE6' },
    texture: 'none',
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
    // Mono resolves these compatibility tokens to flat colors.
    set('--gradient-ice', `hsl(${p.primary})`);
    set('--gradient-hero', `hsl(${p.surface})`);
    set('--gradient-primary', `hsl(${p.primary})`);
    set('--glow-ice', 'none');

    set('--wordmark-bg', p.wordmark.bg);
    set('--wordmark-accent', p.wordmark.accent);
    set('--wordmark-outline', p.wordmark.outline);
    set('--wordmark-letters', p.wordmark.letters);

    // The range behind the hero: far to near, dissolving into the page.
    const range = light
      ? ['#DCE4F2', '#E2E9F4', '#E8EDF6', '#EEF1F7', '#F3F5F8']
      : ['#16233D', '#121D33', '#0E1729', '#0B1220', '#080D17'];
    range.forEach((c, i) => set(`--range-${i + 1}`, c));

    set('--workspace-texture', p.texture);
    set('--workspace-texture-size', p.textureSize);
    set('--workspace-texture-opacity', '0');

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
