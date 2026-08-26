# Summit design tokens — the mono system

One system for the public site and the app. Every colour, texture, radius, type
size and duration below is defined once in `src/index.css` (base) and
`src/components/workspace/WorkspaceThemeProvider.tsx` (per workspace). Nothing
in a component introduces a new value.

## Register

Near-black, high contrast, sharp. Bright white is the primary action; the ice
accent is used sparingly. No gradients, no glow, no shine sweep. Sentence case,
plain copy, no emoji in chrome. Numbers are the hero and always tabular.

## The name

- Everyday name: **Summit** (headlines, welcome lines, invites, emails, manifest).
- Official name: **Summit Trinity** — small print only, never above 14px.
- Full name for search engines and email footers: **Summit Marketing**.

## Colour

Base (Pest, Fiber and every dark surface):

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#0B0D12` | Page surface |
| `--surface` / `--card` | `#12151C` | Cards, panels, tables |
| `--surface-elevated` | `#1A1E27` | Inputs, hover, raised rows |
| `--border` | `#262B36` | Dividers |
| `--border-strong` | `#333A48` | Outlines, secondary buttons |
| `--foreground` | `#F5F7FA` | Primary text and numbers |
| `--text-secondary` | `#B6BDC9` | Supporting text |
| `--text-muted` | `#7C8595` | Labels |
| `--primary` | `#F5F7FA` on `#0B0D12` text | Primary buttons |
| `--ice` (accent) | `#5AD1FF` | See the accent rule |
| `--destructive` | `#FF5A5F` | Errors and mandatory only |

Accent rule: the accent appears only on the wordmark's "trinity", links, focus
rings, the active tab and sidebar indicator, goal rings and progress, and the
leaderboard "You" row. Nowhere else.

Workspace accent (`--workspace-accent`):

- Pest — ice `#5AD1FF` on the near-black base
- Fiber — mint `#3DDC97` on the near-black base
- Life — light mode, white surfaces, blue `#1E7BFF`, blue bottom bar

## Textures

- Pest: dotted grid, 22px.
- Fiber: fine line grid, 28px.
- Life: white light surface with paper grain.
- Textures live on `.app-texture` and `.card-hero`, and crossfade in 200ms on a
  workspace switch.

## Type

- Display, headings and numbers: **Montserrat** 800 / 900, self-hosted.
- Body: **Inter** 400–700, self-hosted. Life headings: Source Serif 4.
- Sentence case everywhere. Only the wordmark and 11px eyebrow labels are
  uppercase.
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 40 / 56 px.
- Every number is tabular. Mobile inputs render at 16px so iOS never zooms.

## Radius, elevation, spacing

- `--radius: 0.75rem` (12px) for cards, panels and buttons.
- Cards: surface fill, 1px border, no shadow. Only the floating phone bar lifts.
- 8px grid: 4, 8, 16, 24, 32, 48, 64.

## Chrome

- `.card-ice` standard card, `.card-hero` textured hero card, `.btn-ice` /
  `.btn-primary` white primary action (48px, radius 12), `.btn-mono` secondary
  (transparent, 1px strong border).
- Sidebar: 56px collapsed, 208px open, compact wordmark, segmented workspace
  switcher, accent bar on the active row.
- Phone bottom bar floats as an inset pill on `--surface-elevated` with a 1px
  border, 24px icons, 11px labels, safe-area aware.
- Navigation items differ per workspace (`desktopMain`, `manageFor`,
  `destinations` in `src/lib/appNav.ts`).
- 44px minimum control height, AA contrast on all text pairs.

## Motion

- `--motion-fast: 120ms`, `--motion-base: 200ms`, `--motion-slow: 320ms`,
  `--motion-ease: cubic-bezier(0.2, 0, 0, 1)`.
- `CountUp` for numbers that change, `.page-transition` on route change,
  `.stagger` for lists, `.skeleton-shimmer` while loading. `.shine` is a no-op.
- `celebrate()` (`src/lib/celebrate.ts`) loads canvas-confetti on demand in
  white plus the active workspace accent, for four real wins only.
- `.streak-chip` appears from two consecutive days up, never below.
- `prefers-reduced-motion: reduce` turns all of it off.
