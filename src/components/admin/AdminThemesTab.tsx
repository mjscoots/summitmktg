import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { WorkspaceTheme } from '@/components/workspace/WorkspaceThemeProvider';

interface Row {
  vertical: string;
  name: string;
  theme: WorkspaceTheme;
}

const ROLES: { key: keyof WorkspaceTheme; label: string }[] = [
  { key: 'background', label: 'Background' },
  { key: 'surface', label: 'Cards' },
  { key: 'foreground', label: 'Text' },
  { key: 'muted', label: 'Secondary text' },
  { key: 'border', label: 'Borders' },
  { key: 'accent', label: 'Accent' },
];

function hslToRgb(triplet: string): [number, number, number] {
  const [hs, ss, ls] = triplet.trim().split(/\s+/);
  const h = parseFloat(hs) || 0;
  const s = (parseFloat(ss) || 0) / 100;
  const l = (parseFloat(ls) || 0) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(h / 60) % 6;
  const base = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][seg];
  return base.map((v) => Math.round((v + m) * 255)) as [number, number, number];
}

function toHex(triplet: string): string {
  const rgb = hslToRgb(triplet || '0 0% 0%');
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function hexToHsl(hex: string): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function luminance(triplet: string): number {
  const [r, g, b] = hslToRgb(triplet).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Seeded defaults, so each workspace can be put back the way it shipped. */
const DEFAULTS: Record<string, WorkspaceTheme> = {
  pest: { mode: 'dark', background: '216 60% 5%', surface: '218 46% 10%', foreground: '0 0% 98%', muted: '215 20% 65%', border: '217 44% 15%', accent: '217 90% 53%', texture: 'none', texture_opacity: 0 },
  fiber: { mode: 'dark', background: '150 30% 5%', surface: '152 24% 10%', foreground: '80 12% 96%', muted: '110 12% 68%', border: '145 18% 18%', accent: '152 55% 42%', texture: 'camo', texture_opacity: 0.05 },
  life: { mode: 'light', background: '0 0% 100%', surface: '40 12% 97%', foreground: '220 20% 12%', muted: '220 10% 40%', border: '40 10% 88%', accent: '220 65% 45%', texture: 'none', texture_opacity: 0 },
};

/** Workspace themes. Owners and admins edit any workspace; a president edits their own. */
export function AdminThemesTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('verticals')
      .select('vertical, name, theme')
      .order('display_order')
      .then(({ data, error }) => {
        if (error) toast.error('Could not load workspaces');
        setRows(((data as unknown as Row[]) || []).map((r) => ({ ...r, theme: r.theme || {} })));
        setLoading(false);
      });
  }, []);

  const update = (vertical: string, patch: Partial<WorkspaceTheme>) => {
    setRows((prev) => prev.map((r) => (r.vertical === vertical ? { ...r, theme: { ...r.theme, ...patch } } : r)));
  };

  const save = async (row: Row) => {
    setSaving(row.vertical);
    const { error } = await (supabase.rpc as never as (n: string, a: unknown) => Promise<{ error: unknown }>)(
      'set_vertical_theme',
      { _vertical: row.vertical, _theme: row.theme }
    );
    setSaving(null);
    if (error) {
      toast.error('Could not save this theme');
      return;
    }
    toast.success(`${row.name} theme saved`);
  };

  const reset = (vertical: string) => {
    const base = DEFAULTS[vertical];
    if (!base) {
      toast.error('No default is defined for this workspace');
      return;
    }
    setRows((prev) => prev.map((r) => (r.vertical === vertical ? { ...r, theme: { ...base } } : r)));
  };

  const checks = useMemo(
    () =>
      rows.map((r) => {
        const bg = r.theme.background || '0 0% 0%';
        const text = contrast(r.theme.foreground || '0 0% 100%', bg);
        const muted = contrast(r.theme.muted || '0 0% 60%', bg);
        const accent = contrast(r.theme.accent || '0 0% 50%', bg);
        return { vertical: r.vertical, text, muted, accent };
      }),
    [rows]
  );

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        Each workspace has its own colours. Changes apply the next time a member loads the workspace.
      </p>

      {rows.map((row) => {
        const check = checks.find((c) => c.vertical === row.vertical);
        const fail = check ? check.text < 4.5 || check.muted < 4.5 || check.accent < 3 : false;
        return (
          <section key={row.vertical} className="rounded-[var(--radius)] border border-border/60 bg-card/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">{row.name}</h3>
              <select
                value={row.theme.mode || 'dark'}
                onChange={(e) => update(row.vertical, { mode: e.target.value as 'dark' | 'light' })}
                className="min-h-11 rounded-lg border border-border/60 bg-background px-2 text-[13px] text-foreground"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ROLES.map((role) => (
                <label key={role.key} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <input
                    type="color"
                    value={toHex((row.theme[role.key] as string) || '0 0% 0%')}
                    onChange={(e) => update(row.vertical, { [role.key]: hexToHsl(e.target.value) })}
                    className="h-9 w-9 shrink-0 rounded-md border border-border/60 bg-transparent"
                    aria-label={`${row.name} ${role.label}`}
                  />
                  {role.label}
                </label>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                Texture
                <select
                  value={row.theme.texture || 'none'}
                  onChange={(e) => update(row.vertical, { texture: e.target.value as 'none' | 'camo' })}
                  className="min-h-11 rounded-lg border border-border/60 bg-background px-2 text-[13px] text-foreground"
                >
                  <option value="none">None</option>
                  <option value="camo">Camo</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                Texture strength
                <input
                  type="number"
                  min={0}
                  max={0.12}
                  step={0.01}
                  value={row.theme.texture_opacity ?? 0}
                  onChange={(e) => update(row.vertical, { texture_opacity: Number(e.target.value) })}
                  className="min-h-11 w-20 rounded-lg border border-border/60 bg-background px-2 text-[16px] text-foreground"
                />
              </label>
            </div>

            <div className="mt-3 rounded-lg border border-border/50 p-3" style={{ background: `hsl(${row.theme.background})` }}>
              <div
                className="rounded-md p-3"
                style={{ background: `hsl(${row.theme.surface})`, border: `1px solid hsl(${row.theme.border})` }}
              >
                <p className="text-[13px] font-semibold" style={{ color: `hsl(${row.theme.foreground})` }}>
                  {row.name} preview
                </p>
                <p className="text-[12px]" style={{ color: `hsl(${row.theme.muted})` }}>
                  Secondary text
                </p>
                <span
                  className="mt-2 inline-block rounded px-2 py-1 text-[12px] font-semibold"
                  style={{ background: `hsl(${row.theme.accent})`, color: '#fff' }}
                >
                  Accent
                </span>
              </div>
            </div>

            {check && (
              <p className={`mt-2 text-[12px] ${fail ? 'text-destructive' : 'text-muted-foreground'}`}>
                Contrast - text {check.text.toFixed(1)}:1, secondary {check.muted.toFixed(1)}:1, accent{' '}
                {check.accent.toFixed(1)}:1{fail ? ' - below AA, adjust before saving' : ''}
              </p>
            )}

            <div className="mt-3">
              <Button size="sm" disabled={fail || saving === row.vertical} onClick={() => save(row)}>
                {saving === row.vertical ? 'Saving...' : 'Save theme'}
              </Button>
              <Button size="sm" variant="outline" className="ml-2" onClick={() => reset(row.vertical)}>
                Reset to default
              </Button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
