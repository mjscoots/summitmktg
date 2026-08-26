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
  texture_opacity?: number;
}

/** HSL triplet -> hex, for the PWA theme-color meta tag. */
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
 * Applies the active workspace's theme as CSS variables on <html>.
 * Switching workspaces re-themes the app with no reload.
 */
export function WorkspaceThemeProvider({ children }: { children: ReactNode }) {
  const { active } = useWorkspace();
  const theme = ((active as unknown as { theme?: WorkspaceTheme } | null)?.theme || {}) as WorkspaceTheme;

  useEffect(() => {
    const root = document.documentElement;
    const set = (name: string, value?: string) => {
      if (value) root.style.setProperty(name, value);
      else root.style.removeProperty(name);
    };

    const light = theme.mode === 'light';
    root.classList.toggle('light-workspace', light);
    // Tells the role theme to keep its hands off colours a workspace owns.
    if (theme.accent) root.dataset.workspaceTheme = '1';
    else delete root.dataset.workspaceTheme;

    set('--background', theme.background);
    set('--card', theme.surface);
    set('--popover', theme.surface);
    set('--secondary', theme.surface);
    set('--muted', theme.surface);
    set('--input', theme.surface);
    set('--foreground', theme.foreground);
    set('--card-foreground', theme.foreground);
    set('--popover-foreground', theme.foreground);
    set('--secondary-foreground', theme.foreground);
    set('--muted-foreground', theme.muted);
    set('--surface', theme.surface);
    set('--surface-elevated', theme.surface);
    set('--surface-sunken', theme.background);
    set('--text-primary', theme.foreground);
    set('--text-secondary', theme.muted);
    set('--text-muted', theme.muted);
    // Sidebar chrome follows the workspace too.
    set('--sidebar-background', light ? theme.surface : theme.background);
    set('--sidebar-foreground', theme.foreground);
    set('--sidebar-primary', theme.accent);
    set('--sidebar-accent', light ? theme.background : theme.surface);
    set('--sidebar-accent-foreground', theme.foreground);
    set('--sidebar-border', theme.border);
    set('--sidebar-ring', theme.accent);
    set('--border', theme.border);
    set('--border-subtle', theme.border);
    set('--primary', theme.accent);
    set('--accent', theme.accent);
    set('--ring', theme.accent);
    set('--primary-foreground', theme.accent_foreground);
    set('--accent-foreground', theme.accent_foreground);
    set('--sidebar-primary-foreground', theme.accent_foreground);

    const texture = theme.texture === 'camo' ? CAMO : 'none';
    set('--workspace-texture', texture);
    set('--workspace-texture-opacity', String(theme.texture_opacity ?? 0));

    const meta = document.querySelector('meta[name="theme-color"]');
    const hex = theme.background ? hslToHex(theme.background) : null;
    if (meta && hex) meta.setAttribute('content', hex);

    return () => {
      root.classList.remove('light-workspace');
    };
  }, [
    theme.mode,
    theme.background,
    theme.surface,
    theme.foreground,
    theme.muted,
    theme.border,
    theme.accent,
    theme.texture,
    theme.texture_opacity,
    theme.accent_foreground,
  ]);

  return <>{children}</>;
}
