# Summit design tokens — the ice system

One system for the public site and the app, built from the logo. Every colour,
gradient, radius, type size and duration below is defined once in
`src/index.css` (base) and `src/components/workspace/WorkspaceThemeProvider.tsx`
(per workspace). Nothing in a component introduces a new value.

## Register

Dark, cold, confident. The logo's ice blue is the accent. One gradient and one
glow, used only on hero cards and primary actions. Sentence case, plain copy,
no emoji in chrome. Numbers are the hero and they are always tabular.

## The name

- Everyday name: **Summit** (headlines, welcome lines, invites, emails, manifest).
- Official name: **Summit Trinity** — small print only, never above 14px.
- Full name for search engines and email footers: **Summit Marketing**.

## Colour

Base (Pest and every dark surface):

| Token | HSL | Use |
| --- | --- | --- |
| `--background` | `221 66% 11%` | Page surface |
| `--surface` / `--card` | `220 58% 15%` | Cards, panels, tables |
| `--surface-elevated` | `220 55% 20%` | Hover, raised rows, inputs |
| `--surface-sunken` | `221 62% 9%` | Wells |
| `--border` | `219 47% 25%` | Dividers and outlines |
| `--foreground` | `217 100% 96%` | Primary text and numbers |
| `--text-secondary` | `221 48% 81%` | Supporting text |
| `--text-muted` | `220 33% 62%` | Labels |
| `--primary` (ice) | `197 100% 68%` | Links, buttons, progress |
| `--primary-deep` | `215 100% 56%` | Gradient end, hover |
| `--success` | `154 69% 55%` | Confirmed states |
| `--destructive` | `358 100% 68%` | Errors and mandatory only |

Workspace identity accent (`--workspace-accent`) is the only colour that
changes per product, and it is used in five places: the wordmark, the active
phone tab, the Home hero art, the workspace switcher chip and the focus ring.

- Pest — ice `197 100% 68%`
- Fiber — mint `154 69% 55%` on a deep green base (`168 41% 7%`)
- Life — teal `177 50% 33%` on a light warm base (`43 30% 95%`, white surfaces)

Everything else — buttons, links, charts, progress — uses `--primary`.

## Gradients and glow

- `--gradient-ice`: `linear-gradient(135deg, primary, primary-deep)` — primary actions.
- `--gradient-hero`: workspace hero cards only.
- `--glow-ice`: hover state on a primary action. No other glow exists.

## Type

- Display and numbers: **Montserrat** 700 / 800 / 900, self-hosted (`@fontsource/montserrat`).
- Body: **Inter** 400–700, self-hosted. Life headings: Source Serif 4.
- Space Grotesk is removed.
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 40 / 56 px.
- `h1` 32px (40px from 768px up), 800 weight; `h2` 24px, 700.
- Every number is tabular: `.stat-num`, `.stat-value`, all table cells.
- Mobile inputs render at 16px, so iOS never zooms.

## Radius, elevation, spacing

- `--radius: 1rem` (16px) for cards and panels; `--radius-sm: 0.625rem` for controls.
- `--shadow` hairline, `--shadow-lift` for the floating phone bar and hero cards.
- 8px grid: 4, 8, 16, 24, 32, 48, 64.

## Chrome

- `.card-ice` standard card, `.card-hero` gradient hero card, `.btn-ice` primary action.
- Phone bottom bar floats as an inset pill, 24px icons, 11px labels, safe-area aware.
- `.avatar-ring` and every focus ring use the workspace accent.
- 44px minimum control height, AA contrast on all text pairs.

## Motion

- `--motion-fast: 120ms`, `--motion-base: 200ms`, `--motion-slow: 320ms`,
  `--motion-ease: cubic-bezier(0.2, 0, 0, 1)`.
- `CountUp` for numbers that change, `.page-transition` on route change,
  `.stagger` for lists, `.shine` for a single sweep after a person's action,
  `.skeleton-shimmer` while loading.
- `celebrate()` (`src/lib/celebrate.ts`) loads canvas-confetti on demand for
  four real wins only: a logged sale, a logged install, a completed setup step,
  a rookie finishing the first week.
- `.streak-chip` appears from two consecutive days up, never below.
- `prefers-reduced-motion: reduce` turns all of it off.
